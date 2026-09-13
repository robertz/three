import { injectStyles, GOLD } from "./hud.js";

const API_BASE = "http://localhost:3001";
const MAX_CHARACTERS = 3;

export function showCharacterSelect(characters) {
  injectStyles();

  return new Promise((resolve) => {
    let list = characters;

    const overlay = document.createElement("div");
    overlay.className = "wow-hud";
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0d0a06;display:flex;align-items:center;justify-content:center;color:#fff;z-index:1000;";
    document.body.appendChild(overlay);

    const panel = document.createElement("div");
    panel.className = "wow-panel";
    panel.style.cssText = "width:320px;padding:20px;";
    overlay.appendChild(panel);

    const errorEl = document.createElement("div");
    errorEl.style.cssText = "color:#e08888;font-size:12px;min-height:16px;margin-bottom:8px;";

    function render() {
      panel.innerHTML = "";

      const title = document.createElement("h2");
      title.textContent = "Select Your Character";
      title.style.cssText = `margin:0 0 16px;font-size:18px;color:${GOLD};text-align:center;`;
      panel.appendChild(title);

      list.forEach((character) => {
        const row = document.createElement("div");
        row.style.cssText =
          "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:8px;background:rgba(0,0,0,0.3);border-radius:5px;";
        row.innerHTML = `
          <div style="font-size:13px;">${character.name} <span style="color:${GOLD};">Lv. ${character.level}</span></div>
        `;

        const buttons = document.createElement("div");
        buttons.style.cssText = "display:flex;gap:6px;";

        const selectButton = document.createElement("button");
        selectButton.className = "wow-button";
        selectButton.textContent = "Select";
        selectButton.style.cssText = "padding:4px 10px;font-size:11px;";
        selectButton.addEventListener("click", () => selectCharacter(character.id));

        const deleteButton = document.createElement("button");
        deleteButton.className = "wow-button";
        deleteButton.textContent = "Delete";
        deleteButton.style.cssText = "padding:4px 10px;font-size:11px;";
        deleteButton.addEventListener("click", () => deleteCharacter(character.id));

        buttons.appendChild(selectButton);
        buttons.appendChild(deleteButton);
        row.appendChild(buttons);
        panel.appendChild(row);
      });

      panel.appendChild(errorEl);

      if (list.length < MAX_CHARACTERS) {
        const form = document.createElement("form");
        form.style.cssText = "display:flex;gap:6px;margin-top:8px;";
        form.innerHTML = `
          <input id="char-name" placeholder="New character name" maxlength="30"
            style="flex:1;box-sizing:border-box;padding:8px;border-radius:4px;border:none;" />
        `;
        const createButton = document.createElement("button");
        createButton.className = "wow-button";
        createButton.type = "submit";
        createButton.textContent = "Create";
        form.appendChild(createButton);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          createCharacter(form.querySelector("#char-name").value);
        });
        panel.appendChild(form);
      }
    }

    async function selectCharacter(id) {
      errorEl.textContent = "";
      const res = await fetch(`${API_BASE}/api/characters/${id}/select`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) {
        errorEl.textContent = data.error || "Something went wrong.";
        render();
        return;
      }
      overlay.remove();
      resolve(data.character);
    }

    async function deleteCharacter(id) {
      errorEl.textContent = "";
      const res = await fetch(`${API_BASE}/api/characters/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!data.ok) {
        errorEl.textContent = data.error || "Something went wrong.";
        render();
        return;
      }
      list = data.characters;
      render();
    }

    async function createCharacter(name) {
      errorEl.textContent = "";
      const res = await fetch(`${API_BASE}/api/characters`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.ok) {
        errorEl.textContent = data.error || "Something went wrong.";
        render();
        return;
      }
      list = data.characters;
      render();
    }

    render();
  });
}
