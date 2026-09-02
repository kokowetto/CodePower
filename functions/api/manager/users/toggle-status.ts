import { Env, success, error } from '../../../_helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const { userId, isActive } = await request.json<any>();
    if (!userId || isActive === undefined) return error('Missing params');

    if (userId === 1 && isActive === 0) {
      return error('Cannot disable super admin');
    }

    await env.DB.prepare('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(isActive, userId)
      .run();

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
