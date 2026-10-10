// Collab Pro website: menu, scroll reveal, cursor, live openings, portfolio demo,
// contact form, and consent-aware analytics with event tracking.

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- analytics: only after consent, only when a GA4 ID is set ----------
  const cfg = window.CP_CONFIG || {};
  const CONSENT = "cp_consent";
  const getConsent = () => { try { return localStorage.getItem(CONSENT); } catch { return null; } };
  const setConsent = (v) => { try { localStorage.setItem(CONSENT, v); } catch { /* ignore */ } };
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  let gaLoaded = false;
  function loadGa() {
    if (gaLoaded || !cfg.ga4Id || getConsent() !== "yes") return;
    gaLoaded = true;
    gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4Id)}`;
    document.head.appendChild(s);
    gtag("js", new Date());
    gtag("config", cfg.ga4Id, { anonymize_ip: true });
  }
  // Events: sign_up_click, sign_up, login, contact_submit, collab_apply (also used by the app).
  window.cpTrack = (name, params = {}) => { if (gaLoaded) gtag("event", name, params); };

  const consent = $("#consent");
  if (cfg.ga4Id && consent) {
    const openBtn = $("[data-open-consent]");
    if (openBtn) { openBtn.hidden = false; openBtn.addEventListener("click", () => { consent.hidden = false; }); }
    if (!getConsent()) consent.hidden = false;
    consent.addEventListener("click", (e) => {
      const b = e.target.closest("[data-consent]");
      if (!b) return;
      setConsent(b.dataset.consent);
      consent.hidden = true;
      if (b.dataset.consent === "yes") loadGa();
    });
  }
  loadGa();
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-track]");
    if (t) window.cpTrack(t.dataset.track, { location: t.dataset.trackWhere || "" });
  });

  // ---------- mobile menu ----------
  const menuBtn = $(".menu-btn");
  const nav = $("#site-nav");
  if (menuBtn && nav) {
    const set = (open) => { nav.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", String(open)); menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu"); };
    menuBtn.addEventListener("click", () => set(!nav.classList.contains("open")));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
  }

  // ---------- scroll reveal ----------
  const reveal = $$("[data-reveal]");
  if (!reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
        el.style.transitionDelay = `${Math.min(siblings.indexOf(el), 6) * 70}ms`;
        el.classList.add("in");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveal.forEach((el) => io.observe(el));
  } else reveal.forEach((el) => el.classList.add("in"));

  // ---------- cursor ring (mouse only) ----------
  const cursor = $(".cursor");
  if (cursor && !reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let x = 0, y = 0, cx = 0, cy = 0;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; cursor.classList.add("on"); }, { passive: true });
    document.addEventListener("mouseleave", () => cursor.classList.remove("on"));
    document.addEventListener("mouseover", (e) => cursor.classList.toggle("hover", !!e.target.closest("a, button, summary, .chip, input, select, textarea, .mock-portfolio")));
    (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(loop); })();
  }

  // ---------- today's real openings ----------
  $$("[data-live-collabs]").forEach(async (box) => {
    const n = Number(box.dataset.liveCollabs) || 6;
    try {
      const res = await fetch("/data/listings.json", { cache: "no-store" });
      const data = await res.json();
      const items = (data.listings || [])
        .filter((l) => l.pay !== "Not stated")
        .sort((a, b) => (b.pay.startsWith("Paid") ? 1 : 0) - (a.pay.startsWith("Paid") ? 1 : 0))
        .slice(0, n);
      if (!items.length) throw new Error("none");
      const where = (l) => (l.source === "Website" ? l.hostname : l.source);
      box.innerHTML = items.map((l) => `<article class="lc" data-reveal>
          <span class="lc-meta">${esc(where(l))}${l.published ? ` · Posted ${new Date(l.published + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</span>
          <h3>${esc(l.title)}</h3>
          <div class="lc-tags"><span class="t ${l.pay.startsWith("Paid") ? "paid" : "barter"}">${esc(l.pay)}</span>${l.niches.filter((x) => x !== "General").slice(0, 2).map((x) => `<span class="t">${esc(x)}</span>`).join("")}</div>
          <a class="btn btn-primary" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer nofollow" data-track="collab_apply" data-track-where="website">Apply on ${esc(where(l))} ↗</a>
        </article>`).join("");
      $$(".lc", box).forEach((el) => el.classList.add("in"));
    } catch {
      box.innerHTML = `<p class="muted">Today's openings couldn't load here. <a href="/signup">Sign up</a> to browse the full feed.</p>`;
    }
  });

  // ---------- portfolio style demo ----------
  const demo = $("#demo-portfolio");
  $$("[data-demo]").forEach((group) => {
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || !demo) return;
      $$(".chip", group).forEach((c) => c.classList.toggle("on", c === chip));
      if (group.dataset.demo === "theme") demo.className = demo.className.replace(/theme-\w+/, `theme-${chip.dataset.val}`);
      else demo.classList.toggle("side", chip.dataset.val === "side");
    });
  });

  // ---------- contact form (stored in Supabase) ----------
  const form = $("#contact-form");
  if (form) {
    const msg = $("#contact-msg");
    const show = (text, ok) => { msg.textContent = text; msg.hidden = false; msg.classList.toggle("ok", !!ok); };
    form.addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      const bad = [];
      if (!data.name.trim()) bad.push(form.name);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) bad.push(form.email);
      if (data.message.trim().length < 5) bad.push(form.message);
      bad.forEach((f) => f.setAttribute("aria-invalid", "true"));
      if (bad.length) { bad[0].focus(); return show("Please fill in your name, a valid email and a message."); }
      if (!window.Cloud || !window.Cloud.ready) return show("Messages can't be sent right now. Please try again later.");
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        await window.Cloud.sendContact({ name: data.name.trim(), email: data.email.trim(), topic: data.topic, message: data.message.trim() });
        form.reset();
        show("Thanks! Your message has been sent. We'll reply by email.", true);
        window.cpTrack("contact_submit", { topic: data.topic });
      } catch {
        show("Sorry, your message couldn't be sent. Please try again in a minute.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Send message";
      }
    });
  }
})();
