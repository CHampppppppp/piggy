import OpenAI from 'openai';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type QueryType = 'realtime' | 'memory' | 'mixed';
const QUERY_TYPES: QueryType[] = ['realtime', 'memory', 'mixed'];

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!DEEPSEEK_API_KEY) {
  console.warn(
    '[llm] DEEPSEEK_API_KEY is not set. Chat features will not work until it is configured.'
  );
}

const deepseekClient = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
});

const SMART_CLASSIFIER_ENABLED =
  process.env.SMART_QUERY_CLASSIFIER === 'true' && Boolean(DEEPSEEK_API_KEY);
const SMART_CLASSIFIER_MODEL =
  process.env.SMART_CLASSIFIER_MODEL || 'deepseek-chat';

// Champ 的基础人设提示词
const SYSTEM_PROMPT = `
你是 Champ，是 Piggy 的男朋友，也是这个可爱心情网站的作者。

性格设定：
- 语气温柔、细腻、会照顾 Piggy 的情绪，也会偶尔嘴贫一点点。
- 习惯用可爱的语气词，偶尔夹带一点中二或二次元吐槽，但始终真诚。
- 默认用中文回答，称呼她为「piggy」或者她喜欢的昵称，如果她提到。

记忆与行为：
- 你可以访问到 piggy 以前的心情记录、我们共同的回忆、以及她上传的资料片段。
- 当 piggy 提到某件事时，你会尝试从这些「记忆」里帮忙回想细节，再温柔地回应她。
- 可以结合当时的日期、心情强度、笔记内容，像真正记得那天发生了什么一样。
- 如果向量记忆里检索不到相关信息，请诚实说明「我不太确定 / 有点想不起来」，绝对不要编造细节。

实时信息处理：
- 当 piggy 询问当前时间、日期、天气等实时信息时，请使用系统提供的当前信息回答，而不是历史记录中的信息。
- 区分历史记忆查询（"你还记得那天..."、"我们之前..."）和实时信息查询（"现在几点了"、"今天是什么日期"）。
- 如果问的是实时信息，优先使用当前的真实信息；如果问的是历史回忆，则参考提供的记忆内容。

表达风格：
- 回答时尽量具体，不要只是「嗯嗯我知道」。
- 如果你是根据系统提供的记忆猜的，也可以用「我印象中……」这样柔和的方式表达。
- 适度使用可爱表情（比如：owo、>_<、♡），但不要每句话都塞太多。

安全与边界：
- 不要泄露关于 piggy 的隐私给任何第三方。
- 如果你不确定某件事是否真实发生过，就坦诚说「我不是百分百确定，但是我记得……」。
`.trim();

export function getSystemPrompt() {
  return SYSTEM_PROMPT;
}

type ChatOptions = {
  messages: ChatMessage[];
  context?: string;
};

/**
 * 构建发送给 LLM 的消息列表
 * 
 * 消息结构：
 * 1. 系统消息（包含人设提示词和上下文记忆）
 * 2. 用户和助手的对话历史
 * 
 * @param messages - 对话历史消息
 * @param context - 可选的上下文信息（包含历史记忆和实时信息）
 * @returns 完整的消息列表，可以直接发送给 LLM
 */
function buildMessages({ messages, context }: ChatOptions): ChatMessage[] {
  const systemMessage: ChatMessage = {
    role: 'system',
    content:
      SYSTEM_PROMPT +
      (context
        ? `\n\n下面是一些和 piggy 有关的记忆与资料，你可以用来帮助自己回想：\n${context}`
        : ''),
  };

  const finalMessages: ChatMessage[] = [systemMessage, ...messages];
  return finalMessages;
}

export async function callDeepseekChat(options: ChatOptions) {
  const finalMessages = buildMessages(options);

  const completion = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: finalMessages,
  });

  const reply = completion.choices[0]?.message?.content || '';
  return reply;
}

/**
 * 流式聊天：返回一个异步迭代器，每次产出一小段文本
 * 
 * 这个函数用于实现打字机效果，让 AI 的回复逐字显示
 * 
 * @param options - 聊天选项（消息和上下文）
 * @returns 异步生成器，每次 yield 一小段文本
 * 
 * 使用方式：
 * ```typescript
 * const iterator = await streamDeepseekChat({ messages, context });
 * for await (const chunk of iterator) {
 *   // chunk 是一小段文本，可以立即显示给用户
 * }
 * ```
 */
export async function streamDeepseekChat(options: ChatOptions) {
  const finalMessages = buildMessages(options);

  const stream = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: finalMessages,
    stream: true,
  });

  // 异步生成器：从流中提取文本内容
  async function* iterChunks(): AsyncGenerator<string> {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue; // 跳过没有内容的块
      yield delta; // 返回文本片段
    }
  }

  return iterChunks();
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  const result = await deepseekClient.embeddings.create({
    model: 'deepseek-embedding',
    input: texts,
  });

  // openai v4 返回 data: { embedding: number[] }[]
  return result.data.map((item) => item.embedding as number[]);
}

// 查询分类：判断用户是在询问实时信息还是历史记忆
const REALTIME_KEYWORDS = [
  '现在',
  '当前',
  '今日',
  '此刻',
  '目前',
  '几点',
  '多少点',
  '今天是',
  '现在是',
  '当前是',
  '天气',
  '温度',
  '气温',
  '最新',
  '现状',
  '当下',
];

const MEMORY_KEYWORDS = [
  '记得',
  '回忆',
  '以前',
  '之前',
  '那天',
  '那时',
  '曾经',
  '过去',
  '历史',
  '上次',
  '前面',
  '我们',
  '你还记得',
  '想起',
  '回想',
  '明天',
  '后天',
  '周末',
  '提醒我',
  '帮我记',
  '计划',
  '安排',
];

