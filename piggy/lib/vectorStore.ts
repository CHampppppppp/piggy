import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

export type MemoryMetadata = {
  type: 'mood' | 'file' | 'note';
  author: 'piggy' | 'champ';
  datetime: string;
  sourceId?: string;
  sourceFilename?: string;
};

export type MemoryRecord = {
  id: string;
  text: string;
  metadata: MemoryMetadata;
};

const PINECONE_INDEX_NAME =
  process.env.PINECONE_INDEX || 'piggy-memories';
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

let pineconeClient: Pinecone | null = null;

function getPineconeIndex() {
  if (!PINECONE_API_KEY) {
    console.warn(
      '[vectorStore] PINECONE_API_KEY is not set. RAG will be disabled.'
    );
    return null;
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
  }

  return pineconeClient.index(PINECONE_INDEX_NAME);
}

// OpenAI 向量模型，用于生成向量写入 Pinecone
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openaiEmbedClient = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: process.env.OPENAI_API_BASE,
      timeout: 15000, // 15s 超时时间，避免请求卡太久
    })
  : null;

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];

  if (!openaiEmbedClient) {
    console.warn(
      '[vectorStore] OPENAI_API_KEY is not set. Embedding will be skipped and RAG will be disabled.'
    );
    return texts.map(() => []);
  }

  try {
    const res = await openaiEmbedClient.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    return res.data.map((item) => item.embedding as number[]);
  } catch (err) {
    console.error(
      '[vectorStore] Failed to create embeddings from OpenAI, RAG will be skipped for this request',
      err
    );
    // 返回空向量：后续查询会得到空结果，相当于这次对话不使用 RAG，但聊天正常
    return texts.map(() => []);
  }
}

export async function addMemories(records: MemoryRecord[]): Promise<void> {
  if (!records.length) return;

  const index = getPineconeIndex();
  if (!index) return;

  const texts = records.map((r) => r.text);
  const embeddings = await embedTexts(texts);

  const vectors = [];
  for (let i = 0; i < records.length; i += 1) {
    const emb = embeddings[i];
    if (!emb || emb.length === 0) continue;

    vectors.push({
      id: records[i].id,
      values: emb,
      metadata: {
        text: records[i].text,
        ...records[i].metadata,
      },
    });
  }

  if (!vectors.length) return;

  // 先简单用单一 namespace，后续可以根据用户拆分
  await index.upsert(vectors, {
    namespace: 'piggy',
  });
}

export type RetrievedMemory = {
  text: string;
  metadata: MemoryMetadata;
  distance?: number;
};

export async function searchMemories(
  query: string,
  k: number = 5
): Promise<RetrievedMemory[]> {
  if (!query.trim()) return [];

  const index = getPineconeIndex();
  if (!index) return [];

  const [queryEmbedding] = await embedTexts([query]);
  if (!queryEmbedding || queryEmbedding.length === 0) return [];

  try {
    const result = await index.query({
      vector: queryEmbedding,
      topK: k,
      includeMetadata: true,
      namespace: 'piggy',
    });

    const matches = result.matches || [];
    const items: RetrievedMemory[] = matches
      .map((m) => {
        const md = (m.metadata || {}) as any;
        const text = (md.text as string) || '';
        if (!text) return null;
        const metadata: MemoryMetadata = {
          type: md.type,
          author: md.author,
          datetime: md.datetime,
          sourceId: md.sourceId,
          sourceFilename: md.sourceFilename,
        };
        return {
          text,
          metadata,
          distance: typeof m.score === 'number' ? 1 - m.score : undefined,
        };
      })
      .filter(Boolean) as RetrievedMemory[];

    return items;
  } catch (err) {
    console.error('[vectorStore] Failed to query Pinecone', err);
    return [];
  }
}
