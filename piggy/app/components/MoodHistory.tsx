import { memo } from 'react';
import { Mood } from '@/lib/actions';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  blissful: '🥰',
  tired: '😴',
  annoyed: '😫',
  angry: '😠',
  depressed: '😔',
};

// 优化的单个心情卡片组件
const MoodCard = memo(({ mood }: { mood: Mood }) => (
  <div className="cursor-pointer bg-gradient-to-br from-white via-pink-50/20 to-purple-50/20 p-4 rounded-2xl shadow-md border border-pink-200/50 flex gap-4 items-center transform transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
    <div className="text-4xl flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 w-14 h-14 rounded-2xl shrink-0 shadow-sm">
      {MOOD_EMOJIS[mood.mood] || '😐'}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent truncate">
          {format(new Date(mood.created_at), 'M月d日', { locale: zhCN })}
        </span>
        <span className="text-xs bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-medium">
          {format(new Date(mood.created_at), 'HH:mm')}
        </span>
      </div>
      <div className="flex gap-1 mb-2">
        {Array.from({ length: mood.intensity + 1 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-pink-400 to-purple-400" />
        ))}
      </div>
      {mood.note && (
        <p className="text-gray-600 text-sm truncate">{mood.note}</p>
      )}
    </div>
  </div>
));

MoodCard.displayName = 'MoodCard';

function MoodHistory({ moods }: { moods: Mood[] }) {
  return (
    <div className="w-full px-2">
      <h2 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4 px-2 opacity-70">近期心情</h2>
      <div className="space-y-3">
        {moods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-4xl mb-2">🍃</span>
            <p className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">还没有记录哦</p>
          </div>
        ) : (
          moods.map((mood) => <MoodCard key={mood.id} mood={mood} />)
        )}
      </div>
    </div>
  );
}

export default memo(MoodHistory);

