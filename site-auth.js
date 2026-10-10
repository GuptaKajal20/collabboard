// Sign up, sign in, forgot password and reset password pages.
// Uses cloud.js (Supabase). Successful sign-up or sign-in goes to the app at /app.

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const form = $("form[data-auth]");
  if (!form) return;
  const mode = form.dataset.auth;
  const msg = form.querySelector(".form-msg");
  const btn = form.querySelector('button[type="submit"]');
  const label = btn.textContent;
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const track = (n, p) => window.cpTrack && window.cpTrack(n, p);

  const show = (text, ok) => { msg.textContent = text; msg.hidden = !text; msg.classList.toggle("ok", !!ok); };
  const busy = (on, text) => { btn.disabled = on; btn.textContent = on ? text : label; };
  const invalid = (fields) => {
    form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
    fields.forEach((f) => f.setAttribute("aria-invalid", "true"));
    if (fields[0]) fields[0].focus();
  };
  form.addEventListener("input", (e) => { e.target.removeAttribute("aria-invalid"); if (!msg.classList.contains("ok")) show(""); });

  // Show / hide password.
  form.querySelectorAll(".pw-toggle").forEach((t) => t.addEventListener("click", () => {
    const input = t.previousElementSibling;
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    t.textContent = showing ? "Show" : "Hide";
    t.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    t.setAttribute("aria-pressed", String(!showing));
  }));

  // Keep the typed email when switching between sign in and sign up.
  form.querySelectorAll("[data-swap]").forEach((a) => a.addEventListener("click", () => {
    const email = form.email && form.email.value.trim();
    if (email) try { sessionStorage.setItem("cp_email", email); } catch { /* ignore */ }
  }));
  try { const e = sessionStorage.getItem("cp_email"); if (e && form.email && !form.email.value) form.email.value = e; } catch { /* ignore */ }

  if (!window.Cloud || !window.Cloud.ready) {
    show("Accounts aren't available right now. Please try again later.");
    btn.disabled = true;
    return;
  }

  const next = () => {
    const n = new URLSearchParams(location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/app#/dashboard";
  };

  // Already signed in? Go straight to the app (except on the reset page).
  if (mode === "signin" || mode === "signup") {
    window.Cloud.user().then((u) => { if (u) location.replace(next()); }).catch(() => {});
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    show("");
    try {
      if (mode === "signup") {
        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const pw = form.password.value;
        const bad = [];
        if (!name) bad.push(form.name);
        if (!validEmail(email)) bad.push(form.email);
        if (pw.length < 8) bad.push(form.password);
        if (bad.length) { invalid(bad); return show("Please add your name, a valid email and a password of at least 8 characters."); }
        if (!form.terms.checked) { invalid([form.terms]); return show("Please agree to the Terms and Privacy policy to continue."); }
        busy(true, "Creating your account…");
        const res = await window.Cloud.signUp(email, pw, { name });
        track("sign_up", { method: "email" });
        if (res.needsConfirm) {
          busy(false);
          return show(`Almost done! We sent a confirmation link to ${email}. Open it, then sign in.`, true);
        }
        // Remember the name for the profile step in the app.
        try { localStorage.setItem("cb_pending_name", JSON.stringify(name)); } catch { /* ignore */ }
        location.replace("/app#/dashboard");
      } else if (mode === "signin") {
        const email = form.email.value.trim();
        const pw = form.password.value;
        const bad = [];
        if (!validEmail(email)) bad.push(form.email);
        if (!pw) bad.push(form.password);
        if (bad.length) { invalid(bad); return show("Please enter your email and password."); }
        busy(true, "Signing in…");
        await window.Cloud.logIn(email, pw);
        track("login", { method: "email" });
        location.replace(next());
      } else if (mode === "forgot") {
        const email = form.email.value.trim();
        if (!validEmail(email)) { invalid([form.email]); return show("Please enter the email you signed up with."); }
        busy(true, "Sending…");
        await window.Cloud.sendReset(email);
        busy(false);
        show(`If ${email} has an account, a reset link is on its way. Open it on this device to choose a new password.`, true);
      } else if (mode === "reset") {
        const pw = form.password.value;
        if (pw.length < 8) { invalid([form.password]); return show("Your password needs at least 8 characters."); }
        const user = await window.Cloud.user();
        if (!user) return show("This reset link has expired or was already used. Request a new one from the Forgot password page.");
        busy(true, "Saving…");
        await window.Cloud.setPassword(pw);
        show("Password saved. Taking you to your dashboard…", true);
        setTimeout(() => location.replace("/app#/dashboard"), 900);
      }
    } catch (err) {
      busy(false);
      show(err.message || "Something went wrong. Please try again.");
    }
  });
})();
