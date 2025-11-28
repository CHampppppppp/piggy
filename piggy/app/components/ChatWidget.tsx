'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const STICKER_MAP: Record<string, string> = {
  happy: '/images/happy.webp',
  love: '/images/happiness.webp',
  sad: '/images/sad.webp',
  angry: '/images/angry.webp',
  tired: '/images/tired.webp',
  excited: '/images/fortnitecat1.webp',
  neutral: '/images/penguin.webp',
};

// localStorage 键名
const STORAGE_KEY = 'chat-messages';
const SESSION_TIME_KEY = 'chat-session-time';
// 会话自动清除时间（30分钟）
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const autoClearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveThrottleRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 从 localStorage 加载对话历史
   */
  const loadMessages = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      const sessionTime = localStorage.getItem(SESSION_TIME_KEY);

      if (savedMessages && sessionTime) {
        const messages = JSON.parse(savedMessages) as UiMessage[];
        const sessionStartTime = parseInt(sessionTime, 10);
        const now = Date.now();

        // 检查会话是否过期（超过30分钟）
        if (now - sessionStartTime > SESSION_TIMEOUT) {
          // 会话过期，清除数据
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(SESSION_TIME_KEY);
          setMessages([]);
          return;
        }

        // 会话未过期，加载消息
        setMessages(messages);
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
      // 如果解析失败，清除损坏的数据
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_TIME_KEY);
    }
  }, []);

  /**
   * 保存对话历史到 localStorage
   * @param immediate 是否立即保存（不节流）
   */
  const saveMessages = useCallback((newMessages: UiMessage[], immediate = false) => {
    if (typeof window === 'undefined') return;

    const doSave = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
        // 如果这是新会话，更新会话开始时间
        const sessionTime = localStorage.getItem(SESSION_TIME_KEY);
        if (!sessionTime) {
          localStorage.setItem(SESSION_TIME_KEY, Date.now().toString());
        }
      } catch (error) {
        console.error('保存对话历史失败:', error);
      }
    };

    if (immediate) {
      // 立即保存，清除之前的节流定时器
      if (saveThrottleRef.current) {
        clearTimeout(saveThrottleRef.current);
        saveThrottleRef.current = null;
      }
      doSave();
    } else {
      // 节流保存：延迟 500ms，如果在这期间有新的保存请求，则取消之前的并重新计时
      if (saveThrottleRef.current) {
        clearTimeout(saveThrottleRef.current);
      }
      saveThrottleRef.current = setTimeout(doSave, 500);
    }
  }, []);

  /**
   * 清除当前对话
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_TIME_KEY);
    // 清除自动清除定时器
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
  }, []);

  /**
   * 设置自动清除定时器
   */
  const setupAutoClear = useCallback(() => {
    // 清除之前的定时器
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
    }

    const sessionTime = localStorage.getItem(SESSION_TIME_KEY);
    if (!sessionTime) return;

    const sessionStartTime = parseInt(sessionTime, 10);
    const elapsed = Date.now() - sessionStartTime;
    const remaining = SESSION_TIMEOUT - elapsed;

    if (remaining > 0) {
      // 设置定时器，在剩余时间后清除
      autoClearTimerRef.current = setTimeout(() => {
        clearConversation();
      }, remaining);
    } else {
      // 已经过期，立即清除
      clearConversation();
    }
  }, [clearConversation]);

  // 组件挂载时加载消息
  useEffect(() => {
    setMounted(true);
    loadMessages();
    setupAutoClear();

    // 清理定时器
    return () => {
      if (autoClearTimerRef.current) {
        clearTimeout(autoClearTimerRef.current);
      }
      if (saveThrottleRef.current) {
        clearTimeout(saveThrottleRef.current);
      }
    };
  }, [loadMessages, setupAutoClear]);

  // 当消息更新时，保存到 localStorage
  useEffect(() => {
    if (mounted && messages.length > 0) {
      saveMessages(messages);
      setupAutoClear();
    }
  }, [messages, mounted, saveMessages, setupAutoClear]);

  /**
   * 自动滚动到底部
   * 
   * 当聊天面板打开或新消息到达时，自动滚动到底部
   * 这样用户总是能看到最新的消息
   */
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages.length]);

  const renderMessageContent = (content: string) => {
    // 如果内容为空，不渲染
    if (!content) return null;

    const stickerRegex = /\[STICKER:(\w+)\]/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = stickerRegex.exec(content)) !== null) {
      // 添加前面的文本
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex, match.index)}</span>);
      }

      // 添加贴纸
      const category = match[1];
      const src = STICKER_MAP[category] || STICKER_MAP['happy']; // 默认 fallback
      parts.push(
        <div key={`sticker-${match.index}`} className="my-2 relative w-32 h-32 rounded-xl overflow-hidden border-2 border-black shadow-[3px_3px_0_#1a1a1a]">
          <Image src={src} alt={category} fill className="object-cover" />
        </div>
      );

      lastIndex = stickerRegex.lastIndex;
    }

    // 添加剩余文本
    if (lastIndex < content.length) {
      parts.push(<span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>);
    }

    // 如果没有任何匹配，直接返回 content
    if (parts.length === 0) return content;

    return <>{parts}</>;
  };

  /**
   * 发送消息处理函数
   * 
   * 处理流程：
   * 1. 验证输入内容
   * 2. 立即显示用户消息和空的助手消息（实现打字机效果）
   * 3. 发送请求到后端 API（流式传输）
   * 4. 逐块接收响应并实时更新助手消息
   * 5. 处理错误情况
   * 
   * 流式响应处理：
   * - 使用 ReadableStream 逐块读取响应
   * - 每次接收到新块，立即更新最后一条助手消息
   * - 这样可以实现打字机效果，提升用户体验
   */
  const handleSend = async () => {
    const content = input.trim();
    if (!content || loading) return;

    const requestId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startTime = Date.now();

    // 创建用户消息
    const userMessage: UiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };

    // 立即显示用户消息和空的助手消息
    // 空的助手消息用于后续流式更新
    const assistantMessage: UiMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    };
    const newMessages: UiMessage[] = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    saveMessages(newMessages, true); // 立即保存
    setInput('');
    setLoading(true);

    try {
      // 准备发送给 API 的消息（不包含空的助手消息）
      const payloadMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // 发送请求，启用流式传输
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages, stream: true }),
      });

      // 处理错误响应
      if (!res.ok) {
        const errorText = 'Champ 有点累了，稍后再试试？';
        console.error(`[ChatWidget:${requestId}] ✗ API 请求失败: ${res.status} ${res.statusText}`);
        setMessages((prev) => {
          const next: UiMessage[] = [...prev];
          // 找到空的助手消息并更新为错误消息
          const lastIndex = next.findIndex((m) => m.id.startsWith('assistant-') && m.content === '');
          if (lastIndex !== -1) {
            next[lastIndex] = {
              ...next[lastIndex],
              content: errorText,
            };
          } else {
            // 如果找不到空消息，添加新的错误消息
            const errorMessage: UiMessage = {
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: errorText,
            };
            next.push(errorMessage);
          }
          saveMessages(next, true); // 错误时立即保存
          return next;
        });
        return;
      }

      // 获取流式响应的 reader
      const reader = res.body?.getReader();
      if (!reader) {
        console.error(`[ChatWidget:${requestId}] ✗ 无法获取响应流`);
        return;
      }

      const decoder = new TextDecoder('utf-8');

      /**
       * 逐块读取流式内容，并实时更新最后一条 assistant 消息
       * 
       * 这样可以实现打字机效果：AI 的回复逐字显示
       */
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break; // 流结束
        }

        const chunkText = decoder.decode(value, { stream: true });
        if (!chunkText) continue; // 跳过空块

        // 更新最后一条助手消息，追加新接收到的文本
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex].role === 'assistant') {
            next[lastIndex] = {
              ...next[lastIndex],
              content: next[lastIndex].content + chunkText,
            };
          }
          // 节流保存，减少保存频率
          saveMessages(next, false);
          return next;
        });
      }

      // 流结束时立即保存一次，确保数据不丢失
      setMessages((prev) => {
        saveMessages(prev, true);
        return prev;
      });
    } catch (err) {
      console.error(`[ChatWidget:${requestId}] 请求异常:`, err instanceof Error ? err.message : String(err));

      // 网络错误处理
      setMessages((prev) => {
        const errorMessage: UiMessage = {
          id: `neterr-${Date.now()}`,
          role: 'assistant',
          content: '网络好像断线了，再点一次发送试试？',
        };
        const next: UiMessage[] = [...prev, errorMessage];
        saveMessages(next, true); // 错误时立即保存
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      {/* 悬浮按钮 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[9999] flex h-20 w-20 items-center justify-center rounded-full border-2 border-black bg-white shadow-[3px_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all cursor-pointer md:h-28 md:w-28"
        aria-label="和 Champ 聊聊"
      >
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-black md:h-24 md:w-24">
          <Image
            src="/images/L.webp"
            alt="Champ 头像"
            fill
            sizes="(max-width: 768px) 64px, 96px"
            className="object-cover"
          />
        </div>
      </button>

      {/* 聊天面板 */}
      {open && (
        <div className="fixed bottom-28 right-3 md:right-6 z-[9999] w-[26rem] max-w-[95vw] h-[32rem] rounded-2xl border-2 border-black bg-[#fff9fb] shadow-[4px_4px_0_#1a1a1a] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-[#ffd6e7]">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-black">
                <Image
                  src="/images/L.webp"
                  alt="Champ 头像"
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
              <div className="text-xs font-bold">Champ</div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className="text-xs font-bold px-2 py-1 rounded-lg border border-black bg-white hover:bg-gray-100 transition-colors"
                  title="换个话题"
                >
                  换个话题
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs font-bold px-2 py-1 rounded-lg border border-black bg-white hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            className="flex-1 px-3 py-2 space-y-2 overflow-y-auto text-xs bg-[#fffdfd]"
          >
            {messages.length === 0 && (
              <div className="text-[11px] text-gray-500 text-center py-4">
                可以跟我聊今天的心情，或者随便提一件以前发生的事，我会尽量帮你一起回忆～ ♡
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl border-2 px-3 py-2 ${m.role === 'user'
                    ? 'bg-[#d0f0ff] border-black'
                    : 'bg-white border-black'
                    }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              // 这是一个兜底，只有在还没有创建 assistant message 的短暂间隙显示，
              // 实际上 handleSend 里立即创建了空的 assistant message，所以这个可能不会显示。
              // 但如果是 Function Calling 导致的延迟（虽然我们用空消息占位了），
              // 用户会看到一个空气泡，直到内容回来。
              // 我们可以给空气泡加个 loading 动画
              <div className="flex justify-start">
                <div className="bg-white border-2 border-black rounded-2xl px-3 py-2">
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t-2 border-black bg-white px-2 py-2">
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="想对 Champ 说什么呢？按 Enter 发送，Shift+Enter 换行～"
              className="w-full resize-none rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-black transition-colors"
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || !input.trim()}
                className="inline-flex items-center rounded-lg border-2 border-black bg-[#ffd6e7] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1a1a1a] disabled:opacity-50 disabled:shadow-none hover:shadow-[3px_3px_0_#1a1a1a] hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-[1px_1px_0_#1a1a1a]"
              >
                发送 ♡
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

export default ChatWidget;
