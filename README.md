# استبيان قياس فهم أنظمة قطاع الطاقة

An Arabic, mobile-friendly survey website built from the question bank in
[`data/questions.xlsx`](data/questions.xlsx): 25 questions across 6
regulations and 3 levels. Live at **https://energysurvey.moe**.

Participants pick their department, answer all 25 questions one at a time,
and, once they finish, see their score (overall and per regulation) with each
question's correct answer, its legal reference (السند النظامي) and the simple
explanation (شرح مبسط).

## How questions are shown

| Level | Questions |
|---|---|
| الأول (تأسيسي) | 4 |
| المتوسط | 9 |
| المتقدم | 12 |

- Every attempt asks all the questions in the bank, from foundational to
  advanced. The order within each level and the order of the options are
  shuffled on every attempt, so a retry looks different but has the same
  questions.
- Levels are used internally only and are never shown to participants.
- To ask a random subset of a larger bank instead, set `questionsPerLevel`
  in `config.js` (see Settings).

## Hosting

A static site (plain HTML, CSS and JavaScript) on GitHub Pages, from the
repository `MoE-Legal-Deputyship/Energy-regulations-quiz`:

- **Settings → Pages**: *Deploy from a branch*, the
  `claude/questionnaire-website-js03uz` branch, **/ (root)** folder.
- **Custom domain** `energysurvey.moe` (registered at Porkbun) with
  **Enforce HTTPS**. Porkbun DNS has four `A` records for the bare domain
  (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
  `185.199.111.153`) and a `CNAME` for `www` →
  `moe-legal-deputyship.github.io`. GitHub keeps the domain in the `CNAME`
  file; do not delete it.

After any change, GitHub Pages can take a few minutes to publish, and
browsers may keep the previous files for up to 10 minutes. The asset links in
`index.html` end in `?v=…`; raise that number when you change a file so
browsers fetch the new copy.

## Update the questions

`data/questions.xlsx` has one sheet, **بنك الأسئلة**, with these columns
(order does not matter; the converter finds them by name):

| Column | Rules |
|---|---|
| م | Unique number; also used in the results sheet to list wrong answers |
| النظام | Regulation the question belongs to |
| المستوى | الأول (تأسيسي)، المتوسط or المتقدم |
| السؤال | The question (a column named نص السؤال also works) |
| الخيارات | Options separated by ؛ (or one per line in the same cell); write صح ؛ خطأ for a true/false question |
| الإجابة الصحيحة | Must match one of the options exactly |
| السند النظامي | Shown after the participant finishes |
| شرح مبسط | Shown after the participant finishes |

Any other column (for example محور القياس or review notes) is ignored and
never published.

The second sheet, **طريقة التعبئة**, repeats these rules in Arabic. Then:

- **On GitHub:** upload the file as `data/questions.xlsx`
  (*Add file → Upload files*, same name). The *Update questions* workflow
  regenerates `assets/questions.js` and the site updates by itself.
- **Locally:** `pip install openpyxl && python3 scripts/build_questions.py`,
  then commit both files.

The converter stops with a clear message naming the row if a correct answer
does not match one of its options exactly, a level is not recognised, or a
question number is used twice.

## Logo

The header shows `assets/logo.png`, a PNG rendered from the original
`assets/logo.svg`; `assets/favicon.png` and `assets/apple-touch-icon.png` are
the emblem for the browser tab and phone home screen. To replace the logo,
upload a new `assets/logo.png` with the same name.

## Settings

Edit [`config.js`](config.js) to change:

- `questionsPerLevel`: `null` asks every question; a count per level (for
  example `{ 1: 10, 2: 9, 3: 6 }`) asks a random subset, spread across the
  regulations and preferring questions the browser has not shown before;
- `departments`: the list participants must choose from;
- `advice`: the development advice shown with the results (see below);
- the title and introduction text, or whether multiple-choice options are
  shuffled (true/false questions always keep their order).

## Development advice (توصيات للتطوير)

Under the score, each participant gets a short development plan:

- **An overall line** chosen by total score (85% and above, 60% and above,
  below 60%).
- **Each regulation rated** by the participant's share of correct answers in
  it:

  | Score in the regulation | Shown as | Advice |
  |---|---|---|
  | below 50% | أولوية تدريبية | Join a training programme in that regulation |
  | 50% to below 75% | مراجعة ذاتية | Review it on their own |
  | 75% and above | نقاط القوة | Listed as a strength |

- **What to study:** for each regulation that needs work, the legal
  references (السند النظامي) of the questions they missed, each linking to
  that question's explanation further down the page.

With 4–5 questions per regulation this is a direction, not a diagnosis: one
answer moves a regulation by 20–25 points. The thresholds and all wording are
in the `advice` block of `config.js` ({النظام} stands for the regulation's
name); delete the block to hide the advice. Per-regulation scores are also in
the `by_system` column of the results table, so training needs can be
compared by department.

## Collected results

Each finished survey is saved as one row in a Supabase database table
(`results`): date, department, name (optional), score, percentage, time
taken, score per level and per regulation (levels appear only here, not to
participants), the numbers (م) of the questions answered wrongly, and every
answer.

- **See or download them:** sign in at supabase.com → your project →
  **Table Editor → results**. Use **Export → CSV** and open the file in Excel;
  filter or pivot on the `department` column to compare departments.
- **Setup** (already done for this project): run
  [`tools/supabase-setup.sql`](tools/supabase-setup.sql) in **SQL Editor**, then
  put the Project URL and publishable key in `results` in `config.js`. The key
  is public by design: it can only add rows, never read them.
- **Free plan:** a project with no activity for 7 days is paused. Data is
  kept; press **Restore** in the dashboard before the next round of answers.
- **Turn off collection:** empty both values in `results` in `config.js`.
- If sending fails (offline, project paused), the participant still sees
  their results and the site retries the next time they open them.

## Good to know

- Because the site is static, the answers are inside the page's files and
  this repository is public. That suits a learning or self-assessment survey;
  it is not meant to be a secure, proctored exam.
- To preview locally, open `index.html` in a browser, or run
  `python3 -m http.server` and visit http://localhost:8000.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `assets/style.css`, `assets/app.js` | The website |
| `assets/questions.js` | Questions generated from the spreadsheet (do not edit by hand) |
| `assets/logo.png` (from `assets/logo.svg`), `assets/favicon.png`, `assets/apple-touch-icon.png` | Ministry logo and icons |
| `config.js` | Questions per level, departments, title, intro text and where results are saved |
| `data/questions.xlsx` | The question bank (source of truth) |
| `scripts/build_questions.py` | Spreadsheet → `assets/questions.js` converter |
| `.github/workflows/update-questions.yml` | Re-runs the converter when the spreadsheet changes |
| `tools/supabase-setup.sql` | Creates the results table in Supabase |
| `CNAME` | Custom domain for GitHub Pages (managed by GitHub) |
