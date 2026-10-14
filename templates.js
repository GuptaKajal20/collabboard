// Portfolio templates for the Designs tab: 5 categories x 10 templates.
// A template is a design (background, fonts, cards, layout) plus the modules it suggests, with sample
// content. Applying one never replaces what the creator already wrote or uploaded (see applyTemplate in designs.js).

(function () {
  const photo = (n) => `/assets/photos/${n}-600.jpg`;
  const PHOTOS = { dupatta: photo("dupatta"), kurta: photo("kurta"), moody: photo("moody"), bw: photo("portrait-bw"), saree: photo("saree"), smile: photo("smile-bw") };

  const CATEGORIES = [
    ["business", "Business", "Entrepreneurs, consultants and creators selling products or services"],
    ["personal", "Personal Brand", "Influencers and creators building their identity"],
    ["aesthetic", "Aesthetic", "Minimal layouts with elegant type and calm styling"],
    ["lifestyle", "Lifestyle", "Travel, fashion, beauty, food and everyday creators"],
    ["education", "Education", "Educators, coaches and subject experts"],
  ];

  // Sample content: only used where the creator has nothing yet. Numbers and prices appear in previews only.
  const SAMPLES = {
    business: {
      name: "Ananya Rao", bio: "Founder, Glow Studio · Skincare consultant, Bengaluru",
      text: "<b>What I offer</b><ul><li>1:1 skincare consultations</li><li>Content for D2C beauty brands</li><li>Workshops for salons and teams</li></ul>",
      link: "Book a consultation", stats: [["Clients served", "320+"], ["Instagram followers", "48k"]], rates: [["Brand Reel", "18000"], ["Consultation (60 min)", "2500"]],
    },
    personal: {
      name: "Riya Kapoor", bio: "Lifestyle creator · Mumbai · Making everyday moments feel special",
      text: "Hi, I'm Riya! I share honest reviews, GRWMs and the little things that make city life fun. My audience trusts what I recommend, and brands love that.",
      link: "Watch my latest collab", stats: [["Instagram followers", "126k"], ["Average Reel views", "60k"], ["Engagement rate", "5.8%"]], rates: [["Instagram Reel", "25000"], ["Story", "6000"], ["Reel + 3 Stories", "38000"]],
    },
    aesthetic: {
      name: "Meera", bio: "Slow living · film photos · soft mornings",
      text: "<i>Calm, considered content for brands that value craft and detail.</i>",
      link: "View my lookbook", stats: [["Followers", "22k"], ["Saves per post", "1.4k"]], rates: [["Styled photo set", "12000"], ["Reel", "15000"]],
    },
    lifestyle: {
      name: "Kabir Sethi", bio: "Travel & food creator · 40 cities and counting · always hungry",
      text: "From street food in Old Delhi to sunsets in Goa, I make travel and food content people actually save and share. 🍜✈️",
      link: "My Goa travel guide", stats: [["Instagram followers", "84k"], ["YouTube subscribers", "31k"], ["Average Reel views", "45k"]], rates: [["Instagram Reel", "20000"], ["YouTube integration", "35000"], ["Story set", "8000"]],
    },
    education: {
      name: "Dr. Neha Iyer", bio: "Biology educator · Making NEET prep simple and visual",
      text: "<b>How I teach</b><ol><li>Concepts explained visually</li><li>Weekly live practice sessions</li><li>Exam strategy that works</li></ol>",
      link: "Join my free masterclass", stats: [["Students taught", "12k"], ["YouTube subscribers", "95k"]], rates: [["Sponsored lesson", "30000"], ["Course partnership", "Let's talk"]],
    },
  };

  // Shorthands for backgrounds.
  const color = (c) => ({ type: "color", color: c });
  const grad = (colors, dir = "to bottom right") => ({ type: "gradient", gradient: { colors, dir } });
  const anim = (preset, colors, base) => ({ type: "anim", anim: { preset, colors, base } });
  const none = { type: "none" };

  // t(name, about, design options, modules after the header)
  const t = (name, about, o, mods) => ({
    name, about, mods, photo: o.photo || PHOTOS.dupatta,
    profile: { layout: o.layout2 || (o.layout === "magazine" ? "side" : "stack"), size: o.size || 104, radius: o.round ?? 50 },
    design: {
      bg: o.bg || none,
      text: { font: o.font || "inter", headFont: o.head || "", color: o.color || "", headColor: o.headColor || "", headWeight: o.weight || 700, headCase: o.upper ? "upper" : "none", headScale: o.scale || 100, headSpacing: o.spacing || 0 },
      look: { layout: o.layout || "classic", cards: o.cards || "auto", radius: o.radius ?? 16, width: o.width || 720, accent: o.accent || "", hover: o.hover || o.accent || "", links: o.links || "card", stats: o.stats || "tiles", gap: o.gap ?? 10 },
    },
  });

  // Each category uses all eight layouts, so neighbouring templates are arranged differently,
  // not just recoloured. Layout CSS lives in portfolio.css (.pb-layout-*).
  const LIST = {
    business: [
      t("Consultant", "Two columns: you on the left, services on the right", { layout: "split", bg: color("#f4f3ef"), font: "inter", head: "dmserif", weight: 400, cards: "card", accent: "#1f4e79", stats: "plain", links: "underline", radius: 10, photo: PHOTOS.saree, size: 132 }, ["text", "stats", "rates", "link", "socials"]),
      t("Studio Grid", "Bento boxes for services, numbers and links", { layout: "bento", bg: color("#eef1f4"), font: "jakarta", head: "jakarta", weight: 800, cards: "card", accent: "#0f6e56", links: "pill", radius: 20, photo: PHOTOS.kurta }, ["stats", "rates", "link", "socials", "text"]),
      t("Annual Report", "Editorial magazine with numbered sections", { layout: "magazine", bg: color("#ffffff"), font: "worksans", head: "archivo", weight: 400, upper: true, spacing: 1, cards: "none", accent: "#111111", stats: "plain", links: "underline", photo: PHOTOS.moody, round: 0, size: 96 }, ["text", "stats", "rates", "link", "socials"]),
      t("Agency Night", "Dark poster with a huge name", { layout: "poster", bg: color("#111318"), font: "space", head: "bebas", weight: 400, scale: 140, spacing: 3, cards: "outline", accent: "#f2e27d", radius: 0, photo: PHOTOS.bw, round: 0 }, ["stats", "text", "link", "rates", "socials"]),
      t("Milestones", "A timeline of what you offer", { layout: "timeline", bg: color("#fbf7f2"), font: "lora", head: "playfair", weight: 600, cards: "none", accent: "#8a4b2a", photo: PHOTOS.dupatta, layout2: "side" }, ["text", "stats", "link", "rates", "socials"]),
      t("Launch Pad", "Moving waves behind glass cards", { layout: "classic", bg: anim("waves", ["#4f46e5", "#06b6d4", "#a5f3fc"], "#0b1020"), font: "outfit", head: "outfit", weight: 800, cards: "transparent", accent: "#818cf8", links: "pill", scale: 115, photo: PHOTOS.smile }, ["link", "stats", "text", "rates", "socials"]),
      t("Card Stack", "Bold borders with hard shadows", { layout: "offset", bg: color("#f2e27d"), font: "space", head: "archivo", weight: 400, cards: "card", accent: "#141413", radius: 6, photo: PHOTOS.kurta, round: 12 }, ["text", "stats", "link", "rates", "socials"]),
      t("Pocket Pitch", "Compact, one-thumb mobile page", { layout: "compact", bg: grad(["#e3f0ff", "#ffffff"], "to bottom"), font: "manrope", head: "manrope", weight: 800, cards: "card", accent: "#1d4ed8", links: "pill", radius: 14, photo: PHOTOS.saree, size: 80 }, ["socials", "link", "stats", "rates", "text"]),
      t("Executive", "Navy and gold, split layout", { layout: "split", bg: grad(["#14213d", "#1f2b4d"], "to bottom"), font: "inter", head: "cormorant", weight: 600, scale: 125, cards: "outline", accent: "#d4a373", links: "underline", photo: PHOTOS.bw, round: 8 }, ["text", "stats", "link", "rates", "socials"]),
      t("Maker Market", "Warm bento with soft cards", { layout: "bento", bg: color("#fff1e0"), font: "dmsans", head: "fraunces", weight: 700, cards: "card", accent: "#c2410c", radius: 24, links: "pill", photo: PHOTOS.smile }, ["text", "rates", "link", "socials", "stats"]),
    ],
    personal: [
      t("Spotlight", "Poster name over glowing orbs", { layout: "poster", bg: anim("orbs", ["#c084fc", "#38bdf8", "#f472b6"], "#0b0b16"), font: "outfit", head: "syne", weight: 800, scale: 130, cards: "transparent", accent: "#c084fc", links: "pill", size: 124, photo: PHOTOS.dupatta }, ["socials", "text", "stats", "link", "rates"]),
      t("Bubblegum Bento", "Playful pink boxes", { layout: "bento", bg: grad(["#ff9a8b", "#ffc3a0", "#fff1e0"], "to bottom right"), font: "poppins", head: "poppins", weight: 800, cards: "card", accent: "#e11d74", radius: 26, links: "pill", photo: PHOTOS.smile }, ["stats", "link", "rates", "socials", "text"]),
      t("Cover Story", "Magazine layout, big serif name", { layout: "magazine", bg: color("#fffdf8"), font: "inter", head: "playfair", weight: 800, scale: 135, cards: "none", accent: "#d85a30", stats: "plain", photo: PHOTOS.kurta, size: 120, round: 6 }, ["text", "stats", "link", "rates", "socials"]),
      t("Neon Night", "Compact page with particles", { layout: "compact", bg: anim("particles", ["#f2e27d", "#ffffff", "#9fd3ff"], "#101322"), font: "space", head: "space", weight: 700, cards: "transparent", accent: "#f2e27d", radius: 18, links: "pill", photo: PHOTOS.bw }, ["socials", "link", "stats", "text", "rates"]),
      t("My Story", "Your journey as a timeline", { layout: "timeline", bg: color("#efe9ff"), font: "dmsans", head: "fraunces", weight: 600, cards: "card", accent: "#5b4bd6", radius: 16, photo: PHOTOS.saree, size: 132 }, ["text", "stats", "link", "socials", "rates"]),
      t("Side by Side", "Profile pinned on the left", { layout: "split", bg: color("#f1f1f1"), font: "jakarta", head: "jakarta", weight: 800, cards: "card", accent: "#111111", radius: 20, photo: PHOTOS.moody, round: 30, size: 140 }, ["socials", "stats", "text", "link", "rates"]),
      t("Sunset", "Warm mesh behind a classic page", { layout: "classic", bg: anim("mesh", ["#fb923c", "#facc15", "#f43f5e"], "#fff4e6"), font: "outfit", head: "outfit", weight: 700, cards: "transparent", accent: "#ea580c", links: "pill", photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Monochrome", "Black and white, outlined poster", { layout: "poster", bg: color("#0f0f0f"), font: "inter", head: "archivo", weight: 400, upper: true, spacing: 1, cards: "outline", accent: "#ffffff", radius: 0, links: "underline", photo: PHOTOS.smile, round: 0 }, ["stats", "text", "link", "rates", "socials"]),
      t("Pop Stack", "Chunky offset cards on yellow", { layout: "offset", bg: color("#fde047"), font: "bricolage", head: "bricolage", weight: 800, cards: "card", accent: "#2563eb", radius: 14, scale: 115, photo: PHOTOS.kurta }, ["text", "stats", "link", "rates", "socials"]),
      t("Signature", "Airy and elegant, centred", { layout: "classic", bg: grad(["#fdfbfb", "#ebedee"], "to bottom"), font: "manrope", head: "instrument", weight: 400, scale: 140, cards: "none", accent: "#9d174d", width: 620, gap: 16, photo: PHOTOS.saree }, ["text", "link", "socials", "stats", "rates"]),
    ],
    aesthetic: [
      t("Linen", "Quiet neutrals, generous space", { layout: "classic", bg: color("#f5f1ea"), font: "lora", head: "cormorant", weight: 500, scale: 130, cards: "none", accent: "#7c6f5b", width: 600, gap: 18, links: "underline", photo: PHOTOS.moody }, ["text", "link", "socials", "rates"]),
      t("Gallery Wall", "Bento frames with thin outlines", { layout: "bento", bg: color("#ffffff"), font: "josefin", head: "josefin", weight: 400, upper: true, spacing: 8, cards: "outline", accent: "#1c1c1a", radius: 0, photo: PHOTOS.bw, round: 0 }, ["stats", "link", "rates", "socials", "text"]),
      t("Film Reel", "Dark poster with flowing lines", { layout: "poster", bg: anim("lines", ["#e7e5e4", "#a8a29e", "#f2e27d"], "#141413"), font: "sourceserif", head: "instrument", weight: 400, scale: 150, cards: "none", accent: "#e7e5e4", photo: PHOTOS.moody }, ["text", "link", "socials"]),
      t("Blush Notes", "Soft pink timeline", { layout: "timeline", bg: color("#fde2e4"), font: "dmsans", head: "fraunces", weight: 400, scale: 120, cards: "card", accent: "#be185d", radius: 28, photo: PHOTOS.dupatta }, ["text", "link", "rates", "socials"]),
      t("Paper", "Editorial pages, left aligned", { layout: "magazine", bg: color("#fbfaf6"), font: "libre", head: "libre", weight: 700, cards: "none", accent: "#3f3f46", stats: "plain", links: "underline", photo: PHOTOS.saree, round: 6 }, ["text", "stats", "link", "rates", "socials"]),
      t("Sage Split", "Muted green, two columns", { layout: "split", bg: grad(["#e8efe6", "#f6f4ec"], "to bottom right"), font: "manrope", head: "cormorant", weight: 600, scale: 125, cards: "transparent", accent: "#4d7c5a", radius: 18, photo: PHOTOS.kurta, size: 140 }, ["text", "link", "socials", "rates"]),
      t("Dusk", "Lilac mesh, compact and calm", { layout: "compact", bg: anim("mesh", ["#e9d5ff", "#c7d2fe", "#fbcfe8"], "#faf5ff"), font: "inter", head: "instrument", weight: 400, scale: 140, cards: "transparent", accent: "#7e22ce", photo: PHOTOS.smile }, ["socials", "text", "link", "stats"]),
      t("Stone Stack", "Warm grey offset cards", { layout: "offset", bg: color("#e7e5e4"), font: "worksans", head: "worksans", weight: 500, upper: true, spacing: 6, scale: 80, cards: "card", accent: "#57534e", radius: 2, photo: PHOTOS.bw }, ["text", "rates", "link", "socials"]),
      t("Midnight Ink", "Soft glow behind outlined boxes", { layout: "classic", bg: anim("orbs", ["#6366f1", "#0ea5e9", "#a78bfa"], "#0a0a14"), font: "lora", head: "playfair", weight: 400, scale: 125, cards: "outline", accent: "#a5b4fc", width: 620, photo: PHOTOS.moody }, ["text", "link", "socials", "stats"]),
      t("Ivory Frame", "Framed photo, magazine type", { layout: "magazine", bg: color("#fffdf7"), font: "sourceserif", head: "dmserif", weight: 400, scale: 115, cards: "outline", accent: "#b45309", radius: 10, size: 150, round: 8, photo: PHOTOS.saree }, ["text", "link", "rates", "socials"]),
    ],
    lifestyle: [
      t("Wanderlust", "Ocean waves, travel bento", { layout: "bento", bg: anim("waves", ["#06b6d4", "#3b82f6", "#a7f3d0"], "#062a3a"), font: "outfit", head: "syne", weight: 800, cards: "transparent", accent: "#22d3ee", links: "pill", photo: PHOTOS.smile }, ["stats", "link", "rates", "socials", "text"]),
      t("Foodie Diary", "Cheerful timeline of your best bites", { layout: "timeline", bg: color("#fff1e0"), font: "poppins", head: "bricolage", weight: 800, cards: "card", accent: "#ea580c", radius: 22, photo: PHOTOS.kurta }, ["text", "stats", "link", "rates", "socials"]),
      t("Glow Up", "Beauty poster in peachy tones", { layout: "poster", bg: grad(["#ffd1dc", "#fff0f3"], "to bottom"), font: "dmsans", head: "playfair", weight: 700, scale: 125, cards: "transparent", accent: "#db2777", links: "pill", size: 120, photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Street Style", "Fashion magazine, big bold type", { layout: "magazine", bg: color("#111111"), font: "inter", head: "bebas", weight: 400, scale: 160, spacing: 3, cards: "outline", accent: "#f2e27d", photo: PHOTOS.bw, round: 4 }, ["stats", "link", "text", "rates", "socials"]),
      t("Weekend", "Relaxed classic with round cards", { layout: "classic", bg: grad(["#a1ffce", "#faffd1"], "to bottom right"), font: "jakarta", head: "jakarta", weight: 800, cards: "card", accent: "#059669", radius: 26, photo: PHOTOS.smile }, ["text", "link", "socials", "stats", "rates"]),
      t("Home Diaries", "Cosy two-column home page", { layout: "split", bg: color("#f6efe7"), font: "lora", head: "fraunces", weight: 600, cards: "card", accent: "#a16207", radius: 20, photo: PHOTOS.saree, size: 140 }, ["text", "link", "rates", "socials"]),
      t("Fit Life", "High-energy compact page", { layout: "compact", bg: anim("particles", ["#a3e635", "#ffffff", "#22d3ee"], "#0b1210"), font: "space", head: "archivo", weight: 400, upper: true, cards: "transparent", accent: "#a3e635", stats: "plain", links: "pill", photo: PHOTOS.kurta }, ["stats", "link", "text", "rates", "socials"]),
      t("Wedding Edit", "Ivory and gold timeline", { layout: "timeline", bg: grad(["#fffaf0", "#f5e6c8"], "to bottom"), font: "sourceserif", head: "cormorant", weight: 600, scale: 135, cards: "none", accent: "#a16207", photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Market Day", "Colour-pop offset cards", { layout: "offset", bg: anim("mesh", ["#f472b6", "#facc15", "#60a5fa"], "#fff7ed"), font: "bricolage", head: "bricolage", weight: 800, cards: "card", accent: "#7c3aed", radius: 18, photo: PHOTOS.smile }, ["link", "text", "stats", "rates", "socials"]),
      t("Monsoon", "Deep teal split with flowing lines", { layout: "split", bg: anim("lines", ["#5eead4", "#99f6e4", "#f2e27d"], "#0c2a2a"), font: "manrope", head: "dmserif", weight: 400, scale: 120, cards: "transparent", accent: "#5eead4", photo: PHOTOS.moody }, ["text", "link", "stats", "socials", "rates"]),
    ],
    education: [
      t("Classroom", "Clear two columns for courses", { layout: "split", bg: color("#f0f7ff"), font: "manrope", head: "manrope", weight: 800, cards: "card", accent: "#2563eb", radius: 14, photo: PHOTOS.saree }, ["text", "link", "stats", "rates", "socials"]),
      t("Scholar", "Book-like magazine pages", { layout: "magazine", bg: color("#fbf8f1"), font: "libre", head: "playfair", weight: 700, cards: "none", accent: "#7f1d1d", links: "underline", stats: "plain", photo: PHOTOS.bw, round: 6 }, ["text", "stats", "link", "rates", "socials"]),
      t("Chalkboard", "Dark green board, outlined boxes", { layout: "bento", bg: color("#1f3a2e"), font: "dmsans", head: "fraunces", weight: 600, cards: "outline", accent: "#fde68a", stats: "plain", radius: 12, photo: PHOTOS.kurta }, ["stats", "link", "rates", "socials", "text"]),
      t("Coach", "Motivating poster with buttons", { layout: "poster", bg: color("#ecfdf5"), font: "outfit", head: "outfit", weight: 800, scale: 120, cards: "card", accent: "#16a34a", links: "pill", photo: PHOTOS.smile }, ["link", "text", "stats", "rates", "socials"]),
      t("Lab Notes", "Techy timeline on navy", { layout: "timeline", bg: color("#0f172a"), font: "space", head: "space", weight: 700, cards: "transparent", accent: "#38bdf8", upper: true, spacing: 2, scale: 90, photo: PHOTOS.moody }, ["stats", "text", "link", "rates", "socials"]),
      t("Study Buddy", "Bright offset cards", { layout: "offset", bg: grad(["#fef9c3", "#e0f2fe"], "to bottom right"), font: "poppins", head: "poppins", weight: 700, cards: "card", accent: "#9333ea", radius: 16, photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Mentor", "Gentle waves, classic glass page", { layout: "classic", bg: anim("waves", ["#818cf8", "#34d399", "#c7d2fe"], "#111827"), font: "inter", head: "dmserif", weight: 400, scale: 120, cards: "transparent", accent: "#a5b4fc", photo: PHOTOS.saree }, ["text", "stats", "link", "rates", "socials"]),
      t("Workshop", "Compact page for quick sign-ups", { layout: "compact", bg: color("#ffedd5"), font: "bricolage", head: "bricolage", weight: 800, cards: "card", accent: "#c2410c", radius: 12, links: "pill", photo: PHOTOS.kurta }, ["link", "rates", "text", "stats", "socials"]),
      t("Lecture Hall", "Formal navy and gold timeline", { layout: "timeline", bg: grad(["#0f1e3d", "#1e3a5f"], "to bottom"), font: "sourceserif", head: "cormorant", weight: 700, scale: 130, cards: "none", accent: "#fbbf24", links: "underline", photo: PHOTOS.bw }, ["text", "stats", "link", "rates", "socials"]),
      t("Bright Mind", "Glowing ideas in a bento grid", { layout: "bento", bg: anim("orbs", ["#a78bfa", "#f0abfc", "#93c5fd"], "#f5f3ff"), font: "jakarta", head: "jakarta", weight: 800, cards: "transparent", accent: "#7c3aed", radius: 20, photo: PHOTOS.smile }, ["stats", "link", "rates", "text", "socials"]),
    ],
  };

  const TEMPLATES = [];
  for (const [cat] of CATEGORIES) LIST[cat].forEach((tpl, i) => TEMPLATES.push({ ...tpl, id: `${cat}-${String(i + 1).padStart(2, "0")}`, cat }));

  window.PortfolioTemplates = { CATEGORIES, SAMPLES, TEMPLATES };
})();