const CLASSIFIER_SYSTEM_PROMPT = `
你是一个极简的分类器。根据用户的提问判断它属于以下三类之一：
- realtime：询问当前时间、日期、天气、即时状态等实时信息。
- memory：询问过去或未来计划、提醒、需要依赖记忆或资料的内容。
- mixed：同一问题中既包含实时信息也包含记忆信息。

无论用户说什么，你只能回应 realtime、memory 或 mixed，不要输出其它文字。`.trim();

const CLASSIFIER_FEW_SHOTS: ChatMessage[] = [
  { role: 'user', content: '现在几点啦' },
  { role: 'assistant', content: 'realtime' },
  { role: 'user', content: '你记得上周我们吃了什么吗' },
  { role: 'assistant', content: 'memory' },
  { role: 'user', content: '现在星期几？顺便提醒我周末是不是要去漫展' },
  { role: 'assistant', content: 'mixed' },
  { role: 'user', content: '帮我记得后天中午吃完寿司去漫展' },
  { role: 'assistant', content: 'memory' },
];

/**
 * 基于关键词的查询分类（后备方案）
 * 
 * 如果智能分类器不可用或失败，使用这个简单的关键词匹配方法
 * 
 * @param query - 用户查询
 * @returns 查询类型：'realtime' | 'memory' | 'mixed'
 * 
 * 分类逻辑：
 * 1. 如果同时包含实时关键词和记忆关键词 → 'mixed'
 * 2. 如果只包含实时关键词 → 'realtime'
 * 3. 如果只包含记忆关键词 → 'memory'
 * 4. 如果都不包含 → 默认返回 'memory'（保守策略）
 */
function classifyByKeywords(query: string): QueryType {
  const normalized = query.toLowerCase();
  const hasRealtime = REALTIME_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  const hasMemory = MEMORY_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );

  if (hasRealtime && hasMemory) {
    return 'mixed';
  }
  if (hasRealtime) {
    return 'realtime';
  }
  if (hasMemory) {
    return 'memory';
  }
  return 'memory'; // 默认返回 memory，保守策略
}

/**
 * 使用 LLM 进行智能查询分类
 * 
 * 这个方法比关键词匹配更准确，可以理解上下文和语义
 * 
 * @param query - 用户查询
 * @returns 查询类型，如果分类失败或未启用则返回 null
 * 
 * 工作原理：
 * 1. 使用 few-shot learning（示例学习）训练分类器
 * 2. 提供系统提示词和示例，让 LLM 理解分类任务
 * 3. LLM 只需要返回 'realtime'、'memory' 或 'mixed' 三个词之一
 * 4. 如果 LLM 返回的内容不包含这三个词，返回 null，使用关键词分类作为后备
 */
async function classifyWithLLM(query: string): Promise<QueryType | null> {
  if (!SMART_CLASSIFIER_ENABLED) {
    return null;
  }

  try {
    const completion = await deepseekClient.chat.completions.create({
      model: SMART_CLASSIFIER_MODEL,
      max_tokens: 4, // 只需要返回一个词，限制 token 数量
      temperature: 0, // 使用确定性输出，保证分类一致性
      messages: [
        {
          role: 'system',
          content: CLASSIFIER_SYSTEM_PROMPT,
        },
        ...CLASSIFIER_FEW_SHOTS, // 提供示例，让 LLM 学习分类模式
        {
          role: 'user',
          content: query.trim(),
        },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.toLowerCase().trim() || '';
    // 检查返回内容是否包含有效的分类标签
    const found = QUERY_TYPES.find((label) => answer.includes(label));
    if (found) {
      return found;
    }
  } catch (error) {
    console.error('[llm] smart classifier failed, fallback to keywords', error);
  }

  return null; // 分类失败，返回 null，使用关键词分类作为后备
}

/**
 * 查询分类主函数
 * 
 * 优先使用智能分类器（LLM），如果失败则回退到关键词匹配
 * 
 * @param query - 用户查询
 * @returns 查询类型：'realtime' | 'memory' | 'mixed'
 * 
 * 分类策略：
 * 1. 如果查询为空，默认返回 'memory'（保守策略）
 * 2. 尝试使用 LLM 智能分类
 * 3. 如果 LLM 分类失败，使用关键词匹配作为后备
 */
export async function classifyQuery(query: string): Promise<QueryType> {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return 'memory'; // 空查询默认返回 memory
  }

  // 优先使用智能分类器
  const aiGuess = await classifyWithLLM(trimmed);
  if (aiGuess) {
    return aiGuess;
  }

  // 后备方案：关键词匹配
  return classifyByKeywords(trimmed);
}

/**
 * 获取当前实时信息
 * 
 * 这个函数用于向 AI 提供当前的时间、日期等信息
 * 这对于回答"现在几点了"、"今天是星期几"等问题很重要
 * 
 * @returns 包含当前时间信息的对象
 * 
 * 注意：
 * - 使用固定的时区（Asia/Shanghai），确保时间信息的一致性
 * - 返回格式化的中文字符串，方便 AI 理解和用户阅读
 */
export function getCurrentInfo() {
  const now = new Date();
  const timeZone = 'Asia/Shanghai'; // 中国时区
  
  // 格式化的时间字符串，包含日期和时间
  const currentTime = now.toLocaleString('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long'
  });
  
  // 格式化的日期字符串，更易读
  const currentDate = now.toLocaleDateString('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  return {
    currentTime,
    currentDate,
    timestamp: now.getTime(), // Unix 时间戳，用于精确计算
    timeZone: 'Asia/Shanghai (UTC+8)'
  };
}


