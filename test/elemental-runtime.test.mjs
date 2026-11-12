import {elementalAreaLethargyEligible,prepareElementalAreaLethargy} from '../module/systems/elemental-area-lethargy.mjs';
import {elementalQiPayment} from '../module/systems/elemental-vortex.mjs';
import assert from 'node:assert/strict';
import {previewElementalSacrifice} from '../module/systems/elemental-long-term.mjs';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {elementalFeatureDocument} from '../module/systems/elemental-content.mjs';
let runtime={};try{runtime=await import('../module/systems/elemental-runtime.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const api=key=>{assert.equal(typeof runtime[key],'function');return runtime[key];};
const scope='Immortals-system';
function fixture(element,ability,tier=1,key,extra={}){
 const actor={id:'actor',uuid:'Actor.actor',type:'character',isOwner:true,flags:{[scope]:{}},system:{elementAbilities:{[element]:{[ability]:tier}},conceitos:{vento:{level:7}},cultivation:{rank:8},armorPoints:{value:3},legacy2:{actions:{value:6,max:6}},attributes:{hp:{value:20},death:{success:0,failure:0}},energy:{total:100,generated:100}},...extra};
 const item=elementalFeatureDocument(element,ability,tier);item.id=item._id;item.actor=actor;item.isEmbedded=true;item.isOwner=true;
 const activity=Object.values(item.system.activities).find(a=>a.flags[scope].elementalActivity.key===key)??Object.values(item.system.activities)[0];activity.id=activity._id;activity.item=item;activity.actor=actor;
 actor.items=new Map([[item.id,item]]);
 return {actor,item,activity,usage:{consume:true,scaling:0,...(activity.type==='teleport'?{elementalUseContext:{requestId:'testCredit',sourceTokenUuid:'Scene.one.Token.self'}}:{})},options:{context:{turn:'Combat.one:1:self',combatId:'Combat.one',round:1,worldTime:1000},user:{isGM:false}}};
}
const plan=f=>api('prepareElementalRuntimeUpdates')(f.activity,f.usage,{...f.options,actor:f.actor,actionCost:f.activity.activation.value});
const flag=(updates,key)=>updates.actor['flags.'+scope+'.elementalState.'+key];

test('finite wood barrier and armor are granted in the same action update without a second Qi debit',()=>{
 const b=fixture('madeira','vitalidadeCrescente',1,'barrier');b.options.rollTotal=23;const result=plan(b);assert.equal(flag(result,'barrier').value,23);assert.equal(flag(result,'barrier').expires,'turnStart');assert.equal(result.actor['system.legacy2.actions.value'],5);assert(!Object.keys(result.actor).some(k=>k.startsWith('system.energy.')));
 const p=fixture('madeira','vitalidadeCrescente',3,'barrier');p.usage.scaling=14;assert.equal(flag(plan(p),'barrier').value,120);
 const armor=fixture('terra','pelePedra',2,'armor');armor.usage.scaling=9;assert.equal(plan(armor).actor['system.armorPoints.value'],43);
});

test('Self Haste grants temporary current actions, tracks their spending, and expires only later',()=>{
 const f=fixture('tempo','selfHaste',3,'haste'),result=plan(f);assert.equal(result.actor['system.legacy2.actions.value'],9);assert.equal(flag(result,'haste').remaining,3);assert(!Object.keys(result.actor).some(k=>k.endsWith('actions.max')));
 f.actor.system.legacy2.actions.value=9;f.actor.flags[scope].elementalState={haste:flag(result,'haste')};
 const spend=api('elementalActionSpendUpdates')(f.actor,2);assert.equal(spend['system.legacy2.actions.value'],7);assert.equal(spend['flags.'+scope+'.elementalState.haste.remaining'],1);
 assert.deepEqual(api('elementalTurnUpdates')(f.actor,{turn:f.options.context.turn,phase:'start',worldTime:1000}),{});
 const expired=api('elementalTurnUpdates')(f.actor,{turn:'Combat.one:2:self',phase:'start',worldTime:1006});assert.equal(expired['system.legacy2.actions.value'],6);assert.equal(expired['flags.'+scope+'.elementalState.-=haste'],null);
});
test('Self Haste rejects a repeat before any new payment after its bonus actions have all been consumed',()=>{
 for(let tier=1;tier<=3;tier++){
  const f=fixture('tempo','selfHaste',tier,'haste'),first=plan(f);
  f.actor.flags[scope].elementalState={haste:{...flag(first,'haste'),remaining:0}};
  const before=structuredClone(f.actor.system);
  assert.throws(()=>plan(f),/uma vez por turno/);
  assert.deepEqual(f.actor.system,before);
  f.options.context={...f.options.context,turn:'Combat.one:2:self',round:2};
  assert.doesNotThrow(()=>plan(f));
 }
});

test('native active modes populate typed state with duration and current source',()=>{
 for(const [element,ability,tier,key,state] of [['vento','barreiraVento',2,'barrier','windBarrier'],['agua','corpoFluido',1,'fluid','bodyFluid'],['ilusao','mindBreak',2,'mind','mindBreak'],['escuridao','darknessCloak',3,'cloak','darknessCloak']]){
  const f=fixture(element,ability,tier,key),entry=flag(plan(f),state);assert(entry);assert.equal(entry.source.abilityId,ability);assert.equal(entry.source.activityId,f.activity.id);assert.equal(entry.turn,'Combat.one:1:self');
 }
 const vision=fixture('luz','visaoAlcance',3,'vision');assert.equal(flag(plan(vision),'divineSense').multiplier,10);assert.equal(flag(plan(vision),'divineSense').expiresAt,4600);
 const clones=fixture('vento','controleVento',3,'clones');assert.equal(flag(plan(clones),'windClones').remaining,7);assert.equal(flag(plan(clones),'windClones').maximumArmorClass,30);
});

test('elemental activation rejects stale tiers, missing ownership and resource opt-outs',()=>{
 const f=fixture('tempo','selfHaste',2,'haste');f.actor.system.elementAbilities.tempo.selfHaste=1;assert.throws(()=>plan(f),/grau|forma|tier/i);
 f.actor.system.elementAbilities.tempo.selfHaste=0;assert.throws(()=>plan(f),/aprendida|conhecida/i);
 f.actor.system.elementAbilities.tempo.selfHaste=2;f.actor.isOwner=false;assert.throws(()=>plan(f),/permiss|control/i);
 f.actor.isOwner=true;f.usage.consume=false;assert.throws(()=>plan(f),/consumo|recurso/i);
 f.usage.consume={resources:[]};assert.throws(()=>plan(f),/consumo|recurso/i);
 f.usage.consume=true;f.usage.scaling=0.5;assert.throws(()=>plan(f),/escala/i);
 const barrier=fixture('madeira','vitalidadeCrescente',2,'barrier');barrier.usage.scaling=6;assert.throws(()=>plan(barrier),/limite|escala/i);
 const cloak=fixture('escuridao','darknessCloak',1,'cloak');cloak.actor.system.legacy2.actions.value=1;assert.throws(()=>plan(cloak),/Ação|ações/i);
});

test('Self Haste and Overlapping Space block each other for their active turn',()=>{
 const f=fixture('tempo','selfHaste',1,'haste');f.actor.flags[scope].elementalState={overlappingSpace:{turn:f.options.context.turn,active:true}};assert.throws(()=>plan(f),/Overlapping|incompat/i);
 const copies=fixture('espaco','overlappingSpace',2,'copies');copies.actor.flags[scope].elementalState={haste:{remaining:1,turn:copies.options.context.turn}};assert.throws(()=>plan(copies),/Self Haste|incompat/i);
});

test('stabilization requires one known, permitted living target at zero hit points',()=>{
 const f=fixture('luz','toqueCurativo',1,'stabilize');assert.throws(()=>plan(f),/alvo|criatura/i);
 const target={id:'target',uuid:'Actor.target',type:'npc',isOwner:true,system:{attributes:{hp:{value:0},death:{success:0,failure:2}}}};f.options.targets=[{actor:target}];const result=plan(f);assert.equal(result.operations.length,1);assert.equal(result.operations[0].updates[0]['system.attributes.death.success'],3);assert.equal(result.operations[0].updates[0]['system.attributes.death.failure'],0);
 target.isOwner=false;const pending=plan(f);assert.equal(pending.completion,'stabilize');assert.equal(pending.operations.length,0);target.isOwner=true;target.system.attributes.hp.value=1;assert.throws(()=>plan(f),/0|zero/);
});

test('Space Step and Light Flash record limits without duplicating native charges',()=>{
 const f=fixture('espaco','spaceStep',1,'teleport'),result=plan(f);f.actor.flags[scope].elementalState={receipts:flag(result,'receipts')};assert.throws(()=>plan(f),/turno/);
 f.options.context.turn='Combat.one:2:self';assert.doesNotThrow(()=>plan(f));
 const flash=fixture('luz','lightOrbs',1,'flash'),r=plan(flash);flash.actor.flags[scope].elementalState={receipts:flag(r,'receipts')};flash.options.context.turn='Combat.one:1:other';assert.throws(()=>plan(flash),/rodada/);
 const manual=fixture('espaco','mysticalRealm',1,'realm');assert.throws(()=>plan(manual),/prévia/);
});

test('world-time expiry and cooldowns use recorded time rather than changing normal maxima',()=>{
 const f=fixture('tempo','rewind',1,'rewind');f.usage.elementalUseContext={requestId:'cooldownUse',sourceActorUuid:f.actor.uuid};f.options.rewindPreview={available:true,at:-2600,pending:[],state:{meta:{schemaVersion:2,complete:true},resources:{qiTotal:100},uses:{},body:{},inventory:{},effects:{}}};const r=plan(f);f.actor.flags[scope].elementalState={cooldowns:flag(r,'cooldowns')};assert.throws(()=>plan(f),/dias|aguard|disponível/i);
 f.options.context.worldTime+=30*86400;assert.doesNotThrow(()=>plan(f));
 const vision=fixture('luz','visaoAlcance',1,'vision');vision.actor.flags[scope].elementalState={divineSense:flag(plan(vision),'divineSense')};assert.equal(api('elementalTurnUpdates')(vision.actor,{worldTime:1600})['flags.'+scope+'.elementalState.-=divineSense'],null);
});

test('the asynchronous activation preparation awaits dice before returning any mutation',async()=>{
 const f=fixture('madeira','vitalidadeCrescente',1,'barrier');let release;const waited=new Promise(resolve=>release=resolve);let returned=false;
 const p=api('prepareElementalActivation')(f.activity,f.usage,{...f.options,actionCost:1,rollFormula:async()=>{await waited;return {total:27};}}).then(result=>{returned=true;return result;});
 await Promise.resolve();assert.equal(returned,false);release();const r=await p;assert.equal(flag(r,'barrier').value,27);
});

test('per-actor activation locks reject duplicate clicks and serialize different costs',async()=>{
 const f=fixture('tempo','selfHaste',1,'haste');let release;const pending=new Promise(resolve=>release=resolve),order=[];
 const run=api('withElementalActivationLock');const first=run(f.activity,async()=>{order.push('first');await pending;order.push('paid');return true;});await Promise.resolve();
 assert.equal(await run(f.activity,()=>assert.fail('duplicate activation')),false);
 const secondActivity={...f.activity,id:'different'},second=run(secondActivity,async()=>{order.push('second');return true;});await Promise.resolve();assert(!order.includes('second'));release();assert.equal(await first,true);assert.equal(await second,true);assert.deepEqual(order,['first','paid','second']);
});

test('native consumption awaits elemental actor updates and the action hook honors only a committed receipt',()=>{
 const mixin=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8');assert.match(mixin,/withElementalActivationLock/);assert.match(mixin,/await prepareElementalActivation/);assert(mixin.indexOf('elementalActionsPaid = true')>mixin.indexOf('await this.#applyUsageUpdates(updates)'));
 const actions=readFileSync(new URL('../module/systems/acoes-combate.mjs',import.meta.url),'utf8');assert.match(actions,/elementalActionsPaid/);assert.match(actions,/elementalActionSpendUpdates/);
});


test('action-payment receipts cannot be forged by an incoming usage option',()=>{
 const config={elementalActionsPaid:true};assert.equal(api('elementalActionsWerePaid')(config),false);api('markElementalActionsPaid')(config);assert.equal(api('elementalActionsWerePaid')(config),true);
});

test('temporary actions are excluded from reserves while remaining available for reactions',()=>{
 const f=fixture('tempo','selfHaste',2,'haste');f.actor.system.legacy2.actions.value=7;f.actor.flags[scope].elementalState={haste:{remaining:2,turn:f.options.context.turn}};
 assert.equal(api('elementalReserveActionValue')(f.actor),5);assert.equal(f.actor.system.legacy2.actions.value,7);
});

test('the actual native consume method awaits one bulk write containing resources and elemental effects',async()=>{
 const source=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8');const method=source.match(/    async consume\(usageConfig, messageConfig\) \{([\s\S]*?)\n    \}/)[1];
 const {isElementalActivity,prepareElementalActivation,withElementalActivationLock,markElementalActionsPaid,refreshElementalConsumption}=runtime;
 const writes=[];let release;const pending=new Promise(resolve=>release=resolve);
 const Hooks={call:()=>true},Ruleset={isV2:()=>true},ui={notifications:{warn:message=>{throw Error(message);}}};
 const foundry={utils:{isEmpty:object=>!Object.keys(object).length,setProperty:()=>{}}};
 const Native=new Function('elementalAreaLethargyEligible','prepareElementalAreaLethargy','elementalQiPayment','Hooks','Ruleset','ui','foundry','isElementalActivity','prepareElementalActivation','withElementalActivationLock','markElementalActionsPaid','refreshElementalConsumption','custoEfetivoEmAcoes','withoutEnergyConsumption','energyConsumptionPlan','commit', 'return class Native {async consume(usageConfig,messageConfig){'+method+'}\nasync #applyUsageUpdates(updates){return commit(updates);}}')(elementalAreaLethargyEligible,prepareElementalAreaLethargy,elementalQiPayment,Hooks,Ruleset,ui,foundry,isElementalActivity,prepareElementalActivation,withElementalActivationLock,markElementalActionsPaid,refreshElementalConsumption,()=>1,(a,c)=>c,a=>({payer:a.actor,updates:{'system.energy.total':94}}),async updates=>{writes.push(updates);await pending;return {};});
 const f=fixture('madeira','vitalidadeCrescente',2,'barrier');f.usage.scaling=5;const live=Object.assign(new Native(),f.activity);live._prepareUsageUpdates=async()=>({actor:{},activity:{},item:[],rolls:[]});
 let complete=false;const result=live.consume(f.usage,{}).then(r=>{complete=true;return r;});
 await new Promise(resolve=>setTimeout(resolve,0));assert.equal(complete,false);assert.equal(writes.length,1);assert.equal(writes[0].actor['system.energy.total'],94);assert.equal(writes[0].actor['system.legacy2.actions.value'],5);assert.equal(flag(writes[0],'barrier').value,48);assert.equal(api('elementalActionsWerePaid')(f.usage),false);
 release();await result;assert.equal(api('elementalActionsWerePaid')(f.usage),true);
});


test('queued orb follow-ups refresh their live counter before preparing native consumption',()=>{
 const f=fixture('luz','lightOrbs',1,'blast'),live={system:{uses:{spent:2},activities:new Map([[f.activity.id,{uses:{spent:0}}]])}};f.actor.items.set(f.item.id,live);
 f.item.updateSource=update=>{f.item.system.uses.spent=update['system.uses.spent'];};f.activity.updateSource=update=>{f.activity.uses.spent=update['uses.spent'];};
 api('refreshElementalConsumption')(f.activity);assert.equal(f.item.system.uses.spent,2);
 const mixin=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8');assert(mixin.indexOf('refreshElementalConsumption(this)')<mixin.indexOf('const updates = await this._prepareUsageUpdates'));
});

test('native numeric-only refunds do not leave elemental state active for free',()=>{
 const source=readFileSync(new URL('../module/documents/activity/mixin.mjs',import.meta.url),'utf8');
 const refund=source.match(/async refund\(consumed\) \{([\s\S]*?)\n    \}/)[1];assert.match(refund,/isElementalActivity\(this\)/);
 const hide=source.match(/shouldHideChatButton\(button, message\) \{([\s\S]*?)\n    \}/)[1];assert.match(hide,/isElementalActivity\(this\)/);assert.match(hide,/refundResource/);
});


test('paid sustained states default to refined Qi after the clarified pool ruling',()=>{
 for(const [element,ability,key,state] of [['agua','corpoFluido','fluid','bodyFluid'],['ilusao','illusionDouble','double','illusionDouble']]){
  const f=fixture(element,ability,1,key);assert.equal(flag(plan(f),state).pool,'generated');
  f.activity.consumption.targets=[];assert.equal(flag(plan(f),state).pool,'generated');
 }
});


test('Qi Vibrante healing requires exactly one known target above zero HP',()=>{
 const f=fixture('madeira','qiVibrante',2,'heal');assert.throws(()=>plan(f),/alvo|criatura/i);
 const target={actor:{type:'npc',system:{attributes:{hp:{value:0}}}}};f.options.targets=[target];assert.throws(()=>plan(f),/0|zero|vida/i);target.actor.system.attributes.hp.value=1;assert.doesNotThrow(()=>plan(f));
 f.options.targets=[target,target];assert.throws(()=>plan(f),/uma|exatamente/i);
});

test('Mystical Realm requires Imperador Sagrado and an explicit sacrifice preview',()=>{
 const f=fixture('espaco','mysticalRealm',1,'realm');f.actor.system.cultivation={rank:7};assert.throws(()=>plan(f),/Imperador Sagrado/);f.actor.system.cultivation.rank=8;assert.throws(()=>plan(f),/prévia/);
 f.usage.elementalUseContext={requestId:'realmCredit'};f.options.sacrificePreview=previewElementalSacrifice(f.actor,'mysticalRealm');assert.equal(plan(f).actor['system.cultivation.rank'],7);assert.equal(plan(f).actor['system.cultivation.stage'],2);
 f.actor.type='npc';f.actor.flags[scope].cultivationRank=7;assert.throws(()=>plan(f),/Imperador Sagrado/);f.actor.flags[scope].cultivationRank=8;f.options.sacrificePreview=previewElementalSacrifice(f.actor,'mysticalRealm');assert.equal(plan(f).actor['system.legacy2.nd'],'20');
});

test('Eternal Prison initializes a paid tracker and rejects extra maintenance after 500 Qi',()=>{
 const f=fixture('gelo','eternalPrison',1,'prison'),entry=flag(plan(f),'eternalPrison');assert.equal(entry.investedQi,20);assert.equal(entry.pool,'generated');assert.equal(entry.upkeepTurn,f.options.context.turn);assert.equal(entry.eternal,false);
 const upkeep=fixture('gelo','eternalPrison',1,'maintain');upkeep.actor.flags[scope].elementalState={eternalPrison:{...entry,investedQi:480,upkeepTurn:'old'}};const permanent=flag(plan(upkeep),'eternalPrison');assert.equal(permanent.investedQi,500);assert.equal(permanent.eternal,true);upkeep.actor.flags[scope].elementalState.eternalPrison=permanent;assert.throws(()=>plan(upkeep),/eterna|500/);
});

test('author-confirmed whip and cloak last one and ten minutes, while Space Step replaces its bank',()=>{const whip=fixture('agua','qiFluido',2,'whip');assert.equal(flag(plan(whip),'waterWhip').expiresAt,1060);const cloak=fixture('escuridao','darknessCloak',3,'cloak');assert.equal(flag(plan(cloak),'darknessCloak').expiresAt,1600);const space=fixture('espaco','spaceStep',3,'advantages');space.actor.flags[scope].elementalState={spaceAdvantages:{remaining:2},receipts:{paid:{key:'teleport',turn:'Combat.one:1:self',source:{abilityId:'spaceStep'}}}};const extra=plan(space);assert.equal(flag(extra,'spaceAdvantages').remaining,4);});
test('Mind Break persists with two refined Qi upkeep instead of silently ending each turn',()=>{const f=fixture('ilusao','mindBreak',3,'mind');const state=flag(plan(f),'mindBreak');assert.equal(state.expires,undefined);assert.equal(state.upkeepQi,2);assert.equal(state.upkeepTurn,'Combat.one:1:self');});

test('Absorption healing requires a recorded hit and exactly the same paid Qi investment',()=>{const attack=fixture('escuridao','absorcao',2,'attack');attack.usage.scaling=3;const initial=plan(attack),healing=fixture('escuridao','absorcao',2,'heal');healing.actor.flags[scope].elementalState={receipts:flag(initial,'receipts')};healing.usage.scaling=3;assert.throws(()=>plan(healing),/acerto/);const receipt=healing.actor.flags[scope].elementalState.receipts[attack.activity.id];receipt.attackHit=true;receipt.attackMessageUuid='ChatMessage.confirmed';const granted=plan(healing);assert(granted);healing.usage.scaling=2;assert.throws(()=>plan(healing),/mesmo Qi/);});

test('Realm native preparation waits for confirmation and cancels before any sacrifice or payment',async()=>{const f=fixture('espaco','mysticalRealm',1,'realm');f.usage.elementalUseContext={requestId:'confirmedRealm'};const before=structuredClone(f.actor.system);await assert.rejects(()=>api('prepareElementalActivation')(f.activity,f.usage,{...f.options,confirmSacrifice:async()=>false}),/cancelada/);assert.deepEqual(f.actor.system,before);const result=await api('prepareElementalActivation')(f.activity,f.usage,{...f.options,confirmSacrifice:async preview=>preview.before.level===22});assert.equal(result.actor['system.cultivation.rank'],7);assert.equal(result.actor['system.cultivation.stage'],2);assert.deepEqual(f.actor.system,before);});

test('Earth Prison save requires the same target and a recorded successful paid attack',()=>{const attack=fixture('terra','prisaoTerra',1,'attack'),original=flag(plan(attack),'receipts'),save=fixture('terra','prisaoTerra',1,'save');save.actor.flags[scope].elementalState={receipts:original};save.usage.elementalUseContext={requestId:'prisonSave',targetUuids:['Actor.enemy']};assert.throws(()=>plan(save),/acerto/);const receipt=save.actor.flags[scope].elementalState.receipts[attack.activity.id];receipt.attackMessageUuid='ChatMessage.attack';receipt.attackTargets=[{actor:'Actor.enemy',hit:false}];assert.throws(()=>plan(save),/acerto/);receipt.attackTargets[0].hit=true;save.usage.elementalUseContext.targetUuids=['Actor.decoy'];assert.throws(()=>plan(save),/alvo/);save.usage.elementalUseContext.targetUuids=['Actor.enemy'];assert.equal(plan(save).completion,'earthPrison');});
test('Slow/Quick records the paid direction and factor with a ten-minute duration for GM membership review',()=>{const f=fixture('tempo','slowQuickZone',2,'zone');f.usage.elementalUseContext={requestId:'zonePaid',sourceActorUuid:f.actor.uuid,targetUuids:['Actor.target']};f.usage.elementalDilation={direction:'quick',multiplier:5};const p=plan(f);assert.equal(p.completion,'timeZone');const record=Object.values(p.actor).find(value=>value?.kind==='timeDilation');assert.equal(record.multiplier,5);assert.equal(record.direction,'quick');assert.equal(record.expiresAt,1600);f.usage.elementalDilation.multiplier=6;assert.throws(()=>plan(f),/custo|pago/);});
test('Mass Recovery confirms its Constitution debt before paying and cancels without changes',async()=>{const f=fixture('luz','recuperacaoMassa',1,'heal');f.actor.system.abilities={con:{value:3}};f.usage.elementalUseContext={requestId:'massUse',sourceActorUuid:f.actor.uuid,targetUuids:[]};await assert.rejects(()=>api('prepareElementalActivation')(f.activity,f.usage,{...f.options,confirmSacrifice:async()=>false}),/cancelada/);assert.equal(f.actor.flags[scope].elementalLongTerm,undefined);const p=await api('prepareElementalActivation')(f.activity,f.usage,{...f.options,confirmSacrifice:async()=>true});assert.equal(p.actor['flags.'+scope+'.elementalLongTerm.massRecovery.debt'],1);assert.equal(p.actor['system.abilities.con.value'],undefined);});
test('replaying the same recorded elemental activation cannot charge resources or debt twice',()=>{const f=fixture('madeira','vitalidadeCrescente',2,'barrier');f.usage.elementalUseContext={requestId:'paidOnce',sourceActorUuid:f.actor.uuid};f.actor.flags[scope].elementalUseReceipts={paidOnce:{requestId:'paidOnce',source:{activityId:f.activity.id}}};assert.throws(()=>plan(f),/já.*aplicada|já.*concluída/);});
test('Rewind refuses missing history before paying its native total Qi and actions',async()=>{const f=fixture('tempo','rewind',1,'rewind');f.usage.elementalUseContext={requestId:'rewindUse',sourceActorUuid:f.actor.uuid};await assert.rejects(()=>api('prepareElementalActivation')(f.activity,f.usage,f.options),/histórico/);assert.equal(f.actor.system.energy.total,100);assert.equal(f.actor.system.legacy2.actions.value,6);assert.equal(f.activity.consumption.targets.find(t=>t.type==='attribute').target,'energy.total');});
test('Absorption follow-up selects its exact paid hit and consumes only that parent receipt',()=>{const f=fixture('escuridao','absorcao',2,'heal'),paidBy=f.activity.flags[scope].elementalActivity.paidBy;f.actor.flags[scope].elementalState={receipts:{[paidBy]:{requestId:'second',turn:f.options.context.turn,qiSpent:5,attackHit:true,attackMessageUuid:'ChatMessage.second',source:{itemId:f.item.id,activityId:paidBy}}}};f.actor.flags[scope].elementalUseReceipts={first:{requestId:'first',turn:f.options.context.turn,qiSpent:2,attackHit:true,attackMessageUuid:'ChatMessage.first',source:{itemId:f.item.id,activityId:paidBy}}};f.usage.elementalParentUseId='first';f.usage.scaling=1;const p=plan(f);assert.deepEqual(p.actor['flags.'+scope+'.elementalUseReceipts.first'].followUps,[f.activity.id]);assert.equal(flag(p,'receipts')[paidBy].requestId,'second');assert.equal(flag(p,'receipts')[paidBy].followUps,undefined);});

test('repeated Haste is forbidden and unconfirmed Heart never pays costs',()=>{const h=fixture('tempo','selfHaste',1,'haste');h.actor.flags[scope].elementalState={haste:{turn:h.options.context.turn,remaining:0}};assert.throws(()=>plan(h),/uma vez por turno/);const heart=fixture('madeira','coracaoMadeira',1,'heart');assert.throws(()=>plan(heart),/confirme.*prévia/i);});
