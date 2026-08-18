/**
 * fix_daily_pros_cons.mjs
 * Fixes all hardcoded Arabic UI strings in DailyProsConsModal.tsx
 * Maps to translation keys via t.XXX
 */
import fs from 'fs';

const filePath = 'src/components/DailyProsConsModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

function rep(from, to, label) {
  if (content.includes(from)) {
    content = content.replaceAll(from, to);
    changes++;
    console.log('  ✅ ' + label);
    return true;
  }
  console.log('  ⚠️  Not found: ' + label);
  return false;
}

// =========================================================
// JSX UI Strings (shown directly to user in React)
// =========================================================

// Modal title / header
rep(
  '<span>⚖️ تقرير الإيجابيات والسلبيات اليومية</span>',
  '{t.prosConsReportTitle || "Daily Pros & Cons Report"}',
  'Modal title span'
);

rep(
  'توليد ذكي + يدوي',
  '{t.prosConsAiManual || "AI + Manual"}',
  'Badge: AI + Manual'
);

// Section labels
rep(
  '<span>أولاً: الإيجابيات والسلبيات المولدة بالذكاء الاصطناعي 🧠</span>',
  '{t.prosConsAiSection || "AI-Generated Pros & Cons 🧠"}',
  'AI section label'
);

rep(
  '<span className="text-[11px] text-[#5A5A40] font-bold">مستخلصة تلقائياً من كافة أقسام وأنشطة التطبيق</span>',
  '<span className="text-[11px] text-[#5A5A40] font-bold">{t.prosConsAiSubtitle || "Auto-extracted from all app sections"}</span>',
  'AI section subtitle'
);

rep(
  '<span className="text-[11px] text-gray-400 font-bold">إدخال واسترسال شخصي</span>',
  '<span className="text-[11px] text-gray-400 font-bold">{t.prosConsManualSubtitle || "Personal input & reflection"}</span>',
  'Manual section subtitle'
);

rep(
  '<span>الإيجابيات المولدة بالذكاء الاصطناعي (يمين):</span>',
  '{t.prosConsAiPositives || "AI-Generated Positives:"}',
  'AI positives label'
);

rep(
  '{aiPositives.length} نقاط',
  `{aiPositives.length} {t.prosConsPoints || "points"}`,
  'AI positives count'
);

rep(
  '<span>السلبيات والتحديات المولدة بالذكاء الاصطناعي (يسار):</span>',
  '{t.prosConsAiNegatives || "AI-Generated Challenges:"}',
  'AI negatives label'
);

rep(
  '{aiNegatives.length} نقاط',
  `{aiNegatives.length} {t.prosConsPoints || "points"}`,
  'AI negatives count'
);

rep(
  '<span>ثانياً: الإيجابيات والسلبيات المدخلة يدوياً بواسطة المستخدم ✍️</span>',
  '{t.prosConsManualSection || "Manually Added Pros & Cons ✍️"}',
  'Manual section label'
);

rep(
  '<span>إيجابيات اليوم (مدخلة يدوياً):</span>',
  '{t.prosConsManualPositives || "Today\'s Positives (manual):"}',
  'Manual positives label'
);

rep(
  '{userPositives.length} نقاط',
  `{userPositives.length} {t.prosConsPoints || "points"}`,
  'User positives count'
);

rep(
  '<span>سلبيات وتحديات اليوم (مدخلة يدوياً):</span>',
  '{t.prosConsManualNegatives || "Today\'s Challenges (manual):"}',
  'Manual negatives label'
);

rep(
  '{userNegatives.length} نقاط',
  `{userNegatives.length} {t.prosConsPoints || "points"}`,
  'User negatives count'
);

// Footer
rep(
  '<span>منصة حياة AI - تقرير الإيجابيات والسلبيات اليومية</span>',
  '{t.prosConsFooterBrand || "Hayat AI - Daily Pros & Cons Report"}',
  'Footer brand 1'
);

rep(
  '<span>سرية تامة وتشفير محلي 🌿</span>',
  '{t.prosConsFooterPrivacy || "Fully private & locally encrypted 🌿"}',
  'Footer privacy'
);

// Action buttons
rep(
  '<span>{copySuccess ? \'تم النسخ!\' : \'نسخ النص\'}</span>',
  '<span>{copySuccess ? (t.copied || "Copied!") : (t.copyText || "Copy Text")}</span>',
  'Copy button'
);

rep(
  '<span>طباعة / حفظ PDF</span>',
  '<span>{t.printSavePDF || "Print / Save PDF"}</span>',
  'Print PDF button'
);

