import { Env, success, error, JwtPayload } from '../../_helpers';

export const onRequestGet: PagesFunction<Env, string, { user?: JwtPayload }> = async (context) => {
  const { env, data } = context;
  const user = data.user;
  if (!user) return error('Unauthorized', 401, 401);

  try {
    const { results } = await env.DB.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
    return success(results);
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
