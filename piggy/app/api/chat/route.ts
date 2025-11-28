import { NextRequest, NextResponse } from 'next/server';
import {
  callDeepseekChat,
  type ChatMessage,
  streamDeepseekChat,
  getSystemPrompt,
  classifyQuery,
  getCurrentInfo,
} from '@/lib/llm';
import { searchMemories, addMemories, type MemoryRecord } from '@/lib/vectorStore';

type ApiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ExtractedMemory = {
  text: string;
  cueOnly: boolean;
};

/**
 * 记忆请求关键词列表
 * 当用户消息包含这些关键词时，系统会尝试提取并保存记忆
 */
const MEMORY_REQUEST_KEYWORDS = [
  '记住',
  '记得',
  '记一下',
  '记好',
  '记牢',
  '别忘',
  '不要忘',
  '帮我记',
  '帮忙记',
  '记在心里',
];

/**
 * 从用户消息中提取需要记忆的内容
 * 
 * 这个函数用于识别用户是否想让 AI 记住某些信息
 * 
 * @param message - 用户消息
 * @returns 提取的记忆内容，如果消息不包含记忆请求则返回 null
 * 
 * 处理流程：
 * 1. 检查消息是否包含记忆请求关键词
 * 2. 如果包含，移除所有关键词和常见前缀（如"请"、"帮我"等）
 * 3. 清理首尾的标点符号和空白
 * 4. 如果清理后的内容少于6个字符，标记为 cueOnly（只有提示词，没有实际内容）
 * 5. 如果用户只是说"帮我记着"而没有具体内容，后续会使用上一条消息的内容
 */
