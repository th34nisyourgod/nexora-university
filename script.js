(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Scroll reveal (IntersectionObserver) — set up FIRST, before
     anything else runs, so a bug elsewhere in this file can never
     leave .reveal content stuck invisible. Belt-and-suspenders:
     a load-event safety net further down force-reveals anything
     still hidden after the page has settled.
     ============================================================ */
  const revealEls = document.querySelectorAll(".reveal");
  try {
    if ("IntersectionObserver" in window && !prefersReducedMotion) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              entry.target.classList.remove("pending");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
      );
      revealEls.forEach((el) => {
        el.classList.add("pending");
        io.observe(el);
      });
    } else {
      revealEls.forEach((el) => el.classList.add("in"));
    }
  } catch (err) {
    revealEls.forEach((el) => {
      el.classList.remove("pending");
      el.classList.add("in");
    });
  }
  window.addEventListener("load", () => {
    setTimeout(() => revealEls.forEach((el) => {
      el.classList.remove("pending");
      el.classList.add("in");
    }), 1200);
  });

  /* ============================================================
     Footer year
     ============================================================ */
  try {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  } catch (err) { /* non-critical */ }

  /* ============================================================
     Sticky header + scroll progress
     ============================================================ */
  const header = document.getElementById("siteHeader");
  const progressFill = document.getElementById("progressFill");

  function onScroll() {
    const scrollY = window.scrollY;
    header.classList.toggle("scrolled", scrollY > 12);

    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
    progressFill.style.width = pct + "%";

    updateActiveNav();
    updateTimelineFill();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ============================================================
     Mobile menu
     ============================================================ */
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");

  hamburger.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    hamburger.classList.toggle("open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      hamburger.classList.remove("open");
      hamburger.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });

  /* ============================================================
     Active nav link highlighting
     ============================================================ */
  const navLinks = Array.from(document.querySelectorAll(".primary-nav .nav-link"));
  const sections = navLinks
    .map((l) => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);

  function updateActiveNav() {
    let currentId = null;
    const scrollPos = window.scrollY + 140;
    sections.forEach((sec) => {
      if (sec.offsetTop <= scrollPos) currentId = sec.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === "#" + currentId);
    });
  }

  /* ============================================================
     Animated stat counters
     ============================================================ */
  const statNums = document.querySelectorAll(".stat-num");
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || "";
    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString() + suffix;
      return;
    }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString() + suffix;
    }
    requestAnimationFrame(tick);
  }
  if (statNums.length) {
    const statObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    statNums.forEach((el) => statObserver.observe(el));
  }

  /* ============================================================
     Program grid — filtering
     Cards are pre-rendered in the HTML (data-cat on each .program-card)
     so all 12 programs are always visible even if this script never
     runs. JS here only adds the filter-by-school interaction on top.
     ============================================================ */
  const programGrid = document.getElementById("programGrid");
  const filterTabs = document.getElementById("filterTabs");

  function applyFilter(filter) {
    if (!programGrid) return;
    programGrid.querySelectorAll(".program-card").forEach((card) => {
      const match = filter === "all" || card.dataset.cat === filter;
      card.classList.toggle("hide", !match);
    });
  }

  if (filterTabs) {
    filterTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-tab");
      if (!btn) return;
      filterTabs.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      applyFilter(btn.dataset.filter);
    });
  }

  /* ============================================================
     Admissions timeline — fill + active step on scroll
     ============================================================ */
  const timelineEl = document.getElementById("timeline");
  const timelineFill = document.getElementById("timelineFill");
  const steps = timelineEl ? Array.from(timelineEl.querySelectorAll(".timeline-step")) : [];

  function updateTimelineFill() {
    if (!timelineEl) return;
    const rect = timelineEl.getBoundingClientRect();
    const winH = window.innerHeight;
    const total = rect.height + winH * 0.5;
    const passed = Math.min(Math.max(winH * 0.75 - rect.top, 0), total);
    const pct = Math.min((passed / total) * 100, 100);
    timelineFill.style.width = pct + "%";

    const activeCount = Math.floor((pct / 100) * steps.length + 0.3);
    steps.forEach((s, i) => s.classList.toggle("active", i < activeCount));
  }

  /* ============================================================
     Admissions form — inline "submit"
     ============================================================ */
  const admitForm = document.getElementById("admitForm");
  const formNote = document.getElementById("formNote");
  if (admitForm) {
    admitForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("fName").value.trim();
      if (!admitForm.checkValidity()) {
        formNote.textContent = "Please fill in every field before sending.";
        formNote.style.color = "#a1442c";
        return;
      }
      formNote.style.color = "";
      formNote.textContent = `Thanks, ${name.split(" ")[0]} — check your inbox for the Nexora packet.`;
      admitForm.reset();
    });
  }

  /* ============================================================
     Faculty horizontal carousel
     ============================================================ */
  const facultyTrack = document.getElementById("facultyTrack");
  const facPrev = document.getElementById("facPrev");
  const facNext = document.getElementById("facNext");
  if (facultyTrack) {
    const scrollAmount = 300;
    facNext.addEventListener("click", () => facultyTrack.scrollBy({ left: scrollAmount, behavior: "smooth" }));
    facPrev.addEventListener("click", () => facultyTrack.scrollBy({ left: -scrollAmount, behavior: "smooth" }));
  }

  /* ============================================================
     Testimonial slider
     ============================================================ */
  const testimonials = Array.from(document.querySelectorAll(".testimonial"));
  const dotsWrap = document.getElementById("testimonialDots");
  let tIndex = 0;
  let tTimer;

  if (testimonials.length && dotsWrap) {
    testimonials.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "t-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Show testimonial " + (i + 1));
      dot.addEventListener("click", () => showTestimonial(i));
      dotsWrap.appendChild(dot);
    });

    function showTestimonial(i) {
      testimonials[tIndex].classList.remove("active");
      dotsWrap.children[tIndex].classList.remove("active");
      tIndex = i;
      testimonials[tIndex].classList.add("active");
      dotsWrap.children[tIndex].classList.add("active");
    }

    function nextTestimonial() {
      showTestimonial((tIndex + 1) % testimonials.length);
    }

    function startAuto() {
      if (prefersReducedMotion) return;
      tTimer = setInterval(nextTestimonial, 5500);
    }
    function stopAuto() {
      clearInterval(tTimer);
    }
    startAuto();
    dotsWrap.addEventListener("mouseenter", stopAuto);
    dotsWrap.addEventListener("mouseleave", startAuto);
  }

  /* ============================================================
     Back to top
     ============================================================ */
  const toTop = document.getElementById("toTop");
  if (toTop) {
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });
  }

  /* ============================================================
     Constellation hero canvas
     ============================================================ */
  const canvas = document.getElementById("constellation");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w, h, nodes;
    const NODE_COUNT_BASE = 46;

    function resize() {
      const hero = canvas.parentElement;
      w = canvas.width = hero.offsetWidth;
      h = canvas.height = hero.offsetHeight;
      const count = Math.round((w * h) / 26000);
      nodes = Array.from({ length: Math.max(18, Math.min(count, NODE_COUNT_BASE)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 1,
      }));
    }

    const inkColor = "27,42,74";
    const brassColor = "184,134,59";

    function draw() {
      ctx.clearRect(0, 0, w, h);
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 150;
          if (dist < maxDist) {
            ctx.strokeStyle = `rgba(${inkColor},${0.12 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${brassColor},0.55)`;
        ctx.fill();
      });

      if (!prefersReducedMotion) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  /* ============================================================
     Program card hide (extra rule injected once for filtering)
     ============================================================ */
  const style = document.createElement("style");
  style.textContent = ".program-card.hide{display:none;}";
  document.head.appendChild(style);
})();
