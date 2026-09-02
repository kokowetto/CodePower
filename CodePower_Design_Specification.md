# CodePower（码力加）- 集团 GitHub Copilot 额度申领平台
## 软件需求规格与技术实施方案（PRD & Tech Spec）

---

## 1. 项目背景与定位

### 1.1 命名与定位
- **项目命名**：CodePower（码力加）/ 集团 GitHub Copilot 额度申领平台
- **定位**：轻量级、零成本、高可用的集团内部审批与流转工具，专用于开发者申领 GitHub Copilot 额度、开发经理在线审批、并自动拉起本地 Outlook 生成汇报草稿邮件。
- **运行环境**：基于 Cloudflare 边缘计算体系（Pages + Functions + D1 关系型数据库），具备零服务器运维、高并发、全球高可用特性。

---

## 2. 系统角色与权限设计

系统包含两个内置角色，基于 Session/JWT Token 校验角色标识：

| 角色 | 标识 (`role`) | 核心功能权限 |
| :--- | :--- | :--- |
| **开发经理** | `manager` | 1. 默认内置超级管理账号（可修改密码）。<br>2. 审批所有成员的申请单据（同意/不同意）。<br>3. 同意审批时触发生成邮件并调起本地 Outlook。<br>4. 维护成员账号（添加成员、启用/停用、重置密码为 `123456`）。<br>5. 维护项目字典、额度字典、用途理由字典。<br>6. 维护 Outlook 邮件模板（收件领导邮箱、主题及正文模板）。 |
| **普通用户** | `user` | 1. 登录系统（使用域账号邮箱作为用户名）。<br>2. 修改个人密码。<br>3. 提交额度申请（项目、额度、理由必选默认第一项，补充说明可选）。<br>4. 查看个人历史申请记录及当前审批进度。 |

---

## 3. 数据库设计 (Cloudflare D1 SQLite DDL)

平台采用 Cloudflare 原生无服务器关系型数据库 **D1**。以下为完整的建表脚本与初始种子数据（Seed Data）。

```sql
-- 1. 用户表 (users)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,       -- 域账号/邮箱地址，作为唯一登录凭据
    display_name TEXT NOT NULL,          -- 成员真实姓名
    password_hash TEXT NOT NULL,         -- SHA-256(password) 的十六进制字符串（小写），内部系统采用此方案
    role TEXT NOT NULL DEFAULT 'user',   -- 角色：'manager' 或 'user'
    is_active INTEGER NOT NULL DEFAULT 1,-- 状态：1 启用，0 停用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 项目名称字典表 (projects)
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- 项目名称
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 申请额度字典表 (credit_options)
CREATE TABLE IF NOT EXISTS credit_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL UNIQUE,      -- 额度数值 (如 2000, 5000)
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 用途与申请理由字典表 (reasons)
CREATE TABLE IF NOT EXISTS reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reason_text TEXT NOT NULL UNIQUE,    -- 理由名称
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. 邮件模板配置表 (mail_templates)
CREATE TABLE IF NOT EXISTS mail_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL DEFAULT '默认审批邮件模板',
    recipient_email TEXT NOT NULL,       -- 上层领导收件人邮箱（单个邮箱地址）
    cc_email TEXT DEFAULT '',            -- 抄送邮箱
    subject TEXT NOT NULL,               -- 邮件主题模板
    body_template TEXT NOT NULL,         -- 邮件正文模板 (支持占位变量)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. 申请审批主表 (applications)
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,            -- 申请人用户 ID
    applicant_name TEXT NOT NULL,        -- 申请人姓名（历史快照）
    applicant_email TEXT NOT NULL,       -- 申请人域账号（历史快照）
    project_name TEXT NOT NULL,          -- 所选项目（历史快照）
    credits INTEGER NOT NULL,            -- 申请额度（历史快照）
    selected_reason TEXT NOT NULL,       -- 下拉选中的基础理由
    extra_notes TEXT DEFAULT '',         -- 用户手填补充理由（最多 50 个 Unicode 字符）
    final_reason TEXT NOT NULL,          -- 合并后的最终申请理由
    status TEXT NOT NULL DEFAULT 'pending', -- 状态：pending(待审批), approved(已通过), rejected(已拒绝)
    reviewed_by INTEGER DEFAULT NULL,    -- 审批经理 ID
    reviewed_at DATETIME DEFAULT NULL,   -- 审批处理时间
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ==================== 初始种子数据 (Seed) ====================

-- 内置默认开发经理账号 (初始账号: admin@company.com, 密码: admin123456)
-- 采用内置哈希存储，初次部署即生效
INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, is_active)
VALUES (1, 'admin@company.com', '开发经理', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'manager', 1);

-- 初始项目名称：Converge
INSERT OR IGNORE INTO projects (name, sort_order) VALUES ('Converge', 1);

-- 初始额度选项：2000, 5000
INSERT OR IGNORE INTO credit_options (amount, sort_order) VALUES (2000, 1), (5000, 2);

-- 初始用途与申请理由：项目开发需要、其他
INSERT OR IGNORE INTO reasons (reason_text, sort_order) VALUES ('项目开发需要', 1), ('其他', 2);

-- 初始邮件模板
INSERT OR IGNORE INTO mail_templates (id, template_name, recipient_email, cc_email, subject, body_template)
VALUES (
    1,
    '默认审批邮件模板',
    'leader@company.com',
    '${applicantEmail}',
    '【Copilot额度申请审批】${applicantName} - ${projectName} (${credits} credits)',
    '尊敬的领导：\n\n开发团队已初审通过员工【${applicantName}】的 GitHub Copilot 额度申领，具体详情如下：\n----------------------------------------\n- 申请人员：${applicantName} (${applicantEmail})\n- 所属项目：${projectName}\n- 申请额度：${credits} credits\n- 用途及理由：${finalReason}\n- 申请时间：${applyTime}\n- 审批结果：开发经理已同意\n----------------------------------------\n\n请您查阅并进行最终划拨处理。\n\n此致\n开发团队'
);
```

