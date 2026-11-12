/**
 * jj/combat-sacrifice-hud.mjs
 * HUD flutuante de combate (por jogador) com 3 sacrifícios de ação por Energia.
 *
 * Aparece quando a batalha começa, mostrando o personagem do jogador. Três
 * botões sacrificam parte da economia de ações em troca de Energia Gerada:
 *   • Ação        → +Nível de Energia Gerada
 *   • Ação Bônus  → +2 de Energia Gerada
 *   • Reação      → +2 de Energia Gerada
 * Ao clicar, o botão fica cinza (desabilitado) até o INÍCIO do próximo turno do
 * personagem, quando todos os botões são reabilitados. O HUD pode ser arrastado
 * livremente; a posição é salva por usuário.
 */
import { EnergySystem } from "../../../systems/energy.mjs";
import { getActorUpkeeps, deactivateUpkeep } from "./constant-cost.mjs";

const SCOPE = "Immortals-system";
const FLAG_SAC = "sacrificios";       // flag no ATOR: { action, bonus, reaction }
const FLAG_POS = "sacrificeHudPos";   // flag no USUÁRIO: { left, top }
const FLAG_RES = "customResources";   // flag no ATOR: [{ id, name, current, max }]

const SACS = [
  { key: "action",   label: "Ação",       icon: "fa-circle-dot" },
  { key: "bonus",    label: "Ação Bônus", icon: "fa-bolt" },
  { key: "reaction", label: "Reação",     icon: "fa-reply" },
];

let hudEl = null;
let hudActorId = null;

/* -------------------------------------------- */
/*  Estilos (injetados via JS — não dependem do system.json/restart) */
/* -------------------------------------------- */

