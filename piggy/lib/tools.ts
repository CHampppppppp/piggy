import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'log_mood',
      description: '记录用户当前的心情、情绪状态。当用户明确表达某种心情（如开心、难过、生气等）时调用。',
      parameters: {
        type: 'object',
        properties: {
          mood: {
            type: 'string',
            enum: ['happy', 'blissful', 'tired', 'annoyed', 'angry', 'depressed'],
            description: '心情类别: happy(开心), blissful(幸福), tired(累), annoyed(烦躁), angry(生气), depressed(沮丧)',
          },
          intensity: {
            type: 'number',
            description: '心情强度，1-3。1=一点点，2=中度，3=超级。',
            minimum: 1,
            maximum: 3,
          },
          note: {
            type: 'string',
            description: '关于心情的简短备注或原因',
          },
        },
        required: ['mood', 'intensity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'track_period',
      description: '记录用户生理期（大姨妈）开始。当用户提到大姨妈来了、肚子痛等生理期相关话题时调用。',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            description: '生理期开始日期，格式 YYYY-MM-DD，默认为今天',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: '保存重要的信息或用户明确要求记住的事情。比如未来的计划、重要的日期、或者用户的喜好等。',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: '需要记住的具体内容',
          },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_sticker',
      description: '在聊天界面展示一张表情包或贴纸来回应用户心情。',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['happy', 'love', 'sad', 'angry', 'tired'],
            description: '表情包类别',
          },
        },
        required: ['category'],
      },
    },
  },
];

