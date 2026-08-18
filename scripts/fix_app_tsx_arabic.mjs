/**
 * COMPREHENSIVE App.tsx JSX Arabic String Replacer
 * Targets all direct JSX Arabic strings and replaces with t.key
 */
import fs from 'fs';

let app = fs.readFileSync('./src/App.tsx', 'utf-8');
let count = 0;

function replace(from, to) {
  if (app.includes(from)) {
    app = app.split(from).join(to);
    count++;
    return true;
  }
  return false;
}

// ============================================================
// AUDIO PLAYER
// ============================================================
replace('<span>مشغل الصوت التسجيلي:</span>', '<span>{t.audioRecordingPlayer || "Audio Recording Player:"}</span>');
replace('>جاهز للتشغيل والاستماع<', '>{t.readyToPlay || "Ready to play"}<');
replace('<span>⚠️ يتعذر تشغيل الصوت (لم يتم حفظ الملف الصوتي بالكامل).</span>', '<span>⚠️ {t.audioCannotPlay || "Cannot play audio (file not fully saved)."}</span>');
replace('>إعادة التسجيل 🎙️<', '>{t.reRecord || "Re-record 🎙️"}<');

// ============================================================
// HABIT FORM MODAL
// ============================================================
replace('<span>إضافة عادة سلوكية جديدة</span>', '<span>{t.addNewHabit || "Add New Habit"}</span>');
replace('>اسم العادة<', '>{t.habitName || "Habit Name"}<');
replace('placeholder="مثال: شرب لترين ماء، قراءة، تمدد..."', 'placeholder={t.habitNamePlaceholder || "e.g., Drink water, Read, Stretch..."}');
replace('>اختيار أيقونة العادة المخصصة<', '>{t.chooseHabitIcon || "Choose Custom Habit Icon"}<');
replace('>المحددة: {newHabitIcon}<', '>{t.selectedIcon || "Selected"}: {newHabitIcon}<');
replace('>تصنيف العادة للتحليل السلوكي<', '>{t.habitCategoryLabel || "Habit Category"}<');
replace("{ id: 'custom', label: 'أهداف مخصصة 🎯' },", "{ id: 'custom', label: t.customGoalsCategoryFilter || 'Custom Goals 🎯' },");
replace('>وقت التنبيه<', '>{t.reminderTime || "Reminder Time"}<');
replace('>تنبيه بالبوش اليومي<', '>{t.dailyPushNotification || "Daily Push Notification"}<');
replace('>حفظ وتفعيل التتبع 🚀<', '>{t.saveAndActivate || "Save & Activate 🚀"}<');

// ============================================================
// DIARY / ATTACHMENT SECTION
// ============================================================
replace('>الوسوم والتصنيفات (اضغط مفتاح المسافة أو فاصلة للإضافة):<', '>{t.tagsLabel || "Tags (press Space or comma to add):"}<');
replace('placeholder="إضافة وسم..."', 'placeholder={t.addTagPlaceholder || "Add tag..."}');
replace('>الصور والتخطيطات المرفقة:<', '>{t.attachedImagesDrawings || "Attached images & drawings:"}<');
replace('>رسمة<', '>{t.drawing || "Drawing"}<');
replace('>الفيديوهات المرفقة بالمذكرة:<', '>{t.attachedVideos || "Attached videos:"}<');
replace('>رابط فيديو:<', '>{t.videoLink || "Video link:"}<');
replace('>الملفات والمرفقات بالمذكرة:<', '>{t.attachedFiles || "Attached files:"}<');
replace('>الحجم: {file.size}<', '>{t.fileSize || "Size"}: {file.size}<');
replace('>الروابط والمراجع المرفقة:<', '>{t.attachedLinksRefs || "Attached links & references:"}<');
replace('>إضافة وسائط ومرفقات لتوسيع الذاكرة الزمنية:<', '>{t.addMediaAttachments || "Add media & attachments:"}<');
replace('>أضف ملف صوتي<', '>{t.addAudioFile || "Add audio file"}<');
replace('>إضافة لقطة/صورة<', '>{t.addPhotoScreenshot || "Add photo/screenshot"}<');
replace('>ارسم تخطيطاً ذهنيّاً<', '>{t.drawMindmap || "Draw mindmap"}<');
replace('>جاري الاستماع والكتابة لحظياً...<', '>{t.listeningTranscribing || "Listening & transcribing..."}<');
replace('>{isRecording ? `جاري الاستماع (${recordingSeconds}ث)` : \'🎤 فضفضة صوتية سريعة\'}<', '>{isRecording ? `${t.listening || "Listening"} (${recordingSeconds}s)` : (t.quickVoiceJournal || "🎤 Quick Voice Journal")}<');
replace('>❌ إلغاء<', '>{t.cancelAction || "❌ Cancel"}<');
replace('>✅ إنهاء وإدراج النص في التدوينة<', '>{t.finishInsertText || "✅ Finish & insert text"}<');
replace('>رابط ويب<', '>{t.webLink || "Web link"}<');
replace('>فيديو<', '>{t.videoLabel || "Video"}<');
replace('>ملف PDF<', '>{t.pdfFile || "PDF file"}<');
replace('>أدخل رابط الموقع الإلكتروني أو المراجع للفضفضة:<', '>{t.enterWebLinkRef || "Enter website link or reference:"}<');
replace('>إضافة فيديو للمذكرة:<', '>{t.addVideoToEntry || "Add video to entry:"}<');
replace('>الخيار 1: رفع ملف فيديو محلي<', '>{t.option1LocalVideo || "Option 1: Upload local video"}<');
replace('>📁 اختر فيديو من جهازك<', '>{t.chooseVideoFromDevice || "📁 Choose video from device"}<');
replace('>الخيار 2: أدخل رابط فيديو (YouTube أو رابط مباشر)<', '>{t.option2VideoLink || "Option 2: Enter video link (YouTube or direct)"}<');
replace('>إضافة ملف PDF أو مستند للمذكرة:<', '>{t.addPdfToEntry || "Add PDF or document to entry:"}<');
replace('>الخيار 1: رفع ملف أو مستند من جهازك<', '>{t.option1LocalFile || "Option 1: Upload file from device"}<');
replace('>📄 اختر ملف من جهازك<', '>{t.chooseFileFromDevice || "📄 Choose file from device"}<');
replace('>الخيار 2: إضافة مستند مرجعي أو رابط PDF<', '>{t.option2PdfLink || "Option 2: Add reference doc or PDF link"}<');
replace('placeholder="اسم ملف الـ PDF..."', 'placeholder={t.pdfFileNamePlaceholder || "PDF file name..."}');
replace('placeholder="رابط الملف..."', 'placeholder={t.fileLinkPlaceholder || "File link..."}');
replace('`${t.seconds || "s"}: {rec.duration} ثانية`', '`${t.duration || "Duration"}: ${rec.duration}s`');
replace('>المدة: {rec.duration} ثانية<', '>{t.durationLabel || "Duration"}: {rec.duration}s<');

