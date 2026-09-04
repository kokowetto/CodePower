import { Env, success, error, JwtPayload } from '../../_helpers';
import { buildTeamsAdaptiveCard, postToTeams } from '../../_teams';

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

    // 组装符合微软 Teams 官方协议的 Adaptive Card 1.5 消息体（含 @Sun, Guo Yang 强提醒与审批直达按钮）
    const webhookPayload = buildTeamsAdaptiveCard({
      applicantName: user.displayName,
      applicantEmail: user.username,
      projectName: project.name,
      credits: credit.amount,
      userLimit: userLimitNum,
      usedCredits: usedCreditsNum,
      finalReason,
      applyTime,
    });

    const webhookUrl = env.TEAMS_WEBHOOK_URL || DEFAULT_TEAMS_WEBHOOK_URL;
    // 采用经理标准的可靠传输机制（28KB安全守卫、200/202成功识别、400快速失败、重试退避），异常不阻塞单据创建
    try {
      await postToTeams(webhookUrl, webhookPayload, { timeoutMs: 4000, retries: 2 });
    } catch (notifyErr) {
      console.error('Failed to notify Teams:', notifyErr);
    }

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
};
