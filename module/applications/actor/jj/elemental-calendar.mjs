import {elementalSecondsPerDay,elementalCalendarSubjects} from '../../../systems/elemental-local-time.mjs';
import {withElementalActorLock} from "../../../systems/elemental-runtime.mjs";
import {CONCEITO_POR_ID} from "../../../systems/elemental-concepts-data.mjs";
import {createElementalTrainingCalendarController} from "../../../systems/elemental-training-calendar.mjs";
import {syncElementalFeatures} from "../../../systems/elemental-feature-sync.mjs";
import {elementalWorldTimeUpdates} from "../../../systems/elemental-combat-state.mjs";
const controller=createElementalTrainingCalendarController({
 getActors:elementalCalendarSubjects,isActiveGM:()=>!!game.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id),
 sync:syncElementalFeatures,expire:elementalWorldTimeUpdates,transact:withElementalActorLock,
 notify:async(actor,plan)=>{
  const completed=plan.completed.map(id=>CONCEITO_POR_ID[id]?.label??id).join(', '),recipients=game.users.filter(user=>user.isGM||actor.testUserPermission(user,'OWNER')).map(user=>user.id);
  const text=(completed?'Treinamento concluído: '+completed+'. ':'')+(plan.qiSpent?'Custo diário: '+plan.qiSpent+' Qi Refinado. ':'')+(plan.paused.length?'Há treinamento pausado; confira a aba de Conceitos Elementais.':'');
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),whisper:recipients,content:'<p>'+foundry.utils.escapeHTML(actor.name)+': '+foundry.utils.escapeHTML(text)+'</p>'});
 }
});
Hooks.on('updateWorldTime',(worldTime,delta,options={})=>{if(delta<=0)return;controller.onDays(options.dnd5e?.deltas?.midnights??0,worldTime,{from:worldTime-delta,to:worldTime,days:options.dnd5e?.deltas?.midnights??0,secondsPerDay:elementalSecondsPerDay()}).catch(error=>{console.error('Immortals Legacy | Treinamento elemental',error);ui.notifications.warn('Não foi possível atualizar um treinamento elemental: '+error.message);});});
