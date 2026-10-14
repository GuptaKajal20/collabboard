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
  const grad = (a, b, angle = 135) => ({ type: "gradient", gradient: { a, b, angle } });
  const anim = (preset, colors, base) => ({ type: "anim", anim: { preset, colors, base } });
  const none = { type: "none" };

  // t(name, about, design options, modules after the header)
  const t = (name, about, o, mods) => ({
    name, about, mods, photo: o.photo || PHOTOS.dupatta,
    profile: { layout: o.layout || "stack", size: o.size || 104, radius: o.round ?? 50 },
    design: {
      bg: o.bg || none,
      text: { font: o.font || "inter", headFont: o.head || "", color: o.color || "", headColor: o.headColor || "", headWeight: o.weight || 700, headCase: o.upper ? "upper" : "none", headScale: o.scale || 100, headSpacing: o.spacing || 0 },
      look: { cards: o.cards || "auto", radius: o.radius ?? 16, align: o.align || "center", width: o.width || 720, accent: o.accent || "", links: o.links || "card", stats: o.stats || "tiles", cover: !!o.cover, gap: o.gap ?? 8 },
    },
  });

  const LIST = {
    business: [
      t("Consultant", "Clean, structured and trustworthy", { bg: color("#f4f3ef"), font: "inter", head: "dmserif", weight: 400, cards: "solid", accent: "#1f4e79", align: "left", layout: "side", stats: "plain", links: "underline", radius: 10, photo: PHOTOS.saree }, ["text", "stats", "rates", "link", "socials"]),
      t("Studio", "Bold founder page with a brand banner", { bg: none, font: "jakarta", head: "jakarta", weight: 800, cover: true, accent: "#0f6e56", links: "pill", scale: 110, photo: PHOTOS.kurta }, ["link", "text", "stats", "rates", "socials"]),
      t("Agency", "Dark, confident and modern", { bg: color("#111318"), font: "space", head: "space", weight: 700, cards: "glass-dark", accent: "#f2e27d", radius: 14, upper: true, spacing: 4, scale: 90, photo: PHOTOS.bw }, ["stats", "text", "link", "rates", "socials"]),
      t("Boutique", "Elegant serif for premium services", { bg: color("#fbf7f2"), font: "lora", head: "playfair", weight: 600, cards: "outline", accent: "#8a4b2a", radius: 4, width: 640, photo: PHOTOS.dupatta }, ["text", "link", "rates", "socials"]),
      t("Launch", "Product-launch energy with moving waves", { bg: anim("waves", ["#4f46e5", "#06b6d4", "#a5f3fc"], "#0b1020"), font: "outfit", head: "outfit", weight: 800, cards: "glass", accent: "#4f46e5", links: "pill", scale: 115, photo: PHOTOS.smile }, ["link", "stats", "text", "rates", "instagram"]),
      t("Ledger", "Numbers first, crisp and minimal", { bg: color("#ffffff"), font: "worksans", head: "archivo", weight: 400, upper: true, spacing: 2, cards: "none", accent: "#111111", stats: "plain", links: "underline", align: "left", photo: PHOTOS.moody, round: 12 }, ["stats", "rates", "text", "link", "socials"]),
      t("Brutal Pro", "Thick borders, hard shadows, high contrast", { bg: color("#f2e27d"), font: "space", head: "archivo", weight: 400, cards: "brutal", accent: "#141413", radius: 6, links: "card", photo: PHOTOS.kurta, round: 18 }, ["text", "stats", "link", "rates", "socials"]),
      t("Corporate Blue", "Calm gradient for B2B services", { bg: grad("#e3f0ff", "#ffffff", 180), font: "manrope", head: "manrope", weight: 800, cards: "solid", accent: "#1d4ed8", layout: "side", radius: 12, photo: PHOTOS.saree }, ["text", "link", "stats", "rates", "socials"]),
      t("Maker", "Warm, crafty and personable", { bg: color("#fff1e0"), font: "dmsans", head: "fraunces", weight: 700, cards: "soft", accent: "#c2410c", radius: 22, links: "pill", photo: PHOTOS.smile }, ["text", "rates", "link", "socials", "stats"]),
      t("Executive", "Deep navy with gold accents", { bg: grad("#14213d", "#1f2b4d", 160), font: "inter", head: "cormorant", weight: 600, scale: 125, cards: "none", accent: "#d4a373", width: 680, links: "underline", photo: PHOTOS.bw }, ["text", "stats", "link", "rates", "socials"]),
    ],
    personal: [
      t("Spotlight", "Glowing orbs behind a big name", { bg: anim("orbs", ["#c084fc", "#38bdf8", "#f472b6"], "#0b0b16"), font: "outfit", head: "syne", weight: 800, scale: 120, cards: "glass-dark", accent: "#c084fc", links: "pill", size: 124, photo: PHOTOS.dupatta }, ["socials", "text", "stats", "link", "rates"]),
      t("Bubblegum", "Pink, playful and loud", { bg: grad("#ff9a8b", "#ffc3a0", 120), font: "poppins", head: "poppins", weight: 800, cards: "solid", accent: "#e11d74", radius: 26, links: "pill", photo: PHOTOS.smile }, ["text", "link", "stats", "rates", "socials"]),
      t("Cover Star", "Magazine-style banner header", { bg: none, font: "inter", head: "bebas", weight: 400, scale: 150, spacing: 4, cover: true, accent: "#d85a30", stats: "plain", photo: PHOTOS.kurta, size: 120 }, ["stats", "text", "link", "rates", "socials"]),
      t("Neon Night", "Particles on deep blue", { bg: anim("particles", ["#f2e27d", "#ffffff", "#9fd3ff"], "#101322"), font: "space", head: "space", weight: 700, cards: "glass-dark", accent: "#f2e27d", radius: 18, photo: PHOTOS.bw }, ["link", "text", "stats", "rates", "instagram"]),
      t("Side Profile", "Photo beside your story, left aligned", { bg: color("#efe9ff"), font: "dmsans", head: "fraunces", weight: 600, layout: "side", align: "left", cards: "soft", accent: "#5b4bd6", size: 132, photo: PHOTOS.saree }, ["text", "stats", "link", "socials", "rates"]),
      t("Creator Card", "Everything on clean white cards", { bg: color("#f1f1f1"), font: "jakarta", head: "jakarta", weight: 800, cards: "solid", accent: "#111111", radius: 20, links: "card", photo: PHOTOS.moody, round: 30 }, ["socials", "stats", "text", "link", "rates"]),
      t("Sunset Mesh", "Soft moving colours, warm vibe", { bg: anim("mesh", ["#fb923c", "#facc15", "#f43f5e"], "#fff4e6"), font: "outfit", head: "outfit", weight: 700, cards: "glass", accent: "#ea580c", links: "pill", photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Monochrome", "Black and white, sharp type", { bg: color("#0f0f0f"), font: "inter", head: "archivo", weight: 400, upper: true, spacing: 1, cards: "outline", accent: "#ffffff", radius: 0, links: "underline", photo: PHOTOS.smile, round: 0 }, ["stats", "text", "link", "rates", "socials"]),
      t("Pop Grid", "Bright yellow with chunky borders", { bg: color("#fde047"), font: "bricolage", head: "bricolage", weight: 800, cards: "brutal", accent: "#2563eb", radius: 14, scale: 115, photo: PHOTOS.kurta }, ["text", "stats", "link", "rates", "socials"]),
      t("Signature", "Elegant serif name, airy layout", { bg: grad("#fdfbfb", "#ebedee", 180), font: "manrope", head: "instrument", weight: 400, scale: 140, cards: "none", accent: "#9d174d", width: 620, gap: 16, photo: PHOTOS.saree }, ["text", "link", "socials", "stats", "rates"]),
    ],
    aesthetic: [
      t("Linen", "Quiet neutrals and generous space", { bg: color("#f5f1ea"), font: "lora", head: "cormorant", weight: 500, scale: 130, cards: "none", accent: "#7c6f5b", width: 600, gap: 18, links: "underline", photo: PHOTOS.moody }, ["text", "link", "socials", "rates"]),
      t("Gallery", "Spaced capitals, thin lines", { bg: color("#ffffff"), font: "josefin", head: "josefin", weight: 400, upper: true, spacing: 10, cards: "outline", accent: "#1c1c1a", radius: 0, width: 640, photo: PHOTOS.bw, round: 0 }, ["text", "stats", "link", "rates", "socials"]),
      t("Film", "Moody dark with flowing lines", { bg: anim("lines", ["#e7e5e4", "#a8a29e", "#f2e27d"], "#141413"), font: "sourceserif", head: "instrument", weight: 400, scale: 135, cards: "none", accent: "#e7e5e4", width: 620, photo: PHOTOS.moody }, ["text", "link", "socials"]),
      t("Blush", "Soft pink and rounded shapes", { bg: color("#fde2e4"), font: "dmsans", head: "fraunces", weight: 400, scale: 120, cards: "solid", accent: "#be185d", radius: 28, photo: PHOTOS.dupatta }, ["text", "link", "rates", "socials"]),
      t("Paper", "Editorial serif, left aligned", { bg: color("#fbfaf6"), font: "libre", head: "libre", weight: 700, align: "left", cards: "none", accent: "#3f3f46", stats: "plain", links: "underline", width: 680, photo: PHOTOS.saree, round: 6 }, ["text", "stats", "link", "rates", "socials"]),
      t("Sage", "Muted green, calm and natural", { bg: grad("#e8efe6", "#f6f4ec", 160), font: "manrope", head: "cormorant", weight: 600, scale: 125, cards: "soft", accent: "#4d7c5a", radius: 18, photo: PHOTOS.kurta }, ["text", "link", "socials", "rates"]),
      t("Dusk", "Lilac mesh that slowly breathes", { bg: anim("mesh", ["#e9d5ff", "#c7d2fe", "#fbcfe8"], "#faf5ff"), font: "inter", head: "instrument", weight: 400, scale: 140, cards: "glass", accent: "#7e22ce", gap: 12, photo: PHOTOS.smile }, ["text", "link", "stats", "socials"]),
      t("Stone", "Warm grey, small and precise", { bg: color("#e7e5e4"), font: "worksans", head: "worksans", weight: 500, upper: true, spacing: 6, scale: 80, cards: "solid", accent: "#57534e", radius: 2, width: 560, photo: PHOTOS.bw, round: 50 }, ["text", "rates", "link", "socials"]),
      t("Midnight Ink", "Deep ink with a soft glow", { bg: anim("orbs", ["#6366f1", "#0ea5e9", "#a78bfa"], "#0a0a14"), font: "lora", head: "playfair", weight: 400, scale: 125, cards: "none", accent: "#a5b4fc", width: 620, photo: PHOTOS.moody }, ["text", "link", "socials", "stats"]),
      t("Ivory Frame", "Framed photo and centred calm", { bg: color("#fffdf7"), font: "sourceserif", head: "dmserif", weight: 400, scale: 115, cards: "outline", accent: "#b45309", radius: 10, size: 150, round: 8, photo: PHOTOS.saree }, ["text", "link", "rates", "socials"]),
    ],
    lifestyle: [
      t("Wanderlust", "Ocean waves for travel creators", { bg: anim("waves", ["#06b6d4", "#3b82f6", "#a7f3d0"], "#062a3a"), font: "outfit", head: "syne", weight: 800, cards: "glass", accent: "#0891b2", links: "pill", photo: PHOTOS.smile }, ["text", "link", "stats", "rates", "instagram"]),
      t("Foodie", "Warm, cheerful and hungry", { bg: color("#fff1e0"), font: "poppins", head: "bricolage", weight: 800, cards: "solid", accent: "#ea580c", radius: 22, cover: true, photo: PHOTOS.kurta }, ["text", "stats", "link", "rates", "socials"]),
      t("Glow Up", "Beauty creator in peachy tones", { bg: grad("#ffd1dc", "#fff0f3", 160), font: "dmsans", head: "playfair", weight: 700, cards: "glass", accent: "#db2777", links: "pill", size: 120, photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Street Style", "Fashion-forward, big bold type", { bg: color("#111111"), font: "inter", head: "bebas", weight: 400, scale: 160, spacing: 3, cards: "outline", accent: "#f2e27d", align: "left", layout: "side", photo: PHOTOS.bw, round: 4 }, ["stats", "link", "text", "rates", "socials"]),
      t("Weekend", "Relaxed gradient, rounded cards", { bg: grad("#a1ffce", "#faffd1", 135), font: "jakarta", head: "jakarta", weight: 800, cards: "solid", accent: "#059669", radius: 26, photo: PHOTOS.smile }, ["text", "link", "socials", "stats", "rates"]),
      t("Home Diaries", "Cosy, soft and homely", { bg: color("#f6efe7"), font: "lora", head: "fraunces", weight: 600, cards: "soft", accent: "#a16207", align: "left", layout: "side", radius: 20, photo: PHOTOS.saree }, ["text", "link", "rates", "socials"]),
      t("Fit Life", "High energy with particles", { bg: anim("particles", ["#a3e635", "#ffffff", "#22d3ee"], "#0b1210"), font: "space", head: "archivo", weight: 400, upper: true, cards: "glass-dark", accent: "#a3e635", stats: "plain", photo: PHOTOS.kurta }, ["stats", "text", "link", "rates", "socials"]),
      t("Wedding Edit", "Ivory and gold, very elegant", { bg: grad("#fffaf0", "#f5e6c8", 180), font: "sourceserif", head: "cormorant", weight: 600, scale: 135, cards: "none", accent: "#a16207", width: 640, gap: 14, photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Market Day", "Colour-pop mesh, fun and bright", { bg: anim("mesh", ["#f472b6", "#facc15", "#60a5fa"], "#fff7ed"), font: "bricolage", head: "bricolage", weight: 800, cards: "brutal", accent: "#7c3aed", radius: 18, photo: PHOTOS.smile }, ["link", "text", "stats", "rates", "socials"]),
      t("Monsoon", "Deep teal with flowing lines", { bg: anim("lines", ["#5eead4", "#99f6e4", "#f2e27d"], "#0c2a2a"), font: "manrope", head: "dmserif", weight: 400, scale: 120, cards: "glass-dark", accent: "#5eead4", photo: PHOTOS.moody }, ["text", "link", "stats", "socials", "rates"]),
    ],
    education: [
      t("Classroom", "Friendly, clear and readable", { bg: color("#f0f7ff"), font: "manrope", head: "manrope", weight: 800, cards: "solid", accent: "#2563eb", radius: 14, layout: "side", photo: PHOTOS.saree }, ["text", "link", "stats", "rates", "socials"]),
      t("Scholar", "Book-like serif and quiet lines", { bg: color("#fbf8f1"), font: "libre", head: "playfair", weight: 700, cards: "outline", accent: "#7f1d1d", align: "left", width: 680, radius: 6, links: "underline", photo: PHOTOS.bw }, ["text", "stats", "link", "rates", "socials"]),
      t("Chalkboard", "Dark green board with soft type", { bg: color("#1f3a2e"), font: "dmsans", head: "fraunces", weight: 600, cards: "none", accent: "#fde68a", stats: "plain", photo: PHOTOS.kurta }, ["text", "stats", "link", "rates", "socials"]),
      t("Coach", "Motivating with a bold banner", { bg: none, font: "outfit", head: "outfit", weight: 800, scale: 115, cover: true, accent: "#16a34a", links: "pill", cards: "soft", photo: PHOTOS.smile }, ["link", "text", "stats", "rates", "socials"]),
      t("Lab Notes", "Techy grid feel, mono-ish type", { bg: color("#0f172a"), font: "space", head: "space", weight: 700, cards: "glass-dark", accent: "#38bdf8", radius: 8, upper: true, spacing: 2, scale: 90, photo: PHOTOS.moody }, ["stats", "text", "link", "rates", "socials"]),
      t("Study Buddy", "Bright, playful and approachable", { bg: grad("#fef9c3", "#e0f2fe", 135), font: "poppins", head: "poppins", weight: 700, cards: "solid", accent: "#9333ea", radius: 24, links: "pill", photo: PHOTOS.dupatta }, ["text", "link", "stats", "rates", "socials"]),
      t("Mentor", "Professional with gentle waves", { bg: anim("waves", ["#818cf8", "#34d399", "#c7d2fe"], "#111827"), font: "inter", head: "dmserif", weight: 400, scale: 120, cards: "glass", accent: "#4f46e5", photo: PHOTOS.saree }, ["text", "stats", "link", "rates", "socials"]),
      t("Workshop", "Hands-on, warm, chunky cards", { bg: color("#ffedd5"), font: "bricolage", head: "bricolage", weight: 800, cards: "brutal", accent: "#c2410c", radius: 12, align: "left", photo: PHOTOS.kurta }, ["text", "rates", "link", "stats", "socials"]),
      t("Lecture Hall", "Formal, navy and gold", { bg: grad("#0f1e3d", "#1e3a5f", 170), font: "sourceserif", head: "cormorant", weight: 700, scale: 130, cards: "none", accent: "#fbbf24", width: 660, links: "underline", photo: PHOTOS.bw }, ["text", "stats", "link", "rates", "socials"]),
      t("Bright Mind", "Glowing ideas on soft lilac", { bg: anim("orbs", ["#a78bfa", "#f0abfc", "#93c5fd"], "#f5f3ff"), font: "jakarta", head: "jakarta", weight: 800, cards: "glass", accent: "#7c3aed", radius: 20, photo: PHOTOS.smile }, ["link", "text", "stats", "rates", "socials"]),
    ],
  };

  const TEMPLATES = [];
  for (const [cat] of CATEGORIES) LIST[cat].forEach((tpl, i) => TEMPLATES.push({ ...tpl, id: `${cat}-${String(i + 1).padStart(2, "0")}`, cat }));

  window.PortfolioTemplates = { CATEGORIES, SAMPLES, TEMPLATES };
})();
