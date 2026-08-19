import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, RotateCcw, Volume2, VolumeX, Moon, Sun, Plus, Minus,
  CheckCircle2, Sparkles, BookOpen, Award, Shield,
  RefreshCw, Layers, Edit3, Trash2, ArrowRight, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { updateAthkarContextOnTap } from '../services/aiAthkarSync';
import { getTranslation } from '../lib/languages';
import type { AppLanguage } from '../types';

export interface AthkarItem {
  id: string;
  text: string;
  count: number;
  virtue?: string;
  source?: string;
  categoryKey?: string;
  isCustom?: boolean;
}

export const ALL_CATEGORY_OPTIONS = [
  { key: 'general', label: 'السبحة العامة' },
  { key: 'morning', label: 'أذكار الصباح' },
  { key: 'evening', label: 'أذكار المساء' },
  { key: 'salawat', label: 'الصلاة على النبي' },
  { key: 'istighfar', label: 'الاستغفار' },
  { key: 'hawqala', label: 'الحوقلة' },
  { key: 'baqiyat', label: 'الباقيات الصالحات' },
  { key: 'younus', label: 'دعاء يونس' },
  { key: 'tawheed', label: 'ذكر التوحيد' },
  { key: 'post_prayer', label: 'أذكار بعد الصلاة' },
  { key: 'sleep', label: 'أذكار النوم' },
  { key: 'custom', label: 'أذكاري الخاصة' },
];

