import { Env, success, error, sha256Hex } from '../../../_helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const { userId } = await request.json<any>();
    if (!userId) return error('Missing params');

    const defaultPassHash = await sha256Hex('123456');

    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(defaultPassHash, userId)
      .run();

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
