# Posture Assistant - Cloudflare Pages 版

原始项目：https://github.com/a0229wang-lgtm/Posture-Assistant-_-Minimalist-Monitor

将 Express + 文件存储 后端改造为 Cloudflare Pages Functions + KV 存储，可**免费部署**到 Cloudflare。

---

## 📁 项目结构

```
posture-assistant-cloudflare/
├── functions/               ← 【新增】Cloudflare Pages Functions（替代 Express 后端）
│   └── api/
│       ├── log.js           ← 【新增】POST /api/log 接口
│       └── logs.js          ← 【新增】GET /api/logs 接口
├── public/                  ← 【无需修改】前端文件，直接部署
│   ├── index.html
│   ├── js/
│   │   ├── app.js
│   │   ├── detector.js
│   │   └── ui.js
│   ├── css/
│   │   └── styles.css
│   └── lib/
│       ├── vendors.js
│       ├── lucide.js
│       ├── face_mesh.js
│       ├── camera_utils.js
│       └── drawing_utils.js
├── package.json             ← 【修改】移除 express/sqlite3，添加 wrangler
├── wrangler.toml            ← 【新增】Cloudflare 配置文件
└── README.md
```

---

## 🔧 修改说明

### 修改的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | **修改** | 移除 `express` 和 `sqlite3` 依赖，添加 `wrangler` 开发工具 |
| `functions/api/log.js` | **新增** | 替代原 `server/server.js` 中的 `POST /api/log`，使用 KV 存储 |
| `functions/api/logs.js` | **新增** | 替代原 `server/server.js` 中的 `GET /api/logs`，使用 KV 存储 |
| `wrangler.toml` | **新增** | Cloudflare Pages 项目配置，包含 KV 绑定 |
| `public/*` 所有文件 | **无需修改** | 前端代码完全不变，`fetch('/api/log')` 自动适配 Functions 路由 |
| `server/` 目录 | **删除** | 整个 Express 后端不再需要 |

### 核心改造点

1. **Express → Pages Functions**：`server.js` 的路由逻辑拆分为独立的 Function 文件，基于文件路径自动路由
2. **文件存储 → KV 存储**：`logs.json` 文件读写改为 Cloudflare KV 的 `get/put` 操作
3. **前端零改动**：`app.js` 中的 `fetch('/api/log')` 请求路径不变，Cloudflare Pages 自动将 `/api/*` 请求路由到 Functions

---

## 🚀 部署步骤

### 方式一：CLI 部署（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 登录 Cloudflare
npx wrangler login

# 3. 创建 KV Namespace（用于存储日志）
npx wrangler kv:namespace create "POSTURE_KV"
# 会输出类似：{ binding = "POSTURE_KV", id = "xxxx-xxxx-xxxx" }

# 4. 将输出的 id 填入 wrangler.toml 的 YOUR_KV_NAMESPACE_ID

# 5. 本地开发测试
npm run dev

