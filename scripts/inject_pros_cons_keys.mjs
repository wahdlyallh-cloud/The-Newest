/**
 * inject_pros_cons_keys.mjs
 * Injects the new DailyProsConsModal translation keys into all 12 language dicts
 */
import fs from 'fs';

const filePath = 'src/lib/languages.ts';

const NEW_KEYS = {
  prosConsReportTitle: {
    AR: 'تقرير الإيجابيات والسلبيات اليومية', EN: 'Daily Pros & Cons Report',
    FR: 'Rapport Avantages & Inconvénients Quotidien', DE: 'Täglicher Vor- & Nachteile-Bericht',
    ES: 'Informe Diario de Pros y Contras', IT: 'Rapporto Quotidiano Pro e Contro',
    TR: 'Günlük Artılar & Eksiler Raporu', PT: 'Relatório Diário de Prós e Contras',
    RU: 'Ежедневный отчёт о плюсах и минусах', JA: 'デイリー長所・短所レポート',
    ZH: '每日优缺点报告', HI: 'दैनिक गुण-दोष रिपोर्ट'
  },
  prosConsAiManual: {
    AR: 'توليد ذكي + يدوي', EN: 'AI + Manual', FR: 'IA + Manuel',
    DE: 'KI + Manuell', ES: 'IA + Manual', IT: 'AI + Manuale',
    TR: 'Yapay Zeka + Manuel', PT: 'IA + Manual', RU: 'ИИ + Вручную',
    JA: 'AI + 手動', ZH: 'AI + 手动', HI: 'AI + मैनुअल'
  },
  prosConsAiSection: {
    AR: 'أولاً: الإيجابيات والسلبيات المولدة بالذكاء الاصطناعي 🧠',
    EN: 'AI-Generated Pros & Cons 🧠', FR: 'Avantages & Inconvénients générés par IA 🧠',
    DE: 'KI-generierte Vor- & Nachteile 🧠', ES: 'Pros y Contras generados por IA 🧠',
    IT: 'Pro e Contro generati dall\'IA 🧠', TR: 'Yapay Zeka ile Üretilen Artılar & Eksiler 🧠',
    PT: 'Prós e Contras gerados por IA 🧠', RU: 'Плюсы и минусы от ИИ 🧠',
    JA: 'AI生成の長所・短所 🧠', ZH: 'AI生成的优缺点 🧠', HI: 'AI-जनित गुण-दोष 🧠'
  },
  prosConsAiSubtitle: {
    AR: 'مستخلصة تلقائياً من المذكرات', EN: 'Auto-extracted from all app sections',
    FR: 'Extraits automatiquement de toutes les sections', DE: 'Automatisch aus allen Abschnitten extrahiert',
    ES: 'Extraído automáticamente de todas las secciones', IT: 'Estratto automaticamente da tutte le sezioni',
    TR: 'Tüm bölümlerden otomatik olarak çıkarıldı', PT: 'Extraído automaticamente de todas as seções',
    RU: 'Автоматически извлечено из всех разделов', JA: 'すべてのセクションから自動抽出',
    ZH: '自动从所有部分提取', HI: 'सभी अनुभागों से स्वतः निकाला गया'
  },
  prosConsManualSection: {
    AR: 'ثانياً: الإيجابيات والسلبيات المدخلة يدوياً ✍️',
    EN: 'Manually Added Pros & Cons ✍️', FR: 'Avantages & Inconvénients ajoutés manuellement ✍️',
    DE: 'Manuell hinzugefügte Vor- & Nachteile ✍️', ES: 'Pros y Contras añadidos manualmente ✍️',
    IT: 'Pro e Contro aggiunti manualmente ✍️', TR: 'Manuel Eklenen Artılar & Eksiler ✍️',
    PT: 'Prós e Contras adicionados manualmente ✍️', RU: 'Плюсы и минусы вручную ✍️',
    JA: '手動で追加した長所・短所 ✍️', ZH: '手动添加的优缺点 ✍️', HI: 'मैन्युअल रूप से जोड़े गए गुण-दोष ✍️'
  },
  prosConsManualSubtitle: {
    AR: 'إدخال واسترسال شخصي', EN: 'Personal input & reflection',
    FR: 'Saisie et réflexion personnelle', DE: 'Persönliche Eingabe & Reflexion',
    ES: 'Entrada personal y reflexión', IT: 'Input personale e riflessione',
    TR: 'Kişisel giriş ve yansıma', PT: 'Entrada pessoal e reflexão',
    RU: 'Личный ввод и размышления', JA: '個人の入力と振り返り',
    ZH: '个人输入与反思', HI: 'व्यक्तिगत इनपुट और चिंतन'
  },
  prosConsAiPositives: {
    AR: '🟢 الإيجابيات المولدة بالذكاء الاصطناعي:',
    EN: '🟢 AI-Generated Positives:', FR: '🟢 Points positifs générés par IA:',
    DE: '🟢 KI-generierte Vorteile:', ES: '🟢 Positivos generados por IA:',
    IT: '🟢 Punti positivi generati dall\'IA:', TR: '🟢 Yapay Zeka Artıları:',
    PT: '🟢 Positivos gerados por IA:', RU: '🟢 Плюсы от ИИ:',
    JA: '🟢 AI生成のポジティブ:', ZH: '🟢 AI生成优点:', HI: '🟢 AI-जनित सकारात्मक:'
  },
  prosConsAiNegatives: {
    AR: '🔴 السلبيات والتحديات المولدة بالذكاء الاصطناعي:',
    EN: '🔴 AI-Generated Challenges:', FR: '🔴 Défis générés par IA:',
    DE: '🔴 KI-generierte Herausforderungen:', ES: '🔴 Desafíos generados por IA:',
    IT: '🔴 Sfide generate dall\'IA:', TR: '🔴 Yapay Zeka Eksileri:',
    PT: '🔴 Desafios gerados por IA:', RU: '🔴 Минусы от ИИ:',
    JA: '🔴 AI生成のネガティブ:', ZH: '🔴 AI生成缺点:', HI: '🔴 AI-जनित चुनौतियाँ:'
  },
  prosConsManualPositives: {
    AR: 'إيجابيات اليوم (مدخلة يدوياً):', EN: "Today's Positives (manual):",
    FR: "Positifs du jour (saisis manuellement):", DE: "Heutige Vorteile (manuell):",
    ES: "Positivos de hoy (manual):", IT: "Aspetti positivi di oggi (manuale):",
    TR: "Bugünkü Olumlu Yanlar (manuel):", PT: "Positivos de hoje (manual):",
    RU: "Плюсы сегодня (вручную):", JA: "今日のポジティブ（手動）:",
    ZH: "今日优点（手动）:", HI: "आज के सकारात्मक (मैन्युअल):"
  },
  prosConsManualNegatives: {
    AR: 'سلبيات وتحديات اليوم (مدخلة يدوياً):', EN: "Today's Challenges (manual):",
    FR: "Défis du jour (saisis manuellement):", DE: "Heutige Herausforderungen (manuell):",
    ES: "Desafíos de hoy (manual):", IT: "Sfide di oggi (manuale):",
    TR: "Bugünkü Zorluklar (manuel):", PT: "Desafios de hoje (manual):",
    RU: "Минусы сегодня (вручную):", JA: "今日の課題（手動）:",
    ZH: "今日缺点（手动）:", HI: "आज की चुनौतियाँ (मैन्युअल):"
  },
  prosConsPoints: {
    AR: 'نقاط', EN: 'points', FR: 'points', DE: 'Punkte', ES: 'puntos',
    IT: 'punti', TR: 'puan', PT: 'pontos', RU: 'пунктов', JA: 'ポイント', ZH: '点', HI: 'बिंदु'
  },
  prosConsFooterBrand: {
    AR: 'منصة حياة AI - تقرير الإيجابيات والسلبيات اليومية',
    EN: 'Hayat AI - Daily Pros & Cons Report', FR: 'Hayat AI - Rapport Quotidien',
    DE: 'Hayat AI - Täglicher Bericht', ES: 'Hayat AI - Informe Diario',
    IT: 'Hayat AI - Rapporto Quotidiano', TR: 'Hayat AI - Günlük Rapor',
    PT: 'Hayat AI - Relatório Diário', RU: 'Hayat AI - Ежедневный отчёт',
    JA: 'Hayat AI - デイリーレポート', ZH: 'Hayat AI - 每日报告', HI: 'Hayat AI - दैनिक रिपोर्ट'
  },
  prosConsFooterPrivacy: {
    AR: 'سرية تامة وتشفير محلي 🌿', EN: 'Fully private & locally encrypted 🌿',
    FR: 'Totalement privé & chiffré localement 🌿', DE: 'Vollständig privat & lokal verschlüsselt 🌿',
    ES: 'Totalmente privado y cifrado localmente 🌿', IT: 'Completamente privato & crittografato localmente 🌿',
    TR: 'Tamamen özel & yerel olarak şifrelenmiş 🌿', PT: 'Totalmente privado e criptografado localmente 🌿',
    RU: 'Полностью приватно и зашифровано локально 🌿', JA: '完全なプライバシー & ローカル暗号化 🌿',
    ZH: '完全私密 & 本地加密 🌿', HI: 'पूरी तरह निजी & स्थानीय रूप से एन्क्रिप्टेड 🌿'
  },
  prosConsFallbackPositive: {
    AR: 'توثيق مشاعر إيجابية وإنجازات شخصية مثمرة.',
    EN: 'Documented positive feelings and personal achievements.',
    FR: 'Émotions positives et réalisations personnelles documentées.',
    DE: 'Positive Gefühle und persönliche Leistungen dokumentiert.',
    ES: 'Sentimientos positivos y logros personales documentados.',
    IT: 'Sentimenti positivi e traguardi personali documentati.',
    TR: 'Olumlu duygular ve kişisel başarılar belgelendi.',
    PT: 'Sentimentos positivos e realizações pessoais documentados.',
    RU: 'Задокументированы позитивные чувства и личные достижения.',
    JA: 'ポジティブな感情と個人的な達成を記録。',
    ZH: '记录了积极情绪和个人成就。', HI: 'सकारात्मक भावनाएँ और व्यक्तिगत उपलब्धियाँ दर्ज की गईं।'
  },
  prosConsFallbackNegative: {
    AR: 'مواجهة بعض الضغوط النفسية أو الأعراض الجسدية المجهدة.',
    EN: 'Faced some psychological pressures or physical stress symptoms.',
    FR: 'Confronté à des pressions psychologiques ou des symptômes de stress physique.',
    DE: 'Mit psychologischem Druck oder körperlichen Stresssymptomen konfrontiert.',
    ES: 'Enfrentó algunas presiones psicológicas o síntomas de estrés físico.',
    IT: 'Ha affrontato alcune pressioni psicologiche o sintomi di stress fisico.',
    TR: 'Bazı psikolojik baskılar veya fiziksel stres belirtileriyle karşılaştı.',
    PT: 'Enfrentou algumas pressões psicológicas ou sintomas de estresse físico.',
    RU: 'Столкнулся с психологическим давлением или физическими симптомами стресса.',
    JA: '心理的プレッシャーや身体的ストレス症状に直面。',
    ZH: '面临一些心理压力或身体压力症状。',
    HI: 'कुछ मनोवैज्ञानिक दबाव या शारीरिक तनाव के लक्षणों का सामना किया।'
  },
  prosConsFallbackCommitment: {
    AR: 'الالتزام بالتدوين ومتابعة الأنشطة بوعي.',
    EN: 'Commitment to journaling and mindful activity tracking.',
    FR: 'Engagement envers la journalisation et le suivi mindful des activités.',
    DE: 'Verpflichtung zum Journaling und bewusstem Aktivitätstracking.',
    ES: 'Compromiso con el diario y el seguimiento consciente de actividades.',
    IT: 'Impegno nel journaling e nel monitoraggio consapevole delle attività.',
    TR: 'Günlük tutma ve bilinçli aktivite takibine bağlılık.',
    PT: 'Comprometimento com o diário e o rastreamento consciente de atividades.',
    RU: 'Приверженность ведению дневника и осознанному отслеживанию активностей.',
    JA: 'ジャーナリングとマインドフルな活動追跡へのコミットメント。',
    ZH: '对日记记录和正念活动追踪的承诺。',
    HI: 'जर्नलिंग और सचेत गतिविधि ट्रैकिंग के प्रति प्रतिबद्धता।'
  },
  prosConsFallbackChallenges: {
    AR: 'تحديات وقتية بسيطة تم توثيقها للتعلم منها.',
    EN: 'Temporary simple challenges documented for learning.',
    FR: 'Défis temporaires simples documentés pour l\'apprentissage.',
    DE: 'Vorübergehende einfache Herausforderungen für das Lernen dokumentiert.',
    ES: 'Desafíos simples temporales documentados para el aprendizaje.',
    IT: 'Sfide temporanee semplici documentate per l\'apprendimento.',
    TR: 'Öğrenme için belgelenen geçici basit zorluklar.',
    PT: 'Desafios temporários simples documentados para aprendizado.',
    RU: 'Временные простые трудности задокументированы для обучения.',
    JA: '学習のために記録された一時的な簡単な課題。',
    ZH: '为学习而记录的临时简单挑战。',
    HI: 'सीखने के लिए दर्ज की गई अस्थायी सरल चुनौतियाँ।'
  },
  saveToProsCons: {
    AR: 'حفظ في سجل الإيجابيات والسلبيات 💾', EN: 'Save to Pros & Cons log 💾',
    FR: 'Enregistrer dans le journal Avantages/Inconvénients 💾',
    DE: 'Im Vor- & Nachteile-Protokoll speichern 💾',
    ES: 'Guardar en el registro de Pros y Contras 💾',
    IT: 'Salva nel registro Pro e Contro 💾', TR: 'Artılar & Eksiler günlüğüne kaydet 💾',
    PT: 'Salvar no registro de Prós e Contras 💾', RU: 'Сохранить в журнал плюсов и минусов 💾',
    JA: '長所・短所ログに保存 💾', ZH: '保存到优缺点日志 💾', HI: 'गुण-दोष लॉग में सहेजें 💾'
  },
  prosConsNoPositives: {
    AR: 'لا توجد نقاط إيجابية مسجلة لليوم', EN: 'No positive points recorded today',
    FR: 'Aucun point positif enregistré aujourd\'hui', DE: 'Heute keine positiven Punkte aufgezeichnet',
    ES: 'No se registraron puntos positivos hoy', IT: 'Nessun punto positivo registrato oggi',
    TR: 'Bugün pozitif nokta kaydedilmedi', PT: 'Nenhum ponto positivo registrado hoje',
    RU: 'Сегодня позитивные пункты не записаны', JA: '今日ポジティブなポイントは記録されていません',
    ZH: '今天没有记录积极点', HI: 'आज कोई सकारात्मक बिंदु दर्ज नहीं'
  },
  prosConsNoNegatives: {
    AR: 'لا توجد سلبيات مسجلة لليوم', EN: 'No negative points recorded today',
    FR: 'Aucun point négatif enregistré aujourd\'hui', DE: 'Heute keine negativen Punkte aufgezeichnet',
    ES: 'No se registraron puntos negativos hoy', IT: 'Nessun punto negativo registrato oggi',
    TR: 'Bugün negatif nokta kaydedilmedi', PT: 'Nenhum ponto negativo registrado hoje',
    RU: 'Сегодня негативные пункты не записаны', JA: '今日ネガティブなポイントは記録されていません',
    ZH: '今天没有记录负面点', HI: 'आज कोई नकारात्मक बिंदु दर्ज नहीं'
  },
  prosConsNoManualPoints: {
    AR: 'لم يتم إدخال نقاط خاصة', EN: 'No personal points entered',
    FR: 'Aucun point personnel saisi', DE: 'Keine persönlichen Punkte eingegeben',
    ES: 'No se han ingresado puntos personales', IT: 'Nessun punto personale inserito',
    TR: 'Kişisel nokta girilmedi', PT: 'Nenhum ponto pessoal inserido',
    RU: 'Личные пункты не введены', JA: '個人的なポイントが入力されていません',
    ZH: '未输入个人要点', HI: 'कोई व्यक्तिगत बिंदु दर्ज नहीं'
  },
  addPositivePoint: {
    AR: 'إضافة نقطة إيجابية أخرى...', EN: 'Add another positive point...',
    FR: 'Ajouter un autre point positif...', DE: 'Weiteren positiven Punkt hinzufügen...',
    ES: 'Agregar otro punto positivo...', IT: 'Aggiungi un altro punto positivo...',
    TR: 'Başka bir olumlu nokta ekle...', PT: 'Adicionar outro ponto positivo...',
    RU: 'Добавить ещё один позитивный пункт...', JA: '別のポジティブポイントを追加...',
    ZH: '添加另一个积极点...', HI: 'एक और सकारात्मक बिंदु जोड़ें...'
  },
  addNegativePoint: {
    AR: 'إضافة نقطة تحدي أو سلبيات أخرى...', EN: 'Add another challenge or negative point...',
    FR: 'Ajouter un autre défi ou point négatif...', DE: 'Weitere Herausforderung oder negativen Punkt hinzufügen...',
    ES: 'Agregar otro desafío o punto negativo...', IT: 'Aggiungi un\'altra sfida o punto negativo...',
    TR: 'Başka bir zorluk veya olumsuz nokta ekle...', PT: 'Adicionar outro desafio ou ponto negativo...',
    RU: 'Добавить ещё один вызов или негативный пункт...', JA: '別の課題またはネガティブポイントを追加...',
    ZH: '添加另一个挑战或负面点...', HI: 'एक और चुनौती या नकारात्मक बिंदु जोड़ें...'
  },
  writePositiveToday: {
    AR: 'اكتب إيجابية عشتها اليوم واضغط إضافة...', EN: 'Write a positive you experienced today and press add...',
    FR: 'Écrivez un positif vécu aujourd\'hui et appuyez sur ajouter...', DE: 'Schreiben Sie ein heutiges Positives und drücken Sie Hinzufügen...',
    ES: 'Escribe un positivo que viviste hoy y presiona agregar...', IT: 'Scrivi un aspetto positivo vissuto oggi e premi aggiungi...',
    TR: 'Bugün yaşadığınız olumlu bir şeyi yazın ve ekle\'ye basın...', PT: 'Escreva um positivo que viveu hoje e pressione adicionar...',
    RU: 'Напишите что-то хорошее из сегодняшнего дня и нажмите добавить...', JA: '今日体験したポジティブなことを書いて追加を押してください...',
    ZH: '写下今天经历的积极事物并按添加...', HI: 'आज अनुभव किया हुआ कोई सकारात्मक लिखें और जोड़ें दबाएं...'
  },
  writeNegativeToday: {
    AR: 'اكتب تحدياً أو موقفاً مزعجاً واضغط إضافة...', EN: 'Write a challenge or difficult situation and press add...',
    FR: 'Écrivez un défi ou une situation difficile et appuyez sur ajouter...', DE: 'Schreiben Sie eine Herausforderung oder schwierige Situation und drücken Sie Hinzufügen...',
    ES: 'Escribe un desafío o situación difícil y presiona agregar...', IT: 'Scrivi una sfida o situazione difficile e premi aggiungi...',
    TR: 'Bir zorluk veya zor durum yazın ve ekle\'ye basın...', PT: 'Escreva um desafio ou situação difícil e pressione adicionar...',
    RU: 'Напишите вызов или сложную ситуацию и нажмите добавить...', JA: '課題や困難な状況を書いて追加を押してください...',
    ZH: '写下挑战或困难情况并按添加...', HI: 'कोई चुनौती या कठिन स्थिति लिखें और जोड़ें दबाएं...'
  },
  prosConsAnalyzeAll: {
    AR: 'تحليل شامل لجميع تفاصيل اليوم (مذكرات، عادات، مهام، امتنان وقراءة):',
    EN: 'Comprehensive analysis of all day details (diaries, habits, tasks, gratitude & reading):',
    FR: 'Analyse complète de tous les détails de la journée:', DE: 'Umfassende Analyse aller Tagesdetails:',
    ES: 'Análisis completo de todos los detalles del día:', IT: 'Analisi completa di tutti i dettagli della giornata:',
    TR: 'Günün tüm ayrıntılarının kapsamlı analizi:', PT: 'Análise abrangente de todos os detalhes do dia:',
    RU: 'Комплексный анализ всех деталей дня:', JA: '一日の全詳細の包括的な分析：',
    ZH: '一天所有详情的全面分析：', HI: 'दिन के सभी विवरणों का व्यापक विश्लेषण:'
  },
  regenerateAll: {
    AR: 'إعادة التوليد الشامل 🔄', EN: 'Regenerate All 🔄',
    FR: 'Tout régénérer 🔄', DE: 'Alles neu generieren 🔄',
    ES: 'Regenerar todo 🔄', IT: 'Rigenera tutto 🔄',
    TR: 'Tümünü yeniden oluştur 🔄', PT: 'Regenerar tudo 🔄',
    RU: 'Перегенерировать всё 🔄', JA: 'すべて再生成 🔄',
    ZH: '重新生成全部 🔄', HI: 'सब पुनः उत्पन्न करें 🔄'
  },
  deleteThisPoint: {
    AR: 'حذف هذه النقطة', EN: 'Delete this point',
    FR: 'Supprimer ce point', DE: 'Diesen Punkt löschen',
    ES: 'Eliminar este punto', IT: 'Elimina questo punto',
    TR: 'Bu noktayı sil', PT: 'Excluir este ponto',
    RU: 'Удалить этот пункт', JA: 'このポイントを削除',
    ZH: '删除此点', HI: 'इस बिंदु को हटाएं'
  },
  generatingImageToast: {
    AR: 'جاري إنشاء التقرير كصورة... 📸', EN: 'Generating image report... 📸',
    FR: 'Génération du rapport en image... 📸', DE: 'Bildreport wird erstellt... 📸',
    ES: 'Generando informe como imagen... 📸', IT: 'Generazione del rapporto come immagine... 📸',
    TR: 'Resim raporu oluşturuluyor... 📸', PT: 'Gerando relatório de imagem... 📸',
    RU: 'Создание отчёта-изображения... 📸', JA: '画像レポートを生成中... 📸',
    ZH: '正在生成图像报告... 📸', HI: 'छवि रिपोर्ट बना रहे हैं... 📸'
  },
  imageSavedToast: {
    AR: 'تم حفظ الصورة في جهازك! 🖼️', EN: 'Image saved to your device! 🖼️',
    FR: 'Image enregistrée sur votre appareil! 🖼️', DE: 'Bild auf Ihrem Gerät gespeichert! 🖼️',
    ES: '¡Imagen guardada en tu dispositivo! 🖼️', IT: 'Immagine salvata sul tuo dispositivo! 🖼️',
    TR: 'Görüntü cihazınıza kaydedildi! 🖼️', PT: 'Imagem salva no seu dispositivo! 🖼️',
    RU: 'Изображение сохранено на вашем устройстве! 🖼️', JA: 'デバイスに画像が保存されました! 🖼️',
    ZH: '图像已保存到您的设备! 🖼️', HI: 'छवि आपके डिवाइस में सहेजी गई! 🖼️'
  },
  imageSaveError: {
    AR: 'حدث خطأ أثناء حفظ الصورة، يرجى إعادة المحاولة',
    EN: 'Error saving image, please try again',
    FR: 'Erreur lors de l\'enregistrement de l\'image, veuillez réessayer',
    DE: 'Fehler beim Speichern des Bildes, bitte erneut versuchen',
    ES: 'Error al guardar la imagen, por favor intente de nuevo',
    IT: 'Errore nel salvataggio dell\'immagine, riprovare',
    TR: 'Görüntü kaydedilirken hata oluştu, lütfen tekrar deneyin',
    PT: 'Erro ao salvar imagem, por favor tente novamente',
    RU: 'Ошибка сохранения изображения, попробуйте снова',
    JA: '画像の保存中にエラーが発生しました。再試行してください',
    ZH: '保存图像时出错，请重试', HI: 'छवि सहेजने में त्रुटि, कृपया पुनः प्रयास करें'
  },
  savingImage: {
    AR: 'جاري الحفظ...', EN: 'Saving...', FR: 'Enregistrement...', DE: 'Speichern...',
    ES: 'Guardando...', IT: 'Salvataggio...', TR: 'Kaydediliyor...', PT: 'Salvando...',
    RU: 'Сохранение...', JA: '保存中...', ZH: '保存中...', HI: 'सहेज रहे हैं...'
  },
  saveAsImage: {
    AR: 'حفظ كصورة', EN: 'Save as Image', FR: 'Enregistrer comme image',
    DE: 'Als Bild speichern', ES: 'Guardar como imagen', IT: 'Salva come immagine',
    TR: 'Resim olarak kaydet', PT: 'Salvar como imagem', RU: 'Сохранить как изображение',
    JA: '画像として保存', ZH: '保存为图像', HI: 'छवि के रूप में सहेजें'
  },
  analyzing: {
    AR: 'جاري التحليل...', EN: 'Analyzing...', FR: 'Analyse en cours...',
    DE: 'Analysiere...', ES: 'Analizando...', IT: 'Analisi in corso...',
    TR: 'Analiz ediliyor...', PT: 'Analisando...', RU: 'Анализирую...', JA: '分析中...',
    ZH: '分析中...', HI: 'विश्लेषण हो रहा है...'
  }
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

console.log('Dicts found:', Object.keys(dictBounds).join(', '));

const injections = [];
for (const langCode of LANG_CODES) {
  const bounds = dictBounds[langCode];
  if (!bounds) continue;
  const dictLines = lines.slice(bounds.start, bounds.end + 1);
  const toInject = [];
  for (const [keyName, translations] of Object.entries(NEW_KEYS)) {
    const value = translations[langCode];
    if (!value) continue;
    const alreadyExists = dictLines.some(l => l.trimStart().startsWith(`${keyName}:`));
    if (alreadyExists) continue;
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