const STYLE_ID = "jj-sacrifice-hud-styles";
const CSS_TEXT = `
#jj-sacrifice-hud {
  --hud-ink:var(--iw-color-deep); --hud-raised:var(--iw-color-panel); --hud-paper:var(--iw-color-text);
  --hud-muted:var(--iw-color-muted); --hud-purple:var(--iw-color-accent); --hud-gold:var(--iw-color-bronze);
  position:fixed; z-index:60; width:260px; max-width:calc(100vw - 24px); box-sizing:border-box;
  display:flex; flex-direction:column; gap:10px; padding:12px;
  border:1px solid var(--iw-color-bronze-shadow); border-radius:4px 1px;
  background:linear-gradient(145deg,var(--iw-color-raised),var(--hud-raised) 55%);
  box-shadow:0 8px 24px color-mix(in srgb,var(--iw-color-shadow) 40%,transparent);
  font:400 12px/1.45 "Segoe UI",Arial,sans-serif; color:var(--hud-paper); user-select:none; color-scheme:dark;
}
#jj-sacrifice-hud * {box-sizing:border-box;}
#jj-sacrifice-hud .jj-sac-icon {display:block;flex:none;width:16px;height:16px;pointer-events:none;}
#jj-sacrifice-hud .jj-sac-header {display:flex;align-items:center;gap:8px;padding:0 0 9px;border-bottom:1px solid var(--iw-color-line);cursor:grab;}
#jj-sacrifice-hud .jj-sac-header:active {cursor:grabbing;}
#jj-sacrifice-hud .jj-sac-header>.jj-sac-icon {width:19px;height:19px;color:var(--hud-gold);}
#jj-sacrifice-hud .jj-sac-title {font:600 13px/1.4 "Segoe UI",Arial,sans-serif;letter-spacing:.1px;text-transform:none;color:var(--hud-paper);}
#jj-sacrifice-hud .jj-sac-body {display:flex;flex-direction:column;gap:11px;max-height:min(62vh,620px);min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--iw-color-line-strong) transparent;}
#jj-sacrifice-hud :is(button,input):focus-visible {outline:1px solid var(--hud-gold);outline-offset:2px;box-shadow:none;}
#jj-sacrifice-hud button {font-family:inherit;box-shadow:none;text-shadow:none;filter:none;transition:none;}
#jj-sacrifice-hud .jj-sac-upkeeps {display:grid;gap:6px;}
#jj-sacrifice-hud .jj-sac-sub {font:500 10px/1.4 "Segoe UI",Arial,sans-serif;letter-spacing:.2px;color:var(--hud-muted);padding-left:2px;}
#jj-sacrifice-hud .jj-sac-upkeep {display:flex;align-items:center;gap:7px;width:100%;padding:8px;border:1px solid var(--iw-color-line);border-left:2px solid var(--hud-purple);border-radius:2px;background:var(--hud-ink);color:var(--hud-paper);font:500 11px/1.4 "Segoe UI",Arial,sans-serif;cursor:pointer;}
#jj-sacrifice-hud .jj-sac-upkeep>.jj-sac-icon {color:var(--hud-purple);width:14px;height:14px;}
#jj-sacrifice-hud .jj-sac-upkeep .jj-sac-lbl {flex:1;min-width:0;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
#jj-sacrifice-hud .jj-sac-upkeep .jj-sac-cost {flex:none;color:var(--hud-muted);font-size:10px;}
#jj-sacrifice-hud .jj-sac-upkeep .jj-sac-x {color:var(--hud-muted);width:12px;height:12px;}
#jj-sacrifice-hud .jj-sac-upkeep:hover {border-color:var(--hud-gold);background:var(--iw-color-hover);}
#jj-sacrifice-hud .jj-sac-upkeep.is-conc {border-left-color:var(--hud-gold);}
#jj-sacrifice-hud .jj-sac-upkeep.is-conc>.jj-sac-icon {color:var(--hud-gold);}
#jj-sacrifice-hud .jj-sac-conc {font:400 10px/1.4 "Segoe UI",Arial,sans-serif;color:var(--hud-gold);}
#jj-sacrifice-hud .jj-sac-resources {display:grid;gap:8px;}
#jj-sacrifice-hud .jj-sac-res-row {display:grid;grid-template-columns:minmax(0,1fr) 22px;gap:8px;min-width:0;width:100%;padding:9px;border:1px solid var(--iw-color-line);border-left:2px solid var(--iw-color-bronze-shadow);border-radius:2px;background:var(--hud-ink);}
#jj-sacrifice-hud .jj-sac-res-name {display:block;grid-column:1;grid-row:1;min-width:0;width:auto;height:auto;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:var(--hud-paper);font:600 12px/1.4 "Segoe UI",Arial,sans-serif;text-align:left;text-transform:none;white-space:normal;overflow-wrap:anywhere;cursor:pointer;}
#jj-sacrifice-hud .jj-sac-res-name:hover {color:var(--hud-gold);background:transparent;}
#jj-sacrifice-hud .jj-sac-res-values {grid-column:1/-1;grid-row:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0;}
#jj-sacrifice-hud .jj-sac-res-values>label {display:grid;gap:4px;min-width:0;color:var(--hud-muted);font:400 10px/1.35 "Segoe UI",Arial,sans-serif;}
#jj-sacrifice-hud .jj-sac-res-values input {box-sizing:border-box;width:100%;min-width:0;height:30px;padding:3px 7px;text-align:center;background:var(--iw-color-panel);border:1px solid var(--iw-color-line);border-radius:2px;color:var(--hud-paper);font:600 15px/1.4 "Segoe UI",Arial,sans-serif;font-variant-numeric:tabular-nums;}
#jj-sacrifice-hud .jj-sac-res-remove {grid-column:2;grid-row:1;align-self:start;display:grid;place-items:center;width:22px;height:24px;min-height:0;padding:2px;border:0;border-radius:2px;background:transparent;color:var(--hud-muted);cursor:pointer;}
#jj-sacrifice-hud .jj-sac-res-remove>.jj-sac-icon {width:13px;height:13px;}
#jj-sacrifice-hud .jj-sac-res-remove:hover {background:var(--iw-color-danger-bg);color:var(--iw-color-danger-light);}
#jj-sacrifice-hud .jj-sac-res-add {display:grid;grid-template-columns:minmax(0,1fr) 32px;align-items:center;gap:7px;min-width:0;}
#jj-sacrifice-hud .jj-sac-res-new-name {width:100%;min-width:0;height:32px;margin:0;padding:6px 9px;border:1px solid var(--iw-color-line);border-radius:2px;background:var(--hud-ink);color:var(--hud-paper);font:400 11px/1.4 "Segoe UI",Arial,sans-serif;}
#jj-sacrifice-hud .jj-sac-res-new-name::placeholder {color:var(--hud-muted);}
#jj-sacrifice-hud .jj-sac-res-add-btn {display:grid;place-items:center;width:32px;height:32px;margin:0;padding:6px;border:1px solid var(--iw-color-bronze-shadow);border-radius:2px;background:var(--iw-color-metal-surface);color:var(--hud-gold);cursor:pointer;}
#jj-sacrifice-hud .jj-sac-res-add-btn:hover {background:var(--iw-color-hover);border-color:var(--hud-gold);}
#jj-sacrifice-hud :disabled {opacity:.5;cursor:default;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer {display:grid;gap:14px;min-width:0;font:400 12px/1.5 "Segoe UI",Arial,sans-serif;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer header {padding-bottom:11px;border-bottom:1px solid var(--iw-color-bronze-shadow);}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer header small {color:var(--iw-color-bronze);font-size:10px;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer h2 {margin:4px 0 0;border:0;font:600 17px/1.4 "Segoe UI",Arial,sans-serif;color:var(--iw-color-text);overflow-wrap:anywhere;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-balance {display:flex;justify-content:space-between;gap:14px;padding:10px 12px;border:1px solid var(--iw-color-line);border-radius:2px;background:var(--iw-color-panel);color:var(--iw-color-muted);font-size:11px;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-balance strong {margin-left:5px;color:var(--iw-color-text);font-weight:600;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer label {display:grid;gap:6px;color:var(--iw-color-muted);font:400 11px/1.4 "Segoe UI",Arial,sans-serif;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer input {width:100%;height:40px;text-align:center;font:600 21px/1.4 "Segoe UI",Arial,sans-serif;}
.application.iw-dialog.iw-resource-dialog .window-content .iw-resource-transfer p {margin:0;color:var(--iw-color-muted);font:400 11px/1.5 "Segoe UI",Arial,sans-serif;}
`;

