import { NextRequest, NextResponse } from 'next/server';
import { addMemories, type MemoryRecord } from '@/lib/vectorStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function chunkText(text: string, chunkSize = 800): string[] {
  const chunks: string[] = [];
  let current = text.trim();
  while (current.length > 0) {
    if (current.length <= chunkSize) {
      chunks.push(current);
      break;
    }
    const slice = current.slice(0, chunkSize);
    const lastBreak =
      slice.lastIndexOf('\n') !== -1 ? slice.lastIndexOf('\n') : slice.lastIndexOf('。');
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

    // 只有文字、没文件的情况：直接按文本记忆入库
    if (!file && note.trim()) {
      const chunks = chunkText(note);
      const now = new Date().toISOString();
      const baseId = `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const records: MemoryRecord[] = chunks.map((chunk, index) => ({
        id: `${baseId}-${index}`,
        text: chunk,
        metadata: {
          type: 'note',
          author: author === 'piggy' ? 'piggy' : 'champ',
          datetime: now,
          sourceId: baseId,
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

    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(buffer);

    const chunks = chunkText(content);
    const now = new Date().toISOString();
    const baseId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const records: MemoryRecord[] = chunks.map((chunk, index) => ({
      id: `${baseId}-${index}`,
      text: `${note ? `备注：${note}\n\n` : ''}${chunk}`,
      metadata: {
        type: 'file',
        author: author === 'piggy' ? 'piggy' : 'champ',
        datetime: now,
        sourceFilename: file.name,
        sourceId: baseId,
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


