import { verifyJwt, error, JwtPayload, Env } from './_helpers';

export async function onRequest(context: EventContext<Env, string, { user?: JwtPayload }>) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Only intercept /api/ requests; allow frontend static assets (HTML/CSS/JS) to pass through
  if (!path.startsWith('/api/')) {
    return next();
  }

  // Skip validation for login and public endpoints
  if (path === '/api/auth/login' || path.startsWith('/api/public/')) {
    return next();
  }

  // Allow OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
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
