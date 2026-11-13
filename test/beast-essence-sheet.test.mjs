import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {test} from "node:test";
import Handlebars from "handlebars";

// Exercise the actual sheet code with deterministic rule/runtime boundaries. No Foundry world is opened.
const calls = [];
let confirmResult = true;
let confirmConfig;
let pickerConfig;
globalThis.__beastEssenceSheetTest = {
  essenceState: actor => actor.__essenceState,
  ESSENCE_GROWTH: (await import("../module/systems/beast-essence-rules.mjs")).ESSENCE_GROWTH,
  ...Object.fromEntries(["queueBeastEssenceIntegration", "activateBeastEssence", "deactivateBeastEssence", "setBeastEssenceToken", "removeBeastEssence", "setBeastEssenceGrowth", "setBeastEssenceSelections"].map(name => [name, async (...args) => { calls.push([name, ...args]); }]))
};
const moduleUrl = new URL("../module/applications/actor/jj/beast-essence-sheet.mjs", import.meta.url);
let source = await readFile(moduleUrl, "utf8");
source = source.replace(/^import .+from "\.\.\/\.\.\/\.\.\/systems\/beast-essence-(?:rules|runtime)\.mjs";\r?\n/gm, "");
source = source.replace(/from "(\.\.\/[^\"]+)"/g, (_match, relative) => `from ${JSON.stringify(new URL(relative, moduleUrl).href)}`);
source = `const {essenceState, ESSENCE_GROWTH, queueBeastEssenceIntegration, activateBeastEssence, deactivateBeastEssence, setBeastEssenceToken, removeBeastEssence, setBeastEssenceGrowth, setBeastEssenceSelections} = globalThis.__beastEssenceSheetTest;\n${source}`;
const sheetModule = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const {prepareBeastEssenceContext: prepare, beastEssenceActions: actions, bindBeastEssenceSheet: bind} = sheetModule;
const scope = "Immortals-system";
/**
 *
 */
function definition() {
  return {version: 1, id: "essence-a", name: "Qilin de bronze", img: "beasts/qilin.webp", sourceRealm: 4, growth: "earth", ability: "con", elements: ["metal", "terra"], tokenTexture: "beasts/token.webp",
    taxonomy: {name: "Besta espiritual", resistances: {fire: 3}, features: [{key: "tax", data: {name: "Sentidos de besta"}}]},
    normalArchetypeFeatures:["arch"],weakenedArchetypeFeatures:[],archetype: {name: "Guardião", features: [{key: "arch", level:1, data: {name: "Defesa de guardião"}}]},
    naturalWeapons: [{key: "claw", data: {name: "Garras", img: "claw.webp"}}],
    features: [{key: "a", data: {name: "Couraça"}}, {key: "b", data: {name: "Passo leve"}}, {key: "private", data: {name: "Não selecionada"}}],
    attacks: [{key: "one", data: {name: "Rugido"}, actions: 2, area: true, damageInstances: 1, effectQi: 0}, {key: "two", data: {name: "Investida"}, actions: 3, area: false, damageInstances: 2, effectQi: 1}],
    normalFeatures: ["a", "b"], weakenedFeatures: ["a"], normalAttacks: ["one", "two"], weakenedAttacks: ["two"]};
}
/**
 *
 */
function owner() {
  globalThis.game={user:{isGM:false}};
  calls.length = 0; confirmResult = true; confirmConfig = undefined; pickerConfig = undefined;
  globalThis.ui = {notifications: {warn: message => calls.push(["warning", message])}};
  globalThis.foundry = {applications: {api: {DialogV2: {confirm: async config => {confirmConfig=config; return typeof confirmResult === "function" ? confirmResult() : confirmResult;}}}, apps: {FilePicker: {implementation: class {constructor(config) {pickerConfig=config;}

    browse() {calls.push(["picker"]);}}}}}};
  const essence=definition();
  const actor={uuid: "Actor.character-a", isOwner: true, limited: false, system: {cultivation: {rank: 3}},
    flags: {[scope]: {beastEssence: {integrated: essence, pendingItemId: "loot-a", transformation: {active: false, grantedItemIds: ["grant-a", "gone-item"]}}}},
    items: [{id: "loot-a", name: "Essência <nova>", img: "loot.webp", flags: {[scope]: {beastEssenceItem: {version: 1, definition: essence}}}},
      {id: "grant-a", name: "Garras concedidas", type: "weapon", img: "claw.webp"}, {id: "own-item", name: "Espada pessoal", type: "weapon"}],
    __essenceState: {essence, active: false, mode: "normal", rank: 3, limitRank: 4, effectiveLevel: 8, qiBonus: null, upkeepQi: 2, ability: "con", abilityBonus: 2, abilityCap: 15, affinityLevelLimit: 5, elements: ["metal", "terra"]}};
  return {actor, isEditable: true};
}
const target = id => ({dataset: {itemId: id}});

