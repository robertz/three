const API_BASE = "http://localhost:3001";

export async function checkSession() {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  const data = await res.json();
  return data.ok ? data.character : null;
}

export async function logout() {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
  window.location.reload();
}

export function showAuthScreen() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#1a2f1a;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#fff;z-index:1000;";
    overlay.innerHTML = `
      <form style="background:rgba(0,0,0,0.6);padding:24px 28px;border-radius:8px;width:280px;">
        <h2 style="margin:0 0 16px;font-size:18px;">Three</h2>
        <input id="auth-username" placeholder="Username" autocomplete="username"
          style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:4px;border:none;" />
        <input id="auth-password" type="password" placeholder="Password" autocomplete="current-password"
          style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:4px;border:none;" />
        <div id="auth-error" style="color:#e08888;font-size:12px;min-height:16px;margin-bottom:8px;"></div>
        <button type="submit" id="auth-login"
          style="width:100%;padding:8px;margin-bottom:6px;border:none;border-radius:4px;background:#4ea3d9;color:#fff;cursor:pointer;">Log In</button>
        <button type="button" id="auth-register"
          style="width:100%;padding:8px;border:none;border-radius:4px;background:#3a6b35;color:#fff;cursor:pointer;">Register</button>
      </form>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector("form");
    const usernameEl = overlay.querySelector("#auth-username");
    const passwordEl = overlay.querySelector("#auth-password");
    const errorEl = overlay.querySelector("#auth-error");

    async function submit(endpoint) {
      errorEl.textContent = "";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameEl.value, password: passwordEl.value }),
      });
      const data = await res.json();
      if (!data.ok) {
        errorEl.textContent = data.error || "Something went wrong.";
        return;
      }
      overlay.remove();
      resolve(data.character);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit("/api/login");
    });
    overlay.querySelector("#auth-register").addEventListener("click", () => submit("/api/register"));
  });
}
