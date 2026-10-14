// Trend Radar: trending YouTube videos and Instagram Reels by niche.
// Data comes from data/trends-youtube.json and data/trends-instagram.json (updated daily).
// Videos play in place on their card; "Open on …" goes to the original.

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const test = new URLSearchParams(location.search).has("test");
  const file = (name) => `data/${test ? "test-" : ""}${name}.json`;

  const NICHES = ["Beauty", "Fashion", "Food", "Fitness", "Tech", "Travel", "Finance", "Lifestyle", "Parenting", "Gaming", "Advertisement"];
  // Used before the first Instagram refresh has run.
  const DEFAULT_TAGS = {
    Beauty: ["skincare", "skincareindia", "makeup"], Fashion: ["fashion", "outfitideas", "ootdindia"], Food: ["foodie", "indianfood", "recipes"],
    Fitness: ["fitness", "workout", "yoga"], Tech: ["tech", "gadgets", "unboxing"], Travel: ["travel", "incredibleindia", "travelreels"],
    Finance: ["personalfinance", "investing", "moneytips"], Lifestyle: ["lifestyle", "dayinmylife", "vlog"], Parenting: ["parenting", "momlife", "parentingtips"],
    Gaming: ["gaming", "bgmi", "gamer"], Advertisement: ["ad", "sponsored", "paidpartnership"],
  };
  const PAGE = 12;

  // Remember the creator's filters on this device.
  const KEY = "cb_trend_filters";
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  const f = { platform: "youtube", niche: "", lang: "", format: "short", days: 7, sort: "views", q: "", ...saved };
  delete f.country;
  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...f, q: "" })); } catch { /* ignore */ } };

  // Official-style Instagram logo: brand gradient tile with the white glyph.
  const IG_LOGO = '<span class="ig-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#fff" d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg></span>';

  // Language of a video: from the daily update, else guessed from the script of its title.
  const SCRIPTS = [[/[\u0900-\u097F]/, "Hindi"], [/[\u0B80-\u0BFF]/, "Tamil"], [/[\u0C00-\u0C7F]/, "Telugu"], [/[\u0980-\u09FF]/, "Bengali"],
    [/[\u0A80-\u0AFF]/, "Gujarati"], [/[\u0C80-\u0CFF]/, "Kannada"], [/[\u0D00-\u0D7F]/, "Malayalam"], [/[\u0A00-\u0A7F]/, "Punjabi"]];
  const langOf = (v) => v.lang || (SCRIPTS.find(([re]) => re.test(v.title || "")) || [, "English"])[1];

  // Every search word must appear somewhere in the text.
  const words = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
  // "#sunscreen" matches the word or the hashtag; "beautybyisraa" matches the channel "Beauty By Israa".
  const squash = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const matches = (text, q) => {
    const t = text.toLowerCase();
    const flat = squash(text);
    return words(q).every((w) => { const bare = w.replace(/^[#@]+/, ""); return !bare || t.includes(bare) || (squash(bare) && flat.includes(squash(bare))); });
  };
  const ytText = (v) => `${v.title} ${v.channel} ${(v.tags || []).join(" ")} ${v.brand || ""}`;
  const igText = (r) => `${r.caption || ""} ${r.account || ""} ${(r.tags || []).join(" ")} ${r.brand || ""}`;

  // "Today" and "this week" count back from the last update, so they never go empty later in the day.
  const latest = () => Math.min(Date.now(), Date.parse(yt && yt.updated) || Date.now());

  let yt = null;
  let ig = null;
  let ytShown = PAGE;
  let igShown = PAGE;
  let started = false;

  // ---------- formatting ----------
  const compact = (n) => {
    if (n === null || n === undefined) return "–";
    if (n >= 1e7) return `${+(n / 1e7).toFixed(1)}Cr`;
    if (n >= 1e5) return `${+(n / 1e5).toFixed(1)}L`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(1)}k`;
    return String(n);
  };
  const ago = (iso) => {
    const h = (Date.now() - Date.parse(iso)) / 36e5;
    if (h < 1) return "just now";
    if (h < 24) return `${Math.floor(h)}h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
  };
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const perHour = (v) => v.views / Math.max(1, (Date.now() - Date.parse(v.published)) / 36e5);

  const ICON = {
    views: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    likes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    comments: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  };

  // ---------- YouTube ----------
  // wide: when a search finds nothing in the chosen filters, look across every niche, language and format this month.
  function ytFiltered(wide) {
    const since = latest() - (wide ? 30 : f.days) * 864e5;
    const seen = new Set();
    const list = (yt ? yt.items : []).filter((v) => {
      if (seen.has(v.id)) return false; // older files listed a video once per country
      const ok = (wide || (v.niche === f.niche && (!f.lang || langOf(v) === f.lang) && (f.format === "all" || v.format === f.format))) &&
        Date.parse(v.published) >= since && (!f.q || matches(ytText(v), f.q));
      if (ok) seen.add(v.id);
      return ok;
    });
    const by = { views: (v) => v.views, likes: (v) => v.likes ?? -1, comments: (v) => v.comments ?? -1, rising: perHour };
    return list.sort((a, b) => by[f.sort](b) - by[f.sort](a));
  }

  function ytCard(v, i, risingCut) {
    const short = v.format === "short";
    const url = short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;
    const rising = perHour(v) >= risingCut;
    return `<article class="tr-card${short ? " is-short" : ""}" data-yt="${esc(v.id)}">
      <div class="tr-media">
        <img src="${esc(v.thumb)}" alt="" loading="lazy">
        <span class="tr-lang">${esc(langOf(v))}</span>
        <span class="tr-rank">#${i + 1}</span>
        ${v.seconds ? `<span class="tr-len">${clock(v.seconds)}</span>` : ""}
        <button type="button" class="tr-play" data-play aria-label="Play ${esc(v.title)} here"><span aria-hidden="true">▶</span></button>
      </div>
      <div class="tr-body">
        <h3 title="${esc(v.title)}">${esc(v.title)}</h3>
        <p class="tr-channel">${esc(v.channel)} · ${ago(v.published)}${rising ? ' <span class="tr-hot">🔥 Rising fast</span>' : ""}</p>
        ${v.paid || v.brand ? `<p class="tr-promo">${v.paid ? '<span class="tr-paid">Paid promotion</span>' : ""}${v.brand ? `with <strong>${esc(v.brand)}</strong>` : ""}</p>` : ""}
        <div class="tr-stats">
          <span title="Views">${ICON.views}${compact(v.views)}</span>
          <span title="${v.likes === null ? "Likes hidden by the creator" : "Likes"}">${ICON.likes}${v.likes === null ? "hidden" : compact(v.likes)}</span>
          <span title="${v.comments === null ? "Comments turned off" : "Comments"}">${ICON.comments}${v.comments === null ? "off" : compact(v.comments)}</span>
        </div>
        <a class="tr-open" href="${url}" target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
      </div>
    </article>`;
  }

  function renderYouTube() {
    const grid = $("tr-grid");
    if (!yt || !yt.items || !yt.items.length) {
      $("tr-summary").textContent = "";
      grid.innerHTML = `<div class="empty">Trending YouTube videos will appear here after the first daily update. Check back tomorrow morning.</div>`;
      $("tr-more").hidden = true;
      return;
    }
    if (!f.q && !yt.items.some((v) => v.niche === f.niche)) {
      $("tr-summary").textContent = "";
      grid.innerHTML = `<div class="empty">${esc(f.niche)} videos will appear after the next daily update. Check back tomorrow morning.</div>`;
      $("tr-more").hidden = true;
      return;
    }
    let list = ytFiltered();
    const widened = !list.length && !!f.q && ytFiltered(true).length > 0;
    if (widened) list = ytFiltered(true);
    const rates = list.map(perHour).sort((a, b) => b - a);
    const risingCut = rates.length >= 5 ? rates[Math.floor(rates.length * 0.15)] : Infinity;
    const label = { views: "most viewed", likes: "most liked", comments: "most commented", rising: "rising fastest" }[f.sort];
    const time = { 1: "today", 7: "this week", 30: "this month" }[f.days];
    const lang = f.lang || "all languages";
    $("tr-summary").innerHTML = widened
      ? `<span class="tr-note">Nothing for “${esc(f.q)}” in ${esc(f.niche)} with these filters, so here ${list.length === 1 ? "is 1 match" : `are ${list.length} matches`} from all niches and languages this month.</span>`
      : list.length
        ? esc(`${list.length} ${f.format === "short" ? "Shorts" : f.format === "long" ? "long videos" : "videos"} · ${f.niche} · ${lang} · posted ${time}${f.q ? ` · matching “${f.q}”` : ""} · ${label} first`)
        : "";
    grid.innerHTML = list.length
      ? list.slice(0, ytShown).map((v, i) => ytCard(v, i, risingCut)).join("")
      : emptyMessage(`${f.format === "short" ? "Shorts" : f.format === "long" ? "long videos" : "videos"} in ${f.niche} · ${lang} · posted ${time}`, [
          f.q && ["q", "Clear the search"], f.days < 30 && ["days", "Show this month"], f.lang && ["lang", "All languages"], f.format !== "all" && ["format", "All formats"],
        ]);
    $("tr-more").hidden = list.length <= ytShown;
    const fmt = { short: "Shorts", long: "Long videos", all: "All videos" }[f.format];
    $("tr-filter-sum").textContent = `${f.niche} · ${f.lang || "All languages"} · ${fmt} · ${{ 1: "Today", 7: "This week", 30: "This month" }[f.days]} · ${{ views: "Most viewed", likes: "Most liked", comments: "Most commented", rising: "Rising fast" }[f.sort]}`;
  }

  // A clear "no results" message that names what was searched and offers ways to widen it.
  // With a search, it also links to the same search on the platform itself, which covers far more than our daily list.
  function emptyMessage(what, options) {
    const opts = options.filter(Boolean);
    const tag = f.q.trim().replace(/^#/, "");
    const outside = !f.q ? "" : f.platform === "youtube"
      ? `<a class="tr-open" href="https://www.youtube.com/results?search_query=${encodeURIComponent(f.q)}" target="_blank" rel="noopener noreferrer">Search “${esc(f.q)}” on YouTube ↗</a>`
      : /^[\p{L}\p{N}_]+$/u.test(tag)
        ? `<a class="tr-open" href="https://www.instagram.com/explore/tags/${encodeURIComponent(tag.toLowerCase())}/" target="_blank" rel="noopener noreferrer">See #${esc(tag.toLowerCase())} on Instagram ↗</a>`
        : "";
    return `<div class="empty tr-empty"><strong>${f.q ? `No results for “${esc(f.q)}”` : "Nothing here yet"}</strong>
      <span>We looked for ${esc(what)}${f.q ? ", across every niche this month too" : ""}.</span>
      ${opts.length ? `<span class="tr-widen">Try: ${opts.map(([k, t]) => `<button type="button" class="link-btn" data-widen="${k}">${t}</button>`).join("")}</span>` : ""}
      ${outside}
    </div>`;
  }

  // ---------- Instagram ----------
  function renderInstagram() {
    const tags = (ig && ig.tags && ig.tags[f.niche]) || DEFAULT_TAGS[f.niche] || [];
    $("ig-tags").innerHTML = tags.map((t) => `<a class="tr-tag" href="https://www.instagram.com/explore/tags/${encodeURIComponent(t)}/" target="_blank" rel="noopener noreferrer">#${esc(t)} <span aria-hidden="true">↗</span></a>`).join("");

    const all = (ig && ig.reels) || [];
    let reels = all.filter((r) => r.niche === f.niche && (!f.q || matches(igText(r), f.q)));
    const widened = !reels.length && !!f.q && all.some((r) => matches(igText(r), f.q));
    if (widened) {
      const seen = new Set();
      reels = all.filter((r) => matches(igText(r), f.q) && !seen.has(r.code) && seen.add(r.code));
    }
    $("ig-note").innerHTML = widened ? `<span class="tr-note">Nothing for “${esc(f.q)}” in ${esc(f.niche)}, so here ${reels.length === 1 ? "is 1 match" : `are ${reels.length} matches`} from all niches.</span>` : "";
    // The preview loads by itself as the card scrolls into view; the cover shows until it does.
    $("ig-grid").innerHTML = reels.length
      ? reels.slice(0, igShown).map((r) => `<article class="tr-card ig-card" data-ig="${esc(r.code)}" data-kind="${esc(r.kind)}">
          <div class="tr-media ig-media">
            <div class="ig-cover">${IG_LOGO}<p>${esc(r.caption || "Instagram Reel")}</p></div>
            <iframe src="https://www.instagram.com/${r.kind === "post" ? "p" : "reel"}/${encodeURIComponent(r.code)}/embed/" title="Instagram Reel preview" loading="lazy" scrolling="no" allowfullscreen onload="this.classList.add('ready')"></iframe>
          </div>
          <div class="tr-body">
            <p class="tr-channel">${r.account ? `@${esc(r.account)} · ` : ""}Found ${ago(r.found + "T08:00:00")}</p>
            ${r.brand ? `<p class="tr-promo">with <strong>${esc(r.brand)}</strong></p>` : ""}
            <a class="tr-open" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open on Instagram ↗</a>
          </div>
        </article>`).join("")
      : f.q
        ? emptyMessage(`Reels in ${f.niche}`, [["q", "Clear the search"]])
        : `<div class="empty">No Reels found for ${esc(f.niche)} yet. They refresh every few days. Meanwhile, tap a hashtag above.</div>`;
    $("ig-more").hidden = reels.length <= igShown;

    const sounds = (ig && ig.sounds) || [];
    $("ig-sounds").innerHTML = sounds.length
      ? sounds.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.title)}</strong><span>${esc(s.source)} ↗</span></a></li>`).join("")
      : `<li class="fine">This week's round-ups will appear after the next update.</li>`;
  }

  // ---------- shared ----------
  function stopAll(except) {
    document.querySelectorAll("#page-trends .tr-card.playing[data-yt]").forEach((c) => {
      if (c === except) return;
      c.classList.remove("playing");
      const frame = c.querySelector("iframe");
      if (frame) frame.remove();
    });
  }

  function syncControls() {
    $("tr-niche").value = f.niche;
    $("ig-niche").value = f.niche;
    $("tr-sort").value = f.sort;
    fillLanguages();
    $("tr-lang").value = f.lang;
    $("tr-q").value = f.q;
    $("ig-q").value = f.q;
    document.querySelectorAll(".tr-searchbox").forEach((b) => b.classList.toggle("has-q", !!f.q));
    document.querySelectorAll("#tr-format button").forEach((b) => b.classList.toggle("active", b.dataset.val === f.format));
    document.querySelectorAll("#tr-time button").forEach((b) => b.classList.toggle("active", Number(b.dataset.val) === f.days));
    document.querySelectorAll("[data-platform-tab]").forEach((b) => {
      const on = b.dataset.platformTab === f.platform;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    $("tr-youtube").hidden = f.platform !== "youtube";
    $("tr-instagram").hidden = f.platform !== "instagram";
    const stamp = f.platform === "youtube" ? yt && yt.updated : ig && ig.updated;
    $("tr-updated").textContent = stamp ? `Updated ${ago(stamp)}.` : "";
  }

  // Languages offered are the ones present in this niche, most videos first.
  function fillLanguages() {
    const counts = {};
    for (const v of (yt && yt.items) || []) if (v.niche === f.niche) counts[langOf(v)] = (counts[langOf(v)] || 0) + 1;
    const langs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (f.lang && !langs.includes(f.lang)) langs.push(f.lang);
    $("tr-lang").innerHTML = `<option value="">All languages</option>` + langs.map((l) => `<option value="${esc(l)}">${esc(l)}</option>`).join("");
  }

  // Search shows a short loading state so it's clear something happened.
  function search(q) {
    const grid = f.platform === "youtube" ? $("tr-grid") : $("ig-grid");
    document.querySelectorAll(".tr-searchbox button[type=submit]").forEach((b) => { b.disabled = true; b.textContent = "Searching…"; });
    grid.innerHTML = `<div class="empty tr-loading"><span class="tr-spinner" aria-hidden="true"></span>Searching…</div>`;
    setTimeout(() => {
      document.querySelectorAll(".tr-searchbox button[type=submit]").forEach((b) => { b.disabled = false; b.textContent = "Search"; });
      set({ q: q.trim() });
      if (window.cpTrack && q.trim()) window.cpTrack("trend_search", { platform: f.platform });
    }, 350);
  }

  function render() {
    stopAll();
    syncControls();
    if (f.platform === "youtube") renderYouTube();
    else renderInstagram();
  }

  function set(changes) {
    Object.assign(f, changes);
    ytShown = PAGE;
    igShown = PAGE;
    remember();
    render();
  }

  function bind() {
    const opts = NICHES.map((n) => `<option value="${n}">${n === "Beauty" ? "Beauty & skincare" : n}</option>`).join("");
    $("tr-niche").innerHTML = opts;
    $("ig-niche").innerHTML = opts;
    $("tr-niche").addEventListener("change", (e) => set({ niche: e.target.value }));
    $("ig-niche").addEventListener("change", (e) => set({ niche: e.target.value }));
    $("tr-lang").addEventListener("change", (e) => set({ lang: e.target.value }));
    $("tr-sort").addEventListener("change", (e) => set({ sort: e.target.value }));
    document.querySelectorAll(".tr-searchbox").forEach((form) => {
      const input = form.querySelector("input");
      form.addEventListener("submit", (e) => { e.preventDefault(); search(input.value); });
      form.querySelector("[data-clear]").addEventListener("click", () => { input.value = ""; set({ q: "" }); input.focus(); });
      input.addEventListener("input", () => { form.classList.toggle("has-q", !!input.value); if (!input.value && f.q) set({ q: "" }); });
    });
    $("tr-format").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) set({ format: b.dataset.val }); });
    $("tr-time").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) set({ days: Number(b.dataset.val) }); });
    document.querySelectorAll("[data-platform-tab]").forEach((b) => b.addEventListener("click", () => set({ platform: b.dataset.platformTab })));
    $("tr-more").addEventListener("click", () => { ytShown += PAGE; renderYouTube(); });
    $("tr-filter-toggle").addEventListener("click", () => {
      const open = $("tr-filters").classList.toggle("open");
      $("tr-filter-toggle").setAttribute("aria-expanded", String(open));
    });
    $("ig-more").addEventListener("click", () => { igShown += PAGE; renderInstagram(); });

    // Play in place: swap the cover for the player. Only one plays at a time.
    $("page-trends").addEventListener("click", (e) => {
      const widen = e.target.closest("[data-widen]");
      if (widen) return set({ q: { q: "" }, days: { days: 30 }, lang: { lang: "" }, format: { format: "all" } }[widen.dataset.widen]);
      const play = e.target.closest("[data-play]");
      if (!play) return;
      const card = play.closest(".tr-card");
      stopAll(card);
      const media = card.querySelector(".tr-media");
      const frame = document.createElement("iframe");
      if (card.dataset.yt) {
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(card.dataset.yt)}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
        frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        frame.title = card.querySelector("h3") ? card.querySelector("h3").textContent : "YouTube video";
      } else {
        frame.src = `https://www.instagram.com/${card.dataset.kind === "post" ? "p" : "reel"}/${encodeURIComponent(card.dataset.ig)}/embed/`;
        frame.title = "Instagram Reel";
        frame.setAttribute("scrolling", "no");
      }
      frame.allowFullscreen = true;
      media.appendChild(frame);
      card.classList.add("playing");
      if (window.cpTrack) window.cpTrack("trend_play", { platform: card.dataset.yt ? "youtube" : "instagram" });
    });
    $("page-trends").addEventListener("click", (e) => {
      const open = e.target.closest(".tr-open");
      if (open && window.cpTrack) window.cpTrack("trend_open", { platform: f.platform });
    });
  }

  async function load() {
    const get = async (name) => { try { const r = await fetch(file(name), { cache: "no-store" }); return r.ok ? r.json() : null; } catch { return null; } };
    [yt, ig] = await Promise.all([get("trends-youtube"), get("trends-instagram")]);
  }

  // Called by the app each time the Trend Radar page opens.
  async function open(profile) {
    if (!f.niche || !NICHES.includes(f.niche)) f.niche = profile && NICHES.includes(profile.niche) ? profile.niche : "Beauty";
    if (!started) {
      started = true;
      bind();
      $("tr-grid").innerHTML = `<div class="empty">Loading what's trending…</div>`;
      await load();
    }
    render();
  }

  window.TrendRadar = { open };
})();
