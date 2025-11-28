'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    // 创建用户消息
    const userMessage: UiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };
    
    // 立即显示用户消息和空的助手消息
    // 空的助手消息用于后续流式更新
    setMessages((prev) => [...prev, userMessage, {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    }]);
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
        setMessages((prev) => {
          const next = [...prev];
          // 找到空的助手消息并更新为错误消息
          const lastIndex = next.findIndex((m) => m.id.startsWith('assistant-') && m.content === '');
          if (lastIndex !== -1) {
            next[lastIndex] = {
              ...next[lastIndex],
              content: errorText,
            };
          } else {
            // 如果找不到空消息，添加新的错误消息
            next.push({
              id: `error-${Date.now()}`,
              role: 'assistant',
              content: errorText,
            });
          }
          return next;
        });
        return;
      }

      // 获取流式响应的 reader
      const reader = res.body?.getReader();
      if (!reader) {
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
        if (done) break; // 流结束
        
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
          return next;
        });
      }
    } catch (err) {
      console.error(err);
      // 网络错误处理
      setMessages((prev) => [
        ...prev,
        {
          id: `neterr-${Date.now()}`,
          role: 'assistant',
          content: '网络好像断线了，再点一次发送试试？',
        },
      ]);
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
            src="/images/L.png"
            alt="Champ 头像"
            fill
            sizes="(max-width: 768px) 64px, 96px"
            className="object-cover"
          />
        </div>
      </button>

      {/* 聊天面板 */}
      {open && (
        <div className="fixed bottom-28 right-3 md:right-6 z-[9999] w-[26rem] max-w-[95vw] h-[32rem] rounded-2xl border-2 border-black bg-[#fff9fb] shadow-[4px_4px_0_#1a1a1a] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black bg-[#ffd6e7]">
            <div className="flex items-center gap-2">
              <div className="relative h-7 w-7 overflow-hidden rounded-full border border-black">
                <Image
                  src="/images/L.png"
                  alt="Champ 头像"
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </div>
              <div className="text-xs font-bold">Champ</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-bold px-2 py-1 rounded-lg border border-black bg-white hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          <div
            ref={containerRef}
            className="flex-1 px-3 py-2 space-y-2 overflow-y-auto text-xs bg-[#fffdfd]"
          >
            {messages.length === 0 && (
              <div className="text-[11px] text-gray-500">
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
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl border-2 px-2 py-1.5 ${m.role === 'user'
                    ? 'bg-[#d0f0ff] border-black'
                    : 'bg-white border-black'
                    }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-[11px] text-gray-500">Champ 正在努力回想中…</div>
            )}
          </div>

          <div className="border-t-2 border-black bg-white px-2 py-2">
            <textarea
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="想对 Champ 说什么呢？按 Enter 发送，Shift+Enter 换行～"
              className="w-full resize-none rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-black"
            />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || !input.trim()}
                className="inline-flex items-center rounded-lg border-2 border-black bg-[#ffd6e7] px-3 py-1 text-xs font-bold shadow-[2px_2px_0_#1a1a1a] disabled:opacity-50 disabled:shadow-none"
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


