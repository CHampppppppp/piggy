# Mood Journey · Girlfriend Diary

「写给女朋友的私密心情本」：它融合了可爱的少女系 UI、经期预测、情绪日历、AI Agent管家以及记忆上传能力，让恋人之间的碎碎念、计划和心情都被温柔地保存下来。

## 项目演示
https://www.bilibili.com/video/BV1qtSgBmEUS

## 项目简介

- 根路由会按照是否通过暗号登录决定显示登录界面还是主界面。成功登录后即可在同一屏幕内查看心情日历、历史列表、经期预测和最新提醒。`app/page.tsx` 中通过 `hasValidSession`、`getMoods`、`getPeriods` 进行这一串服务端动作。  

## 功能亮点

- **电子男友：会记忆的 AI 聊天伙伴兼管家（agent）**  

  - 有“大脑”做决策，意图识别，多步循环推理。

  - 拥有长时记忆（RAG）

  - 具备感知和环境交互（时间，天气感知）

  - 会使用工具，具备Function Calling 能力，可通过聊天直接操作魔法书：
    - 🗣️ 记录心情 (log_mood)

      女朋友：“今天老板发疯气死我了！”

      男朋友：自动调用工具在数据库记录一条 angry 心情，强度自动判断，并安抚你。

    - 🩸 记录经期 (track_period)

      女朋友：“大姨妈来了肚子痛……”

      男朋友：自动在日历记录经期开始，并提醒多喝热水。

    - 🧠 智能记忆 (save_memory)

      女朋友：“帮我记住周六要带猫去打疫苗。”

      男朋友：自动提取关键信息存入向量库（比之前的关键词匹配更智能）。

    - 🖼️ 情绪贴纸 (show_sticker)

      男朋友：在聊到开心或难过的话题时，可以在回复中直接发表情包（如 [STICKER:happy]），前端会自动渲染成大图贴纸。

    - 🌤️ 天气查询 (get_weather)

      女朋友：“今天北京天气怎么样？”

      男朋友：自动调用天气API获取实时天气信息并回复。

- **密码锁 + 密保多重防护**  
  使用 cookie 记录尝试次数，支持自动锁定、密保问题、数据库级锁升级与 30 天免登录。  

- **心情日历 & 记录表单**  
  `saveMood` 会保存情绪强度、备注、日期键，并在勾选经期开始时写入 `periods` 表。超级心情（强度为 3）会触发邮件提醒。  

- **经期预测**  
  魔法书根据已保存周期自动推算平均周期、标记实际与预测区间，并在 180 天内绘制提示。  

- **记忆上传中心**  
  `/upload` 页面允许把文本/Markdown 或纯文字笔记切分后写入 Pinecone，方便在聊天时引用。  

- **登录日志与安全追踪**：`/api/log-login` 会在认证通过后记录 IP、UA 到 `login_logs` 表，配合 `account_locks` 表实现风控。

## 技术栈

- 前端：Next.js 16 App Router、React 19、Tailwind CSS 4、Framer Motion、Lucide React。
- 后端：Next.js Server Actions + Route Handlers、MySQL（默认）与 Neon/Postgres 双引擎、Pinecone、OpenAI Embedding。
- AI 能力：DeepSeek Chat API (支持 Function Calling/Tool Use)、RAG (Retrieval-Augmented Generation)。
- 其它：Nodemailer 邮件告警、date-fns 时间处理、PWA 风格贴纸组件系统。

## 快速开始

1. **准备条件**  
   - Node.js ≥ 18.18  
   - MySQL/Neon云数据库
   - Pinecone 云向量存储库
   - 和风天气API
   - 大模型API

2. **进入项目目录并安装依赖**
   ```bash
   cd piggy
   npm install
   ```

3. **初始化数据库**  
   - 在目标库执行 `migrations/` 里的 SQL（分为 psql 版本和 mysql 版本）。  
   - 创建 `moods`, `periods`, `login_logs`, `account_locks` 等表。

4. **配置 `.env.local`** (注意：如果部署vercel，所有的环境变量都要在Vercel控制台里再配置一次)