test("context consumes rule values without mutating actor data or inventing unresolved Qi", () => {
  const sheet=owner(); const before=structuredClone({flags: sheet.actor.flags, system: sheet.actor.system, items: sheet.actor.items});
  const {beastEssence: context}=prepare.call(sheet, {}, {});
  assert.equal(context.name, "Qilin de bronze");
  assert.equal(context.limitRankLabel, "Mar Divino");
  assert.equal(context.abilityLabel, "Constituição");
  assert.equal(context.qiBonusLabel, "A definir"); assert.equal(context.qiBonusPending, true);
  assert.equal(context.upkeepQiLabel, "2"); assert.equal(context.canActivate, true);
  assert.deepEqual(context.elements.map(e => e.label), ["Metal", "Terra"]);
  assert.deepEqual(context.grantedItems.map(item => item.id), ["grant-a"]);
  assert.deepEqual({flags: sheet.actor.flags, system: sheet.actor.system, items: sheet.actor.items}, before);
});

test("normal and weakened previews preserve only selected native traits and attacks", () => {
  const sheet=owner(); const {beastEssence: context}=prepare.call(sheet, {});
  assert.deepEqual(context.forms[0].traits.map(t => t.name), ["Sentidos de besta", "Defesa de guardião", "Couraça", "Passo leve"]);
  assert.deepEqual(context.forms[1].traits.map(t => t.name), ["Sentidos de besta", "Couraça"]);
  assert.deepEqual(context.forms[1].attacks.map(t => t.name), ["Investida"]);
  assert.equal(context.forms[0].current, true); assert.equal(context.forms[1].current, false);
  sheet.actor.__essenceState.mode="weakened"; sheet.actor.__essenceState.upkeepQi=3;
  const other=prepare.call(sheet, {}).beastEssence;
  assert.equal(other.forms[1].current, true); assert.equal(other.upkeepQiLabel, "3");
  sheet.actor.__essenceState.mode="dormant";
  assert.equal(prepare.call(sheet, {}).beastEssence.canActivate, false);
});

test("empty state includes owned essences and stale preparation is explicit", () => {
  const sheet=owner(); sheet.actor.__essenceState.essence=null; sheet.actor.__essenceState.mode="none";
  const context=prepare.call(sheet, {}).beastEssence;
  assert.equal(context.hasEssence, false); assert.equal(context.ownedEssences.length, 1); assert.equal(context.pendingEssence.id, "loot-a");
  sheet.actor.flags[scope].beastEssence.pendingItemId="missing";
  assert.equal(prepare.call(sheet, {}).beastEssence.pendingMissing, true);
});

test("limited and non-owner viewers do not receive essence snapshots or inventory", () => {
  for (const privacy of [{isOwner: false, limited: false}, {isOwner: true, limited: true}]) {
    const sheet=owner(); Object.assign(sheet.actor, privacy); delete sheet.actor.__essenceState;
    const context=prepare.call(sheet, {}).beastEssence;
    assert.equal(context.hidden, true); assert.equal(context.essence, null); assert.deepEqual(context.ownedEssences, []);
  }
});

test("zero Qi is displayed as a resolved value", () => {
  const sheet=owner(); sheet.actor.__essenceState.qiBonus=0;
  const context=prepare.call(sheet, {}).beastEssence;
  assert.equal(context.qiBonusLabel, "0"); assert.equal(context.qiBonusPending, false);
});

test("replacement preparation confirms consequences, escapes names and respects cancellation", async () => {
  const sheet=owner(); confirmResult=false;
  await actions.beastEssencePrepareIntegration.call(sheet, {}, target("loot-a"));
  assert.equal(calls.length, 0); assert.match(confirmConfig.content, /substituirá a essência/); assert.match(confirmConfig.content, /&lt;nova&gt;/);
  confirmResult=true; await actions.beastEssencePrepareIntegration.call(sheet, {}, target("loot-a"));
  assert.equal(calls[0][0], "queueBeastEssenceIntegration"); assert.equal(calls[0][2], "loot-a");
});

