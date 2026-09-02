-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 项目名称字典表
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 申请额度字典表
CREATE TABLE IF NOT EXISTS credit_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 用途与申请理由字典表
CREATE TABLE IF NOT EXISTS reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reason_text TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 邮件模板配置表
CREATE TABLE IF NOT EXISTS mail_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL DEFAULT '默认审批邮件模板',
    recipient_email TEXT NOT NULL,
    cc_email TEXT DEFAULT '',
    subject TEXT NOT NULL,
    body_template TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. 申请审批主表
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    project_name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    selected_reason TEXT NOT NULL,
    extra_notes TEXT DEFAULT '',
    final_reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed Data
-- admin账号密码 admin123456 的 SHA-256 = 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, is_active)
VALUES (1, 'admin@company.com', '开发经理', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'manager', 1);

INSERT OR IGNORE INTO projects (name, sort_order) VALUES ('Converge', 1);
INSERT OR IGNORE INTO credit_options (amount, sort_order) VALUES (2000, 1), (5000, 2);
INSERT OR IGNORE INTO reasons (reason_text, sort_order) VALUES ('项目开发需要', 1), ('其他', 2);

INSERT OR IGNORE INTO mail_templates (id, template_name, recipient_email, cc_email, subject, body_template)
VALUES (
    1,
    '默认审批邮件模板',
    'leader@company.com',
    '${applicantEmail}',
    '【Copilot额度申请审批】${applicantName} - ${projectName} (${credits} credits)',
    '尊敬的领导：\n\n开发团队已初审通过员工【${applicantName}】的 GitHub Copilot 额度申领，具体详情如下：\n----------------------------------------\n- 申请人员：${applicantName} (${applicantEmail})\n- 所属项目：${projectName}\n- 申请额度：${credits} credits\n- 用途及理由：${finalReason}\n- 申请时间：${applyTime}\n- 审批结果：开发经理已同意\n----------------------------------------\n\n请您查阅并进行最终划拨处理。\n\n此致\n开发团队'
);
