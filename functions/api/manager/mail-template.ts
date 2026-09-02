import { Env, success, error } from '../../_helpers';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const template = await env.DB.prepare('SELECT * FROM mail_templates WHERE id = 1').first();
    return success(template);
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const { recipientEmail, ccEmail, subject, bodyTemplate } = await request.json<any>();
    
    await env.DB.prepare(`
      UPDATE mail_templates 
      SET recipient_email = ?, cc_email = ?, subject = ?, body_template = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).bind(recipientEmail, ccEmail || '', subject, bodyTemplate).run();

    return success();
  } catch (e: any) {
    return error(e.message, 500, 500);
  }
}
