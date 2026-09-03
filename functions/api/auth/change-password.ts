import { Env, success, error, sha256Hex, verifyJwt, JwtPayload } from '../../_helpers';

export const onRequestPost: PagesFunction<Env, string, { user?: JwtPayload }> = async (context) => {
  const { request, env, data } = context;
  let user = data.user;

  // 兜底：如果中间件未注入 user，尝试从请求头直接解析 Bearer Token
  if (!user) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      user = (await verifyJwt(token, env.JWT_SECRET)) || undefined;
    }
  }

  if (!user) return error('Unauthorized', 401, 401);

  try {
    const { oldPassword, newPassword } = await request.json<any>();
    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return error('Invalid input or password too short (min 6)');
    }

    const dbUser = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<any>();
    if (!dbUser) return error('User not found');

    const oldHashed = await sha256Hex(oldPassword);
    if (oldHashed !== dbUser.password_hash) {
      return error('Old password incorrect');
    }

    const newHashed = await sha256Hex(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(newHashed, user.id)
      .run();

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
