import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import PreserveSheetScrollMixin from '../module/applications/actor/jj/sheet-scroll.mjs';
import FeiticoSheetMixin from '../module/applications/actor/jj/feitico-sheet.mjs';
import Ruleset from "../module/systems/ruleset.mjs";
import { professionActions, prepareProfessionsContext, bindProfessionsSheet } from "../module/applications/actor/jj/professions-sheet.mjs";
import { prepareElementalConceptsContext, elementalConceptActions, bindElementalConceptsSheet } from "../module/applications/actor/jj/elemental-concepts-sheet.mjs";
import { syncElementalFeatures } from "../module/systems/elemental-feature-sync.mjs";
import { prepareInventoryPresentation } from "../module/applications/actor/jj/inventory-presentation.mjs";
import * as npcPresentation from "../module/applications/actor/jj/legacy2-npc-sheet.mjs";
import { NPC2_TABS, configureNpc2Parts } from "../module/applications/actor/jj/legacy2-npc-sheet.mjs";
const defensiveFocusSource = readFileSync(new URL("../module/applications/actor/jj/explosao-defensiva.mjs", import.meta.url), "utf8").match(/export async function onFocoDefensivo\(actor\) \{[\s\S]*?\r?\n\}/)[0].replace("export ", "");
const onFocoDefensivo = new Function("return " + defensiveFocusSource)();
let version = "2.0";
globalThis.game = { settings: { get: () => version }, user: { isGM: true } };
globalThis.CONFIG = { DND5E: { spellSchools: {} } };
const getProperty = (object, key) => key.split(".").reduce((v, k) => v?.[k], object);
const setProperty = (object, key, value) => { const keys = key.split("."), last = keys.pop(); let target = object; for (const part of keys) target = target[part] ??= {}; target[last] = value; };
globalThis.foundry = { applications: { ux: { TextEditor: { implementation: {} } }, api: { DialogV2: { confirm: async () => true } } }, utils: { deepClone: structuredClone, getProperty, setProperty } };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.window = {};
class Boundary {
  constructor(actor) { this.actor = actor; }
  get isEditable() { return this.actor.isOwner; }
  get isEditMode() { return true; }
  _configureRenderParts() { return structuredClone(this.constructor.PARTS); }
  _getTabs() { return { native: {} }; }
  _replaceHTML(result) { this.replaced=result; }
  async _preparePartContext(id, context) { return context; }
  async _prepareInventoryContext(context) { return context; }
  _onClickAction() { return "native-action"; }
  _onDropItem() { return "native-drop"; }
  _prepareSpellbook(context) { return [...context.itemCategories.spells]; }
}
const source = readFileSync(new URL("../module/applications/actor/npc-sheet.mjs", import.meta.url), "utf8")
  .replace(/^import\s[\s\S]*?;\r?\n/gm, "").replace("export default class NPCActorSheet", "class NPCActorSheet");
const NPCSheet = new Function("PreserveSheetScrollMixin", "FeiticoSheetMixin", "onFocoDefensivo", "npcNature", "npc2HiddenTabs", "prepareInventoryPresentation", "BaseActorSheet", "Ruleset", "NPC2_TABS", "configureNpc2Parts", "professionActions", "prepareProfessionsContext", "bindProfessionsSheet", "prepareElementalConceptsContext", "elementalConceptActions", "bindElementalConceptsSheet", "syncElementalFeatures", `${source}\nreturn NPCActorSheet;`)
  (PreserveSheetScrollMixin, FeiticoSheetMixin, onFocoDefensivo, npcPresentation.npcNature, npcPresentation.npc2HiddenTabs, prepareInventoryPresentation, Boundary, Ruleset, NPC2_TABS, configureNpc2Parts, professionActions, prepareProfessionsContext, bindProfessionsSheet, prepareElementalConceptsContext, elementalConceptActions, bindElementalConceptsSheet, syncElementalFeatures);
