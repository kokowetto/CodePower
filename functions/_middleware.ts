import { verifyJwt, error, JwtPayload, Env } from './_helpers';

export async function onRequest(context: EventContext<Env, string, { user?: JwtPayload }>) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Skip validation for auth and public
  if (path.startsWith('/api/auth/') || path.startsWith('/api/public/')) {
    return next();
  }

  // Check JWT
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error('Unauthorized', 401, 401);
  }
  const token = authHeader.split(' ')[1];
  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload) {
    return error('Invalid or expired token', 401, 401);
  }
  
  context.data.user = payload;

  if (path.startsWith('/api/manager/')) {
    if (payload.role !== 'manager') {
      return error('Forbidden', 403, 403);
    }
  }

  return next();
}
