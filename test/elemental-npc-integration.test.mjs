import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import Ruleset from "../module/systems/ruleset.mjs";
import {NPC2_TABS, configureNpc2Parts, npcNature, npc2HiddenTabs} from "../module/applications/actor/jj/legacy2-npc-sheet.mjs";
import {prepareElementalConceptsContext, elementalConceptActions, bindElementalConceptsSheet} from "../module/applications/actor/jj/elemental-concepts-sheet.mjs";
import {syncElementalFeatures} from "../module/systems/elemental-feature-sync.mjs";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const npcSource = read("module/data/actor/npc.mjs"), sheetSource = read("module/applications/actor/npc-sheet.mjs");
let version = "2.0";
globalThis.game = {settings: {get: (_scope,key) => key === "rulesetVersion" ? version : false}, user: {isGM: true}};
globalThis.CONFIG = {DND5E: {abilities: {}, movementTypes: {}, movementUnits: {}}, JUJUTSU: {trainingPoints: {criacao: 10}}};
globalThis.ui = {notifications: {warn() {}, info() {}}};
globalThis.foundry = {applications: {ux: {TextEditor: {implementation: {}}}}, utils: {isEmpty: value => !Object.keys(value ?? {}).length}};
function schema() {
  class Field {constructor(options = {}) {Object.assign(this,options);}}
  class SchemaField extends Field {constructor(fields, options = {}) {super(options);this.fields = fields;}}
  class ElementField extends Field {constructor(element,options = {}) {super(options);this.element = element;}}
  class Parent {static defineSchema() {return {};} static mergeSchema(a,b) {return {...a,...b};}}
  const start = npcSource.indexOf("  static defineSchema() {"), end = npcSource.indexOf("\n  }", start) + 4;
  const names = ["ArrayField","BooleanField","NumberField","SchemaField","SetField","StringField","MappingField","FormulaField","CreatureTypeField","RollConfigField","SourceField","AttributesFields","DetailsFields","TraitsFields","legacy2Schema"];
  const values = [ElementField,Field,Field,SchemaField,ElementField,Field,ElementField,Field,Field,Field,Field,{common:{},creature:{},hitPoints:{}},{common:{},creature:{}},{common:{},creature:{}},()=>new SchemaField({})];
  const Model = new Function("Parent",...names,"return class extends Parent {" + npcSource.slice(start,end) + "}")(Parent,...values);
  return Model.defineSchema();
}
function apply(target,patch) {for(const [path,value] of Object.entries(patch)){if(path === "_id")continue;const parts=path.split("."),last=parts.pop();let node=target;
  for(const part of parts)node=node[part]??={};if(last.startsWith("-="))delete node[last.slice(2)];else node[last]=structuredClone(value);}}
function actor() {
  const a = {id:"npc",uuid:"Actor.npc",type:"npc",isOwner:true,limited:false,name:"Cultivador PdN",classes:{},items:[],flags:{"Immortals-system":{cultivationRank:9}},
    system:{legacy2:{nd:10,actions:{value:3,max:3},pontos:{extra:90,gastos:7}},cultivation:{points:12,illumination:2,spentTrainingPoints:0},
      conceitos:{fogo:{level:3,unlocked:true,failures:{},spentTrainingPoints:3,lostTrainingPoints:0}},elementAbilities:{fogo:{qiFlamejante:1}},
      energy:{generated:200,total:600,max:600,genMax:200},traits:{important:false},abilities:{con:{value:8}},attributes:{hp:{value:300,max:300},movement:{}},details:{xp:{value:0}}},creations:0};
  a.getFlag=(scope,key)=>a.flags?.[scope]?.[key];a.update=async patch=>apply(a,patch);
  a.createEmbeddedDocuments=async(kind,data)=>{assert.equal(kind,"Item");a.creations+=data.length;const created=data.map((doc,index)=>({...structuredClone(doc),id:"feat"+(a.items.length+index)}));a.items.push(...created);return created;};
  a.updateEmbeddedDocuments=async(kind,data)=>{assert.equal(kind,"Item");for(const doc of data)apply(a.items.find(item=>item.id===doc._id),doc);return data;};
  a.deleteEmbeddedDocuments=async(kind,ids)=>{assert.equal(kind,"Item");a.items=a.items.filter(item=>!ids.includes(item.id));return ids;};
  return a;
}
class Boundary {
  constructor(actor) {this.actor=actor;this.isEditable=true;}
  _configureRenderParts(){return structuredClone(this.constructor.PARTS);}
  _getTabs(){return {native:{}};}
  async _prepareContext(){return {itemCategories:{},itemContext:{}};}
  async _preparePartContext(_id,context){return context;}
  _prepareSpellbook(){return [];}
  async _onRender(){}
  _renderCreateInventory(){} _renderAttunement(){} _renderSpellbook(){}
}
const imports = Array.from(sheetSource.matchAll(/^import (.+) from ["'][^"']+["'];\r?$/gm),match=>match[1]);
const bindings = imports.flatMap(clause => clause.replace(/[{}]/g,"").split(",").map(name=>name.trim().split(/\s+as\s+/).at(-1)));
const context = Object.fromEntries(bindings.map(name=>[name,()=>{}]));
Object.assign(context,{BaseActorSheet:Boundary,PreserveSheetScrollMixin:Base=>Base,FeiticoSheetMixin:Base=>Base,Ruleset,NPC2_TABS,configureNpc2Parts,npcNature,npc2HiddenTabs,professionActions:{},
  prepareElementalConceptsContext,elementalConceptActions,bindElementalConceptsSheet,syncElementalFeatures,buildNpc2Context:()=>({})});