---

## 4. 功能交互与业务逻辑全景规范

### 4.1 认证模块
1. **登录页 (`/login`)**：
   - 域账号邮箱 (`username`) + 密码 (`password`) 登录。
   - 登录成功返回 JWT Token，**存入 `localStorage`**，后续所有请求在 Header 中携带 `Authorization: Bearer <token>`。
   - 同时返回当前用户的 `role`、`display_name`，前端据此决定跳转路由（`user` → `/apply`，`manager` → `/admin`）。
   - 若账号被经理设为"停用 (`is_active = 0`)"，拦截登录并友好提示："该账号已被禁用，请联系开发经理"。
   - **无首次登录强制改密逻辑**，登录即可正常使用。
2. **修改密码功能**：
   - 普通用户与开发经理均可在右上角头像菜单中点击"修改密码"。
   - 校验：旧密码必填校验，新密码长度不少于 6 位。
3. **安全拦截**：
   - 所有 `/api/manager/*` 接口必须在服务端强制校验 Token 角色是否为 `manager`。

---

### 4.2 普通用户业务规范 (`/apply`)

#### 页面结构
- **上半部分：申请表单卡片**
- **下半部分：我的申请记录表格**

#### 申请表单交互细节
1. **项目名称**：下拉单选，默认自动选中第 1 项（取自字典启用项，初值为 `Converge`）。
2. **申请额度**：下拉单选，默认自动选中第 1 项（取自字典启用项，初值为 `2000`）。
3. **用途和申请理由**：下拉单选，默认自动选中第 1 项（取自字典启用项，初值为 `项目开发需要`）。
4. **补充说明（其他信息）**：
   - 文本输入框，**非必填**。
   - 右下角展示字数计数器，**限制最多 50 个 Unicode 字符**，超过禁止输入。
5. **提交与字段合并规则**：
   - 用户点击【提交申请】按钮，前端向后端提交字典项 ID：`{ projectId, creditId, reasonId, extraNotes }`。
   - **后端处理逻辑**：根据 `reasonId` 查字典表获得 `reason_text`，再按以下策略合并后存库：
   - **理由合并存储策略**：
     - 若 `extraNotes` 为空：`final_reason = reason_text`。
     - 若 `extraNotes` 有内容：`final_reason = "${reason_text}（${extraNotes}）"`。
     - 示例：选择"项目开发需要"，补充"主模块重构"，最终存储为：`项目开发需要（主模块重构）`。

