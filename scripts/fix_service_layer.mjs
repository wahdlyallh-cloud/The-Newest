import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';

// Load existing dictionaries
const result = esbuild.buildSync({
  entryPoints: ['./src/lib/languages.ts'],
  bundle: true,
  write: false,
  format: 'cjs',
  target: 'node20',
  external: ['react', 'react-dom']
});
const code = result.outputFiles[0].text;
const mod = { exports: {} };
const fn = new Function('module', 'exports', 'require', code);
fn(mod, mod.exports, () => ({ createContext: () => ({}), useContext: () => ({}), useState: () => [] }));
const BASELINE = mod.exports.BASELINE_DICTIONARIES;
const languages = ['ar', 'en', 'fr', 'de', 'es', 'it', 'tr', 'pt', 'ru', 'ja', 'zh', 'hi'];
const dicts = {};
languages.forEach(l => { dicts[l] = { ...(BASELINE[l] || {}) }; });

// ========================
// NEW TRANSLATION KEYS
// ========================
const NEW_KEYS = {
  settingEnabled: { ar: 'تم التفعيل', en: 'Enabled', fr: 'Activé', de: 'Aktiviert', es: 'Activado', it: 'Attivato', tr: 'Etkinleştirildi', pt: 'Ativado', ru: 'Включено', ja: '有効化', zh: '已启用', hi: 'सक्षम' },
  settingDisabled: { ar: 'تم التعطيل', en: 'Disabled', fr: 'Désactivé', de: 'Deaktiviert', es: 'Desactivado', it: 'Disattivato', tr: 'Devre Dışı', pt: 'Desativado', ru: 'Отключено', ja: '無効化', zh: '已禁用', hi: 'अक्षम' },
  exportJsonSuccess: { ar: 'تم تصدير النسخة الاحتياطية JSON بنجاح! 📥', en: 'JSON backup exported successfully! 📥', fr: 'Sauvegarde JSON exportée avec succès ! 📥', de: 'JSON-Sicherung erfolgreich exportiert! 📥', es: '¡Copia de seguridad JSON exportada con éxito! 📥', it: 'Backup JSON esportato con successo! 📥', tr: 'JSON yedeği başarıyla dışa aktarıldı! 📥', pt: 'Backup JSON exportado com sucesso! 📥', ru: 'JSON-резервная копия успешно экспортирована! 📥', ja: 'JSONバックアップが正常にエクスポートされました！📥', zh: 'JSON备份导出成功！📥', hi: 'JSON बैकअप सफलतापूर्वक निर्यात! 📥' },
  exportCsvSuccess: { ar: 'تم تصدير بيانات CSV بنجاح! 📊', en: 'CSV data exported successfully! 📊', fr: 'Données CSV exportées avec succès ! 📊', de: 'CSV-Daten erfolgreich exportiert! 📊', es: '¡Datos CSV exportados con éxito! 📊', it: 'Dati CSV esportati con successo! 📊', tr: 'CSV verileri başarıyla dışa aktarıldı! 📊', pt: 'Dados CSV exportados com sucesso! 📊', ru: 'Данные CSV успешно экспортированы! 📊', ja: 'CSVデータが正常にエクスポートされました！📊', zh: 'CSV数据导出成功！📊', hi: 'CSV डेटा सफलतापूर्वक निर्यात! 📊' },
  importBackupSuccess: { ar: 'تم استيراد النسخة الاحتياطية بنجاح! 🎉', en: 'Backup imported successfully! 🎉', fr: 'Sauvegarde importée avec succès ! 🎉', de: 'Sicherung erfolgreich importiert! 🎉', es: '¡Copia de seguridad importada con éxito! 🎉', it: 'Backup importato con successo! 🎉', tr: 'Yedek başarıyla içe aktarıldı! 🎉', pt: 'Backup importado com sucesso! 🎉', ru: 'Резервная копия успешно импортирована! 🎉', ja: 'バックアップが正常にインポートされました！🎉', zh: '备份导入成功！🎉', hi: 'बैकअप सफलतापूर्वक आयात! 🎉' },
  importCsvSuccess: { ar: 'تم قراءة ملف CSV بنجاح! 📄', en: 'CSV file read successfully! 📄', fr: 'Fichier CSV lu avec succès ! 📄', de: 'CSV-Datei erfolgreich gelesen! 📄', es: '¡Archivo CSV leído con éxito! 📄', it: 'File CSV letto con successo! 📄', tr: 'CSV dosyası başarıyla okundu! 📄', pt: 'Arquivo CSV lido com sucesso! 📄', ru: 'CSV-файл успешно прочитан! 📄', ja: 'CSVファイルが正常に読み込まれました！📄', zh: 'CSV文件读取成功！📄', hi: 'CSV फ़ाइल सफलतापूर्वक पढ़ी! 📄' },
  importFormatError: { ar: 'صيغة الملف غير مدعومة. يرجى استخدام JSON أو CSV.', en: 'Unsupported file format. Please use JSON or CSV.', fr: 'Format de fichier non pris en charge. Utilisez JSON ou CSV.', de: 'Dateiformat nicht unterstützt. Bitte JSON oder CSV verwenden.', es: 'Formato de archivo no soportado. Use JSON o CSV.', it: 'Formato file non supportato. Usare JSON o CSV.', tr: 'Desteklenmeyen dosya formatı. JSON veya CSV kullanın.', pt: 'Formato de arquivo não suportado. Use JSON ou CSV.', ru: 'Неподдерживаемый формат файла. Используйте JSON или CSV.', ja: 'サポートされていないファイル形式です。JSONまたはCSVを使用してください。', zh: '不支持的文件格式，请使用JSON或CSV。', hi: 'असमर्थित फ़ाइल प्रारूप. JSON या CSV का उपयोग करें।' },
  importParseError: { ar: 'تعذر قراءة الملف. تحقق من صيغته.', en: 'Could not read file. Check its format.', fr: 'Impossible de lire le fichier. Vérifiez le format.', de: 'Datei konnte nicht gelesen werden. Format prüfen.', es: 'No se pudo leer el archivo. Verifique el formato.', it: 'Impossibile leggere il file. Controlla il formato.', tr: 'Dosya okunamadı. Formatı kontrol edin.', pt: 'Não foi possível ler o arquivo. Verifique o formato.', ru: 'Не удалось прочитать файл. Проверьте формат.', ja: 'ファイルを読み込めませんでした。形式を確認してください。', zh: '无法读取文件，请检查格式。', hi: 'फ़ाइल पढ़ने में विफल. प्रारूप जांचें।' },
  apiKeyMaxLimitAlert: { ar: 'الحد الأقصى لمفاتيح API هو 5 مفاتيح فقط.', en: 'Maximum of 5 API keys allowed.', fr: 'Maximum de 5 clés API autorisées.', de: 'Maximal 5 API-Schlüssel erlaubt.', es: 'Máximo de 5 claves API permitidas.', it: 'Massimo 5 chiavi API consentite.', tr: 'Maksimum 5 API anahtarına izin verilir.', pt: 'Máximo de 5 chaves API permitidas.', ru: 'Максимальное количество API-ключей: 5.', ja: 'APIキーは最大5個までです。', zh: '最多允许5个API密钥。', hi: 'अधिकतम 5 API कुंजियाँ अनुमत हैं।' },
  mainApiKeyLabel: { ar: 'المفتاح الرئيسي', en: 'Primary Key', fr: 'Clé principale', de: 'Hauptschlüssel', es: 'Clave principal', it: 'Chiave principale', tr: 'Birincil Anahtar', pt: 'Chave principal', ru: 'Основной ключ', ja: 'プライマリキー', zh: '主密钥', hi: 'प्राथमिक कुंजी' },
  apiKeyLabel: { ar: 'المفتاح', en: 'Key', fr: 'Clé', de: 'Schlüssel', es: 'Clave', it: 'Chiave', tr: 'Anahtar', pt: 'Chave', ru: 'Ключ', ja: 'キー', zh: '密钥', hi: 'कुंजी' },
  apiKeyTestSuccess: { ar: 'المفتاح يعمل بنجاح والاتصال مستقر 🟢', en: 'API key works and connection is stable 🟢', fr: 'La clé API fonctionne et la connexion est stable 🟢', de: 'API-Schlüssel funktioniert, Verbindung stabil 🟢', es: 'La clave API funciona y la conexión es estable 🟢', it: 'La chiave API funziona e la connessione è stabile 🟢', tr: 'API anahtarı çalışıyor ve bağlantı kararlı 🟢', pt: 'Chave API funcionando e conexão estável 🟢', ru: 'Ключ API работает, соединение стабильно 🟢', ja: 'APIキーが機能し、接続は安定しています 🟢', zh: 'API密钥有效，连接稳定 🟢', hi: 'API कुंजी काम कर रही है और कनेक्शन स्थिर है 🟢' },
  apiKeyTestInvalid: { ar: 'مفتاح API غير صالح أو غير مكتوب بشكل صحيح 🔴', en: 'Invalid or incorrectly entered API key 🔴', fr: 'Clé API invalide ou incorrectement saisie 🔴', de: 'Ungültiger oder falsch eingegebener API-Schlüssel 🔴', es: 'Clave API inválida o incorrectamente ingresada 🔴', it: 'Chiave API non valida o inserita in modo errato 🔴', tr: 'Geçersiz veya yanlış girilmiş API anahtarı 🔴', pt: 'Chave API inválida ou inserida incorretamente 🔴', ru: 'Недействительный или неверно введённый ключ API 🔴', ja: '無効または正しく入力されていないAPIキー 🔴', zh: 'API密钥无效或输入错误 🔴', hi: 'अमान्य या गलत तरीके से दर्ज की गई API कुंजी 🔴' },
  apiKeyTestQuota: { ar: 'تم تجاوز حد الحصة المتاحة للمفتاح (Quota Exhausted) 🟡', en: 'API key quota exhausted 🟡', fr: 'Quota de clé API épuisé 🟡', de: 'API-Schlüssel-Kontingent erschöpft 🟡', es: 'Cuota de clave API agotada 🟡', it: 'Quota chiave API esaurita 🟡', tr: 'API anahtarı kotası tükendi 🟡', pt: 'Cota da chave API esgotada 🟡', ru: 'Квота ключа API исчерпана 🟡', ja: 'APIキーのクォータが消耗されました 🟡', zh: 'API密钥配额已用尽 🟡', hi: 'API कुंजी कोटा समाप्त 🟡' },
  apiKeyEmpty: { ar: 'مفتاح API فارغ.', en: 'API key is empty.', fr: 'La clé API est vide.', de: 'API-Schlüssel ist leer.', es: 'La clave API está vacía.', it: 'La chiave API è vuota.', tr: 'API anahtarı boş.', pt: 'A chave API está vazia.', ru: 'Ключ API пуст.', ja: 'APIキーが空です。', zh: 'API密钥为空。', hi: 'API कुंजी खाली है।' },
  biometricFailed: { ar: 'فشلت قراءة البصمة من النظام المحمول', en: 'Biometric reading failed on mobile system', fr: 'Échec de la lecture biométrique sur mobile', de: 'Biometrische Erfassung auf Mobilgerät fehlgeschlagen', es: 'Error al leer biometría en dispositivo móvil', it: 'Lettura biometrica fallita su mobile', tr: 'Mobil sistemde biyometrik okuma başarısız', pt: 'Leitura biométrica falhou no dispositivo móvel', ru: 'Ошибка биометрии на мобильном устройстве', ja: 'モバイルデバイスでの生体認証読み取りに失敗', zh: '移动设备生物识别读取失败', hi: 'मोबाइल पर बायोमेट्रिक रीड विफल' },
  biometricNotSupported: { ar: 'البيئة الحالية لا تدعم البصمة', en: 'Current environment does not support biometrics', fr: 'L\'environnement actuel ne prend pas en charge la biométrie', de: 'Aktuelle Umgebung unterstützt keine Biometrie', es: 'El entorno actual no admite biometría', it: 'L\'ambiente attuale non supporta la biometria', tr: 'Mevcut ortam biyometriyi desteklemiyor', pt: 'Ambiente atual não suporta biometria', ru: 'Текущая среда не поддерживает биометрию', ja: '現在の環境は生体認証をサポートしていません', zh: '当前环境不支持生物识别', hi: 'वर्तमान वातावरण बायोमेट्रिक्स का समर्थन नहीं करता' },
  biometricPermissionDenied: { ar: 'تم رفض إذن البصمة أو البيئة المضمنة غير مسموحة', en: 'Biometric permission denied or embedded environment not allowed', fr: 'Permission biométrique refusée ou environnement intégré non autorisé', de: 'Biometrie-Berechtigung abgelehnt oder eingebettete Umgebung nicht erlaubt', es: 'Permiso biométrico denegado o entorno integrado no permitido', it: 'Autorizzazione biometrica negata o ambiente integrato non consentito', tr: 'Biyometri izni reddedildi veya gömülü ortama izin verilmedi', pt: 'Permissão biométrica negada ou ambiente integrado não permitido', ru: 'Разрешение на биометрию отклонено или встроенная среда не разрешена', ja: '生体認証の許可が拒否されたか、組み込み環境が許可されていません', zh: '生物识别权限被拒绝或嵌入式环境不被允许', hi: 'बायोमेट्रिक अनुमति अस्वीकृत या एम्बेडेड वातावरण अनुमत नहीं' },
  speechNotSupported: { ar: 'المتصفح لا يدعم ميزة التعرف التلقائي على الصوت.', en: 'This browser does not support speech recognition.', fr: 'Ce navigateur ne prend pas en charge la reconnaissance vocale.', de: 'Dieser Browser unterstützt keine Spracherkennung.', es: 'Este navegador no admite reconocimiento de voz.', it: 'Questo browser non supporta il riconoscimento vocale.', tr: 'Bu tarayıcı konuşma tanımayı desteklemiyor.', pt: 'Este navegador não suporta reconhecimento de voz.', ru: 'Этот браузер не поддерживает распознавание речи.', ja: 'このブラウザは音声認識をサポートしていません。', zh: '此浏览器不支持语音识别。', hi: 'यह ब्राउज़र वाक् पहचान का समर्थन नहीं करता।' },
  aiQuotaExceeded: { ar: 'لقد تجاوزت حد الاستخدام اليومي المجاني', en: 'You have exceeded the free daily usage limit', fr: 'Vous avez dépassé la limite d\'utilisation quotidienne gratuite', de: 'Sie haben das kostenlose Tageslimit überschritten', es: 'Ha superado el límite de uso diario gratuito', it: 'Hai superato il limite di utilizzo giornaliero gratuito', tr: 'Günlük ücretsiz kullanım limitini aştınız', pt: 'Você excedeu o limite de uso diário gratuito', ru: 'Вы превысили бесплатный дневной лимит использования', ja: '無料の一日利用制限を超えました', zh: '您已超过每日免费使用限额', hi: 'आपने मुफ़्त दैनिक उपयोग सीमा पार कर ली है' },
  aiCheckApiKey: { ar: 'يرجى التحقق من مفتاح API في الإعدادات', en: 'Please check your API key in Settings', fr: 'Veuillez vérifier votre clé API dans les Paramètres', de: 'Bitte überprüfen Sie Ihren API-Schlüssel in den Einstellungen', es: 'Por favor, verifique su clave API en Configuración', it: 'Verifica la tua chiave API nelle Impostazioni', tr: 'Lütfen Ayarlar\'dan API anahtarınızı kontrol edin', pt: 'Por favor, verifique sua chave API nas Configurações', ru: 'Пожалуйста, проверьте ключ API в Настройках', ja: '設定でAPIキーを確認してください', zh: '请在设置中检查您的API密钥', hi: 'कृपया सेटिंग्स में अपनी API कुंजी जांचें' },
  aiEmptyResponse: { ar: 'استجابة فارغة من خادم الذكاء الاصطناعي', en: 'Empty response from AI server', fr: 'Réponse vide du serveur IA', de: 'Leere Antwort vom KI-Server', es: 'Respuesta vacía del servidor IA', it: 'Risposta vuota dal server IA', tr: 'Yapay zeka sunucusundan boş yanıt', pt: 'Resposta vazia do servidor de IA', ru: 'Пустой ответ от сервера ИИ', ja: 'AIサーバーから空の応答', zh: 'AI服务器返回空响应', hi: 'AI सर्वर से खाली प्रतिक्रिया' },
  morningAthkarLabel: { ar: 'أذكار الصباح', en: 'Morning Remembrance', fr: 'Invocations du matin', de: 'Morgengedenken', es: 'Recuerdos matutinos', it: 'Invocazioni del mattino', tr: 'Sabah Zikirleri', pt: 'Orações matinais', ru: 'Утренние поминания', ja: '朝の祈り', zh: '晨间祈念', hi: 'सुबह की दुआ' },
  eveningAthkarLabel: { ar: 'أذكار المساء', en: 'Evening Remembrance', fr: 'Invocations du soir', de: 'Abendgedenken', es: 'Recuerdos vespertinos', it: 'Invocazioni della sera', tr: 'Akşam Zikirleri', pt: 'Orações vespertinas', ru: 'Вечерние поминания', ja: '夕べの祈り', zh: '晚间祈念', hi: 'शाम की दुआ' },
  generalDhikrLabel: { ar: 'السبحة العامة', en: 'General Dhikr Counter', fr: 'Compteur de dhikr général', de: 'Allgemeiner Dhikr-Zähler', es: 'Contador de dhikr general', it: 'Contatore dhikr generale', tr: 'Genel Zikir Sayacı', pt: 'Contador de dhikr geral', ru: 'Общий счётчик зикра', ja: '一般的なズィクルカウンター', zh: '通用念珠计数器', hi: 'सामान्य जिक्र काउंटर' }
};