test("permission changes while a confirmation is open prevent the queued mutation", async () => {
  const sheet=owner(); confirmResult=() => {sheet.actor.isOwner=false; return true;};
  await actions.beastEssencePrepareIntegration.call(sheet, {}, target("loot-a")); assert.deepEqual(calls, []);
});

test("native transform, end and removal actions delegate to the runtime", async () => {
  const sheet=owner(); await actions.beastEssenceActivate.call(sheet); await actions.beastEssenceDeactivate.call(sheet);
  confirmResult=false; await actions.beastEssenceRemove.call(sheet); assert.equal(calls.length, 2);
  confirmResult=true; await actions.beastEssenceRemove.call(sheet);
  assert.deepEqual(calls.map(call => call[0]), ["activateBeastEssence", "deactivateBeastEssence", "removeBeastEssence"]);
  assert.match(confirmConfig.content, /não volta ao inventário/);
});

test("locked sheets cannot invoke mutation dialogs or token picker callbacks", async () => {
  const sheet=owner(); sheet.isEditable=false;
  for (const name of ["beastEssenceActivate", "beastEssenceDeactivate", "beastEssenceRemove", "beastEssencePickToken", "beastEssencePrepareIntegration"]) await actions[name].call(sheet, {}, target("loot-a"));
  assert.equal(confirmConfig, undefined); assert.equal(pickerConfig, undefined); assert.deepEqual(calls, []);
});

test("token picker and manual entry save one path through the runtime", async () => {
  const sheet=owner(); await actions.beastEssencePickToken.call(sheet);
  assert.equal(pickerConfig.type, "image"); assert.equal(pickerConfig.current, "beasts/token.webp");
  await pickerConfig.callback("beasts/new.webp");
  const input={value: "  beasts/manual.webp  "};
  await actions.beastEssenceSaveToken.call(sheet, {}, {closest: () => ({querySelector: () => input})});
  assert.deepEqual(calls.filter(call => call[0]==="setBeastEssenceToken").map(call => call[2]), ["beasts/new.webp", "beasts/manual.webp"]);
  sheet.actor.isOwner=false; await pickerConfig.callback("beasts/unauthorized.webp"); assert.equal(calls.length, 3);
});

test("open Item is restricted to readable documents already owned by the actor", async () => {
  const sheet=owner(); sheet.actor.items[1].sheet={render: value => calls.push(["open", value])};
  actions.beastEssenceOpenItem.call(sheet, {}, target("grant-a"));
  actions.beastEssenceOpenItem.call(sheet, {}, target("source-private-item"));
  sheet.actor.items[1].visible=false; actions.beastEssenceOpenItem.call(sheet, {}, target("grant-a"));
  assert.deepEqual(calls, [["open", true]]);
});

test("manual token input blocks sheet-wide change and Enter submission", async () => {
  const sheet=owner(); const listeners={}; const input={value: "token.webp", dataset: {}, addEventListener: (type, fn) => listeners[type]=fn};
  const root={matches: () => true, querySelector: () => input}; bind.call(sheet, root); bind.call(sheet, root);
  let stopped=0; let prevented=0;
  listeners.change({stopPropagation: () => stopped++});
  await listeners.keydown({key: "Enter", stopPropagation: () => stopped++, preventDefault: () => prevented++});
  assert.equal(stopped, 2); assert.equal(prevented, 1); assert.equal(calls[0][0], "setBeastEssenceToken");
});

