import assert from 'node:assert/strict';
import {test} from 'node:test';
let content={},activities={};try{content=await import('../module/systems/qi-talents-content.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}try{activities=await import('../module/systems/qi-talents-activities.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const scope='Immortals-system',call=(object,key,...args)=>{assert.equal(typeof object[key],'function',key+' must be available');return object[key](...args);};
const native=id=>call(activities,'qiTalentNativeData',id);
const byKey=(data,key)=>{const activity=Object.values(data.activities).find(a=>a.flags[scope].qiTalentActivity.key===key);assert(activity,'missing '+key);return activity;};
const qiCost=a=>a.consumption.targets.filter(t=>t.type==='attribute'&&t.target==='energy.generated');

test('the public native catalog contains four categories and 67 distinct usable or passive talent feats',()=>{
 const docs=call(content,'qiTalentCompendiumDocuments');assert.equal(docs.length,72);const folders=docs.filter(d=>d.type==='Item'),feats=docs.filter(d=>d.type==='feat');assert.equal(folders.length,5);assert.equal(feats.length,67);assert.equal(new Set(docs.map(d=>d._id)).size,72);
 const root=folders.find(f=>f.folder===null);assert.equal(root.name,'Talentos de Qi');assert.equal(folders.filter(f=>f.folder===root._id).length,4);
 for(const feat of feats){assert.match(feat._id,/^[a-f0-9]{16}$/);assert(folders.some(f=>f._id===feat.folder));assert(feat.flags[scope].talentoQi.id);assert(feat.system.description.value.length>100);assert(!/[⬢★]/u.test(feat.system.description.value));for(const a of Object.values(feat.system.activities)){assert.match(a._id,/^[a-f0-9]{16}$/);assert.equal(a._id,Object.entries(feat.system.activities).find(([,v])=>v===a)[0]);assert(a.description.value.length>100);assert.equal(a.consumption.spellSlot,false);assert(!a.consumption.targets.some(t=>t.target==='legacy2.actions.value'),'activation PA must not also be native consumption');}}
 const first=call(content,'qiTalentDocument','canalizacao-de-combate');first.system.activities={};assert.equal(Object.keys(call(content,'qiTalentDocument','canalizacao-de-combate').system.activities).length,2);assert.throws(()=>call(content,'qiTalentDocument','not-a-talent'),RangeError);
});

test('combat channeling uses the authored four d8 and distinct Qi and action costs with a cultivation dice ceiling',()=>{
 const data=native('canalizacao-de-combate'),attack=byKey(data,'burst'),shield=byKey(data,'solid-defense');assert.equal(attack.type,'attack');assert.equal(attack.activation.value,3);assert.deepEqual(qiCost(attack).map(t=>t.value),['4']);assert.equal(attack.damage.parts[0].number,4);assert.equal(attack.damage.parts[0].denomination,8);assert.deepEqual(attack.damage.parts[0].types,['bludgeoning','slashing','piercing']);assert.equal(attack.consumption.scaling.max,'max(1, @nivelCultivo - 3)');
 assert.equal(shield.type,'reduction');assert.equal(shield.reduction.formula,'4d8');assert.equal(shield.activation.value,2);assert.deepEqual(qiCost(shield).map(t=>t.value),['4']);assert.equal(shield.flags[scope].qiTalentActivity.singleAttackOnly,true);assert.equal(shield.flags[scope].qiTalentActivity.maxDiceFormula,'@nivelCultivo');
});

test('Qi message offers separately paid one-message and five-minute conversation modes in meters',()=>{
 const data=native('mensagem-de-qi'),message=byKey(data,'message'),talk=byKey(data,'conversation');assert.equal(message.range.value,'10 + 5 * @nivelCultivo');assert.equal(message.range.units,'m');assert.equal(message.target.affects.type,'creature');assert.equal(message.target.affects.count,'1');assert.deepEqual(qiCost(message).map(t=>t.value),['1']);assert.equal(message.activation.value,0);assert.deepEqual(qiCost(talk).map(t=>t.value),['10']);assert.equal(talk.duration.value,'5');assert.equal(talk.duration.units,'minute');
});

test('levitation and stable flight each pay activation once and keep refined-Qi upkeep explicit',()=>{
 const levitation=byKey(native('levitacao-de-qi'),'levitate'),flight=byKey(native('voo-estavel'),'fly');assert.deepEqual(qiCost(levitation).map(t=>t.value),['4']);assert.deepEqual(levitation.constantCost,{enabled:true,value:'4',pool:'generated',concentration:false});assert.deepEqual(qiCost(flight).map(t=>t.value),['1']);assert.equal(flight.constantCost.value,'1');assert.equal(flight.flags[scope].qiTalentActivity.outOfCombatPeriodSeconds,300);
});

test('gesture variants retain the exact manifestation geometry and charge only the added modification',()=>{
 const arrows=native('gestos-flecha-e-linha'),cones=native('gestos-cone-e-leque'),areas=native('gestos-raio-e-emanacao');assert.equal(Object.keys(arrows.activities).length,6);
 const line=byKey(arrows,'line-2');assert.equal(line.activation.value,1);assert.deepEqual(qiCost(line).map(t=>t.value),['2']);assert.equal(line.range.value,'25');assert.equal(line.target.template.width,'1.5');assert.equal(line.target.template.size,'25');assert.equal(line.flags[scope].qiTalentActivity.damageDie,8);
 assert.equal(byKey(cones,'fan-3').target.template.size,'18');assert.equal(byKey(cones,'cone-3').target.template.size,'30');assert.equal(byKey(cones,'fan-1').flags[scope].qiTalentActivity.angle,180);assert.equal(byKey(cones,'cone-1').flags[scope].qiTalentActivity.angle,55);
 const radius=byKey(areas,'radius-2');assert.equal(radius.range.value,'25');assert.equal(radius.target.template.size,'10');assert.equal(byKey(areas,'emanation-3').target.template.size,'15');assert.equal(radius.flags[scope].qiTalentActivity.modifiesExistingTechnique,true);
});

test('soul protection grants only scalable temporary HP and records its start-of-day limitation',()=>{
 const a=byKey(native('protecao-da-alma'),'protect');assert.equal(a.type,'heal');assert.equal(a.healing.custom.formula,'5 * @scaling');assert.deepEqual(a.healing.types,['temphp']);assert.equal(a.consumption.scaling.max,'@nivelCultivo');assert.deepEqual(qiCost(a).map(t=>[t.value,t.scaling.formula]),[['2','2']]);assert.equal(a.uses.max,'1');assert.equal(a.uses.recovery[0].period,'day');assert(a.consumption.targets.some(t=>t.type==='activityUses'&&t.value==='1'));
});

test('single-hit damage negation has one long-rest counter and cannot become free repeatable damage',()=>{
 const a=byKey(native('corpo-indestrutivel'),'negate');assert.equal(a.type,'reduction');assert.equal(a.reduction.formula,'160');assert.equal(a.uses.max,'1');assert.equal(a.uses.recovery[0].period,'lr');assert.equal(a.flags[scope].qiTalentActivity.singleAttackOnly,true);
 for(const id of ['punho-devastador','ataque-potencializado','fonte-de-poder','intencao-belica'])assert(!Object.values(native(id).activities).some(a=>['damage','attack'].includes(a.type)),id+' must modify the actual triggering attack');
});

test('ambiguous PE and spiritual PA costs are visibly pending and blocked before any resource consumption',()=>{
 for(const [id,key]of [['evasao-de-contra-ataque','counterattack'],['corpo-perfeito','haste'],['pressao-espiritual','pressure'],['agressao-da-alma','aggression']]){const a=byKey(native(id),key);assert(a.flags[scope].qiTalentActivity.pendingCost);const result=call(activities,'prepareQiTalentUse',a,{actor:{system:{energy:{generated:99}}}});assert.equal(result.ok,false);assert.match(result.reason,/custo|reserva/i);assert.equal(a.consumption.targets.filter(t=>t.type==='attribute').length,0);}
});

test('the guard accepts paid narrative actions but rejects absent resource pools and over-level channeling',()=>{
 const a=byKey(native('clone-elemental'),'clone');assert.equal(call(activities,'prepareQiTalentUse',a,{actor:{system:{energy:{generated:30}}}}).ok,true);assert.equal(call(activities,'prepareQiTalentUse',a,{actor:{system:{energy:{total:30}}}}).ok,false);
 const reduction=byKey(native('canalizacao-de-combate'),'solid-defense');assert.equal(call(activities,'prepareQiTalentUse',reduction,{level:5,usageConfig:{legacy2:{scale:1}},actor:{system:{energy:{generated:9}}}}).ok,true);assert.equal(call(activities,'prepareQiTalentUse',reduction,{level:5,usageConfig:{legacy2:{scale:2}},actor:{system:{energy:{generated:9}}}}).ok,false);
});

test('sacrifices, avatars and execution rules remain explicit manual boundaries rather than invented mutations',()=>{
 for(const id of ['estimulo-de-sangue','encarnacao-de-cultivo','criacao-de-corpo-fisico','detonacao-da-alma','lanca-destruidora']){const data=native(id);assert(data.manual.length>0,id);assert.deepEqual(data.effects,[]);assert(!Object.values(data.activities).some(a=>a.consumption.targets.some(t=>/abilities|cultivation|hp/.test(t.target))));}
});

test('the guard treats native scaling as zero-based added dice and rejects missing numeric pools',()=>{
 const attack=byKey(native('canalizacao-de-combate'),'burst'),actor={system:{energy:{generated:12}}};
 assert.equal(call(activities,'prepareQiTalentUse',attack,{actor,level:5,usageConfig:{scaling:1}}).ok,true);assert.equal(call(activities,'prepareQiTalentUse',attack,{actor,level:5,usageConfig:{scaling:2}}).ok,false);assert.equal(call(activities,'prepareQiTalentUse',attack,{actor,level:4,usageConfig:{scaling:1}}).ok,false);
 for(const value of [null,'',NaN])assert.equal(call(activities,'prepareQiTalentUse',attack,{actor:{system:{energy:{generated:value}}},level:5}).ok,false);
});

test('soul protection cannot exceed five temporary HP per cultivation level through a forged scaling input',()=>{
 const a=byKey(native('protecao-da-alma'),'protect'),actor={system:{energy:{generated:50}}};
 assert.equal(call(activities,'prepareQiTalentUse',a,{actor,level:4,usageConfig:{scaling:3}}).ok,true);assert.equal(call(activities,'prepareQiTalentUse',a,{actor,level:4,usageConfig:{scaling:4}}).ok,false);assert.equal(call(activities,'prepareQiTalentUse',a,{actor,level:4,usageConfig:{scaling:-1}}).ok,false);
});
test('native movement formulas reference the speeds schema and Energy detonation uses the canonical radiant type',()=>{
 assert.equal(byKey(native('passo-esguio'),'step').roll.formula,'@attributes.movement.speeds.walk / 2');assert.equal(byKey(native('movimento-instantaneo'),'move').range.value,'@attributes.movement.speeds.walk');assert.equal(byKey(native('detonacao-da-alma'),'detonate').flags[scope].qiTalentActivity.damageType,'radiant');
});

test('soul aggression is a ranged technique attack at twenty meters even while its extra cost is pending',()=>{
 const a=byKey(native('agressao-da-alma'),'aggression');assert.equal(a.attack.type.value,'ranged');assert.equal(a.attack.type.classification,'spell');assert.equal(a.range.value,'20');assert.equal(a.flags[scope].qiTalentActivity.directWounds,true);
});
