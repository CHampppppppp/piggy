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

    console.log(`[api/chat:${requestId}] ===== 请求开始 =====`);
    console.log(`[api/chat:${requestId}] 消息数量: ${messages.length}`);
    console.log(`[api/chat:${requestId}] 流式响应: ${isStreaming ? '是' : '否'}`);

    if (!Array.isArray(messages) || messages.length === 0) {
      console.error(`[api/chat:${requestId}] 错误: messages 为空或格式错误`);
      return NextResponse.json(
        { error: 'messages is required' },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const query = lastUserMessage?.content || '';
    
    console.log(`[api/chat:${requestId}] 用户查询: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`);
    console.log(`[api/chat:${requestId}] 消息历史: ${messages.map(m => `${m.role}(${m.content.length}字)`).join(' -> ')}`);

    // 1. 构建上下文 (Context)
    let context = '';
    if (query.trim()) {
      // 只有在第一轮查询时进行分类和记忆检索
      // 如果后续在 Function Calling 循环中，上下文保持不变
      const classifyStartTime = Date.now();
      const queryType = await classifyQuery(query);
      const classifyDuration = Date.now() - classifyStartTime;
      
      console.log(`[api/chat:${requestId}] 查询分类: ${queryType} (耗时: ${classifyDuration}ms)`);
      
      const currentInfo = getCurrentInfo();
      console.log(`[api/chat:${requestId}] 当前时间: ${currentInfo.currentTime} (${currentInfo.timeZone})`);
      
      let realtimeContext = `当前时间信息：
- 现在是：${currentInfo.currentTime}
- 今天是：${currentInfo.currentDate}
- 时区：${currentInfo.timeZone}`;

      if (queryType === 'realtime') {
        context = realtimeContext;
        console.log(`[api/chat:${requestId}] 上下文类型: 仅实时信息`);
      } else {
        // memory or mixed
        const k = queryType === 'mixed' ? 4 : 6;
        const memorySearchStartTime = Date.now();
        const memories = await searchMemories(query, k);
        const memorySearchDuration = Date.now() - memorySearchStartTime;
        
        console.log(`[api/chat:${requestId}] 记忆检索: ${memories.length} 条结果 (耗时: ${memorySearchDuration}ms)`);
        
        if (memories.length > 0) {
          console.log(`[api/chat:${requestId}] 检索到的记忆摘要:`);
          memories.forEach((m, i) => {
            const preview = m.text.substring(0, 50) + (m.text.length > 50 ? '...' : '');
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
          console.log(`[api/chat:${requestId}] 上下文类型: ${queryType} (实时信息 + ${memories.length} 条记忆)`);
        } else {
          context = realtimeContext;
          console.log(`[api/chat:${requestId}] 上下文类型: ${queryType} (仅实时信息，未找到相关记忆)`);
        }
      }
      
      console.log(`[api/chat:${requestId}] 上下文长度: ${context.length} 字符`);
    }

    // 2. 准备初始消息列表
    let llmMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    })) as ChatMessage[];

    console.log(`[api/chat:${requestId}] 准备 LLM 消息: ${llmMessages.length} 条`);
    console.log(`[api/chat:${requestId}] 可用工具: ${TOOLS.map(t => t.type === 'function' ? t.function.name : 'unknown').join(', ')}`);

    // 3. 循环执行 LLM 和 Tools
    // 我们使用"同步执行工具，最后返回结果"的策略
    // 这样可以支持 Function Calling，同时兼容前端的接口
    let finalReply = '';
    let finished = false;
    let loopCount = 0;
    const MAX_LOOPS = 5; // 防止死循环

    while (!finished && loopCount < MAX_LOOPS) {
      loopCount++;
      console.log(`[api/chat:${requestId}] --- 循环 ${loopCount}/${MAX_LOOPS} ---`);
      
      // 调用 LLM
      const llmStartTime = Date.now();
      const response = await callDeepseekChat({
        messages: llmMessages,
        context: loopCount === 1 ? context : undefined, // 只在第一轮传递 context，或者每次都传？
        // buildMessages 会把 context 拼接到 system prompt。
        // 如果我们保留 system prompt，每次都需要 context。
        // 但我们的 llmMessages 不包含 system prompt (它在 buildMessages 里添加)。
        // 所以每次都需要传 context。
        tools: TOOLS,
      });
      const llmDuration = Date.now() - llmStartTime;

      if (typeof response === 'string') {
        // LLM 返回了文本回复，流程结束
        finalReply = response;
        finished = true;
        console.log(`[api/chat:${requestId}] LLM 返回文本回复 (耗时: ${llmDuration}ms)`);
        console.log(`[api/chat:${requestId}] 回复长度: ${finalReply.length} 字符`);
        console.log(`[api/chat:${requestId}] 回复预览: "${finalReply.substring(0, 100)}${finalReply.length > 100 ? '...' : ''}"`);
      } else {
        // LLM 返回了工具调用请求 (response 是 ChatMessage 对象)
        const toolCalls = response.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
           // 理论上不应该发生，如果发生则结束
           finalReply = response.content || '';
           finished = true;
           console.warn(`[api/chat:${requestId}] LLM 返回了非字符串但无工具调用，使用 content: "${finalReply.substring(0, 50)}"`);
           continue;
        }

        console.log(`[api/chat:${requestId}] LLM 触发工具调用 (耗时: ${llmDuration}ms):`, toolCalls.map((t: any) => `${t.function.name}(${t.function.arguments.length} 字符)`));

        // 将 assistant 的 tool_calls 消息追加到历史
        llmMessages.push(response);

        // 执行所有工具调用
        for (const toolCall of toolCalls) {
          const fnName = toolCall.function.name;
          const argsString = toolCall.function.arguments;
          const toolStartTime = Date.now();
          
          console.log(`[api/chat:${requestId}] 执行工具: ${fnName}`);
          console.log(`[api/chat:${requestId}] 工具参数: ${argsString.substring(0, 200)}${argsString.length > 200 ? '...' : ''}`);
          
          let args = {};
          try {
            args = JSON.parse(argsString);
            console.log(`[api/chat:${requestId}] 参数解析成功:`, JSON.stringify(args));
          } catch (e) {
            console.error(`[api/chat:${requestId}] 参数解析失败:`, e);
          }

          let result = { success: true, message: 'Tool executed successfully.' };

          try {
            if (fnName === 'log_mood') {
              await logMoodFromAI(args as any);
              result = { success: true, message: '心情已记录。' };
              console.log(`[api/chat:${requestId}] ✓ 心情记录成功:`, args);
            } else if (fnName === 'track_period') {
              await trackPeriodFromAI(args as any);
              result = { success: true, message: '经期已记录。' };
              console.log(`[api/chat:${requestId}] ✓ 经期记录成功:`, args);
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
                console.log(`[api/chat:${requestId}] ✓ 记忆保存成功: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
              } else {
                result = { success: false, message: 'Content is required.' };
                console.warn(`[api/chat:${requestId}] ✗ 记忆保存失败: content 为空`);
              }
            } else if (fnName === 'show_sticker') {
              const category = (args as any).category;
              // 这是一个前端效果，我们告诉 LLM 已执行，并让它在回复中带上标记
              // 或者我们可以在这里直接 append 一个 system message 告诉 LLM
              result = { 
                success: true, 
                message: `Sticker [${category}] displayed. Please mention it in your response and append [STICKER:${category}] at the end.` 
              };
              console.log(`[api/chat:${requestId}] ✓ 贴纸显示: ${category}`);
            } else {
              result = { success: false, message: 'Unknown tool.' };
              console.warn(`[api/chat:${requestId}] ✗ 未知工具: ${fnName}`);
            }
          } catch (err: any) {
            const errorMessage = err?.message || String(err);
            console.error(`[api/chat:${requestId}] ✗ 工具执行失败 [${fnName}]:`, errorMessage);
            console.error(`[api/chat:${requestId}] 错误堆栈:`, err?.stack);
            result = { success: false, message: `Error: ${errorMessage}` };
          }
          
          const toolDuration = Date.now() - toolStartTime;
          console.log(`[api/chat:${requestId}] 工具执行完成 [${fnName}]: ${result.success ? '成功' : '失败'} (耗时: ${toolDuration}ms)`);

          // 将工具执行结果追加到消息历史
          llmMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
            name: fnName,
          } as any);
        }
        // 循环继续，将带有 tool outputs 的 messages 再次发给 LLM
        console.log(`[api/chat:${requestId}] 工具结果已添加到消息历史，继续下一轮 LLM 调用`);
      }
    }

    if (loopCount >= MAX_LOOPS) {
      console.warn(`[api/chat:${requestId}] ⚠️ 达到最大循环次数 (${MAX_LOOPS})，强制结束`);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[api/chat:${requestId}] ===== 请求完成 =====`);
    console.log(`[api/chat:${requestId}] 总耗时: ${totalDuration}ms`);
    console.log(`[api/chat:${requestId}] LLM 循环次数: ${loopCount}`);
    console.log(`[api/chat:${requestId}] 最终回复长度: ${finalReply.length} 字符`);

    // 4. 返回最终响应
    // 无论前端是否请求 stream，我们都模拟流式返回（因为我们已经拿到了完整的 finalReply）
    // 这样前端代码不需要修改
    if (body?.stream) {
      console.log(`[api/chat:${requestId}] 返回流式响应`);
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
    console.log(`[api/chat:${requestId}] 返回 JSON 响应`);
    return NextResponse.json({
      reply: finalReply,
      systemPrompt: getSystemPrompt(),
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[api/chat:${requestId}] ===== 请求失败 =====`);
    console.error(`[api/chat:${requestId}] 错误信息:`, error);
    console.error(`[api/chat:${requestId}] 错误堆栈:`, error instanceof Error ? error.stack : 'N/A');
    console.error(`[api/chat:${requestId}] 失败前耗时: ${totalDuration}ms`);
    
    return NextResponse.json(
      { error: 'Failed to generate reply' },
      { status: 500 }
    );
  }
}

