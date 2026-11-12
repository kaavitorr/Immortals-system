import {immortalsRestRecovery} from '../module/systems/rest-recovery.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';

import {bodyPathActions,ensureBodyPathEffects} from '../module/applications/actor/jj/body-path-sheet.mjs';
import {processBodyTurnStart,beginBodyEncounter,endBodyTurn,consumeBodyAttackBonus,registerBodyCombatHooks} from '../module/systems/body-path-combat.mjs';
import {bodyTurnKey} from '../module/systems/body-path.mjs';
function setup(level=9){
 globalThis.game={user:{isGM:true,id:'gm'},users:{activeGM:{id:'gm'}},settings:{get:()=> '2.0'}};
 globalThis.ui={notifications:{warn(){},info(){}}};globalThis.foundry={applications:{api:{DialogV2:{wait:async()=>true}}},utils:{getProperty:a=>a.system.attributes.hp.value}};
 const actor={type:'character',id:'lin',uuid:'Actor.lin',isOwner:true,flags:{},effects:[],writes:[],
 system:{cultivation:{bodyCultivation:level,rank:3},abilities:{con:{value:5}},legacy2:{actions:{value:4,max:6},wounds:{value:23}},attributes:{hp:{value:20,max:60,effectiveMax:49,tempmax:0}},energy:{max:100,total:10}},
 async update(data){this.writes.push(data);for(const [key,value]of Object.entries(data)){let node=this;const parts=key.split('.'),last=parts.pop();for(const part of parts)node=node[part]??={};if(last.startsWith('-='))delete node[last.slice(2)];else node[last]=structuredClone(value);}}};
 const combat={id:'fight',uuid:'Combat.fight',started:true,round:1,turn:0,combatant:{id:'lin-token',actor},previous:{},combatants:[]};combat.combatants.push(combat.combatant);combat.combatants.get=id=>combat.combatants.find(c=>c.id===id);game.combat=combat;
 return{actor,combat,isEditable:true};
}
test('cancelar os portões ou perder permissão não gasta ação nem usos',async()=>{
 const sheet=setup();foundry.applications.api.DialogV2.wait=async()=>false;await bodyPathActions.cultivationBodyCure.call(sheet);assert.equal(sheet.actor.writes.length,0);
 foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.isOwner=false;return true;};await bodyPathActions.cultivationBodyMaravilhas.call(sheet);assert.equal(sheet.actor.writes.length,0);
});
test('ativar Cura revalida recursos após a confirmação e não usa Qi Refinado',async()=>{
 const sheet=setup();foundry.applications.api.DialogV2.wait=async()=>{sheet.actor.system.legacy2.actions.value=0;return true;};
 await bodyPathActions.cultivationBodyCure.call(sheet);assert.equal(sheet.actor.writes.length,0);
 sheet.actor.system.legacy2.actions.value=4;foundry.applications.api.DialogV2.wait=async()=>true;await bodyPathActions.cultivationBodyCure.call(sheet);
 assert.equal(sheet.actor.system.attributes.hp.value,25);assert.equal(sheet.actor.system.legacy2.actions.value,3);assert.equal(sheet.actor.system.energy.total,10);
});
test('migração remove só efeitos automáticos obsoletos e escolhas de níveis revogados',async()=>{
 const {actor}=setup(4);actor.effects=[{id:'old',flags:{'Immortals-system':{bodyEffect:'bodyLimite'}}},{id:'dor',flags:{'Immortals-system':{bodyEffect:'bodyDor'}}},
 {id:'choice',flags:{'Immortals-system':{cultivationAttribute:'body:3'}}},{id:'later',flags:{'Immortals-system':{cultivationAttribute:'body:7'}}},{id:'manual',flags:{}},{id:'soul',flags:{'Immortals-system':{soulEffect:'soulRev2'}}}];
 actor.deleteEmbeddedDocuments=async(type,ids)=>{assert.equal(type,'ActiveEffect');actor.effects=actor.effects.filter(e=>!ids.includes(e.id));};
 await ensureBodyPathEffects(actor);await ensureBodyPathEffects(actor);assert.deepEqual(actor.effects.map(e=>e.id),['choice','manual','soul']);
});
test('regeneração concorrente e evento repetido recuperam apenas uma vez no turno',async()=>{
 const {actor,combat}=setup();await Promise.all([processBodyTurnStart(actor,combat),processBodyTurnStart(actor,combat)]);
 assert.equal(actor.system.attributes.hp.value,25);await processBodyTurnStart(actor,combat);assert.equal(actor.writes.length,1);
 combat.turn=4;await processBodyTurnStart(actor,combat);assert.equal(actor.writes.length,1,'reordenar a iniciativa não concede outro início de turno');
 combat.round=2;await processBodyTurnStart(actor,combat);assert.equal(actor.system.attributes.hp.value,30);
});
test('rastreador recupera Vida mesmo sem callback nativo e clientes sem autoridade não escrevem',async()=>{
 const {actor,combat}=setup(),handlers={};registerBodyCombatHooks({on:(name,fn)=>handlers[name]=fn});
 await handlers.updateCombat(combat,{turn:0},{turnEvents:false});assert.equal(actor.writes.length,0);
 game.user.id='second-gm';await handlers.updateCombat(combat,{turn:0},{});assert.equal(actor.writes.length,0);
 game.user.id='gm';await handlers.updateCombat(combat,{turn:0},{});assert.equal(actor.system.attributes.hp.value,25);
});
test('consumir Maravilhas preserva movimento triplo e encerrar o turno preserva usos do encontro',async()=>{
 const {actor,combat}=setup();actor.flags['Immortals-system']={bodyMaravilhas:{combat:combat.uuid,uses:2,turn:bodyTurnKey(actor,combat),pending:true}};
 await consumeBodyAttackBonus(actor,bodyTurnKey(actor,combat));assert.equal(actor.flags['Immortals-system'].bodyMaravilhas.pending,false);assert(actor.flags['Immortals-system'].bodyMaravilhas.turn);
 await endBodyTurn(actor,combat);assert.equal(actor.flags['Immortals-system'].bodyMaravilhas.uses,2);assert.equal(actor.flags['Immortals-system'].bodyMaravilhas.turn,null);
 await beginBodyEncounter(combat);assert.equal(actor.flags['Immortals-system'].bodyMaravilhas,undefined);
});
test('descansos aplicam Feridas e o teto novo de Vida na mesma atualização e restauram Cura só no longo',()=>{
 for(const [level,type,wounds,hp]of [[3,'short',20,50],[3,'long',13,54],[9,'short',18,51],[9,'long',0,60]]){
 const {actor}=setup(level),result={updateData:immortalsRestRecovery(actor,{type}).updates};
 assert.equal(result.updateData['system.legacy2.wounds.value'],wounds);assert.equal(result.updateData['system.attributes.hp.value'],hp);
 assert.equal(result.updateData['flags.Immortals-system.bodyCureUses'],type==='long'?0:undefined);}
});

