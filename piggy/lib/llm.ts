import OpenAI from 'openai';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

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

// 流式聊天：返回一个异步迭代器，每次产出一小段文本
export async function streamDeepseekChat(options: ChatOptions) {
  const finalMessages = buildMessages(options);

  const stream = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: finalMessages,
    stream: true,
  });

  async function* iterChunks(): AsyncGenerator<string> {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;
      yield delta;
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
export function classifyQuery(query: string): 'realtime' | 'memory' | 'mixed' {
  const realtimeKeywords = [
    '现在', '当前', '今天', '今日', '此刻', '目前', 
    '几点', '什么时间', '什么时候', '多少点', 
    '今天是', '现在是', '当前是',
    '天气', '温度', '气温',
    '最新', '现状', '当下'
  ];
  
  const memoryKeywords = [
    '记得', '回忆', '以前', '之前', '那天', '那时', 
    '曾经', '过去', '历史', '上次', '前面',
    '我们', '你还记得', '想起', '回想'
  ];
  
  const queryLower = query.toLowerCase();
  
  const hasRealtimeKeywords = realtimeKeywords.some(keyword => 
    queryLower.includes(keyword)
  );
  
  const hasMemoryKeywords = memoryKeywords.some(keyword => 
    queryLower.includes(keyword)
  );
  
  if (hasRealtimeKeywords && hasMemoryKeywords) {
    return 'mixed';
  } else if (hasRealtimeKeywords) {
    return 'realtime';
  } else if (hasMemoryKeywords) {
    return 'memory';
  } else {
    // 默认情况下，如果不确定，倾向于使用记忆检索
    return 'memory';
  }
}

// 获取当前实时信息
export function getCurrentInfo() {
  const now = new Date();
  const timeZone = 'Asia/Shanghai'; // 中国时区
  
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
    timestamp: now.getTime(),
    timeZone: 'Asia/Shanghai (UTC+8)'
  };
}


