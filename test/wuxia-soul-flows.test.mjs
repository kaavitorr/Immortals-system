import {immortalsRestRecovery} from '../module/systems/rest-recovery.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {cultivationActions} from '../module/applications/actor/jj/cultivation-sheet.mjs';
import {ensureSoulPathEffects,soulPathActions,bindSoulPathSheet} from '../module/applications/actor/jj/soul-path-sheet.mjs';
import {processBodyTurnStart} from '../module/systems/body-path-combat.mjs';
function setup(level=9){
 globalThis.game={user:{id:'gm',isGM:true},users:{activeGM:{id:'gm'}},settings:{get:(_scope,key)=>key==='rulesetVersion'?'2.0':key==='regraSalvaguarda'?true:undefined}};
 globalThis.ui={notifications:{warn(){},info(){}}};globalThis.ChatMessage={create:async()=>{},getSpeaker:()=>({})};
 globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>true}}},utils:{getProperty:a=>a.system.attributes.hp.value}};
 const actor={type:'character',name:'Lin',isOwner:true,id:'lin',uuid:'Actor.lin',flags:{},effects:[],writes:[],
 system:{cultivation:{rank:4,stage:2,bodyCultivation:0,soulCultivation:level,points:99},abilities:{int:{value:13},wis:{value:4},cha:{value:3},con:{value:5}},legacy2:{actions:{value:6,max:6},wounds:{value:23,soul:12}},energy:{total:70,max:100},attributes:{hp:{value:49,max:60,effectiveMax:49,tempmax:0,temp:18}}},
 async update(data){this.writes.push(data);for(const[key,value]of Object.entries(data)){let node=this;const parts=key.split('.'),last=parts.pop();for(const part of parts)node=node[part]??={};if(last.startsWith('-='))delete node[last.slice(2)];else node[last]=structuredClone(value);}this.system.attributes.hp.effectiveMax=this.system.attributes.hp.max-Math.floor(this.system.legacy2.wounds.value/2)+(this.system.attributes.hp.tempmax??0);},
 async createEmbeddedDocuments(type,docs){const added=docs.map((doc,index)=>({...doc,id:'effect-'+this.effects.length+'-'+index}));this.effects.push(...added);if(type==='ActiveEffect')for(const doc of added)for(const change of doc.changes??[]){const key=/^system.abilities.(\w+).value$/.exec(change.key)?.[1];if(key)this.system.abilities[key].value+=Number(change.value);}return added;},
 async deleteEmbeddedDocuments(_type,ids){this.effects=this.effects.filter(effect=>!ids.includes(effect.id));}};
 const combat={id:'fight',started:true,round:1,turn:0,combatant:{id:'lin',actor}};game.combat=combat;return{actor,isEditable:true,combat};
}
test('reconciliação preserva efeitos manuais e mantém um único bônus fixo de Espírito/Sabedoria',async()=>{
 const {actor}=setup(4);actor.effects=[{id:'old-save',flags:{'Immortals-system':{soulEffect:'soulRev3'}}},{id:'manual',flags:{},changes:[]}];
 await ensureSoulPathEffects(actor);await ensureSoulPathEffects(actor);assert(actor.effects.some(effect=>effect.id==='manual'));assert(!actor.effects.some(effect=>effect.id==='old-save'));
 const fixed=actor.effects.filter(effect=>effect.flags?.['Immortals-system']?.soulEffect==='soulRev2');assert.equal(fixed.length,1);assert.deepEqual(fixed[0].changes.map(change=>change.key),['system.abilities.int.value','system.abilities.wis.value']);
});
test('os dois atributos da Oitava Revolução podem ir ao mesmo atributo sem exceder 15 ou duplicar uma escolha',async()=>{
 const sheet=setup(9);foundry.applications.api.DialogV2.wait=async()=> 'int';const target=level=>({dataset:{path:'soul-insight',level:String(level)}});
 await cultivationActions.cultivationChooseAttribute.call(sheet,{},target(1));await cultivationActions.cultivationChooseAttribute.call(sheet,{},target(2));await cultivationActions.cultivationChooseAttribute.call(sheet,{},target(2));
 assert.equal(sheet.actor.system.abilities.int.value,15);assert.deepEqual(sheet.actor.effects.map(effect=>effect.flags['Immortals-system'].cultivationAttribute),['soul:insight:1','soul:insight:2']);
});
test('cancelar avatar ou perder permissão durante o diálogo não gasta ações',async()=>{
 const sheet=setup(1);foundry.applications.api.DialogV2.wait=async()=>false;await soulPathActions.cultivationSoulAvatar.call(sheet);assert.equal(sheet.actor.writes.length,0);
 foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.isOwner=false;return true;};await soulPathActions.cultivationSoulAvatar.call(sheet);assert.equal(sheet.actor.writes.length,0);
});
test('defesa espiritual chama a salvaguarda nativa com o contexto condicional',async()=>{
 const sheet=setup(4);let rolled;sheet.actor.rollSavingThrow=async config=>rolled=config;foundry.applications.api.DialogV2.wait=async()=> 'vontade';
 await soulPathActions.cultivationSoulDefense.call(sheet);assert.deepEqual(rolled,{ability:'vontade',legacy2:{mindSoul:true}});
});
test('editar a reserva ou classificar Feridas não altera PV comuns nem duplica Feridas',async()=>{
 const sheet=setup(4),inputs={};for(const selector of ['[data-soul-barrier]','[data-soul-wounds]'])inputs[selector]={value:selector.includes('barrier')?'12':'5',dataset:{},addEventListener(_event,fn){this.listener=fn;}};
 sheet.element={querySelector:()=>({querySelector:selector=>inputs[selector]})};bindSoulPathSheet(sheet);
 for(const input of Object.values(inputs))await input.listener({stopPropagation(){}});
 assert.equal(sheet.actor.flags['Immortals-system'].soulBarrierSpent,28);assert.equal(sheet.actor.system.legacy2.wounds.soul,5);assert.equal(sheet.actor.system.legacy2.wounds.value,23);assert.equal(sheet.actor.system.attributes.hp.temp,18);
});
test('recuperação espiritual ocorre antes da regeneração do Corpo, usando o novo teto de Vida',async()=>{
 const {actor,combat}=setup(9);actor.system.cultivation.bodyCultivation=9;await processBodyTurnStart(actor,combat);
 assert.equal(actor.system.legacy2.wounds.value,13);assert.equal(actor.system.legacy2.wounds.soul,2);assert.equal(actor.system.attributes.hp.value,54);
 await processBodyTurnStart(actor,combat);assert.equal(actor.system.attributes.hp.value,54);assert.equal(actor.system.legacy2.wounds.value,13);
});
test('descanso longo nativo restaura a reserva e registra PV/Qi no mesmo resultado',()=>{
 const {actor}=setup(10),result={updateData:immortalsRestRecovery(actor,{type:'long'}).updates};
 assert.equal(result.updateData['flags.Immortals-system.soulBarrierSpent'],0);assert.equal(result.updateData['flags.Immortals-system.soulLastRest'].hp,result.updateData['system.attributes.hp.value']);assert.equal(result.updateData['flags.Immortals-system.soulLastRest'].qi,100);
});
test('falha real da Alma no terceiro nível consome PC e pílulas, perde nível e aplica dano de tribulação',async()=>{
 const sheet=setup(2);sheet.actor.system.cultivation.soulPills={3:20};
 globalThis.Roll=class{constructor(formula){this.total=formula==='1d20'?1:123;}async evaluate(){return this;}async toMessage(){}};
 foundry.applications.api.DialogV2.wait=async()=>({pi:0});await cultivationActions.cultivationAdvancePath.call(sheet,{}, {dataset:{path:'soul'}});
 const c=sheet.actor.system.cultivation;assert.equal(c.points,69);assert.equal(c.soulPills[3],0);assert.equal(c.soulCultivation,2);assert.equal(c.stage,1);assert.equal(sheet.actor.system.legacy2.wounds.value,146);assert.equal(sheet.actor.system.legacy2.wounds.soul,12);
});

