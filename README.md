# استبيان قياس فهم أنظمة قطاع الطاقة

An Arabic, mobile-friendly quiz website built from the question bank in
[`data/questions.xlsx`](data/questions.xlsx): 103 questions across 6
regulations and 3 levels.

Participants choose which regulations and levels to answer, go through the
questions one at a time, and, once they finish, see their score with each
question's correct answer, its legal reference (السند النظامي) and the
simple explanation (شرح مبسط). The review-notes column (ملاحظات للمراجعة)
is internal and is never shown on the site.

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

Edit [`config.js`](config.js) to change the title, the introduction text, or
whether multiple-choice options are shuffled (they are by default; true/false
questions keep their order).

## Collect results in a Google Sheet (optional)

By default nothing is sent anywhere: each participant's progress is only
kept in their own browser. To see everyone's results:

1. Create a Google Sheet and open **Extensions → Apps Script**.
2. Paste the contents of [`tools/google-apps-script.gs`](tools/google-apps-script.gs) and save.
3. **Deploy → New deployment → Web app**, with *Execute as: Me* and
   *Who has access: Anyone*. Copy the Web app URL.
4. Paste the URL into `resultsEndpoint` in `config.js` and commit.

The start page then asks for the participant's name, and each finished quiz
adds a row (name, regulations, levels, score, percentage, time taken and
the questions answered wrongly) to the sheet.

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
| `config.js` | Title, intro text and optional results URL |
| `data/questions.xlsx` | The question bank (source of truth) |
| `scripts/build_questions.py` | Spreadsheet → `assets/questions.js` converter |
| `.github/workflows/update-questions.yml` | Re-runs the converter when the spreadsheet changes |
| `tools/google-apps-script.gs` | Optional Google Sheets results collector |