for (const [key, trans] of Object.entries(NEW_KEYS)) {
  languages.forEach(l => { dicts[l][key] = trans[l] || trans.en; });
}

// ========================
// FIX FILES
// ========================

// 1. Fix HabitSettingsScreen.tsx
let hss = fs.readFileSync('./src/components/HabitSettingsScreen.tsx', 'utf-8');
hss = hss.replace(
  'showToast(newValue ? `تم تفعيل: ${label}` : `تم تعطيل: ${label}`);',
  'showToast(newValue ? `${t.settingEnabled || "Enabled"}: ${label}` : `${t.settingDisabled || "Disabled"}: ${label}`);'
);
hss = hss.replace("showToast('تم تصدير النسخة الاحتياطية JSON بنجاح! 📥');", "showToast(t.exportJsonSuccess || 'JSON backup exported successfully! 📥');");
hss = hss.replace("showToast('تم تصدير بيانات CSV بنجاح! 📊');", "showToast(t.exportCsvSuccess || 'CSV data exported successfully! 📊');");
hss = hss.replace("showToast('تم استيراد النسخة الاحتياطية بنجاح! 🎉');", "showToast(t.importBackupSuccess || 'Backup imported successfully! 🎉');");
hss = hss.replace("showToast('تم قراءة ملف CSV بنجاح! 📄');", "showToast(t.importCsvSuccess || 'CSV file read successfully! 📄');");
fs.writeFileSync('./src/components/HabitSettingsScreen.tsx', hss, 'utf-8');
console.log('✅ Fixed HabitSettingsScreen.tsx');