function spell(id, flags = {}, level = 1) {
  return { id, type: "spell", name: id, system: { level }, flags: { "Immortals-system": { feitico: flags } },
    getFlag(scope, key) { return getProperty(this.flags[scope], key); },
    async setFlag(scope, key, value) { setProperty(this.flags[scope], key, value); },
    async unsetFlag(scope, key) { delete this.flags[scope][key]; },
    async update(data) { for (const [key, value] of Object.entries(data)) setProperty(this, key, value); },
    toObject() { return { _id: this.id, name: this.name, type: this.type, system: structuredClone(this.system), flags: structuredClone(this.flags) }; }
  };
}
function fixture(items = []) {
  version = "2.0";
  items.get = id => items.find(i => i.id === id);
  const actor = { type: "npc", isOwner: true, limited: false, items, system: { legacy2: { nd: "8" }, details: { level: 99 }, masteryLevel: 0, attributes: { prof: 2 } }, getFlag() {} };
  for (const item of items) item.parent = actor;
  return { actor, sheet: new NPCSheet(actor) };
}
test("NPC navigation omits Feitiço, retains native tabs and falls back from an old saved tab", () => {
  const { sheet } = fixture(); sheet.tabGroups.primary = "feitico";
  const tabs = sheet._getTabs();
  assert.deepEqual(Object.keys(tabs), ["details", "inventory", "features", "cultivationManual", "skills", "spells", "effects", "biography", "specialTraits", "concepts", "professions"]);
  assert.equal(tabs.details.active, true);
  assert.equal(sheet._configureRenderParts({}).feitico, undefined);
  assert.equal(NPCSheet.PARTS.feitico, undefined);
  assert.equal(NPCSheet.TABS.some(tab => tab.tab === "feitico"), false);
});
test("NPC manual techniques are grouped in the new manual tab while unassigned techniques stay in the native spellbook", () => {
  const items = [spell("manifestation", { slot: "m1" }), spell("linked", { parent: "m1" }), spell("standalone")];
  const { sheet } = fixture(items);
  const context = { itemCategories: { spells: items } }, before = items.map(item => item.toObject());
  assert.deepEqual(sheet._prepareSpellbook(context).map(item => item.id), ["standalone"]);
  assert.equal(context.itemCategories.spells, items);
  assert.deepEqual(items.map(item => item.toObject()), before);
});
test("NPC item drops and actions follow the native controller without the removed Feitiço editor", async () => {
  const { sheet } = fixture();
  assert.equal(await sheet._onDropItem({target:{closest:()=>null}},spell("technique")), "native-drop");
  assert.equal(sheet._onClickAction({}, {dataset:{action:"use"}}), "native-action");
});
test("NPC inventory uses permanent equipment categories while retaining native row data", async () => {
  const { sheet } = fixture(), items = [spell("native-item")];
  const input = {system:{attributes:{encumbrance:{value:1}}},sections:[{label:"Armas",dataset:{"group-type":"weapon"},items}],listControls:{grouping:[{key:"type"},{key:"origin"}]}};
  const result = await sheet._prepareInventoryContext(input, {});
  assert.equal(result.iwInventory,true); assert.equal(result.keepEmpty,true);
  assert.equal(result.sections[0].items,items); assert(result.sections[0].iwIconPath);
  assert.deepEqual(result.listControls.grouping,[{key:"type"}]);
});


