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
import * as jose from 'jose';

// JWT Token 缓存，避免每次请求都重新生成
let cachedJwtToken: string | null = null;
let cachedJwtExpiry: number = 0;

/**
 * 生成和风天气 JWT Token
 * 使用 Ed25519 私钥签名
 * 
 * 参考文档: https://dev.qweather.com/docs/configuration/authentication/
 */
async function generateQWeatherJWT(): Promise<string> {
  const privateKeyPem = process.env.QWEATHER_PRIVATE_KEY;
  const keyId = process.env.QWEATHER_KEY_ID;
  const projectId = process.env.QWEATHER_PROJECT_ID;

  if (!privateKeyPem || !keyId || !projectId) {
    throw new Error('缺少 JWT 配置：QWEATHER_PRIVATE_KEY, QWEATHER_KEY_ID, QWEATHER_PROJECT_ID');
  }

  // 检查缓存的 token 是否还有效（提前5分钟过期）
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwtToken && cachedJwtExpiry > now + 300) {
    return cachedJwtToken;
  }

  // 解析 PEM 格式的私钥
  // 处理环境变量中的换行符（\n 字符串转为实际换行）
  const formattedKey = privateKeyPem.replace(/\\n/g, '\n');
  const privateKey = await jose.importPKCS8(formattedKey, 'EdDSA');

  // 设置时间：iat 为当前时间前30秒，exp 为15分钟后
  const iat = now - 30;
  const exp = now + 900; // 15分钟有效期

  // 生成 JWT
  const jwt = await new jose.SignJWT({ sub: projectId })
    .setProtectedHeader({ alg: 'EdDSA', kid: keyId })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(privateKey);

  // 缓存 token
  cachedJwtToken = jwt;
  cachedJwtExpiry = exp;

  console.log('[QWeather] 已生成新的 JWT Token，有效期至:', new Date(exp * 1000).toLocaleString('zh-CN'));

  return jwt;
}

/**
 * 获取天气信息
 * 使用和风天气 API + JWT 认证
 * 
 * 环境变量配置：
 * - QWEATHER_PRIVATE_KEY: Ed25519 私钥（PEM格式，必须）
 * - QWEATHER_KEY_ID: 凭据ID（必须）
 * - QWEATHER_PROJECT_ID: 项目ID（必须）
 * - QWEATHER_API_HOST: API Host（必须，从控制台获取）
 * 
 * 参考文档: 
 * - https://dev.qweather.com/docs/configuration/authentication/
 * - https://dev.qweather.com/docs/api/geoapi/city-lookup/
 */
