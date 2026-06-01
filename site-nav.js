/* global window */
(() => {
  "use strict";

  /** Shared main menu (insert into elements with data-site-nav). */
  const NAV = [
    { id: "home", href: "./index.html", label: "Main" },
    { id: "topics", href: "./topics.html", label: "Topics" },
    { id: "matching", href: "./matching.html", label: "Matching" },
    { id: "phrases", href: "./phrases.html", label: "Sentences" },
    { id: "writing", href: "./writing.html", label: "Writing" },
    { id: "saved", href: "./saved.html", label: "Saved" },
    { id: "hidden", href: "./hidden.html", label: "Hidden" },
  ];

  function mountNav(el) {
    const current = el.getAttribute("data-site-nav-current") || el.getAttribute("data-ar-nav-current") || "";
    const items = NAV;
    el.innerHTML = "";
    for (const item of items) {
      const a = document.createElement("a");
      a.className = "btn ghost btnSm";
      if (item.id === current) a.classList.add("isNavCurrent");
      a.href = item.href;
      a.textContent = item.label;
      if (item.id === current) a.setAttribute("aria-current", "page");
      el.appendChild(a);
    }
  }

  function init() {
    document.querySelectorAll("[data-site-nav], [data-ar-nav]").forEach(mountNav);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.SITE_NAV = NAV;
})();