test('Alma mantém o caminho e dez revoluções internos sem duplicar itens no Geral ou na ficha',async()=>{
 const {soulPathDocuments}=await import('../module/systems/soul-path-content.mjs');const {cultivatorCompendiumDocuments,cultivatorInternalDocuments}=await import('../module/systems/cultivator-content.mjs');
 const {cultivatorClassData,ensureCultivatorClass}=await import('../module/systems/wuxia-character.mjs');const docs=soulPathDocuments(),all=cultivatorCompendiumDocuments();
 assert.equal(docs.length,11);assert.equal(new Set(all.map(doc=>doc._id)).size,all.length);for(const doc of docs){assert.deepEqual(doc.effects,[]);assert(!all.some(record=>record._id===doc._id));assert(cultivatorInternalDocuments().some(record=>record._id===doc._id));}
 assert.match(docs[7].system.description.value,/compartilhado/);assert.match(docs[9].system.description.value,/2 pontos/);
 const {actor}=setup(4),cls=cultivatorClassData();cls.id='class';actor.items=[cls];actor.itemTypes={class:[cls]};actor.getFlag=()=>({completed:true});
 actor.createEmbeddedDocuments=async(_type,items)=>{const created=items.map((item,index)=>({...item,id:'item-'+actor.items.length+'-'+index}));actor.items.push(...created);return created;};
 actor.deleteEmbeddedDocuments=async(_type,ids)=>{actor.items=actor.items.filter(item=>!ids.includes(item.id));};
 await ensureCultivatorClass(actor);await ensureCultivatorClass(actor);assert.equal(actor.items.filter(item=>item.flags?.['Immortals-system']?.soulPath).length,0);
 actor.system.cultivation.soulCultivation=2;await ensureCultivatorClass(actor);assert.equal(actor.items.filter(item=>item.flags?.['Immortals-system']?.soulPath).length,0);
});
