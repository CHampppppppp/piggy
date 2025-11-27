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

function extractMemoryFromMessage(message: string): string | null {
  const normalized = message?.trim();
  if (!normalized) return null;

  const hasCue = MEMORY_REQUEST_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  if (!hasCue) return null;

  let cleaned = normalized;
  MEMORY_REQUEST_KEYWORDS.forEach((keyword) => {
    cleaned = cleaned.replaceAll(keyword, '');
  });

  cleaned = cleaned.replace(/^(请|麻烦你|帮我|帮忙|要|记)/, '').trim();
  cleaned = cleaned.replace(/^[，。.!?\s]+|[，。.!?\s]+$/g, '').trim();

  if (cleaned.length < 6) {
    return normalized;
  }

  return cleaned;
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

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    const query = lastUserMessage?.content || '';

    // 如果用户明确让 Champ 记住某件事，把这段内容写入向量记忆
    if (query.trim()) {
      const memoryText = extractMemoryFromMessage(query);
      if (memoryText) {
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

        addMemories([memory]).catch((err) => {
          console.error('[api/chat] Failed to store chat memory', err);
        });
      }
    }

    // 分类查询类型并构建上下文
    let context = '';
    if (query.trim()) {
      const queryType = classifyQuery(query);
      const currentInfo = getCurrentInfo();
      
      // 总是提供当前时间信息，让AI知道现在的时间
      let realtimeContext = `当前时间信息：
- 现在是：${currentInfo.currentTime}
- 今天是：${currentInfo.currentDate}
- 时区：${currentInfo.timeZone}`;

      if (queryType === 'realtime') {
        // 纯实时信息查询，不检索历史记忆
        context = realtimeContext;
      } else if (queryType === 'memory') {
        // 纯历史记忆查询，检索相关记忆
        const memories = await searchMemories(query, 6);
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
        const memories = await searchMemories(query, 4); // 减少记忆数量，为实时信息留空间
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

    const llmMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    })) as ChatMessage[];

    // 如果前端请求了流式传输（stream: true），走流式响应
    if (body?.stream) {
      const encoder = new TextEncoder();
      const iterator = await streamDeepseekChat({
        messages: llmMessages,
        context,
      });

      const stream = new ReadableStream({
        async start(controller) {
          try {
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

    // 默认还是一次性返回完整消息（非流式）
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