// 2. Fix GeminiKeyModal.tsx
let gkm = fs.readFileSync('./src/components/GeminiKeyModal.tsx', 'utf-8');
// Check if it has t available
if (!gkm.includes('const t = getTranslation')) {
  gkm = gkm.replace("import { getLanguageInfo", "import { getLanguageInfo, getTranslation");
  // Find the component function start and add t
  gkm = gkm.replace(/(\}: \w+Props\) =>[\s\S]{0,100})(const \w+ = getLanguageInfo)/, '$1const t = getTranslation(appLanguage);\n  $2');
}
gkm = gkm.replace("alert('الحد الأقصى لمفتايح API هو 5 مفاتيح فقط.');", "alert(t.apiKeyMaxLimitAlert || 'Maximum of 5 API keys allowed.');");
gkm = gkm.replace("name: 'المفتاح الرئيسي',", "name: t.mainApiKeyLabel || 'Primary Key',");
gkm = gkm.replace(/name: newKeyName\.trim\(\) \|\| `المفتاح \${keysList\.length \+ 1}`/, "name: newKeyName.trim() || `${t.apiKeyLabel || 'Key'} ${keysList.length + 1}`");
fs.writeFileSync('./src/components/GeminiKeyModal.tsx', gkm, 'utf-8');
console.log('✅ Fixed GeminiKeyModal.tsx');

