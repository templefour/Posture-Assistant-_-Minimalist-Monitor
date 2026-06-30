# Vercel 部署指南 (Vercel Deployment Guide)

这份文档将指导你如何将 **Posture Assistant** 应用部署到 Vercel 平台。

> [!WARNING]
> **重要提示：数据持久化问题**
> Vercel 是无服务器（Serverless）环境，文件系统是**只读且临时的**。
> 目前代码中的日志功能 (`server/server.js` 写入 `logs.json`) 在 Vercel 上**无法正常工作**。
> - 写入操作可能会失败（权限错误）或看似成功但数据随即丢失（因为容器会被销毁）。
> - **建议方案**：若需保留生产环境日志，请改用数据库（如 MongoDB, Postgres, Vercel KV）或云端日志服务。

## 1. 准备工作

在开始之前，请确保你已经：

- 拥有一个 [GitHub](https://github.com/) 账号。
- 拥有一个 [Vercel](https://vercel.com/) 账号。
- 安装了本地 Git 工具。

## 2. 项目配置 (已自动完成)

为了适配 Vercel 环境，我们在项目根目录创建了 `vercel.json` 配置文件。

```json
{
  "version": 2,
  "builds": [
    { "src": "server/server.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/server/server.js" },
    { "src": "/(.*)", "dest": "/public/$1" }
  ]
}
```

这个配置告诉 Vercel：
1. 使用 Node.js 环境运行 `server/server.js`。
2. 将 `public` 文件夹作为静态资源托管。
3. 将 `/api/*` 开头的请求转发给后端服务器，其他请求转发给前端静态文件。

## 3. 部署步骤

### 步骤 A: 推送到 GitHub

如果你的代码还没有上传到 GitHub，请执行以下命令：

1. 初始化 Git 仓库（如果未初始化）：
   ```bash
   git init
   ```
2. 添加文件并提交：
   ```bash
   git add .
   git commit -m "Initial commit"
   ```
3. 在 GitHub 上创建一个新仓库（Repository）。
4. 将本地代码推送到 GitHub：
   ```bash
   git branch -M main
   git remote add origin <你的GitHub仓库地址>
   git push -u origin main
   ```

### 步骤 B: 在 Vercel 上导入

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)。
2. 点击 **"Add New..."** -> **"Project"**。
3. 在 "Import Git Repository" 列表中找到刚才创建的 GitHub 仓库，点击 **"Import"**。

### 步骤 C: 配置部署

在 "Configure Project" 页面：

1. **Project Name**: 保持默认或自定义。
2. **Framework Preset**: 选择 **"Other"** (因为我们使用了自定义结构)。
3. **Build & Output Settings**:
   - **Build Command**: 留空（或者填 `npm install`，通常 Vercel 会自动处理）。
   - **Output Directory**: 留空（我们通过 `vercel.json` 配置了路径）。
4. **Environment Variables**: 如果将来使用数据库，在这里添加数据库连接字符串。
5. 点击 **"Deploy"**。

## 4. 验证部署

部署完成后，Vercel 会提供一个访问域名（例如 `posture-assistant.vercel.app`）。

- 访问首页：应该能看到应用界面。
- 测试 API：虽然日志无法持久保存，但你可以检查控制台或网络请求，确认 `/api/log` 接口是否返回 200 状态码。

## 5. 后续优化建议

为了解决数据无法保存的问题，建议修改 `server/server.js`，接入外部数据库。

例如使用 Vercel Postgres 或 MongoDB Atlas：
1. 注册数据库服务并获取连接 URL。
2. 在 Vercel 项目设置中添加环境变量（如 `DATABASE_URL`）。
3. 修改代码使用数据库客户端替代 `fs` 文件读写。
