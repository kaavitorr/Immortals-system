import {JJ_FEATURE_SECTIONS} from "../module/applications/actor/jj/features.mjs";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rankBenefitActions,npcCultivationRankOptions,bindNpcCultivationRank} from '../module/applications/actor/jj/cultivation-rank-sheet.mjs';
import {cultivationRankDocuments} from '../module/systems/cultivation-rank-content.mjs';
import {cultivatorCompendiumDocuments,cultivatorInternalDocuments} from '../module/systems/cultivator-content.mjs';
function setup(rank=6){
 globalThis.game={user:{isGM:true},settings:{get:()=> '2.0'}};
 globalThis.ui={notifications:{info(){},warn(){}}};
 globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>({amount:2})}}}};
 const actor={type:'character',isOwner:true,system:{cultivation:{rank,illumination:3},energy:{total:10,max:40}},writes:[],async update(patch){this.writes.push(patch);for(const [key,value]of Object.entries(patch)){const keys=key.split('.'),last=keys.pop();let object=this;for(const part of keys)object=object[part]??={};object[last]=value;}}};
 return {actor,isEditable:true};
}
test('mestre concede apenas novos PI com o bônus; jogador não concede',async()=>{
 const sheet=setup();await rankBenefitActions.cultivationGrantIllumination.call(sheet);assert.equal(sheet.actor.system.cultivation.illumination,7);
 game.user.isGM=false;await rankBenefitActions.cultivationGrantIllumination.call(sheet);assert.equal(sheet.actor.writes.length,1);
});
test('cancelar ou perder permissão no diálogo não altera recursos',async()=>{
 const sheet=setup();foundry.applications.api.DialogV2.wait=async()=>false;await rankBenefitActions.cultivationMeditate.call(sheet);assert.equal(sheet.actor.writes.length,0);
 foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.isOwner=false;return{amount:20};};await rankBenefitActions.cultivationMeditate.call(sheet);assert.equal(sheet.actor.writes.length,0);
});
test('meditação revalida o reino e usa o saldo atual após confirmar',async()=>{
 const sheet=setup();foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.system.cultivation.rank=2;return{amount:20};};
 await rankBenefitActions.cultivationMeditate.call(sheet);assert.equal(sheet.actor.writes.length,0);
 sheet.actor.system.cultivation.rank=3;foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.system.energy.total=35;return{amount:20};};
 await rankBenefitActions.cultivationMeditate.call(sheet);assert.equal(sheet.actor.system.energy.total,40);
});
test('PdN edits realm and stage through the shared level; soul remains independent',async()=>{
 const sheet=setup();sheet.actor.type='npc';sheet.actor.system.legacy2={nd:'2'};
 const input=value=>({value,dataset:{},addEventListener(name,fn){this.listener=fn;}}),realm=input('4'),stage=input('3'),soul=input('');
 sheet.element={querySelectorAll:s=>s==='[data-npc-cultivation-rank]'?[realm]:s==='[data-npc-cultivation-stage]'?[stage]:s==='[data-npc-soul-cultivation]'?[soul]:[]};
 bindNpcCultivationRank(sheet);await realm.listener({stopPropagation(){}});assert.equal(sheet.actor.writes[0]['system.legacy2.nd'],'11');
 await stage.listener({stopPropagation(){}});assert.equal(sheet.actor.writes[1]['system.legacy2.nd'],'12');
 await soul.listener({stopPropagation(){}});assert.deepEqual(sheet.actor.writes[2],{'flags.Immortals-system.-=soulCultivation':null});
 const options=npcCultivationRankOptions(sheet.actor);assert.equal(options.length,10);assert.equal(options.find(o=>o.selected).value,'4');
 realm.value='99';await realm.listener({stopPropagation(){}});assert.equal(sheet.actor.writes.length,3);
});
test('dez referências internas únicas mantêm os nomes e regras sem entradas públicas ou efeitos cumulativos',()=>{
 const docs=cultivationRankDocuments(),all=cultivatorCompendiumDocuments();assert.equal(docs.length,10);assert.equal(docs[9].name,'Divindade');
 assert.equal(new Set(all.map(d=>d._id)).size,all.length);
 for(const [index,doc]of docs.entries()){assert.equal(doc.flags['Immortals-system'].cultivatorRank,index+1);assert.deepEqual(doc.effects,[]);assert(JJ_FEATURE_SECTIONS.has(doc.flags['Immortals-system'].featureSection));assert(!all.some(d=>d._id===doc._id));assert(cultivatorInternalDocuments().some(d=>d._id===doc._id));}
 assert.match(docs[8].system.description.value,/2 Manuais de Combate de Grau 9/);assert.match(docs[9].system.description.value,/Pontos de Atributo/);
});
