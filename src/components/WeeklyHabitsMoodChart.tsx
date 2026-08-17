import React from 'react';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Habit, DiaryEntry, AppLanguage } from '../types';
import { Sparkles, TrendingUp } from 'lucide-react';
import { getLanguageInfo, getTranslation } from '../lib/languages';

interface WeeklyHabitsMoodChartProps {
  habits: Habit[];
  appLanguage?: AppLanguage;
  diaries: DiaryEntry[];
}

export const WeeklyHabitsMoodChart: React.FC<WeeklyHabitsMoodChartProps> = ({ habits, diaries, appLanguage = 'ar' }) => {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);
  const [daysCount, setDaysCount] = React.useState<7 | 14 | 30>(7);
  const [showRangeMenu, setShowRangeMenu] = React.useState(false);

  const habitsKey = t.habitsCompletionPct;
  const moodKey = t.moodStabilityScore;

  // Generate past N days data
  const weeklyData = React.useMemo(() => {
    const days: Array<{
      day: string;
      date: string;
      [key: string]: any;
      completedCount: number;
      totalHabits: number;
    }> = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString(langInfo.bcp47 || 'ar-EG', { weekday: 'short' });

      // Calculate habit completion
      let completedCount = 0;
      const totalHabits = habits.length;

      if (totalHabits > 0) {
        habits.forEach(h => {
          if (h.history && h.history[dateStr]) {
            completedCount++;
          }
        });
      }

      const habitRate = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      // Find diary entry for this day
      const dayDiary = diaries.find(entry => entry.createdAt.split('T')[0] === dateStr);
      
      let moodScore = dayDiary?.fastMoodScore || 5;

      if (!dayDiary?.fastMoodScore && dayDiary) {
        if (dayDiary.moods && dayDiary.moods.length > 0) {
          moodScore = 7;
        }
      }

      days.push({
        day: `${dayName} ${d.getDate()}`,
        date: dateStr,
        [habitsKey]: habitRate,
        [moodKey]: moodScore,
        completedCount,
        totalHabits
      });
    }

    return days;
  }, [daysCount, habits, diaries, langInfo.bcp47, habitsKey, moodKey]);

  // Averages calculation
  const avgHabitRate = Math.round(weeklyData.reduce((acc, curr) => acc + (curr[habitsKey] || 0), 0) / (weeklyData.length || 1));
  const avgMood = (weeklyData.reduce((acc, curr) => acc + (curr[moodKey] || 0), 0) / (weeklyData.length || 1)).toFixed(1);
  const bestDay = [...weeklyData].sort((a, b) => (b[moodKey] || 0) - (a[moodKey] || 0))[0];

  const rangeOptions = [
    { label: t.dayRangeWeek, value: 7 },
    { label: t.dayRange2Weeks, value: 14 },
    { label: t.dayRangeMonth, value: 30 }
  ];

  return (
    <div className="bg-[#FAF8F5] border border-[#E2DCC8] rounded-3xl p-4 sm:p-6 space-y-4 font-sans shadow-3xs" dir={langInfo.dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="p-2 bg-[#8B9D83]/15 text-[#5A5A40] rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#2B3E50]">{t.weeklyHabitsMoodTitle}</h3>
            <p className="text-[11px] text-gray-500">{t.weeklyHabitsMoodDesc}</p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="relative">
          <button
            onClick={() => setShowRangeMenu(!showRangeMenu)}
            className="text-xs font-bold bg-white border border-[#E2DCC8] px-3 py-1.5 rounded-xl text-[#5A5A40] hover:bg-[#F9F7F2] transition flex items-center gap-1 cursor-pointer shadow-3xs"
          >
            <span>{rangeOptions.find(o => o.value === daysCount)?.label}</span>
            <span className="text-[10px]">▼</span>
          </button>

          {showRangeMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowRangeMenu(false)} />
              <div className="absolute end-0 mt-1 bg-white border border-[#E2DCC8] rounded-xl shadow-lg py-1 z-20 w-36 overflow-hidden">
                {rangeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setDaysCount(opt.value as any);
                      setShowRangeMenu(false);
                    }}
                    className={`w-full text-start px-3 py-2 text-xs font-bold transition flex items-center justify-between ${
                      daysCount === opt.value ? 'bg-[#8B9D83]/15 text-[#5A5A40]' : 'text-gray-600 hover:bg-[#F9F7F2]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {daysCount === opt.value && <span>✓</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-3 gap-2 py-1">
        <div className="bg-[#F9F7F2] border border-[#E2DCC8]/60 p-2.5 rounded-2xl text-center space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold block">{t.avgHabitsRate}</span>
          <span className="text-sm font-black text-[#8B9D83] font-mono">{avgHabitRate}%</span>
        </div>
        <div className="bg-[#F9F7F2] border border-[#E2DCC8]/60 p-2.5 rounded-2xl text-center space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold block">{t.avgMoodRate}</span>
          <span className="text-sm font-black text-[#D4A373] font-mono">{avgMood} / 10</span>
        </div>
        <div className="bg-[#F9F7F2] border border-[#E2DCC8]/60 p-2.5 rounded-2xl text-center space-y-0.5">
          <span className="text-[10px] text-gray-400 font-bold block">{t.bestMoodDay}</span>
          <span className="text-xs font-black text-[#3A3A3A] truncate block">{bestDay?.day?.split(' ')[0] || '-'}</span>
        </div>
      </div>

      {/* Responsive Composed Chart */}
      <div className="h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2DCC8" />
            <XAxis dataKey="day" stroke="#5A5A40" style={{ fontSize: '10px', fontWeight: 'bold' }} />
            
            {/* YAxis Left: Habit Completion Rate (0-100%) */}
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke="#8B9D83" 
              style={{ fontSize: '10px' }} 
              domain={[0, 100]}
              unit="%" 
            />
            
            {/* YAxis Right: Mood Score (0-10) */}
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#D4A373" 
              style={{ fontSize: '10px' }} 
              domain={[0, 10]} 
            />
            
            <ChartTooltip 
              contentStyle={{ 
                backgroundColor: '#FFF', 
                borderRadius: '12px', 
                borderColor: '#E2DCC8',
                fontSize: '11px',
                fontWeight: 'bold',
                direction: langInfo.dir
              }}
            />
            
            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
            
            {/* Bar for Habit Completion Rate */}
            <Bar
              yAxisId="left"
              dataKey={habitsKey}
              fill="#8B9D83"
              radius={[6, 6, 0, 0]}
              barSize={20}
            />

            {/* Line for Mood Stability Score */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={moodKey}
              stroke="#D4A373"
              strokeWidth={3}
              dot={{ r: 5, fill: "#D4A373", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Correlation Insight */}
      <div className="bg-[#EEF1EB] border border-[#DCE4D8] p-3.5 rounded-2xl flex items-start gap-2.5">
        <TrendingUp className="w-4 h-4 text-[#556E4F] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#4E685B] leading-relaxed font-semibold">
          <strong>{t.cognitiveInsightLabel}</strong> {t.weeklyChartInsight}
        </p>
      </div>
    </div>
  );
};
export default WeeklyHabitsMoodChart;
