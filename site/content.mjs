// Everything the website says about Collab Pro lives here: settings, menus, features,
// steps and FAQs. Edit this file, run `npm run build`, and every page updates.

export const SITE = {
  name: "Collab Pro",
  // Change this when a custom domain is connected; canonical links and the sitemap follow it.
  url: "https://collabboard-blush.vercel.app",
  tagline: "Find brand collabs. Build your portfolio. All in one place.",
  description:
    "Collab Pro is a free platform for influencers and content creators in India: discover brand collaboration opportunities every day and build a professional portfolio you can share with brands.",
  // Google Analytics 4 measurement ID (looks like G-XXXXXXX). Analytics stays off until this is set
  // and the visitor accepts the cookie notice.
  ga4Id: "",
  // Google Search Console HTML-tag verification code (only the content value).
  searchConsoleVerification: "",
  locale: "en_IN",
};

// Main menu. "cta" items are styled as buttons.
export const NAV = [
  { href: "/discover-collaborations", label: "Discover collabs" },
  { href: "/creator-portfolio", label: "Portfolio" },
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export const FOOTER = [
  { title: "Product", links: [["/discover-collaborations", "Discover collaborations"], ["/creator-portfolio", "Creator portfolio"], ["/features", "Features"], ["/how-it-works", "How it works"]] },
  { title: "Company", links: [["/about", "About us"], ["/contact", "Contact us"], ["/faq", "FAQ"]] },
  { title: "Legal", links: [["/privacy-policy", "Privacy policy"], ["/terms-of-service", "Terms of service"]] },
];

// Features. status "live" = available today, "soon" = planned. Pages pick these up automatically.
export const FEATURES = [
  { id: "discover", status: "live", group: "Discover", icon: "radar", title: "Daily collab discovery", short: "Fresh brand collaboration openings, found across the web every morning.", long: "Collab Pro searches public posts, brand application forms and creator calls every morning and collects them in one feed, so you stop hopping between apps, groups and pages." },
  { id: "filters", status: "live", group: "Discover", icon: "filter", title: "Filters that fit you", short: "Filter by niche, paid or barter, source and your follower count.", long: "Narrow the feed to your niche, see only paid or only barter work, and check which openings state a follower minimum you already meet." },
  { id: "apply", status: "live", group: "Discover", icon: "arrow", title: "Apply at the source", short: "Every opening links straight to the original post or form.", long: "We don't sit in the middle. Tap Apply and you go directly to the brand's post or form, with no commission and no extra steps." },
  { id: "tracking", status: "live", group: "Discover", icon: "star", title: "Save and track", short: "Star openings for later and track the ones you've applied to.", long: "Save interesting openings with a star, and when you come back after applying, Collab Pro asks if you applied so your Applied list stays accurate." },
  { id: "builder", status: "live", group: "Portfolio", icon: "layout", title: "Drag-and-drop portfolio", short: "Eight modules you can drag, drop and edit in place.", long: "Build with a profile header, text, links, numbers, files, social links, rates and a social preview. Type directly on the page and see every change instantly." },
  { id: "link", status: "live", group: "Portfolio", icon: "link", title: "Your own public link", short: "Publish once and share one link with every brand.", long: "Publish your portfolio to a clean link like /p/yourname and send it in DMs, emails and pitches. Update it any time; the link stays the same." },
  { id: "media", status: "live", group: "Portfolio", icon: "image", title: "Photos, PDFs and previews", short: "Image carousels, readable PDFs and live social previews.", long: "Show your best shots in a carousel, attach a media kit as a PDF brands can read without leaving the page, and embed your Instagram, Facebook, YouTube or LinkedIn." },
  { id: "devices", status: "live", group: "Portfolio", icon: "devices", title: "Looks right everywhere", short: "Preview your portfolio on desktop and mobile before you publish.", long: "Switch between desktop and mobile previews while you edit, then open a full-screen preview to check every detail." },
  { id: "account", status: "live", group: "Workflow", icon: "lock", title: "One account, every device", short: "Your profile, saved collabs and portfolio follow you.", long: "Log in with your email on any phone or laptop and pick up exactly where you left off." },
  { id: "verified", status: "soon", group: "Coming next", icon: "check", title: "Verified brand openings", short: "Openings checked by a person, marked clearly.", long: "We're exploring a Verified label for openings whose brands have been checked, to make it easier to avoid fake collaboration offers." },
  { id: "paid-rating", status: "soon", group: "Coming next", icon: "rupee", title: "\"Did this brand pay?\" ratings", short: "Creators share whether brands paid, and how fast.", long: "We're exploring creator-shared ratings on payment reliability, so you can decide which collaborations are worth your time." },
  { id: "alerts", status: "soon", group: "Coming next", icon: "bell", title: "Alerts for new openings", short: "Get told when an opening matches your niche.", long: "We're exploring alerts for new openings that match your niche and follower count." },
];

export const STEPS = [
  { title: "Create your free account", text: "Sign up with your email, then tell us your niche, follower range, city and language." },
  { title: "Discover collaborations", text: "Browse fresh openings every morning. Filter by niche, paid or barter, and follower requirements." },
  { title: "Apply at the source", text: "Tap Apply to open the brand's own post or form. Star openings to come back to, and track what you've applied to." },
  { title: "Build your portfolio", text: "Drag in modules for your bio, numbers, rates, photos, PDFs and social previews. Edit everything in place." },
  { title: "Publish and share", text: "Publish to your own link and send it to brands in DMs, emails and pitches. Update it whenever you like." },
];

export const PROBLEMS = [
  { title: "Openings are scattered", text: "Brand calls are spread across apps, Instagram stories, LinkedIn posts, Telegram groups and Google Forms. Finding them means checking everywhere, every day." },
  { title: "Hard to tell paid from barter", text: "Many offers are product-only barter deals, and small creators also see fake collaboration offers. It's slow to sort what's worth applying to." },
  { title: "Portfolios live somewhere else", text: "Brands ask for a media kit or portfolio, so creators build one in a design tool or website builder, separately from where they find work." },
];

export const FAQS = [
  { q: "Is Collab Pro free?", a: "Yes. Creating an account, discovering collaborations and building and publishing your portfolio are free. There are no paid plans right now." },
  { q: "Where do the collaboration openings come from?", a: "Every morning Collab Pro searches the public web for brand collaboration openings: brand application forms, public posts and creator calls. We collect them in one feed and link to the original source." },
  { q: "Are the openings verified?", a: "Not yet. Openings are found automatically and are not checked by a person. Always read the original post, and never pay a brand or agency to join a campaign." },
  { q: "Do you take a commission on deals?", a: "No. You apply directly on the brand's own post or form. Collab Pro is not part of the deal and does not handle payments." },
  { q: "Do I need a minimum number of followers?", a: "No. Collab Pro is for creators of every size. When an opening states a follower minimum, we show it so you can filter for openings that fit you." },
  { q: "What can I add to my portfolio?", a: "A profile header with your photo, text with formatting, links, numbers like followers and views, image carousels, PDFs such as a media kit, social links, your rates, and a live preview of your Instagram, Facebook, YouTube or LinkedIn." },
  { q: "Who can see my portfolio?", a: "Only what you publish is public. Your published portfolio can be opened by anyone with the link and may appear in search engines. Your account, saved and applied lists and drafts stay private." },
  { q: "Can I change my portfolio after publishing?", a: "Yes. Edit anything, then click Publish again. Your link stays the same." },
  { q: "Which devices does it work on?", a: "Collab Pro works in the browser on phones, tablets and computers. Log in with the same email and password on any device." },
  { q: "Is Collab Pro only for creators in India?", a: "It's built with Indian creators in mind, and the collaboration feed focuses on India, but anyone can create an account and a portfolio." },
];

// Pages that appear in the sitemap (auth and app pages are kept out of search).
export const PAGES = [
  { path: "/", file: "index.html", priority: "1.0" },
  { path: "/discover-collaborations", file: "discover-collaborations.html", priority: "0.9" },
  { path: "/creator-portfolio", file: "creator-portfolio.html", priority: "0.9" },
  { path: "/features", file: "features.html", priority: "0.8" },
  { path: "/how-it-works", file: "how-it-works.html", priority: "0.8" },
  { path: "/about", file: "about.html", priority: "0.6" },
  { path: "/faq", file: "faq.html", priority: "0.7" },
  { path: "/contact", file: "contact.html", priority: "0.5" },
  { path: "/privacy-policy", file: "privacy-policy.html", priority: "0.3" },
  { path: "/terms-of-service", file: "terms-of-service.html", priority: "0.3" },
];