#### 我的申请记录列表
- 字段：申请单 ID、项目名称、申请额度、用途及理由、申请时间、审批状态。
- 状态展示规则（彩色 Badge 标签）：
  - `pending`：黄色标签，“待审批”。
  - `approved`：绿色标签，“已通过”。
  - `rejected`：红色标签，“已拒绝”。
- 排序：按申请时间倒序排列（最新的在最前）。

---

### 4.3 开发经理业务规范 (`/admin`)

#### 页面布局（Tab 导航）
1. **【审批中心】（默认展示）**
2. **【成员账号管理】**
3. **【基础字典维护】**
4. **【邮件模板配置】**

---

#### 子模块 1：审批中心
- **数据范围**：展示全集团所有成员提交的申请单。
- **列表筛选项**：全部、待审批（默认）、已通过、已拒绝。
- **列表字段**：申请人姓名、域账号、项目名称、额度、合并后的用途理由、申请时间、状态、操作。
- **操作逻辑**：
  1. **【同意】操作**：
     - 弹出确认提示框："确认同意该申请并生成 Outlook 邮件？"
     - 点击确认后，调用 `POST /api/manager/applications/review`（action: "approve"），接口返回已更新的申请单数据（`approvedApplication`）。
     - **核心联动（两步串行）**：
       1. 审批接口成功后，立即调用 `GET /api/manager/mail-template` 获取最新邮件模板。
       2. 将 `approvedApplication` 数据与邮件模板传入 `launchOutlookDraft()`，**拉起本地 Outlook 生成草稿**（详见第 5 节）。
     - 若浏览器拦截了协议调用，审批成功提示框中提供【手动复制邮件内容】按钮供经理备用。
     - 列表状态无刷新更新为绿色"已通过"。
  2. **【不同意】操作**：
     - 点击弹出二次防误触确认框："确认拒绝该申请？"
     - 确认后直接调用后端接口将状态变更为 `rejected`。
     - **不要求填写拒绝原因，不触发 Outlook 邮件**。
     - 列表状态无刷新更新为红色"已拒绝"。

---

#### 子模块 2：成员账号管理
- **列表字段**：姓名、域账号(邮箱)、创建时间、账号状态(启用/停用 Switch 开关)、操作栏。
- **添加成员按钮**：
  - 弹窗输入：成员姓名、域账号邮箱。
  - 初始密码自动赋予系统默认值：`123456`。
  - 提交后入库，默认处于“启用”状态。
- **状态切换 (Switch)**：
  - 点击开关可即时启用或停用该成员。
- **重置密码按钮**：
  - 点击操作栏中的【重置密码】。
  - 弹窗确认：“确认将该用户的登录密码重置为 123456 吗？”
  - 确认后接口将密码更新为 `123456` 的散列值，并提示经理：“密码已重置为默认密码 123456，请通知员工登录后及时修改”。

---

#### 子模块 3：基础字典维护
统一维护三类下拉配置，每类配置支持：**新增、禁用/启用开关、排序调整**：
1. **项目维护**：初始项为 `Converge`。
2. **额度维护**：初始项为 `2000`、`5000`（限制只能录入正整数）。
3. **用途理由维护**：初始项为 `项目开发需要`、`其他`。

---

#### 子模块 4：邮件模板配置
- **配置表单项**：
  - **收件人 (To)**：输入上层领导邮箱（**单个邮箱地址**）。
  - **抄送人 (Cc)**：可选，填写邮箱地址，支持使用 `${applicantEmail}` 变量自动填入申请人本人邮箱。
  - **邮件主题 (Subject)**：单行文本输入。
  - **正文模板 (Body)**：多行大文本域。
  - **可用变量说明面板**（以下变量在抄送、主题、正文三个字段中均有效）：
    - `${applicantName}`：申请人真实姓名
    - `${applicantEmail}`：申请人域账号邮箱
    - `${projectName}`：项目名称
    - `${credits}`：申请额度数值
    - `${finalReason}`：用途及理由（已合并补充说明）
    - `${applyTime}`：申请提交时间（格式：YYYY-MM-DD HH:mm）
    - `${managerName}`：审批经理姓名
