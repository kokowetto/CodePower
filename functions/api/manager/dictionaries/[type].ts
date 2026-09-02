import { Env, success, error } from '../../../_helpers';

const getTableName = (type: string) => {
  if (type === 'projects') return 'projects';
  if (type === 'credit-options') return 'credit_options';
  if (type === 'reasons') return 'reasons';
  return null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, params } = context;
  try {
    const type = params.type as string;
    const tableName = getTableName(type);
    if (!tableName) return error('Invalid dictionary type');

    const { results } = await env.DB.prepare(`SELECT * FROM ${tableName} ORDER BY sort_order ASC`).all();
    return success(results);
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  try {
    const type = params.type as string;
    const tableName = getTableName(type);
    if (!tableName) return error('Invalid dictionary type');

    const body = await request.json<any>();
    let query = '';
    const binds = [];

    if (type === 'projects' || type === 'reasons') {
      const field = type === 'projects' ? 'name' : 'reason_text';
      if (!body.name) return error('Missing name');
      query = `INSERT INTO ${tableName} (${field}) VALUES (?)`;
      binds.push(body.name);
    } else if (type === 'credit-options') {
      if (!body.amount) return error('Missing amount');
      query = `INSERT INTO ${tableName} (amount) VALUES (?)`;
      binds.push(body.amount);
    }

    await env.DB.prepare(query).bind(...binds).run();
    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