async function getWeatherInfo(city: string): Promise<string> {
  const qweatherHost = process.env.QWEATHER_API_HOST;

  if (!qweatherHost) {
    return `抱歉，天气服务暂时不可用。请确保已配置API Host（QWEATHER_API_HOST）。`;
  }

  // 生成 JWT Token
  let jwtToken: string;
  try {
    jwtToken = await generateQWeatherJWT();
  } catch (error) {
    console.error('[getWeatherInfo] JWT生成失败:', error);
    return `抱歉，天气服务配置错误。${error instanceof Error ? error.message : ''}`;
  }

  // 构建请求 Headers（使用 JWT Bearer Token）
  const fetchOptions: RequestInit = {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  };

  try {
    // 1. 获取城市ID（GeoAPI 路径: /geo/v2/city/lookup）
    // 注意：GeoAPI 和天气 API 使用同一个 API Host
    const cityLookupUrl = `https://${qweatherHost}/geo/v2/city/lookup?location=${encodeURIComponent(city)}`;
    const cityRes = await fetch(cityLookupUrl, fetchOptions);
    
    if (!cityRes.ok) {
       const errorText = await cityRes.text();
       console.error(`[getWeatherInfo] 城市查询API请求失败: ${cityRes.status} ${cityRes.statusText}`, errorText);
       return `抱歉，天气服务暂时不可用 (City API Error: ${cityRes.status})。`;
    }

    const cityResText = await cityRes.text();
    if (!cityResText) {
      console.error(`[getWeatherInfo] 城市查询API返回为空`);
      return `抱歉，天气服务暂时不可用 (Empty Response)。`;
    }

    let cityData;
    try {
      cityData = JSON.parse(cityResText);
    } catch (e) {
       console.error(`[getWeatherInfo] 城市查询API返回无效JSON:`, cityResText);
       return `抱歉，天气服务暂时不可用 (Invalid JSON)。`;
    }

    if (cityData.code !== '200' || !cityData.location || cityData.location.length === 0) {
      return `抱歉，找不到城市 ${city} 的信息。`;
    }

    const locationId = cityData.location[0].id;
    const cityName = cityData.location[0].name;

    // 2. 获取天气预报 (每日预报)
    // 文档: https://dev.qweather.com/docs/api/weather/weather-daily-forecast/
    const weatherUrl = `https://${qweatherHost}/v7/weather/3d?location=${locationId}`;
    const weatherRes = await fetch(weatherUrl, fetchOptions);

    if (!weatherRes.ok) {
      const errorText = await weatherRes.text();
      console.error(`[getWeatherInfo] 天气查询API请求失败: ${weatherRes.status} ${weatherRes.statusText}`, errorText);
      return `抱歉，天气服务暂时不可用 (Weather API Error: ${weatherRes.status})。`;
    }

    const weatherResText = await weatherRes.text();
    if (!weatherResText) {
       console.error(`[getWeatherInfo] 天气查询API返回为空`);
       return `抱歉，天气服务暂时不可用 (Empty Weather Response)。`;
    }

    let weatherData;
    try {
       weatherData = JSON.parse(weatherResText);
    } catch (e) {
       console.error(`[getWeatherInfo] 天气查询API返回无效JSON:`, weatherResText);
       return `抱歉，天气服务暂时不可用 (Invalid Weather JSON)。`;
    }

    if (weatherData.code === '200' && weatherData.daily && weatherData.daily.length > 0) {
      const today = weatherData.daily[0];
      return `【${cityName}今日天气】\n天气：${today.textDay} (白天) / ${today.textNight} (夜间)\n温度：${today.tempMin}℃ ~ ${today.tempMax}℃\n风向：${today.windDirDay}\n风力：${today.windScaleDay}级\n湿度：${today.humidity}%\n降水：${today.precip}mm\n更新时间：${new Date(weatherData.updateTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
    } else {
      return `抱歉，无法获取 ${cityName} 的天气信息 (Code: ${weatherData.code})。`;
    }

  } catch (error) {
    console.error('[getWeatherInfo] 和风天气API调用失败:', error);
    return `抱歉，获取天气信息时发生错误。`;
  }
}

type ApiChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// 日志收集器，用于将后端日志传递到前端
const logCollector: string[] = [];

function addLog(message: string, requestId: string) {
  const logMessage = `[api/chat:${requestId}] ${message}`;
  console.log(logMessage);
  logCollector.push(logMessage);
  // 只保留最近100条日志，避免内存泄漏
  if (logCollector.length > 100) {
    logCollector.shift();
  }
}

export async function POST(req: NextRequest) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();
  // 清空当前请求的日志收集器
  const currentLogs: string[] = [];
  
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
    const userLog = `用户消息: "${query}"`;
    console.log(`[api/chat:${requestId}] ${userLog}`);
    currentLogs.push(userLog);

    // 1. 构建上下文 (Context)
    let context = '';
    if (query.trim()) {
      // 只有在第一轮查询时进行分类和记忆检索
      // 如果后续在 Function Calling 循环中，上下文保持不变
      const queryType = await classifyQuery(query);
      
      const currentInfo = getCurrentInfo();
      // 4. 当前时间
      const timeLog = `当前时间: ${currentInfo.currentTime}`;
      console.log(`[api/chat:${requestId}] ${timeLog}`);
      currentLogs.push(timeLog);
      
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
          const memoryLog = `检索到的记忆摘要: ${memories.length} 条`;
          console.log(`[api/chat:${requestId}] ${memoryLog}`);
          currentLogs.push(memoryLog);
          memories.forEach((m, i) => {
            // 将换行符替换为空格，避免日志格式混乱
            const textPreview = m.text.replace(/\n/g, ' ').substring(0, 100) + (m.text.length > 100 ? '...' : '');
            const memoryDetail = `  [${i + 1}] ${m.metadata.type} (${m.metadata.datetime}): ${textPreview}`;
            console.log(`[api/chat:${requestId}] ${memoryDetail}`);
            currentLogs.push(memoryDetail);
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
    let needsRefresh = false; // 标记是否需要刷新页面（数据库更新时）

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
        const toolLog = `调用工具: ${toolNames.join(', ')}`;
        console.log(`[api/chat:${requestId}] ${toolLog}`);
        currentLogs.push(toolLog);

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
          const paramLog = `工具参数 [${fnName}]: ${JSON.stringify(args)}`;
          console.log(`[api/chat:${requestId}] ${paramLog}`);
          currentLogs.push(paramLog);

          let result = { success: true, message: 'Tool executed successfully.' };

          try {
            if (fnName === 'log_mood') {
              await logMoodFromAI(args as any);
              result = { success: true, message: '心情已记录。' };
              needsRefresh = true; // 标记需要刷新页面
            } else if (fnName === 'track_period') {
              await trackPeriodFromAI(args as any);
              result = { success: true, message: '经期已记录。' };
              needsRefresh = true; // 标记需要刷新页面
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
            } else if (fnName === 'get_weather') {
              const city = (args as any).city || '北京'; // 默认城市
              const weatherInfo = await getWeatherInfo(city);
              result = { 
                success: true, 
                message: weatherInfo 
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
          // 先发送日志信息（前端会解析并输出到浏览器控制台，但不显示在消息中）
          currentLogs.forEach(log => {
            controller.enqueue(encoder.encode(`[LOG]${log}[END_LOG]`));
          });
          if (needsRefresh) {
            controller.enqueue(encoder.encode(`[LOG]数据库已更新，需要刷新页面[END_LOG]`));
          }
          
          // 将完整回复一次性作为一个 chunk 发送
          // 虽然不是真正的流式（逐字），但兼容前端的 reader 逻辑
          controller.enqueue(encoder.encode(finalReply));
          // 如果需要刷新，在流末尾添加特殊标记
          if (needsRefresh) {
            controller.enqueue(encoder.encode('\n\n[REFRESH_PAGE]'));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...(needsRefresh ? { 'X-Refresh-Page': 'true' } : {}),
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

