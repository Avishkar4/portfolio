/* ====================================================================
   animations.js — GSAP / ScrollTrigger layer
   All elements default to visible in CSS, so if any script here fails
   (CDN down, etc.) the page still reads perfectly — animation is an
   enhancement on top of working content, never a gate in front of it.
   ==================================================================== */

(function () {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) return; // graceful no-op fallback

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 1. Sync GSAP's ticker with Lenis ----------
     This is the standard Lenis+GSAP integration: GSAP's ticker becomes
     the single rAF driver, Lenis just gets pumped from inside it, and
     ScrollTrigger recalculates on every Lenis scroll event. */
  if (window.lenis) {
    window.lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => window.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 2. Kinetic word reveal ----------
     Wraps every word in a text node in <span class="word-mask"><span
     class="word-inner">word</span></span>. The mask clips overflow,
     the inner span slides up from below it — classic editorial reveal,
     and it preserves any nested tags (e.g. <em>) inside the heading. */
  function splitWords(el) {
    function walk(node) {
      if (node.nodeType === 3) {
        const parts = node.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (part.trim() === "") {
            frag.appendChild(document.createTextNode(part));
          } else {
            const mask = document.createElement("span");
            mask.className = "word-mask";
            const inner = document.createElement("span");
            inner.className = "word-inner";
            inner.textContent = part;
            mask.appendChild(inner);
            frag.appendChild(mask);
          }
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        Array.from(node.childNodes).forEach(walk);
      }
    }
    Array.from(el.childNodes).forEach(walk);
    return el.querySelectorAll(".word-inner");
  }

  if (!prefersReducedMotion) {
    document.querySelectorAll('[data-reveal="words"]').forEach((el) => {
      const words = splitWords(el);
      gsap.set(words, { yPercent: 115 });
      gsap.to(words, {
        yPercent: 0,
        duration: 0.95,
        ease: "expo.out",
        stagger: 0.025,
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });
  }

  /* ---------- 3. Fade-up reveal for everything else marked data-reveal="fade" ---------- */
  if (!prefersReducedMotion) {
    gsap.set('[data-reveal="fade"]', { y: 36, opacity: 0 });
    ScrollTrigger.batch('[data-reveal="fade"]', {
      start: "top 90%",
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          overwrite: true,
        }),
      once: true,
    });
  }

  /* ---------- 4. Parallax divider — layered typography at different speeds ---------- */
  if (!prefersReducedMotion) {
    document.querySelectorAll(".pd-layer").forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed || "0.3");
      gsap.to(layer, {
        yPercent: -100 * speed,
        ease: "none",
        scrollTrigger: {
          trigger: ".parallax-divider",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  }

  /* ---------- 5. Sparkline draw-in on each project card ---------- */
  document.querySelectorAll(".proj-spark path").forEach((path) => {
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = prefersReducedMotion ? 0 : len;
    if (!prefersReducedMotion) {
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 1.4,
        ease: "power2.out",
        delay: 0.3,
        scrollTrigger: { trigger: "#galleryPin", start: "top 80%" },
      });
    }
  });

  /* ---------- 6. Pinned horizontal project gallery ----------
     Desktop only — on narrow screens the gallery becomes a normal
     horizontally-scrollable row (see CSS), which is both simpler and
     far less prone to jank on touch devices. */
  ScrollTrigger.matchMedia({
    "(min-width: 881px)": function () {
      const pin = document.getElementById("galleryPin");
      const track = document.getElementById("galleryTrack");
      const progressBar = document.getElementById("galleryProgress");
      if (!pin || !track) return;

      const getDistance = () => Math.max(0, track.scrollWidth - pin.offsetWidth);

      const tween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: () => "+=" + getDistance(),
          scrub: 0.4,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressBar) progressBar.style.width = self.progress * 100 + "%";
          },
        },
      });

      // return a cleanup fn — ScrollTrigger.matchMedia calls this when
      // the breakpoint no longer matches (e.g. window resized to mobile)
      return () => tween.scrollTrigger && tween.scrollTrigger.kill();
    },
  });

  /* ---------- 7. Keep everything measured correctly ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
  });
})();
