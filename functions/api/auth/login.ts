import { Env, success, error, sha256Hex, signJwt } from '../../_helpers';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const { username, password } = await request.json<any>();
    if (!username || !password) return error('Missing username or password');

    const stmt = env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1');
    const user = await stmt.bind(username).first<any>();

    if (!user) {
      return error('Invalid username or password');
    }

    const hashedInput = await sha256Hex(password);
    if (user.password_hash !== hashedInput) {
      return error('Invalid username or password');
    }

    const payload = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days
    };

    const token = await signJwt(payload, env.JWT_SECRET);

    return success({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role
      }
    });
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