test('beast NPCs hide profession and biography tabs and content, falling back from an old active tab',()=>{
 const {sheet,actor}=fixture();actor.flags={'Immortals-system':{npcNature:'beast'}};actor.system.professions={alchemy:{level:4}};actor.system.details.biography={value:'Preservar história'};const before=structuredClone(actor.system);
 for(const savedTab of ['professions','biography']){sheet.tabGroups.primary=savedTab;const tabs=sheet._getTabs();assert.equal(tabs.professions,undefined);assert.equal(tabs.biography,undefined);assert.equal(tabs.details.active,true);assert.equal(Object.keys(tabs).length,9);}
 const parts=sheet._configureRenderParts({});assert.equal(parts.professions,undefined);assert.equal(parts.biography,undefined);assert(parts.details&&parts.skills&&parts.concepts&&parts.inventory);assert.deepEqual(actor.system,before);
 actor.flags['Immortals-system'].npcNature='human';assert(sheet._getTabs().professions&&sheet._getTabs().biography);assert(sheet._configureRenderParts({}).professions&&sheet._configureRenderParts({}).biography);assert.deepEqual(actor.system,before);
});
test('switching to beast removes stale rendered civil tabs from the native part registry',()=>{
 const {sheet,actor}=fixture();actor.flags={'Immortals-system':{npcNature:'beast'}};
 const removed=[],details={id:'details'},profession={remove(){removed.push('professions');}},biography={remove(){removed.push('biography');}};sheet.parts={professions:profession,biography,details};
 const content={querySelector:()=>null},result={tabs:{},details:{},professions:{},biography:{}};sheet._replaceHTML(result,content,{});
 assert.deepEqual(removed,['professions','biography']);assert.equal(sheet.parts.professions,undefined);assert.equal(sheet.parts.biography,undefined);assert.equal(sheet.parts.details,details);assert.equal(sheet.replaced.professions,undefined);assert.equal(sheet.replaced.biography,undefined);assert(sheet.replaced.tabs&&sheet.replaced.details);
});
test('native tab conditions and limited render parts also keep beast biography hidden',()=>{
 const {sheet,actor}=fixture();actor.flags={'Immortals-system':{npcNature:'beast'}};actor.limited=true;
 assert.equal(NPCSheet.TABS.filter(t=>t.tab==='professions').length,1);assert.equal(NPCSheet.TABS.find(t=>t.tab==='professions').condition(actor),false);assert.equal(NPCSheet.TABS.find(t=>t.tab==='biography').condition(actor),false);
 assert.equal(sheet._configureRenderParts({}).biography,undefined);
});


test('NPC header shield uses the player defensive-focus controller with native edit permissions',async()=>{
 const {sheet,actor}=fixture();actor.name='Guardião';actor.system.armorPoints={value:0,max:20};actor.system.energy={total:50,generated:6};actor.system.attributes.hp={value:100,max:100};
 const updates=[];actor.update=async patch=>{updates.push(structuredClone(patch));for(const [key,value]of Object.entries(patch))setProperty(actor,key,value);};
 const previous=globalThis.ChatMessage;globalThis.ChatMessage={create:async()=>{},getSpeaker:()=>({})};
 try{const action=NPCSheet.DEFAULT_OPTIONS.actions.jj2DefensiveFocus;assert.equal(typeof action,'function');await action.call(sheet);assert.equal(actor.system.armorPoints.value,20);await action.call(sheet);assert.equal(actor.system.armorPoints.value,0);actor.isOwner=false;await action.call(sheet);assert.equal(updates.length,2);assert.deepEqual(actor.system.energy,{total:50,generated:6});assert.equal(actor.system.attributes.hp.value,100);}
 finally{if(previous===undefined)delete globalThis.ChatMessage;else globalThis.ChatMessage=previous;}
});

test('the actual NPC controller prepares and dispatches the Manual de Cultivo editor',async()=>{const {sheet}=fixture([spell('main',{slot:'m1'}),spell('child',{parent:'m1'},3)]);const context=await sheet._preparePartContext('cultivationManual',{tabs:{},tab:{id:'cultivationManual'}},{});assert.equal(context.manual.slots[1].manifestacao.id,'main');assert.equal(context.manual.slots[1].tecnicas[0].id,'child');assert.equal(context.manual.nivel,8);let created;sheet._onFeiticoCreateTecnica=slot=>created=slot;sheet._onClickAction({}, {dataset:{action:'feitico-create-tecnica',slot:'m2'}});assert.equal(created,'m2');});