```ini
# neon 云数据库（neon云数据库会给一个密钥类似于：）
DATABASE_URL="postgresql://neondb_owner:npg_t4EysdfdsfJU1@ep-twilight-glitter-ahwj4z24-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 本地mysql数据库
MYSQL_DATABASE="数据库名"
MYSQL_PASSWORD="数据库密码"

# 魔法书密码
GIRLFRIEND_PASSWORD="密码"

# DeepSeek 聊天配置
DEEPSEEK_API_KEY="deepseek api key"
# 可选：自定义 DeepSeek Base URL
# DEEPSEEK_API_BASE="https://api.deepseek.com"

# openai embedding（uiuiapi第三方平台）
OPENAI_API_KEY=openAi的api
OPENAI_BASE_URL=https://sg.uiuiapi.com/v1（baseurl，我这里用了第三方api平台，所以baseurl是第三方的）

# pinecone云向量存储库
PINECONE_API_KEY=pinecone密钥，免费官网获取
# 对应的index名（类似于数据库名）
PINECONE_INDEX=自己取名

# （可选）本地向量存储库服务 Chroma，使用 Docker 部署（自行查询）（这个和 Pinecone 二选一即可）
# CHROMA_URL=http://localhost:8000

# 接收邮箱配置（需要开启邮箱的 SMTP 服务，自行搜索）
SUPER_INTENSITY_ALERT_EMAIL=qq号@qq.com
SMTP_URL=smtps://qq号@qq.com:smtp密钥@smtp.qq.com:465
SMTP_FROM=qq号@qq.com

# 利用 AI 进行语义判断（是要采用 RAG 还是正常聊天）
SMART_QUERY_CLASSIFIER=true

# 天气API（和风天气）
QWEATHER_AUTH_TYPE=bearer
QWEATHER_API_HOST=参考控制台设置里面的api host
QWEATHER_KEY_ID=参考控制台里的凭据ID
QWEATHER_PROJECT_ID=参考控制台里的项目ID
QWEATHER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MC4CAsdsBQYDK2VwBCIEICcFdZzcMCh7sGTMOnZIW9Sz05dIXjFRx94jy9CsgjW8
-----END PRIVATE KEY-----
"（生成的私钥类似于上面的格式，另外还有公钥要上传到控制台）



# CRON Job key（每日定期执行某些任务，这里是检查经期）
CRON_SECRET="这个值自己随便取"
```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

6. 打开 `http://localhost:3000`，输入暗号后即可看到主界面。

## Agent 架构与记忆体系

Mood diary不仅仅是一个 Web App，更是一个完整的 **Autonomous AI Agent** 系统。

### 🧠 感知与决策系统
- **感知 (Perception)**：不仅接收用户文本，还感知当前时间、日期、时区 (`date-fns`) 和外部环境（如通过和风天气 API 获取实时天气）。
- **大脑 (Brain)**：基于 DeepSeek V3 构建的决策中枢，负责意图识别（Query Classification）和复杂任务规划。
- **行动 (Action)**：通过 Server Actions 执行具体任务，包括数据库读写、邮件发送、前端状态更新。

### 📚 记忆体系 (RAG Memory Stream)
- **结构化记忆 (SQL)**：
  - `moods`：核心情绪数据，用于生成统计图表和趋势分析。
  - `periods`：生理周期数据，用于算法预测。
- **非结构化记忆 (Vector DB)**：
  - Pinecone (`piggy` namespace) 存储语义向量，支持混合检索：
    - `mood`：自动同步的心情日记。
    - `file`：用户上传的文档/聊天记录切片。
    - `note`：对话中提取的关键信息（如“记住我喜欢吃草莓”）。

## 前端模块拆解

- `MoodDashboard`：核心控制台，集成状态管理、数据流转和 UI 交互。
- `MoodCalendar`：热力图风格的日历组件，动态展示情绪密度和生理期预测。
- `ChatWidget`：支持流式响应 (Streaming UI) 的智能对话框，内置打字机效果和自动滚动。
- `KawaiiStickers`：基于 PWA 优化的本地表情包系统，支持 AI 动态调用。
- `MemoryUploader`：支持断点续传和进度的记忆植入模块。

## 运行与部署建议

- **低成本架构**：完美适配 Vercel / Netlify 等 Serverless 环境。
- **数据库策略**：
  - 开发环境：MySQL / Docker
  - 生产环境：Neon (Serverless Postgres) + Pinecone (Serverless Vector DB)
- **安全建议**：
  - 生产环境强制开启 HTTPS (Cookie Secure 策略)。
  - SMTP 服务建议使用独立的应用专用密码。
  - 定期轮转 `CRON_SECRET` 以保护定时任务接口。

## 后续 Roadmap

- [ ] 增加导出 PDF/CSV 功能。  
- [ ] 支持多类型文件（图片、语音）的记忆上传。  
- [ ] 可选多用户模式 + 权限（男朋友方面能用的功能？评论？点赞？）
- 大概率不会再做了，除非有报酬heihei boy￥。

---
