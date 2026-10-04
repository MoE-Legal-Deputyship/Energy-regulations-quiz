(function () {
  "use strict";

  const DATA = window.QUIZ_DATA;
  const CFG = Object.assign(
    {
      title: "استبيان قياس فهم أنظمة قطاع الطاقة",
      intro: "",
      questionsPerLevel: { 1: 10, 2: 9, 3: 6 },
      departments: [],
      shuffleOptions: true,
      resultsEndpoint: "",
    },
    window.QUIZ_CONFIG || {}
  );
  const STORAGE_KEY = "energy-regulations-quiz:v2";
  const SHOWN_KEY = "energy-regulations-quiz:shown";
  const app = document.getElementById("app");

  const LETTERS = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح"];
  const TYPE_LABEL = { mcq: "اختيار من متعدد", exclude: "استبعاد الخيار الخاطئ", tf: "صح أو خطأ" };
  const TYPE_HINT = {
    mcq: "اختر الإجابة الصحيحة",
    exclude: "انتبه: اختر الخيار غير الصحيح",
    tf: "حدّد هل العبارة صحيحة أم خاطئة",
  };
  const FORMS = {
    question: ["سؤال واحد", "سؤالان", "أسئلة", "سؤالاً", "سؤال"],
    system: ["نظام واحد", "نظامان", "أنظمة", "نظاماً", "نظام"],
    level: ["مستوى واحد", "مستويان", "مستويات", "مستوى", "مستوى"],
  };
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const BOX_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  if (!DATA || !Array.isArray(DATA.systems)) {
    app.innerHTML = '<p class="card">تعذّر تحميل الأسئلة.</p>';
    return;
  }

  // ---------- helpers ----------
  const byId = new Map();
  DATA.systems.forEach((s) => s.questions.forEach((q) => byId.set(q.id, { q, s })));
  const LEVEL_IDS = Object.keys(DATA.levels).map(Number);
  const allQuestions = DATA.systems.flatMap((s) => s.questions);

  // How many questions each level contributes to one attempt (capped by what the bank holds).
  const levelQuota = new Map(LEVEL_IDS.map((l) => {
    const wanted = Math.max(0, Math.floor(Number((CFG.questionsPerLevel || {})[l]) || 0));
    return [l, Math.min(wanted, allQuestions.filter((q) => q.level === l).length)];
  }));
  const quizLength = [...levelQuota.values()].reduce((a, b) => a + b, 0);

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }

  // Arabic counted-noun agreement: 1, 2, 3–10, 11–99, and 100/101/102...
  function noun(n, forms) {
    const m = n % 100;
    if (n === 2) return forms[1];
    if (m >= 3 && m <= 10) return forms[2];
    if (m >= 11) return forms[3];
    return forms[4];
  }
  function count(n, forms) {
    if (n === 1) return forms[0];
    if (n === 2) return forms[1];
    return n + " " + noun(n, forms);
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
  // Each attempt takes levelQuota questions per level, spread as evenly as possible
  // across the regulations, preferring the questions this browser has shown the
  // fewest times — so a second attempt gets different questions until the bank runs out.
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
    const collect = !!String(CFG.resultsEndpoint || "").trim();
    let notice = "";
    if (state && !state.finishedAt) {
      const done = state.answers.filter((a) => a != null).length;
      notice = `
        <section class="card notice">
          <p>لديك اختبار لم يكتمل: أجبت عن ${done} من ${state.items.length}.</p>
          <button type="button" class="btn btn-primary" data-act="resume">متابعة الاختبار</button>
        </section>`;
    } else if (state && state.finishedAt) {
      notice = `
        <section class="card notice">
          <p>أنهيت اختباراً سابقاً على هذا الجهاز.</p>
          <button type="button" class="btn btn-ghost" data-act="show-results">عرض النتيجة السابقة</button>
        </section>`;
    }

    const levelTags = LEVEL_IDS.filter((l) => levelQuota.get(l)).map((l) =>
      `<span class="tag lvl-${l}">${esc(DATA.levels[l])}: ${levelQuota.get(l)}</span>`).join("");

    const departments = (CFG.departments || []).map((d) => `
      <label class="choice radio">
        <input type="radio" name="department" value="${esc(d)}" ${form.department === d ? "checked" : ""}>
        <span class="box">${BOX_CHECK}</span>
        <span class="label">${esc(d)}</span>
      </label>`).join("");

    const nameField = collect ? `
      <div class="field">
        <label for="name">الاسم</label>
        <input id="name" name="name" autocomplete="name" maxlength="80" value="${esc(form.name)}" placeholder="اكتب اسمك">
      </div>` : "";

    show(`
      <section class="card hero">
        <h1 data-focus tabindex="-1">${esc(CFG.title)}</h1>
        <p>${esc(CFG.intro)}</p>
        <div class="stats">
          <div class="stat"><b>${quizLength}</b><span>${noun(quizLength, FORMS.question)} في كل محاولة</span></div>
          <div class="stat"><b>${DATA.systems.length}</b><span>${noun(DATA.systems.length, FORMS.system)}</span></div>
          <div class="stat"><b>${LEVEL_IDS.length}</b><span>${noun(LEVEL_IDS.length, FORMS.level)}</span></div>
        </div>
        <div class="tags level-split">${levelTags}</div>
      </section>
      ${notice}
      ${departments ? `
      <section class="card">
        <fieldset class="plain">
          <legend><h2>الإدارة</h2></legend>
          <p class="muted small" style="margin-bottom:12px">اختر الإدارة التي تعمل بها.</p>
          <div class="choice-grid">${departments}</div>
          <p class="error" id="dept-error" role="alert" hidden>الرجاء اختيار الإدارة قبل البدء.</p>
        </fieldset>
      </section>` : ""}
      <section class="card start-bar">
        ${nameField}
        <button type="button" class="btn btn-primary btn-block" data-act="start" ${quizLength ? "" : "disabled"}>ابدأ الاختبار (${count(quizLength, FORMS.question)})</button>
        <p class="small muted">تُختار الأسئلة عشوائياً في كل محاولة، وتظهر الإجابات الصحيحة وسندها النظامي وشرحها بعد إنهاء جميع الأسئلة.</p>
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
    const nameInput = app.querySelector("#name");
    if (nameInput && !nameInput.value.trim()) {
      nameInput.focus();
      nameInput.setCustomValidity("الرجاء كتابة الاسم");
      nameInput.reportValidity();
      nameInput.addEventListener("input", () => nameInput.setCustomValidity(""), { once: true });
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
    const tf = q.type === "tf";
    const last = i === total - 1;

    const options = item.order.map((orig, k) => `
      <button type="button" class="option" role="radio" aria-checked="${chosen === orig}" data-opt="${orig}">
        ${tf ? "" : `<span class="letter" aria-hidden="true">${LETTERS[k] || k + 1}</span>`}
        <span>${esc(q.options[orig])}</span>
      </button>`).join("");

    show(`
      <section class="card">
        <div class="q-top">
          <span class="q-counter">السؤال ${i + 1} من ${total}</span>
          <div class="tags">
            <span class="tag lvl-${q.level}">${esc(DATA.levels[q.level])}</span>
            <span class="tag">${TYPE_LABEL[q.type]}</span>
          </div>
        </div>
        <div class="progress" role="progressbar" aria-label="نسبة الإنجاز" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${answered}">
          <span style="width:${(answered / total) * 100}%"></span>
        </div>
        <p class="q-system">${esc(s.name)}</p>
        <h1 class="q-text" id="q-text" data-focus tabindex="-1">${esc(q.text)}</h1>
        <p class="q-hint${q.type === "exclude" ? " warn" : ""}">${TYPE_HINT[q.type]}</p>
        <div class="options${tf ? " tf" : ""}" role="radiogroup" aria-labelledby="q-text">${options}</div>
        <div class="q-nav">
          <button type="button" class="btn btn-ghost" data-act="prev" ${i === 0 ? "disabled" : ""}>السابق</button>
          <button type="button" class="btn btn-primary" data-act="next" ${chosen == null ? "disabled" : ""}>${last ? "إنهاء وعرض النتيجة" : "التالي"}</button>
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
    if (!window.confirm("هل تريد إنهاء الاختبار وعرض النتيجة؟ لن تتمكن من تعديل إجاباتك بعد ذلك.")) return;
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

  function breakdown(groups, labelOf) {
    return groups.map((g) => `
      <div class="bd-row">
        <span class="name">${esc(labelOf(g.k))}</span>
        <span class="val">${g.ok} / ${g.total} (${g.pct}%)</span>
        <span class="bar"><span style="width:${g.pct}%"></span></span>
      </div>`).join("");
  }

  function renderResults() {
    const rows = resultRows();
    const total = rows.length;
    const correct = rows.filter((r) => r.ok).length;
    const pct = Math.round((correct / total) * 100);
    const rating = pct >= 90 ? "ممتاز" : pct >= 75 ? "جيد جداً" : pct >= 60 ? "جيد" : "يحتاج إلى مراجعة";
    const color = pct >= 60 ? "var(--correct)" : pct >= 40 ? "var(--lvl2-fg)" : "var(--wrong)";
    const wrong = total - correct;

    const byLevel = groupScores(rows, (r) => r.q.level, LEVEL_IDS);
    const bySystem = groupScores(rows, (r) => r.s.id, DATA.systems.map((s) => s.id));
    const systemName = (id) => DATA.systems.find((s) => s.id === id).name;

    const review = rows.map((r) => {
      const opts = r.it.order.map((orig, k) => {
        let cls = "", mark = "";
        if (orig === r.q.answer) {
          cls = "correct";
          mark = r.ok ? "إجابتك — صحيحة" : "الإجابة الصحيحة";
        } else if (orig === r.a) {
          cls = "chosen-wrong";
          mark = "إجابتك";
        }
        return `
          <li class="${cls}">
            ${r.q.type === "tf" ? "" : `<span class="letter">${LETTERS[k] || k + 1}</span>`}
            <span class="txt">${esc(r.q.options[orig])}</span>
            ${mark ? `<span class="mark">${mark}</span>` : ""}
          </li>`;
      }).join("");
      return `
        <article class="card review-item ${r.ok ? "is-correct" : "is-wrong"}" data-ok="${r.ok ? 1 : 0}">
          <div class="ri-head">
            <div class="tags">
              <span class="tag">سؤال ${r.i + 1}</span>
              <span class="tag">${esc(r.s.short)}</span>
              <span class="tag lvl-${r.q.level}">${esc(DATA.levels[r.q.level])}</span>
            </div>
            <span class="status">${r.ok ? ICON_CHECK + "إجابة صحيحة" : ICON_X + (r.a == null ? "لم تتم الإجابة" : "إجابة خاطئة")}</span>
          </div>
          <p class="ri-q">${esc(r.q.text)}</p>
          <ul class="ri-options">${opts}</ul>
          ${r.q.reference ? `<div class="ri-box"><h3>السند النظامي</h3><p>${esc(r.q.reference)}</p></div>` : ""}
          ${r.q.explanation ? `<div class="ri-box"><h3>الشرح</h3><p>${esc(r.q.explanation)}</p></div>` : ""}
        </article>`;
    }).join("");

    show(`
      <section class="card">
        <div class="score">
          <div class="ring" style="--p:${pct};--ring-color:${color}" role="img" aria-label="النسبة ${pct}%"><b>${pct}%</b></div>
          <div class="score-text" style="--ring-color:${color}">
            <h1 data-focus tabindex="-1">نتيجتك: ${correct} من ${total}</h1>
            <p class="rating">${rating}</p>
            ${state.department ? `<p class="muted">الإدارة: ${esc(state.department)}</p>` : ""}
            ${state.name ? `<p class="muted">المشارك: ${esc(state.name)}</p>` : ""}
            <p class="muted small">الوقت المستغرق: ${fmtDuration(state.finishedAt - state.startedAt)}</p>
          </div>
        </div>
      </section>
      ${byLevel.length > 1 ? `<section class="card"><h2>حسب المستوى</h2><div class="breakdown" style="margin-top:12px">${breakdown(byLevel, (l) => DATA.levels[l])}</div></section>` : ""}
      ${bySystem.length > 1 ? `<section class="card"><h2>حسب النظام</h2><div class="breakdown" style="margin-top:12px">${breakdown(bySystem, systemName)}</div></section>` : ""}
      <section class="card actions no-print">
        <button type="button" class="btn btn-primary" data-act="retry">محاولة جديدة بأسئلة مختلفة</button>
        <button type="button" class="btn btn-ghost" data-act="print">طباعة / حفظ PDF</button>
      </section>
      <section class="section" style="margin-top:28px">
        <h2 style="margin-bottom:8px">مراجعة الإجابات</h2>
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

  // Optional: send the result to a Google Apps Script web app (see README).
  function submitResults() {
    const url = String(CFG.resultsEndpoint || "").trim();
    if (!url || !state || state.submitted) return;
    const rows = resultRows();
    const correct = rows.filter((r) => r.ok).length;
    const summary = (groups, labelOf) => groups.map((g) => labelOf(g.k) + ": " + g.ok + "/" + g.total).join(" | ");
    const payload = {
      timestamp: new Date(state.finishedAt).toISOString(),
      department: state.department,
      name: state.name,
      score: correct,
      total: rows.length,
      percent: Math.round((correct / rows.length) * 100),
      durationSeconds: Math.round((state.finishedAt - state.startedAt) / 1000),
      byLevel: summary(groupScores(rows, (r) => r.q.level, LEVEL_IDS), (l) => DATA.levels[l]),
      bySystem: summary(groupScores(rows, (r) => r.s.id, DATA.systems.map((s) => s.id)),
        (id) => DATA.systems.find((s) => s.id === id).short),
      wrong: rows.filter((r) => !r.ok).map((r) => r.s.short + " - سؤال " + r.q.n).join(" | "),
      answers: rows.map((r) => ({ id: r.q.id, chosen: r.a == null ? "" : r.q.options[r.a], correct: r.ok })),
    };
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).then(() => {
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
