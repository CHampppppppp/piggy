import MemoryUploader from '../components/MemoryUploader';

export default function UploadPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fff5f8] px-4 py-10">
      <div className="w-full max-w-3xl h-[50vh] rounded-3xl border-2 border-black bg-white shadow-[8px_8px_0_#1a1a1a] p-8 space-y-4 flex flex-col">
        <h1 className="text-2xl font-extrabold text-black text-center mb-1">
          上传一份我们的记忆 ♡
        </h1>
        <p className="text-sm text-gray-600 text-center mb-4">
          这里可以把你们的重要文件（笔记、计划、小作文等）交给 Champ 记住，
          之后在聊天里提到相关内容，他会尽量帮你一起回忆～
        </p>
        <div className="flex-1 overflow-auto">
          <MemoryUploader />
        </div>
      </div>
    </main>
  );
}