test("template uses native part metadata, button actions and a nameless token draft", async () => {
  const template=await readFile(new URL("../templates/actors/tabs/character-beast-essence.hbs", import.meta.url), "utf8");
  assert.match(template, /data-tab="{{tab.id}}"/); assert.match(template, /data-group="{{tab.group}}"/);
  assert.doesNotMatch(template, /\bname=/); assert.doesNotMatch(template, /{{{/);
  for (const button of template.matchAll(/<button\b[^>]*>/g))assert.match(button[0], /type="button"/);
  for (const action of template.matchAll(/data-action="([^"]+)"/g))assert.equal(typeof actions[action[1]], "function", action[1]);
  assert.doesNotMatch(template, /\p{Extended_Pictographic}/u);
  const css=await readFile(new URL("../less/wuxia-beast-essence.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b|rgba?\(|hsla?\(|animation\s*:|transition\s*:/i);
  const knownTokens=new Set((await readFile(new URL("../less/wuxia-palette.css", import.meta.url), "utf8")).match(/--iw-color-[\w-]+/g));
  for (const token of css.match(/--iw-color-[\w-]+/g))assert(knownTokens.has(token), `Unknown palette token: ${token}`);
});


const handlebars = Handlebars.create();
test("Foundry Handlebars renders integrated, empty and private states with escaped content", {skip: !handlebars}, async () => {
  const render=handlebars.compile(await readFile(new URL("../templates/actors/tabs/character-beast-essence.hbs", import.meta.url), "utf8"));
  const sheet=owner(); sheet.actor.__essenceState.essence.name='<script>alert("name")</script>';
  sheet.actor.flags[scope].beastEssence.pendingItemId=null;
  const data=prepare.call(sheet, {tab: {id: "beastEssence", group: "primary", cssClass: "active"}});
  const integrated=render(data);
  assert.match(integrated, /&lt;script&gt;/); assert.doesNotMatch(integrated, /<script>/);
  assert.match(integrated, /Garras concedidas/); assert.match(integrated, /Preparar integração/);
  assert.match(integrated, /Forma enfraquecida/); assert.match(integrated, /Forma normal/);
  assert.match(integrated, /data-tab="beastEssence"/); assert.doesNotMatch(integrated, /{{/);
  sheet.actor.__essenceState.essence=null; sheet.actor.__essenceState.mode="none"; sheet.actor.items=[];
  const empty=render(prepare.call(sheet, {tab: {id: "beastEssence", group: "primary"}}));
  assert.match(empty, /Nenhuma essência no inventário/); assert.match(empty, /compêndio/);
  sheet.actor.isOwner=false;
  const privateView=render(prepare.call(sheet, {tab: {id: "beastEssence", group: "primary"}}));
  assert.doesNotMatch(privateView, /Qilin|Garras|Inventário|Inventario|Nenhuma essência/);
});

test("the native tab order places Inventory below Cultivation and Features below Inventory", async () => {
  const {LEGACY2_TABS, LEGACY2_TAB_ICONS}=await import("../module/applications/actor/jj/legacy2-sheet.mjs");
  assert.deepEqual(LEGACY2_TABS.slice(0, 4).map(([id]) => id), ["details", "cultivation", "inventory", "features"]);
  assert.equal(LEGACY2_TAB_ICONS.beastEssence, "beastEssence");
  const character=await readFile(new URL("../module/applications/actor/character-sheet.mjs", import.meta.url), "utf8");
  assert.match(character, /case "beastEssence": return prepareBeastEssenceContext.call\(this, context, options\)/);
  assert.match(character, /bindBeastEssenceSheet.call\(this, this.element\)/);
  assert.match(character, /if \(!Ruleset.isV2\(\) \|\| this.actor.limited \|\| !this.actor.isOwner\) delete parts.beastEssence/);
  if (handlebars) {
    handlebars.registerHelper("eq", (left, right) => left===right);
    const icon=handlebars.compile(await readFile(new URL("../templates/actors/parts/jj2-icon.hbs", import.meta.url), "utf8"))({key: LEGACY2_TAB_ICONS.beastEssence});
    assert.match(icon, /m7 8-3-5/); assert.match(icon, /fill="none"/);
  }
});


test("inactive sheet and FilePicker reflect the persisted token path and keep an explicit empty default", async () => {
  const sheet=owner(); const stored=sheet.actor.flags[scope].beastEssence;
  stored.transformation.tokenTexture=""; stored.tokenTexture="custom/qilin.webp";
  let context=prepare.call(sheet, {}).beastEssence;
  assert.equal(context.tokenTexture, "custom/qilin.webp"); assert.equal(context.tokenPreview, "custom/qilin.webp");
  await actions.beastEssencePickToken.call(sheet); assert.equal(pickerConfig.current, "custom/qilin.webp");
  stored.tokenTexture=""; context=prepare.call(sheet, {}).beastEssence;
  assert.equal(context.tokenTexture, ""); assert.equal(context.tokenPreview, "beasts/token.webp");
  await actions.beastEssencePickToken.call(sheet); assert.equal(pickerConfig.current, "");
  delete stored.tokenTexture; context=prepare.call(sheet, {}).beastEssence;
  assert.equal(context.tokenTexture, "beasts/token.webp");
});


test("growth context exposes the original roll, printed table, and current weakening step",()=>{
 const sheet=owner(),e=sheet.actor.__essenceState.essence;e.growthOrigin="rolled";e.growthRoll=11;
 Object.assign(sheet.actor.__essenceState,{mode:"weakened",rank:5,effectiveLevel:12});
 const result=prepare.call(sheet,{}).beastEssence;
 assert.equal(result.growthReceiptLabel,"1d100 · 11");assert.equal(result.effectiveCultivationLabel,"Mar Divino · 3/3");
 assert.deepEqual(result.growthStages.map(s=>[s.mode,s.current]),[["normal",false],["weakened",true],["dormant",false]]);
 assert.equal(result.growthStages[1].realm,"Transformação Divina");assert.equal(result.growthTable.length,6);
 assert.deepEqual(result.growthTable.map(s=>s.range),["1–10","11–20","21–50","51–80","81–99","100"]);
 assert.equal(result.ownedEssences[0].growthReceiptLabel,"1d100 · 11");
});


test("dormant previews preserve recorded elements and describe a mortal separately from an exceeded cap",()=>{
 const sheet=owner();Object.assign(sheet.actor.__essenceState,{mode:"dormant",elements:[],rank:6});
 let context=prepare.call(sheet,{}).beastEssence;assert.equal(context.canActivate,false);assert.equal(context.elements.length,2);
 assert.match(context.dormantDescription,/dois reinos/);
 sheet.actor.__essenceState.rank=0;context=prepare.call(sheet,{}).beastEssence;
 assert.match(context.dormantDescription,/Condensação de Qi/);assert.equal(context.growthStages.some(s=>s.current),false);
});


test("only Narrator sheets expose Rank editing on integrated and inventory essences",async()=>{
 const sheet=owner(),render=handlebars.compile(await readFile(new URL("../templates/actors/tabs/character-beast-essence.hbs",import.meta.url),"utf8"));
 const player=prepare.call(sheet,{}).beastEssence;assert.equal(player.canEditGrowth,false);assert(!render({beastEssence:player}).includes('data-action="beastEssenceEditGrowth"'));
 game.user.isGM=true;const gm=prepare.call(sheet,{}).beastEssence;assert.equal(gm.canEditGrowth,true);
 const html=render({beastEssence:gm});assert.equal((html.match(/data-action="beastEssenceEditGrowth"/g)??[]).length,2);
 sheet.isEditable=false;assert.equal(prepare.call(sheet,{}).beastEssence.canEditGrowth,false);
});
test("Rank dialog edits the selected essence without submitting the actor form and honours cancellation",async()=>{
 const sheet=owner();game.user.isGM=true;let dialog;
 foundry.applications.api.DialogV2.wait=async config=>{dialog=config;return "heaven";};
 await actions.beastEssenceEditGrowth.call(sheet,{},target("loot-a"));
 assert.match(dialog.content,/Rank de crescimento/);assert.equal((dialog.content.match(/<option /g)??[]).length,6);
 assert.deepEqual(calls[0].slice(0,1),["setBeastEssenceGrowth"]);assert.deepEqual(calls[0].slice(2),["heaven","loot-a","essence-a"]);
 foundry.applications.api.DialogV2.wait=async()=>null;await actions.beastEssenceEditGrowth.call(sheet,{},target());assert.equal(calls.length,1);
 game.user.isGM=false;await actions.beastEssenceEditGrowth.call(sheet,{},target());assert.equal(calls.length,1);
});


test("form previews and legacy notices reflect the independently chosen archetype abilities",()=>{
 const sheet=owner(),e=sheet.actor.__essenceState.essence;e.weakenedArchetypeFeatures=["arch"];e.normalArchetypeFeatures=[];
 const view=prepare.call(sheet,{}).beastEssence;assert(!view.forms[0].traits.some(t=>t.name==="Defesa de guardião"));assert(view.forms[1].traits.some(t=>t.name==="Defesa de guardião"));
 delete e.normalArchetypeFeatures;delete e.weakenedArchetypeFeatures;assert.equal(prepare.call(sheet,{}).beastEssence.archetypeSelectionPending,true);
});
test("Narrator can choose abilities on an integrated essence while player sheets cannot open the editor",async()=>{
 const sheet=owner();game.user.isGM=true;
 foundry.applications.handlebars={renderTemplate:async()=>"choices"};
 foundry.applications.api.DialogV2.wait=async()=>({normalArchetypeFeatures:["arch"],weakenedArchetypeFeatures:["arch"]});
 await actions.beastEssenceEditSelections.call(sheet,{},target());
 const call=calls.find(c=>c[0]==="setBeastEssenceSelections");assert(call);assert.deepEqual(call[2].normalArchetypeFeatures,["arch"]);assert.deepEqual(call.slice(3),["","essence-a"]);
 calls.length=0;game.user.isGM=false;await actions.beastEssenceEditSelections.call(sheet,{},target());assert.equal(calls.length,0);
});
