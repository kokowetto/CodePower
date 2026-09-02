import { Env, success, error } from '../../../../_helpers';

const getTableName = (type: string) => {
  if (type === 'projects') return 'projects';
  if (type === 'credit-options') return 'credit_options';
  if (type === 'reasons') return 'reasons';
  return null;
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  try {
    const type = params.type as string;
    const id = params.id as string;
    const tableName = getTableName(type);
    if (!tableName) return error('Invalid dictionary type');

    const { isActive, sortOrder } = await request.json<any>();
    
    const updates = [];
    const binds = [];
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      binds.push(isActive);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      binds.push(sortOrder);
    }

    if (updates.length === 0) return error('Nothing to update');
    binds.push(id);

    await env.DB.prepare(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`).bind(...binds).run();
    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
