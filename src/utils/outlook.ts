interface MailTemplateData {
  recipient_email: string;
  cc_email: string;
  subject: string;
  body_template: string;
}

interface ApplicationData {
  applicant_name: string;
  applicant_email: string;
  project_name: string;
  credits: number;
  final_reason: string;
  created_at: string;
}

export function launchOutlookDraft(template: MailTemplateData, app: ApplicationData, managerName: string): void {
  const applyTime = new Date(app.created_at).toLocaleString('zh-CN', { hour12: false });
  
  let subject = template.subject || '';
  let body = template.body_template || '';

  const variables: Record<string, string> = {
    '${applicantName}': app.applicant_name || '',
    '${applicantEmail}': app.applicant_email || '',
    '${projectName}': app.project_name || '',
    '${credits}': String(app.credits || 0),
    '${finalReason}': app.final_reason || '',
    '${applyTime}': applyTime,
    '${managerName}': managerName || '',
  };

  for (const [key, value] of Object.entries(variables)) {
    subject = subject.split(key).join(value);
    body = body.split(key).join(value);
  }

  // CRLF for Outlook
  body = body.replace(/\n/g, '\r\n');

  const mailtoLink = `mailto:${encodeURIComponent(template.recipient_email)}?cc=${encodeURIComponent(template.cc_email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const a = document.createElement('a');
  a.href = mailtoLink;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
