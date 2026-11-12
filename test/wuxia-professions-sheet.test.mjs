import assert from "node:assert/strict";import {test} from "node:test";
let sheet;try{sheet=await import("../module/applications/actor/jj/professions-sheet.mjs");}catch(error){if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;sheet={};}
const use=name=>{assert.equal(typeof sheet[name],"function",name+" must expose the profession workspaces");return sheet[name];};
globalThis.game={settings:{get:()=>"2.0"}};
function actor(){const a={uuid:"profession-actor",isOwner:true,limited:false,flags:{"Immortals-system":{professions:{}}},system:{energy:{total:20}},async update(patch){for(const[path,value]of Object.entries(patch)){const parts=path.split("."),last=parts.pop();let target=this;for(const part of parts)target=target[part]??={};if(last.startsWith("-="))delete target[last.slice(2)];else target[last]=structuredClone(value);}}};return a;}
function dialogs(value){globalThis.foundry={utils:{randomID:()=>"record0000000001"},applications:{api:{DialogV2:{wait:async()=>value,confirm:async()=>true}}}};globalThis.ui={notifications:{warn(){}}};}
test("the prepared tab exposes all five crafts and hides private records for limited viewers",()=>{const a=actor(),prepare=use("prepareProfessionsContext");const c=prepare.call({actor:a,isEditable:true},{},{});assert.equal(c.professions.items.length,5);assert.equal(c.professions.editable,true);const ro=prepare.call({actor:a,isEditable:false},{},{});assert.equal(ro.professions.editable,false);a.limited=true;const limited=prepare.call({actor:a,isEditable:false},{},{});assert.equal(limited.professions.items.length,0);});
test("a project saves in its profession and cancelled dialogs change nothing",async()=>{use("prepareProfessionsContext");const a=actor(),target={dataset:{profession:"artisan",kind:"project"}};dialogs(null);const before=structuredClone(a.flags);await sheet.professionActions.professionAddRecord.call({actor:a,isEditable:true},{},target);assert.deepEqual(a.flags,before);dialogs({name:"Espada",kind:"project",status:"planned",notes:"",fields:{category:"Arma",materials:"Aço"}});await sheet.professionActions.professionAddRecord.call({actor:a,isEditable:true},{},target);assert.equal(a.flags["Immortals-system"].professions.artisan.records.record0000000001.name,"Espada");assert.equal(a.system.energy.total,20);});
test("locked and non-owner sheets cannot add, delete or change profession records",async()=>{use("prepareProfessionsContext");for(const flags of [{isEditable:false,isOwner:true},{isEditable:true,isOwner:false}]){const a=actor();a.isOwner=flags.isOwner;a.update=async()=>{throw Error("Unauthorized write");};dialogs(null);foundry.applications.api.DialogV2.wait=async()=>{throw Error("Unexpected editor");};const before=structuredClone(a.flags),owner={actor:a,isEditable:flags.isEditable},target={dataset:{profession:"artisan",kind:"project",record:"record0000000001"}};await sheet.professionActions.professionAddRecord.call(owner,{},target);await sheet.professionActions.professionDeleteRecord.call(owner,{},target);assert.deepEqual(a.flags,before);}});
test("permission changes while an editor is open prevent a delayed save",async()=>{use("prepareProfessionsContext");const a=actor(),owner={actor:a,isEditable:true};dialogs(null);foundry.applications.api.DialogV2.wait=async()=>{a.isOwner=false;return{name:"Espada",kind:"project",fields:{category:"Arma",materials:"Aço"}};};await sheet.professionActions.professionAddRecord.call(owner,{},{dataset:{profession:"artisan",kind:"project"}});assert.deepEqual(a.flags["Immortals-system"].professions,{});});
test("record content stays escaped in the profession editor",()=>{const html=use("professionDialogContent")("inscriptions",{name:'<img src=x onerror="alert(1)">',kind:"project",status:"planned",notes:"</textarea><script>alert(2)</script>",fields:{support:'\" autofocus onfocus=alert(3)',effect:"<b>Proteção</b>"}},{editable:true});assert(!html.includes('<script>'));assert(!html.includes('<img src=x'));assert(html.includes('&lt;script&gt;'));assert(html.includes('&lt;b&gt;Proteção&lt;/b&gt;'));});

test("native dialog cancellation returns a falsy value and never warns or writes", async () => {
  use("prepareProfessionsContext");
  const a = actor(), owner = {actor:a, isEditable:true}, warnings = [];
  dialogs(null);
  ui.notifications.warn = message => warnings.push(message);
  foundry.applications.api.DialogV2.wait = async config => {
    const cancel = config.buttons.find(button => button.action === "cancel");
    return (await cancel.callback()) ?? cancel.action;
  };
  await sheet.professionActions.professionAddRecord.call(owner, {}, {dataset:{profession:"alchemy",kind:"project"}});
  assert.deepEqual(a.flags["Immortals-system"].professions, {});
  assert.deepEqual(warnings, []);
});


test("profession workspaces include the public catalog beside private ledgers and independent PC",()=>{
  const a=actor(); a.flags["Immortals-system"].professions.alchemy={level:2}; a.system.cultivation={points:37};
  const c=use("prepareProfessionsContext").call({actor:a,isEditable:true},{},{});
  assert.equal(c.professions.items.find(p=>p.key==="alchemy").level,2);
  assert.equal(c.professions.items.find(p=>p.key==="alchemy").productGroups[0].count,20);
  assert.equal(c.professions.pcAvailable,37); assert.equal(c.professions.toxins.value,0);
  a.limited=true; const limited=sheet.prepareProfessionsContext.call({actor:a,isEditable:false},{},{});
  assert.equal(limited.professions.toxins.hidden,true); assert.equal(limited.professions.pcAvailable,0);
});

test("profession actions expose the native crafting and reference entry points",()=>{
  for(const action of ["professionConfigure","professionCraft","professionOpenProduct","professionRules","professionToxins","professionBeast"])
    assert.equal(typeof sheet.professionActions[action],"function",action);
});
