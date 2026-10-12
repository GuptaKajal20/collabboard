// Trend Radar: trending YouTube videos and Instagram Reels by niche.
// Data comes from data/trends-youtube.json and data/trends-instagram.json (updated daily).
// Videos play in place on their card; "Open on …" goes to the original.

(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const test = new URLSearchParams(location.search).has("test");
  const file = (name) => `data/${test ? "test-" : ""}${name}.json`;

  const NICHES = ["Beauty", "Fashion", "Food", "Fitness", "Tech", "Travel", "Finance", "Lifestyle", "Parenting", "Gaming"];
  // Used before the first Instagram refresh has run.
  const DEFAULT_TAGS = {
    Beauty: ["skincare", "skincareindia", "makeup"], Fashion: ["fashion", "outfitideas", "ootdindia"], Food: ["foodie", "indianfood", "recipes"],
    Fitness: ["fitness", "workout", "yoga"], Tech: ["tech", "gadgets", "unboxing"], Travel: ["travel", "incredibleindia", "travelreels"],
    Finance: ["personalfinance", "investing", "moneytips"], Lifestyle: ["lifestyle", "dayinmylife", "vlog"], Parenting: ["parenting", "momlife", "parentingtips"],
    Gaming: ["gaming", "bgmi", "gamer"],
  };
  const PAGE = 12;

  // Remember the creator's filters on this device.
  const KEY = "cb_trend_filters";
  const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
  const f = { platform: "youtube", niche: "", country: "IN", format: "short", days: 7, sort: "views", q: "", ...saved };
  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...f, q: "" })); } catch { /* ignore */ } };

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
  function ytFiltered() {
    const since = Date.now() - f.days * 864e5;
    const q = f.q.trim().toLowerCase();
    // The same video can appear for several countries; keep the chosen country's copy.
    const list = (yt ? yt.items : []).filter((v) =>
      v.niche === f.niche && v.country === f.country && (f.format === "all" || v.format === f.format) &&
      Date.parse(v.published) >= since && (!q || `${v.title} ${v.channel}`.toLowerCase().includes(q)));
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
        <span class="tr-rank">#${i + 1}</span>
        ${v.seconds ? `<span class="tr-len">${clock(v.seconds)}</span>` : ""}
        <button type="button" class="tr-play" data-play aria-label="Play ${esc(v.title)} here"><span aria-hidden="true">▶</span></button>
      </div>
      <div class="tr-body">
        <h3 title="${esc(v.title)}">${esc(v.title)}</h3>
        <p class="tr-channel">${esc(v.channel)} · ${ago(v.published)}${rising ? ' <span class="tr-hot">🔥 Rising fast</span>' : ""}</p>
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
    const list = ytFiltered();
    const rates = list.map(perHour).sort((a, b) => b - a);
    const risingCut = rates.length >= 5 ? rates[Math.floor(rates.length * 0.15)] : Infinity;
    const label = { views: "most viewed", likes: "most liked", comments: "most commented", rising: "rising fastest" }[f.sort];
    const country = $("tr-country").selectedOptions[0].textContent;
    const time = { 1: "today", 7: "this week", 30: "this month" }[f.days];
    $("tr-summary").textContent = list.length
      ? `${list.length} ${f.format === "short" ? "Shorts" : f.format === "long" ? "long videos" : "videos"} · ${f.niche} · ${country} · posted ${time} · ${label} first`
      : "";
    grid.innerHTML = list.length
      ? list.slice(0, ytShown).map((v, i) => ytCard(v, i, risingCut)).join("")
      : `<div class="empty">Nothing for these filters yet. Try <button type="button" class="link-btn" data-widen>this month</button> or another country.</div>`;
    $("tr-more").hidden = list.length <= ytShown;
    const fmt = { short: "Shorts", long: "Long videos", all: "All videos" }[f.format];
    $("tr-filter-sum").textContent = `${f.niche} · ${f.country === "GB" ? "UK" : f.country === "US" ? "USA" : "India"} · ${fmt} · ${{ 1: "Today", 7: "This week", 30: "This month" }[f.days]} · ${{ views: "Most viewed", likes: "Most liked", comments: "Most commented", rising: "Rising fast" }[f.sort]}`;
  }

  // ---------- Instagram ----------
  function renderInstagram() {
    const tags = (ig && ig.tags && ig.tags[f.niche]) || DEFAULT_TAGS[f.niche] || [];
    $("ig-tags").innerHTML = tags.map((t) => `<a class="tr-tag" href="https://www.instagram.com/explore/tags/${encodeURIComponent(t)}/" target="_blank" rel="noopener noreferrer">#${esc(t)} <span aria-hidden="true">↗</span></a>`).join("");

    const reels = ((ig && ig.reels) || []).filter((r) => r.niche === f.niche);
    $("ig-grid").innerHTML = reels.length
      ? reels.slice(0, igShown).map((r) => `<article class="tr-card ig-card" data-ig="${esc(r.code)}" data-kind="${esc(r.kind)}">
          <div class="tr-media ig-media">
            <div class="ig-cover"><span class="tr-logo ig" aria-hidden="true"></span><p>${esc(r.caption || "Instagram Reel")}</p></div>
            <button type="button" class="tr-play" data-play-ig aria-label="Play this Reel here"><span aria-hidden="true">▶</span></button>
          </div>
          <div class="tr-body">
            <p class="tr-channel">Found ${ago(r.found + "T08:00:00")}</p>
            <a class="tr-open" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open on Instagram ↗</a>
          </div>
        </article>`).join("")
      : `<div class="empty">No Reels found for ${esc(f.niche)} yet. They refresh every few days. Meanwhile, tap a hashtag above.</div>`;
    $("ig-more").hidden = reels.length <= igShown;

    const sounds = (ig && ig.sounds) || [];
    $("ig-sounds").innerHTML = sounds.length
      ? sounds.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.title)}</strong><span>${esc(s.source)} ↗</span></a></li>`).join("")
      : `<li class="fine">This week's round-ups will appear after the next update.</li>`;
  }

  // ---------- shared ----------
  function stopAll(except) {
    document.querySelectorAll("#page-trends .tr-card.playing").forEach((c) => {
      if (c === except) return;
      c.classList.remove("playing");
      const frame = c.querySelector("iframe");
      if (frame) frame.remove();
    });
  }

  function syncControls() {
    $("tr-niche").value = f.niche;
    $("ig-niche").value = f.niche;
    $("tr-country").value = f.country;
    $("tr-sort").value = f.sort;
    $("tr-q").value = f.q;
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
    $("tr-country").addEventListener("change", (e) => set({ country: e.target.value }));
    $("tr-sort").addEventListener("change", (e) => set({ sort: e.target.value }));
    let typing;
    $("tr-q").addEventListener("input", (e) => { clearTimeout(typing); typing = setTimeout(() => set({ q: e.target.value }), 200); });
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
      if (e.target.closest("[data-widen]")) return set({ days: 30 });
      const play = e.target.closest("[data-play], [data-play-ig]");
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