// 3. Fix LockScreenAthkarOverlay.tsx
let lsa = fs.readFileSync('./src/components/LockScreenAthkarOverlay.tsx', 'utf-8');
if (!lsa.includes('getTranslation')) {
  lsa = lsa.replace("import {", "import { getTranslation } from '../lib/languages';\nimport {");
}
// Replace static labels with t keys
lsa = lsa.replace("{ key: 'morning', label: 'أذكار الصباح', icon: Sun },", "{ key: 'morning', label: t.morningAthkarLabel || 'Morning Remembrance', icon: Sun },");
lsa = lsa.replace("{ key: 'evening', label: 'أذكار المساء', icon: Moon },", "{ key: 'evening', label: t.eveningAthkarLabel || 'Evening Remembrance', icon: Moon },");
lsa = lsa.replace("{ key: 'general', label: 'السبحة العامة', icon: Sparkles },", "{ key: 'general', label: t.generalDhikrLabel || 'General Dhikr', icon: Sparkles },");
fs.writeFileSync('./src/components/LockScreenAthkarOverlay.tsx', lsa, 'utf-8');
console.log('✅ Fixed LockScreenAthkarOverlay.tsx');

// 4. Fix apiKeyManager.ts
let akm = fs.readFileSync('./src/lib/apiKeyManager.ts', 'utf-8');
akm = akm.replace("name: 'المفتاح الرئيسي',", "name: 'Primary Key',");
akm = akm.replace("return { success: false, message: 'مفتاح API فارغ.' };", "return { success: false, message: 'API_KEY_EMPTY', errorCode: 'EMPTY_KEY' };");
akm = akm.replace("return { success: true, message: 'المفتاح يعمل بنجاح والاتصال مستقر 🟢' };", "return { success: true, message: 'API_KEY_VALID', errorCode: null };");
akm = akm.replace("return { success: false, message: 'مفتاح API غير صالح أو غير مكتوب بشكل صحيح 🔴' };", "return { success: false, message: 'API_KEY_INVALID', errorCode: 'INVALID_KEY' };");
akm = akm.replace("return { success: false, message: 'تم تجاوز حد الحصة المتاحة للمفتاح (Quota Exhausted) 🟡' };", "return { success: false, message: 'API_KEY_QUOTA_EXHAUSTED', errorCode: 'QUOTA_EXCEEDED' };");
akm = akm.replace(/return \{ success: false, message: `فشل الاتصال: \${rawMsg}` \};/, "return { success: false, message: `CONNECTION_FAILED: ${rawMsg}`, errorCode: 'CONNECTION_FAILED' };");
akm = akm.replace(/return \{ success: false, message: `فشل الاتصال بالشبكة: \${e\?\.message \|\| String\(e\)}` \};/, "return { success: false, message: `NETWORK_ERROR: ${e?.message || String(e)}`, errorCode: 'NETWORK_ERROR' };");
fs.writeFileSync('./src/lib/apiKeyManager.ts', akm, 'utf-8');
console.log('✅ Fixed apiKeyManager.ts (error codes now language-neutral)');

