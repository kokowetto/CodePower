export interface MailTemplateData {
  recipient_email: string;
  cc_email: string;
  subject: string;
  body_template: string;
}

export interface ApplicationData {
  applicant_name?: string;
  applicant_email?: string;
  project_name?: string;
  applicantName?: string;
  applicantEmail?: string;
  projectName?: string;
  credits: number;
  user_limit?: number;
  userLimit?: number;
  used_credits?: number;
  usedCredits?: number;
  final_reason?: string;
  finalReason?: string;
  created_at?: string;
  createdAt?: string;
}

export function buildMailContent(template: MailTemplateData, app: ApplicationData, managerName: string) {
  const applicantName = app.applicant_name || app.applicantName || '';
  const applicantEmail = app.applicant_email || app.applicantEmail || '';
  const projectName = app.project_name || app.projectName || '';
  const finalReason = app.final_reason || app.finalReason || '';
  const userLimit = app.user_limit !== undefined && app.user_limit !== null
    ? String(app.user_limit)
    : (app.userLimit !== undefined && app.userLimit !== null ? String(app.userLimit) : '0');
  const usedCredits = app.used_credits !== undefined && app.used_credits !== null
    ? String(app.used_credits)
    : (app.usedCredits !== undefined && app.usedCredits !== null ? String(app.usedCredits) : '0');

  let d = new Date(app.created_at || app.createdAt || '');
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  const applyTime = d.toLocaleString('zh-CN', { hour12: false });

  // 结束时间默认申请月份最后一天，格式 YYYY-MM-DD
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const endYear = lastDay.getFullYear();
  const endMonth = String(lastDay.getMonth() + 1).padStart(2, '0');
  const endDay = String(lastDay.getDate()).padStart(2, '0');
  const endTime = `${endYear}-${endMonth}-${endDay}`;

  const variables: Record<string, string> = {
    applicantName,
    applicantEmail,
    projectName,
    credits: String(app.credits || 0),
    userLimit,
    personalLimit: userLimit,
    usedCredits,
    creditsUsed: usedCredits,
    finalReason,
    applyTime,
    endTime,
    endDate: endTime,
    managerName: managerName || '开发经理',
  };

  let to = template.recipient_email || '';
  let cc = template.cc_email || '';
  let subject = template.subject || '';
  let body = template.body_template || '';

  // 无论大小写或有无空格，均使用正则全量替换
  for (const [key, value] of Object.entries(variables)) {
    const reg = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'gi');
    to = to.replace(reg, value);
    cc = cc.replace(reg, value);
    subject = subject.replace(reg, value);
    body = body.replace(reg, value);
  }

  // 先把字面量的 "\n"、"\r\n" 还原为标准换行，避免数据库或转义导致明文展示 "\n"
  const normalizedBody = body.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

  // Windows 经典版 Outlook 2108 需要 CRLF 格式换行，URL 编码后为 %0D%0A
  const formattedBody = normalizedBody.replace(/\r?\n/g, '\r\n');

  const params: string[] = [];
  if (cc) params.push(`cc=${encodeURIComponent(cc)}`);
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (formattedBody) params.push(`body=${encodeURIComponent(formattedBody)}`);

  const mailtoUrl = `mailto:${encodeURIComponent(to)}${params.length > 0 ? '?' + params.join('&') : ''}`;

  return {
    to,
    cc,
    subject,
    body,
    mailtoUrl,
  };
}

export function launchOutlookDraft(template: MailTemplateData, app: ApplicationData, managerName: string): string {
  const { mailtoUrl } = buildMailContent(template, app, managerName);

  const a = document.createElement('a');
  a.href = mailtoUrl;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
  }, 1000);

  return mailtoUrl;
}