export const ATHKAR_CATEGORIES: Record<string, { title: string; items: AthkarItem[] }> = {
  general: {
    title: "السبحة العامة",
    items: [
      {
        id: "g1",
        text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
        count: 100,
        virtue: "كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن.",
        source: "متفق عليه (البخاري ومسلم)"
      },
      {
        id: "g2",
        text: "سُبْحَانَ اللَّهِ",
        count: 33,
        source: "رواه مسلم"
      },
      {
        id: "g3",
        text: "الْحَمْدُ لِلَّهِ",
        count: 33,
        source: "رواه مسلم"
      },
      {
        id: "g4",
        text: "اللَّهُ أَكْبَرُ",
        count: 33,
        source: "رواه مسلم"
      }
    ]
  },
  morning: {
    title: "أذكار الصباح",
    items: [
      {
        id: "m1",
        text: "آيَةُ الْكُرْسِيِّ: {اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ}",
        count: 1,
        virtue: "من قالها حين يصبح أُجير من الجن حتى يمسي.",
        source: "رواه الحاكم وصححه الألباني"
      },
      {
        id: "m2",
        text: "سُورَةُ الإِخْلاَصِ: {قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ}",
        count: 3,
        virtue: "تعدل ثلث القرآن، وتكفيك من كل شيء إذا قرأتها مع المعوذتين.",
        source: "رواه الترمذي وأبو داود"
      },
      {
        id: "m3",
        text: "سُورَةُ الْفَلَقِ: {قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِن شَرِّ مَا خَلَقَ ۝ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ}",
        count: 3,
        virtue: "الحماية والوقاية من السحر والحسد والشرور.",
        source: "رواه الترمذي وأبو داود"
      },
      {
        id: "m4",
        text: "سُورَةُ النَّاسِ: {قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَٰهِ النَّاسِ ۝ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ}",
        count: 3,
        virtue: "الحصن الحصين من الوساوس والشرور.",
        source: "رواه الترمذي وأبو داود"
      },
      {
        id: "m5",
        text: "أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ.",
        count: 1,
        virtue: "إقرار بالعبودية وتوكل كامل على الله لطلب خير اليوم ودفعه شره.",
        source: "رواه مسلم"
      },
      {
        id: "m6",
        text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ.",
        count: 1,
        source: "رواه الترمذي"
      },
      {
        id: "m7",
        text: "سَيِّدُ الاِسْتِغْفَارِ: اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ.",
        count: 1,
        virtue: "سيد الاستغفار: من قالها موقناً بها حين يصبح فمات من يومه دخل الجنة.",
        source: "رواه البخاري"
      },
      {
        id: "m8",
        text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.",
        count: 3,
        virtue: "كان حقاً على الله أن يرضيه يوم القيامة.",
        source: "رواه أصحاب السنن"
      },
      {
        id: "m9",
        text: "بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.",
        count: 3,
        virtue: "من قالها ثلاثاً إذا أصبح لم يضره شيء في ذلك اليوم.",
        source: "رواه الترمذي وأبو داود"
      },
      {
        id: "m10",
        text: "حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ (أواخر سورة التوبة).",
        count: 7,
        virtue: "من قالها حين يصبح وحين يمسي سبع مرات كفاه الله ما أهمه من أمر الدنيا والآخرة.",
        source: "رواه أبو داود"
      },
      {
        id: "m11",
        text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلاَ تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ.",
        count: 3,
        virtue: "تفويض الأمر لله وصلاح الشأن كله.",
        source: "رواه الحاكم وصححه الألباني"
      },
      {
        id: "m12",
        text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لاَ إِلَهَ إِلاَّ أَنْتَ.",
        count: 3,
        virtue: "طلب العافية والوقاية في البدن والسمع والبصر.",
        source: "رواه أبو داود"
      },
      {
        id: "m13",
        text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ.",
        count: 3,
        virtue: "تعدل أذكاراً كثيرة وطويلة في الفضل والميزان.",
        source: "رواه مسلم"
      },
      {
        id: "m14",
        text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ.",
        count: 100,
        virtue: "من قالها مائة مرة حُطَّتْ خطاياه وإن كانت مثل زبد البحر.",
        source: "رواه مسلم"
      },
      {
        id: "m15",
        text: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ.",
        count: 10,
        virtue: "من صلى عليّ حين يصبح عشراً أدركته شفاعتي يوم القيامة.",
        source: "رواه الطبراني"
      }
    ]
  },
  evening: {
    title: "أذكار المساء",
    items: [
      {
        id: "e1",
        text: "آيَةُ الْكُرْسِيِّ: {اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ}",
        count: 1,
        virtue: "من قالها حين يمسي أُجير من الجن حتى يصبح.",
        source: "رواه الحاكم"
      },
      {
        id: "e2",
        text: "سُورَةُ الإِخْلاَصِ ، وَسُورَةُ الْفَلَقِ ، وَسُورَةُ النَّاسِ (3 مرات لكل سورة)",
        count: 3,
        virtue: "تكفيك من كل شيء في ليلتك وتدفع المكر والشرور.",
        source: "رواه الترمذي وأبو داود"
      },
      {
        id: "e3",
        text: "أَمْسَيْنَا وَأَمْسَى المُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ.",
        count: 1,
        source: "رواه مسلم"
      },
      {
        id: "e4",
        text: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ المَصِيرُ.",
        count: 1,
        source: "رواه الترمذي"
      },
      {
        id: "e5",
        text: "سَيِّدُ الاِسْتِغْفَارِ: اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ.",
        count: 1,
        virtue: "من قالها موقناً بها حين يمسي فمات من ليلته دخل الجنة.",
        source: "رواه البخاري"
      },
      {
        id: "e6",
        text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.",
        count: 3,
        virtue: "من قالها لم تضره حمة (لدغة أو ذو سم) في تلك الليلة.",
        source: "رواه مسلم"
      },
      {
        id: "e7",
        text: "بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ.",
        count: 3,
        virtue: "لم تصبه فجأة بلاء حتى يصبح.",
        source: "رواه أبو داود والترمذي"
      },
      {
        id: "e8",
        text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا.",
        count: 3,
        virtue: "كان حقاً على الله أن يرضيه يوم القيامة.",
        source: "رواه أبو داود"
      },
      {
        id: "e9",
        text: "حَسْبِيَ اللَّهُ لاَ إِلَهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ.",
        count: 7,
        virtue: "كفاه الله ما أهمه من أمر الدنيا والآخرة.",
        source: "رواه أبو داود"
      },
      {
        id: "e10",
        text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ.",
        count: 3,
        source: "رواه أبو داود"
      },
      {
        id: "e11",
        text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ (100 مرة).",
        count: 100,
        virtue: "لم يأت أحد يوم القيامة بأفضل مما جاء به إلا أحد قال مثل ما قال أو زاد عليه.",
        source: "رواه مسلم"
      }
    ]
  },
  salawat: {
    title: "الصلاة على النبي",
    items: [
      {
        id: "sw1",
        text: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا وَحَبِيبِنَا مُحَمَّدٍ",
        count: 10,
        virtue: "من صلى عليّ صلاة واحدة صلى الله عليه بها عشراً وحط عنه عشر سيئات.",
        source: "رواه مسلم والنسائي"
      },
      {
        id: "sw2",
        text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ",
        count: 10,
        virtue: "الصلاة الإبراهيمية التامة العظيمة.",
        source: "رواه البخاري ومسلم"
      },
      {
        id: "sw3",
        text: "اللَّهُمَّ صَلِّ عَلَى نَبِيِّنَا مُحَمَّدٍ",
        count: 100,
        virtue: "تكفى همك ويغفر ذنبك ويشرح صدرك.",
        source: "رواه الترمذي"
      }
    ]
  },
  istighfar: {
    title: "الاستغفار",
    items: [
      {
        id: "is1",
        text: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
        count: 100,
        virtue: "من قالها غُفرت ذنوبه وإن كان قد فر من الزحف، ومن لزم الاستغفار جعل الله له من كل ضيق مخرجاً.",
        source: "رواه أبو داود والترمذي"
      },
      {
        id: "is2",
        text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
        count: 100,
        virtue: "سنة النبي صلى الله عليه وسلم اليومية للتطهير وتجديد التوبة.",
        source: "رواه مسلم"
      },
      {
        id: "is3",
        text: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ",
        count: 100,
        virtue: "دعاء نبوي مأثور في المجالس لتيسير الأمور وغفران الخطايا.",
        source: "رواه الترمذي"
      }
    ]
  },
  hawqala: {
    title: "الحوقلة",
    items: [
      {
        id: "hq1",
        text: "لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
        count: 100,
        virtue: "كنز من كنوز الجنة، ودواء من تسعة وتسعين داء أيسرها الهم والغم ومفتاح كل فرج.",
        source: "رواه البخاري ومسلم والطبراني"
      }
    ]
  },
  baqiyat: {
    title: "الباقيات الصالحات",
    items: [
      {
        id: "bq1",
        text: "سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلاَ إِلَهَ إِلاَّ اللَّهُ ، وَاللَّهُ أَكْبَرُ",
        count: 33,
        virtue: "أحب الكلام إلى الله تعالى، وهن الباقيات الصالحات وغراس الجنة.",
        source: "رواه مسلم والترمذي"
      },
      {
        id: "bq2",
        text: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلاَ إِلَهَ إِلاَّ اللَّهُ وَاللَّهُ أَكْبَرُ وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
        count: 10,
        virtue: "ما على الأرض أحد يقولها إلا كُفِّرت عنه خطايا ولو كانت مثل زبد البحر.",
        source: "رواه أحمد والترمذي"
      }
    ]
  },
  younus: {
    title: "دعاء يونس",
    items: [
      {
        id: "yn1",
        text: "لاَ إِلَهَ إِلاَّ أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        count: 33,
        virtue: "دعوة ذي النون إذ دعا وهو في بطن الحوت: لم يدع بها رجل مسلم في شيء قط إلا استجاب الله له وفرج كربه.",
        source: "رواه الترمذي والحاكم"
      }
    ]
  },
  tawheed: {
    title: "ذكر التوحيد",
    items: [
      {
        id: "tw1",
        text: "لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        count: 100,
        virtue: "كانت له عدل عشر رقاب، وكتبت له مائة حسنة، ومحيت عنه مائة سيئة، وكانت له حرزاً من الشيطان يومه ذلك حتى يمسي.",
        source: "متفق عليه"
      },
      {
        id: "tw2",
        text: "لاَ إِلَهَ إِلاَّ اللَّهُ",
        count: 100,
        virtue: "أفضل الذكر لا إله إلا الله، وأعظم كلمة توحيد تفك الكروب.",
        source: "رواه الترمذي وابن ماجه"
      }
    ]
  },
  post_prayer: {
    title: "أذكار بعد الصلاة",
    items: [
      {
        id: "p1",
        text: "أَسْتَغْفِرُ اللَّهَ (ثَلاَثاً) .. اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالإِكْرَامِ.",
        count: 1,
        source: "رواه مسلم"
      },
      {
        id: "p2",
        text: "لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ المُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لاَ مَانِعَ لِمَا أَعْطَيْتَ، وَلاَ مُعْطِيَ لِمَا مَنَعْتَ، وَلاَ يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ.",
        count: 1,
        source: "متفق عليه"
      },
      {
        id: "p3",
        text: "سُبْحَانَ اللَّهِ (33) ، الْحَمْدُ لِلَّهِ (33) ، اللَّهُ أَكْبَرُ (33) .. وتمام المائة: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.",
        count: 33,
        virtue: "غُفرت خطاياه وإن كانت مثل زبد البحر.",
        source: "رواه مسلم"
      },
      {
        id: "p4",
        text: "آيَةُ الْكُرْسِيِّ عقب كل صلاة مَكْتُوبَةٍ.",
        count: 1,
        virtue: "من قرأ آية الكرسي دبر كل صلاة مكتوبة لم يمنعه من دخول الجنة إلا أن يموت.",
        source: "رواه النسائي"
      }
    ]
  },
  sleep: {
    title: "أذكار النوم",
    items: [
      {
        id: "s1",
        text: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ.",
        count: 1,
        source: "متفق عليه"
      },
      {
        id: "s2",
        text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ.",
        count: 3,
        source: "رواه الترمذي"
      },
      {
        id: "s3",
        text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا.",
        count: 1,
        source: "رواه البخاري"
      },
      {
        id: "s4",
        text: "سُبْحَانَ اللَّهِ (33)، وَالْحَمْدُ لِلَّهِ (33)، وَاللَّهُ أَكْبَرُ (34)",
        count: 34,
        virtue: "قالها النبي لعلي وفاطمة رضي الله عنهما: خير لكما من خادم.",
        source: "متفق عليه"
      }
    ]
  }
};

