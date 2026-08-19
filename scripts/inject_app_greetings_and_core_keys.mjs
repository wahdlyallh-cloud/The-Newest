/**
 * inject_app_greetings_and_core_keys.mjs
 * Injects greeting keys + core missing keys + gemini/error keys into all 12 locales
 */
import fs from 'fs';

const filePath = 'src/lib/languages.ts';

const NEW_KEYS = {
  // Greeting keys (replacing hardcoded Arabic/English)
  greetingMorning: {
    AR: 'صباح الخير والرضا والنفس المطمئنة ☀️',
    EN: 'Good Morning & Peaceful Mind ☀️',
    FR: 'Bonjour & Esprit Serein ☀️',
    DE: 'Guten Morgen & Friedlicher Geist ☀️',
    ES: 'Buenos días & Mente en Paz ☀️',
    IT: 'Buongiorno & Mente Serena ☀️',
    TR: 'Günaydın & Huzurlu Zihin ☀️',
    PT: 'Bom dia & Mente em Paz ☀️',
    RU: 'Доброе утро & Спокойный ум ☀️',
    JA: 'おはようございます & 穏やかな心 ☀️',
    ZH: '早上好 & 平静的心灵 ☀️',
    HI: 'सुप्रभात & शांत मन ☀️',
  },
  greetingAfternoon: {
    AR: 'أهلاً بك وطاب يومك يا صديقي النبيل ☕',
    EN: 'Welcome & Have a Wonderful Day ☕',
    FR: 'Bienvenue & Bonne journée ☕',
    DE: 'Willkommen & Einen schönen Tag ☕',
    ES: 'Bienvenido & Que tengas un día maravilloso ☕',
    IT: 'Benvenuto & Buona giornata ☕',
    TR: 'Hoş geldin & İyi günler ☕',
    PT: 'Bem-vindo & Tenha um dia maravilhoso ☕',
    RU: 'Добро пожаловать & Хорошего дня ☕',
    JA: 'ようこそ & 素晴らしい一日を ☕',
    ZH: '欢迎 & 祝你有美好的一天 ☕',
    HI: 'स्वागत है & शानदार दिन हो ☕',
  },
  greetingEvening: {
    AR: 'مساء الهدوء وراحة البال والاسترخاء 🌙',
    EN: 'Good Evening & Inner Tranquility 🌙',
    FR: 'Bonsoir & Tranquillité Intérieure 🌙',
    DE: 'Guten Abend & Innere Ruhe 🌙',
    ES: 'Buenas noches & Tranquilidad Interior 🌙',
    IT: 'Buonasera & Tranquillità Interiore 🌙',
    TR: 'İyi akşamlar & İç Huzur 🌙',
    PT: 'Boa noite & Tranquilidade Interior 🌙',
    RU: 'Добрый вечер & Душевный покой 🌙',
    JA: 'こんばんは & 内なる安らぎ 🌙',
    ZH: '晚上好 & 内心安宁 🌙',
    HI: 'शुभ संध्या & आंतरिक शांति 🌙',
  },
  greetingMorningHeader: {
    AR: 'صباح التفاؤل والنشاط والتصالح',
    EN: 'Good Morning & Peaceful Mind',
    FR: 'Bonjour & Esprit Paisible',
    DE: 'Guten Morgen & Friedlicher Geist',
    ES: 'Buenos días & Mente en Paz',
    IT: 'Buongiorno & Mente Serena',
    TR: 'Günaydın & Huzurlu Zihin',
    PT: 'Bom dia & Mente em Paz',
    RU: 'Доброе утро & Мирный ум',
    JA: 'おはようございます & 穏やかな心',
    ZH: '早上好 & 平静的心灵',
    HI: 'सुप्रभात & शांत मन',
  },
  greetingAfternoonHeader: {
    AR: 'أهلاً بك وطاب يومك يا صديقي النبيل',
    EN: 'Welcome & Have a Wonderful Day',
    FR: 'Bienvenue & Bonne journée à vous',
    DE: 'Willkommen & Einen wunderschönen Tag',
    ES: 'Bienvenido & Que tengas un día maravilloso',
    IT: 'Benvenuto & Buona giornata',
    TR: 'Hoş geldiniz & İyi günler',
    PT: 'Bem-vindo & Um dia maravilhoso',
    RU: 'Добро пожаловать & Чудесного дня',
    JA: 'ようこそ & 素晴らしい一日を',
    ZH: '欢迎 & 祝你有美好的一天',
    HI: 'स्वागत है & शानदार दिन की शुभकामनाएं',
  },
  greetingEveningHeader: {
    AR: 'مساء الهدوء وراحة البال والاسترخاء',
    EN: 'Good Evening & Inner Tranquility',
    FR: 'Bonsoir & Tranquillité Intérieure',
    DE: 'Guten Abend & Innere Ruhe',
    ES: 'Buenas noches & Tranquilidad Interior',
    IT: 'Buonasera & Tranquillità Interiore',
    TR: 'İyi akşamlar & İç Huzur',
    PT: 'Boa noite & Tranquilidade Interior',
    RU: 'Добрый вечер & Душевный покой',
    JA: 'こんばんは & 内なる安らぎ',
    ZH: '晚上好 & 内心安宁',
    HI: 'शुभ संध्या & आंतरिक शांति',
  },
  // Gemini error messages (replacing Arabic hardcoded)
  apiKeyCheckSettings: {
    AR: 'يرجى التحقق من مفتاح API في الإعدادات',
    EN: 'Please check your API key in settings',
    FR: 'Veuillez vérifier votre clé API dans les paramètres',
    DE: 'Bitte überprüfen Sie Ihren API-Schlüssel in den Einstellungen',
    ES: 'Por favor verifique su clave API en la configuración',
    IT: 'Si prega di verificare la chiave API nelle impostazioni',
    TR: 'Lütfen ayarlardaki API anahtarınızı kontrol edin',
    PT: 'Por favor verifique sua chave API nas configurações',
    RU: 'Пожалуйста, проверьте ваш API-ключ в настройках',
    JA: '設定でAPIキーを確認してください',
    ZH: '请在设置中检查您的API密钥',
    HI: 'कृपया सेटिंग में अपनी API कुंजी जांचें',
  },
  dailyLimitReached: {
    AR: 'لقد تجاوزت حد الاستخدام اليومي المجاني',
    EN: 'You have exceeded the daily free usage limit',
    FR: 'Vous avez dépassé la limite d\'utilisation quotidienne gratuite',
    DE: 'Sie haben das tägliche kostenlose Nutzungslimit überschritten',
    ES: 'Ha superado el límite de uso diario gratuito',
    IT: 'Hai superato il limite di utilizzo giornaliero gratuito',
    TR: 'Günlük ücretsiz kullanım limitini aştınız',
    PT: 'Você excedeu o limite de uso diário gratuito',
    RU: 'Вы превысили дневной лимит бесплатного использования',
    JA: '無料の日次使用制限を超えました',
    ZH: '您已超出每日免费使用限制',
    HI: 'आपने दैनिक निःशुल्क उपयोग सीमा पार कर ली है',
  },
  connectionError: {
    AR: 'خطأ في الاتصال',
    EN: 'Connection error',
    FR: 'Erreur de connexion',
    DE: 'Verbindungsfehler',
    ES: 'Error de conexión',
    IT: 'Errore di connessione',
    TR: 'Bağlantı hatası',
    PT: 'Erro de conexão',
    RU: 'Ошибка соединения',
    JA: '接続エラー',
    ZH: '连接错误',
    HI: 'कनेक्शन त्रुटि',
  },
  apiKeyEmpty: {
    AR: 'مفتاح API فارغ. يرجى إدخال المفتاح بشكل صحيح.',
    EN: 'API key is empty. Please enter the key correctly.',
    FR: 'La clé API est vide. Veuillez saisir la clé correctement.',
    DE: 'API-Schlüssel ist leer. Bitte geben Sie den Schlüssel korrekt ein.',
    ES: 'La clave API está vacía. Por favor ingrese la clave correctamente.',
    IT: 'La chiave API è vuota. Inserire la chiave correttamente.',
    TR: 'API anahtarı boş. Lütfen anahtarı doğru girin.',
    PT: 'A chave API está vazia. Por favor insira a chave corretamente.',
    RU: 'API-ключ пуст. Пожалуйста, введите ключ правильно.',
    JA: 'APIキーが空です。正しく入力してください。',
    ZH: 'API密钥为空。请正确输入密钥。',
    HI: 'API कुंजी खाली है। कृपया कुंजी सही ढंग से दर्ज करें।',
  },
  apiKeyVerified: {
    AR: 'تم التحقق من المفتاح بنجاح 🎉',
    EN: 'Key verified successfully 🎉',
    FR: 'Clé vérifiée avec succès 🎉',
    DE: 'Schlüssel erfolgreich verifiziert 🎉',
    ES: 'Clave verificada exitosamente 🎉',
    IT: 'Chiave verificata con successo 🎉',
    TR: 'Anahtar başarıyla doğrulandı 🎉',
    PT: 'Chave verificada com sucesso 🎉',
    RU: 'Ключ успешно проверен 🎉',
    JA: 'キーが正常に確認されました 🎉',
    ZH: '密钥验证成功 🎉',
    HI: 'कुंजी सफलतापूर्वक सत्यापित 🎉',
  },
  apiKeyInvalidError: {
    AR: 'مفتاح API غير صالح، يرجى التأكد من نسخه بشكل صحيح من Google AI Studio',
    EN: 'Invalid API key. Please ensure it is copied correctly from Google AI Studio.',
    FR: 'Clé API invalide. Assurez-vous de la copier correctement depuis Google AI Studio.',
    DE: 'Ungültiger API-Schlüssel. Bitte korrekt von Google AI Studio kopieren.',
    ES: 'Clave API inválida. Asegúrese de copiarla correctamente de Google AI Studio.',
    IT: 'Chiave API non valida. Assicurarsi di copiarla correttamente da Google AI Studio.',
    TR: 'Geçersiz API anahtarı. Lütfen Google AI Studio\'dan doğru kopyaladığınızdan emin olun.',
    PT: 'Chave API inválida. Copie corretamente do Google AI Studio.',
    RU: 'Недействительный API-ключ. Скопируйте его правильно из Google AI Studio.',
    JA: '無効なAPIキー。Google AI Studioから正確にコピーしてください。',
    ZH: 'API密钥无效。请确保从Google AI Studio正确复制。',
    HI: 'अमान्य API कुंजी। Google AI Studio से सही ढंग से कॉपी करें।',
  },
  networkError: {
    AR: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
    EN: 'Server connection failed. Please check your internet connection.',
    FR: 'Connexion au serveur échouée. Vérifiez votre connexion internet.',
    DE: 'Serververbindung fehlgeschlagen. Überprüfen Sie Ihre Internetverbindung.',
    ES: 'Conexión al servidor fallida. Verifique su conexión a internet.',
    IT: 'Connessione al server fallita. Verificare la connessione internet.',
    TR: 'Sunucu bağlantısı başarısız. İnternet bağlantınızı kontrol edin.',
    PT: 'Falha na conexão com o servidor. Verifique sua conexão à internet.',
    RU: 'Соединение с сервером не удалось. Проверьте подключение к интернету.',
    JA: 'サーバー接続に失敗しました。インターネット接続を確認してください。',
    ZH: '服务器连接失败。请检查您的互联网连接。',
    HI: 'सर्वर कनेक्शन विफल। कृपया इंटरनेट कनेक्शन जांचें।',
  },
  // File upload error keys
  fileUploadNetworkError: {
    AR: 'تعذر الاتصال بخادم Gemini لرفع الملف',
    EN: 'Could not connect to Gemini server to upload file',
    FR: 'Impossible de se connecter au serveur Gemini pour téléverser le fichier',
    DE: 'Verbindung zum Gemini-Server für Datei-Upload fehlgeschlagen',
    ES: 'No se pudo conectar al servidor Gemini para subir el archivo',
    IT: 'Impossibile connettersi al server Gemini per caricare il file',
    TR: 'Dosya yüklemek için Gemini sunucusuna bağlanılamadı',
    PT: 'Não foi possível conectar ao servidor Gemini para upload do arquivo',
    RU: 'Не удалось подключиться к серверу Gemini для загрузки файла',
    JA: 'ファイルアップロードのためにGeminiサーバーに接続できませんでした',
    ZH: '无法连接到Gemini服务器以上传文件',
    HI: 'फ़ाइल अपलोड के लिए Gemini सर्वर से कनेक्ट नहीं हो सका',
  },
  fileUploadFailed: {
    AR: 'فشل رفع الملف لـ Gemini Files API',
    EN: 'Failed to upload file to Gemini Files API',
    FR: 'Échec du téléversement du fichier vers Gemini Files API',
    DE: 'Datei-Upload zu Gemini Files API fehlgeschlagen',
    ES: 'Error al subir el archivo a Gemini Files API',
    IT: 'Caricamento del file su Gemini Files API fallito',
    TR: 'Dosya Gemini Files API\'ye yüklenemedi',
    PT: 'Falha ao enviar arquivo para Gemini Files API',
    RU: 'Не удалось загрузить файл в Gemini Files API',
    JA: 'Gemini Files APIへのファイルアップロードに失敗しました',
    ZH: '上传文件到Gemini Files API失败',
    HI: 'Gemini Files API में फ़ाइल अपलोड विफल',
  },
  fileSizeExceeded: {
    AR: 'حجم الملف يتجاوز الحد الأقصى المسموح به',
    EN: 'File size exceeds the maximum allowed limit',
    FR: 'La taille du fichier dépasse la limite maximale autorisée',
    DE: 'Dateigröße überschreitet das maximal zulässige Limit',
    ES: 'El tamaño del archivo supera el límite máximo permitido',
    IT: 'La dimensione del file supera il limite massimo consentito',
    TR: 'Dosya boyutu izin verilen maksimum limiti aşıyor',
    PT: 'Tamanho do arquivo excede o limite máximo permitido',
    RU: 'Размер файла превышает максимально допустимый предел',
    JA: 'ファイルサイズが最大許容制限を超えています',
    ZH: '文件大小超过最大允许限制',
    HI: 'फ़ाइल का आकार अधिकतम अनुमत सीमा से अधिक है',
  },
  cloudSyncSuccess: {
    AR: 'تمت المزامنة السحابية بنجاح وحفظ نسختك الاحتياطية بأمان',
    EN: 'Cloud sync completed successfully and backup saved securely',
    FR: 'Synchronisation cloud réussie et sauvegarde sécurisée',
    DE: 'Cloud-Synchronisierung erfolgreich abgeschlossen und Backup gesichert',
    ES: 'Sincronización en la nube completada y copia de seguridad guardada',
    IT: 'Sincronizzazione cloud completata e backup salvato in modo sicuro',
    TR: 'Bulut senkronizasyonu başarıyla tamamlandı ve yedek güvenle kaydedildi',
    PT: 'Sincronização na nuvem concluída e backup salvo com segurança',
    RU: 'Облачная синхронизация завершена и резервная копия сохранена надёжно',
    JA: 'クラウド同期が正常に完了し、バックアップが安全に保存されました',
    ZH: '云同步成功完成，备份已安全保存',
    HI: 'क्लाउड सिंक सफलतापूर्वक पूर्ण और बैकअप सुरक्षित रूप से सहेजा गया',
  },
  cloudSyncFailed: {
    AR: 'فشل حفظ وتزامن البيانات سحابياً',
    EN: 'Failed to save and sync data to the cloud',
    FR: 'Échec de la sauvegarde et de la synchronisation des données vers le cloud',
    DE: 'Fehler beim Speichern und Synchronisieren von Daten in der Cloud',
    ES: 'Error al guardar y sincronizar datos en la nube',
    IT: 'Impossibile salvare e sincronizzare i dati nel cloud',
    TR: 'Buluta veri kaydetme ve senkronizasyon başarısız',
    PT: 'Falha ao salvar e sincronizar dados na nuvem',
    RU: 'Не удалось сохранить и синхронизировать данные в облаке',
    JA: 'クラウドへのデータの保存と同期に失敗しました',
    ZH: '保存和同步数据到云端失败',
    HI: 'क्लाउड में डेटा सहेजने और सिंक करने में विफल',
  },
  audioTranscriptionFailed: {
    AR: 'فشل تفريغ الصوت. يرجى التحقق من مفتاح API.',
    EN: 'Audio transcription failed. Please check your API key.',
    FR: 'La transcription audio a échoué. Vérifiez votre clé API.',
    DE: 'Audio-Transkription fehlgeschlagen. Bitte API-Schlüssel überprüfen.',
    ES: 'La transcripción de audio falló. Verifique su clave API.',
    IT: 'Trascrizione audio fallita. Verificare la chiave API.',
    TR: 'Ses metni dönüştürme başarısız. API anahtarınızı kontrol edin.',
    PT: 'Transcrição de áudio falhou. Verifique sua chave API.',
    RU: 'Транскрипция аудио не удалась. Проверьте ваш API-ключ.',
    JA: '音声文字起こしに失敗しました。APIキーを確認してください。',
    ZH: '音频转录失败。请检查您的API密钥。',
    HI: 'ऑडियो ट्रांसक्रिप्शन विफल। कृपया API कुंजी जांचें।',
  },
  apiKeyRequiredForAudio: {
    AR: 'يلزم إضافة مفتاح Gemini API لتفريغ الصوت بالذكاء الاصطناعي.',
    EN: 'A Gemini API key is required to transcribe audio with AI.',
    FR: 'Une clé API Gemini est requise pour transcrire l\'audio avec l\'IA.',
    DE: 'Ein Gemini API-Schlüssel ist erforderlich, um Audio mit KI zu transkribieren.',
    ES: 'Se requiere una clave API Gemini para transcribir audio con IA.',
    IT: 'È necessaria una chiave API Gemini per trascrivere audio con l\'IA.',
    TR: 'Sesi yapay zeka ile metne dönüştürmek için Gemini API anahtarı gereklidir.',
    PT: 'Uma chave API Gemini é necessária para transcrever áudio com IA.',
    RU: 'Для транскрипции аудио с помощью ИИ требуется API-ключ Gemini.',
    JA: 'AIで音声を文字起こしするにはGemini APIキーが必要です。',
    ZH: '使用AI转录音频需要Gemini API密钥。',
    HI: 'AI से ऑडियो ट्रांसक्रिप्ट करने के लिए Gemini API कुंजी आवश्यक है।',
  },
};