const withoutImports=sheetSource.replace(/^import .*;\r?$/gm,"").replace("export default class NPCActorSheet","class NPCActorSheet");
const NPCSheet = new Function(...bindings,withoutImports+"\nreturn NPCActorSheet;")(...bindings.map(name=>context[name]));

test("NPC schema persists concepts, learned tiers and independent PC/PI balances with character defaults",()=>{
  const fields=schema();assert(fields.conceitos?.element?.fields);assert(fields.elementAbilities?.element?.element);
  const concept=fields.conceitos.element.fields;
  assert.deepEqual(Object.keys(concept),["level","unlocked","failures","spentTrainingPoints","lostTrainingPoints"]);
  assert.equal(concept.level.initial,0);assert.equal(concept.level.min,0);assert.equal(concept.level.max,10);assert.equal(concept.unlocked.initial,false);
  assert.equal(concept.failures.element.initial,0);assert.equal(concept.spentTrainingPoints.initial,0);assert.equal(concept.lostTrainingPoints.initial,0);
  const tier=fields.elementAbilities.element.element;assert.equal(tier.initial,0);assert.equal(tier.min,0);assert.equal(tier.max,3);assert(tier.integer);
  for(const key of ["points","illumination","spentTrainingPoints"]){const field=fields.cultivation.fields[key];assert(field.required&&field.integer&&!field.nullable);assert.equal(field.min,0);assert.equal(field.initial,0);}
  assert.equal(fields.cultivation.fields.rank,undefined);assert.equal(fields.cultivation.fields.stage,undefined);
  assert.equal(fields.energy.fields.genPerTurn.initial,3);assert.equal(fields.energy.fields.genMax.initial,20);assert.equal(fields.attributes.fields.hp.fields.maxOverride.initial,null);
});

test("NPC 2.0 navigation and render parts expose one shared Concepts tab alongside the remaining Immortals tabs",()=>{
  version="2.0";const sheet=new NPCSheet(actor());sheet.tabGroups.primary="concepts";
  assert.equal(NPC2_TABS.filter(([id])=>id==="concepts").length,1);assert.equal(sheet._getTabs().concepts.active,true);
  const parts=sheet._configureRenderParts({});assert.equal(parts.concepts.template,"systems/Immortals-system/templates/actors/tabs/character-elemental-concepts.hbs");
  assert(parts.concepts.templates.some(path=>path.endsWith("elemental-concept-icon.hbs")));assert(parts.professions&&parts.skills&&parts.inventory);
  assert.equal(parts.feitico,undefined);
  sheet.actor.limited=true;assert.equal(sheet._configureRenderParts({}).concepts,undefined);sheet.actor.limited=false;
  version="1.0";assert.equal(sheet._configureRenderParts({}).concepts,undefined);assert.deepEqual(sheet._getTabs(),{native:{}});version="2.0";
});

test("opening an owned NPC reconciles real elemental features once and derives realm from the NPC cultivation level",async()=>{
  const a=actor(),before={nd:a.system.legacy2.nd,hp:structuredClone(a.system.attributes.hp),energy:structuredClone(a.system.energy)},sheet=new NPCSheet(a);
  const base=await sheet._prepareContext({});await sheet._prepareContext({});assert.equal(a.creations,1);assert.equal(a.items[0].flags["Immortals-system"].elementalDerived,true);
  const prepared=await sheet._preparePartContext("concepts",base,{});assert.equal(prepared.elemental.pt,12);assert.equal(prepared.elemental.illumination,2);
  const fire=prepared.elemental.abilityGroups.find(group=>group.id==="fogo"),flame=fire.abilities.find(ability=>ability.id==="qiFlamejante");
  assert.equal(flame.rank,4);assert.equal(flame.canAdvance,true);assert.equal(flame.ownedId,a.items[0].id);
  assert.deepEqual({nd:a.system.legacy2.nd,hp:a.system.attributes.hp,energy:a.system.energy},before);assert.equal(a.system.cultivation.rank,undefined);
});

test("NPC Concepts actions advance learned tiers through the shared controller and preserve independent resources",async()=>{
  const a=actor(),sheet=new NPCSheet(a);await sheet._prepareContext({});
  assert.equal(typeof NPCSheet.DEFAULT_OPTIONS.actions.advanceElementalAbility,"function");
  await NPCSheet.DEFAULT_OPTIONS.actions.advanceElementalAbility.call(sheet,{}, {dataset:{element:"fogo",ability:"qiFlamejante"}});
  assert.equal(a.system.elementAbilities.fogo.qiFlamejante,2);assert.equal(a.items[0].flags["Immortals-system"].elementalAbility.tier,2);
  assert.equal(a.system.cultivation.points,12);assert.equal(a.system.legacy2.pontos.extra,90);assert.equal(a.system.energy.generated,200);
});

test("NPC render binds the existing Concepts controls and read-only opening never creates features",async()=>{
  const a=actor(),sheet=new NPCSheet(a),detail={dataset:{elementSection:"help"},addEventListener(){}};
  const tab={querySelectorAll:selector=>selector.startsWith("details")?[detail]:[]};
  sheet.element={classList:{toggle(){},contains(){return false;}},querySelector:selector=>selector===".elemental-concepts-tab"?tab:null};
  await sheet._onRender({},{});assert.equal(detail.dataset.bound,"1");
  const viewer=actor();viewer.isOwner=false;const readonly=new NPCSheet(viewer);readonly.isEditable=false;await readonly._prepareContext({});assert.equal(viewer.creations,0);
  const prepared=await readonly._preparePartContext("concepts",{},{});assert.equal(prepared.elemental.editable,false);assert(prepared.elemental.groups.flatMap(group=>group.elements).every(element=>!element.canTrain));
});
