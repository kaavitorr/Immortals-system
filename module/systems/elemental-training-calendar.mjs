import {elementalCultivationClock} from './elemental-local-time.mjs';
import {advanceElementalTrainingDays} from "./elemental-training-time.mjs";
/** Serialize calendar batches; actor receipts make retries/repeated notifications idempotent. */
export function createElementalTrainingCalendarController({getActors,isActiveGM,sync=async()=>{},expire=()=>({}),notify=async()=>{},transact=async(_actor,_key,operation)=>operation()}){
 let queue=Promise.resolve();
 const onDays=(days,worldTime,interval)=>{const run=async()=>{
  if(!isActiveGM()||!Number.isFinite(days)||days<0||!Number.isFinite(worldTime))return [];
  const results=[];
  for(const actor of Array.from(getActors())){
   if(!['character','npc'].includes(actor.type)||actor.isOwner===false)continue;
   await transact(actor,"calendar:"+worldTime,async()=>{
   const source=actor.flags?.['Immortals-system']??{};
   if(!source.elementalTrainingJobs&&!source.elementalTrainingAttempts&&!source.generalTraining?.active&&!source.elementalState&&!source.elementalCalendarEffects)return;
   const clock=interval&&Object.keys(source.elementalTrainingJobs??{}).length?elementalCultivationClock(actor,[interval],{conceptTraining:true}):null;
   const plan=advanceElementalTrainingDays(actor,clock?.days??Math.floor(days),{worldTime}),updates={...clock?.updates,...plan.updates,...expire(actor,worldTime)};
   if(!Object.keys(updates).length)return;
   await actor.update(updates);if(plan.completed.length)await sync(actor);
   results.push({actorId:actor.id,...plan});if(plan.completed.length||plan.qiSpent||plan.paused.length)await notify(actor,plan);
   });
  }
  return results;
 };const current=queue.then(run);queue=current.catch(()=>{});return current;};
 return {onDays};
}
