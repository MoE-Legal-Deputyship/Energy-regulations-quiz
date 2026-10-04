# استبيان قياس فهم أنظمة قطاع الطاقة

An Arabic, mobile-friendly quiz website built from the question bank in
[`data/questions.xlsx`](data/questions.xlsx): 103 questions across 6
regulations and 3 levels.

Participants pick their department, answer 25 questions one at a time, and,
once they finish, see their score (overall and per regulation) with each
question's correct answer, its legal reference (السند النظامي) and
the simple explanation (شرح مبسط). The review-notes column
(ملاحظات للمراجعة) is internal and is never shown on the site.

## How the 25 questions are chosen

Every attempt draws a fresh set from the bank:

| Level | Questions per attempt | In the bank |
|---|---|---|
| الأول (تأسيسي) | 10 | 26 |
| المتوسط | 9 | 39 |
| المتقدم | 6 | 38 |

- Each level's share is spread across the six regulations, so every
  attempt covers all of them (4–5 questions each).
- Questions run from foundational to advanced; their order within a level
  and the order of the options are shuffled. Levels are used only for the
  draw and are never shown to participants.
- The browser remembers which questions it has already shown and prefers
  ones it has not, so a second attempt on the same device gets a completely
  new set. From the third attempt some foundational questions come back,
  since the bank has only 26 of them.

It is a static site (plain HTML, CSS and JavaScript), so it can be hosted
for free on GitHub Pages at a link like
`https://abdulmohsenfa.github.io/Energy-regulations-quiz/`.

## Publish the website (one time)

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Pick the branch that holds these files (for example `main`) and the
   **/ (root)** folder, then click **Save**.
4. After a minute or two the page shows the live link:
   **https://abdulmohsenfa.github.io/Energy-regulations-quiz/**

Share that link with participants. To use your own domain instead
(for example `quiz.example.com`), enter it under **Custom domain** on the
same page and follow GitHub's DNS instructions.

## Logo

The ministry logo is `assets/logo.svg` (shown in the header); the browser-tab
icon `assets/favicon.svg` is the same file cropped to the emblem. To replace
the logo, upload a new file and point `logo` in `config.js` at it.

## Update the questions

Keep the same sheet layout (one sheet per regulation, same column order), then:

- **On GitHub:** upload the new file as `data/questions.xlsx`
  (*Add file → Upload files*, same name). The *Update questions* workflow
  regenerates `assets/questions.js` and the site updates by itself.
- **Locally:** `pip install openpyxl && python3 scripts/build_questions.py`,
  then commit both files.

The converter stops with a clear message if a correct answer does not match
one of its options exactly, or if a level or question type is not recognised.

## Settings

Edit [`config.js`](config.js) to change:

- `questionsPerLevel`: how many questions each level contributes (the total is
  the quiz length);
- `departments`: the list participants must choose from;
- the title and introduction text, or whether multiple-choice options are
  shuffled (true/false questions always keep their order).

## Collect results in a Google Sheet (optional)

By default nothing is sent anywhere: each participant's progress is only
kept in their own browser. To see everyone's results:

1. Create a Google Sheet and open **Extensions → Apps Script**.
2. Paste the contents of [`tools/google-apps-script.gs`](tools/google-apps-script.gs) and save.
3. **Deploy → New deployment → Web app**, with *Execute as: Me* and
   *Who has access: Anyone*. Copy the Web app URL.
4. Paste the URL into `resultsEndpoint` in `config.js` and commit.

The start page then also asks for the participant's name, and each finished
quiz adds a row to the sheet: date, department, name, score, percentage,
time taken, score per level and per regulation (levels appear only here, not
to participants), and the questions answered wrongly. Filter or pivot on the department column to compare departments.

## Good to know

- Because the site is static, the answers are inside the page's files. That
  suits a learning or self-assessment survey; it is not meant to be a
  secure, proctored exam.
- To preview locally, open `index.html` in a browser, or run
  `python3 -m http.server` and visit http://localhost:8000.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `assets/style.css`, `assets/app.js` | The website |
| `assets/questions.js` | Questions generated from the spreadsheet (do not edit by hand) |
| `assets/logo.svg`, `assets/favicon.svg` | Ministry logo and tab icon |
| `config.js` | Logo path, questions per level, departments, title, intro text and optional results URL |
| `data/questions.xlsx` | The question bank (source of truth) |
| `scripts/build_questions.py` | Spreadsheet → `assets/questions.js` converter |
| `.github/workflows/update-questions.yml` | Re-runs the converter when the spreadsheet changes |
| `tools/google-apps-script.gs` | Optional Google Sheets results collector |
