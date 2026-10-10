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

  // Development advice shown under the score. Each regulation is rated by the participant's
  // share of correct answers in it: below `review` % → training is recommended; from `review`
  // up to below `strong` % → self-review; `strong` % or more → listed as a strength. For the
  // regulations that need work, the legal references of the missed questions are listed.
  // {النظام} is replaced by the regulation's name. Delete this block to hide the advice.
  advice: {
    strong: 75,
    review: 50,
    overall: [ // the first line whose `min` (total %) the participant reaches is shown
      { min: 85, text: "أداء متمكن، ففهمك لأنظمة قطاع الطاقة متين. حافظ عليه بمتابعة ما يطرأ عليها من تعديلات." },
      { min: 60, text: "أداء جيد ولديك أساس يُبنى عليه، والتركيز على المجالات المبيّنة أدناه سيرفع مستواك." },
      { min: 0, text: "أداء يحتاج إلى تطوير، ونوصي بخطة تطوير تبدأ بالمجالات المبيّنة أدناه." },
    ],
    training: "نوصي بالالتحاق ببرنامج تدريبي في {النظام}، مع التركيز على:",
    selfReview: "نوصي بمراجعة {النظام}، ولا سيما:",
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
