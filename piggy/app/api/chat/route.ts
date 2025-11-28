import { NextRequest, NextResponse } from 'next/server';
import {
  callDeepseekChat,
  type ChatMessage,
  getSystemPrompt,
  classifyQuery,
  getCurrentInfo,
} from '@/lib/llm';
import { searchMemories, addMemories, type MemoryRecord } from '@/lib/vectorStore';
import { TOOLS } from '@/lib/tools';
import { logMoodFromAI, trackPeriodFromAI } from '@/lib/actions';

type ApiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(req: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const messages = (body?.messages || []) as ApiChatMessage[];
    const isStreaming = body?.stream === true;

    if (!Array.isArray(messages) || messages.length === 0) {
      console.error(`[api/chat:${requestId}] 错误: messages 为空或格式错误`);
      return NextResponse.json(
        { error: 'messages is required' },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMessage?.content || '';
    
    // 1. 用户发送的消息
    console.log(`[api/chat:${requestId}] 用户消息: "${query}"`);

    // 1. 构建上下文 (Context)
    let context = '';
    if (query.trim()) {
      // 只有在第一轮查询时进行分类和记忆检索
      // 如果后续在 Function Calling 循环中，上下文保持不变
      const queryType = await classifyQuery(query);
      
      const currentInfo = getCurrentInfo();
      // 4. 当前时间
      console.log(`[api/chat:${requestId}] 当前时间: ${currentInfo.currentTime}`);
      
      let realtimeContext = `当前时间信息：
- 现在是：${currentInfo.currentTime}
- 今天是：${currentInfo.currentDate}
- 时区：${currentInfo.timeZone}`;

      if (queryType === 'realtime') {
        context = realtimeContext;
      } else {
        // memory or mixed
        const k = queryType === 'mixed' ? 4 : 6;
        const memories = await searchMemories(query, k);
        
        if (memories.length > 0) {
          // 7. 检索到的记忆摘要
          console.log(`[api/chat:${requestId}] 检索到的记忆摘要:`);
          memories.forEach((m, i) => {
            const preview = m.text.substring(0, 100) + (m.text.length > 100 ? '...' : '');
            console.log(`[api/chat:${requestId}]   [${i + 1}] ${m.metadata.type} (${m.metadata.datetime}): ${preview}`);
          });
          
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

    // 2. 准备初始消息列表
    let llmMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    })) as ChatMessage[];

    // 3. 循环执行 LLM 和 Tools
    // 我们使用"同步执行工具，最后返回结果"的策略
    // 这样可以支持 Function Calling，同时兼容前端的接口
    let finalReply = '';
    let finished = false;
    let loopCount = 0;
    const MAX_LOOPS = 5; // 防止死循环

    while (!finished && loopCount < MAX_LOOPS) {
      loopCount++;
      
      // 调用 LLM
      const response = await callDeepseekChat({
        messages: llmMessages,
        context: loopCount === 1 ? context : undefined,
        tools: TOOLS,
      });

      if (typeof response === 'string') {
        // LLM 返回了文本回复，流程结束
        finalReply = response;
        finished = true;
      } else {
        // LLM 返回了工具调用请求 (response 是 ChatMessage 对象)
        const toolCalls = response.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
           // 理论上不应该发生，如果发生则结束
           finalReply = response.content || '';
           finished = true;
           continue;
        }

        // 5. 调用了哪些工具
        const toolNames = toolCalls.map((t: any) => t.function.name);
        console.log(`[api/chat:${requestId}] 调用工具: ${toolNames.join(', ')}`);

        // 将 assistant 的 tool_calls 消息追加到历史
        llmMessages.push(response);

        // 执行所有工具调用
        for (const toolCall of toolCalls) {
          const fnName = toolCall.function.name;
          const argsString = toolCall.function.arguments;
          
          let args = {};
          try {
            args = JSON.parse(argsString);
          } catch (e) {
            console.error(`[api/chat:${requestId}] 参数解析失败:`, e);
          }

          // 6. 提供给工具的参数
          console.log(`[api/chat:${requestId}] 工具参数 [${fnName}]:`, JSON.stringify(args));

          let result = { success: true, message: 'Tool executed successfully.' };

          try {
            if (fnName === 'log_mood') {
              await logMoodFromAI(args as any);
              result = { success: true, message: '心情已记录。' };
            } else if (fnName === 'track_period') {
              await trackPeriodFromAI(args as any);
              result = { success: true, message: '经期已记录。' };
            } else if (fnName === 'save_memory') {
              const content = (args as any).content;
              if (content) {
                const now = new Date();
                const memoryId = `chat-${now.getTime()}-${Math.random().toString(36).slice(2)}`;
                const memory: MemoryRecord = {
                  id: memoryId,
                  text: `聊天提醒：${content}`,
                  metadata: {
                    type: 'note',
                    author: 'piggy',
                    datetime: now.toISOString(),
                    sourceId: memoryId,
                  },
                };
                await addMemories([memory]);
                result = { success: true, message: '记忆已保存。' };
              } else {
                result = { success: false, message: 'Content is required.' };
              }
            } else if (fnName === 'show_sticker') {
              const category = (args as any).category;
              result = { 
                success: true, 
                message: `Sticker [${category}] displayed. Please mention it in your response and append [STICKER:${category}] at the end.` 
              };
            } else {
              result = { success: false, message: 'Unknown tool.' };
            }
          } catch (err: any) {
            const errorMessage = err?.message || String(err);
            console.error(`[api/chat:${requestId}] ✗ 工具执行失败 [${fnName}]:`, errorMessage);
            result = { success: false, message: `Error: ${errorMessage}` };
          }

          // 将工具执行结果追加到消息历史
          llmMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
            name: fnName,
          } as any);
        }
      }
    }

    if (loopCount >= MAX_LOOPS) {
      console.warn(`[api/chat:${requestId}] ⚠️ 达到最大循环次数 (${MAX_LOOPS})，强制结束`);
    }

    // 4. 返回最终响应
    // 无论前端是否请求 stream，我们都模拟流式返回（因为我们已经拿到了完整的 finalReply）
    // 这样前端代码不需要修改
    if (body?.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // 将完整回复一次性作为一个 chunk 发送
          // 虽然不是真正的流式（逐字），但兼容前端的 reader 逻辑
          controller.enqueue(encoder.encode(finalReply));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 非流式回退
    return NextResponse.json({
      reply: finalReply,
      systemPrompt: getSystemPrompt(),
    });

  } catch (error) {
    console.error(`[api/chat:${requestId}] 请求失败:`, error instanceof Error ? error.message : String(error));
    
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}

