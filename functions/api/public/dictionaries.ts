import { Env, success, error } from '../../_helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const [projects, creditOptions, reasons] = await Promise.all([
      env.DB.prepare('SELECT * FROM projects WHERE is_active = 1 ORDER BY sort_order ASC').all(),
      env.DB.prepare('SELECT * FROM credit_options WHERE is_active = 1 ORDER BY sort_order ASC').all(),
      env.DB.prepare('SELECT * FROM reasons WHERE is_active = 1 ORDER BY sort_order ASC').all(),
    ]);

    return success({
      projects: projects.results,
      creditOptions: creditOptions.results,
      reasons: reasons.results
    });
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
