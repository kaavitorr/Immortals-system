import {test} from 'node:test';
import assert from 'node:assert/strict';
import { cultivationRank, cultivationRankBenefits, meditationUpdate, illuminationGrantUpdate, rankDamageAdjustment, professionDifficultyReduction } from '../module/systems/cultivation-rank-benefits.mjs';
import { pathRequirement } from '../module/systems/caminhos-data.mjs';
import { conceptTrainingState, conceptTrainingUpdate } from '../module/systems/elemental-concepts.mjs';
import { qiMaxCultivo } from '../module/systems/cultivation-data.mjs';
const actor=(rank,extra={})=>({type:'character',system:{cultivation:{rank,illumination:2,...extra},energy:{total:30,generated:999,max:100},conceitos:{}}});
test('reino de PdN é explícito: ND e dados ausentes não viram Mortal',()=>{
 assert.equal(cultivationRank(actor(5)),5);assert.equal(cultivationRank({type:'npc',system:{details:{cr:1}}}),null);
 assert.equal(cultivationRank({type:'npc',flags:{'Immortals-system':{cultivationRank:0}}}),0);
 assert.equal(cultivationRank({type:'npc',flags:{'Immortals-system':{cultivationRank:7}}}),7);
 assert.equal(cultivationRank({type:'npc',flags:{'Immortals-system':{cultivationRank:99}}}),null);
});
test('meditação só desbloqueia no Núcleo Rotativo e considera blocos completos de dez minutos',()=>{
 assert.throws(()=>meditationUpdate(actor(2),20),/Rotativo/);
 assert.equal(meditationUpdate(actor(3),29).recovered,10);
 assert.equal(meditationUpdate(actor(3),9).recovered,0);
 assert.throws(()=>meditationUpdate(actor(3),-1),/minutos/);
 const a=actor(3);a.system.energy.total=98;assert.equal(meditationUpdate(a,30).updates['system.energy.total'],100);
 a.system.energy.total=110;assert.equal(meditationUpdate(a,30).updates['system.energy.total'],110);
});
test('conceder PI dobra apenas a nova concessão a partir de Lorde Divino',()=>{
 assert.equal(illuminationGrantUpdate(actor(5),2).updates['system.cultivation.illumination'],4);
 assert.equal(illuminationGrantUpdate(actor(6),2).updates['system.cultivation.illumination'],6);
 assert.throws(()=>illuminationGrantUpdate(actor(6),1.5),/inteira/);
 assert.equal(illuminationGrantUpdate(actor(6),0).updates['system.cultivation.illumination'],2);
});
test('Transformação reduz a CD de alvos de treino até nível cinco; bônus do Corpo continua independente',()=>{
 assert.equal(professionDifficultyReduction(actor(4),5),0);assert.equal(professionDifficultyReduction(actor(5),5),4);
 assert.equal(professionDifficultyReduction(actor(5),6),0);
 let a=actor(5);a.system.energy.total=999;
 assert.equal(conceptTrainingState(a,'fogo',{points:99}).cd,6);
 a.system.conceitos.fogo={level:5};assert.equal(conceptTrainingState(a,'fogo',{points:99}).cd,20);
 a.system.conceitos.fogo={level:4};a.system.cultivation.bodyCultivation=7;
 assert.equal(conceptTrainingState(a,'fogo',{points:99}).cd,10);
});
test('conceitos requerem Formação de Núcleo, inclusive na transação final',()=>{
 const a=actor(1);a.system.energy.total=100;
 assert.equal(conceptTrainingState(a,'fogo',{points:99}).canTrain,false);
 assert.throws(()=>conceptTrainingUpdate(a,'fogo',{points:99,rollTotal:99}),/Formaç/);
 a.system.cultivation.rank=2;assert.equal(conceptTrainingState(a,'fogo',{points:99}).canTrain,true);
});
test('Lorde Sagrado reduz PC e dias de Corpo/Alma, sem consumir menos pílulas',()=>{
 const body=pathRequirement('body',3,actor(7)),soul=pathRequirement('soul',3,actor(7));
 assert.equal(body.pt,19);assert.equal(body.dias,7.5);assert.equal(body.pills,10);assert.equal(body.moneyMultiplier,0.5);
 assert.equal(soul.pt,38);assert.equal(soul.dias,15);assert.equal(soul.pills,20);
 assert.equal(pathRequirement('body',3,actor(6)).pt,20);
});
test('Qi imperial é derivado uma vez e aparece no máximo compartilhado',()=>{
 assert.equal(qiMaxCultivo(7,3),300);assert.equal(qiMaxCultivo(8,1),420);assert.equal(qiMaxCultivo(8,3),440);
 assert.equal(cultivationRankBenefits(8).extraQi,100);assert.equal(cultivationRankBenefits(9).freeCombatManuals,2);
});
test('vantagem de reino acrescenta dano uma vez, apenas contra reinos conhecidos inferiores',()=>{
 const a=actor(5),b=actor(3);let parts=[{type:'fire',value:10},{type:'cold',value:5}];
 assert.deepEqual(rankDamageAdjustment(b,parts,{sourceActor:a}),{bonus:6,immune:false});assert.equal(parts[0].value,16);
 rankDamageAdjustment(b,parts,{sourceActor:a});assert.equal(parts[0].value,16);assert.equal(parts[1].value,5);
 const unknown={type:'npc',system:{}};assert.equal(rankDamageAdjustment(unknown,[{value:10}],{sourceActor:a}).bonus,0);
 assert.equal(rankDamageAdjustment(a,[{value:10}],{sourceActor:a}).bonus,0);
 assert.equal(rankDamageAdjustment(b,[{type:'healing',value:10}],{sourceActor:a}).bonus,0);
});
test('imunidade imperial exige diferença de quatro reinos e preserva cura e dano direto',()=>{
 let parts=[{type:'fire',value:10},{type:'healing',value:4}];
 assert.equal(rankDamageAdjustment(actor(8),parts,{sourceActor:actor(4)}).immune,true);assert.equal(parts[0].value,0);assert.equal(parts[1].value,4);
 assert.equal(rankDamageAdjustment(actor(8),[{value:10}],{sourceActor:actor(5)}).immune,false);
 assert.equal(rankDamageAdjustment(actor(8),[{value:10}],{sourceActor:actor(1),direct:true}).immune,false);
});

test('perder Formação de Núcleo impede aprender novas habilidades elementais e preserva a opção de desfazer',async()=>{
 const {ELEMENT_ABILITIES}=await import('../module/systems/elemental-abilities-data.mjs');
 const {elementalAbilityState,elementalAbilityUpdate}=await import('../module/systems/elemental-concepts.mjs');
 const a=actor(1);a.system.conceitos.fogo={level:2};const id=ELEMENT_ABILITIES.fogo[0].id;
 assert.equal(elementalAbilityState(a,'fogo',id).canAdvance,false);
 assert.throws(()=>elementalAbilityUpdate(a,'fogo',id),/reino/);
 a.system.elementAbilities={fogo:{[id]:1}};assert.equal(elementalAbilityState(a,'fogo',id).canUndo,true);
});
