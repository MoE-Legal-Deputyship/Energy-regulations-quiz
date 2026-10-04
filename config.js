// Site settings — edit these values, no other file needs to change.
window.QUIZ_CONFIG = {
  title: "استبيان قياس فهم أنظمة قطاع الطاقة",
  intro:
    "اختبر فهمك لأنظمة قطاع الطاقة. اختر الأنظمة والمستويات التي تريدها، وأجب عن الأسئلة، " +
    "وبعد الإنهاء تظهر لك نتيجتك مع الإجابة الصحيحة لكل سؤال وسندها النظامي وشرح مبسط لها.",

  // Shuffle the options of multiple-choice questions for every participant.
  shuffleOptions: true,

  // Optional: collect every participant's result in a Google Sheet.
  // Paste the Web App URL from tools/google-apps-script.gs here (see README).
  // While this is empty, nothing is sent anywhere and the name field is hidden.
  resultsEndpoint: "",
};
