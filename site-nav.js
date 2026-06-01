/* global window */
(() => {
  "use strict";

  /** Shared Arabic main menu (insert into elements with data-ar-nav). */
  const NAV = [
    { id: "home", href: "./index.html", label: "البطاقات" },
    { id: "topics", href: "./topics.html", label: "المواضيع" },
    { id: "matching", href: "./matching.html", label: "المطابقة" },
    { id: "phrases", href: "./phrases.html", label: "الجمل" },
    { id: "writing", href: "./writing.html", label: "الكتابة" },
    { id: "saved", href: "./saved.html", label: "محفوظ" },
    { id: "hidden", href: "./hidden.html", label: "مخفي" },
    { id: "curate", href: "./curate.html", label: "مراجعة الكلمات" },
  ];

  function mountNav(el) {
    const current = el.getAttribute("data-ar-nav-current") || "";
    const hideCurate = el.getAttribute("data-ar-nav-hide-curate") === "true";
    const items = hideCurate ? NAV.filter((n) => n.id !== "curate") : NAV;
    el.innerHTML = "";
    for (const item of items) {
      const a = document.createElement("a");
      a.className = "btn ghost btnSm";
      if (item.id === current) a.classList.add("isNavCurrent");
      a.href = item.href;
      a.textContent = item.label;
      if (item.id === current) {
        a.setAttribute("aria-current", "page");
      }
      el.appendChild(a);
    }
  }

  function applyArabicLabels() {
    document.querySelectorAll("[data-ar-label]").forEach((el) => {
      const t = el.getAttribute("data-ar-label");
      if (t) el.textContent = t;
    });
    document.querySelectorAll("[data-ar-title]").forEach((el) => {
      const t = el.getAttribute("data-ar-title");
      if (t) {
        el.textContent = t;
        if (el.tagName === "TITLE") document.title = t;
      }
    });
  }

  function init() {
    document.querySelectorAll("[data-ar-nav]").forEach(mountNav);
    applyArabicLabels();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SITE_NAV = NAV;
})();
