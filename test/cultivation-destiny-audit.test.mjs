import assert from "node:assert/strict";
import {test} from "node:test";
import * as manual from "../module/systems/divine-manual.mjs";
import {prepareDestinySelection} from "../module/systems/cultivation-destiny.mjs";
import {createCultivationDestinyRuntime} from "../module/systems/cultivation-destiny-runtime.mjs";
import {crystalCultivationProjection} from "../module/systems/essence-crystals.mjs";
const S="Immortals-system";
let n=0;
const actor=()=>({id:"audit"+(++n),uuid:"Actor.audit"+n,type:"character",isOwner:true,limited:false,
  itemTypes:{class:[{type:"class",system:{identifier:"cultivador"}}]},items:new Map(),
  flags:{[S]:{}},system:{cultivation:{rank:3,stage:1,essence:0,points:10}},
  getFlag(scope,key){return this.flags[scope]?.[key];}});
function patch(a,p){for(const[k,v]of Object.entries(p)){const keys=k.split(".");let o=a;for(const key of keys.slice(0,-1))o=o[key]??={};if(keys.at(-1).startsWith("-="))delete o[keys.at(-1).slice(2)];else o[keys.at(-1)]=structuredClone(v);}}
const configure=a=>{patch(a,prepareDestinySelection(a,{key:"unrivaled-genius"}));patch(a,manual.prepareDivineManualMantras(a,{mantras:[{name:"Céu",text:"Primeiro",essencePerDay:20},{name:"Terra",text:"Segundo",essencePerDay:5}],activeMantra:1}));};

test("clearing the active absorption field remains blank when the mantra editor is reopened",()=>{
  const a=actor();configure(a);
  delete a.flags[S].manualEssencePerDay;
  assert.equal(crystalCultivationProjection(a,1,{level:"mediano"}).gain,15);
  const view=manual.divineManualState(a);
  assert.equal(view.mantras[1].essencePerDay,null,"the editor must agree with the calendar instead of restoring the old 5 PEQ cap");
  patch(a,manual.prepareDivineManualMantras(a,{mantras:view.mantras,activeMantra:view.activeMantra}));
  assert.equal(crystalCultivationProjection(a,1,{level:"mediano"}).gain,15);
});

test("inline mantra edits preserve the other stored mantra even while the current destiny allows only one",()=>{
  assert.equal(typeof manual.prepareDivineManualMantraEdit,"function");
  const a=actor();configure(a);patch(a,prepareDestinySelection(a,{key:"own-origin"}));
  patch(a,manual.prepareDivineManualMantraEdit(a,{text:"Segundo revisado",essencePerDay:null}));
  assert.equal(a.flags[S].divineManual.mantras.length,2);
  assert.deepEqual(a.flags[S].divineManual.mantras[0],{name:"Céu",text:"Primeiro",essencePerDay:20});
  assert.deepEqual(a.flags[S].divineManual.mantras[1],{name:"Terra",text:"Segundo revisado",essencePerDay:null});
  assert.equal(a.flags[S].manualEssencePerDay,undefined);
  patch(a,prepareDestinySelection(a,{key:"unrivaled-genius"}));
  assert.equal(manual.divineManualState(a).activeMantra,1);
  assert.equal(manual.divineManualState(a).mantras[0].essencePerDay,20);
});

test("inline rate and text changes merge into the current active mantra without resetting each other",()=>{
  assert.equal(typeof manual.prepareDivineManualMantraEdit,"function");
  const a=actor();configure(a);
  patch(a,manual.prepareDivineManualMantraEdit(a,{essencePerDay:0}));
  patch(a,manual.prepareDivineManualMantraEdit(a,{text:"Pausado"}));
  assert.equal(a.flags[S].manualEssencePerDay,0);
  assert.equal(a.flags[S].mantraText,"Pausado");
  assert.equal(a.flags[S].divineManual.mantras[1].essencePerDay,0);
  assert.equal(crystalCultivationProjection(a,2,{level:"mediano"}).gain,0);
  assert.throws(()=>manual.prepareDivineManualMantraEdit(a,{essencePerDay:-1}));
  assert.throws(()=>manual.prepareDivineManualMantraEdit({...a,type:"npc"},{text:"Não"}));
});

