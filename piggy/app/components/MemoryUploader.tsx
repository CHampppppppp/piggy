'use client';

import { useState } from 'react';
import { useToast } from './ToastProvider';

function MemoryUploader() {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement | null;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      showToast('先选一个文件嘛～', 'error');
      return;
    }

    const formData = new FormData(form);
    setUploading(true);
    try {
      const res = await fetch('/api/upload-memory', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '上传失败了，再试试？', 'error');
        return;
      }

      showToast(`上传好了～ 已经记住了 ${data.chunks} 个片段♡`, 'success');
      form.reset();
    } catch (err) {
      console.error(err);
      showToast('网络好像出问题了，再试一次？', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 p-5 rounded-2xl border-2 border-dashed border-gray-300 bg-white/80 text-xs space-y-3 cursor-pointer"
    >
      <div className="font-bold text-gray-700 text-sm">
        上传一份「我们的记忆」文件
      </div>
      <input
        type="file"
        name="file"
        accept=".txt,.md,.markdown,text/plain"
        className="block w-full text-xs cursor-pointer"
      />
      <textarea
        name="note"
        rows={5}
        placeholder="可以简单写一下这个文件的大概内容，比如：我们的旅行计划、一起看的书笔记..."
        className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-xs resize-none min-h-[140px]"
      />
      <input type="hidden" name="author" value="champ" />
      <button
        type="submit"
        disabled={uploading}
        className="mt-1 inline-flex items-center justify-center rounded-lg border-2 border-black bg-[#ffd6e7] px-4 py-2 font-bold text-xs shadow-[2px_2px_0_#1a1a1a] disabled:opacity-60 disabled:shadow-none cursor-pointer"
      >
        {uploading ? '上传中...' : '上传并记住 ♡'}
      </button>
    </form>
  );
}

export default MemoryUploader;


