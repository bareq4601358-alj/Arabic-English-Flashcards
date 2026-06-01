/* global window */
(() => {
  "use strict";

  /** Nav link definitions (href + labels match Spanish flashcards site). */
  const ITEMS = {
    home: { id: "home", href: "./index.html", label: "Main" },
    topics: { id: "topics", href: "./topics.html", label: "Topics" },
    matching: { id: "matching", href: "./matching.html", label: "Matching" },
    phrases: { id: "phrases", href: "./phrases.html", label: "Sentences" },
    writing: { id: "writing", href: "./writing.html", label: "Writing" },
    saved: { id: "saved", href: "./saved.html", label: "Saved" },
    savedDeck: { id: "saved", href: "./saved.html", label: "Saved deck" },
    phrasesSaved: { id: "phrasesSaved", href: "./phrases-saved.html", label: "Saved" },
    hidden: { id: "hidden", href: "./hidden.html", label: "Hidden" },
    allHidden: { id: "hidden", href: "./hidden.html", label: "All hidden" },
  };

  /**
   * Per-page nav sets (same organization as English · Spanish flashcards).
   * `secondary` omits the page passed via data-site-nav-current.
   */
  const VARIANTS = {
    deck: ["topics", "matching", "phrases", "writing", "savedDeck"],
    phrases: ["home", "topics", "matching", "writing", "phrasesSaved"],
    writing: ["home", "topics", "matching", "phrases", "saved"],
    secondary: ["home", "topics", "matching", "phrases", "writing", "saved", "hidden"],
    hubBack: ["home", "topics", "matching", "phrases", "writing"],
  };

  function mountNav(el) {
    const variant = el.getAttribute("data-site-nav-variant") || "secondary";
    const current = el.getAttribute("data-site-nav-current") || "";
    const keys = VARIANTS[variant];
    if (!keys) return;

    const inToolbar = el.classList.contains("phraseToolbar-nav");
    el.innerHTML = "";

    for (const key of keys) {
      const item = ITEMS[key];
      if (!item) continue;
      if (variant === "secondary" && item.id === current) continue;

      const a = document.createElement("a");
      a.className = inToolbar ? "btn ghost btnSm phraseToolbar-navBtn" : "btn ghost btnSm";
      a.href = item.href;
      a.textContent = item.label;
      if (item.id === current) {
        a.classList.add("isNavCurrent");
        a.setAttribute("aria-current", "page");
      }
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

  window.SITE_NAV = { ITEMS, VARIANTS };
})();