const HUD_PATHS={
 resource:'<circle cx="12" cy="12" r="8.5"/><path d="M9 9h6v6H9z"/>',
 add:'<path d="M12 5v14M5 12h14"/>',remove:'<path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
 concentration:'<path d="M10 3a4 4 0 0 0-5 4 5 5 0 0 0-1 9 4 4 0 0 0 6 5V3Zm4 0a4 4 0 0 1 5 4 5 5 0 0 1 1 9 4 4 0 0 1-6 5V3Z"/>',
 duration:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',constant:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
 action:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>',bonus:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',reaction:'<path d="m9 5-6 6 6 6M3 11h10c5 0 7 3 7 8"/>'
};
function hudIcon(key,cls=''){return '<svg class="jj-sac-icon '+cls+'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(HUD_PATHS[key]??HUD_PATHS.resource)+'</svg>';}


function injectStyles() {
  if ( document.getElementById(STYLE_ID) ) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}

/* -------------------------------------------- */
/*  Alvo do HUD                                 */
/* -------------------------------------------- */

/** Personagem-alvo do HUD para o usuário atual no combate ativo (ou null). */
function getHudActor() {
  const combat = game.combat;
  if ( !combat?.started ) return null;
  const inCombat = (actor) => actor && combat.combatants.some(c => c.actorId === actor.id);

  // 1. Token controlado (intuitivo; cobre o GM controlando um personagem).
  for ( const t of (canvas?.tokens?.controlled ?? []) ) {
    if ( t.actor?.type === "character" && t.actor.isOwner && inCombat(t.actor) ) return t.actor;
  }

  // 2. Personagem atribuído ao usuário, se estiver no combate.
  const assigned = game.user.character;
  if ( assigned?.type === "character" && assigned.isOwner && inCombat(assigned) ) return assigned;

  // 3. Jogador (não-GM) com exatamente um personagem próprio no combate.
  if ( !game.user.isGM ) {
    const owned = [...new Map(combat.combatants
      .filter(c => c.actor?.type === "character" && c.actor.isOwner)
      .map(c => [c.actor.id, c.actor])).values()];
    if ( owned.length === 1 ) return owned[0];
  }
  return null;
}

const sacState = (actor) => actor?.getFlag(SCOPE, FLAG_SAC) ?? {};
const resourcesState = (actor) => actor?.getFlag(SCOPE, FLAG_RES) ?? [];

/* -------------------------------------------- */
/*  Render                                      */
/* -------------------------------------------- */

function buttonsHtml(actor) {
  const sac = sacState(actor);
  const level = actor.system.details?.level ?? 1;
  return SACS.map(s => {
    const usado = !!sac[s.key];
    const ganho = s.key === "action" ? level : 2;
    const dica = `Sacrificar ${s.label} → +${ganho} de Energia Gerada`;
    return `
      <button type="button" class="jj-sac-btn${usado ? " spent" : ""}" data-sac="${s.key}"
              ${usado ? "disabled" : ""} data-tooltip="${dica}" aria-label="${dica}">
        ${hudIcon(s.key)}
        <span class="jj-sac-lbl">${s.label}</span>
        <span class="jj-sac-gain">+${ganho}</span>
      </button>`;
  }).join("");
}

/** Seção "Ativas" (Custo Constante / Concentração) — some se nada ativo. */
function upkeepHtml(actor) {
  const ups = getActorUpkeeps(actor);
  if ( !ups.length ) return "";
  const rows = ups.map(u => {
    if ( u.type === "concentration" ) {
      return `
      <button type="button" class="jj-sac-upkeep is-conc" data-upkeep="${u.activityId}"
              data-tooltip="Concentração — clique para desativar">
        ${hudIcon('concentration')}
        <span class="jj-sac-lbl">${u.label}</span>
        <span class="jj-sac-conc">Concentração</span>
        ${hudIcon('close','jj-sac-x')}
      </button>`;
    }
    if ( u.type === "duration" ) {
      return `
      <button type="button" class="jj-sac-upkeep is-dur" data-upkeep="${u.activityId}"
              data-tooltip="Técnica ativa (duração) — clique para desativar">
        ${hudIcon('duration')}
        <span class="jj-sac-lbl">${u.label}</span>
        ${hudIcon('close','jj-sac-x')}
      </button>`;
    }
    const poolLbl = u.pool === "total" ? "Qi total" : "Qi Refinado";
    return `
      <button type="button" class="jj-sac-upkeep" data-upkeep="${u.activityId}"
              data-tooltip="Custo Constante — clique para desativar">
        ${hudIcon('constant')}
        <span class="jj-sac-lbl">${u.label}</span>
        <span class="jj-sac-cost">−${u.value} ${poolLbl}</span>
        ${hudIcon('close','jj-sac-x')}
      </button>`;
  }).join("");
  return `<div class="jj-sac-upkeeps"><div class="jj-sac-sub">Ativas</div>${rows}</div>`;
}

/** Seção "Recursos" — recursos custom nomeados pelo jogador, com valor atual/máximo. */
function resourcesHtml(actor) {
  const esc=value=>foundry.utils.escapeHTML(String(value??""));
  const rows=resourcesState(actor).map(r=>`
    <div class="jj-sac-res-row" data-res-id="${esc(r.id)}">
      <button type="button" class="jj-sac-res-name" title="Usar ou receber ${esc(r.name)}">${esc(r.name)}</button>
      <div class="jj-sac-res-values">
        <label><span>Atual</span><input type="number" class="jj-sac-res-current" value="${esc(r.current??0)}" min="0" step="1" data-res-id="${esc(r.id)}" data-field="current" aria-label="Atual de ${esc(r.name)}"></label>
        <label><span>Máximo</span><input type="number" class="jj-sac-res-max" value="${esc(r.max??0)}" min="0" step="1" data-res-id="${esc(r.id)}" data-field="max" aria-label="Máximo de ${esc(r.name)}" data-tooltip="Zero significa sem limite definido"></label>
      </div>
      <button type="button" class="jj-sac-res-remove" data-res-id="${esc(r.id)}" data-tooltip="Remover recurso" aria-label="Remover ${esc(r.name)}">${hudIcon("remove")}</button>
    </div>`).join("");
  return `<div class="jj-sac-resources">${rows}<div class="jj-sac-res-add"><input type="text" class="jj-sac-res-new-name" placeholder="Nome do recurso" aria-label="Nome do novo recurso" maxlength="40"><button type="button" class="jj-sac-res-add-btn" data-tooltip="Adicionar recurso" aria-label="Adicionar recurso">${hudIcon("add")}</button></div></div>`;
}

function bodyHtml(actor) {
  return upkeepHtml(actor) + resourcesHtml(actor);
}

function innerHtml(actor) {
  return `
    <div class="jj-sac-header" data-drag-handle>
      ${hudIcon('resource')}
      <span class="jj-sac-title">Recursos</span>
    </div>
    <div class="jj-sac-body">${bodyHtml(actor)}</div>`;
}

function removeHud() {
  hudEl?.remove();
  hudEl = null;
  hudActorId = null;
}

/** (Re)desenha o HUD conforme o combate/ator atual. */
export function renderSacrificeHud() {
  const actor = getHudActor();
  if ( !actor ) { removeHud(); return; }

  // Já existe para o mesmo ator → só atualiza os botões.
  if ( hudEl && hudActorId === actor.id ) { refreshButtons(); return; }
  removeHud();
  injectStyles();

  hudActorId = actor.id;
  hudEl = document.createElement("div");
  hudEl.id = "jj-sacrifice-hud";
  hudEl.className = "jj-sacrifice-hud";
  // Posição fixa inline (à prova de falha, não depende do CSS carregar).
  hudEl.style.position = "fixed";
  hudEl.style.zIndex = "60";
  hudEl.innerHTML = innerHtml(actor);

  // Posição salva (por usuário) ou padrão (canto inferior esquerdo).
  const pos = game.user.getFlag(SCOPE, FLAG_POS);
  if ( pos && Number.isFinite(pos.left) && Number.isFinite(pos.top) ) {
    hudEl.style.left = `${pos.left}px`;
    hudEl.style.top = `${pos.top}px`;
  } else {
    hudEl.style.left = "16px";
    hudEl.style.bottom = "90px";
  }

  document.body.appendChild(hudEl);
  attachButtonListeners(actor);
  makeDraggable();
}

function refreshButtons() {
  if ( !hudEl ) return;
  const actor = game.actors.get(hudActorId);
  if ( !actor ) { removeHud(); return; }
  const body = hudEl.querySelector(".jj-sac-body");
  if ( body ) {
    body.innerHTML = bodyHtml(actor);
    attachButtonListeners(actor);
  }
}

function attachButtonListeners(actor) {
  hudEl?.querySelectorAll(".jj-sac-btn").forEach(btn => {
    btn.addEventListener("click", () => onSacrifice(actor, btn.dataset.sac, btn));
  });
  hudEl?.querySelectorAll(".jj-sac-upkeep").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      await deactivateUpkeep(actor, btn.dataset.upkeep);
      refreshButtons();
    });
  });

  hudEl?.querySelectorAll(".jj-sac-res-values input").forEach(input => {
    input.addEventListener("change", () => {
      onResourceFieldChange(actor, input.dataset.resId, input.dataset.field, input.value);
    });
  });
  hudEl?.querySelectorAll(".jj-sac-res-remove").forEach(btn => {
    btn.addEventListener("click", () => onResourceRemove(actor, btn.dataset.resId));
  });
  hudEl?.querySelectorAll(".jj-sac-res-row").forEach(row => {
    row.addEventListener("click", (e) => {
      // Não abre o diálogo se o clique foi nos campos numéricos ou no botão de remover —
      // esses já têm seus próprios listeners (edição direta / remoção).
      if ( e.target.closest("input, label, .jj-sac-res-remove") ) return;
      onResourceClick(actor, row.dataset.resId);
    });
  });
  const addBtn = hudEl?.querySelector(".jj-sac-res-add-btn");
  const nameInput = hudEl?.querySelector(".jj-sac-res-new-name");
  const doAdd = async () => {
    const name = nameInput?.value?.trim();
    if ( !name ) return;
    // Trava contra duplo-clique/Enter duplo — sem isso, duas chamadas concorrentes
    // partem do mesmo estado (getFlag) e uma sobrescreve o recurso que a outra criou.
    if ( addBtn ) addBtn.disabled = true;
    if ( nameInput ) nameInput.disabled = true;
    await onResourceAdd(actor, name); // refreshButtons() dentro já reconstrói o HUD
  };
  addBtn?.addEventListener("click", doAdd);
  nameInput?.addEventListener("keydown", e => {
    if ( e.key === "Enter" ) { e.preventDefault(); doAdd(); }
  });
}