function extractMemoryFromMessage(message: string): ExtractedMemory | null {
  const normalized = message?.trim();
  if (!normalized) return null;

  // 检查是否包含记忆请求关键词
  const hasCue = MEMORY_REQUEST_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  if (!hasCue) return null;

  // 移除所有记忆请求关键词
  let cleaned = normalized;
  MEMORY_REQUEST_KEYWORDS.forEach((keyword) => {
    cleaned = cleaned.replaceAll(keyword, '');
  });

  // 移除常见的前缀词和首尾标点符号
  cleaned = cleaned.replace(/^(请|麻烦你|帮我|帮忙|要|记)/, '').trim();
  cleaned = cleaned.replace(/^[，。.!?\s]+|[，。.!?\s]+$/g, '').trim();

  // 如果清理后内容太短，说明用户可能只是说了"帮我记着"而没有具体内容
  if (cleaned.length < 6) {
    return {
      text: normalized,
      cueOnly: true, // 标记为只有提示词，没有实际内容
    };
  }

  return {
    text: cleaned,
    cueOnly: false,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = (body?.messages || []) as ApiChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages is required' },
        { status: 400 }
      );
    }

    // 获取最后两条用户消息，用于记忆提取
    // 如果用户只说"帮我记着"而没有具体内容，会使用上一条消息的内容
    const reversedUsers = [...messages]
      .reverse()
      .filter((m) => m.role === 'user');
    const lastUserMessage = reversedUsers[0];
    const previousUserMessage = reversedUsers[1];

    const query = lastUserMessage?.content || '';

    /**
     * 记忆提取和存储
     * 
     * 如果用户明确让 Champ 记住某件事，将内容写入向量记忆库
     * 
     * 处理逻辑：
     * 1. 检查最后一条用户消息是否包含记忆请求
     * 2. 如果用户只是说"帮我记着"（cueOnly），使用上一条消息的内容
     * 3. 将记忆异步存储到向量数据库，不阻塞主流程
     */
    if (query.trim()) {
      console.log('[api/chat] incoming query:', query);
      const extraction = extractMemoryFromMessage(query);
      if (extraction) {
        let memoryText = extraction.text.trim();

        // 如果用户只是单独说"帮我记着"，就使用上一条真正的内容
        // 这样可以支持这样的对话：
        // 用户："我们明天要去漫展"
        // 用户："帮我记着"
        if (extraction.cueOnly && previousUserMessage?.content?.trim()) {
          memoryText = previousUserMessage.content.trim();
        }

        if (!memoryText) {
          memoryText = extraction.text.trim();
        }

        const now = new Date();
        const memoryId = `chat-${now.getTime()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        const memory: MemoryRecord = {
          id: memoryId,
          text: `聊天提醒：${memoryText}`,
          metadata: {
            type: 'note',
            author: 'piggy',
            datetime: now.toISOString(),
            sourceId: memoryId,
          },
        };

        console.log('[api/chat] storing memory', {
          memoryId,
          cueOnly: extraction.cueOnly,
          payload: memory.text,
        });

        // 异步存储，不阻塞聊天响应
        addMemories([memory]).catch((err) => {
          console.error('[api/chat] Failed to store chat memory', err);
        });
      }
    }

    /**
     * 查询分类和上下文构建
     * 
     * 根据查询类型（realtime/memory/mixed）决定：
     * 1. 是否需要检索历史记忆
     * 2. 需要检索多少条记忆
     * 3. 如何组织上下文信息
     * 
     * 上下文结构：
     * - 总是包含当前时间信息（让AI知道现在的时间）
     * - 如果是 memory 或 mixed 类型，还会包含相关历史记忆
     */
    let context = '';
    if (query.trim()) {
      const queryType = await classifyQuery(query);
      console.log('[api/chat] query type:', queryType);
      const currentInfo = getCurrentInfo();
      
      // 总是提供当前时间信息，让AI知道现在的时间
      // 这对于回答"现在几点了"、"今天是星期几"等问题很重要
      let realtimeContext = `当前时间信息：
- 现在是：${currentInfo.currentTime}
- 今天是：${currentInfo.currentDate}
- 时区：${currentInfo.timeZone}`;

      if (queryType === 'realtime') {
        // 纯实时信息查询，不检索历史记忆
        // 例如："现在几点了"、"今天星期几"
        context = realtimeContext;
      } else if (queryType === 'memory') {
        // 纯历史记忆查询，检索相关记忆
        // 例如："你还记得我们上次去的地方吗"
        const memories = await searchMemories(query, 6);
        console.log('[api/chat] memory-only search hits:', memories.length);
        if (memories.length > 0) {
          const formatted = memories
            .map((m) => {
              const when = m.metadata.datetime;
              const type = m.metadata.type;
              const author = m.metadata.author;
              return `【时间】${when}  【类型】${type}  【来自】${author}\n${m.text}`;
            })
            .join('\n\n---\n\n');

          context = `${realtimeContext}\n\n下面是你们之前的部分记忆，请在合适的时候自然地引用或参考：\n\n${formatted}`;
        } else {
          context = realtimeContext;
        }
      } else {
        // 混合查询，同时提供实时信息和历史记忆
        // 例如："现在星期几？顺便提醒我周末是不是要去漫展"
        // 减少记忆数量（4条），为实时信息留空间
        const memories = await searchMemories(query, 4);
        console.log('[api/chat] hybrid search hits:', memories.length);
        if (memories.length > 0) {
          const formatted = memories
            .map((m) => {
              const when = m.metadata.datetime;
              const type = m.metadata.type;
              const author = m.metadata.author;
              return `【时间】${when}  【类型】${type}  【来自】${author}\n${m.text}`;
            })
            .join('\n\n---\n\n');

          context = `${realtimeContext}\n\n下面是你们之前的部分记忆，请在合适的时候自然地引用或参考：\n\n${formatted}`;
        } else {
          context = realtimeContext;
        }
      }
    }

    // 转换消息格式，准备发送给 LLM
    const llmMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    })) as ChatMessage[];

    /**
     * 流式响应处理
     * 
     * 如果前端请求了流式传输（stream: true），使用流式响应
     * 这样可以实现打字机效果，提升用户体验
     * 
     * 处理流程：
     * 1. 调用流式聊天接口，获取异步迭代器
     * 2. 创建 ReadableStream，逐块读取并发送给前端
     * 3. 前端通过 fetch 的 body reader 逐块接收并显示
     */
    if (body?.stream) {
      const encoder = new TextEncoder();
      const iterator = await streamDeepseekChat({
        messages: llmMessages,
        context,
      });

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // 逐块读取 LLM 返回的内容并发送给前端
            for await (const chunk of iterator) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (err) {
            console.error('[api/chat] streaming error', err);
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    /**
     * 非流式响应（一次性返回完整消息）
     * 
     * 如果前端没有请求流式传输，等待 LLM 生成完整回复后一次性返回
     * 这种方式响应时间较长，但实现简单
     */
    const reply = await callDeepseekChat({
      messages: llmMessages,
      context,
    });

    return NextResponse.json({
      reply,
      systemPrompt: getSystemPrompt(),
    });
  } catch (error) {
    console.error('[api/chat] error', error);
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}