- **实时预览卡片**：右侧展示将虚拟变量替换后的实际邮件排版渲染效果。
- **保存按钮**：持久化到 D1 数据库。

---

## 5. 本地 Outlook 客户端拉起技术实现

### 5.1 实现原理
系统采用标准的操作系统 URI Scheme 协议：`mailto:`。当浏览器执行重定向或触发此类协议链接时，操作系统的默认邮件程序（Windows / macOS 下的 Outlook）会被唤醒并打开新邮件编辑窗口。

### 5.2 核心前端触发代码 (TypeScript/JavaScript)

```typescript
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

export function launchOutlookDraft(
  template: MailTemplateData,
  app: ApplicationData,
  managerName: string
) {
  // 1. 变量映射字典
  const variableMap: Record<string, string> = {
    '${applicantName}': app.applicant_name,
    '${applicantEmail}': app.applicant_email,
    '${projectName}': app.project_name,
    '${credits}': String(app.credits),
    '${finalReason}': app.final_reason,
    '${applyTime}': new Date(app.created_at).toLocaleString('zh-CN', { hour12: false }),
    '${managerName}': managerName,
  };

  // 2. 占位符字符串替换
  let finalSubject = template.subject;
  let finalBody = template.body_template;
  let finalCc = template.cc_email || '';

  Object.entries(variableMap).forEach(([key, val]) => {
    finalSubject = finalSubject.replaceAll(key, val);
    finalBody = finalBody.replaceAll(key, val);
    finalCc = finalCc.replaceAll(key, val);
  });

  // 3. 严格遵循 RFC 3986 进行 URI 编码
  const encodedSubject = encodeURIComponent(finalSubject);
  // 注意：Outlook 对换行符要求支持 CRLF (%0D%0A)
  const formattedBody = finalBody.replace(/\r?\n/g, '\r\n');
  const encodedBody = encodeURIComponent(formattedBody);
  const encodedCc = encodeURIComponent(finalCc);

  // 4. 组装 mailto 链接
  let mailtoUrl = `mailto:${template.recipient_email}?subject=${encodedSubject}&body=${encodedBody}`;
  if (finalCc) {
    mailtoUrl += `&cc=${encodedCc}`;
  }

  // 5. 触发系统唤起 (采用隐式 a 标签方式，避免破坏当前页面路由)
  const tempLink = document.createElement('a');
  tempLink.href = mailtoUrl;
  tempLink.style.display = 'none';
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
}
```

### 5.3 避坑与体验保障
- **URL 长度超限保护**：Windows 下部分老版本 Outlook 的 `mailto:` 协议对 URL 长度有 2048 字符的限制。本业务中的审批邮件精炼规整，一般在 300~500 字符内，完全安全。
- **后备兜底方案**：若用户的浏览器拦截了协议调用，系统在审批成功提示框中提供一个【手动复制邮件内容】按钮，方便经理直接粘贴。

---

## 6. 后端 API 接口规范 (Cloudflare Functions)

所有接口统一前缀 `/api`，响应体格式：
```json
{
  "code": 0,           // 0 表示成功，非 0 表示异常状态码
  "message": "success", // 提示信息
  "data": {}           // 数据载荷
}
```

### 6.1 认证与通用
- `POST /api/auth/login`：用户/经理登录。入参 `{ username, password }`，返回 `{ token, user: { id, username, displayName, role } }`。
- `POST /api/auth/change-password`：修改当前登录者密码。入参 `{ oldPassword, newPassword }`。
- `GET /api/public/dictionaries`：普通用户获取表单下拉字典（获取所有启用状态的 projects, credit_options, reasons）。

### 6.2 普通用户业务
- `POST /api/applications/submit`：提交额度申请。入参 `{ projectId, creditId, reasonId, extraNotes }`。
- `GET /api/applications/my`：获取当前登录用户的申请记录列表。

