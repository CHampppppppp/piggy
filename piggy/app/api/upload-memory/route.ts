import { NextRequest, NextResponse } from 'next/server';
import { addMemories, type MemoryRecord } from '@/lib/vectorStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 将文本分块
 * 
 * 这个函数用于将长文本分割成较小的块，以便：
 * 1. 符合向量数据库的 token 限制
 * 2. 提高检索精度（小块更容易匹配）
 * 3. 避免单次处理过大的文本
 * 
 * @param text - 要分块的文本
 * @param chunkSize - 每块的目标大小（字符数，默认 800）
 * @returns 文本块数组
 * 
 * 分块策略：
 * 1. 优先在换行符处分割（保持段落完整性）
 * 2. 如果没有换行符，在句号处分割（保持句子完整性）
 * 3. 如果前200个字符内没有换行符或句号，直接按 chunkSize 分割
 * 4. 这样可以避免在单词中间分割，保持语义完整性
 */
function chunkText(text: string, chunkSize = 800): string[] {
  const chunks: string[] = [];
  let current = text.trim();
  while (current.length > 0) {
    // 如果剩余文本小于等于块大小，直接添加
    if (current.length <= chunkSize) {
      chunks.push(current);
      break;
    }
    
    // 尝试在前 chunkSize 个字符内找到分割点
    const slice = current.slice(0, chunkSize);
    // 优先在换行符处分割，其次在句号处分割
    const lastBreak =
      slice.lastIndexOf('\n') !== -1 ? slice.lastIndexOf('\n') : slice.lastIndexOf('。');
    
    // 如果分割点在200字符之后，使用它；否则直接按 chunkSize 分割
    const cut = lastBreak > 200 ? lastBreak : chunkSize;
    chunks.push(current.slice(0, cut).trim());
    current = current.slice(cut).trim();
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawFile = formData.get('file');
    const file =
      rawFile instanceof File && rawFile.size > 0 ? (rawFile as File) : null;
    const author = (formData.get('author') as string) || 'champ';
    const note = (formData.get('note') as string) || '';

    if (!file && !note.trim()) {
      return NextResponse.json(
        { error: '至少上传一个文件，或者输入一些文字～' },
        { status: 400 }
      );
    }

    /**
     * 只有文字、没文件的情况：直接按文本记忆入库
     * 
     * 用户可以直接输入文字，不需要上传文件
     * 例如："帮我记住我们明天要去漫展"
     */
    if (!file && note.trim()) {
      const chunks = chunkText(note);
      const now = new Date().toISOString();
      const baseId = `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 为每个文本块创建记忆记录
      // 使用 baseId-index 作为 ID，保持关联性
      const records: MemoryRecord[] = chunks.map((chunk, index) => ({
        id: `${baseId}-${index}`,
        text: chunk,
        metadata: {
          type: 'note',
          author: author === 'piggy' ? 'piggy' : 'champ',
          datetime: now,
          sourceId: baseId, // 所有块共享同一个 sourceId，表示它们来自同一个源
        },
      }));

      await addMemories(records);

      return NextResponse.json({
        success: true,
        chunks: records.length,
      });
    }

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件太大啦，先控制在 10MB 以内好吗～' },
        { status: 400 }
      );
    }

    const mime = file.type || 'text/plain';
    if (
      !mime.startsWith('text/') &&
      !mime.includes('markdown') &&
      !mime.includes('md')
    ) {
      return NextResponse.json(
        { error: '目前只支持文本 / Markdown 文件哦～' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(buffer);

    // 将文件内容分块
    const chunks = chunkText(content);
    const now = new Date().toISOString();
    const baseId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // 为每个文本块创建记忆记录
    // 如果用户提供了备注，会在每个块的开头添加备注信息
    const records: MemoryRecord[] = chunks.map((chunk, index) => ({
      id: `${baseId}-${index}`,
      text: `${note ? `备注：${note}\n\n` : ''}${chunk}`, // 备注添加到每个块的开头
      metadata: {
        type: 'file',
        author: author === 'piggy' ? 'piggy' : 'champ',
        datetime: now,
        sourceFilename: file.name, // 保存原始文件名，方便追溯
        sourceId: baseId, // 所有块共享同一个 sourceId
      },
    }));

    await addMemories(records);

    return NextResponse.json({
      success: true,
      chunks: records.length,
    });
  } catch (error) {
    console.error('[api/upload-memory] error', error);
    return NextResponse.json(
      { error: '上传或解析失败了，再试一次好吗～' },
      { status: 500 }
    );
  }
}


