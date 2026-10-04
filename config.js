// Site settings — edit these values, no other file needs to change.
window.QUIZ_CONFIG = {
  title: "استبيان قياس فهم أنظمة قطاع الطاقة",
  intro:
    "يهدف هذا الاستبيان إلى قياس فهم أنظمة قطاع الطاقة. تُختار الأسئلة عشوائياً في كل محاولة، " +
    "وبعد الإنهاء تظهر نتيجتك مع الإجابة الصحيحة لكل سؤال وسندها النظامي وشرح مبسط لها.",

  // Questions drawn from each level in one attempt (1 = الأول (تأسيسي), 2 = المتوسط, 3 = المتقدم).
  // 10 + 9 + 6 = 25 questions. Levels are used for the draw only and are not shown to participants.
  questionsPerLevel: { 1: 10, 2: 9, 3: 6 },

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