// 5. Fix biometrics.ts
let bio = fs.readFileSync('./src/lib/biometrics.ts', 'utf-8');
bio = bio.replace("error: nativeErr?.message || 'فشلت قراءة البصمة من النظام المحمول'", "error: nativeErr?.message || 'BIOMETRIC_READ_FAILED'");
bio = bio.replace("error: check.reason || 'البيئة الحالية لا تدعم البصمة'", "error: check.reason || 'BIOMETRIC_NOT_SUPPORTED'");
bio = bio.replace("error: err?.name === 'NotAllowedError' ? 'تم رفض إذن البصمة أو البيئة المضمنة غير مسموحة' : err?.message", "error: err?.name === 'NotAllowedError' ? 'BIOMETRIC_PERMISSION_DENIED' : err?.message");
bio = bio.replace(
  "reason: 'البصمة غير متاحة حالياً على هذا المتصفح/البيئة (نافذة المعاينة)، تم اعتماد القفل برمز الـ PIN كخيار أمان رئيسي'",
  "reason: 'BIOMETRIC_UNAVAILABLE_PREVIEW_ENV'"
);
fs.writeFileSync('./src/lib/biometrics.ts', bio, 'utf-8');
console.log('✅ Fixed biometrics.ts (error codes now language-neutral)');

