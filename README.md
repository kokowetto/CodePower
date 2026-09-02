# ⚡ CodePower（码力加）

> 集团 GitHub Copilot 额度申领与智能审批平台。支持多角色登录、额度申领流转、经理一键审批并自动唤起 Outlook 生成向上汇报邮件草稿。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kokowetto/CodePower)

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
