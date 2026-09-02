import { Env, success, error } from '../../_helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let query = 'SELECT * FROM applications';
    const params: any[] = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return success(results);
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