// 6. Fix SmartAdvisor.tsx - replace welcome messages with t keys
let sa = fs.readFileSync('./src/components/SmartAdvisor.tsx', 'utf-8');
// Get the t already defined
if (sa.includes("? 'المتصفح لا يدعم ميزة التعرف التلقائي على الصوت.'")) {
  sa = sa.replace("? 'المتصفح لا يدعم ميزة التعرف التلقائي على الصوت.'", "? (t.speechNotSupported || 'This browser does not support speech recognition.')");
}
fs.writeFileSync('./src/components/SmartAdvisor.tsx', sa, 'utf-8');
console.log('✅ Fixed SmartAdvisor.tsx');

// 7. Fix fetchInterceptor.ts - replace hardcoded Arabic error/response strings
let fi = fs.readFileSync('./src/lib/fetchInterceptor.ts', 'utf-8');
fi = fi.replace("throw new Error('يرجى التحقق من مفتاح API في الإعدادات');", "throw new Error('API_KEY_MISSING_CHECK_SETTINGS');");
fi = fi.replace("if (!responseText || !responseText.trim()) throw new Error('استجابة فارغة من خادم الذكاء الاصطناعي');", "if (!responseText || !responseText.trim()) throw new Error('AI_EMPTY_RESPONSE');");
fi = fi.replace("return 'لقد تجاوزت حد الاستخدام اليومي المجاني';", "return '__AI_QUOTA_EXCEEDED__';");
fi = fi.replace("return 'يرجى التحقق من مفتاح API في الإعدادات';", "return '__AI_CHECK_API_KEY__';");
fi = fi.replace("if (lastErrorMsg.includes('يرجى') || lastErrorMsg.includes('لقد تجاوزت')) throw new Error(lastErrorMsg);", "if (lastErrorMsg.includes('يرجى') || lastErrorMsg.includes('لقد تجاوزت') || lastErrorMsg.includes('__AI_')) throw new Error(lastErrorMsg);");
// Fix Arabic string in habits evaluation format
fi = fi.replace(
  /return `- العادة: "\$\{h\.name\}" \[التصنيف: \$\{h\.category\}\]\n  عدد مرات الإنجاز الكلي: \$\{totalDone\}\n  تفاصيل أيام الالتزام: \$\{JSON\.stringify\(h\.history \|\| \{\}\)\}`;/,
  "return `- Habit: \"${h.name}\" [Category: ${h.category}]\n  Total completions: ${totalDone}\n  History: ${JSON.stringify(h.history || {})}`;");