interface FullAthkarModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export default function FullAthkarModal({ isOpen, onClose, initialTab = 'morning', appLanguage = 'ar' }: FullAthkarModalProps) {
  const t = getTranslation(appLanguage);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('yawmiyaty_dhikr_active_tab') || initialTab;
  });
  const [fontSize, setFontSize] = useState<number>(20);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('yawmiyaty_dhikr_sound');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Custom Athkar from localStorage
  const [customAthkar, setCustomAthkar] = useState<AthkarItem[]>(() => {
    try {
      const saved = localStorage.getItem('yawmiyaty_custom_dhikr');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal Form State for Custom Dhikr
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AthkarItem | null>(null);
  const [newDhikrText, setNewDhikrText] = useState<string>('');
  const [newDhikrCount, setNewDhikrCount] = useState<number>(33);
  const [newDhikrCategory, setNewDhikrCategory] = useState<string>(activeTab);
  const [newDhikrVirtue, setNewDhikrVirtue] = useState<string>('');

  // Reload custom athkar & tab navigation when event is fired from anywhere
  useEffect(() => {
    const handleReload = () => {
      try {
        const saved = localStorage.getItem('yawmiyaty_custom_dhikr');
        if (saved) setCustomAthkar(JSON.parse(saved));
      } catch { /* ignore */ }
    };
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
        localStorage.setItem('yawmiyaty_dhikr_active_tab', customEvent.detail);
      }
    };
    window.addEventListener('storage_custom_dhikr_updated', handleReload);
    window.addEventListener('yawmiyaty_navigate_athkar_tab', handleNav);
    return () => {
      window.removeEventListener('storage_custom_dhikr_updated', handleReload);
      window.removeEventListener('yawmiyaty_navigate_athkar_tab', handleNav);
    };
  }, []);

  // Compute merged items for activeTab (static items + custom items assigned to this category)
  const currentCategoryItems = useMemo(() => {
    const customForTab = customAthkar.filter(item => {
      if (activeTab === 'custom') {
        return !item.categoryKey || item.categoryKey === 'custom';
      }
      return item.categoryKey === activeTab;
    });

    const staticItems = ATHKAR_CATEGORIES[activeTab]?.items || [];
    return [...staticItems, ...customForTab];
  }, [activeTab, customAthkar]);

  // Counts state per item: { [itemId]: remainingCount }
  const [counts, setCounts] = useState<Record<string, number>>({});

  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Initialize or load current counts & handle daily auto-reset
  useEffect(() => {
    if (!isOpen) return;

    // Check last date to handle midnight reset
    const lastDate = localStorage.getItem('yawmiyaty_athkar_last_reset_date');
    if (lastDate !== todayDateStr) {
      localStorage.setItem('yawmiyaty_athkar_last_reset_date', todayDateStr);
    }

    const storageKey = `yawmiyaty_athkar_progress_${todayDateStr}_${activeTab}`;
    const savedProgress = localStorage.getItem(storageKey);

    const initialCounts: Record<string, number> = {};
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        currentCategoryItems.forEach(item => {
          initialCounts[item.id] = parsed[item.id] !== undefined ? parsed[item.id] : item.count;
        });
      } catch {
        currentCategoryItems.forEach(item => { initialCounts[item.id] = item.count; });
      }
    } else {
      currentCategoryItems.forEach(item => {
        initialCounts[item.id] = item.count;
      });
    }

    setCounts(initialCounts);
  }, [isOpen, activeTab, todayDateStr, currentCategoryItems]);

  // Save progress & update AI context whenever counts change
  useEffect(() => {
    if (!isOpen || Object.keys(counts).length === 0) return;

    const storageKey = `yawmiyaty_athkar_progress_${todayDateStr}_${activeTab}`;
    localStorage.setItem(storageKey, JSON.stringify(counts));

    const totalTarget = currentCategoryItems.reduce((acc, item) => acc + item.count, 0);
    const totalRemaining = currentCategoryItems.reduce((acc, item) => acc + (counts[item.id] ?? item.count), 0);
    const completedCount = totalTarget - totalRemaining;
    const progressPercent = totalTarget > 0 ? Math.round((completedCount / totalTarget) * 100) : 0;

    // AI context
    const aiContextData = {
      date: todayDateStr,
      activeTab,
      categoryTitle: activeTab === 'custom' ? 'أذكاري الخاصة' : ATHKAR_CATEGORIES[activeTab]?.title || activeTab,
      totalTarget,
      completedCount,
      progressPercent,
      isFullyCompleted: progressPercent === 100,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('yawmiyaty_ai_athkar_context', JSON.stringify(aiContextData));

    // Total stats
    const statsStr = localStorage.getItem('yawmiyaty_athkar_stats');
    let stats = { totalTapsToday: 0, date: todayDateStr };
    try {
      if (statsStr) {
        const p = JSON.parse(statsStr);
        if (p.date === todayDateStr) stats = p;
      }
    } catch { /* ignore */ }
    localStorage.setItem('yawmiyaty_athkar_stats', JSON.stringify(stats));

  }, [counts, isOpen, activeTab, todayDateStr, currentCategoryItems]);

  // Audio effect using Web Audio API
  const playClickSound = (isDone = false) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isDone ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isDone ? 880 : 520, audioCtx.currentTime);
      if (isDone) {
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.exponentialRampToValueAtTime(380, audioCtx.currentTime + 0.05);
      }

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isDone ? 0.25 : 0.08));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + (isDone ? 0.25 : 0.08));
    } catch {
      // Audio not supported or blocked by browser policy
    }
  };

  const handleDecrement = (item: AthkarItem) => {
    const currentVal = counts[item.id] ?? item.count;
    if (currentVal <= 0) return;

    const newVal = currentVal - 1;
    setCounts(prev => ({ ...prev, [item.id]: newVal }));

    playClickSound(newVal === 0);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(newVal === 0 ? [50, 50, 50] : 25);
    }

    const catTitle = activeTab === 'custom' ? 'أذكاري الخاصة' : ATHKAR_CATEGORIES[activeTab]?.title || activeTab;
    updateAthkarContextOnTap({
      category: catTitle,
      lastDhikrRead: item.text,
      remainingInCategory: newVal,
      incrementTaps: 1
    });
  };

  const handleResetCurrentTab = () => {
    const resetCounts: Record<string, number> = {};
    currentCategoryItems.forEach(item => {
      resetCounts[item.id] = item.count;
    });
    setCounts(resetCounts);
  };

  const handleSaveCustomDhikr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDhikrText.trim()) return;

    const countNum = Math.max(1, Number(newDhikrCount) || 33);

    let updated: AthkarItem[];
    if (editingItem) {
      updated = customAthkar.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            text: newDhikrText.trim(),
            count: countNum,
            categoryKey: newDhikrCategory,
            virtue: newDhikrVirtue.trim() || undefined,
            isCustom: true
          };
        }
        return item;
      });
    } else {
      const newItem: AthkarItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: newDhikrText.trim(),
        count: countNum,
        categoryKey: newDhikrCategory,
        virtue: newDhikrVirtue.trim() || undefined,
        isCustom: true
      };
      updated = [...customAthkar, newItem];
      setCounts(prev => ({ ...prev, [newItem.id]: newItem.count }));
    }

    setCustomAthkar(updated);
    localStorage.setItem('yawmiyaty_custom_dhikr', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage_custom_dhikr_updated'));

    // Update AI Athkar Context with the new custom dhikr
    try {
      updateAthkarContextOnTap({
        category: newDhikrCategory || 'أذكاري الخاصة',
        lastDhikrRead: newDhikrText.trim(),
        remainingInCategory: countNum,
        incrementTaps: 0
      });
    } catch { /* ignore */ }

    setNewDhikrText('');
    setNewDhikrCount(33);
    setNewDhikrVirtue('');
    setEditingItem(null);
    setShowAddCustomModal(false);
  };

  const handleDeleteCustom = (id: string) => {
    const updated = customAthkar.filter(item => item.id !== id);
    setCustomAthkar(updated);
    localStorage.setItem('yawmiyaty_custom_dhikr', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage_custom_dhikr_updated'));
  };

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('yawmiyaty_dhikr_sound', JSON.stringify(newVal));
  };

  const totalTarget = useMemo(() => {
    return currentCategoryItems.reduce((acc, item) => acc + item.count, 0);
  }, [currentCategoryItems]);

  const completedCount = useMemo(() => {
    return currentCategoryItems.reduce((acc, item) => {
      const rem = counts[item.id] !== undefined ? counts[item.id] : item.count;
      return acc + (item.count - rem);
    }, 0);
  }, [currentCategoryItems, counts]);

  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((completedCount / totalTarget) * 100)) : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* FULL VIEWPORT MODE: fixed inset-0 w-screen h-screen min-h-[100dvh] z-[9999] bg-slate-950 */}
      <div className="fixed inset-0 w-screen h-screen min-h-[100dvh] z-[9999] bg-slate-950 text-amber-50 flex flex-col dir-rtl overflow-hidden select-none">
        
        {/* Top Full Viewport Header - Compact Single Row Optimization */}
        <div className={`px-2.5 py-1.5 sm:px-4 sm:py-2 border-b flex items-center justify-between gap-1.5 shrink-0 shadow-md relative z-[10000] ${
          isDarkMode ? 'bg-slate-950/95 border-amber-500/20' : 'bg-amber-100 text-slate-900 border-amber-600/30'
        }`}>
          {/* Right Section: Back Navigation Arrow + Title & Integrated Inline Progress Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-hidden">
            {/* 1. Back Navigation Arrow Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-300 border-2 border-amber-500/50 hover:border-amber-400 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5 font-black text-xs shadow-lg group"
              title={t.back || "Back"}
            >
              <ArrowRight className="w-5 h-5 text-amber-300 group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-sans">{t.back || "Back"}</span>
            </button>

            <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            
            <h2 className="text-xs sm:text-sm font-black font-serif text-amber-100 whitespace-nowrap truncate">
              حصن المسلم
            </h2>

            {/* Merged Inline Progress Bar */}
            <div className="hidden lg:flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-full border border-amber-500/20 text-[11px] shrink-0">
              <span className="text-amber-300/80 font-sans font-medium">الإنجاز:</span>
              <span className="font-mono font-bold text-amber-300">{progressPercent}%</span>
              <div className="w-16 sm:w-24 h-2 bg-slate-900 rounded-full overflow-hidden border border-amber-500/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Left Section: Compact Action Tools & Exit Button */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Font Size controls */}
            <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-amber-500/20 text-[11px]">
              <button
                onClick={() => setFontSize(prev => Math.max(14, prev - 2))}
                className="p-1 hover:bg-amber-500/20 rounded text-amber-300 transition-colors"
                title={t.decreaseFontSize || "تصغير الخط"}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-1.5 font-mono font-bold text-amber-200">{fontSize}px</span>
              <button
                onClick={() => setFontSize(prev => Math.min(36, prev + 2))}
                className="p-1 hover:bg-amber-500/20 rounded text-amber-300 transition-colors"
                title={t.increaseFontSize || "تكبير الخط"}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors"
              title={isDarkMode ? "الوضع النهاري" : "الوضع الليلي"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-zinc-800/40 border-zinc-700 text-zinc-400'
              }`}
              title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reset Current Tab */}
            <button
              onClick={handleResetCurrentTab}
              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-colors"
              title={t.resetDailyCounters || "إعادة تصفير العدادات اليومية"}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Sleek Exit / Close Button */}
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-all font-sans font-bold text-xs shadow-sm cursor-pointer"
              title={t.closeFullScreen || "إغلاق الشاشة الكاملة"}
            >
              <X className="w-4 h-4 text-rose-300" />
              <span className="hidden xs:inline">{t.closeBtn || "إغلاق"}</span>
            </button>
          </div>
        </div>

        {/* Compact Navigation Category Bar */}
        <div className="px-2 py-1.5 overflow-x-auto flex items-center gap-1.5 border-b border-amber-500/15 bg-slate-900/90 no-scrollbar shrink-0">
          {Object.entries(ATHKAR_CATEGORIES).map(([key, cat]) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  localStorage.setItem('yawmiyaty_dhikr_active_tab', key);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/30 via-emerald-600/40 to-amber-500/30 text-amber-100 border border-amber-400/60 shadow-md scale-[1.02]'
                    : 'text-zinc-400 hover:text-amber-200 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <Sparkles className={`w-3 h-3 ${isActive ? 'text-amber-300 animate-pulse' : 'text-zinc-500'}`} />
                {cat.title}
              </button>
            );
          })}

          <button
            onClick={() => {
              setActiveTab('custom');
              localStorage.setItem('yawmiyaty_dhikr_active_tab', 'custom');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-gradient-to-r from-amber-500/30 via-emerald-600/40 to-amber-500/30 text-amber-100 border border-amber-400/60 shadow-md scale-[1.02]'
                : 'text-zinc-400 hover:text-amber-200 hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Layers className="w-3 h-3 text-amber-400" />
            {t.customDhikrCategory || "أذكاري الخاصة"} ({customAthkar.length})
          </button>
        </div>

        {/* Main Immersion Scroll Area - Maximized Area for Reading Text */}
        <div className={`flex-1 overflow-y-auto px-3 sm:px-6 py-3 pb-8 sm:pb-12 space-y-4 max-w-4xl mx-auto w-full ${
          isDarkMode 
            ? 'bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950' 
            : 'bg-amber-50/40 text-slate-900'
        }`}>
          {/* Global Add Dhikr Button Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-lg">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-sans font-bold text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span>{t.addNewDhikrMessage || "إضافة ذكر جديد مخصص للقسم الحالي أو أي قسم آخر"}</span>
            </div>
            <button
              onClick={() => {
                setEditingItem(null);
                setNewDhikrText('');
                setNewDhikrCount(33);
                setNewDhikrCategory(activeTab);
                setNewDhikrVirtue('');
                setShowAddCustomModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-slate-950 font-black" />
              <span>{t.addNewDhikrSection || "إضافة ذكر جديد (+)"}</span>
            </button>
          </div>

          {currentCategoryItems.length === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40 text-amber-400" />
              <p className="text-lg font-sans font-bold">{t.noCustomDhikrYet || "لا توجد أذكار مضافة حالياً في هذا القسم."}</p>
              <p className="text-xs font-sans text-amber-300/80 mt-1.5">
                {t.addDhikrHint || "يمكنك إستخدام زر \"إضافة ذكر جديد (+)\" أعلى الصفحة لإضافة ذكر إلى هذا القسم بسهولة."}
              </p>
            </div>
          ) : (
            currentCategoryItems.map((item, index) => {
              const remaining = counts[item.id] !== undefined ? counts[item.id] : item.count;
              const isCompleted = remaining === 0;
              const isUserCustom = item.isCustom || customAthkar.some(c => c.id === item.id);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`relative p-4 sm:p-6 rounded-2xl border transition-all duration-300 shadow-xl ${
                    isCompleted
                      ? 'bg-emerald-950/30 border-emerald-500/40 opacity-80'
                      : isDarkMode
                      ? 'bg-slate-900/90 border-amber-500/25 hover:border-amber-500/50 shadow-black/60'
                      : 'bg-white/95 border-amber-600/30 hover:border-amber-600/50'
                  }`}
                >
                  {/* Badge & Item Header */}
                  <div className="flex items-center justify-between mb-3 border-b border-amber-500/15 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans font-black px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                        {t.dhikrNumberLabel || "الذكر #"} {index + 1}
                      </span>
                      {isUserCustom && (
                        <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t.customDhikrLabel || "ذكر مخصص"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isUserCustom && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setNewDhikrText(item.text);
                              setNewDhikrCount(item.count);
                              setNewDhikrCategory(item.categoryKey || activeTab);
                              setNewDhikrVirtue(item.virtue || '');
                              setShowAddCustomModal(true);
                            }}
                            className="p-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors"
                            title={t.editCustomDhikr || "تعديل الذكر"}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustom(item.id)}
                            className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors"
                            title={t.deleteDhikr || "حذف الذكر"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-xs font-sans font-black text-emerald-400 bg-emerald-500/15 px-3 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t.completedPraise || "تم بحمد الله"}
                        </span>
                      ) : (
                        <span className="text-xs font-sans text-zinc-400">
                          {t.requiredCount || "العدد المطلوب:"} <strong className="text-amber-300 font-mono text-sm">{item.count}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Dhikr Vocalized Text - Enlarged & Clear */}
                  <p 
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                    className={`font-serif font-bold mb-4 text-justify leading-relaxed tracking-wide ${
                      isCompleted ? 'text-emerald-200/80 line-through decoration-emerald-500/50' : 'text-amber-50'
                    }`}
                  >
                    {item.text}
                  </p>

                  {/* Virtue & Hadith Source Box */}
                  {(item.virtue || item.source) && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans text-amber-200/90 space-y-1">
                      {item.virtue && (
                        <p className="flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong>{t.virtue || "Virtue"}:</strong> {item.virtue}</span>
                        </p>
                      )}
                      {item.source && (
                        <p className="text-amber-300/70 text-[11px] font-mono pt-1 border-t border-amber-500/10">
                          {t.source || "Source"}: {item.source}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Easy-to-Tap Counter Action Bar */}
                  <div className="flex items-center justify-between pt-1 gap-3">
                    <button
                      onClick={() => {
                        setCounts(prev => ({ ...prev, [item.id]: item.count }));
                      }}
                      className="text-xs font-sans text-zinc-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      title={t.resetThisDhikr || "Reset this dhikr"}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t.resetThisDhikr || "إعادة"}
                    </button>

                    <button
                      onClick={() => handleDecrement(item)}
                      disabled={isCompleted}
                      className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-black font-sans text-sm sm:text-base flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer active:scale-95 ${
                        isCompleted
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-amber-500/30 border border-amber-200/50'
                      }`}
                    >
                      <span>{isCompleted ? (t.dhikrCompleted || "Completed ✨") : (t.tapToCount || "Tap to count")}</span>
                      <span className="w-8 h-8 rounded-lg bg-slate-950/80 text-amber-300 flex items-center justify-center font-mono text-lg font-black border border-amber-400/40 shadow-inner">
                        {remaining}
                      </span>
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Compact Footer Info Bar */}
        <div className="px-3 py-1.5 border-t border-amber-500/15 bg-slate-950/95 text-[11px] sm:text-xs font-sans text-amber-200/70 flex items-center justify-between shrink-0 h-9">
          <span className="flex items-center gap-1.5 truncate">
            <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{t.aiLiveSyncAutoSave || "Live AI sync & auto-save"}</span>
          </span>
          <button
            onClick={handleResetCurrentTab}
            className="text-amber-400 hover:underline flex items-center gap-1 font-bold shrink-0 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.resetCurrentSection || "تصفير القسم الحالي"}
          </button>
        </div>

        {/* Add / Edit Custom Dhikr Modal */}
        {showAddCustomModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-zinc-900 border-2 border-amber-500/40 rounded-3xl p-5 text-right font-sans space-y-4 shadow-2xl dir-rtl">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <h4 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  {editingItem ? (t.editCustomDhikr || "Edit Custom Dhikr") : (t.addNewDhikr || "Add New Dhikr (+)")}
                </h4>
                <button
                  onClick={() => setShowAddCustomModal(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomDhikr} className="space-y-3.5">
                {/* Text Field */}
                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1">
                    نص الذكر / الدعاء:
                  </label>
                  <textarea
                    rows={3}
                    value={newDhikrText}
                    onChange={(e) => setNewDhikrText(e.target.value)}
                    placeholder={t.enterDhikrText || "Enter dhikr or supplication text..."}
                    required
                    className="w-full bg-zinc-800/90 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-serif leading-relaxed"
                  />
                </div>

                {/* Category Selection Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1">
                    تحديد القسم المعني:
                  </label>
                  <select
                    value={newDhikrCategory}
                    onChange={(e) => setNewDhikrCategory(e.target.value)}
                    className="w-full bg-zinc-800/90 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400 font-bold"
                  >
                    {ALL_CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key} className="bg-zinc-900 text-amber-100">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Count Input */}
                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1">
                    العدد المطلوب (تكرار العداد):
                  </label>
                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={1}
                        max={999999}
                        placeholder={t.enterCustomCount || "Enter any custom count..."}
                        value={newDhikrCount || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                          setNewDhikrCount(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        onBlur={() => {
                          if (!newDhikrCount || newDhikrCount <= 0) {
                            setNewDhikrCount(33);
                          }
                        }}
                        className="w-full bg-zinc-800/90 border-2 border-amber-500/40 rounded-xl p-2.5 text-sm text-amber-100 font-mono font-bold focus:outline-none focus:border-amber-400 placeholder:text-zinc-500 placeholder:font-sans placeholder:text-xs shadow-inner"
                      />
                      <span className="absolute left-3 text-xs font-sans font-bold text-amber-400/80 pointer-events-none">
                        مرة
                      </span>
                    </div>

                    {/* Quick count presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-zinc-400 font-sans">{t.quickCounts || "Quick counts:"}</span>
                      {[3, 10, 33, 100, 500, 1000].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setNewDhikrCount(cnt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                            newDhikrCount === cnt
                              ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-sm scale-105'
                              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/80 hover:text-amber-200 hover:border-amber-500/40'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Optional Virtue Input */}
                <div>
                  <label className="block text-xs font-bold text-amber-200/90 mb-1">
                    فضل الذكر / ملاحظة (اختياري):
                  </label>
                  <input
                    type="text"
                    value={newDhikrVirtue}
                    onChange={(e) => setNewDhikrVirtue(e.target.value)}
                    placeholder={t.dhikrVirtuePlaceholder || "e.g., Whoever says this..."}
                    className="w-full bg-zinc-800/90 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
                  >
                    {t.cancel || "إلغاء"}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-600 text-slate-950 text-xs font-black hover:opacity-95 shadow-md"
                  >
                    {t.saveDhikr || "حفظ الذكر"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AnimatePresence>
  );
}