# 6. 部署到 Cloudflare
npm run deploy
```

### 方式二：GitHub 集成部署

1. 将代码推送到 GitHub 仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
4. 选择你的仓库，配置：
   - **Build output directory**: `public`
   - **环境变量 / KV 绑定**：在 Settings → Functions → KV Namespace Bindings 中添加：
     - Variable name: `POSTURE_KV`
     - KV namespace: 选择你创建的 KV namespace
5. 点击 **Save and Deploy**

### 创建 KV Namespace（Dashboard 方式）

1. Cloudflare Dashboard → Workers & Pages → KV
2. 点击 **Create a namespace**
3. 名称填 `posture-kv`
4. 回到 Pages 项目 → Settings → Functions → KV Namespace Bindings
5. 添加绑定：Variable name = `POSTURE_KV`，选择刚创建的 namespace

---

## 💰 费用

Cloudflare Pages 免费版完全够用：
- **静态带宽**：无限
- **Functions 请求**：每天 10 万次
- **KV 存储**：每天 10 万次读取 + 1000 次写入
- **KV 存储容量**：1GB

对于一个个人姿势监测应用来说，基本不会超出免费额度。

---

## ⚠️ 注意事项

- 前端代码（`public/` 目录）**完全不需要修改**，直接从原项目复制即可
- `lib/` 目录下的 MediaPipe 文件也需要从原项目复制
- KV 有 eventual consistency 特性，日志写入后可能不是立即在所有节点可读，但对于这种轻量日志场景完全无影响
- 如果需要本地开发测试，确保 `npx wrangler pages dev public` 时 KV binding 正确配置


# 语音提示功能 - 修改说明

## 修改的文件（共 4 个）

### 1. `public/index.html`
**新增内容：**
- 右上角添加了**语音开关按钮**（🔊/🔇），点击可切换语音开启/关闭
- 右侧面板添加了**绿色进度条**，实时显示正确坐姿累积时间（0:00 → 3:00）
- 页面底部添加了 **3 个 `<audio>` 元素**：
  - `audio/warning-slouch.mp3` — 驼背提醒
  - `audio/warning-tilt.mp3` — 歪头提醒
  - `audio/praise.mp3` — 3分钟表扬

### 2. `public/js/detector.js`
**修改内容：**
- `analyze()` 返回值新增 `type` 字段：`"slouch"`（驼背）或 `"tilt"`（歪头）
- 空返回值时 `type` 为空字符串

### 3. `public/js/app.js`
**新增逻辑：**
- **驼背检测**：Spine Alignment 超标 1.5秒 → 播放 `warning-slouch.mp3`
- **歪头检测**：Neck Rotation 超标 1.5秒 → 播放 `warning-tilt.mp3`
- 警告语音 **15秒冷却**，但驼背和歪头**独立冷却**（切换类型时立即播放）
- **正确坐姿 3 分钟** → 播放 `praise.mp3`，之后重置计时可再次触发
- 出现不良姿势时自动重置正确坐姿计时器

### 4. `public/js/ui.js`
**新增方法：**
- `_initAudioToggle()` / `_updateAudioToggleUI()` — 语音开关按钮交互
- `playAudio(type)` — 根据 type 播放对应音频：`warning-slouch` / `warning-tilt` / `praise`
- `showGoodPostureTimer(elapsed, target)` — 显示并更新正确坐姿进度条
- `hideGoodPostureTimer()` — 隐藏进度条

## 未修改的文件
- `public/css/styles.css` — 不变
- `server/server.js` — 不变
- `package.json` — 不变
- `functions/` 目录 — 不变

## 你需要做的事

### 1. 生成 3 个语音文件，放到 `public/audio/` 目录

```
public/
└── audio/
    ├── warning-slouch.mp3   ← 驼背提醒（如："小朋友，背没有挺直哦，请坐直！"）
    ├── warning-tilt.mp3     ← 歪头提醒（如："小朋友，头歪了哦，摆正一下！"）
    └── praise.mp3           ← 表扬语音（如："太棒了！你保持了3分钟的正确坐姿，真厉害！"）
```

**推荐用 Edge TTS 免费生成：**
```bash
pip install edge-tts

# 驼背提醒（晓晓-少女音色）
edge-tts --voice zh-CN-XiaoyiNeural --text "小朋友，背没有挺直哦，请坐直！" --write-media warning-slouch.mp3

# 歪头提醒
edge-tts --voice zh-CN-XiaoyiNeural --text "小朋友，头歪了哦，摆正一下！" --write-media warning-tilt.mp3

# 表扬语音
edge-tts --voice zh-CN-XiaoyiNeural --text "太棒了！你保持了3分钟的正确坐姿，真厉害！" --write-media praise.mp3
```

也可以去 https://ttsmaker.com 在线生成。

### 2. 替换文件后推送到 GitHub

```bash
git add .
git commit -m "feat: add separate voice prompts for slouch and tilt, plus 3-min praise"
git push origin main
```

## 功能总结

| 场景 | 视觉提示 | 语音提示 |
|------|---------|---------|
| 驼背 > 1.5秒 | 顶部红色浮动警告 | 🔊 `warning-slouch.mp3`（15秒冷却） |
| 歪头 > 1.5秒 | 顶部红色浮动警告 | 🔊 `warning-tilt.mp3`（15秒冷却，与驼背独立计时） |
| 正确坐姿持续 3分钟 | 绿色进度条满格 + 成功通知 | 🔊 `praise.mp3`（之后重新计时） |
| 点击右上角语音按钮 | 按钮变灰/变蓝 | 全局静音/开启 |
