import assert from "node:assert/strict";
import {test} from "node:test";
import {elementalConceptActions,prepareElementalConceptsContext} from "../module/applications/actor/jj/elemental-concepts-sheet.mjs";
import {cultivationActions} from "../module/applications/actor/jj/cultivation-sheet.mjs";
let sequence=0;
function setup(rank=1,stage=1){const a={uuid:"cult-"+(++sequence),name:"Lin",isOwner:true,effects:[],system:{cultivation:{rank,stage,essence:100000000,points:99,spentTrainingPoints:0,illumination:3,foundation:{rank,encounters:0,years:0}},legacy2:{wounds:{value:4}},energy:{total:10,generated:100,max:40},attributes:{hp:{value:80,temp:50}},armorPoints:{value:100}},writes:[],async update(patch){this.writes.push(patch);for(const[key,value]of Object.entries(patch)){const parts=key.split("."),last=parts.pop();let obj=this;for(const p of parts)obj=obj[p]??={};obj[last]=structuredClone(value);}},async createEmbeddedDocuments(type,data){this.effects.push(...data);return data;}};
 globalThis.game={user:{isGM:true},settings:{get:()=>"2.0"}};globalThis.ui={notifications:{warn(){}}};
 globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>({pi:0}),confirm:async()=>true}}}};globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};
 globalThis.Roll=class{constructor(formula){this.formula=formula;this.total=formula==="1d20"?1:37;}async evaluate(){return this;}async toMessage(){}};
 return {actor:a,isEditable:true};}
test("native Cancel leaves cultivation, Qi and cultivation credit untouched",async()=>{
 const sheet=setup();foundry.applications.api.DialogV2.wait=async config=>{const cancel=config.buttons.find(button=>button.action==="cancel");return (await cancel.callback())??cancel.action;};
 await cultivationActions.cultivationAdvanceStage.call(sheet);assert.deepEqual(sheet.actor.writes,[]);
});
test("a failed Mar Divino rupture spends cultivation credit once and applies direct tribulation wounds",async()=>{
 const sheet=setup(4,3);await cultivationActions.cultivationBreakthrough.call(sheet);
 assert.equal(sheet.actor.system.cultivation.points,84);assert.equal(sheet.actor.system.legacy2.wounds.value,41);assert.equal(sheet.actor.system.attributes.hp.temp,50);assert.equal(sheet.actor.system.armorPoints.value,100);
 assert.equal(sheet.actor.system.cultivation.persistentInjuries,1);
});
test("only the narrator can record encounters or authorize a free combat advance",async()=>{
 const sheet=setup();assert.equal(typeof cultivationActions.cultivationRecordEncounter,"function");assert.equal(typeof cultivationActions.cultivationAdvanceCombat,"function");
 game.user.isGM=false;await cultivationActions.cultivationRecordEncounter.call(sheet);await cultivationActions.cultivationAdvanceCombat.call(sheet);assert.deepEqual(sheet.actor.writes,[]);
 game.user.isGM=true;await cultivationActions.cultivationRecordEncounter.call(sheet);assert.equal(sheet.actor.system.cultivation.foundation.encounters,1);
 await cultivationActions.cultivationAdvanceCombat.call(sheet);assert.equal(sheet.actor.system.cultivation.points,99);assert.equal(sheet.actor.system.cultivation.stage,2);assert.equal(sheet.actor.system.energy.total,24);
});
test("losing edit permission while the advancement dialog is open never debits cultivation credit",async()=>{
 const sheet=setup();foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.isOwner=false;return{pi:0};};await cultivationActions.cultivationAdvanceStage.call(sheet);assert.deepEqual(sheet.actor.writes,[]);
});

test("Entendimento can fund an elemental training with no cultivation credit and debits Qi/PI only once",async()=>{
 const sheet=setup();sheet.actor.system.cultivation.rank=2;sheet.actor.system.cultivation.points=0;sheet.actor.system.cultivation.illumination=1;sheet.actor.system.conceitos={};sheet.actor.system.energy.total=100;
 foundry.applications.api.DialogV2.wait=async()=>({pi:1});sheet.actor.rollSkill=async()=>[{total:20}];
 const context=prepareElementalConceptsContext.call(sheet,{});assert.equal(context.elemental.groups[0].elements.find(element=>element.id==="fogo").canTrain,true);
 await elementalConceptActions.trainElementalConcept.call(sheet,{}, {dataset:{element:"fogo"}});assert.equal(sheet.actor.system.conceitos.fogo.level,0);assert.equal(sheet.actor.flags["Immortals-system"].elementalTrainingJobs.fogo.totalDays,3);assert.equal(sheet.actor.flags["Immortals-system"].elementalTrainingJobs.fogo.remainingDays,2);
 assert.equal(sheet.actor.system.cultivation.points,0);assert.equal(sheet.actor.system.energy.generated,85);assert.equal(sheet.actor.system.energy.total,100);assert.equal(sheet.actor.system.cultivation.illumination,0);
});
