# Mood Journey · Girlfriend Diary

「写给女朋友的私密心情本」：它融合了可爱的少女系 UI、经期预测、情绪日历、AI 聊天伙伴以及记忆上传能力，让恋人之间的碎碎念、计划和心情都被温柔地保存下来。

## 项目简介

- 根路由会按照是否通过暗号登录决定显示登录界面还是主界面。成功登录后即可在同一屏幕内查看心情日历、历史列表、经期预测和最新提醒。`app/page.tsx` 中通过 `hasValidSession`、`getMoods`、`getPeriods` 进行这一串服务端动作。  

## 功能亮点

- **密码锁 + 密保多重防护**  
  使用 cookie 记录尝试次数，支持自动锁定、密保问题、数据库级锁升级与 30 天免登录。  

- **心情日历 & 记录表单**  
  `saveMood` 会保存情绪强度、备注、日期键，并在勾选经期开始时写入 `periods` 表。超级心情（强度为 3）会触发邮件提醒。  

- **经期预测**  
  魔法书根据已保存周期自动推算平均周期、标记实际与预测区间，并在 180 天内绘制提示。  

- **Champ：会记忆的 AI 聊天伙伴**  
  前端聊天小部件通过 `/api/chat` 进行流式推理，后端会根据语义分类决定是否检索 Pinecone 里的记忆，并可自动把“帮我记住”的内容写入向量库。  

- **记忆上传中心**  
  `/upload` 页面允许把文本/Markdown 或纯文字笔记切分后写入 Pinecone，方便在聊天时引用。  

- **登录日志与安全追踪**：`/api/log-login` 会在认证通过后记录 IP、UA 到 `login_logs` 表，配合 `account_locks` 表实现风控。

## 技术栈

- 前端：Next.js 16 App Router、React 19、Tailwind CSS 4、Framer Motion、Lucide React。
- 后端：Next.js Server Actions + Route Handlers、MySQL（默认）与 Neon/Postgres 双引擎、Pinecone、OpenAI Embedding、DeepSeek Chat API。
- 其它：Nodemailer 邮件告警、date-fns 时间处理、PWA 风格贴纸组件系统。

## 环境变量（如果部署到vercel，还需要在vercel控制台里配置）
- DATABASE_URL
- GIRLFRIEND_PASSWORD
- DEEPSEEK_API_KEY
- SMTP_URL
- SMTP_FROM
- SMART_QUERY_CLASSIFIER
> 以下是RAG功能所需变量，没有配置时，聊天仍可工作，只是没有记忆功能。
- OPENAI_API_KEY
- OPENAI_BASE_URL
- PINECONE_API_KEY
- PINECONE_INDEX
- CHROMA_URL（可选）

## 快速开始

1. **准备运行环境**  
   - Node.js ≥ 18.18  
   - MySQL（或准备好 Neon 云数据库）
   - pinecone云向量存储库
2. **安装依赖**
   ```bash
   进入piggy目录

   npm install
   ```
3. **初始化数据库**  
   - 在目标库执行 `migrations/` 里的 SQL（分为psql版本和mysql版本）。  
   - 创建 `moods`, `periods`, `login_logs`, `account_locks` 等表。
4. **配置 `.env.local`**

```ini
 # neon 云数据库（neon云数据库会给一个密钥类似于：）
DATABASE_URL="postgresql://neondb_owner:npg_t4EysdfdsfJU1@ep-twilight-glitter-ahwj4z24-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 密码
GIRLFRIEND_PASSWORD="密码"

# deepseek聊天
DEEPSEEK_API_KEY="deepseek api"

# openai embedding（uiuiapi第三方平台）
OPENAI_API_KEY=openAi的api
OPENAI_BASE_URL=https://sg.uiuiapi.com/v1（baseurl，我这里用了第三方api平台，所以baseurl是第三方的）

# pinecone云向量存储库
PINECONE_API_KEY=pinecone密钥，免费官网获取
# 对应的index名（类似于数据库名）
PINECONE_INDEX=自定义

# （可选）本地向量存储库服务chroma，使用docker部署（自行查询）（这个和pinecone二选一即可）
#CHROMA_URL=http://localhost:8000

# 接收邮箱配置（需要开启smtp服务，自行搜索）
SMTP_URL=smtps://qq号@qq.com:smtp密钥@smtp.qq.com:465
SMTP_FROM=qq号@qq.com

# 利用ai进行语义判断（是要采用rag还是正常聊天）
SMART_QUERY_CLASSIFIER=true（或者false）
```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

6. 打开 `http://localhost:3000`，输入暗号后即可看到主界面。

## 数据模型 & 记忆体系

- `moods`：`mood/intensity/note/date_key/created_at`，供心情日历与历史列表使用。  
- `periods`：记录经期开始日期，魔法书据此预测下一个周期。  
- `account_locks`：保存锁定原因、时长、类型（密码/密保）。  
- `login_logs`：记录成功登录的 UA/IP。  
- Pinecone 中的 `piggy` namespace 同时收集三类记忆：  
  - `mood`：来自心情记录；  
  - `file`：上传的文档切片；  
  - `note`：聊天或纯文字上传的备忘。

## 前端模块拆解

- `MoodDashboard`：汇总卡片、每日问候、心情表单、日历/历史切换、AI 聊天浮窗。  
- `MoodCalendar`：按照 `date_key` 使颜色分级，并对经期状态进行背景标记。  
- `MoodHistory`：分组显示最近 30 天天气泡卡片。  
- `MoodForm`：创建/更新心情（含“今天就是纪念日/经期开始”选项）。  
- `ChatWidget`：右下角浮动聊天悬窗，支持流式输出和 Enter 发送。  
- `MemoryUploader`：文本切块与上传进度反馈。

## 运行与部署建议

- 默认监听 `3000` 端口，可直接部署到 Vercel 或任意 Node 服务器。  
- 生产环境建议：  
  - 配置 HTTPS 与真实域名，确保 cookie `secure` 生效；  
  - 在 SMTP 侧使用应用专用密码；
  - 定期清理 `account_locks`、`login_logs`，避免无限膨胀。  
- 若需要多用户扩展，可在数据库中增加 `user_id` 字段并为 Pinecone namespace 做拆分。

## 后续 Roadmap

- [ ] 增加导出 PDF/CSV 功能。  
- [ ] 支持多类型文件（图片、语音）的记忆上传。  
- [ ] 可选多用户模式 + 权限（男朋友方面能用的功能？评论？点赞？）
- 大概率不会再做了，除非有报酬heihei boy￥。

---