import test from 'node:test';import assert from 'node:assert/strict';
import {CONCEITOS_ELEMENTOS,custoConceito} from '../module/systems/elemental-concepts-data.mjs';
import {advanceElementalTrainingDays} from '../module/systems/elemental-training-time.mjs';
import {ELEMENT_ABILITIES} from '../module/systems/elemental-abilities-data.mjs';
import {conceptTrainingState,conceptTrainingUpdate,elementalAbilityState,elementalAbilityUpdate,conceptResistanceBonuses} from '../module/systems/elemental-concepts.mjs';
const actor=(extra={})=>({system:{energy:{total:1000,generated:1000},cultivation:{rank:6,bodyCultivation:0,illumination:5,spentTrainingPoints:0},conceitos:{},elementAbilities:{},...extra}});
const apply=(a,updates)=>{for(const [key,value]of Object.entries(updates)){let target=a;const parts=key.split('.');for(const part of parts.slice(0,-1))target=target[part]??={};const last=parts.at(-1);if(last.startsWith('-='))delete target[last.slice(2)];else target[last]=structuredClone(value);}};
test('all thirteen concepts retain their costs and the requested Thunder/Void damage mapping',()=>{
 assert.equal(CONCEITOS_ELEMENTOS.length,13);assert.equal(Object.values(ELEMENT_ABILITIES).flat().length,52);
 assert.deepEqual(custoConceito('fogo',1),{pt:1,qi:15,cd:10,dias:3});assert.deepEqual(custoConceito('vento',1),{pt:1,qi:20,cd:12,dias:6});assert.deepEqual(custoConceito('luz',1),{pt:1,qi:30,cd:13,dias:9});assert.deepEqual(custoConceito('tempo',10),{pt:10,qi:630,cd:30,dias:90});
 assert.equal(CONCEITOS_ELEMENTOS.find(e=>e.id==='vento').resistencia.thunder,3);assert.equal(CONCEITOS_ELEMENTOS.find(e=>e.id==='escuridao').resistencia.void,3);
});
test('success spends refined Qi and independent cultivation credit and records the complete new mapping entry',()=>{
 const a=actor(),before=structuredClone(a),result=conceptTrainingUpdate(a,'fogo',{points:10,rollTotal:14,piSpent:0});
 assert.equal(result.success,true);assert.equal(result.cost,1);assert.equal(result.updates['system.energy.generated'],985);assert.equal(result.updates['system.cultivation.spentTrainingPoints'],1);assert.equal(result.updates['system.conceitos.fogo'].level,0);assert.equal(result.pending,true);assert.equal(result.updates['flags.Immortals-system.elementalTrainingJobs.fogo'].totalDays,3);assert.equal(result.updates['flags.Immortals-system.elementalTrainingJobs.fogo'].remainingDays,2);assert.equal(result.updates['system.conceitos.fogo'].spentTrainingPoints,1);assert.deepEqual(a,before);
});
test('failures preserve DC; after three failures PC is free while refined Qi remains payable',()=>{
 const a=actor();a.system.cultivation.rank=4;for(let failure=1;failure<=3;failure++){const result=conceptTrainingUpdate(a,'fogo',{points:10,rollTotal:0,piSpent:0});assert.equal(result.success,false);apply(a,result.updates);a.flags['Immortals-system'].elementalTrainingDay=failure;assert.equal(a.system.conceitos.fogo.failures['1'],failure);}
 const state=conceptTrainingState(a,'fogo',{points:0});assert.equal(state.ptCost,0);assert.equal(state.cd,10);assert.equal(state.canTrain,true);assert.equal(a.system.cultivation.spentTrainingPoints,3);assert.equal(a.system.conceitos.fogo.lostTrainingPoints,3);
 const next=conceptTrainingUpdate(a,'fogo',{points:0,rollTotal:10,piSpent:0});assert.equal(next.cost,0);apply(a,next.updates);assert.equal(a.system.energy.generated,940);assert.equal(a.system.energy.total,1000);assert.equal(a.system.conceitos.fogo.failures['1'],undefined);assert.equal(next.pending,true);apply(a,advanceElementalTrainingDays(a,2).updates);assert.equal(a.system.energy.generated,910);assert.equal(a.system.conceitos.fogo.level,1);assert.equal(conceptTrainingState(a,'fogo',{points:0}).ptCost,2);
});
test('Body and illumination reduce training DC without bypassing affordability, bounds or stale levels',()=>{
 const a=actor();a.system.cultivation.rank=4;a.system.cultivation.bodyCultivation=7;a.system.conceitos.fogo={level:0,failures:{1:2}};
 const result=conceptTrainingUpdate(a,'fogo',{points:1,rollTotal:2,piSpent:2});assert.equal(result.cd,1);assert.equal(result.updates['system.cultivation.illumination'],3);
 assert.throws(()=>conceptTrainingUpdate(a,'fogo',{points:0,rollTotal:20}),/PC/);a.system.energy.generated=14;assert.equal(conceptTrainingState(a,'fogo',{points:100}).canTrain,false);assert.throws(()=>conceptTrainingUpdate(a,'fogo',{points:100,rollTotal:20}),/Qi/);
 a.system.energy.generated=1000;assert.throws(()=>conceptTrainingUpdate(a,'fogo',{points:100,rollTotal:20,piSpent:6}),/PI/);assert.throws(()=>conceptTrainingUpdate(a,'fogo',{points:100,rollTotal:20,expectedLevel:1}),/mudou/);a.system.conceitos.fogo.level=10;assert.equal(conceptTrainingState(a,'fogo',{points:100}).canTrain,false);
});
test('ability acquisition enforces valid IDs, exact next grade, cultivation and element budgets',()=>{
 const a=actor();a.system.conceitos.madeira={level:3};const id=ELEMENT_ABILITIES.madeira[0].id;
 assert.equal(elementalAbilityState(a,'madeira',id).canAdvance,true);apply(a,elementalAbilityUpdate(a,'madeira',id).updates);assert.equal(a.system.elementAbilities.madeira[id],1);
 a.system.cultivation.rank=3;assert.equal(elementalAbilityState(a,'madeira',id).canAdvance,false);assert.throws(()=>elementalAbilityUpdate(a,'madeira','inventada'),/Habilidade/);a.system.cultivation.rank=4;apply(a,elementalAbilityUpdate(a,'madeira',id).updates);assert.equal(a.system.elementAbilities.madeira[id],2);assert.equal(elementalAbilityState(a,'madeira',id).canAdvance,false);a.system.cultivation.rank=6;apply(a,elementalAbilityUpdate(a,'madeira',id).updates);assert.equal(a.system.elementAbilities.madeira[id],3);assert.equal(elementalAbilityState(a,'madeira',ELEMENT_ABILITIES.madeira[1].id).canAdvance,false);
});
test('the global ten-ability cap permits upgrades but rejects an eleventh acquisition',()=>{
 const a=actor();for(const el of CONCEITOS_ELEMENTOS)a.system.conceitos[el.id]={level:10};let count=0;for(const [el,list]of Object.entries(ELEMENT_ABILITIES))for(const ab of list.filter(a=>!a.level10)){if(count++<10)(a.system.elementAbilities[el]??={})[ab.id]=1;}
 assert.equal(elementalAbilityState(a,'fogo',ELEMENT_ABILITIES.fogo[0].id).canAdvance,true);const untouched=Object.entries(ELEMENT_ABILITIES).flatMap(([el,list])=>list.filter(ab=>!ab.level10&&!a.system.elementAbilities[el]?.[ab.id]).map(ab=>[el,ab.id]))[0];assert.equal(elementalAbilityState(a,...untouched).canAdvance,false);
});
test('unique level-ten abilities require level ten and all regular abilities dominated, and keep one grade',()=>{
 const a=actor();a.system.conceitos.madeira={level:9};const list=ELEMENT_ABILITIES.madeira,unique=list.find(ab=>ab.level10);a.system.elementAbilities.madeira=Object.fromEntries(list.filter(ab=>!ab.level10).map(ab=>[ab.id,2]));assert.equal(elementalAbilityState(a,'madeira',unique.id).canAdvance,false);
 a.system.conceitos.madeira.level=10;apply(a,elementalAbilityUpdate(a,'madeira',unique.id).updates);assert.equal(a.system.elementAbilities.madeira[unique.id],1);assert.equal(elementalAbilityState(a,'madeira',unique.id).canAdvance,false);assert.throws(()=>elementalAbilityUpdate(a,'madeira',list[0].id,{direction:'undo'}),/nível 10/);
 apply(a,elementalAbilityUpdate(a,'madeira',unique.id,{direction:'undo'}).updates);assert.equal(a.system.elementAbilities.madeira[unique.id],undefined);
});
test('concept resistance bonuses sum by damage type without mutating manual defenses',()=>{
 const data={fogo:{level:2},madeira:{level:1},vento:{level:3},escuridao:{level:4},metal:{level:2},tempo:{level:1}},before=structuredClone(data);assert.deepEqual(conceptResistanceBonuses(data),{fire:6,acid:2,poison:2,thunder:9,void:12,slashing:4,piercing:4,bludgeoning:2});assert.deepEqual(data,before);
});
