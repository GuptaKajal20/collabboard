// Talks to Supabase: a password-free (anonymous) login per device, publishing
// portfolios, reading public ones, and uploading photos and videos.

(function () {
  const cfg = window.CB_SUPABASE || {};
  const ready = !!(cfg.url && cfg.anonKey && window.supabase);
  const client = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  const BUCKET = "portfolio-media";

  async function userId() {
    const { data } = await client.auth.getSession();
    if (data.session) return data.session.user.id;
    const { data: signed, error } = await client.auth.signInAnonymously();
    if (error) throw new Error("Could not start a session. Check that anonymous sign-ins are on in Supabase.");
    return signed.user.id;
  }

  // Returns the creator's saved portfolio, or null.
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
    if (error) throw new Error(error.message.includes("exceeded") ? "That file is too big (50 MB max)." : error.message);
    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  window.Cloud = { ready, loadMine, slugFree, publish, fetchPublic, upload };
})();
