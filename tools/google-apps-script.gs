/**
 * Optional: collect every participant's result in a Google Sheet.
 *
 * 1. Create a new Google Sheet, then open Extensions → Apps Script.
 * 2. Replace the editor contents with this file and click Save.
 * 3. Deploy → New deployment → type "Web app".
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the Web app URL and paste it into resultsEndpoint in config.js.
 *
 * Each finished quiz then adds one row to the "النتائج" sheet.
 */
const SHEET_NAME = "النتائج";
const HEADERS = [
  "التاريخ", "الإدارة", "الاسم", "الدرجة", "عدد الأسئلة", "النسبة %",
  "المدة (ثانية)", "حسب المستوى", "حسب النظام", "الأسئلة الخاطئة", "تفاصيل الإجابات",
];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.setRightToLeft(true);
  }
  sheet.appendRow([
    new Date(data.timestamp),
    String(data.department || "").slice(0, 120),
    String(data.name || "").slice(0, 80),
    data.score,
    data.total,
    data.percent,
    data.durationSeconds,
    data.byLevel,
    data.bySystem,
    data.wrong,
    JSON.stringify(data.answers || []),
  ]);
  return ContentService.createTextOutput("ok");
}