rep(
  '<span>{isCapturingImage ? \'جاري الحفظ...\' : \'حفظ كصورة\'}</span>',
  '<span>{isCapturingImage ? (t.savingImage || "Saving...") : (t.saveAsImage || "Save as Image")}</span>',
  'Save image button'
);

rep(
  'إغلاق',
  '{t.close || "Close"}',
  'Close button'
);

rep(
  '<span>حفظ في سجل الإيجابيات والسلبيات 💾</span>',
  '<span>{t.saveToProsCons || "Save to Pros & Cons log 💾"}</span>',
  'Save to log button'
);

// Generate/regenerate AI
rep(
  '<span>تحليل شامل لجميع تفاصيل اليوم (مذكرات، عادات، مهام، CBT، أدوية، امتنان وقراءة):</span>',
  '<span>{t.prosConsAnalyzeAll || "Comprehensive analysis of all day details (diaries, habits, tasks, CBT, medications, gratitude & reading):"}</span>',
  'Analyze description'
);

rep(
  `<span>{isGeneratingAi ? 'جاري التحليل والترخيص...' : 'إعادة التوليد الشامل 🔄'}</span>`,
  `<span>{isGeneratingAi ? (t.analyzing || "Analyzing...") : (t.regenerateAll || "Regenerate All 🔄")}</span>`,
  'Generate AI button'
);

// Delete buttons
rep(
  'title="حذف هذه النقطة"\n                        aria-label="حذف هذه النقطة"',
  `title={t.deleteThisPoint || "Delete this point"}\n                        aria-label={t.deleteThisPoint || "Delete this point"}`,
  'Delete point button 1'
);

// Placeholders
rep(
  'placeholder="إضافة نقطة إيجابية أخرى..."',
  `placeholder={t.addPositivePoint || "Add another positive point..."}`,
  'AI positive placeholder'
);

rep(
  'placeholder="إضافة نقطة تحدي أو سلبيات أخرى..."',
  `placeholder={t.addNegativePoint || "Add another challenge or negative point..."}`,
  'AI negative placeholder'
);

rep(
  'placeholder="اكتب إيجابية عشتها اليوم واضغط إضافة..."',
  `placeholder={t.writePositiveToday || "Write a positive you experienced today and press add..."}`,
  'Manual positive placeholder'
);

rep(
  'placeholder="اكتب تحدياً أو موقفاً مزعجاً واضغط إضافة..."',
  `placeholder={t.writeNegativeToday || "Write a challenge or difficult situation and press add..."}`,
  'Manual negative placeholder'
);

// Add buttons
rep(
  '+ إدخال\n',
  `+ {t.enter || "Enter"}\n`,
  'Enter button 1'
);

rep(
  '+ إضافة\n',
  `+ {t.add || "Add"}\n`,
  'Add button'
);

// Toast messages
rep(
  `showToast('جاري إنشاء التقرير كصورة مطابقة للموقع تماماً... 📸')`,
  `showToast(t.generatingImageToast || 'Generating image report...')`,
  'Generating image toast'
);

rep(
  `showToast('تم حفظ الصورة في ملفات جهازك مطابقة تماماً للموقع! 🖼️')`,
  `showToast(t.imageSavedToast || 'Image saved to your device! 🖼️')`,
  'Image saved toast'
);

rep(
  `showToast('حدث خطأ أثناء حفظ الصورة، يرجى إعادة المحاولة')`,
  `showToast(t.imageSaveError || 'Error saving image, please try again')`,
  'Image save error toast'
);

// File name
rep(
  "const fileName = `تقرير_الإيجابيات_والسلبيات_${dayKey}.png`;",
  "const fileName = `pros_cons_report_${dayKey}.png`;",
  'File name Arabic'
);

// =========================================================
// Print HTML template (inside generatePrintableReport)
// =========================================================

// Print template title
rep(
  '<span>تقرير الإيجابيات والسلبيات اليومية</span>',
  `<span>${'${t.prosConsReportTitle || "Daily Pros & Cons Report"}'}</span>`,
  'Print template title'
);

rep(
  `<span class="badge-tag">توليد ذكي + يدوي</span>`,
  `<span class="badge-tag">${'${t.prosConsAiManual || "AI + Manual"}'}</span>`,
  'Print badge'
);

rep(
  `<div class="section-title">أولاً: الإيجابيات والسلبيات المولدة بالذكاء الاصطناعي 🧠</div>`,
  `<div class="section-title">${'${t.prosConsAiSection || "AI-Generated Pros & Cons 🧠"}'}</div>`,
  'Print AI section title'
);

