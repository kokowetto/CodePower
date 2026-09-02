import { Env, success, error } from '../../_helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare('SELECT id, username, display_name, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC').all();
    return success(results);
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