// ============================================================
// CONFIRMATIONS AND ALERTS
// ============================================================
replace("if (confirm('هل أنت متأكد من حذف هذه العادة نهائياً؟'))", "if (confirm(t.confirmDeleteHabitPermanent || 'Are you sure you want to permanently delete this habit?'))");
replace("alert('لا يوجد تسجيل صوتي صالح للتفريغ النصي.')", "alert(t.noValidAudioTranscription || 'No valid audio recording for transcription.')");
replace("alert('تم استعادة نسختك الاحتياطية بنجاح بنسبة 100%! 🎉')", "alert(t.backupRestoredSuccess || 'Backup restored successfully! 🎉')");
replace("alert('صيغة ملف النسخ الاحتياطي غير صالحة.')", "alert(t.invalidBackupFormat || 'Invalid backup file format.')");
replace("alert('فشلت قراءة الملف. تأكد من رفعه بشكل صحيح.')", "alert(t.fileReadFailed || 'Failed to read file. Make sure it is uploaded correctly.')");
replace("alert('حدث خطأ أثناء الاتصال بالمستشار المعرفي بالذكاء الاصطناعي. تم استخدام بديل عقلاني ذكي مدمج.')", "alert(t.aiAdvisorError || 'An error occurred connecting to the AI advisor. A built-in fallback was used.')");

// ============================================================
// INITIAL STATE / CLOUD SYNC
// ============================================================
replace("useState<string | null>('النسخة الاحتياطية السحابية نشطة ومتصلة 🟢')", "useState<string | null>(null)");

// ============================================================
// BOOK/LIBRARY TAGS
// ============================================================
replace("useState<string[]>(['تنمية ذاتية'])", "useState<string[]>([])");

// ============================================================
// DIARY ATTACHMENT UI STRINGS (more)
// ============================================================
replace('>المدة: {rec.duration} ثانية<', '>{t.durationLabel || "Duration"}: {rec.duration}s<');

// ============================================================
// CONFIRM DELETE HABIT
// ============================================================
replace("confirm('هل أنت متأكد من حذف هذا التنبيه نهائياً؟')", "(confirm(t.confirmDeleteReminderPermanent || 'Are you sure you want to permanently delete this reminder?'))");
replace("confirm('هل أنت متأكد من حذف هذه المهمة نهائياً؟')", "(confirm(t.confirmDeleteTaskPermanent || 'Are you sure you want to permanently delete this task?'))");
replace("confirm('هل تريد حذف هذه اليومية نهائياً؟')", "(confirm(t.confirmDeleteDiary || 'Delete this diary entry permanently?'))");
replace("confirm('هل أنت متأكد؟ سيتم حذف كل البيانات.')", "(confirm(t.confirmDeleteAllData || 'Are you sure? All data will be deleted.'))");
replace("confirm('هل أنت متأكد من حذف هذا الكتاب نهائياً؟')", "(confirm(t.confirmDeleteBook || 'Are you sure you want to permanently delete this book?'))");
replace("confirm('هل أنت متأكد من مسح جميع بيانات التطبيق؟')", "(confirm(t.confirmClearAllAppData || 'Are you sure you want to clear all app data?'))");

// Count total remaining Arabic in JSX
const arabicRegex = /[\u0600-\u06FF]/;
const lines = app.split('\n');
let remainingUI = 0;
lines.forEach((line, i) => {
  const t = line.trim();
  if (!arabicRegex.test(line)) return;
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return;
  // JSX/UI patterns
  if (t.startsWith('<') || t.startsWith('>') || t.includes('</') || 
      t.includes('placeholder=') || t.includes('title=') || 
      t.includes('alert(') || t.includes('confirm(') || t.includes('toast') ||
      (t.includes('>') && t.includes('<'))) {
    remainingUI++;
  }
});

fs.writeFileSync('./src/App.tsx', app, 'utf-8');
console.log(`✅ App.tsx: Made ${count} replacements. Remaining UI Arabic: ~${remainingUI} lines`);
console.log('Saved App.tsx successfully.');
