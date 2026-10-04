// Site settings — edit these values, no other file needs to change.
window.QUIZ_CONFIG = {
  title: "استبيان قياس فهم أنظمة قطاع الطاقة",
  intro:
    "اختبر فهمك لأنظمة قطاع الطاقة. تُختار الأسئلة عشوائياً من بنك الأسئلة وتتوزع على الأنظمة " +
    "ومستويات الصعوبة الثلاثة، فتختلف الأسئلة في كل محاولة. وبعد الإنهاء تظهر لك نتيجتك مع " +
    "الإجابة الصحيحة لكل سؤال وسندها النظامي وشرح مبسط لها.",

  // Questions drawn from each level in one attempt (1 = الأول (تأسيسي), 2 = المتوسط, 3 = المتقدم).
  // 10 + 9 + 6 = 25 questions. Each level's share is spread evenly across the regulations.
  questionsPerLevel: { 1: 10, 2: 9, 3: 6 },

  // Participants must pick one of these before starting.
  departments: [
    "الإدارة العامة للأنظمة واللوائح",
    "إدارة الاستشارات",
    "إدارة الدراسات القانونية",
    "الأمانة العامة للنظر في المخالفات",
    "إدارة التمثيل",
    "إدارة التحقيق",
  ],

  // Shuffle the options of multiple-choice questions for every participant.
  shuffleOptions: true,

  // Optional: collect every participant's result in a Google Sheet.
  // Paste the Web App URL from tools/google-apps-script.gs here (see README).
  // While this is empty, nothing is sent anywhere and the name field is hidden.
  resultsEndpoint: "",
};
