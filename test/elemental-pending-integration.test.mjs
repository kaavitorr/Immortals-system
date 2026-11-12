import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import Ruleset from '../module/systems/ruleset.mjs';
import {elementalFeatureDocument} from '../module/systems/elemental-content.mjs';
import {prepareElementalActivation,prepareElementalRuntimeUpdates} from '../module/systems/elemental-runtime.mjs';
import {previewElementalWoodHeart} from '../module/systems/elemental-wood-heart.mjs';
import {prepareElementalConstitutionDebt} from '../module/systems/elemental-long-term.mjs';
const S='Immortals-system',user={id:'gm',isGM:true};
globalThis.game={user,settings:{get:()=> '2.0'},time:{worldTime:100},users:{activeGM:user}};
function fixture(element='madeira',ability='coracaoMadeira',tier=1){
 const actor={id:'a',uuid:'Actor.a',type:'character',isOwner:true,itemTypes:{class:[{type:"class",system:{identifier:"cultivador"},getFlag:()=>undefined}],race:[]},flags:{[S]:{}},system:{cultivation:{rank:8,stage:1},elementAbilities:{[element]:{[ability]:tier}},abilities:{con:{value:7}},attributes:{hp:{value:100,max:100}},energy:{max:400,total:399,generated:20},legacy2:{actions:{value:6}}}};
 const item=elementalFeatureDocument(element,ability,tier);Object.assign(item,{id:item._id,actor,isEmbedded:true,isOwner:true});
 const activity=Object.values(item.system.activities)[0];Object.assign(activity,{id:activity._id,item,actor});actor.items=new Map([[item.id,item]]);actor.items.some=predicate=>[...actor.items.values()].some(predicate);
 return{actor,activity,usage:{consume:true,elementalUseContext:{requestId:'paid',sourceActorUuid:actor.uuid}},options:{user,context:{worldTime:100,turn:'Combat.one:1:a',round:1,combatId:'Combat.one'}}};
}
test('Heart activation awaits explicit sacrifice confirmation and includes its debt in the native paid plan',async()=>{
 const f=fixture(),before=structuredClone(f.actor.system);let calls=0;
 const result=await prepareElementalActivation(f.activity,f.usage,{...f.options,confirmWoodHeart:async preview=>{calls++;assert.equal(preview.sacrifice.constitution,1);return true;}});
 assert.equal(calls,1);assert.deepEqual(f.actor.system,before);
 const heart=result.actor['flags.'+S+'.elementalLongTerm.woodHeart'];assert.equal(heart.qiDebt,100);assert.equal(heart.constitutionDebt,1);assert.equal(heart.status,'prepared');
 assert.equal(result.actor['system.energy.total'],300);assert.equal(result.actor['system.energy.generated'],undefined);assert.equal(result.actor['system.abilities.con.value'],undefined);
 assert.equal(result.actor['flags.'+S+'.elementalUseReceipts.paid'].ruleData.sacrifice.constitution,1);
});
test('Heart cancellation and direct unconfirmed plans cannot spend or create a heart',async()=>{
 const f=fixture(),before=structuredClone(f.actor.system);
 await assert.rejects(()=>prepareElementalActivation(f.activity,f.usage,{...f.options,confirmWoodHeart:async()=>false}),/cancelad/i);
 assert.throws(()=>prepareElementalRuntimeUpdates(f.activity,f.usage,f.options),/confirm|prévia/i);assert.deepEqual(f.actor.system,before);assert.deepEqual(f.actor.flags,{[S]:{}});
});
test('Heart maximum debt enters the real character and NPC Qi formula once and releases without refilling balances',()=>{
 for(const type of ['character','npc']){
  const {actor}=fixture();actor.type=type;if(type==='npc')actor.system.legacy2.nd='22';
  const initial=Ruleset.maxEnergy(actor);const preview=previewElementalWoodHeart(actor,{user,worldTime:100});assert.equal(preview.sacrifice.qiMaximum,100);
  actor.flags[S].elementalLongTerm={woodHeart:{qiDebt:100,constitutionDebt:1}};prepareElementalConstitutionDebt(actor);
  assert.equal(Ruleset.maxEnergy(actor),initial-100);assert.equal(Ruleset.maxEnergy(actor),initial-100);
  actor.flags[S].elementalLongTerm.woodHeart.qiDebt=0;assert.equal(Ruleset.maxEnergy(actor),initial);assert.equal(actor.system.energy.total,399);
 }
});
test('paid Mind Break and Double retain exact source token and recognition activation before projection completion',()=>{
 for(const [ability,tier]of [['mindBreak',3],['illusionDouble',1]]){
  const f=fixture('ilusao',ability,tier);f.usage.elementalUseContext.sourceTokenUuid='Scene.one.Token.a';
  f.usage.elementalIllusionRecognition={version:1,id:'paid',sourceActorUuid:f.actor.uuid,decisions:{}};
  const p=prepareElementalRuntimeUpdates(f.activity,f.usage,f.options),state=p.actor['flags.'+S+'.elementalState.'+ability];
  assert.equal(p.completion,'projections');assert.equal(state.useId,'paid');assert.equal(state.sourceTokenUuid,'Scene.one.Token.a');assert.deepEqual(state.recognition,f.usage.elementalIllusionRecognition);
 }
});
test('projection actors cannot recursively create Mind Break, Double or Overlapping Space before payment',()=>{
 for(const [element,ability,tier]of [['ilusao','mindBreak',3],['ilusao','illusionDouble',1],['espaco','overlappingSpace',1]]){
  const f=fixture(element,ability,tier);f.actor.flags[S].elementalProjection={kind:'illusionDouble',sourceActorUuid:'Actor.original'};
  assert.throws(()=>prepareElementalRuntimeUpdates(f.activity,f.usage,f.options),/original|projeção/i);
 }
});
test('the actual native consume cancels Heart without writes and commits its debts and receipt in one batch',async()=>{
 const runtime=await import('../module/systems/elemental-runtime.mjs');
 const {elementalQiPayment}=await import('../module/systems/elemental-vortex.mjs');
 const {prepareElementalAreaLethargy,elementalAreaLethargyEligible}=await import('../module/systems/elemental-area-lethargy.mjs');
 const {withoutEnergyConsumption,energyConsumptionPlan}=await import('../module/applications/activity/legacy2-activation.mjs');
 const method=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8').match(/    async consume\(usageConfig, messageConfig\) \{([\s\S]*?)\n    \}/)[1];
 let confirm=false;const writes=[],warnings=[];globalThis.CONFIG={DND5E:{abilities:{}}};
 globalThis.foundry={utils:{isEmpty:value=>!Object.keys(value).length,setProperty(){}},applications:{api:{DialogV2:{confirm:async()=>confirm}}}};
 const Native=new Function('Ruleset','Hooks','ui','foundry','isElementalActivity','prepareElementalActivation','withElementalActivationLock','markElementalActionsPaid','refreshElementalConsumption','custoEfetivoEmAcoes','prepareElementalAreaLethargy','withoutEnergyConsumption','energyConsumptionPlan','elementalQiPayment','commit','elementalAreaLethargyEligible',
  'return class {async consume(usageConfig,messageConfig){'+method+'}\nasync #applyUsageUpdates(updates){return commit(updates);}}')
  (Ruleset,{call:()=>true},{notifications:{warn:message=>warnings.push(message)}},foundry,runtime.isElementalActivity,prepareElementalActivation,runtime.withElementalActivationLock,runtime.markElementalActionsPaid,runtime.refreshElementalConsumption,a=>Number(a.activation.value)||0,prepareElementalAreaLethargy,withoutEnergyConsumption,energyConsumptionPlan,elementalQiPayment,async updates=>{writes.push(updates);return{};},elementalAreaLethargyEligible);
 const f=fixture(),activity=Object.assign(new Native(),f.activity);activity._prepareUsageUpdates=async()=>({actor:{},activity:{},item:[],rolls:[]});
 assert.equal(await activity.consume(f.usage,{}),false);assert.equal(writes.length,0);assert.match(warnings.at(-1),/cancelad/i);
 confirm=true;await activity.consume(f.usage,{});assert.equal(writes.length,1,warnings.join(" | "));
 assert.equal(writes[0].actor['flags.'+S+'.elementalLongTerm.woodHeart'].constitutionDebt,1);
 assert.equal(writes[0].actor['system.energy.total'],300);assert(writes[0].actor['flags.'+S+'.elementalUseReceipts.paid']);
 assert.equal(runtime.elementalActionsWerePaid(f.usage),true);
});