/* -------------------------------------------- */
/*  Ação de sacrifício                          */
/* -------------------------------------------- */

async function onSacrifice(actor, tipo, btn) {
  if ( !actor || !tipo ) return;
  if ( sacState(actor)[tipo] ) return;       // já usado neste ciclo
  if ( btn ) btn.disabled = true;            // evita duplo clique durante o await

  // Gera a Energia (transfere da reserva). Só consome a ação se realmente gerou.
  const ganho = await EnergySystem.sacrificeAction(actor, tipo); // "action"→nível; senão→2
  if ( ganho > 0 ) await actor.setFlag(SCOPE, FLAG_SAC, { ...sacState(actor), [tipo]: true });
  refreshButtons();                          // re-renderiza com o estado real
}

/* -------------------------------------------- */
/*  Recursos (custom)                           */
/* -------------------------------------------- */

async function onResourceAdd(actor, name) {
  if ( !actor || !name ) return;
  const res = foundry.utils.deepClone(resourcesState(actor));
  res.push({ id: foundry.utils.randomID(), name, current: 0, max: 0 });
  await actor.setFlag(SCOPE, FLAG_RES, res);
  refreshButtons();
}

async function onResourceRemove(actor, resId) {
  if ( !actor || !resId ) return;
  const res = foundry.utils.deepClone(resourcesState(actor)).filter(r => r.id !== resId);
  await actor.setFlag(SCOPE, FLAG_RES, res);
  refreshButtons();
}

