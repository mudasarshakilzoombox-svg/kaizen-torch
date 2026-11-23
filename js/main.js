/* =========================================================
   KAIZEN TORCH — interactions & motion
   GSAP + ScrollTrigger + Lenis
   ========================================================= */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var KT = window.KT || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var gsap = window.gsap;
  var ST = window.ScrollTrigger;
  var hasGSAP = !!(gsap && ST);
  if (hasGSAP) gsap.registerPlugin(ST);
  if (!hasGSAP || reduce) document.documentElement.classList.add("no-pin");
  // always start at the top so the intro + pinned sections line up
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);
  var DISC_OUT = 46; // how far (%) the vinyl slides out of its sleeve

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var refreshTimer;
  function refreshST() { if (!hasGSAP) return; clearTimeout(refreshTimer); refreshTimer = setTimeout(function () { ST.refresh(); }, 120); }

  /* =====================================================
     1. BUILD DYNAMIC CONTENT
     ===================================================== */
  var CAT_NAMES = { life: "Life", health: "Health & Well-being", business: "Business & Executive", teams: "Teams & Organisations" };

  // ---------- Categories ----------
  var cats = window.KT_CATEGORIES || [];
  var catTabs = $("#catTabs");
  var currentCat = -1;
  if (catTabs && cats.length) {
    cats.forEach(function (c, i) {
      var b = el("button", "cat-tab");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", "false");
      b.innerHTML = '<span class="cat-tab__n">0' + (i + 1) + '</span><span class="cat-tab__t">' + esc(CAT_NAMES[c.id] || c.title) + '</span><span class="cat-tab__c">' + c.cats.length + " specialisms</span>";
      b.addEventListener("click", function () { setCategory(i); });
      catTabs.appendChild(b);
    });
  }
  function setCategory(i) {
    if (i === currentCat) return;
    var first = currentCat === -1;
    currentCat = i;
    var c = cats[i];
    $$(".cat-tab", catTabs).forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); });
    var apply = function () {
      $("#catTitle").textContent = CAT_NAMES[c.id] || c.title;
      $("#catBlurb").textContent = c.blurb;
      $("#catElig").textContent = (KT.eligibility || {})[c.id] || "";
      $("#catIndex").textContent = "0" + (i + 1);
      var kit = $("#catKit");
      kit.href = (KT.kits || {})[c.id] || "#";
      kit.querySelector("span").textContent = "Download the " + (CAT_NAMES[c.id] || c.title) + " Entry Kit";
      var img = $("#catImg");
      img.src = (KT.categoryImages || {})[c.id] || img.src;
      img.alt = (CAT_NAMES[c.id] || c.title) + " coaching";
      var chips = $("#catChips");
      chips.innerHTML = "";
      c.cats.forEach(function (sc, k) {
        var chip = el("button", "chip" + (k === 0 ? " is-active" : ""));
        chip.type = "button";
        chip.textContent = sc.n;
        chip.addEventListener("click", function () {
          $$(".chip", chips).forEach(function (x) { x.classList.remove("is-active"); });
          chip.classList.add("is-active");
          setDetail(sc);
        });
        chips.appendChild(chip);
      });
      setDetail(c.cats[0], true);
    };
    if (first || !hasGSAP || reduce) { apply(); return; }
    var body = $(".cat-panel__body");
    gsap.to([body, ".cat-panel__media img"], {
      opacity: 0, y: 16, duration: 0.3, ease: "power2.in", onComplete: function () {
        apply();
        gsap.fromTo(body, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" });
        gsap.fromTo(".cat-panel__media img", { opacity: 0, y: 0, scale: 1.2 }, { opacity: 1, scale: 1.08, duration: 1.2, ease: "expo.out" });
        gsap.fromTo(".chip", { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.02, duration: 0.5, ease: "power2.out", delay: 0.1, clearProps: "transform,opacity" });
      }
    });
  }
  function setDetail(sc, silent) {
    var box = $("#catDetail");
    var fill = function () {
      $("#catDetailName").textContent = sc.n;
      $("#catDetailDesc").textContent = sc.d;
      $("#catDetailWho").textContent = sc.w;
    };
    if (silent || !hasGSAP || reduce) { fill(); return; }
    gsap.to(box, { opacity: 0, x: -10, duration: 0.2, onComplete: function () { fill(); gsap.to(box, { opacity: 1, x: 0, duration: 0.5, ease: "expo.out" }); } });
  }
  if (cats.length) setCategory(0);

  // ---------- Jury ring ----------
  var jurors = window.KT_JURORS || [];
  var ringA = $("#ringA"), ringB = $("#ringB"), ringStage = $("#ringStage");
  var ringCards = [];
  function jurorButton(j, idx, cls) {
    var b = el("button", cls);
    b.type = "button";
    b.setAttribute("aria-label", j.name + " — open profile");
    b.innerHTML = '<img src="' + j.img + '" alt="" loading="lazy" draggable="false" /><span>' + esc(j.name) + "</span>";
    b.dataset.idx = idx;
    return b;
  }
  if (ringA && jurors.length) {
    var half = Math.ceil(jurors.length / 2);
    jurors.forEach(function (j, i) {
      var b = jurorButton(j, i, "juror");
      (i < half ? ringA : ringB).appendChild(b);
      ringCards.push({ el: b, ring: i < half ? 0 : 1, index: i < half ? i : i - half, count: i < half ? half : jurors.length - half });
    });
  }

  // ---------- Stories ----------
  var storiesTrack = $("#storiesTrack");
  if (storiesTrack && KT.stories) {
    KT.stories.forEach(function (s) {
      var a = el("article", "story");
      a.innerHTML = '<div class="story__img"><img src="' + s.img + '" alt="" loading="lazy" /><span class="story__badge">Fictional illustration</span></div>' +
        '<div class="story__body"><p class="story__label">' + esc(s.label) + "</p><h3>" + esc(s.title) + "</h3><p>" + esc(s.body) + "</p></div>";
      storiesTrack.appendChild(a);
    });
  }

  // ---------- Portals ----------
  var portalsEl = $("#portals");
  if (portalsEl && KT.portals) {
    KT.portals.forEach(function (p, i) {
      var b = el("button", "portal" + (p.contain ? " portal--contain" : ""));
      b.type = "button";
      b.setAttribute("aria-label", p.kicker + ": " + p.q);
      b.innerHTML =
        '<img class="portal__img portal__img--closed" src="' + p.closed + '" alt="" loading="lazy" />' +
        '<img class="portal__img portal__img--open" src="' + p.open + '" alt="" loading="lazy" />' +
        '<span class="portal__num">0' + (i + 1) + " / 07</span>" +
        '<span class="portal__body"><span class="portal__name">' + esc(p.name) + '</span><span class="portal__q" style="display:block">' + esc(p.q) + '</span><span class="portal__sub" style="display:block">' + esc(p.sub) + '</span><span class="portal__cta">' + esc(p.cta) + " <i>→</i></span></span>";
      b.addEventListener("click", function () {
        if (p.href) { scrollToTarget(p.href); } else { openPortal(p, b); }
      });
      portalsEl.appendChild(b);
    });
  }

  // ---------- Podcast ----------
  var epList = $("#episodes");
  var currentEp = 0;
  if (epList && KT.episodes) {
    KT.episodes.forEach(function (ep, i) {
      var li = el("li");
      li.innerHTML = '<button type="button" aria-pressed="' + (i === 0) + '"><span class="ep__n">' + ep.n + '</span><span><span class="ep__t">' + esc(ep.title) + '</span><span class="ep__g">' + esc(ep.guest) + ' · <em>' + esc(ep.tag) + '</em></span></span><span class="ep__play">▶</span></button>';
      li.querySelector("button").addEventListener("click", function () { setEpisode(i); });
      epList.appendChild(li);
    });
    fillSides(KT.episodes[0]);
  }
  function fillSides(ep) {
    $("#sideA").innerHTML = ep.a.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    $("#sideB").innerHTML = ep.b.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  }
  function setEpisode(i) {
    if (i === currentEp) return;
    currentEp = i;
    var ep = KT.episodes[i];
    $$("button", epList).forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
    var swap = function () {
      $("#sleeveImg").src = ep.img; $("#labelImg").src = ep.img;
      $("#sleeveTitle").textContent = ep.title; $("#sleeveGuest").textContent = ep.guest;
      fillSides(ep);
    };
    if (!hasGSAP || reduce) { swap(); return; }
    var disc = $("#disc");
    gsap.timeline()
      .to(disc, { xPercent: 0, duration: 0.45, ease: "power3.in" })
      .to(".record__sleeve", { rotationY: 90, duration: 0.35, ease: "power2.in" }, 0.1)
      .add(swap)
      .to(".record__sleeve", { rotationY: 0, duration: 0.7, ease: "expo.out" })
      .to(disc, { xPercent: DISC_OUT, duration: 1, ease: "expo.out" }, "-=0.5")
      .fromTo(".record__sides li", { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.03, duration: 0.4 }, "-=0.8");
  }

  // ---------- Team ----------
  var teamGrid = $("#teamGrid");
  if (teamGrid && KT.team) {
    KT.team.forEach(function (m) {
      var a = el("a", "member");
      a.href = m.href; a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("data-reveal", "");
      a.innerHTML = '<div class="member__photo"><img src="' + m.img + '" alt="' + esc(m.name) + '" loading="lazy" /><p class="member__quote">“' + esc(m.quote) + '”</p></div><h3>' + esc(m.name) + "</h3><p>" + esc(m.role) + "</p>";
      teamGrid.appendChild(a);
    });
  }

  // ---------- Collaboration ----------
  var collabGrid = $("#collabGrid");
  if (collabGrid && KT.collab) {
    KT.collab.forEach(function (c, i) {
      var a = el("article", "collab-card" + (c.fit === "contain" ? " collab-card--contain" : ""));
      a.tabIndex = 0;
      a.setAttribute("data-reveal", "");
      a.innerHTML = '<img src="' + c.img + '" alt="" loading="lazy" /><span class="collab-card__n">' + (i < 9 ? "0" : "") + (i + 1) + '</span><div class="collab-card__body"><h3>' + esc(c.t) + "</h3><p>" + esc(c.d) + "</p></div>";
      collabGrid.appendChild(a);
    });
  }

  // ---------- FAQ ----------
  var faqList = $("#faqList");
  if (faqList && KT.faq) {
    KT.faq.forEach(function (f, i) {
      var item = el("div", "faq-item");
      item.setAttribute("data-reveal", "");
      item.innerHTML = '<button class="faq-q" type="button" aria-expanded="false" aria-controls="faq-a-' + i + '" id="faq-q-' + i + '"><span>' + esc(f.q) + '</span><i aria-hidden="true"></i></button>' +
        '<div class="faq-a" id="faq-a-' + i + '" role="region" aria-labelledby="faq-q-' + i + '"><p>' + esc(f.a) + "</p></div>";
      faqList.appendChild(item);
    });
    faqList.addEventListener("click", function (e) {
      var q = e.target.closest(".faq-q");
      if (!q) return;
      var open = q.getAttribute("aria-expanded") === "true";
      $$(".faq-q", faqList).forEach(function (other) {
        if (other !== q && other.getAttribute("aria-expanded") === "true") toggleFaq(other, false);
      });
      toggleFaq(q, !open);
    });
  }
  function toggleFaq(q, open) {
    var a = document.getElementById(q.getAttribute("aria-controls"));
    q.setAttribute("aria-expanded", open ? "true" : "false");
    if (hasGSAP && !reduce) {
      gsap.to(a, { height: open ? "auto" : 0, duration: 0.6, ease: "expo.inOut", onComplete: refreshST });
    } else {
      a.style.height = open ? "auto" : "0px";
      refreshST();
    }
  }

  /* =====================================================
     2. SMOOTH SCROLL (Lenis)
     ===================================================== */
  var lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.5 });
    if (hasGSAP) {
      lenis.on("scroll", ST.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var lraf = function (t) { lenis.raf(t); requestAnimationFrame(lraf); };
      requestAnimationFrame(lraf);
    }
    lenis.stop();
  }
  function scrollToTarget(target) {
    var dest = target === "#top" ? 0 : target;
    if (lenis) { lenis.scrollTo(dest, { offset: dest === 0 ? 0 : -40, duration: 1.6 }); return; }
    if (dest === 0) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    var t = document.querySelector(dest);
    if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-scroll]");
    if (!a) return;
    var h = a.getAttribute("href");
    if (h && h.charAt(0) === "#") { e.preventDefault(); closeMenu(); scrollToTarget(h); }
  });

  /* =====================================================
     3. PRELOADER + HERO INTRO
     ===================================================== */
  var pre = $("#preloader");
  function startSite() {
    document.body.classList.remove("is-loading");
    if (lenis) lenis.start();
    window.KT_READY = true;
    window.dispatchEvent(new Event("kt:ready"));
    heroIntro();
  }
  (function runPreloader() {
    if (!pre) { startSite(); return; }
    var countEl = $("#preloaderCount"), ring = $("#preloaderRing");
    var CIRC = 590.6, target = 0, shown = 0, steps = 0, total = 2, start = performance.now();
    var minTime = reduce ? 150 : 1900;
    function bump() { steps++; target = steps / total; }
    var emblem = $(".preloader__emblem img");
    if (emblem && !emblem.complete) { emblem.addEventListener("load", bump, { once: true }); emblem.addEventListener("error", bump, { once: true }); } else bump();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(bump, bump);
    setTimeout(function () { target = 1; steps = total; }, 4500); // safety net
    var finished = false;
    function tick(now) {
      var timeP = Math.min(1, (now - start) / minTime);
      var goal = Math.min(target, timeP);
      shown += (goal - shown) * 0.1;
      if (goal >= 1 && shown > 0.993) shown = 1;
      countEl.textContent = Math.round(shown * 100);
      ring.style.strokeDashoffset = CIRC * (1 - shown);
      if (shown >= 1 && !finished) { finished = true; finish(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    function finish() {
      if (!hasGSAP) { pre.remove(); startSite(); return; }
      pre.classList.add("is-done");
      gsap.timeline({ onComplete: function () { pre.remove(); } })
        .to(".preloader__inner", { opacity: 0, scale: 0.92, filter: "blur(6px)", duration: 0.6, ease: "power2.in" })
        .to(".preloader__panel--top", { yPercent: -100, duration: 1.2, ease: "expo.inOut" }, "-=0.15")
        .to(".preloader__panel--bottom", { yPercent: 100, duration: 1.2, ease: "expo.inOut" }, "<")
        .add(startSite, "-=0.95");
    }
  })();

  function heroIntro() {
    if (!hasGSAP || reduce) return;
    var tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    // explicit fromTo: the nav also has a CSS transform transition (hide-on-scroll)
    tl.fromTo(".nav", { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, clearProps: "transform,opacity" }, 0.1)
      .from(".hero__eyebrow", { y: 20, opacity: 0, duration: 1 }, 0.25)
      .from(".hero__title .line__inner", { yPercent: 115, rotate: 3, duration: 1.5, stagger: 0.12 }, 0.3)
      .from(".hero__lead", { y: 30, opacity: 0, duration: 1.2 }, 0.65)
      .from(".hero__actions .btn", { y: 30, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.8)
      .from(".hero__meta > *", { y: 30, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.95)
      .from(".hero__scroll", { opacity: 0, duration: 1 }, 1.3);
  }

  /* =====================================================
     4. SCROLL-DRIVEN MOTION
     ===================================================== */
  function splitWords(root) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = el("span", "split-line"), inner = el("span");
            inner.textContent = part;
            outer.appendChild(inner); frag.appendChild(outer); out.push(inner);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") walk(child);
      });
    })(root);
    return out;
  }
  function wrapWords(root) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = el("span", "word"); w.textContent = part; frag.appendChild(w); out.push(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1) walk(child);
      });
    })(root);
    return out;
  }

  if (hasGSAP && !reduce) {
    /* --- Pinned sections are created FIRST (in page order) so every trigger
           created afterwards includes their pin spacing. --- */

    // Ambition — pinned cinematic reveal
    var amb = gsap.timeline({ scrollTrigger: { trigger: "#ambition", start: "top top", end: "+=160%", pin: true, scrub: 1 } });
    amb.fromTo(".ambition__media", { clipPath: "inset(16% 22% 16% 22% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", duration: 1 }, 0)
      .fromTo(".ambition__media img", { scale: 1.35 }, { scale: 1, ease: "none", duration: 1 }, 0)
      .to(".ambition__shade", { opacity: 1, ease: "none", duration: 0.5 }, 0.35)
      .from(".ambition__copy .eyebrow, .ambition__pre", { y: 40, opacity: 0, stagger: 0.08, duration: 0.3 }, 0.45)
      .from(".ambition__title span", { yPercent: 60, opacity: 0, rotateX: -50, stagger: 0.1, duration: 0.4, ease: "power3.out" }, 0.55)
      .from(".ambition__post, .ambition__note", { y: 30, opacity: 0, stagger: 0.1, duration: 0.3 }, 0.8)
      .to({}, { duration: 0.3 });

    // Key dates + stories: horizontal (desktop) / vertical (mobile)
    var mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", function () {
      var track = $("#datesTrack"), cards = $$(".date-card");
      var dDist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      gsap.timeline({
        scrollTrigger: {
          trigger: "#dates", start: "top top", end: function () { return "+=" + (dDist() + window.innerHeight * 0.8); },
          pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate: function (self) { cards.forEach(function (c, i) { c.classList.toggle("is-lit", self.progress >= (i / (cards.length - 1)) * 0.92 - 0.01); }); }
        }
      })
        .to(track, { x: function () { return -dDist(); }, ease: "none" }, 0)
        .fromTo("#datesLine", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);

      var sTrack = $("#storiesTrack");
      var sDist = function () { return Math.max(0, sTrack.scrollWidth - window.innerWidth); };
      gsap.to(sTrack, {
        x: function () { return -sDist(); }, ease: "none",
        scrollTrigger: { trigger: "#stories", start: "top top", end: function () { return "+=" + sDist(); }, pin: true, scrub: 1, invalidateOnRefresh: true }
      });
      $$(".story__img img").forEach(function (img) {
        gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: "none", scrollTrigger: { trigger: "#stories", start: "top top", end: function () { return "+=" + sDist(); }, scrub: true } });
      });
    });
    mm.add("(max-width: 900px)", function () {
      gsap.fromTo("#datesLine", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: "#datesTrack", start: "top 70%", end: "bottom 60%", scrub: true } });
      $$(".date-card").forEach(function (c) {
        ST.create({ trigger: c, start: "top 70%", onEnter: function () { c.classList.add("is-lit"); }, onLeaveBack: function () { c.classList.remove("is-lit"); } });
        gsap.from(c, { x: 40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 88%" } });
      });
      $$(".story").forEach(function (c) { gsap.from(c, { y: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: c, start: "top 88%" } }); });
    });

    // Headings: masked word rise
    $$("[data-split]").forEach(function (h) {
      var words = splitWords(h);
      gsap.from(words, { yPercent: 115, rotate: 4, duration: 1.25, ease: "expo.out", stagger: 0.045, scrollTrigger: { trigger: h, start: "top 86%" } });
    });

    // Generic reveals — checked against the live layout on every scroll frame,
    // so they also work after deep links, big jumps or dropped frames
    // (anything in view OR already scrolled past is revealed).
    var pendingReveals = $$("[data-reveal]");
    gsap.set(pendingReveals, { opacity: 0, y: 50 });
    var revealQueued = false;
    var checkReveals = function () {
      revealQueued = false;
      if (!pendingReveals.length) return;
      var limit = window.innerHeight * 0.92, batch = [];
      pendingReveals = pendingReveals.filter(function (el) {
        if (el.getBoundingClientRect().top < limit) { batch.push(el); return false; }
        return true;
      });
      // clearProps hands transform back to CSS so :hover lifts keep working
      if (batch.length) gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, overwrite: true, clearProps: "transform" });
    };
    var queueReveals = function () { if (!revealQueued) { revealQueued = true; requestAnimationFrame(checkReveals); } };
    window.addEventListener("scroll", queueReveals, { passive: true });
    window.addEventListener("resize", queueReveals);
    window.addEventListener("kt:ready", queueReveals);
    queueReveals();

    // Manifesto + note: words light up as you read
    $$("[data-words], .note__line").forEach(function (p) {
      var words = wrapWords(p);
      gsap.fromTo(words, { opacity: 0.12 }, { opacity: 1, ease: "none", stagger: 0.08, scrollTrigger: { trigger: p, start: "top 82%", end: "bottom 52%", scrub: true } });
    });
    gsap.to(".manifesto__sun", { rotate: 120, yPercent: -30, ease: "none", scrollTrigger: { trigger: ".manifesto", start: "top bottom", end: "bottom top", scrub: true } });

    // Hero parallax out
    gsap.to(".hero__content", { yPercent: -18, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 10%", scrub: true } });

    // Marquee speeds up with scroll direction
    gsap.to(".marquee__track", { xPercent: -8, ease: "none", scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true } });

    // Crowns stage entrance
    gsap.from(".crowns__stage", { y: 120, scale: 0.8, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: "#crowns", start: "top 80%" } });
    gsap.to(".recognition__spot", { rotate: 25, ease: "none", scrollTrigger: { trigger: ".recognition", start: "top bottom", end: "bottom top", scrub: true } });

    // Category image parallax
    gsap.to(".cat-panel__media img", { yPercent: -6, ease: "none", scrollTrigger: { trigger: ".cat-panel", start: "top bottom", end: "bottom top", scrub: true } });

    // Criteria rings
    ST.create({
      trigger: "#criteria", start: "top 80%", once: true, onEnter: function () {
        $$(".criterion").forEach(function (c, i) {
          var v = +c.dataset.value, bar = c.querySelector(".bar"), num = c.querySelector(".count"), o = { n: 0 };
          gsap.to(bar, { strokeDashoffset: 326.7 * (1 - v / 100), duration: 2, delay: i * 0.12, ease: "expo.out" });
          gsap.to(o, { n: v, duration: 2, delay: i * 0.12, ease: "expo.out", onUpdate: function () { num.textContent = Math.round(o.n); } });
        });
      }
    });

    // Portals rise like doors
    gsap.from(".portal", { y: 140, opacity: 0, rotateX: -12, transformOrigin: "50% 100%", duration: 1.4, ease: "expo.out", stagger: 0.09, scrollTrigger: { trigger: "#portals", start: "top 82%" } });

    // Podcast record slides out
    gsap.set("#disc", { x: 0, xPercent: 0 });
    gsap.to("#disc", { xPercent: DISC_OUT, ease: "none", scrollTrigger: { trigger: ".podcast", start: "top 75%", end: "top 25%", scrub: 1 } });
    gsap.from(".record__sleeve", { rotationY: -25, rotationX: 10, y: 60, opacity: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".podcast", start: "top 75%" } });

    // Final coin + rays
    gsap.from(".final__coin", { scale: 0.4, opacity: 0, y: 80, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: "#final", start: "top 70%" } });
    gsap.fromTo(".footer__giant", { xPercent: 8 }, { xPercent: -8, ease: "none", scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true } });
  } else {
    // No motion: make sure dynamic states are final
    $$(".date-card").forEach(function (c) { c.classList.add("is-lit"); });
    $$(".criterion").forEach(function (c) {
      var v = +c.dataset.value;
      c.querySelector(".bar").style.strokeDashoffset = 326.7 * (1 - v / 100);
      c.querySelector(".count").textContent = v;
    });
    var line = $("#datesLine"); if (line) line.style.transform = "none";
  }

  /* =====================================================
     5. INTERACTIVE COMPONENTS
     ===================================================== */

  // ---------- Tilt cards ----------
  if (!isTouch && hasGSAP) {
    $$(".tilt-card").forEach(function (card) {
      var rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
      var ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        rx((0.5 - py) * 14); ry((px - 0.5) * 16);
        card.style.setProperty("--gx", px * 100 + "%"); card.style.setProperty("--gy", py * 100 + "%");
      });
      card.addEventListener("pointerleave", function () { rx(0); ry(0); });
    });
  }

  // ---------- Crowns ----------
  var crownsEl = $("#crowns");
  if (crownsEl) {
    crownsEl.dataset.active = "gold";
    var crownTimer = null, userPicked = false;
    var order = ["gold", "silver", "bronze"];
    var setCrown = function (name) {
      var cur = $(".crown.is-active", crownsEl), next = $('.crown[data-crown="' + name + '"]', crownsEl);
      if (!next || cur === next) return;
      crownsEl.dataset.active = name;
      $$("[data-crown-btn]", crownsEl).forEach(function (b) { b.setAttribute("aria-selected", b.dataset.crownBtn === name ? "true" : "false"); });
      if (hasGSAP && !reduce) {
        gsap.to(cur, { opacity: 0, rotationY: -70, x: -90, scale: 0.85, duration: 0.7, ease: "power3.in" });
        gsap.fromTo(next, { opacity: 0, rotationY: 70, x: 90, scale: 0.85 }, { opacity: 1, rotationY: 0, x: 0, scale: 1, duration: 1.2, ease: "expo.out", delay: 0.3 });
      } else { cur.style.opacity = 0; next.style.opacity = 1; }
      cur.classList.remove("is-active"); next.classList.add("is-active");
    };
    $$("[data-crown-btn]", crownsEl).forEach(function (b) {
      b.addEventListener("click", function () { userPicked = true; clearInterval(crownTimer); setCrown(b.dataset.crownBtn); });
    });
    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        clearInterval(crownTimer);
        if (en[0].isIntersecting && !userPicked) {
          crownTimer = setInterval(function () {
            var i = order.indexOf(crownsEl.dataset.active);
            setCrown(order[(i + 1) % order.length]);
          }, 3800);
        }
      }, { threshold: 0.4 }).observe(crownsEl);
    }
    // gentle parallax on the stage
    if (!isTouch && hasGSAP) {
      var stageEl = $(".crowns__stage");
      var srx = gsap.quickTo(stageEl, "rotationX", { duration: 1, ease: "power3.out" });
      var sry = gsap.quickTo(stageEl, "rotationY", { duration: 1, ease: "power3.out" });
      stageEl.style.transformStyle = "preserve-3d";
      crownsEl.addEventListener("pointermove", function (e) {
        var r = crownsEl.getBoundingClientRect();
        srx(((e.clientY - r.top) / r.height - 0.5) * -10);
        sry(((e.clientX - r.left) / r.width - 0.5) * 16);
      });
      crownsEl.addEventListener("pointerleave", function () { srx(0); sry(0); });
    }
  }

  // ---------- Coin flip ----------
  var coinFlip = $("#coinFlip");
  if (coinFlip) {
    var flip = function () { coinFlip.classList.toggle("is-flipped"); };
    coinFlip.addEventListener("click", flip);
    coinFlip.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  }

  // ---------- Hero coin spin on click ----------
  var heroEl = $("#hero");
  if (heroEl) {
    heroEl.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) return;
      if (window.innerWidth >= 760 && e.clientX < window.innerWidth * 0.5) return;
      window.dispatchEvent(new Event("kt:coinspin"));
    });
  }

  // ---------- Jury ring (CSS 3D) ----------
  var ring = { rot: 0, vel: 0, dragging: false, moved: 0, lastX: 0, visible: false, R: [500, 500] };
  function layoutRing() {
    if (!ringCards.length) return;
    var small = window.innerWidth < 760;
    var w = small ? 112 : 150, h = small ? 150 : 200, gap = small ? 10 : 16;
    [0, 1].forEach(function (k) {
      var count = ringCards.filter(function (c) { return c.ring === k; }).length;
      ring.R[k] = Math.round((count * (w + gap)) / (2 * Math.PI));
    });
    ringCards.forEach(function (c) {
      c.el.style.width = w + "px"; c.el.style.height = h + "px";
      c.el.style.left = -w / 2 + "px"; c.el.style.top = -h / 2 + "px";
      c.angle = (360 / c.count) * c.index + (c.ring === 1 ? 180 / c.count : 0);
      c.el.style.transform = "rotateY(" + c.angle + "deg) translateZ(" + ring.R[c.ring] + "px)";
    });
  }
  function renderRing() {
    ringA.style.transform = "rotateX(-6deg) rotateY(" + ring.rot + "deg)";
    ringB.style.transform = "rotateX(-6deg) rotateY(" + (-ring.rot * 0.85) + "deg)";
    ringCards.forEach(function (c) {
      var a = (c.angle + (c.ring === 0 ? ring.rot : -ring.rot * 0.85)) * Math.PI / 180;
      var f = Math.cos(a);
      c.el.style.opacity = f < 0 ? 0 : (0.25 + 0.75 * f).toFixed(3);
      c.el.style.pointerEvents = f > 0.35 ? "auto" : "none";
    });
  }
  if (ringStage && ringCards.length) {
    layoutRing(); renderRing();
    window.addEventListener("resize", function () { layoutRing(); renderRing(); });
    var auto = reduce ? 0 : 0.06;
    (function loop() {
      requestAnimationFrame(loop);
      if (!ring.visible) return;
      if (!ring.dragging) { ring.vel *= 0.94; ring.rot += auto + ring.vel; }
      renderRing();
    })();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { ring.visible = en[0].isIntersecting; }, { rootMargin: "100px" }).observe(ringStage);
    } else ring.visible = true;

    ringStage.addEventListener("pointerdown", function (e) {
      ring.dragging = true; ring.moved = 0; ring.lastX = e.clientX; ring.vel = 0;
    });
    window.addEventListener("pointermove", function (e) {
      if (!ring.dragging) return;
      var dx = e.clientX - ring.lastX; ring.lastX = e.clientX;
      ring.moved += Math.abs(dx);
      ring.rot += dx * 0.12; ring.vel = dx * 0.12;
    });
    window.addEventListener("pointerup", function () { ring.dragging = false; });
    window.addEventListener("pointercancel", function () { ring.dragging = false; });
    ringStage.addEventListener("click", function (e) {
      var b = e.target.closest(".juror");
      if (!b || ring.moved > 6) return;
      openJuror(+b.dataset.idx, b);
    });
    if (lenis) lenis.on("scroll", function (l) { if (ring.visible && !ring.dragging) ring.vel += (l.velocity || 0) * 0.004; });
  }

  // Jury grid toggle
  var juryToggle = $("#juryToggle"), juryGrid = $("#juryGrid");
  if (juryToggle && juryGrid) {
    juryToggle.addEventListener("click", function () {
      var open = juryGrid.hidden;
      if (open && !juryGrid.children.length) {
        jurors.forEach(function (j, i) {
          var b = jurorButton(j, i, "");
          b.innerHTML = '<img src="' + j.img + '" alt="" loading="lazy" /><b>' + esc(j.name) + "</b><small>" + esc(j.title) + "</small>";
          b.addEventListener("click", function () { openJuror(i, b); });
          juryGrid.appendChild(b);
        });
      }
      juryGrid.hidden = !open;
      juryToggle.setAttribute("aria-expanded", open ? "true" : "false");
      juryToggle.querySelector("span").textContent = open ? "Hide the full list" : "View all 44 jurors";
      if (open && hasGSAP && !reduce) gsap.from(juryGrid.children, { y: 30, opacity: 0, stagger: 0.015, duration: 0.8, ease: "expo.out" });
      refreshST();
    });
  }

  // Globe video only plays in view
  var globe = $(".jury__globe");
  if (globe && "IntersectionObserver" in window && !reduce) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { var pr = globe.play(); if (pr && pr.catch) pr.catch(function () {}); } else globe.pause();
    }, { threshold: 0.1 }).observe(globe);
  }

  /* ---------- Modals ---------- */
  var lastFocus = null;
  function openModal(m) {
    lastFocus = document.activeElement;
    m.hidden = false;
    if (lenis) lenis.stop();
    document.documentElement.style.overflow = "hidden";
    if (hasGSAP && !reduce) {
      gsap.fromTo($(".modal__backdrop", m), { opacity: 0 }, { opacity: 1, duration: 0.5 });
      gsap.fromTo($(".modal__card", m), { y: 60, opacity: 0, scale: 0.96, rotationX: 8 }, { y: 0, opacity: 1, scale: 1, rotationX: 0, duration: 0.9, ease: "expo.out" });
    }
    var close = $(".modal__close", m); if (close) close.focus();
  }
  function closeModal(m) {
    var done = function () {
      m.hidden = true;
      var v = $("video", m); if (v) { v.pause(); v.classList.remove("is-playing"); }
      if (lenis) lenis.start();
      document.documentElement.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if (hasGSAP && !reduce) {
      gsap.to($(".modal__card", m), { y: 40, opacity: 0, duration: 0.35, ease: "power2.in" });
      gsap.to($(".modal__backdrop", m), { opacity: 0, duration: 0.4, onComplete: done });
    } else done();
  }
  $$(".modal").forEach(function (m) {
    m.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeModal(m); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = $$(".modal").filter(function (m) { return !m.hidden; })[0];
    if (open) closeModal(open); else closeMenu();
  });

  function openJuror(i) {
    var j = jurors[i]; if (!j) return;
    var m = $("#juryModal");
    $("#jmImg").src = j.img; $("#jmImg").alt = j.name;
    $("#jmName").textContent = j.name;
    $("#jmTitle").textContent = j.title;
    $("#jmBio").textContent = j.bio || "";
    $("#jmLinks").innerHTML = (j.links || []).map(function (l) { return '<a href="' + esc(l.h) + '" target="_blank" rel="noopener">' + esc(l.l) + " ↗</a>"; }).join("");
    openModal(m);
  }

  function openPortal(p) {
    var m = $("#portalModal");
    $("#pmImg").src = p.open; $("#pmImg").alt = "";
    $("#pmKicker").textContent = p.kicker;
    $("#pmTitle").textContent = p.title || p.q;
    $("#pmText").innerHTML = (p.body || [p.sub]).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    $("#pmFacts").innerHTML = (p.facts || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    var act = $("#pmAction");
    act.href = "mailto:" + (KT.links ? KT.links.email : "hello@kaizentorch.com") + "?subject=" + encodeURIComponent("Kaizen Torch " + p.name + " — " + (p.action || "Enquiry"));
    act.querySelector("span").textContent = p.action || "Get in touch";
    var v = $("#pmVideo");
    if (p.video && !reduce) {
      v.src = p.video;
      v.oncanplay = function () { v.classList.add("is-playing"); };
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    } else { v.removeAttribute("src"); v.classList.remove("is-playing"); }
    openModal(m);
  }

  /* ---------- Countdown ---------- */
  $$("[data-countdown]").forEach(function (box) {
    var end = new Date(box.dataset.countdown).getTime();
    var u = { d: $('[data-u="d"]', box), h: $('[data-u="h"]', box), m: $('[data-u="m"]', box), s: $('[data-u="s"]', box) };
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var diff = Math.max(0, end - Date.now());
      var d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
      u.d.textContent = pad(d); u.h.textContent = pad(h); u.m.textContent = pad(m); u.s.textContent = pad(s);
      if (diff <= 0) { $(".countdown__label", box).textContent = "Entries are now closed · Winners announced 25 March 2027"; return; }
      setTimeout(tick, 1000);
    }
    tick();
  });

  /* ---------- Nav behaviour ---------- */
  var nav = $("#nav"), progress = $("#scrollProgress"), toTop = $("#toTop");
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle("is-scrolled", y > 40);
      var menuOpen = document.body.classList.contains("menu-open");
      nav.classList.toggle("is-hidden", !menuOpen && y > lastY && y > 400);
    }
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    if (toTop) toTop.classList.toggle("is-visible", y > window.innerHeight * 1.2);
    lastY = y;
  }
  if (lenis) lenis.on("scroll", onScroll); else window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { scrollToTarget("#top"); });

  // Active nav link
  if (hasGSAP) {
    $$(".nav__links a").forEach(function (a) {
      var target = $(a.getAttribute("href"));
      if (!target) return;
      ST.create({ trigger: target, start: "top 50%", end: "bottom 50%", onToggle: function (self) { a.classList.toggle("is-active", self.isActive); } });
    });
  }

  // Mobile menu
  var burger = $("#burger"), menu = $("#mobileMenu");
  function closeMenu() {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open"); menu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
    if (lenis) lenis.start();
  }
  if (burger && menu) {
    burger.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) { closeMenu(); return; }
      menu.classList.add("is-open"); menu.setAttribute("aria-hidden", "false");
      burger.setAttribute("aria-expanded", "true"); burger.setAttribute("aria-label", "Close menu");
      document.body.classList.add("menu-open");
      if (lenis) lenis.stop();
    });
    // stagger index for the CSS entrance of menu items
    $$(".mobile-menu nav a, .mobile-menu .btn, .mobile-menu__foot").forEach(function (item, i) { item.style.setProperty("--i", i); });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!isTouch && hasGSAP && !reduce) {
    $$(".magnetic").forEach(function (b) {
      var mx = gsap.quickTo(b, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      var my = gsap.quickTo(b, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.3);
        my((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      b.addEventListener("pointerleave", function () { mx(0); my(0); });
    });
  }

  /* ---------- Custom cursor ---------- */
  var cursor = $(".cursor");
  if (cursor && !isTouch) {
    var dot = $(".cursor__dot", cursor), ringC = $(".cursor__ring", cursor), label = $(".cursor__label", cursor);
    var pos = { x: -100, y: -100 }, rpos = { x: -100, y: -100 };
    window.addEventListener("pointermove", function (e) { pos.x = e.clientX; pos.y = e.clientY; }, { passive: true });
    (function loopC() {
      rpos.x += (pos.x - rpos.x) * 0.18; rpos.y += (pos.y - rpos.y) * 0.18;
      dot.style.transform = "translate(" + pos.x + "px," + pos.y + "px) translate(-50%,-50%)";
      ringC.style.transform = "translate(" + rpos.x + "px," + rpos.y + "px) translate(-50%,-50%)";
      label.style.transform = "translate(" + rpos.x + "px," + rpos.y + "px) translate(-50%,-50%)";
      requestAnimationFrame(loopC);
    })();
    document.addEventListener("pointerover", function (e) {
      var lab = e.target.closest("[data-cursor]");
      var hov = e.target.closest("a, button, [role='button'], .collab-card");
      if (lab && !e.target.closest(".juror")) { cursor.classList.add("is-label"); label.textContent = lab.dataset.cursor; } else cursor.classList.remove("is-label");
      cursor.classList.toggle("is-hover", !!hov);
    });
    document.addEventListener("pointerleave", function () { pos.x = pos.y = -100; });
  }

  /* ---------- Final refresh once assets settle ---------- */
  window.addEventListener("load", refreshST);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshST);
})();