fs.writeFileSync('./src/lib/fetchInterceptor.ts', fi, 'utf-8');
console.log('✅ Fixed fetchInterceptor.ts (error codes language-neutral)');

// Now update languages.ts with new keys
const masterKeysCount = Object.keys(dicts.ar).length;
console.log(`Total Master Keys: ${masterKeysCount}`);

// Write full languages.ts
let langContent = fs.readFileSync('./src/lib/languages.ts', 'utf-8');

// Find and update each dict in languages.ts
for (const lang of languages) {
  const dictConstName = lang.toUpperCase() + '_DICT';
  // Find new keys to add and inject them before the closing }
  const keysToAdd = Object.entries(NEW_KEYS).map(([key, trans]) => {
    const val = JSON.stringify(trans[lang] || trans.en);
    return `  ${key}: ${val},`;
  }).join('\n');

  // Check if these keys already exist
  const firstKey = Object.keys(NEW_KEYS)[0];
  if (!langContent.includes(`  ${firstKey}:`) || !langContent.includes(firstKey)) {
    // Add keys before the closing }; of each dict
    const dictPattern = new RegExp(`(export const ${dictConstName}: Record<string, any> = \\{[^}]*)(\\};)`, 's');
    langContent = langContent.replace(dictPattern, `$1${keysToAdd}\n$2`);
  }
}

fs.writeFileSync('./src/lib/languages.ts', langContent, 'utf-8');
console.log('✅ Updated languages.ts with new translation keys');
console.log(`\n🎯 SUMMARY: Fixed 7 files with language-neutral error codes and localized UI strings.`);
