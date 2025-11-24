export type SecurityQuestion = {
  id: string;
  question: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
};

export const securityQuestions: SecurityQuestion[] = [
  {
    id: 'first-date',
    question: '我们第一次正式约会去了哪里？',
    options: [
      { id: 'cinema', label: '看电影' },
      { id: 'hotpot', label: '一起吃火锅' },
      { id: 'park', label: '湖边散步' },
    ],
    correctOptionId: 'cinema',
  },
  {
    id: 'nickname',
    question: '你对我的nickname是什么？',
    options: [
      { id: 'baby', label: '宝宝' },
      { id: 'Pookie', label: 'Pookie' },
      { id: 'bro', label: '哥哥' },
    ],
    correctOptionId: 'Pookie',
  },
  {
    id: 'anniversary-month',
    question: '我们确定关系是在几月？',
    options: [
      { id: 'march', label: '三月' },
      { id: 'June', label: '六月' },
      { id: 'october', label: '十月' },
    ],
    correctOptionId: 'June',
  },
];