rep(
  `<div class="section-subtitle">مستخلصة تلقائياً من المذكرات</div>`,
  `<div class="section-subtitle">${'${t.prosConsAiSubtitle || "Auto-extracted from all app sections"}'}</div>`,
  'Print AI subtitle'
);

rep(
  `<span>🟢 الإيجابيات المولدة بالذكاء الاصطناعي (يمين):</span>`,
  `<span>${'${t.prosConsAiPositives || "🟢 AI-Generated Positives:"}'}</span>`,
  'Print AI positives label'
);

rep(
  `<span class="count-badge">${'${aiPositives.length}'} نقاط</span>`,
  `<span class="count-badge">${'${aiPositives.length}'} ${'${t.prosConsPoints || "points"}'}</span>`,
  'Print AI positives count'
);

rep(
  `<span>🔴 السلبيات والتحديات المولدة بالذكاء الاصطناعي (يسار):</span>`,
  `<span>${'${t.prosConsAiNegatives || "🔴 AI-Generated Challenges:"}'}</span>`,
  'Print AI negatives label'
);

rep(
  `<span class="count-badge">${'${aiNegatives.length}'} نقاط</span>`,
  `<span class="count-badge">${'${aiNegatives.length}'} ${'${t.prosConsPoints || "points"}'}</span>`,
  'Print AI negatives count'
);

rep(
  `<div class="section-title">ثانياً: الإيجابيات والسلبيات المدخلة يدوياً بواسطة المستخدم ✍️</div>`,
  `<div class="section-title">${'${t.prosConsManualSection || "Manually Added ✍️"}'}</div>`,
  'Print manual section title'
);

rep(
  `<div class="section-subtitle">إدخال واسترسال شخصي</div>`,
  `<div class="section-subtitle">${'${t.prosConsManualSubtitle || "Personal input & reflection"}'}</div>`,
  'Print manual subtitle'
);

rep(
  `<span>إيجابيات اليوم (مدخلة يدوياً):</span>`,
  `<span>${'${t.prosConsManualPositives || "Today\'s Positives (manual):"}'}</span>`,
  'Print manual positives label'
);

rep(
  `<span class="count-badge">${'${userPositives.length}'} نقاط</span>`,
  `<span class="count-badge">${'${userPositives.length}'} ${'${t.prosConsPoints || "points"}'}</span>`,
  'Print manual positives count'
);

rep(
  `<span>سلبيات وتحديات اليوم (مدخلة يدوياً):</span>`,
  `<span>${'${t.prosConsManualNegatives || "Today\'s Challenges (manual):"}'}</span>`,
  'Print manual negatives label'
);

rep(
  `<span class="count-badge">${'${userNegatives.length}'} نقاط</span>`,
  `<span class="count-badge">${'${userNegatives.length}'} ${'${t.prosConsPoints || "points"}'}</span>`,
  'Print manual negatives count'
);

rep(
  `<span>منصة حياة AI - تقرير الإيجابيات والسلبيات اليومية</span>`,
  `<span>${'${t.prosConsFooterBrand || "Hayat AI - Daily Pros & Cons Report"}'}</span>`,
  'Print footer brand'
);

rep(
  `<span>سرية تامة وتشفير محلي 🌿</span>`,
  `<span>${'${t.prosConsFooterPrivacy || "Fully private & locally encrypted 🌿"}'}</span>`,
  'Print footer privacy'
);

// Empty state messages in print template
rep(
  `'<div class="empty-msg">لا توجد نقاط إيجابية مسجلة لليوم</div>'`,
  `\`<div class="empty-msg">\${t.prosConsNoPositives || "No positive points recorded today"}</div>\``,
  'Print no positives empty'
);

rep(
  `'<div class="empty-msg">لا توجد سلبيات مسجلة لليوم</div>'`,
  `\`<div class="empty-msg">\${t.prosConsNoNegatives || "No negative points recorded today"}</div>\``,
  'Print no negatives empty'
);

rep(
  `'<div class="empty-msg">لم يتم إدخال نقاط خاصة</div>'`,
  `\`<div class="empty-msg">\${t.prosConsNoManualPoints || "No personal points entered"}</div>\``,
  'Print no manual points empty'
);

// Image capture empty states (style inline)
const inlineEmptyAr = `'<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;">لا ت`;
if (content.includes(inlineEmptyAr)) {
  // These are more complex - just replace the Arabic portions
  content = content.replace(
    /'\<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;"\>لا توجد نقاط إيجابية\<\/div\>'/g,
    '`<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;">${t.prosConsNoPositives || "No positive points"}</div>`'
  );
  content = content.replace(
    /'\<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;"\>لا توجد سلبيات\<\/div\>'/g,
    '`<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;">${t.prosConsNoNegatives || "No negatives"}</div>`'
  );
  content = content.replace(
    /'\<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;"\>لم يتم الإدخال\<\/div\>'/g,
    '`<div style="font-size: 12px; color: #A0AEC0; text-align: center; padding: 12px;">${t.prosConsNoManualPoints || "Not entered"}</div>`'
  );
}

