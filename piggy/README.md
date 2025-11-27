# Mood Journey · Piggy Diary

「写给 Piggy 的私密心情本」：它融合了可爱的少女系 UI、经期预测、情绪日历、AI 聊天伙伴以及记忆上传能力，让恋人之间的碎碎念、计划和心情都被温柔地保存下来。

## 项目简介

- 根路由会按照是否通过暗号登录决定显示密码锁还是主仪表盘。成功登录后即可在同一屏幕内查看心情日历、历史列表、经期预测和最新提醒。`app/page.tsx` 中通过 `hasValidSession`、`getMoods`、`getPeriods` 进行这一串服务端动作。  

```1:18:app/page.tsx
import { getMoods, getPeriods } from '@/lib/actions';
import { hasValidSession } from '@/lib/auth';
...
return <MoodDashboard moods={moods} periods={periods} />;
```

## 功能亮点

- **密码锁 + 密保多重防护**  
  使用 cookie 记录尝试次数，支持自动锁定、密保问题、数据库级锁升级与 30 天免登录。  

```10:345:lib/auth.ts
const AUTH_COOKIE = 'piggy-auth';
...
export async function authenticate(...){ ... }
```

- **心情日历 & 记录表单**  
  `saveMood` 会保存情绪强度、备注、日期键，并在勾选经期开始时写入 `periods` 表。超级心情（强度为 3）会触发邮件提醒。  

```29:117:lib/actions.ts
export async function saveMood(formData: FormData) {
  ...
  await pool.query('INSERT INTO moods (mood, intensity, note, date_key) VALUES (?, ?, ?, ?)', ...);
  if (intensity === 3) {
    sendSuperMoodAlert({ mood, note, isUpdate: Boolean(id) }).catch(...);
  }
}
```

- **经期预测**  
  仪表盘根据已保存周期自动推算平均周期、标记实际与预测区间，并在 180 天内绘制提示。  

- **Champ：会记忆的 AI 聊天伙伴**  
  前端聊天小部件通过 `/api/chat` 进行流式推理，后端会根据语义分类决定是否检索 Pinecone 里的记忆，并可自动把“帮我记住”的内容写入向量库。  

```65:235:app/api/chat/route.ts
const extraction = extractMemoryFromMessage(query);
...
const memories = await searchMemories(query, 4);
const reply = await callDeepseekChat({ messages: llmMessages, context });
```

- **记忆上传中心**  
  `/upload` 页面允许把文本/Markdown 或纯文字笔记切分后写入 Pinecone，方便 Champ 在聊天时引用。  

```24:124:app/api/upload-memory/route.ts
const chunks = chunkText(content);
...
await addMemories(records);
```

- **登录日志与安全追踪**：`/api/log-login` 会在认证通过后记录 IP、UA 到 `login_logs` 表，配合 `account_locks` 表实现风控。

## 技术栈

- 前端：Next.js 16 App Router、React 19、Tailwind CSS 4、Framer Motion、Lucide React。
- 后端：Next.js Server Actions + Route Handlers、MySQL（默认）与 Neon/Postgres 双引擎、Pinecone、OpenAI Embedding、DeepSeek Chat API。
- 其它：Nodemailer 邮件告警、date-fns 时间处理、PWA 风格贴纸组件系统。

## 目录速览

| 目录/文件 | 说明 |
| --- | --- |
| `app/page.tsx` | 登录鉴权 + 仪表盘入口 |
| `app/components/` | 心情日历、表单、聊天组件、贴纸等 UI 模块 |
| `app/api/chat` | AI 聊天 & 记忆写入 API |
| `app/api/upload-memory` | 文件/文本记忆上传 |
| `app/api/log-login` | 登录事件审计 |
| `lib/actions.ts` | Server Actions：心情、经期 CRUD |
| `lib/auth.ts` | 认证、锁定、密保流程 |
| `lib/vectorStore.ts` | Pinecone + OpenAI 向量工具 |
| `lib/db.ts` | MySQL/Neon 连接抽象 |
| `migrations/` | SQL 迁移：锁记录、登录日志、moods.date_key |

## 环境变量

| 变量 | 作用 |
| --- | --- |
| `GIRLFRIEND_PASSWORD` | 登录暗号（必填），会被哈希存到 cookie。 |
| `DB_CLIENT` | `mysql` / `postgres`，默认为 dev=MySQL，prod=Neon。 |
| `MYSQL_HOST/USER/PASSWORD/DATABASE` | MySQL 连接信息。 |
| `DATABASE_URL` | Neon/Postgres 连接字符串。 |
| `SMTP_URL/SMTP_USER/SMTP_PASS/...` | Nodemailer 配置，用于超级心情提醒。 |
| `SUPER_INTENSITY_ALERT_EMAIL` | 接收提醒的邮箱，默认 QQ 邮箱。 |
| `OPENAI_API_KEY` / `OPENAI_API_BASE` | Embedding 服务（text-embedding-3-small）。 |
| `PINECONE_API_KEY` / `PINECONE_INDEX` | 记忆向量库配置。 |
| `SMART_QUERY_CLASSIFIER` | 设为 `true` 启用 AI 语义分类器（默认关闭，用关键词）。 |
| `SMART_CLASSIFIER_MODEL` | 可选，指定分类模型（默认 `deepseek-chat`）。 |

> 没有配置 Pinecone 或 OpenAI 时，聊天仍可工作，只是不会检索历史记忆。

## 快速开始

1. **准备运行环境**  
   - Node.js ≥ 18.18  
   - MySQL 8.0（或准备好 PostgreSQL / Neon 数据库）
2. **安装依赖**
   ```bash
   npm install
   ```
3. **初始化数据库**  
   - 在目标库执行 `migrations/` 里的 SQL（可按序手动运行）。  
   - 创建 `moods`, `periods`, `login_logs`, `account_locks` 等表。
4. **配置 `.env.local`**
   ```ini
   GIRLFRIEND_PASSWORD=超级安全的暗号
   DB_CLIENT=mysql
   MYSQL_HOST=localhost
   MYSQL_USER=root
   MYSQL_PASSWORD=123456
   MYSQL_DATABASE=piggy_diary
   OPENAI_API_KEY=sk-***
   PINECONE_API_KEY=pca-***
   ```
5. **启动开发服务器**
   ```bash
   npm run dev
   ```
6. 打开 `http://localhost:3000`，输入暗号后即可看到主界面。

## 数据模型 & 记忆体系

- `moods`：`mood/intensity/note/date_key/created_at`，供心情日历与历史列表使用。  
- `periods`：记录经期开始日期，仪表盘据此预测下一个周期。  
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
  - 为数据库和 Pinecone 设置最小访问白名单；  
  - 在 SMTP 侧使用应用专用密码；  
  - 定期清理 `account_locks`、`login_logs`，避免无限膨胀。  
- 若需要多用户扩展，可在数据库中增加 `user_id` 字段并为 Pinecone namespace 做拆分。

## 后续 Roadmap

- [ ] 增加导出 PDF/CSV 功能。  
- [ ] 支持多类型文件（图片、语音）的记忆上传。  
- [ ] 仪表盘引入更多统计（情绪趋势、经期预测可视化）。  
- [ ] 可选多用户模式 + 权限。  
- [ ] 通过 Edge Functions 提升聊天延迟表现。

---

欢迎继续把你们的故事写进这个小站，如果需要新功能或设计稿，把想法告诉 Champ（或直接提 Issue）就好啦 ♡