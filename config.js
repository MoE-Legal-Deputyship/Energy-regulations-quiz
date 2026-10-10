// Site settings — edit these values, no other file needs to change.
window.QUIZ_CONFIG = {
  title: "استبيان قياس فهم أنظمة قطاع الطاقة",
  intro:
    "يهدف هذا الاستبيان إلى قياس فهم أنظمة قطاع الطاقة. " +
    "وبعد الإنهاء تظهر نتيجتك مع الإجابة الصحيحة لكل سؤال وسندها النظامي وشرح مبسط لها.",

  // null = every question in data/questions.xlsx is asked, foundational to advanced, in a new
  // order with shuffled options on each attempt. To ask a random subset of a larger bank
  // instead, give a count per level (1 = الأول (تأسيسي), 2 = المتوسط, 3 = المتقدم), for
  // example { 1: 10, 2: 9, 3: 6 }. Levels are never shown to participants.
  questionsPerLevel: null,

  // Participants must pick one of these before starting.
  departments: [
    "الإدارة العامة للأنظمة واللوائح",
    "إدارة الاستشارات",
    "إدارة الدراسات القانونية",
    "الأمانة العامة للنظر في المخالفات",
    "إدارة التمثيل",
    "إدارة التحقيق",
    "إدارة العقود",
    "إدارة الاتفاقيات",
    "إدارة الدعم والمساندة",
  ],

  // Development advice shown under the score, in two parts:
  // 1. By knowledge type (column نوع المعرفة in the spreadsheet): every type the participant
  //    scored below `strong` % in is shown with its study advice from `skills` and the legal
  //    references of the missed questions. A type missing from `skills` gets no advice text.
  // 2. By regulation: below `review` % → `training`; from `review` to below `strong` % →
  //    `selfReview`; `strong` % or more → listed as a strength.
  // {النظام} is replaced by the regulation's name. Delete this block to hide the advice.
  advice: {
    strong: 75,
    review: 50,
    overall: [ // the first line whose `min` (total %) the participant reaches is shown
      { min: 85, text: "أداء متمكن، ففهمك لأنظمة قطاع الطاقة متين. حافظ عليه بمتابعة ما يطرأ عليها من تعديلات." },
      { min: 60, text: "أداء جيد ولديك أساس يُبنى عليه، والتركيز على المجالات المبيّنة أدناه سيرفع مستواك." },
      { min: 0, text: "أداء يحتاج إلى تطوير، ونوصي بخطة تطوير تبدأ بالمجالات المبيّنة أدناه." },
    ],
    skills: {
      "الاختصاص":
        "يظهر خلط في تحديد الجهة المختصة. ارسم خريطة «من يختص بماذا» بين الوزارة والهيئة واللجان في كل نظام، وقارن بين مواد الاختصاص المتقابلة، وانتبه إلى ما نقلته التعديلات من جهة إلى أخرى.",
      "المدد والإجراءات":
        "يظهر خلط في المدد والإجراءات. اجمع في جدول واحد المدد النظامية وأثر انقضائها (هل يُعد السكوت إذناً أم رفضاً)، وترتيب الإجراءات وجهة التظلم من كل قرار.",
      "الحدود والعقوبات":
        "يظهر خلط في الأرقام والأسقف. قارن في جدول واحد بين النسب وأسقف الغرامات والعقوبات في الأنظمة المختلفة، وميّز بين الإجراء العاجل والعقوبة.",
      "المفاهيم والتعريفات":
        "يظهر خلط في المصطلحات. ابدأ بمادة التعريفات (المادة الأولى) في كل نظام، وركّز على المصطلحات المتقاربة وما يترتب على كل تعريف من أثر.",
      "نطاق الأنظمة والعلاقة بينها":
        "يظهر خلط في تحديد النظام الحاكم. ارسم سلسلة القيمة من المنبع إلى المصب وحدد النظام الذي يحكم كل مرحلة، وموقع اتفاقية الامتياز من هذه الأنظمة.",
      "القيود والاستثناءات":
        "يظهر خلط بين الأصل والاستثناء. عند قراءة كل حكم حدد القاعدة أولاً ثم الاستثناء وشروطه ونطاقه، فأغلب هذه الأسئلة تختبر حدود الاستثناء.",
    },
    training: "نوصي بالالتحاق ببرنامج تدريبي في {النظام}.",
    selfReview: "نوصي بمراجعة {النظام}.",
  },

  // Shuffle the options of multiple-choice questions for every participant.
  shuffleOptions: true,

  // Each finished survey is saved as a row in the Supabase "results" table
  // (set up with tools/supabase-setup.sql). Both values are public by design: the key
  // only allows adding rows, not reading them. Empty both to stop collecting.
  results: {
    supabaseUrl: "https://vyazmdkvusrzlcexaqpu.supabase.co",
    supabaseKey: "sb_publishable_TOcWEQU5gZETZ7rM9kjBpg_Vsl_W9K5",
  },
};