### 6.3 开发经理管理业务 (需校验 Manager 角色)
- `GET /api/manager/applications`：查询全量申请单列表（支持状态过滤：`?status=pending`）。
- `POST /api/manager/applications/review`：审批单据。入参 `{ applicationId, action: "approve" | "reject" }`。
- `GET /api/manager/users`：获取成员列表。
- `POST /api/manager/users/create`：添加成员。入参 `{ username, displayName }`。
- `POST /api/manager/users/toggle-status`：启/停账号。入参 `{ userId, isActive }`。
- `POST /api/manager/users/reset-password`：重置用户密码为 `123456`。入参 `{ userId }`。
- `GET  /api/manager/dictionaries/:type`：获取字典列表。`:type` 取值为 `projects`、`credit-options`、`reasons` 之一。
- `POST /api/manager/dictionaries/:type`：新增字典项。入参 `{ name }` (projects/reasons) 或 `{ amount }` (credit-options)。
- `PATCH /api/manager/dictionaries/:type/:id`：更新字典项（启用/停用 `isActive`，或排序 `sortOrder`）。
- `GET /api/manager/mail-template`：获取当前邮件模板。
- `PUT /api/manager/mail-template`：更新邮件模板。入参 `{ recipientEmail, ccEmail, subject, bodyTemplate }`。

---

## 7. 仓库工程目录结构

本项目为典型的前后端一体化单仓结构（Monorepo-free Fullstack），专为 Cloudflare Pages 设计：

```text
codepower/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions 自动化部署 (可选)
├── functions/                      # Cloudflare Pages Functions (后端无服务器接口)
│   ├── _middleware.ts              # 全局中间件：JWT 解析与鉴权守卫
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.ts            # 登录接口
│   │   │   └── change-password.ts  # 改密接口
│   │   ├── applications/
│   │   │   ├── submit.ts           # 提单接口
│   │   │   └── my.ts               # 我的申请
│   │   ├── public/
│   │   │   └── dictionaries.ts     # 公共字典接口
│   │   └── manager/
│   │       ├── applications.ts     # 审批列表与处理
│   │       ├── users.ts            # 成员账号增删改查与密码重置
│   │       ├── dictionaries.ts     # 字典维护
│   │       └── mail-template.ts    # 邮件模板配置
├── migrations/
│   └── 0000_init_schema.sql        # Cloudflare D1 初始建表与种子数据
├── public/
│   └── favicon.ico
├── src/                            # 前端源码 (Vue 3 + Vite + TailwindCSS)
│   ├── assets/
│   ├── components/
│   │   ├── Navbar.vue              # 顶部导航栏与用户信息
│   │   └── Modal.vue
│   ├── views/
│   │   ├── Login.vue               # 登录页面
│   │   ├── UserApply.vue           # 普通用户申请与历史页面
│   │   └── manager/                # 经理管理相关页面
│   │       ├── ManagerAdmin.vue    # 经理管理主台入口（Tab 容器）
│   │       ├── ApprovalTab.vue     # 审批中心与 Outlook 联动
│   │       ├── UsersTab.vue        # 成员账号管理
│   │       ├── DictionariesTab.vue # 基础字典维护
│   │       └── MailTemplateTab.vue # 邮件模板配置
│   ├── utils/
│   │   ├── outlook.ts              # mailto 邮件生成器
│   │   └── request.ts              # fetch 请求封装
│   ├── App.vue
│   └── main.ts
├── package.json
├── vite.config.ts                  # Vite 构建配置
├── wrangler.toml                   # Cloudflare 本地调试与 D1 绑定配置
└── README.md                       # 包含一键部署按钮的项目说明
```

---

## 8. GitHub README 模板（内置一键部署到 Cloudflare）

以下内容可直接作为项目仓库的 `README.md`，内含 Cloudflare 官方标准的 **Deploy to Cloudflare** 一键部署按钮及完整引导：

````markdown
# ⚡ CodePower（码力加）

> 集团 GitHub Copilot 额度申领与智能审批平台。支持多角色登录、额度申领流转、经理一键审批并自动唤起 Outlook 生成向上汇报邮件草稿。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/YOUR_GITHUB_USERNAME/codepower)

---

## ✨ 核心特性

