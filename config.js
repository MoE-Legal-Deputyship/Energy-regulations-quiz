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
