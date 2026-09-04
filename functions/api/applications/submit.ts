import { Env, success, error, JwtPayload } from '../../_helpers';

const DEFAULT_TEAMS_WEBHOOK_URL = 'https://default335a532847a0444489f8552b2e6cae.ea.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5fe405563c2b4c6b8840811d8d0b2796/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Ao3ZbycC_-iDbr8ri6WbX5ymofIO2u4jcTZkKU7EKx8';

function getNowEast8DateTime(): string {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function sendTeamsNotification(webhookUrl: string, payload: any): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('Teams webhook status:', res.status);
  } catch (err) {
    console.error('Failed to send Teams webhook notification:', err);
  }
}

export const onRequestPost: PagesFunction<Env, string, { user?: JwtPayload }> = async (context) => {
  const { request, env, data } = context;
  const user = data.user;
  if (!user) return error('Unauthorized', 401, 401);

  try {
    const { projectId, creditId, reasonId, extraNotes, userLimit, usedCredits } = await request.json<any>();

    const userLimitNum = Number(userLimit);
    const usedCreditsNum = Number(usedCredits);

    if (!Number.isInteger(userLimitNum) || userLimitNum < 0 || userLimitNum > 50000) {
      return error('当前个人上限必须为 0 至 50000 之间的整数');
    }
    if (!Number.isInteger(usedCreditsNum) || usedCreditsNum < 0 || usedCreditsNum > 50000) {
      return error('已使用量必须为 0 至 50000 之间的整数');
    }

    const project = await env.DB.prepare('SELECT name FROM projects WHERE id = ?').bind(projectId).first<any>();
    const credit = await env.DB.prepare('SELECT amount FROM credit_options WHERE id = ?').bind(creditId).first<any>();
    const reason = await env.DB.prepare('SELECT reason_text FROM reasons WHERE id = ?').bind(reasonId).first<any>();

    if (!project || !credit || !reason) {
      return error('Invalid dictionary IDs');
    }

    const finalReason = extraNotes ? `${reason.reason_text}（${extraNotes}）` : reason.reason_text;
    const applyTime = getNowEast8DateTime();

    await env.DB.prepare(`
      INSERT INTO applications (user_id, applicant_name, applicant_email, project_name, credits, user_limit, used_credits, selected_reason, extra_notes, final_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(user.id, user.displayName, user.username, project.name, credit.amount, userLimitNum, usedCreditsNum, reason.reason_text, extraNotes || '', finalReason).run();

    // 组装精炼紧凑的 Teams 消息摘要（单行纯文本，杜绝任何换行符或复杂结构导致的卡片解析异常）
    const shortSummary = `【CodePower申请提醒】员工 ${user.displayName} 提交了 ${project.name} 项目的 ${credit.amount} credits 额度申请（用量/上限: ${usedCreditsNum}/${userLimitNum}，理由: ${finalReason}），请及时审批：https://codepower.pages.dev`;

    const webhookPayload = {
      summary: shortSummary,
      text: shortSummary,
      message: shortSummary,
      content: shortSummary,
      applicantName: user.displayName,
      projectName: project.name,
      credits: credit.amount,
      userLimit: userLimitNum,
      usedCredits: usedCreditsNum,
      finalReason,
      applyTime,
    };

    const webhookUrl = env.TEAMS_WEBHOOK_URL || DEFAULT_TEAMS_WEBHOOK_URL;
    // 直接 await 发送，确保 Cloudflare 节点在完成 HTTP 请求后再响应，带 4 秒超时与异常捕获
    await sendTeamsNotification(webhookUrl, webhookPayload);

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
};