test('Corpo mantém referências internas estáveis sem duplicar itens no Geral ou na ficha',async()=>{
 const {bodyPathDocuments}=await import('../module/systems/body-path-content.mjs');
 const {cultivatorCompendiumDocuments,cultivatorInternalDocuments}=await import('../module/systems/cultivator-content.mjs');
 const docs=bodyPathDocuments(),all=cultivatorCompendiumDocuments();assert.equal(docs.length,11);assert.equal(new Set(all.map(d=>d._id)).size,all.length);
 for(const doc of docs){assert.deepEqual(doc.effects,[]);assert(!all.some(d=>d._id===doc._id));assert(cultivatorInternalDocuments().some(d=>d._id===doc._id));assert.equal(doc.flags['Immortals-system'].featureSection,'jj-path');}
 assert.equal(docs[1].name,'Forjando o Corpo');assert.match(docs[3].system.description.value,/5 vezes por descanso longo/);assert.match(docs[8].system.description.value,/pesada/);
 const {cultivatorClassData,ensureCultivatorClass}=await import('../module/systems/wuxia-character.mjs');const {actor}=setup(4),cls=cultivatorClassData();cls.id='class';
 actor.items=[cls];actor.itemTypes={class:[cls]};actor.getFlag=()=>({completed:true});
 actor.createEmbeddedDocuments=async(_type,items)=>{const added=items.map((item,index)=>({...item,id:'new-'+actor.items.length+'-'+index}));actor.items.push(...added);return added;};
 actor.deleteEmbeddedDocuments=async(_type,ids)=>{actor.items=actor.items.filter(item=>!ids.includes(item.id));};
 await ensureCultivatorClass(actor);await ensureCultivatorClass(actor);
 assert.equal(actor.items.filter(item=>item.flags?.['Immortals-system']?.bodyPath).length,0);
 actor.system.cultivation.bodyCultivation=2;await ensureCultivatorClass(actor);assert.equal(actor.items.filter(item=>item.flags?.['Immortals-system']?.bodyPath).length,0);
});

test('carregar o mundo reconcilia os efeitos antigos antes de abrir a ficha',async()=>{
 const {registerBodyPathMigration}=await import('../module/applications/actor/jj/body-path-sheet.mjs');const {actor}=setup(6);
 actor.effects=[{id:'obsolete',flags:{'Immortals-system':{bodyEffect:'bodyDor'}}},{id:'manual',flags:{}}];
 actor.deleteEmbeddedDocuments=async(_type,ids)=>{actor.effects=actor.effects.filter(effect=>!ids.includes(effect.id));};game.actors=[actor];let ready;registerBodyPathMigration({once:(_event,fn)=>ready=fn});
 await ready();assert.deepEqual(actor.effects.map(effect=>effect.id),['manual']);
});
