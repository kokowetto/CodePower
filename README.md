# ⚡ CodePower（码力加）

> 集团 GitHub Copilot 额度申领与智能审批平台。基于全 Serverless 云原生架构构建，支持员工快捷申领、经理一键审批并无缝拉起本地 Outlook 生成向上汇报邮件草稿。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kokowetto/CodePower)

---

## ✨ 核心特性

- ⚡ **零成本无服务器架构**：基于 **Cloudflare Pages + Functions** 构建，无需采购云服务器，免配 Nginx/Node 容器。
- 🗄️ **云原生 Serverless 数据库**：集成 **Cloudflare D1 (SQLite)**，通过配置即代码（Configuration as Code）实现自动绑定与毫秒级查询。
- ✉️ **无缝联动本地 Outlook**：
  - 经理点击“同意”即刻唤醒本地 Outlook 客户端并自动填充收件领导、抄送员工、主题与工整格式的正文草稿；
  - 具备独立弹窗操作卡片与“一键复制草稿”双重后备保障，无惧任何网络或浏览器外部协议拦截。
- 👥 **精准分权与成员管控**：
  - **普通员工端**：申请额度、填写个人上限与已使用量、查看申请历史流水；
  - **经理管理端**：审批中心、成员账号维护（新增/启停/一键重置密码为 123456）。
- ⚙️ **高度可配置的基础字典与模板**：
  - 项目名称、额度档位、用途理由支持在线新增、物理删除（带二次确认）、排序调整与启用禁用；
  - 邮件模板支持可视化自定义，内置 10+ 动态业务变量并支持实时排版预览。

---

## 🖥️ 功能模块一览

### 1. 员工申请台 (`/apply`)
- **项目选择**：下拉单选（取自启用的项目字典，如 `Converge` 等）；
- **申请额度**：下拉单选（取自启用的额度字典，如 `2000 credits`、`5000 credits` 等）；
- **当前个人上限**：整数输入（`0 ~ 50000` 范围校验）；
- **已使用量**：整数输入（`0 ~ 50000` 范围校验）；
- **用途及理由**：基础理由下拉选择 + 50 字以内补充理由（自动智能合并为最终理由）；
- **我的申请记录**：表格展示历史申请单号、额度详情、申请时间与状态 Badge。

### 2. 经理管理工作台 (`/admin`)
- **【审批中心】**：全量单据流转，支持“待审批/已通过/已拒绝/全部”状态筛选；一键同意触发 Outlook 唤起与草稿复制；
- **【成员账号管理】**：添加域成员、停用违规账号、一键重置密码为 `123456`；
- **【基础字典维护】**：项目维护、额度档位维护、用途理由维护（支持新增、删除二次确认、上移下移排序与停用开关）；
- **【邮件模板配置】**：自定义 To、Cc、主题与正文，提供常用变量一键复制及右侧虚拟变量实时渲染预览。

---

## 📋 邮件模板可用动态变量

在【邮件模板配置】的正文、主题及抄送中，均支持以下变量自动替换（系统已做不区分大小写及空格容错处理）：

| 变量名 | 说明 | 示例值 |
| :--- | :--- | :--- |
| `${applicantName}` | 申请人真实姓名 | `张三` |
| `${applicantEmail}` | 申请人域账号邮箱 | `zhangsan@company.com` |
| `${projectName}` | 申请所属项目名称 | `Converge` |
| `${credits}` | 本次申请额度数值 | `2000` |
| `${userLimit}` | 员工填写的当前个人上限 | `2000` |
| `${usedCredits}` | 员工填写的已使用量 | `1850` |
| `${finalReason}` | 最终合并后的用途理由（含补充说明） | `项目开发需要（主模块重构）` |
| `${applyTime}` | 申请提交时间（YYYY/M/D HH:mm:ss） | `2026/9/2 08:49:23` |
| `${endTime}` | 额度截止时间（**自动计算申请月份最后一天**） | `2026-09-30` |
| `${managerName}` | 当前执行审批的开发经理姓名 | `开发经理` |

---

## 🚀 部署指南

### 第一步：创建 D1 数据库并执行初始化 SQL

确保本地已安装 [Node.js](https://nodejs.org/)，在终端中执行：

```bash
# 1. 登录 Cloudflare（浏览器会自动弹出授权）
npx wrangler login

# 2. 创建 D1 数据库
npx wrangler d1 create codepower-db
```
创建完成后终端会输出形如：`database_id = "32ea4c2e-f7a1-4c5b-a135-044bf4532158"` 的 UUID。

```bash
# 3. 将真实 database_id 填入 wrangler.toml 的 database_id 字段中
# 4. 执行表结构与种子数据初始化（一次性操作）
npx wrangler d1 execute codepower-db --remote --file=./migrations/0000_init_schema.sql
```

### 第二步：推送代码到 GitHub 并关联 Cloudflare Pages

1. 将代码推送到您的 GitHub 仓库；
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**；
3. 选择代码仓库，构建设置配置如下：
   - **Framework preset (框架预设)**：`Vite`（若下拉没有可直接选 `None`）
   - **Build command (构建命令)**：`npm run build`
   - **Build output directory (输出目录)**：`dist`
4. 点击 **Save and Deploy**，Pages 会通过 `wrangler.toml` 中的配置自动绑定 D1 数据库。

---

## 🔑 默认账号信息

| 角色 | 用户名（域账号） | 初始密码 |
| :--- | :--- | :--- |
| 开发经理（管理员） | `admin@company.com` | `admin123456` |
| 普通员工（新创建） | 由经理在管理台添加 | `123456` |

> ⚠️ 登录后请第一时间在右上角头像菜单中修改密码。

---

## ❓ Windows 11 与 Outlook 常见问题排查（FAQ）

#### Q1：在 Windows 11 上点击“同意”或“唤起Outlook”后没有反应怎么办？
- **原因**：Windows 11 预装了“新版 Outlook (Outlook new)”，而公司通常使用的是通过域账号激活的经典版 Office Outlook（如 2108 版本）。Win11 默认会将系统 `MAILTO` 邮件协议绑定给未配置的新版 Outlook。
- **解决方法**：
  1. 按快捷键 <kbd>Win</kbd> + <kbd>I</kbd> 打开 **Windows 设置** ➔ **应用** ➔ **默认应用**；
  2. 底部选择 **按协议指定默认值 (Choose defaults by protocol)** ➔ 搜索 **`MAILTO`**；
  3. 将默认应用更改为经典版 **Outlook**（深蓝色方形图标，不带“New”角标）；
  4. 审批前保持经典版 Outlook 在后台运行。

#### Q2：浏览器弹出拦截提示怎么办？
- 首次唤起时 Edge / Chrome 会询问“是否打开 Outlook”，若不小心点击了取消，可在 `edge://settings/content/handlers` 或 `chrome://settings/handlers` 中移除对该网站的拦截，或者在审批成功弹窗中直接点击 **【直接在 Outlook 中打开 ↗】** 原生链接。

#### Q3：如果机器完全禁止拉起外部客户端怎么办？
- 点击审批单据旁的 **【复制草稿】** 按钮，系统会将已填好收件人、抄送、主题和排版正文的完整内容一键复制到剪贴板，手动粘贴即可。

---

## 🛠️ 本地开发调试

```bash
# 安装依赖
npm install

# 启动本地前端开发服务器
npm run dev

# 编译类型检查与前端打包
npm run build
```
