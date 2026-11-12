import { rankInfo } from "../../../systems/cultivation-data.mjs";
import { essenceGoal } from "../../../systems/cultivation.mjs";

const SCOPE = "Immortals-system";
const COMFORT_KEY = "wuxiaComfort";
export const CULTIVATION_IMAGES = Object.freeze({
  qi: "systems/Immortals-system/assets/wuxia/cultivation-qi.webp",
  soul: "systems/Immortals-system/assets/wuxia/cultivation-soul.webp",
  body: "systems/Immortals-system/assets/wuxia/cultivation-body.webp"
});

/** Preferences belong to the viewer, never to the actor or its owner. */
export function wuxiaComfort(user) {
  const saved = user?.getFlag?.(SCOPE, COMFORT_KEY);
  return {
    art: saved?.art !== false,
    ornaments: saved?.ornaments !== false,
    largeText: saved?.largeText === true
  };
}

export async function saveWuxiaComfort(user, key, value) {
  if (!["art", "ornaments", "largeText"].includes(key)) throw new Error("Preferência visual inválida.");
  // Updating a single leaf avoids overwriting another toggle saved at the same time.
  return user.setFlag(SCOPE, COMFORT_KEY + "." + key, !!value);
}

export function wuxiaSheetContext(actor, user) {
  const context = { comfort: wuxiaComfort(user), realm: null };
  if (actor.limited) return context;
  const c = actor.system?.cultivation ?? {};
  const rank = rankInfo(c.rank).rank;
  const stage = Math.min(3, Math.max(1, Math.trunc(Number(c.stage) || 1)));
  const goal = essenceGoal({ rank, stage }, actor);
  const essence = Math.max(0, Number(c.essence) || 0);
  context.realm = {
    name: rankInfo(rank).name, rank, stage, essence, goal,
    pct: Math.min(100, essence / goal * 100),
    illumination: Math.max(0, Number(c.illumination) || 0)
  };
  return context;
}

function applyComfort(element, preferences) {
  element.classList.toggle("iw-no-art", !preferences.art);
  element.classList.toggle("iw-no-ornaments", !preferences.ornaments);
  element.classList.toggle("iw-large-text", preferences.largeText);
}

function comfortIcon(document) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({
    class: "iw-comfort-icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    "stroke-width": "1.7", "stroke-linecap": "round", "aria-hidden": "true"
  })) svg.setAttribute(key, value);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 3v3m0 12v3M3 12h3m12 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0");
  svg.append(path);
  return svg;
}

/** Keep character media opt-in, including videos outside the main portrait. */
export function pauseWuxiaVideos(element) {
  for (const video of element.querySelectorAll("video")) {
    video.autoplay = false;
    video.loop = false;
    video.controls = true;
    video.removeAttribute("autoplay");
    video.removeAttribute("loop");
    video.pause();
  }
}

/** Adds presentation controls without replacing any native actor field or action. */
export function mountWuxiaSheet(sheet) {
  const element = sheet.element;
  if (!element) return;
  const user = game.user;
  const preferences = wuxiaComfort(user);
  element.classList.add("iw-wuxia");
  applyComfort(element, preferences);
  pauseWuxiaVideos(element);
  const document = element.ownerDocument;
  const header = element.querySelector(".window-header");
  const content = element.querySelector(".window-content");
  if (!header || !content) return;
  let button = header.querySelector(".iw-comfort-toggle");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "iw-comfort-toggle always-interactive";
    button.setAttribute("aria-label", "Conforto visual");
    button.setAttribute("aria-expanded", "false");
    button.append(comfortIcon(document), document.createTextNode("Conforto visual"));
    const controls = header.querySelector('[data-action="toggleControls"]');
    if (controls) controls.before(button);
    else header.append(button);
  }
  let panel = content.querySelector(".iw-comfort-panel");
  if (!panel) {
    panel = document.createElement("section");
    panel.className = "iw-comfort-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Conforto visual");
    panel.id = element.id + "-wuxia-comfort";
    const title = document.createElement("h2");
    title.textContent = "Conforto visual";
    panel.append(title);
    for (const [key, text] of Object.entries({
      art: "Ilustrações de fundo e cultivo", ornaments: "Detalhes ornamentais", largeText: "Texto ampliado"
    })) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "always-interactive";
      input.dataset.iwComfort = key;
      // No name: these fields are deliberately absent from the actor form data.
      label.append(input, document.createTextNode(text));
      panel.append(label);
    }
    const note = document.createElement("small");
    note.textContent = "Preferências pessoais. Modo escuro, sem animações ou pulsações.";
    panel.append(note);
    content.prepend(panel);
    panel.addEventListener("change", async event => {
      const input = event.target.closest("input[data-iw-comfort]");
      if (!input) return;
      event.stopPropagation();
      const key = input.dataset.iwComfort;
      const current = Object.fromEntries([...panel.querySelectorAll("input[data-iw-comfort]")]
        .map(field => [field.dataset.iwComfort, field.checked]));
      applyComfort(element, current);
      try {
        await saveWuxiaComfort(user, key, input.checked);
      } catch (error) {
        applyComfort(element, wuxiaComfort(user));
        input.checked = wuxiaComfort(user)[key];
        ui.notifications.error("Não foi possível salvar a preferência visual.");
        console.error("Immortals | Conforto visual", error);
      }
    });
  }
  button.setAttribute("aria-controls", panel.id);
  for (const input of panel.querySelectorAll("input[data-iw-comfort]")) {
    input.disabled = false;
    input.checked = preferences[input.dataset.iwComfort];
  }
  if (!button.dataset.iwBound) {
    button.dataset.iwBound = "true";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const currentPanel = element.querySelector(".iw-comfort-panel");
      if (!currentPanel) return;
      currentPanel.hidden = !currentPanel.hidden;
      button.setAttribute("aria-expanded", String(!currentPanel.hidden));
    });
  }
}
