// Talks to Supabase: email and password accounts, the creator's private data
// (profile, saved and applied collabs, portfolio draft), publishing portfolios,
// reading public ones, and uploading files.

(function () {
  const cfg = window.CB_SUPABASE || {};
  // For local testing only: http://localhost…/?offline runs without accounts.
  const offline = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has("offline");
  const ready = !offline && !!(cfg.url && cfg.anonKey && window.supabase);
  const client = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  const BUCKET = "portfolio-media";

  // Supabase's English error messages, in plainer words.
  function friendly(error) {
    const m = (error && error.message) || "";
    if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
    if (/already registered|already been registered|user already exists/i.test(m)) return "This email already has an account. Log in instead.";
    if (/email not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox for the link.";
    if (/password should be at least/i.test(m)) return "Your password needs at least 8 characters.";
    if (/rate limit|too many/i.test(m)) return "Too many tries. Please wait a minute and try again.";
    if (/invalid email|unable to validate email/i.test(m)) return "Please check your email address.";
    return m || "Something went wrong. Please try again.";
  }
  const fail = (error) => { throw new Error(friendly(error)); };

  async function user() {
    const { data } = await client.auth.getSession();
    return data.session ? data.session.user : null;
  }
  async function userId() {
    const u = await user();
    if (!u) throw new Error("Please log in again.");
    return u.id;
  }

  async function signUp(email, password, profile) {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { name: profile.name }, emailRedirectTo: `${location.origin}/signin` },
    });
    if (error) fail(error);
    // When email confirmation is on there is no session yet.
    return { needsConfirm: !data.session, user: data.user };
  }

  async function logIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) fail(error);
    return data.user;
  }

  async function logOut() {
    await client.auth.signOut();
  }

  async function sendReset(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
    if (error) fail(error);
  }

  async function setPassword(password) {
    const { error } = await client.auth.updateUser({ password });
    if (error) fail(error);
  }

  // Calls back with "recovery" when someone arrives from a reset-password email.
  function onRecovery(callback) {
    client.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") callback(); });
  }

  // Contact form messages (anyone can send; only the team can read them in Supabase).
  async function sendContact(message) {
    const { error } = await client.from("contact_messages").insert(message);
    if (error) throw error;
  }

  // ---------- private data ----------

  async function loadState() {
    const uid = await userId();
    const { data, error } = await client.from("creator_state").select("data").eq("owner", uid).maybeSingle();
    if (error) throw error;
    return data ? data.data : null;
  }

  async function saveState(state) {
    const uid = await userId();
    const { error } = await client.from("creator_state").upsert({ owner: uid, data: state, updated_at: new Date().toISOString() }, { onConflict: "owner" });
    if (error) throw error;
  }

  // ---------- public portfolios ----------

  async function loadMine() {
    const uid = await userId();
    const { data, error } = await client.from("portfolios").select("slug, data, updated_at").eq("owner", uid).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function slugFree(slug) {
    const uid = await userId();
    const { data, error } = await client.from("portfolios").select("owner").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return !data || data.owner === uid;
  }

  async function publish(slug, portfolio) {
    const uid = await userId();
    const { error } = await client
      .from("portfolios")
      .upsert({ owner: uid, slug, data: portfolio, published: true, updated_at: new Date().toISOString() }, { onConflict: "owner" });
    if (error) {
      if (error.code === "23505") throw new Error("That link name is taken. Try another.");
      throw error;
    }
  }

  async function fetchPublic(slug) {
    const { data, error } = await client.from("portfolios").select("data, updated_at").eq("slug", slug).eq("published", true).maybeSingle();
    if (error) throw error;
    return data;
  }

  // Uploads one file into the creator's own folder and returns its public link.
  async function upload(file) {
    const uid = await userId();
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(/exceeded|too large/i.test(error.message) ? "That file is too big (50 MB max)." : error.message);
    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  window.Cloud = { ready, sendContact, user, signUp, logIn, logOut, sendReset, setPassword, onRecovery, loadState, saveState, loadMine, slugFree, publish, fetchPublic, upload };
})();
