(function () {
  "use strict";

  const DATA = window.QUIZ_DATA;
  const CFG = Object.assign(
    { title: "استبيان قياس فهم أنظمة قطاع الطاقة", intro: "", shuffleOptions: true, resultsEndpoint: "" },
    window.QUIZ_CONFIG || {}
  );
  const STORAGE_KEY = "energy-regulations-quiz:v1";
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
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const ok =
        s && Array.isArray(s.items) && s.items.length && Array.isArray(s.answers) &&
        s.items.every((it) => byId.has(it.id) && Array.isArray(it.order) &&
          it.order.length === byId.get(it.id).q.options.length);
      return ok ? s : null;
    } catch (e) {
      return null;
    }
  }
  function saveState() {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* storage unavailable: the quiz still works for this visit */ }
  }

  let state = loadState();
  const sel = {
    systems: new Set(DATA.systems.map((s) => s.id)),
    levels: new Set(LEVEL_IDS),
    name: "",
  };
  let reviewFilter = "all";

  // ---------- start screen ----------
  function selectedQuestions() {
    return DATA.systems
      .filter((s) => sel.systems.has(s.id))
      .flatMap((s) => s.questions.filter((q) => sel.levels.has(q.level)));
  }

  function renderStart() {
    const collect = !!String(CFG.resultsEndpoint || "").trim();
    let notice = "";
    if (state && !state.finishedAt) {
      const done = state.answers.filter((a) => a != null).length;
      notice = `
        <section class="card notice">
          <p>لديك اختبار لم يكتمل: أجبت عن ${done} من ${state.items.length}.</p>
          <button class="btn btn-primary" data-act="resume">متابعة الاختبار</button>
        </section>`;
    } else if (state && state.finishedAt) {
      notice = `
        <section class="card notice">
          <p>أنهيت اختباراً سابقاً على هذا الجهاز.</p>
          <button class="btn btn-ghost" data-act="show-results">عرض النتيجة السابقة</button>
        </section>`;
    }

    const systems = DATA.systems.map((s) => `
      <label class="choice" data-system="${s.id}">
        <input type="checkbox" name="system" value="${s.id}" ${sel.systems.has(s.id) ? "checked" : ""}>
        <span class="box">${BOX_CHECK}</span>
        <span class="label">${esc(s.name)}</span>
        <span class="count"></span>
      </label>`).join("");

    const levels = LEVEL_IDS.map((l) => `
      <label class="choice" data-level="${l}">
        <input type="checkbox" name="level" value="${l}" ${sel.levels.has(l) ? "checked" : ""}>
        <span class="box">${BOX_CHECK}</span>
        <span class="label"><span class="tag lvl-${l}">${esc(DATA.levels[l])}</span></span>
        <span class="count"></span>
      </label>`).join("");

    const nameField = collect ? `
      <div class="field">
        <label for="name">الاسم</label>
        <input id="name" name="name" autocomplete="name" maxlength="80" value="${esc(sel.name)}" placeholder="اكتب اسمك">
      </div>` : "";

    show(`
      <section class="card hero">
        <h1 data-focus tabindex="-1">${esc(CFG.title)}</h1>
        <p>${esc(CFG.intro)}</p>
        <div class="stats">
          <div class="stat"><b>${DATA.systems.length}</b><span>${noun(DATA.systems.length, FORMS.system)}</span></div>
          <div class="stat"><b>${allQuestions.length}</b><span>${noun(allQuestions.length, FORMS.question)}</span></div>
          <div class="stat"><b>${LEVEL_IDS.length}</b><span>${noun(LEVEL_IDS.length, FORMS.level)}</span></div>
        </div>
      </section>
      ${notice}
      <section class="card">
        <div class="section-head">
          <h2>الأنظمة</h2>
          <button type="button" class="link-btn" data-act="toggle-systems"></button>
        </div>
        <div class="choice-grid">${systems}</div>
      </section>
      <section class="card">
        <div class="section-head"><h2>المستوى</h2></div>
        <div class="chips">${levels}</div>
      </section>
      <section class="card start-bar">
        ${nameField}
        <button type="button" class="btn btn-primary btn-block" data-act="start"></button>
        <p class="small muted">تظهر الإجابات الصحيحة وسندها النظامي وشرحها بعد إنهاء جميع الأسئلة.</p>
      </section>`);
    updateStartCounts();
  }

  function updateStartCounts() {
    DATA.systems.forEach((s) => {
      const n = s.questions.filter((q) => sel.levels.has(q.level)).length;
      const el = app.querySelector(`[data-system="${s.id}"]`);
      el.querySelector(".count").textContent = n;
      el.classList.toggle("disabled", n === 0);
    });
    LEVEL_IDS.forEach((l) => {
      const n = DATA.systems.filter((s) => sel.systems.has(s.id))
        .reduce((acc, s) => acc + s.questions.filter((q) => q.level === l).length, 0);
      app.querySelector(`[data-level="${l}"] .count`).textContent = n;
    });
    const total = selectedQuestions().length;
    const btn = app.querySelector('[data-act="start"]');
    btn.disabled = total === 0;
    btn.textContent = total ? "ابدأ الاختبار (" + count(total, FORMS.question) + ")" : "اختر نظاماً ومستوى واحداً على الأقل";
    app.querySelector('[data-act="toggle-systems"]').textContent =
      sel.systems.size === DATA.systems.length ? "إلغاء تحديد الكل" : "تحديد الكل";
  }

  function startQuiz(reuse) {
    const systems = reuse ? reuse.systems : [...sel.systems];
    const levels = reuse ? reuse.levels : [...sel.levels];
    const items = [];
    DATA.systems.forEach((s) => {
      if (!systems.includes(s.id)) return;
      s.questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => levels.includes(q.level))
        .sort((a, b) => a.q.level - b.q.level || a.i - b.i) // foundational → advanced
        .forEach(({ q }) => {
          const order = q.options.map((_, i) => i);
          if (CFG.shuffleOptions && q.type !== "tf") shuffle(order);
          items.push({ id: q.id, order });
        });
    });
    if (!items.length) return;
    state = {
      name: reuse ? reuse.name : sel.name.trim(),
      systems,
      levels,
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

  function breakdown(rows, keyOf, labelOf, keys) {
    return keys.map((k) => {
      const group = rows.filter((r) => keyOf(r) === k);
      if (!group.length) return "";
      const ok = group.filter((r) => r.ok).length;
      const pct = Math.round((ok / group.length) * 100);
      return `
        <div class="bd-row">
          <span class="name">${esc(labelOf(k))}</span>
          <span class="val">${ok} / ${group.length} (${pct}%)</span>
          <span class="bar"><span style="width:${pct}%"></span></span>
        </div>`;
    }).join("");
  }

  function renderResults() {
    const rows = resultRows();
    const total = rows.length;
    const correct = rows.filter((r) => r.ok).length;
    const pct = Math.round((correct / total) * 100);
    const rating = pct >= 90 ? "ممتاز" : pct >= 75 ? "جيد جداً" : pct >= 60 ? "جيد" : "يحتاج إلى مراجعة";
    const color = pct >= 60 ? "var(--correct)" : pct >= 40 ? "var(--lvl2-fg)" : "var(--wrong)";
    const wrong = total - correct;

    const sysIds = DATA.systems.map((s) => s.id).filter((id) => rows.some((r) => r.s.id === id));
    const lvlIds = LEVEL_IDS.filter((l) => rows.some((r) => r.q.level === l));
    const bySystem = sysIds.length > 1
      ? `<section class="card"><h2>حسب النظام</h2><div class="breakdown" style="margin-top:12px">${breakdown(rows, (r) => r.s.id, (id) => DATA.systems.find((s) => s.id === id).name, sysIds)}</div></section>`
      : "";
    const byLevel = lvlIds.length > 1
      ? `<section class="card"><h2>حسب المستوى</h2><div class="breakdown" style="margin-top:12px">${breakdown(rows, (r) => r.q.level, (l) => DATA.levels[l], lvlIds)}</div></section>`
      : "";

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
            ${state.name ? `<p class="muted">المشارك: ${esc(state.name)}</p>` : ""}
            <p class="muted small">الوقت المستغرق: ${fmtDuration(state.finishedAt - state.startedAt)}</p>
          </div>
        </div>
      </section>
      ${bySystem}
      ${byLevel}
      <section class="card actions no-print">
        <button type="button" class="btn btn-primary" data-act="retry">إعادة الاختبار نفسه</button>
        <button type="button" class="btn btn-ghost" data-act="new">اختبار جديد</button>
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
    const payload = {
      timestamp: new Date(state.finishedAt).toISOString(),
      name: state.name,
      systems: DATA.systems.filter((s) => state.systems.includes(s.id)).map((s) => s.name).join("، "),
      levels: state.levels.map((l) => DATA.levels[l]).join("، "),
      score: correct,
      total: rows.length,
      percent: Math.round((correct / rows.length) * 100),
      durationSeconds: Math.round((state.finishedAt - state.startedAt) / 1000),
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
    const t = e.target;
    if (t.name === "system") {
      t.checked ? sel.systems.add(Number(t.value)) : sel.systems.delete(Number(t.value));
      updateStartCounts();
    } else if (t.name === "level") {
      t.checked ? sel.levels.add(Number(t.value)) : sel.levels.delete(Number(t.value));
      updateStartCounts();
    }
  });

  app.addEventListener("input", (e) => {
    if (e.target.id === "name") sel.name = e.target.value;
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
      case "toggle-systems": {
        const all = sel.systems.size === DATA.systems.length;
        sel.systems = new Set(all ? [] : DATA.systems.map((s) => s.id));
        app.querySelectorAll('input[name="system"]').forEach((c) => { c.checked = !all; });
        updateStartCounts();
        break;
      }
      case "start": {
        const nameInput = app.querySelector("#name");
        if (nameInput && !nameInput.value.trim()) {
          nameInput.focus();
          nameInput.setCustomValidity("الرجاء كتابة الاسم");
          nameInput.reportValidity();
          nameInput.addEventListener("input", () => nameInput.setCustomValidity(""), { once: true });
          return;
        }
        startQuiz();
        break;
      }
      case "resume": renderQuestion(); break;
      case "show-results": renderResults(); submitResults(); break;
      case "prev":
        if (state.current > 0) { state.current--; saveState(); renderQuestion(); }
        break;
      case "next": next(); break;
      case "retry": startQuiz({ systems: state.systems, levels: state.levels, name: state.name }); break;
      case "new": state = null; saveState(); renderStart(); break;
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