- ⚡ **零成本无服务器架构**：基于 Cloudflare Pages + Functions 构建，免买云服务器，免配 Nginx/MySQL。
- 🗄️ **云原生数据库**：集成 Cloudflare D1 (Serverless SQLite)，全量数据持久化存储。
- ✉️ **无缝联动本地 Outlook**：经理点击审批通过即刻唤起本地 Outlook 客户端并预填汇报草稿，无需繁琐的 SMTP 授权。
- 👥 **精准权限控制**：区分普通用户与开发经理角色，支持账号启用/停用与极简一键密码重置。
- ⚙️ **高度可定制**：项目名称、申请额度、用途理由及 Outlook 邮件模板全部支持在线可视化维护。

---

## 🚀 部署指南（共 3 步，约 5 分钟）

> **说明**：上方按钮负责部署代码到 Cloudflare Pages，D1 数据库需额外手动初始化并在 Dashboard 绑定，这是 Cloudflare 平台限制，整个过程**只需操作一次**。

---

### 第一步：点击按钮，部署代码

点击上方 **Deploy to Cloudflare** 按钮，按页面引导完成授权，Cloudflare 会自动将代码部署到你的 Pages 项目。

> ⚠️ 此时应用已上线但数据库尚未就绪，访问 API 会报错，继续第二步即可。

---

### 第二步：创建 D1 数据库并执行初始化 SQL

确保本地已安装 [Node.js](https://nodejs.org/)，然后执行：

```bash
# 1. 登录 Cloudflare（浏览器会弹出授权页面）
npx wrangler login

# 2. 创建 D1 数据库
npx wrangler d1 create codepower-db

# 3. 执行建表与种子数据写入（一次性操作）
npx wrangler d1 execute codepower-db --remote --file=./migrations/0000_init_schema.sql
```

执行完毕后，表结构与初始账号已写入云端，**无需修改任何代码文件**。

---

### 第三步：在 Cloudflare Dashboard 完成绑定配置

打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Pages** → 选择 `codepower` 项目 → **Settings** → **Functions**。

#### 3-1. 绑定 D1 数据库

在 **D1 database bindings** 处添加：

| Variable name | D1 database |
| :--- | :--- |
| `DB` | `codepower-db` |

点击 **Save**。

#### 3-2. 添加环境变量

在 **Environment variables** 处添加（Production 和 Preview 均需设置）：

| Variable name | 值 | 说明 |
| :--- | :--- | :--- |
| `JWT_SECRET` | 自定义随机字符串 | JWT 签名密钥，请勿使用示例值 |

点击 **Save**。

#### 3-3. 触发重新部署

在 **Deployments** 页面，点击最新部署右侧的 **Retry deployment**，等待约 1 分钟。

✅ **部署完成！** 访问 Pages 分配的 `.pages.dev` 域名即可使用系统。

---

## 🔑 默认账号信息

| 字段 | 值 |
| :--- | :--- |
| 用户名（域账号） | `admin@company.com` |
| 初始密码 | `admin123456` |

> ⚠️ 登录后请第一时间在右上角头像菜单中修改初始密码。
````

---

## 9. 部署架构决策说明

本节记录部署方案的关键决策，供开发与运维参考。

### 9.1 D1 数据库绑定方式

- **决策**：采用 **Cloudflare Dashboard 手动绑定**，而非将 `database_id` 写入 `wrangler.toml` 并提交代码。
- **原因**：
  1. 一键部署按钮仅能部署代码，无法自动创建 D1 数据库，两者必须分步完成。
  2. Dashboard 绑定无需额外 `git push`，代码仓库保持干净，`wrangler.toml` 中 `database_id` 使用占位符即可。

### 9.2 敏感配置管理原则

- `JWT_SECRET` 等敏感环境变量**只在 Cloudflare Dashboard → Settings → Environment Variables 中设置**，永远不写入代码仓库。
- `wrangler.toml` 中仅保留非敏感的结构配置（binding 名称、构建命令等），可安全提交到 GitHub。

### 9.3 `wrangler.toml` 中的 D1 配置说明

代码仓库中 `wrangler.toml` 的 D1 相关配置如下，`database_id` 为占位符，实际绑定在 Dashboard 完成：

```toml
[[d1_databases]]
binding = "DB"              # 代码中通过 env.DB 访问，此名称不可更改
database_name = "codepower-db"
database_id = ""            # 留空，通过 Dashboard 绑定，无需填写
```
