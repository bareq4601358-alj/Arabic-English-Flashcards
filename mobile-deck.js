/**
 * Mobile / touch:
 * - Tap card: 1st tap → flip to English; 2nd tap → next card (same as Flip/Next button).
 * - Swipe right → next step; swipe left → flip back (flip-only control).
 * Desktop click on the card still toggles flip only (unchanged).
 *
 * Also: after switching browser tabs, some engines mis-paint 3D flip cards (transparent faces).
 * A tiny layout read nudges a clean repaint (runs on all viewports).
 */
(() => {
  "use strict";

  const hit = document.getElementById("flashcardHit");
  const nextTarget = document.getElementById("nextCardBtn") || document.getElementById("stepBtn");
  if (!hit || !nextTarget) return;

  function nudgeFlashcardRepaint() {
    const inner = document.getElementById("flashcardInner");
    const wrap = hit.closest(".flashcardHit")?.querySelector(".flashcard3d");
    requestAnimationFrame(() => {
      if (inner) void inner.getBoundingClientRect();
      if (wrap) void wrap.getBoundingClientRect();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") nudgeFlashcardRepaint();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) nudgeFlashcardRepaint();
  });

  function shouldEnableGestures() {
    if (typeof window.matchMedia !== "function") return false;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    if (window.matchMedia("(hover: none)").matches && window.matchMedia("(max-width: 900px)").matches)
      return true;
    return window.matchMedia("(max-width: 768px)").matches;
  }

  if (!shouldEnableGestures()) return;

  hit.setAttribute(
    "aria-label",
    "Flashcard — tap to flip, tap again for next card"
  );

  // Capture phase so page handlers (toggle flip) do not run on mobile.
  hit.addEventListener(
    "click",
    (e) => {
      if (hit.disabled) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      nextTarget.click();
    },
    true
  );

  let startX = 0;
  let startY = 0;
  let startT = 0;

  hit.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches || !e.touches[0]) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = e.timeStamp;
    },
    { passive: true }
  );

  hit.addEventListener(
    "touchend",
    (e) => {
      if (hit.disabled) return;
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const x = e.changedTouches[0].clientX;
      const y = e.changedTouches[0].clientY;
      const dx = x - startX;
      const dy = y - startY;
      if (e.timeStamp - startT > 900) return;

      const min = 52;
      if (Math.abs(dx) < min) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return;

      e.preventDefault();
      if (dx > 0) {
        nextTarget.click();
      } else {
        const flipOnly = document.getElementById("flipSideBtn");
        if (flipOnly) flipOnly.click();
        else nextTarget.click();
      }
    },
    { passive: false }
  );
})();
