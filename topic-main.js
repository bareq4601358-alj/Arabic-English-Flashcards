/* global WORD_BANK, TOPIC_GROUPS */
(() => {
  "use strict";

  const norm = (s) => String(s ?? "").trim();

  function getTopicFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const topicId = norm(params.get("id"));
    const groups = Array.isArray(window.TOPIC_GROUPS) ? window.TOPIC_GROUPS : [];
    const topicDef = groups.find((g) => g.id === topicId);
    return { topicId, topicDef };
  }

  const { topicId, topicDef } = getTopicFromUrl();

  if (!topicDef || !Array.isArray(topicDef.tags) || !topicDef.tags.length) {
    window.location.replace("./topics.html");
    return;
  }

  const topicTagSet = new Set(topicDef.tags.map((t) => norm(t).toLowerCase()).filter(Boolean));
  const topicLabel = topicDef.label || "Topic";

  const heading = document.getElementById("topicStudyHeading");
  const sub = document.getElementById("topicStudySubtitle");
  if (heading) {
    heading.textContent = topicLabel;
    heading.setAttribute("lang", "ar");
    heading.setAttribute("dir", "rtl");
  }
  document.title = `${topicLabel} · Arabic · English`;
  if (sub) {
    sub.innerHTML = `Studying <strong lang="ar" dir="rtl">${escapeAttr(topicLabel)}</strong> only. Full deck unchanged on <a class="muted inlineLink" href="./index.html">Main deck</a>.`;
  }

  function escapeAttr(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  const els = {
    statDeck: document.getElementById("statDeck"),
    statSaved: document.getElementById("statSaved"),
    statRemoved: document.getElementById("statRemoved"),
    hideCardBtn: document.getElementById("hideCardBtn"),
    saveBtn: document.getElementById("saveBtn"),
    saveToast: document.getElementById("saveToast"),

    stepBtn: document.getElementById("stepBtn"),

    flashcardHit: document.getElementById("flashcardHit"),
    flashcardInner: document.getElementById("flashcardInner"),
    textAr: document.getElementById("textAr"),
    textEnBack: document.getElementById("textEnBack"),
    deckTag: document.getElementById("deckTag"),
  };

  const STORAGE = {
    customWords: "flash.ar-en.customWords.v1",
    removed: "flash.ar-en.removed.v1",
    saved: "flash.ar-en.saved.v1",
  };

  /** @type {number} */
  let saveToastClear = 0;

  const keyOf = (w) => norm(w.ar).toLowerCase();
  const uniqBy = (arr, getKey) => {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      const k = getKey(x);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  };

  function safeJsonParse(text, fallback) {
    try {
      const v = JSON.parse(text);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadCustomWords() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.customWords) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((w) => ({ ar: norm(w.ar), en: norm(w.en), tag: norm(w.tag || "") || "custom" }))
      .filter((w) => w.ar && w.en);
  }

  function loadRemoved() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.removed) ?? "", []);
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map((x) => String(x ?? "").trim().toLowerCase()).filter(Boolean));
  }

  function saveRemoved(removedSet) {
    try {
      localStorage.setItem(STORAGE.removed, JSON.stringify(Array.from(removedSet)));
    } catch {
      // ignore
    }
  }

  function normalizeMemoryWord(w) {
    return {
      ar: norm(w.ar),
      en: norm(w.en),
      tag: norm(w.tag || "") || "saved",
    };
  }

  function loadSavedCards() {
    const raw = safeJsonParse(localStorage.getItem(STORAGE.saved) ?? "", []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeMemoryWord).filter((w) => w.ar && w.en);
  }

  function persistSavedCards(list) {
    const dedup = uniqBy(list.map(normalizeMemoryWord), keyOf);
    try {
      localStorage.setItem(STORAGE.saved, JSON.stringify(dedup));
    } catch {
      // ignore
    }
  }

  function wordMatchesTopic(w) {
    const tag = norm(w.tag || "").toLowerCase() || "general";
    return topicTagSet.has(tag);
  }

  function makeBank() {
    const base = Array.isArray(window.WORD_BANK) ? window.WORD_BANK : [];
    const custom = loadCustomWords();
    const cleaned = [...base, ...custom]
      .map((w) => ({
        ar: norm(w.ar),
        en: norm(w.en),
        tag: norm(w.tag || "") || "general",
      }))
      .filter((w) => w.ar && w.en && wordMatchesTopic(w));
    return uniqBy(cleaned, keyOf);
  }

  let bank = makeBank();
  let removed = loadRemoved();
  let current = null;

  function activeDeck() {
    return bank.filter((w) => !removed.has(keyOf(w)));
  }

  function renderStats() {
    const deck = activeDeck();
    if (els.statDeck) els.statDeck.textContent = String(deck.length);
    if (els.statSaved) els.statSaved.textContent = String(loadSavedCards().length);
    if (els.statRemoved) els.statRemoved.textContent = String(removed.size);
  }

  function showSaveToast(message) {
    if (!els.saveToast) return;
    if (saveToastClear) window.clearTimeout(saveToastClear);
    els.saveToast.textContent = message;
    saveToastClear = window.setTimeout(() => {
      els.saveToast.textContent = "";
      saveToastClear = 0;
    }, 2000);
  }

  function saveCurrentToMemoryBank() {
    if (!current) return;
    const incoming = normalizeMemoryWord({
      ar: current.ar,
      en: current.en,
      tag: current.tag || "general",
    });
    const list = loadSavedCards();
    const id = keyOf(incoming);
    if (list.some((w) => keyOf(w) === id)) {
      showSaveToast("Already in saved deck.");
      return;
    }
    list.push(incoming);
    persistSavedCards(list);
    renderStats();
    showSaveToast("Saved to memory bank.");
  }

  function showingEnglish() {
    return Boolean(els.flashcardInner?.classList.contains("isFlipped"));
  }

  function flipFacesOnly() {
    if (!current || !els.flashcardInner) return;
    els.flashcardInner.classList.toggle("isFlipped");
    updateStepUi();
    els.flashcardHit?.setAttribute("aria-expanded", String(showingEnglish()));
  }

  function updateStepUi() {
    const esp = showingEnglish();
    if (els.stepBtn) els.stepBtn.textContent = esp ? "Next ▸" : "Flip ▸";
  }

  function pickWord({ shuffle = false, excludeId = "" } = {}) {
    const words = activeDeck();
    if (!words.length) return null;
    let pool = words;
    if (excludeId && pool.length > 1) pool = pool.filter((w) => keyOf(w) !== excludeId);
    if (!pool.length) return words[Math.floor(Math.random() * words.length)];
    if (shuffle) return pool[Math.floor(Math.random() * pool.length)];
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  function showCard(word) {
    current = word;
    if (els.flashcardInner) els.flashcardInner.classList.remove("isFlipped");
    updateStepUi();

    if (!word) {
      if (els.textAr) els.textAr.textContent = "No cards in this topic (or all hidden).";
      if (els.textEnBack) els.textEnBack.textContent = "—";
      if (els.deckTag) els.deckTag.textContent = "—";
      if (els.flashcardHit) els.flashcardHit.disabled = true;
      return;
    }
    if (els.flashcardHit) els.flashcardHit.disabled = false;
    if (els.textAr) els.textAr.textContent = word.ar;
    if (els.textEnBack) {
      els.textEnBack.textContent =
        typeof window.primaryEnglish === "function" ? window.primaryEnglish(word.en) : word.en;
    }
    if (els.deckTag) els.deckTag.textContent = word.tag;
    try {
      els.flashcardHit?.focus({ preventScroll: true });
    } catch {
      // ignore
    }
  }

  function stepForwardFromRightArrow() {
    if (!current || !els.flashcardInner) return;
    if (!els.flashcardInner.classList.contains("isFlipped")) {
      els.flashcardInner.classList.add("isFlipped");
      updateStepUi();
      els.flashcardHit?.setAttribute("aria-expanded", "true");
      return;
    }
    showCard(pickWord({ shuffle: false, excludeId: keyOf(current) }) || pickWord({ shuffle: true }));
  }

  function refreshAll() {
    bank = makeBank();
    renderStats();
  }

  function reloadRemovedFromStorage() {
    removed = loadRemoved();
    renderStats();
  }

  function removeCurrentPermanently() {
    if (!current) return;
    const id = keyOf(current);
    if (!id) return;
    removed.add(id);
    saveRemoved(removed);
    renderStats();
    showCard(pickWord({ shuffle: true, excludeId: id }) || pickWord({ shuffle: true }) || null);
  }

  function setupEvents() {
    if (els.stepBtn) els.stepBtn.addEventListener("click", stepForwardFromRightArrow);
    const flipSideBtn = document.getElementById("flipSideBtn");
    const nextCardBtn = document.getElementById("nextCardBtn");
    if (flipSideBtn) {
      flipSideBtn.addEventListener("click", (e) => {
        e.preventDefault();
        flipFacesOnly();
      });
    }
    if (nextCardBtn) {
      nextCardBtn.addEventListener("click", (e) => {
        e.preventDefault();
        stepForwardFromRightArrow();
      });
    }
    if (els.saveBtn) els.saveBtn.addEventListener("click", saveCurrentToMemoryBank);
    if (els.hideCardBtn) els.hideCardBtn.addEventListener("click", removeCurrentPermanently);

    if (els.flashcardHit) {
      els.flashcardHit.addEventListener("click", (e) => {
        e.preventDefault();
        flipFacesOnly();
      });
    }

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE.removed || e.key === STORAGE.customWords) reloadRemovedFromStorage();
    });

    window.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable;
      if (isTyping) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipFacesOnly();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeCurrentPermanently();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForwardFromRightArrow();
        return;
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        saveCurrentToMemoryBank();
      }
    });
  }

  function start() {
    if (!els.flashcardHit || !els.flashcardInner || !els.textAr || !els.textEnBack) {
      console.error("Topic study: flashcard markup is missing on this page.");
      return;
    }
    setupEvents();
    refreshAll();
    showCard(pickWord({ shuffle: true }) || activeDeck()[0] || null);
    updateStepUi();
  }

  function boot() {
    if (!Array.isArray(window.TOPIC_GROUPS) || !window.TOPIC_GROUPS.length) {
      window.setTimeout(boot, 50);
      return;
    }
    const bankReady = () => Array.isArray(window.WORD_BANK) && window.WORD_BANK.length > 0;
    if (bankReady()) {
      start();
      return;
    }
    window.addEventListener("wordbankready", () => start(), { once: true });
    window.setTimeout(() => {
      if (bankReady()) start();
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
