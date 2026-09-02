import { Env, success, error, JwtPayload } from '../../../_helpers';

export const onRequestPost: PagesFunction<Env, string, { user?: JwtPayload }> = async (context) => {
  const { request, env, data } = context;
  const user = data.user;
  if (!user) return error('Unauthorized', 401, 401);

  try {
    const { applicationId, action } = await request.json<any>();
    if (!['approve', 'reject'].includes(action)) return error('Invalid action');

    const status = action === 'approve' ? 'approved' : 'rejected';
    
    await env.DB.prepare(`
      UPDATE applications 
      SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, user.id, applicationId).run();

    const app = await env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(applicationId).first();
    
    return success(app);
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
