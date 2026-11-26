const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'lib', 'languages.ts');
const content = fs.readFileSync(targetPath, 'utf8');

const keysToAdd = {
  voiceVentReviewTitle: {
    ar: 'مراجعة وتأكيد الفضفضة الصوتية',
    en: 'Review & Confirm Voice Vent',
    fr: 'Examiner et confirmer le message vocal',
    de: 'Sprachnachricht überprüfen und bestätigen',
    es: 'Revisar y confirmar desahogo de voz',
    it: 'Rivedi e conferma lo sfogo vocale',
    tr: 'Sesli İç Dökümünü İncele ve Onayla',
    pt: 'Revisar e confirmar desabafo de voz',
    ru: 'Просмотр и подтверждение голосовой записи',
    ja: '音声ベントの確認と確定',
    zh: '审阅并确认语音倾诉',
    hi: 'वॉयस वेंट की समीक्षा और पुष्टि करें'
  },
  voiceVentSavedSuccess: {
    ar: 'تم حفظ التسجيل والمرفق الصوتي بنجاح 🎉',
    en: 'Audio recording and attachment saved successfully 🎉',
    fr: 'Enregistrement audio et pièce jointe enregistrés avec succès 🎉',
    de: 'Audioaufnahme und Anhang erfolgreich gespeichert 🎉',
    es: 'Grabación de audio y adjunto guardados con éxito 🎉',
    it: 'Registrazione audio e allegato salvati con successo 🎉',
    tr: 'Ses kaydı ve eki başarıyla kaydedildi 🎉',
    pt: 'Gravação de áudio e anexo salvos com sucesso 🎉',
    ru: 'Аудиозапись и вложение успешно сохранены 🎉',
    ja: '音声録音と添付ファイルが正常に保存されました 🎉',
    zh: '录音和附件已成功保存 🎉',
    hi: 'ऑडियो रिकॉर्डिंग और अनुलग्नक सफलतापूर्वक सहेजा गया 🎉'
  },
  voiceVentAddToDiaryBtn: {
    ar: 'إضافة إلى اليوميات',
    en: 'Add to Diary',
    fr: 'Ajouter au journal',
    de: 'Zum Tagebuch hinzufügen',
    es: 'Agregar al diario',
    it: 'Aggiungi al diario',
    tr: 'Günlüğe Ekle',
    pt: 'Adicionar ao diário',
    ru: 'Добавить в дневник',
    ja: '日記に追加',
    zh: '添加到日记',
    hi: 'डायरी में जोड़ें'
  },
  voiceVentKeepAudioOnlyBtn: {
    ar: 'حفظ كمرفق صوتي فقط / إغلاق',
    en: 'Keep as Audio Only / Close',
    fr: 'Conserver en audio uniquement / Fermer',
    de: 'Nur als Audio behalten / Schließen',
    es: 'Guardar solo como audio / Cerrar',
    it: 'Mantieni solo come audio / Chiudi',
    tr: 'Yalnızca Ses Olarak Tut / Kapat',
    pt: 'Manter apenas como áudio / Fechar',
    ru: 'Сохранить только как аудио / Закрыть',
    ja: '音声のみとして保持 / 閉じる',
    zh: '仅保留为音频 / 关闭',
    hi: 'केवल ऑडियो के रूप में रखें / बंद करें'
  },
  voiceVentSaveAndAnalyzeBtn: {
    ar: 'حفظ المرفق الصوتي',
    en: 'Save Audio Attachment',
    fr: 'Enregistrer la pièce jointe audio',
    de: 'Audioanhang speichern',
    es: 'Guardar archivo de audio adjunto',
    it: 'Salva allegato audio',
    tr: 'Ses Ekini Kaydet',
    pt: 'Salvar anexo de áudio',
    ru: 'Сохранить аудиовложение',
    ja: '音声添付ファイルを保存',
    zh: '保存音频附件',
    hi: 'ऑडियो अनुलग्नक सहेजें'
  },
  voiceVentDiscardBtn: {
    ar: 'تجاهل وإعادة التسجيل',
    en: 'Discard & Re-record',
    fr: 'Supprimer et réenregistrer',
    de: 'Verwerfen und neu aufnehmen',
    es: 'Descartar y volver a grabar',
    it: 'Elimina e registra di nuovo',
    tr: 'At ve Yeniden Kaydet',
    pt: 'Descartar e gravar novamente',
    ru: 'Удалить и записать заново',
    ja: '破棄して再録音',
    zh: '放弃并重新录制',
    hi: 'त्यागें और फिर से रिकॉर्ड करें'
  },
  voiceVentToneAnalysisTitle: {
    ar: 'تحليل نبرة الصوت والمشاعر (Gemini AI):',
    en: 'Vocal Tone & Emotion Analysis (Gemini AI):',
    fr: 'Analyse du ton vocal et des émotions (Gemini AI) :',
    de: 'Tonfall- und Emotionsanalyse (Gemini AI):',
    es: 'Análisis de tono vocal y emociones (Gemini AI):',
    it: 'Analisi del tono vocale e delle emozioni (Gemini AI):',
    tr: 'Ses Tonu ve Duygu Analizi (Gemini AI):',
    pt: 'Análise de tom vocal e emoções (Gemini AI):',
    ru: 'Анализ тона голоса и эмоций (Gemini AI):',
    ja: '声のトーンと感情の分析 (Gemini AI):',
    zh: '声音语调与情感分析 (Gemini AI)：',
    hi: 'स्वर टोन और भावना विश्लेषण (Gemini AI):'
  },
  voiceVentPostSaveNotice: {
    ar: 'تم حفظ التسجيل في المرفقات الصوتية بأمان. اختر كيف تود المتابعة:',
    en: 'The recording has been safely saved in audio attachments. Choose how to proceed:',
    fr: 'L enregistrement a été sauvegardé en toute sécurité dans les pièces jointes audio. Choisissez comment continuer :',
    de: 'Die Aufnahme wurde sicher in den Audioanhängen gespeichert. Wählen Sie das weitere Vorgehen:',
    es: 'La grabación se ha guardado de forma segura en los archivos de audio adjuntos. Elija cómo proceder:',
    it: 'La registrazione è stata salvata in sicurezza negli allegati audio. Scegli come procedere:',
    tr: 'Kayıt, ses eklerinde güvenle saklandı. Nasıl devam edeceğinizi seçin:',
    pt: 'A gravação foi salva com segurança nos anexos de áudio. Escolha como prosseguir:',
    ru: 'Запись надежно сохранена в аудиовложениях. Выберите дальнейшее действие:',
    ja: '録音は音声添付ファイルに安全に保存されました。続行する方法を選択してください：',
    zh: '录音已安全保存在音频附件中。请选择接下来的操作：',
    hi: 'रिकॉर्डिंग को ऑडियो अनुलग्नकों में सुरक्षित रूप से सहेजा गया है। चुनें कि आप कैसे आगे बढ़ना चाहते हैं:'
  }
};

const dictKeys = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];

let updated = content;

dictKeys.forEach((lang) => {
  const dictName = lang.toUpperCase() + '_DICT';
  const targetPattern = 'export const ' + dictName + ': Record<string, any> = {\n';
  const idx = updated.indexOf(targetPattern);
  if (idx === -1) {
    console.error('Could not find ' + targetPattern);
    return;
  }

  let insertion = '';
  for (const [k, vObj] of Object.entries(keysToAdd)) {
    const val = vObj[lang].replace(/"/g, '\\"');
    insertion += '  ' + k + ': "' + val + '",\n';
  }

  const insertPos = idx + targetPattern.length;
  updated = updated.slice(0, insertPos) + insertion + updated.slice(insertPos);
});

fs.writeFileSync(targetPath, updated, 'utf8');
console.log('Successfully injected keys across all 12 dictionaries!');