// Image capture template labels (different from print)
content = content.replace(
  /\>أولاً: الإيجابيات والسلبيات المولدة بالذكاء الاصطناعي 🧠\</g,
  '>${t.prosConsAiSection || "AI-Generated Pros & Cons 🧠"}<'
);
content = content.replace(
  /\>مستخلصة تلقائياً من المذكرات\</g,
  '>${t.prosConsAiSubtitle || "Auto-extracted from diaries"}<'
);
content = content.replace(
  /\>🟢 الإيجابيات المولدة بالذكاء الاصطناعي \(يمين\):\</g,
  '>${t.prosConsAiPositives || "🟢 AI Positives:"}<'
);
content = content.replace(
  /\>🔴 السلبيات والتحديات المولدة بالذكاء الاصطناعي \(يسار\):\</g,
  '>${t.prosConsAiNegatives || "🔴 AI Challenges:"}<'
);
content = content.replace(
  /\>ثانياً: الإيجابيات والسلبيات المدخلة يدوياً بواسطة المستخدم ✍️\</g,
  '>${t.prosConsManualSection || "Manually Added ✍️"}<'
);
content = content.replace(
  /\>إدخال واسترسال شخصي\</g,
  '>${t.prosConsManualSubtitle || "Personal input"}<'
);
content = content.replace(
  /\>إيجابيات اليوم \(مدخلة يدوياً\):\</g,
  '>${t.prosConsManualPositives || "Today\'s Positives:"}<'
);
content = content.replace(
  /\>سلبيات وتحديات اليوم \(مدخلة يدوياً\):\</g,
  '>${t.prosConsManualNegatives || "Today\'s Challenges:"}<'
);
content = content.replace(
  /\>منصة حياة AI - تقرير الإيجابيات والسلبيات اليومية\</g,
  '>${t.prosConsFooterBrand || "Hayat AI - Daily Pros & Cons Report"}<'
);
content = content.replace(
  /\>سرية تامة وتشفير محلي 🌿\</g,
  '>${t.prosConsFooterPrivacy || "Fully private 🌿"}<'
);

// count badges in image template
content = content.replace(
  /\$\{aiPositives\.length\} نقاط/g,
  `\${aiPositives.length} \${t.prosConsPoints || "pts"}`
);
content = content.replace(
  /\$\{aiNegatives\.length\} نقاط/g,
  `\${aiNegatives.length} \${t.prosConsPoints || "pts"}`
);
content = content.replace(
  /\$\{userPositives\.length\} نقاط/g,
  `\${userPositives.length} \${t.prosConsPoints || "pts"}`
);
content = content.replace(
  /\$\{userNegatives\.length\} نقاط/g,
  `\${userNegatives.length} \${t.prosConsPoints || "pts"}`
);

// تقرير الإيجابيات والسلبيات اليومية in template literals
content = content.replace(
  /تقرير الإيجابيات والسلبيات اليومية/g,
  `\${t.prosConsReportTitle || "Daily Pros & Cons Report"}`
);

// توليد ذكي + يدوي in template
content = content.replace(
  /توليد ذكي \+ يدوي/g,
  `\${t.prosConsAiManual || "AI + Manual"}`
);

// Fallback analysis Arabic positives/negatives
content = content.replace(
  /'توثيق مشاعر إيجابية وإنجازات شخصية مثمرة\.'/g,
  `t.prosConsFallbackPositive || 'Documented positive feelings and personal achievements.'`
);
content = content.replace(
  /'مواجهة بعض الضغوط النفسية أو الأعراض الجسدية المجهدة\.'/g,
  `t.prosConsFallbackNegative || 'Faced some psychological pressures or physical stress symptoms.'`
);
content = content.replace(
  /'الالتزام بالتدوين ومتابعة الأنشطة بوعي\.'/g,
  `t.prosConsFallbackCommitment || 'Commitment to journaling and mindful activity tracking.'`
);
content = content.replace(
  /'تحديات وقتية بسيطة تم توثيقها للتعلم منها\.'/g,
  `t.prosConsFallbackChallenges || 'Temporary simple challenges documented for learning.'`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log(`\n✅ DailyProsConsModal.tsx: ${changes} explicit replacements + regex replacements applied`);