test("a synthetic copy reseals its inherited lineage feat when its realm falls below the unlock",async()=>{
  const a=actor();let ids=0;
  const runtime=createCultivationDestinyRuntime({user:()=>({id:"gm",isGM:true}),idFactory:()=>String(++ids).padStart(16,"0"),commit:async(subject,u)=>{
    patch(subject,u.actor);for(const id of u.delete??[])subject.items.delete(id);for(const d of u.create??[])subject.items.set(d._id,{...structuredClone(d),id:d._id});
  }});
  await runtime.select(a,{key:"divine-lineage",lineageId:"phoenix",ability:"str"});
  const token={...a,uuid:"Scene.scene.Token.token.Actor."+a.id,isToken:true,flags:structuredClone(a.flags),system:structuredClone(a.system),items:new Map([...a.items].map(([id,v])=>[id,structuredClone(v)]))};
  token.items.set("personal",{id:"personal",type:"feat",name:"Característica pessoal",flags:{}});
  token.system.cultivation.rank=2;
  await runtime.sync(token);
  assert.equal([...token.items.values()].filter(i=>i.flags?.[S]?.cultivationDestinyGrant).length,0);
  assert(token.items.has("personal"));
  assert.equal([...a.items.values()].filter(i=>i.flags?.[S]?.cultivationDestinyGrant).length,1,"the world actor must remain untouched");
  token.system.cultivation.rank=3;
  await runtime.sync(token);
  assert.equal([...token.items.values()].filter(i=>i.flags?.[S]?.cultivationDestinyGrant).length,1);
  await runtime.select(token,{key:"own-origin"});
  assert.equal([...token.items.values()].filter(i=>i.flags?.[S]?.cultivationDestinyGrant).length,0);
});

test("the cultivation sheet saves inline rate and text changes through the shared queue without losing the inactive mantra",async()=>{
  const {bindCultivationSheet}=await import("../module/applications/actor/jj/cultivation-sheet.mjs");
  const {registerCultivationDestinyAuthority}=await import("../module/systems/cultivation-destiny-authority.mjs");
  const {withElementalActorLock}=await import("../module/systems/elemental-runtime.mjs");
  const a=actor();configure(a);
  a.ownership={default:3};a.testUserPermission=()=>true;
  a.update=async p=>patch(a,p);
  a.setFlag=async(scope,key,v)=>patch(a,{["flags."+scope+"."+key]:v});
  a.unsetFlag=async(scope,key)=>patch(a,{["flags."+scope+".-="+key]:null});
  const user={id:"gm",isGM:true,active:true},users=[user];users.activeGM=user;users.get=()=>user;
  const before=globalThis.game;
  globalThis.game={user,users,socket:{on(){},emit(){},off(){}}};
  const authority=registerCultivationDestinyAuthority(createCultivationDestinyRuntime());
  const control=value=>({value,dataset:{},disabled:false,listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});
  const rate=control(""),text=control("Novo mantra");
  const tab={querySelector:()=>null,querySelectorAll:s=>s==="[data-manual-essence]"?[rate]:s==="[data-manual-mantra]"?[text]:[]};
  const sheet={actor:a,isEditable:true,element:{querySelector:()=>tab}};
  try{
    bindCultivationSheet(sheet);
    let release,entered;const inside=new Promise(r=>entered=r);
    const holder=withElementalActorLock(a,"audit-holder",async()=>{entered();await new Promise(r=>release=r);});await inside;
    const pending=[rate.listeners.change(),text.listeners.change()];
    release();await holder;await Promise.all(pending);
    assert.equal(a.flags[S].divineManual.mantras[1].essencePerDay,null);
    assert.equal(a.flags[S].divineManual.mantras[1].text,"Novo mantra");
    assert.equal(a.flags[S].divineManual.mantras[0].text,"Primeiro");
    assert.equal(crystalCultivationProjection(a,1,{level:"mediano"}).gain,15);

    // A queued edit must still address the mantra that was visible when it was made.
    let secondRelease,secondEntered;
    const secondInside=new Promise(r=>secondEntered=r);
    const secondHolder=withElementalActorLock(a,"audit-switch",async()=>{secondEntered();await new Promise(r=>secondRelease=r);});await secondInside;
    rate.value="9";const oldFieldChange=rate.listeners.change();
    patch(a,manual.prepareDivineManualMantras(a,{mantras:a.flags[S].divineManual.mantras,activeMantra:0}));
    secondRelease();await secondHolder;await oldFieldChange;
    assert.equal(a.flags[S].divineManual.mantras[0].essencePerDay,20,"a queued field edit cannot overwrite a different mantra after a switch");
    assert.equal(a.flags[S].manualEssencePerDay,20);
  }finally{authority.unregister();globalThis.game=before;}
});
