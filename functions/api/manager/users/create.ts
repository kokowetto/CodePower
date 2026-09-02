import { Env, success, error, sha256Hex } from '../../../_helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const { username, displayName } = await request.json<any>();
    if (!username || !displayName) return error('Missing params');

    const defaultPassHash = await sha256Hex('123456');

    await env.DB.prepare(`
      INSERT INTO users (username, display_name, password_hash, role, is_active)
      VALUES (?, ?, ?, 'user', 1)
    `).bind(username, displayName, defaultPassHash).run();

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