const LANG_CODES = ['AR', 'EN', 'FR', 'DE', 'ES', 'IT', 'TR', 'PT', 'RU', 'JA', 'ZH', 'HI'];
const DICT_DECL_RE = /^export const ([A-Z]+)_DICT: Record<string, any> = \{/;

let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// Find dict boundaries
const dictBounds = {};
let currentDict = null;
let braceDepth = 0;
let dictStartLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!currentDict) {
    const m = line.match(DICT_DECL_RE);
    if (m) { currentDict = m[1]; braceDepth = 0; dictStartLine = i; }
  }
  if (currentDict) {
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
    }
    if (braceDepth === 0 && i > dictStartLine) {
      dictBounds[currentDict] = { start: dictStartLine, end: i };
      currentDict = null;
    }
  }
}

const injections = [];
for (const langCode of LANG_CODES) {
  const bounds = dictBounds[langCode];
  if (!bounds) { console.log(`WARN: ${langCode}_DICT not found`); continue; }
  const dictLines = lines.slice(bounds.start, bounds.end + 1);
  const toInject = [];
  for (const [keyName, translations] of Object.entries(NEW_KEYS)) {
    const value = translations[langCode];
    if (!value) continue;
    const alreadyExists = dictLines.some(l => l.trimStart().startsWith(`${keyName}:`));
    if (alreadyExists) { continue; }
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    toInject.push(`  ${keyName}: '${escaped}',`);
  }
  if (toInject.length > 0) {
    injections.push({ lineIdx: bounds.end, newLines: toInject, langCode });
  }
}

injections.sort((a, b) => b.lineIdx - a.lineIdx);
let totalInjected = 0;
for (const { lineIdx, newLines, langCode } of injections) {
  lines.splice(lineIdx, 0, ...newLines);
  console.log(`✅ ${langCode}_DICT: +${newLines.length} keys`);
  totalInjected += newLines.length;
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\n🎉 Total keys injected: ${totalInjected}`);
console.log(`Keys per locale: ${totalInjected / 12}`);
