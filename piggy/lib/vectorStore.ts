import { ChromaClient, type Collection } from 'chromadb';
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

const MEMORIES_COLLECTION = 'piggy-memories';

// 如果你本地起了 Chroma Server（推荐），设置 CHROMA_URL，例如：http://localhost:8000
const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000',
});

let memoriesCollectionPromise: Promise<Collection | null> | null = null;

async function getMemoriesCollection(): Promise<Collection | null> {
  if (!memoriesCollectionPromise) {
    memoriesCollectionPromise = (async () => {
      try {
        const existing = await chromaClient.getOrCreateCollection({
          name: MEMORIES_COLLECTION,
          metadata: { description: 'Piggy & Champ shared memories' },
          // 我们自己提供 embedding，不使用 Chroma 的默认 embeddingFunction，避免额外依赖
          embeddingFunction: {
            generate: async () => {
              throw new Error(
                '[vectorStore] This embeddingFunction should not be called because embeddings are provided explicitly.'
              );
            },
          },
        });
        return existing;
      } catch (err) {
        console.error('[vectorStore] Failed to getOrCreateCollection', err);
        return null;
      }
    })();
  }
  return memoriesCollectionPromise;
}

// OpenAI 向量模型，用于生成向量写入 Chroma
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openaiEmbedClient = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
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

  const collection = await getMemoriesCollection();
  if (!collection) return;

  const ids = records.map((r) => r.id);
  const documents = records.map((r) => r.text);
  const metadatas = records.map((r) => r.metadata);

  const embeddings = await embedTexts(documents);

  await collection.add({
    ids,
    embeddings,
    metadatas,
    documents,
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

  const collection = await getMemoriesCollection();
  if (!collection) {
    // 如果向量库没连上，就当作当前没有记忆，返回空列表，这样聊天至少还能正常进行
    return [];
  }

  const [queryEmbedding] = await embedTexts([query]);

  const result = await collection
    .query({
      nResults: k,
      queryEmbeddings: [queryEmbedding],
      include: ['documents', 'metadatas', 'distances'],
    })
    .catch((err) => {
      console.error('[vectorStore] Failed to query memories', err);
      return {
        documents: [[]],
        metadatas: [[]],
        distances: [[]],
      };
    });

  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  const items: RetrievedMemory[] = [];
  for (let i = 0; i < documents.length; i += 1) {
    const text = documents[i] as string | null;
    const metadata = metadatas[i] as MemoryMetadata | undefined;
    if (!text || !metadata) continue;
    items.push({
      text,
      metadata,
      distance: typeof distances[i] === 'number' ? (distances[i] as number) : undefined,
    });
  }

  return items;
}