/**
 * Publica no chat o resultado de uma mudança no valor ATUAL de um recurso custom.
 * Formato: "[Nome] recebeu/usou X [recurso], ficando com Y de Z" — ou sem "de Z"
 * quando o recurso não tem máximo definido (max = 0). Nada é postado se delta for 0.
 */
function postResourceMessage(actor, name, delta, newCurrent, max) {
  if ( !delta ) return;
  const safeName = foundry.utils.escapeHTML(name);
  const verbo = delta > 0 ? "recebeu" : "usou";
  const amount = Math.abs(delta);
  const hasMax = (max ?? 0) > 0;
  const frase = hasMax
    ? `${verbo} <strong>${amount}</strong> ${safeName}, ficando com <strong>${newCurrent}</strong> de <strong>${max}</strong>`
    : `${verbo} <strong>${amount}</strong> ${safeName}, ficando com <strong>${newCurrent}</strong>`;
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<strong>${actor.name}</strong> ${frase}.`
  });
}

async function onResourceFieldChange(actor, resId, field, rawValue) {
  if ( !actor || !resId || !["current", "max"].includes(field) ) return;
  const res = foundry.utils.deepClone(resourcesState(actor));
  const entry = res.find(r => r.id === resId);
  if ( !entry ) return;
  const anterior = entry[field] ?? 0;
  const digitado = parseInt(rawValue) || 0;
  const novo = Math.max(0, digitado);
  entry[field] = novo;
  await actor.setFlag(SCOPE, FLAG_RES, res);

  // Só reconstrói o HUD inteiro se o valor precisou ser corrigido (ex.: negativo) —
  // senão o input já mostra exatamente o que foi digitado, nada visual pra atualizar.
  if ( novo !== digitado ) refreshButtons();

  // Só avisa no chat quando o valor ATUAL muda manualmente — editar o máximo é só
  // recalibrar o teto do recurso, não um ganho/uso.
  if ( field === "current" ) postResourceMessage(actor, entry.name, novo - anterior, novo, entry.max);
}

/**
 * Clique num recurso: pergunta uma quantidade e se é para usar (gastar) ou receber
 * (ganhar), aplica no valor atual e avisa no chat. Sem limite máximo definido (max = 0),
 * o aviso só menciona a quantidade, sem a fração "de Y".
 */
async function onResourceClick(actor, resId) {
  const entry = resourcesState(actor).find(r => r.id === resId);
  if ( !actor || !entry ) return;

  const safeName = foundry.utils.escapeHTML(entry.name);
  const content = `
    <section class="iw-resource-transfer">
      <header><small>Recurso do cultivador</small><h2>${safeName}</h2></header>
      <div class="iw-resource-balance"><span>Atual<strong>${Number(entry.current)||0}</strong></span><span>Máximo<strong>${Number(entry.max)>0?Number(entry.max):"Sem limite"}</strong></span></div>
      <label for="jj-res-amount">Quantidade<input type="number" id="jj-res-amount" min="1" step="1" value="1" autofocus></label>
      <p>Escolha usar ou receber esta quantidade do recurso.</p>
    </section>`;
  const readAmount = (dialog) =>
    Math.max(1, parseInt(dialog.element.querySelector("#jj-res-amount")?.value) || 1);

  const result = await foundry.applications.api.DialogV2.wait({
    classes: ["iw-dialog", "iw-resource-dialog"],
    position: { width: 360 },
    window: { title: "Movimentar recurso" },
    content,
    buttons: [
      {
        action: "use", label: "Usar", default: true,
        callback: (event, button, dialog) => ({ mode: "use", amount: readAmount(dialog) })
      },
      {
        action: "gain", label: "Receber",
        callback: (event, button, dialog) => ({ mode: "gain", amount: readAmount(dialog) })
      },
      { action: "cancel", label: "Cancelar" }
    ],
    rejectClose: false,
    close: () => null
  });
  if ( !result?.mode ) return;

  const res = foundry.utils.deepClone(resourcesState(actor));
  const target = res.find(r => r.id === resId);
  if ( !target ) return;
  const max = target.max ?? 0;
  const anterior = target.current ?? 0;
  const delta = result.mode === "use" ? -result.amount : result.amount;
  target.current = Math.max(0, anterior + delta);
  await actor.setFlag(SCOPE, FLAG_RES, res);
  refreshButtons();

  // Usa o delta REALMENTE aplicado (pode ser menor que o pedido, se travou no 0)
  postResourceMessage(actor, entry.name, target.current - anterior, target.current, max);
}

/* -------------------------------------------- */
/*  Arrastar                                    */
/* -------------------------------------------- */

function makeDraggable() {
  const handle = hudEl?.querySelector("[data-drag-handle]");
  if ( !handle ) return;
  let startX, startY, origLeft, origTop;

  const onMove = (e) => {
    const left = Math.max(0, Math.min(window.innerWidth  - 40, origLeft + (e.clientX - startX)));
    const top  = Math.max(0, Math.min(window.innerHeight - 20, origTop  + (e.clientY - startY)));
    hudEl.style.left = `${left}px`;
    hudEl.style.top = `${top}px`;
    hudEl.style.bottom = "auto";
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    const rect = hudEl.getBoundingClientRect();
    game.user.setFlag(SCOPE, FLAG_POS, { left: Math.round(rect.left), top: Math.round(rect.top) });
  };
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = hudEl.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    origLeft = rect.left; origTop = rect.top;
    hudEl.style.left = `${rect.left}px`;
    hudEl.style.top = `${rect.top}px`;
    hudEl.style.bottom = "auto";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

/* -------------------------------------------- */
/*  Reset por turno / ciclo de vida             */
/* -------------------------------------------- */

/** Apenas um cliente age: GM ativo (se houver) ou o dono do ator. */
function _podeResetar(actor) {
  const gm = game.users?.activeGM;
  return gm ? (gm === game.user) : (actor?.isOwner === true);
}

async function _limparSacrificios(actor) {
  if ( !actor || !_podeResetar(actor) ) return;
  const sac = actor.getFlag(SCOPE, FLAG_SAC);
  if ( sac && (sac.action || sac.bonus || sac.reaction) ) {
    await actor.unsetFlag(SCOPE, FLAG_SAC);
  }
}

// Início do turno de um combatente → reabilita seus sacrifícios.
Hooks.on("combatTurnChange", async (combat, prior, current) => {
  const combatant = combat.combatants.get(current?.combatantId);
  await _limparSacrificios(combatant?.actor);
  renderSacrificeHud();
});

// Começo/atualização do combate.
Hooks.on("combatStart", () => renderSacrificeHud());
Hooks.on("updateCombat", () => renderSacrificeHud());
Hooks.on("createCombatant", () => renderSacrificeHud());
Hooks.on("deleteCombatant", () => renderSacrificeHud());

// Fim do combate → limpa flags dos combatentes e remove o HUD.
Hooks.on("deleteCombat", async (combat) => {
  for ( const c of (combat?.combatants ?? []) ) await _limparSacrificios(c.actor);
  removeHud();
});

// Estado dos botões muda quando o ator é atualizado (flag ou energia).
Hooks.on("updateActor", (actor) => {
  if ( hudEl && actor?.id === hudActorId ) refreshButtons();
});

// Selecionar/desselecionar token muda o alvo do HUD (útil para o GM).
Hooks.on("controlToken", () => renderSacrificeHud());

// Combate já em andamento ao (re)carregar a página.
Hooks.on("ready", () => { if ( game.combat?.started ) renderSacrificeHud(); });
