/* global WORD_BANK, TOPIC_SECTIONS */
(() => {
  "use strict";

  const STORAGE = { removed: "flash.ar-en.removed.v1" };

  const TAG_AR = {
    basics: "أساسيات",
    numbers: "أرقام",
    colors: "ألوان",
    time: "وقت",
    verbs: "أفعال",
    adjectives: "صفات",
    home: "البيت",
    food: "أكل",
    clothes: "ملابس",
    shopping: "تسوق",
    everyday: "يومي",
    people: "ناس",
    feelings: "مشاعر",
    phrases: "عبارات",
    body: "جسم",
    health: "صحة",
    travel: "سفر",
    weather: "طقس",
    nature: "طبيعة",
    animals: "حيوانات",
    school: "مدرسة",
    work: "شغل",
    tech: "تقنية",
    media: "إعلام",
    civic: "مجتمع",
    sports: "رياضة",
    custom: "خاصة",
    general: "عام",
  };

  const TAG_ORDER = [
    "basics",
    "numbers",
    "colors",
    "time",
    "verbs",
    "adjectives",
    "people",
    "feelings",
    "phrases",
    "home",
    "food",
    "clothes",
    "shopping",
    "everyday",
    "body",
    "health",
    "travel",
    "weather",
    "nature",
    "animals",
    "school",
    "work",
    "tech",
    "media",
    "civic",
    "sports",
    "custom",
    "general",
  ];

  const els = {
    sections: document.getElementById("curateSections"),
    stats: document.getElementById("curateStats"),
    toast: document.getElementById("curateToast"),
    expandAll: document.getElementById("curateExpandAll"),
    collapseAll: document.getElementById("curateCollapseAll"),
    exportBtn: document.getElementById("curateExportBtn"),
  };

  const norm = (s) => String(s ?? "").trim();
  const keyOf = (w) => norm(w.ar).toLowerCase();

  let toastTimer = 0;
  let removed = loadRemoved();
  let bank = [];

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadRemoved() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.removed) ?? "", []);
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean));
  }

  function saveRemoved() {
    try {
      localStorage.setItem(STORAGE.removed, JSON.stringify(Array.from(removed)));
    } catch {
      /* ignore */
    }
  }

  function showToast(msg) {
    if (!els.toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    els.toast.textContent = msg;
    toastTimer = setTimeout(() => {
      els.toast.textContent = "";
      toastTimer = 0;
    }, 3200);
  }

  function primaryEn(en) {
    return typeof window.primaryEnglish === "function" ? window.primaryEnglish(en) : en;
  }

  function loadBank() {
    const base = Array.isArray(window.WORD_BANK) ? window.WORD_BANK : [];
    const seen = new Set();
    bank = [];
    for (const w of base) {
      const row = {
        ar: norm(w.ar),
        en: norm(w.en),
        tag: norm(w.tag || "") || "general",
      };
      if (!row.ar || !row.en) continue;
      const k = keyOf(row);
      if (seen.has(k)) continue;
      seen.add(k);
      bank.push(row);
    }
    bank.sort((a, b) => a.ar.localeCompare(b.ar, "ar"));
  }

  function activeCount() {
    return bank.filter((w) => !removed.has(keyOf(w))).length;
  }

  function updateStats() {
    if (!els.stats) return;
    const total = bank.length;
    const hidden = removed.size;
    const active = activeCount();
    els.stats.textContent = `المعروض: ${active} كلمة · محذوف: ${hidden} · المجموع: ${total}`;
  }

  function removeWord(w) {
    const k = keyOf(w);
    if (!k || removed.has(k)) return;
    removed.add(k);
    saveRemoved();
    updateStats();
    const card = els.sections?.querySelector(`[data-ar-key="${CSS.escape(k)}"]`);
    if (card) {
      card.classList.add("isRemoved");
      card.disabled = true;
    }
    showToast(`حُذفت: ${w.ar} — تراجع من «مخفي» إن أردت`);
  }

  function render() {
    if (!els.sections) return;
    els.sections.innerHTML = "";

    const byTag = new Map();
    for (const w of bank) {
      const tag = w.tag.toLowerCase();
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(w);
    }

    const tags = [...byTag.keys()].sort((a, b) => {
      const ia = TAG_ORDER.indexOf(a);
      const ib = TAG_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    for (const tag of tags) {
      const words = byTag.get(tag);
      const visible = words.filter((w) => !removed.has(keyOf(w)));
      const section = document.createElement("details");
      section.className = "curateSection";
      section.open = true;

      const summary = document.createElement("summary");
      summary.className = "curateSectionHead";
      const tagLabel = TAG_AR[tag] || tag;
      summary.innerHTML = `<span class="curateSectionTitle">${tagLabel}</span><span class="curateSectionMeta muted">${visible.length} / ${words.length}</span>`;

      const grid = document.createElement("div");
      grid.className = "curateGrid";

      for (const w of words) {
        const k = keyOf(w);
        const isRemoved = removed.has(k);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "curateCard";
        btn.dataset.arKey = k;
        if (isRemoved) {
          btn.classList.add("isRemoved");
          btn.disabled = true;
        }
        btn.innerHTML = `<span class="curateCardAr" lang="ar">${escapeHtml(w.ar)}</span><span class="curateCardEn" lang="en" dir="ltr">${escapeHtml(primaryEn(w.en))}</span>`;
        if (!isRemoved) {
          btn.addEventListener("click", () => removeWord(w));
        }
        grid.appendChild(btn);
      }

      section.appendChild(summary);
      section.appendChild(grid);
      els.sections.appendChild(section);
    }

    updateStats();
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function exportRemoved() {
    const payload = {
      removedArabicKeys: Array.from(removed).sort(),
      exportedAt: new Date().toISOString(),
      note: "Keys match flash.ar-en.removed.v1 in localStorage",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "arabic-flashcards-removed.json";
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("تم تنزيل قائمة المحذوف");
  }

  function setAllSections(open) {
    els.sections?.querySelectorAll(".curateSection").forEach((s) => {
      s.open = open;
    });
  }

  function start() {
    loadBank();
    render();

    els.expandAll?.addEventListener("click", () => setAllSections(true));
    els.collapseAll?.addEventListener("click", () => setAllSections(false));
    els.exportBtn?.addEventListener("click", exportRemoved);

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE.removed) {
        removed = loadRemoved();
        render();
      }
    });

    window.addEventListener("wordbankready", () => {
      loadBank();
      render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
