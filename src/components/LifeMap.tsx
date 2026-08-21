import React from 'react';
import { Calendar, Clock, CheckCircle, Heart, Pill, Activity, Moon, BookOpen, Brain, Sparkles, Mic, FileText, Image as ImageIcon } from 'lucide-react';
import { DiaryEntry, LifeMapEvent } from '../types';
import { AppLanguage, getLanguageInfo, getTranslation } from '../lib/languages';

interface LifeMapProps {
  selectedDate: string; // ISO split Date 'YYYY-MM-DD'
  diaries: DiaryEntry[];
  appLanguage?: AppLanguage;
}

export default function LifeMap({ selectedDate, diaries, appLanguage = 'ar' }: LifeMapProps) {
  const langInfo = getLanguageInfo(appLanguage);
  const t = getTranslation(appLanguage);

  // Find diary entry for the selected date
  const diaryToday = diaries.find(d => d.createdAt && (typeof d.createdAt === 'string' ? d.createdAt.split('T')[0] : new Date(d.createdAt).toISOString().split('T')[0]) === selectedDate);

  // Accumulate events for this day
  const events: LifeMapEvent[] = [];

  // Calculate Health & Day Metrics
  let sleepProgress = 0;
  let sportsProgress = 0;
  let medTakenCount = 0;
  let medTotalCount = 0;
  let habitCompletedCount = 0;
  let habitTotalCount = 0;

  if (diaryToday) {
    // 1. Sleep progress
    if (diaryToday.sleepHours) {
      sleepProgress = Math.min(Math.round((diaryToday.sleepHours / 8) * 100), 100);
      events.push({
        id: 'sleep',
        type: 'sleep',
        title: t.sleepPeriodTitle,
        time: '08:00',
        description: `${t.sleepLogged} ${diaryToday.sleepHours} ${t.hoursUnit}.`,
        icon: 'moon'
      });
    }

    // 2. Medication events
    if (diaryToday.medications && diaryToday.medications.length > 0) {
      medTotalCount = diaryToday.medications.length;
      diaryToday.medications.forEach(med => {
        if (med.taken) medTakenCount++;
        events.push({
          id: `med-${med.id}`,
          type: 'medication',
          title: `${t.medicationTrackTitle} ${med.name} 💊`,
          time: med.time || '10:00',
          description: med.taken ? (t.medicationTakenBtn) : (t.medicationPendingBtn),
          icon: 'pill',
          moodColor: med.taken ? 'text-emerald-500' : 'text-amber-500'
        });
      });
    }

    // 3. Sports exercise
    if (diaryToday.sportsDuration) {
      sportsProgress = Math.min(Math.round((diaryToday.sportsDuration / 45) * 100), 100);
      events.push({
        id: 'sports',
        type: 'sports',
        title: t.physicalActivityTitle,
        time: '17:30',
        description: `${t.sportsDurationLogged} ${diaryToday.sportsDuration} ${t.minutesUnit}.`,
        icon: 'sports'
      });
    }

    // 4. Custom habits track
    if (diaryToday.customHabits && diaryToday.customHabits.length > 0) {
      habitTotalCount = diaryToday.customHabits.length;
      diaryToday.customHabits.forEach(h => {
        if (h.completed) habitCompletedCount++;
      });
    }

    // 5. Mood log
    if (diaryToday.moods && diaryToday.moods.length > 0) {
      events.push({
        id: 'mood',
        type: 'mood',
        title: t.moodStateTitle,
        time: '19:00',
        description: `${t.dominantMoods} ${diaryToday.moods.join(' • ')}`,
        icon: 'mood'
      });
    }

    // 6. Diary Note event
    events.push({
      id: 'note',
      type: 'note',
      title: t.diaryEntryEventTitle,
      time: diaryToday.createdAt.split('T')[1]?.substring(0, 5) || '21:00',
      description: `${t.writtenEntryDesc} "${diaryToday.title || t.untitledEntry}"`,
      icon: 'note'
    });
  }

  // Sort events chronologically
  const orderMap: Record<string, number> = { sleep: 1, medication: 2, sports: 3, mood: 4, note: 5 };
  events.sort((a, b) => (orderMap[a.type] || 9) - (orderMap[b.type] || 9));

  // Calculate Overall Balance Score (0 - 100)
  const calculateBalanceScore = () => {
    let score = 0;
    let counts = 0;

    if (sleepProgress > 0) { score += sleepProgress; counts++; }
    if (sportsProgress > 0) { score += sportsProgress; counts++; }
    if (medTotalCount > 0) { score += (medTakenCount / medTotalCount) * 100; counts++; }
    if (habitTotalCount > 0) { score += (habitCompletedCount / habitTotalCount) * 100; counts++; }
    if (diaryToday?.importance) { score += (diaryToday.importance / 5) * 100; counts++; }

    return counts > 0 ? Math.round(score / counts) : 50;
  };

  const balanceScore = calculateBalanceScore();

  return (
    <div className="space-y-6 font-sans" dir={langInfo.dir}>

      {/* 📊 Interactive Dashboard Header Gauges */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2.5 bg-[#8B9D83]/15 text-[#8B9D83] rounded-2xl">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#3A3A3A] text-base">{t.dailyLifeMapTitle}</h3>
              <p className="text-xs text-gray-400">{t.dailyLifeMapSub}</p>
            </div>
          </div>
          <span className="text-xs bg-[#F9F7F2] text-[#5A5A40] border border-[#E2DCC8]/60 px-3 py-1.5 rounded-full font-bold self-start sm:self-auto">
            📆 {selectedDate}
          </span>
        </div>

        {diaryToday ? (
          <>
            {/* Balance Score Gauge & Quick Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

              {/* Day Quality Indicator (Circular Gauge feel) */}
              <div className="bg-[#F9F7F2]/60 border border-[#E2DCC8]/50 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#5A5A40]">{t.dailyBalanceIndexLabel}</span>
                  <Sparkles className="w-4 h-4 text-[#D4A373] animate-pulse" />
                </div>
                <div className="flex items-baseline space-x-2 space-x-reverse">
                  <span className="text-4xl font-black text-[#8B9D83]">{balanceScore}%</span>
                  <span className="text-xs text-gray-400 font-semibold">{t.excellentBalance}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-[#8B9D83] h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${balanceScore}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {t.balanceScoreCalculatedDesc}
                  </p>
                </div>
              </div>

              {/* Grid of details progress */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-4">

                {/* Sleep Metrics */}
                <div className="bg-white border border-[#E2DCC8]/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                    <span>💤 {t.sleepQuality}</span>
                    <Moon className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-lg font-black text-[#3A3A3A] mt-2">
                    {diaryToday.sleepHours ? `${diaryToday.sleepHours} ${t.hoursUnit}` : (t.notRecorded)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${sleepProgress}%` }}></div>
                  </div>
                </div>

                {/* Sports Metrics */}
                <div className="bg-white border border-[#E2DCC8]/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                    <span>🏃 {t.sportsActivity}</span>
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-lg font-black text-[#3A3A3A] mt-2">
                    {diaryToday.sportsDuration ? `${diaryToday.sportsDuration} ${t.minutesUnit}` : (t.noSportsLogged)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${sportsProgress}%` }}></div>
                  </div>
                </div>

                {/* Medication Compliance */}
                <div className="bg-white border border-[#E2DCC8]/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                    <span>💊 {t.medicationAdherence}</span>
                    <Pill className="w-4 h-4 text-[#D4A373]" />
                  </div>
                  <div className="text-lg font-black text-[#3A3A3A] mt-2">
                    {medTotalCount > 0 ? `${medTakenCount} / ${medTotalCount}` : (t.noDosesToday)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div className="bg-[#D4A373] h-1.5 rounded-full" style={{ width: medTotalCount > 0 ? `${(medTakenCount / medTotalCount) * 100}%` : '0%' }}></div>
                  </div>
                </div>

                {/* Habits checklist rate */}
                <div className="bg-white border border-[#E2DCC8]/40 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
                    <span>🎯 {t.habitsCompletionLabel}</span>
                    <CheckCircle className="w-4 h-4 text-[#8B9D83]" />
                  </div>
                  <div className="text-lg font-black text-[#3A3A3A] mt-2">
                    {habitTotalCount > 0 ? `${habitCompletedCount} ${t.ofTotalLabel} ${habitTotalCount}` : (t.noSubHabits)}
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                    <div className="bg-[#8B9D83] h-1.5 rounded-full" style={{ width: habitTotalCount > 0 ? `${(habitCompletedCount / habitTotalCount) * 100}%` : '0%' }}></div>
                  </div>
                </div>

              </div>

            </div>
          </>
        ) : (
          <p className="text-xs text-center text-gray-400 py-2">{t.startWritingDiariesPrompt}</p>
        )}
      </div>

      {/* ⏳ Chronological Memory Timeline with attachments */}
      <div className="bg-white border border-[#E2DCC8] rounded-3xl p-6 shadow-xs space-y-6">
        <h4 className="text-xs font-black text-[#5A5A40] uppercase tracking-wider">{t('integratedTimelineTitle')}</h4>

        {events.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-55 text-[#8B9D83]" />
            <p className="font-bold text-[#5A5A40] text-sm">{t.noActivitiesLoggedForDay}</p>
            <p className="text-[10px] mt-1 text-gray-400 max-w-sm mx-auto leading-relaxed">
              {t.lifeMapTimelineDescription}
            </p>
          </div>
        ) : (
          <div className="relative border-e-2 border-[#E2DCC8] pe-6 me-3 space-y-8">
            {events.map((ev) => (
              <div key={ev.id} className="relative">

                {/* Visual Circle Icon on Timeline Axis */}
                <div className="absolute -end-[33px] top-1 bg-white border-2 border-[#E2DCC8] p-1.5 rounded-full shadow-xs z-10 transition-colors">
                  {ev.icon === 'moon' && <Moon className="w-3.5 h-3.5 text-blue-500" />}
                  {ev.icon === 'pill' && <Pill className="w-3.5 h-3.5 text-[#D4A373]" />}
                  {ev.icon === 'sports' && <Activity className="w-3.5 h-3.5 text-emerald-500" />}
                  {ev.icon === 'mood' && <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                  {ev.icon === 'note' && <BookOpen className="w-3.5 h-3.5 text-[#8B9D83]" />}
                </div>

                {/* Event Content card */}
                <div className="bg-[#F9F7F2] hover:bg-[#F0EDE4]/40 border border-[#E2DCC8]/60 p-5 rounded-2xl space-y-3 transition-colors">

                  {/* Header: Title & exact clock time */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1.5 border-b border-[#E2DCC8]/40">
                    <h5 className="text-xs font-extrabold text-[#3A3A3A] flex items-center space-x-1.5 space-x-reverse">
                      <span>{ev.title}</span>
                    </h5>
                    <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center space-x-1 space-x-reverse">
                      <Clock className="w-3 h-3 text-[#8B9D83]" />
                      <span>{ev.time}</span>
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed font-normal">{ev.description}</p>

                  {/* 📷 Premium Visual Attachments inside the Timeline (If Note event has drawings/audio/photos) */}
                  {ev.type === 'note' && diaryToday && (
                    <div className="space-y-3 pt-2">

                      {/* Attached Photos */}
                      {diaryToday.images && diaryToday.images.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-[#D4A373]" />
                            <span>{t.capturedPhotosTodayLabel}</span>
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {diaryToday.images.map((img, index) => (
                              <img
                                key={index}
                                src={img}
                                alt={t.capturedMemoryAlt}
                                referrerPolicy="no-referrer"
                                className="w-full h-16 object-cover rounded-xl border border-[#E2DCC8] shadow-2xs hover:scale-105 transition-transform"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attached Sketch Canvas Drawing */}
                      {diaryToday.drawing && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <span>🎨</span>
                            <span>{t.drawingCanvasAttachmentLabel}</span>
                          </span>
                          <div className="max-w-xs bg-white p-1 rounded-xl border border-[#E2DCC8]/60 shadow-2xs">
                            <img
                              src={diaryToday.drawing}
                              alt={t.mindSketchAlt}
                              referrerPolicy="no-referrer"
                              className="max-h-24 object-contain rounded-lg"
                            />
                          </div>
                        </div>
                      )}

                      {/* Attached Voice Dictations */}
                      {diaryToday.audioRecordings && diaryToday.audioRecordings.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <Mic className="w-3 h-3 text-red-500" />
                            <span>{t.voiceRecordingsAttachmentLabel}</span>
                          </span>
                          <div className="space-y-1">
                            {diaryToday.audioRecordings.map((audio) => (
                              <div key={audio.id} className="bg-white px-3 py-1.5 rounded-xl border border-[#E2DCC8]/40 flex items-center justify-between text-[10px] text-gray-600">
                                <span className="font-semibold flex items-center gap-1">
                                  <span>🎙️</span> {audio.name}
                                </span>
                                <span className="text-gray-400 font-mono">{t.durationPrefix} {audio.duration}{t.secondsShortUnit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attached File Documents */}
                      {diaryToday.files && diaryToday.files.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#8B9D83]" />
                            <span>{t.attachedDocumentsLabel}</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {diaryToday.files.map((file) => (
                              <span key={file.id} className="bg-white/95 border border-[#E2DCC8]/50 px-2.5 py-1 rounded-lg text-[9px] text-[#5A5A40] font-bold shadow-3xs">
                                📄 {file.name} ({file.size})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
