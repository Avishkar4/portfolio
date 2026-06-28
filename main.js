/* ====================================================================
   main.js — core interaction layer
   Handles: preloader, Lenis smooth scroll, nav (incl. mobile + active
   link state), anchor click scrolling, ticker tape duplication, and custom cursor.
   Animation/ScrollTrigger logic lives in animations.js — this file
   exposes `window.lenis` so animations.js can sync GSAP's ticker to it.
   ==================================================================== */

(function () {
  "use strict";

  /* ---------- 1. Preloader ---------- */
  window.addEventListener("load", () => {
    // tiny delay so the load-bar animation is visible even on fast connections
    setTimeout(() => document.body.classList.add("loaded"), 600);
  });
  // safety net: if 'load' never fires cleanly, reveal the page anyway
  setTimeout(() => document.body.classList.add("loaded"), 4000);

  /* ---------- 2. Custom Cursor Follower Mechanics ---------- */
  const follower = document.querySelector(".mouse-follower");
  
  if (follower && window.gsap) {
    // quickTo pipes coordinates directly into an active tween for 60fps+ performance
    const xTo = gsap.quickTo(follower, "x", { duration: 0.3, ease: "power3.out" });
    const yTo = gsap.quickTo(follower, "y", { duration: 0.3, ease: "power3.out" });

    window.addEventListener("mousemove", (e) => {
      xTo(e.clientX);
      yTo(e.clientY);
    });

    // Expand cursor states when hovering over links, buttons, or informational layout cards
    const interactiveTargets = document.querySelectorAll("a, button, .btn, .metric-card, .experience-card, .cert-card, .achievement-row, #navToggle");
    interactiveTargets.forEach(target => {
      target.addEventListener("mouseenter", () => {
        gsap.to(follower, { scale: 1.5, borderColor: "#FFFFFF", duration: 0.2 });
      });
      target.addEventListener("mouseleave", () => {
        gsap.to(follower, { scale: 1, borderColor: "#636366", duration: 0.2 });
      });
    });
  }

  /* ---------- 3. Lenis smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,           // heavier than default = "luxury" feel
      easing: (t) => Math.min(1, 1 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.1,
    });

    // If GSAP is on the page, animations.js drives Lenis via gsap.ticker
    // (keeps Lenis + ScrollTrigger perfectly in sync, no double rAF loops).
    // Otherwise fall back to a plain rAF loop so smooth scroll still works.
    if (!window.gsap) {
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
    }
  }
  // expose for animations.js (works even if Lenis failed to load — guarded there)
  window.lenis = lenis;

  /* ---------- 4. Anchor click scrolling ----------
      Lenis intercepts native scroll, so plain hash-jumps can fail or
      feel instant/broken. We handle every in-page anchor explicitly. */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      closeMobileMenu();

      if (lenis) {
        lenis.scrollTo(target, { offset: -70, duration: 1.3 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  /* ---------- 5. Nav: scrolled state + active link ---------- */
  const nav = document.getElementById("site-nav");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = Array.from(document.querySelectorAll("section[id], header[id]"));

  function updateNavState() {
    if (!nav) return;
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 40);

    // figure out which section is currently most in view
    let current = null;
    sections.forEach((sec) => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= 120 && rect.bottom >= 120) current = sec.id;
    });
    navLinks.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + current);
    });
  }
  window.addEventListener("scroll", updateNavState, { passive: true });
  updateNavState();

  /* ---------- 6. Mobile menu ---------- */
  const navToggle = document.getElementById("navToggle");
  const navLinksWrap = document.getElementById("navLinks");

  function closeMobileMenu() {
    document.body.classList.remove("menu-open");
    if (navLinksWrap) navLinksWrap.classList.remove("open");
  }
  
  if (navToggle && navLinksWrap) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinksWrap.classList.toggle("open");
      document.body.classList.toggle("menu-open", isOpen);
    });
  }

  /* ---------- 7. Ticker tape — duplicate content for a seamless loop ---------- */
  const track = document.getElementById("tickerTrack");
  if (track) {
    track.innerHTML += track.innerHTML; // duplicate once, CSS animation handles the loop
  }

  /* ---------- 8. Footer year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
