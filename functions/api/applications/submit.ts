import { Env, success, error, JwtPayload } from '../../_helpers';

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

    await env.DB.prepare(`
      INSERT INTO applications (user_id, applicant_name, applicant_email, project_name, credits, user_limit, used_credits, selected_reason, extra_notes, final_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(user.id, user.displayName, user.username, project.name, credit.amount, userLimitNum, usedCreditsNum, reason.reason_text, extraNotes || '', finalReason).run();

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
