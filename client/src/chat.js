const MAX_LOG_LINES = 8;
const MAX_MESSAGE_LENGTH = 200;

export function createChat(sendText) {
  const log = document.createElement("div");
  log.style.cssText =
    "position:fixed;top:16px;left:16px;width:320px;max-height:160px;overflow-y:auto;font-size:12px;line-height:1.6;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.9);pointer-events:none;";
  document.body.appendChild(log);

  const input = document.createElement("input");
  input.placeholder = "Press Enter to chat";
  input.maxLength = MAX_MESSAGE_LENGTH;
  input.style.cssText =
    "position:fixed;top:184px;left:16px;width:320px;padding:6px 8px;border-radius:4px;border:none;font-size:13px;display:none;z-index:1000;";
  document.body.appendChild(input);

  function addLine(username, text) {
    const line = document.createElement("div");
    line.textContent = `${username}: ${text}`;
    log.appendChild(line);
    while (log.children.length > MAX_LOG_LINES) {
      log.removeChild(log.firstChild);
    }
    log.scrollTop = log.scrollHeight;
  }

  window.addEventListener("keydown", (e) => {
    if (document.activeElement === input) return;
    if (e.key === "Enter") {
      input.style.display = "block";
      input.focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      const text = input.value.trim();
      if (text) sendText(text);
      input.value = "";
      input.style.display = "none";
      input.blur();
    } else if (e.key === "Escape") {
      input.value = "";
      input.style.display = "none";
      input.blur();
    }
  });

  return { addLine, isTyping: () => document.activeElement === input };
}
