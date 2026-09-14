import { injectStyles, GOLD } from "./hud.js";

const API_BASE = "http://localhost:3001";

export async function checkSession() {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: "include" });
  const data = await res.json();
  return data.ok ? data.characters : null;
}

export async function logout() {
  await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" });
  window.location.reload();
}

export function showAuthScreen() {
  injectStyles();

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "wow-hud";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0d0a06;display:flex;align-items:center;justify-content:center;color:#fff;z-index:1000;";
    overlay.innerHTML = `
      <form class="wow-panel" style="padding:24px 28px;width:280px;">
        <h2 style="margin:0 0 16px;font-size:18px;color:${GOLD};text-align:center;">Three</h2>
        <input id="auth-username" placeholder="Username" autocomplete="username"
          style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:4px;border:none;" />
        <input id="auth-password" type="password" placeholder="Password" autocomplete="current-password"
          style="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px;border-radius:4px;border:none;" />
        <div id="auth-error" style="color:#e08888;font-size:12px;min-height:16px;margin-bottom:8px;"></div>
        <button type="submit" id="auth-login" class="wow-button" style="width:100%;margin-bottom:6px;">Log In</button>
        <button type="button" id="auth-register" class="wow-button" style="width:100%;">Register</button>
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
      resolve(data.characters);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit("/api/login");
    });
    overlay.querySelector("#auth-register").addEventListener("click", () => submit("/api/register"));
  });
}
