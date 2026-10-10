(function () {
  "use strict";

  const DATA = window.QUIZ_DATA;
  const CFG = Object.assign(
    {
      title: "استبيان قياس فهم أنظمة قطاع الطاقة",
      intro: "",
      questionsPerLevel: null,
      departments: [],
      shuffleOptions: true,
      results: { supabaseUrl: "", supabaseKey: "" },
    },
    window.QUIZ_CONFIG || {}
  );
  // Bump when question numbers change meaning, so progress saved against an older bank
  // is ignored (v4: questions 20, 22–24 replaced, October 2026).
  const STORAGE_KEY = "energy-regulations-quiz:v4";
  // Where finished results are stored (a Supabase "results" table); empty = not collected.
  const RESULTS = CFG.results || {};
  const RESULTS_URL = RESULTS.supabaseUrl && RESULTS.supabaseKey
    ? String(RESULTS.supabaseUrl).trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "") + "/rest/v1/results"
    : "";
  const SHOWN_KEY = "energy-regulations-quiz:shown";
  // Development advice under the score (thresholds and wording in config.js); null = none.
  const ADVICE = CFG.advice || null;
  const app = document.getElementById("app");

  const TYPE_HINT = {
    mcq: "اختر الإجابة الصحيحة.",
    exclude: "اختر الخيار غير الصحيح.",
    tf: "حدّد هل العبارة صحيحة أم خاطئة.",
  };
  const QUESTION_FORMS = ["سؤال واحد", "سؤالان", "أسئلة", "سؤالاً", "سؤال"];

  if (!DATA || !Array.isArray(DATA.systems)) {
    app.innerHTML = '<p class="card">تعذّر تحميل الأسئلة.</p>';
    return;
  }

  // ---------- helpers ----------
  const byId = new Map();
  DATA.systems.forEach((s) => s.questions.forEach((q) => byId.set(q.id, { q, s })));
  const LEVEL_IDS = Object.keys(DATA.levels).map(Number);
  const allQuestions = DATA.systems.flatMap((s) => s.questions);

  // How many questions each level contributes to one attempt: all of them unless
  // questionsPerLevel asks for fewer (capped by what the bank holds).
  const levelQuota = new Map(LEVEL_IDS.map((l) => {
    const available = allQuestions.filter((q) => q.level === l).length;
    if (!CFG.questionsPerLevel) return [l, available];
    const wanted = Math.max(0, Math.floor(Number(CFG.questionsPerLevel[l]) || 0));
    return [l, Math.min(wanted, available)];
  }));
  const quizLength = [...levelQuota.values()].reduce((a, b) => a + b, 0);

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }

  // Arabic counted-noun agreement: 1, 2, 3–10, 11–99, and 100/101/102...
  function count(n, forms) {
    if (n === 1) return forms[0];
    if (n === 2) return forms[1];
    const m = n % 100;
    return n + " " + (m >= 3 && m <= 10 ? forms[2] : m >= 11 ? forms[3] : forms[4]);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function fmtDuration(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = String(total % 60).padStart(2, "0");
    return h ? h + ":" + String(m).padStart(2, "0") + ":" + s : m + ":" + s;
  }

  function show(html) {
    app.innerHTML = html;
    window.scrollTo(0, 0);
    const focus = app.querySelector("[data-focus]") || app;
    focus.focus({ preventScroll: true });
  }

  // ---------- persistence (per-browser convenience only) ----------
  function readJSON(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || "null");
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable: the quiz still works for this visit */ }
  }

  function loadState() {
    const s = readJSON(STORAGE_KEY, null);
    const ok =
      s && Array.isArray(s.items) && s.items.length && Array.isArray(s.answers) &&
      s.items.every((it) => byId.has(it.id) && Array.isArray(it.order) &&
        it.order.length === byId.get(it.id).q.options.length);
    return ok ? s : null;
  }
  function saveState() { writeJSON(STORAGE_KEY, state); }

  let state = loadState();
  const form = { department: "", name: "" };
  let reviewFilter = "all";

  // ---------- question draw ----------
  // Each attempt takes levelQuota questions per level (every question by default), spread
  // as evenly as possible across the regulations and preferring the questions this browser
  // has shown the fewest times, then shuffles them within each level.
  function drawQuestions() {
    const shown = readJSON(SHOWN_KEY, {});
    const times = (q) => shown[q.id] || 0;
    const perSystem = new Map(DATA.systems.map((s) => [s.id, 0]));
    const picked = [];

    LEVEL_IDS.forEach((level) => {
      const pools = DATA.systems.map((s) => ({
        s,
        qs: shuffle(s.questions.filter((q) => q.level === level)).sort((a, b) => times(a) - times(b)),
      }));
      const levelPicks = [];
      // A regulation's next question costs 1 per question already taken from that
      // regulation and 2 per earlier showing, so fresh questions win over perfect balance.
      const cost = (p) => perSystem.get(p.s.id) + 2 * times(p.qs[0]);
      for (let n = 0; n < levelQuota.get(level); n++) {
        const open = shuffle(pools.filter((p) => p.qs.length)).sort((a, b) => cost(a) - cost(b));
        if (!open.length) break;
        levelPicks.push(open[0].qs.shift());
        perSystem.set(open[0].s.id, perSystem.get(open[0].s.id) + 1);
      }
      picked.push(...shuffle(levelPicks)); // foundational → intermediate → advanced
    });

    picked.forEach((q) => { shown[q.id] = times(q) + 1; });
    writeJSON(SHOWN_KEY, shown);
    return picked;
  }

  // ---------- start screen ----------
  function renderStart() {
    let notice = "";
    if (state && !state.finishedAt) {
      const done = state.answers.filter((a) => a != null).length;
      notice = `
        <section class="card notice">
          <p>لديك استبيان لم يكتمل (أجبت عن ${done} من ${state.items.length}).</p>
          <button type="button" class="btn btn-primary" data-act="resume">متابعة</button>
        </section>`;
    } else if (state && state.finishedAt) {
      notice = `
        <section class="card notice">
          <p>سبق أن أنهيت الاستبيان على هذا الجهاز.</p>
          <button type="button" class="btn btn-secondary" data-act="show-results">عرض النتيجة السابقة</button>
        </section>`;
    }

    const departments = (CFG.departments || []).map((d) => `
      <label class="choice">
        <input type="radio" name="department" value="${esc(d)}" ${form.department === d ? "checked" : ""}>
        <span class="dot" aria-hidden="true"></span>
        <span class="label">${esc(d)}</span>
      </label>`).join("");

    const nameField = RESULTS_URL ? `
      <div class="field">
        <label for="name">الاسم <span class="muted">(اختياري)</span></label>
        <input id="name" name="name" autocomplete="name" maxlength="80" value="${esc(form.name)}">
      </div>` : "";

    show(`
      <section class="card intro">
        <h1 data-focus tabindex="-1">${esc(CFG.title)}</h1>
        <p>${esc(CFG.intro)}</p>
        <p class="meta">عدد الأسئلة: ${count(quizLength, QUESTION_FORMS)}</p>
      </section>
      ${notice}
      <section class="card">
        ${departments ? `
        <fieldset>
          <legend>الإدارة</legend>
          <div class="choice-grid">${departments}</div>
          <p class="error" id="dept-error" role="alert" hidden>الرجاء اختيار الإدارة.</p>
        </fieldset>` : ""}
        ${nameField}
        <div class="form-actions">
          <button type="button" class="btn btn-primary" data-act="start" ${quizLength ? "" : "disabled"}>بدء الاستبيان</button>
        </div>
        ${RESULTS_URL ? '<p class="note">تُسجَّل نتيجتك مع الإدارة لأغراض قياس الفهم.</p>' : ""}
      </section>`);
  }

  function startQuiz(who) {
    const items = drawQuestions().map((q) => {
      const order = q.options.map((_, i) => i);
      if (CFG.shuffleOptions && q.type !== "tf") shuffle(order);
      return { id: q.id, order };
    });
    if (!items.length) return;
    state = {
      department: who.department,
      name: who.name,
      items,
      answers: items.map(() => null),
      current: 0,
      startedAt: Date.now(),
      finishedAt: null,
      submitted: false,
    };
    saveState();
    renderQuestion();
  }

  function startFromForm() {
    const deptError = app.querySelector("#dept-error");
    if (deptError && !form.department) {
      deptError.hidden = false;
      app.querySelector('input[name="department"]').focus();
      return;
    }
    startQuiz({ department: form.department, name: form.name.trim() });
  }

  // ---------- question screen ----------
  function renderQuestion() {
    const i = state.current;
    const item = state.items[i];
    const { q, s } = byId.get(item.id);
    const chosen = state.answers[i];
    const total = state.items.length;
    const answered = state.answers.filter((a) => a != null).length;
    const last = i === total - 1;

    const options = item.order.map((orig) => `
      <button type="button" class="option" role="radio" aria-checked="${chosen === orig}" data-opt="${orig}">
        <span class="dot" aria-hidden="true"></span>
        <span>${esc(q.options[orig])}</span>
      </button>`).join("");

    show(`
      <section class="card">
        <div class="q-top">
          <span>السؤال ${i + 1} من ${total}</span>
          <span class="muted">${esc(s.name)}</span>
        </div>
        <div class="progress" role="progressbar" aria-label="نسبة الإنجاز" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${answered}">
          <span style="width:${(answered / total) * 100}%"></span>
        </div>
        <h1 class="q-text" id="q-text" data-focus tabindex="-1">${esc(q.text)}</h1>
        <p class="q-hint">${TYPE_HINT[q.type]}</p>
        <div class="options${q.type === "tf" ? " tf" : ""}" role="radiogroup" aria-labelledby="q-text">${options}</div>
        <div class="q-nav">
          <button type="button" class="btn btn-secondary" data-act="prev" ${i === 0 ? "disabled" : ""}>السابق</button>
          <button type="button" class="btn btn-primary" data-act="next" ${chosen == null ? "disabled" : ""}>${last ? "إنهاء" : "التالي"}</button>
        </div>
      </section>`);
  }

  function choose(orig) {
    state.answers[state.current] = orig;
    saveState();
    app.querySelectorAll(".option").forEach((b) =>
      b.setAttribute("aria-checked", String(Number(b.dataset.opt) === orig))
    );
    app.querySelector('[data-act="next"]').disabled = false;
    const answered = state.answers.filter((a) => a != null).length;
    const bar = app.querySelector(".progress");
    bar.setAttribute("aria-valuenow", answered);
    bar.firstElementChild.style.width = (answered / state.items.length) * 100 + "%";
  }

  function next() {
    if (state.answers[state.current] == null) return;
    if (state.current < state.items.length - 1) {
      state.current++;
      saveState();
      renderQuestion();
      return;
    }
    if (!window.confirm("هل تريد إنهاء الاستبيان وعرض النتيجة؟ لن تتمكن من تعديل إجاباتك بعد ذلك.")) return;
    state.finishedAt = Date.now();
    saveState();
    reviewFilter = "all";
    renderResults();
    submitResults();
  }

  // ---------- results ----------
  function resultRows() {
    return state.items.map((it, i) => {
      const { q, s } = byId.get(it.id);
      const a = state.answers[i];
      return { it, q, s, a, i, ok: a === q.answer };
    });
  }

  function groupScores(rows, keyOf, keys) {
    return keys.map((k) => {
      const group = rows.filter((r) => keyOf(r) === k);
      const ok = group.filter((r) => r.ok).length;
      return { k, ok, total: group.length, pct: group.length ? Math.round((ok / group.length) * 100) : 0 };
    }).filter((g) => g.total);
  }

  function bandOf(pct) {
    return pct >= ADVICE.strong ? "strong" : pct >= ADVICE.review ? "review" : "training";
  }

  // Rates each regulation and, for the weak ones, lists the legal references of the missed
  // questions, each linking to that question's explanation further down the page.
  function renderAdvice(rows, bySystem, pct) {
    if (!ADVICE) return "";
    const LABEL = { training: "أولوية تدريبية", review: "مراجعة ذاتية" };
    const fill = (text, name) => esc(text || "").split("{النظام}").join("<b>" + esc(name) + "</b>");
    const nameOf = (id) => DATA.systems.find((s) => s.id === id).name;
    const overall = (ADVICE.overall || []).find((o) => pct >= o.min);

    const focus = (systemId) => {
      const seen = new Set();
      return rows.filter((r) => r.s.id === systemId && !r.ok && r.q.reference).filter((r) => {
        if (seen.has(r.q.reference)) return false;
        seen.add(r.q.reference);
        return true;
      }).map((r) => `<li><a href="#review-${r.i + 1}" data-goto>${esc(r.q.reference)}</a></li>`).join("");
    };

    const weak = bySystem.filter((g) => bandOf(g.pct) !== "strong").sort((a, b) => a.pct - b.pct);
    const strengths = bySystem.filter((g) => bandOf(g.pct) === "strong").map((g) => esc(nameOf(g.k)));
    const items = weak.map((g) => {
      const band = bandOf(g.pct);
      const refs = focus(g.k);
      return `
        <div class="advice-item ${band}">
          <div class="advice-head">
            <h3>${esc(nameOf(g.k))}</h3>
            <span class="badge">${LABEL[band]} · ${g.ok} من ${g.total}</span>
          </div>
          <p>${fill(band === "training" ? ADVICE.training : ADVICE.selfReview, nameOf(g.k))}</p>
          ${refs ? `<ul>${refs}</ul>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="card advice">
        <h2>توصيات للتطوير</h2>
        ${overall ? `<p class="advice-overall">${esc(overall.text)}</p>` : ""}
        ${items}
        ${strengths.length ? `<p class="advice-strengths"><b>نقاط القوة:</b> ${strengths.join("، ")}</p>` : ""}
      </section>`;
  }

  function renderResults() {
    const rows = resultRows();
    const total = rows.length;
    const correct = rows.filter((r) => r.ok).length;
    const pct = Math.round((correct / total) * 100);
    const wrong = total - correct;
    const bySystem = groupScores(rows, (r) => r.s.id, DATA.systems.map((s) => s.id));

    const systemRows = bySystem.map((g) => `
      <tr>
        <td>${esc(DATA.systems.find((s) => s.id === g.k).name)}</td>
        <td class="num">${g.ok} من ${g.total}</td>
        <td class="num${ADVICE ? " band-" + bandOf(g.pct) : ""}">${g.pct}%</td>
      </tr>`).join("");

    const review = rows.map((r) => {
      const opts = r.it.order.map((orig) => {
        let cls = "", mark = "";
        if (orig === r.q.answer) {
          cls = "correct";
          mark = r.ok ? "إجابتك (صحيحة)" : "الإجابة الصحيحة";
        } else if (orig === r.a) {
          cls = "chosen-wrong";
          mark = "إجابتك";
        }
        return `
          <li class="${cls}">
            <span class="txt">${esc(r.q.options[orig])}</span>
            ${mark ? `<span class="mark">${mark}</span>` : ""}
          </li>`;
      }).join("");
      return `
        <article class="card review-item ${r.ok ? "is-correct" : "is-wrong"}" id="review-${r.i + 1}" data-ok="${r.ok ? 1 : 0}">
          <div class="ri-head">
            <span>السؤال ${r.i + 1} <span class="muted">— ${esc(r.s.name)}</span></span>
            <span class="status">${r.ok ? "صحيحة" : r.a == null ? "لم تتم الإجابة" : "خاطئة"}</span>
          </div>
          <p class="ri-q">${esc(r.q.text)}</p>
          <ul class="ri-options">${opts}</ul>
          ${r.q.reference ? `<div class="ri-box"><h3>السند النظامي</h3><p>${esc(r.q.reference)}</p></div>` : ""}
          ${r.q.explanation ? `<div class="ri-box"><h3>الشرح</h3><p>${esc(r.q.explanation)}</p></div>` : ""}
        </article>`;
    }).join("");

    show(`
      <section class="card">
        <h1 data-focus tabindex="-1">النتيجة</h1>
        <p class="score"><b>${correct}</b> من ${total} <span class="muted">(${pct}%)</span></p>
        <dl class="details">
          ${state.department ? `<div><dt>الإدارة</dt><dd>${esc(state.department)}</dd></div>` : ""}
          ${state.name ? `<div><dt>الاسم</dt><dd>${esc(state.name)}</dd></div>` : ""}
          <div><dt>الوقت المستغرق</dt><dd>${fmtDuration(state.finishedAt - state.startedAt)}</dd></div>
        </dl>
        ${bySystem.length > 1 ? `
        <table class="table">
          <thead><tr><th>النظام</th><th class="num">الإجابات الصحيحة</th><th class="num">النسبة</th></tr></thead>
          <tbody>${systemRows}</tbody>
        </table>` : ""}
        <div class="form-actions no-print">
          <button type="button" class="btn btn-primary" data-act="retry">محاولة جديدة</button>
          <button type="button" class="btn btn-secondary" data-act="print">طباعة</button>
        </div>
      </section>
      ${renderAdvice(rows, bySystem, pct)}
      <section class="section">
        <h2>مراجعة الإجابات</h2>
        <div class="filters" role="group" aria-label="تصفية الأسئلة">
          <button type="button" class="filter" data-filter="all">الكل (${total})</button>
          <button type="button" class="filter" data-filter="wrong">الخاطئة (${wrong})</button>
          <button type="button" class="filter" data-filter="right">الصحيحة (${correct})</button>
        </div>
        <div class="review">${review}<p class="empty" hidden>لا توجد أسئلة في هذا التصنيف.</p></div>
      </section>`);
    applyFilter();
  }

  function applyFilter() {
    let visible = 0;
    app.querySelectorAll(".filter").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.filter === reviewFilter))
    );
    app.querySelectorAll(".review-item").forEach((el) => {
      const ok = el.dataset.ok === "1";
      const match = reviewFilter === "all" || (reviewFilter === "right") === ok;
      el.hidden = !match;
      if (match) visible++;
    });
    const empty = app.querySelector(".review .empty");
    if (empty) empty.hidden = visible > 0;
  }

  // Optional: store the result as one row in the Supabase "results" table (see README).
  // Column names match tools/supabase-setup.sql.
  function submitResults() {
    if (!RESULTS_URL || !state || state.submitted) return;
    const rows = resultRows();
    const correct = rows.filter((r) => r.ok).length;
    const summary = (groups, labelOf) => groups.map((g) => labelOf(g.k) + ": " + g.ok + "/" + g.total).join(" | ");
    const row = {
      department: state.department || null,
      name: state.name || null,
      score: correct,
      total: rows.length,
      percent: Math.round((correct / rows.length) * 100),
      duration_seconds: Math.round((state.finishedAt - state.startedAt) / 1000),
      by_level: summary(groupScores(rows, (r) => r.q.level, LEVEL_IDS), (l) => DATA.levels[l]),
      by_system: summary(groupScores(rows, (r) => r.s.id, DATA.systems.map((s) => s.id)),
        (id) => DATA.systems.find((s) => s.id === id).short),
      // Question numbers (column م in data/questions.xlsx), in bank order.
      wrong: rows.filter((r) => !r.ok).map((r) => r.q.n)
        .sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b))).join("، "),
      answers: rows.map((r) => ({ id: r.q.id, chosen: r.a == null ? "" : r.q.options[r.a], correct: r.ok })),
    };
    fetch(RESULTS_URL, {
      method: "POST",
      headers: {
        apikey: RESULTS.supabaseKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    }).then((res) => {
      if (!res.ok) return; // retried next time the results are shown
      state.submitted = true;
      saveState();
    }).catch(() => { /* offline: retried next time the results are shown */ });
  }

  // ---------- events ----------
  app.addEventListener("change", (e) => {
    if (e.target.name === "department") {
      form.department = e.target.value;
      const err = app.querySelector("#dept-error");
      if (err) err.hidden = true;
    }
  });

  app.addEventListener("input", (e) => {
    if (e.target.id === "name") form.name = e.target.value;
  });

  app.addEventListener("click", (e) => {
    const opt = e.target.closest(".option");
    if (opt) return choose(Number(opt.dataset.opt));

    const filter = e.target.closest("[data-filter]");
    if (filter) {
      reviewFilter = filter.dataset.filter;
      return applyFilter();
    }

    // An advice link jumps to a question's explanation; make sure it is not filtered out.
    if (e.target.closest("[data-goto]")) {
      reviewFilter = "all";
      return applyFilter();
    }

    const act = e.target.closest("[data-act]");
    if (!act || act.disabled) return;
    switch (act.dataset.act) {
      case "start": startFromForm(); break;
      case "resume": renderQuestion(); break;
      case "show-results": renderResults(); submitResults(); break;
      case "prev":
        if (state.current > 0) { state.current--; saveState(); renderQuestion(); }
        break;
      case "next": next(); break;
      case "retry": startQuiz({ department: state.department, name: state.name }); break;
      case "print": reviewFilter = "all"; applyFilter(); window.print(); break;
    }
  });

  // Number keys pick an option; Enter moves on once answered.
  document.addEventListener("keydown", (e) => {
    if (!app.querySelector(".options") || e.altKey || e.ctrlKey || e.metaKey) return;
    const digit = "١٢٣٤٥٦٧٨٩".indexOf(e.key) + 1 || (/^[1-9]$/.test(e.key) ? Number(e.key) : 0);
    if (digit) {
      const btn = app.querySelectorAll(".option")[digit - 1];
      if (btn) { e.preventDefault(); btn.click(); }
    } else if (e.key === "Enter" && !e.target.closest("button, input, a")) {
      e.preventDefault();
      next();
    }
  });

  document.getElementById("home-link").addEventListener("click", (e) => {
    e.preventDefault();
    renderStart();
  });

  // ---------- boot ----------
  document.getElementById("site-title").textContent = CFG.title;
  if (state && state.finishedAt) {
    renderResults();
    submitResults();
  } else {
    renderStart();
  }
})();
