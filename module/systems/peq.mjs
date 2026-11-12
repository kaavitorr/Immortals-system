import {elementalCultivationClock} from './elemental-local-time.mjs';
import { cultivationBlocked } from "./cultivation.mjs";
import {crystalCultivationProjection} from "./essence-crystals.mjs";
export function buildPeqEntries(actors,days,zone,{intervals=[]}={}) {
  const characters=Array.from(actors).filter(a=>a.type==="character");
  const players=characters.filter(a=>a.hasPlayerOwner);
  return (players.length?players:characters).map(actor=>{
    const blocked=cultivationBlocked(actor);
    const clock=intervals.length?elementalCultivationClock(actor,intervals):null,localDays=clock?.days??days;
    const p=crystalCultivationProjection(actor,localDays,zone);
    const perDay=p.boostedPerDay;
    return {localDays,clockUpdates:clock?.updates??{},timeSummary:clock&&localDays!==days?localDays+' dia(s) locais de cultivo':'',id:actor.uuid??actor.id,name:actor.name,img:actor.img,crystalSpent:p.crystalSpent,crystalBonus:p.crystalBonus,itemUpdates:p.itemUpdates,
      crystalSummary:p.crystalSpent ? "+"+p.crystalBonus+" PEQ do cristal · consome "+p.crystalSpent+" PEQ" : p.crystals.filter(c=>!c.eligible).map(c=>c.name+": "+c.reason).join(" · "),gainPerDayLabel:Number.isFinite(perDay)?perDay:"∞",current:p.current,essGoal:p.goal,newEssence:p.value,projected:p.gain,canGain:p.gain>0,reason:localDays<=0?'Aguardando completar um dia local de cultivo':blocked?"Absorção suspensa por toxinas de pílula até a remoção completa":p.gain>0?"":perDay===0?"Absorção suspensa":"Limite de cultivo atingido"};
  });
}
/** Keep allocation on one GM and prevent repeat submits or repeated awards after partial failures. */
export function createPeqController({getActors,getZone,isActiveGM,openDialog,notify=async()=>{},transact=async(_actor,_key,operation)=>operation()}) {
  let active=null;
  function onDays(days,interval=null){
    if(!isActiveGM()||!Number.isFinite(days)||days<0||!days&&!interval)return;
    days=Math.floor(days);
    if(active){if(active.applying||active.applied||active.finalizing||active.completed.size){active.queued+=days;if(interval)active.queuedIntervals.push(interval);}else{active.days+=days;if(interval)active.intervals.push(interval);active.dialog?.addDays(days);}return;}
    const state={days,intervals:interval?[interval]:[],queued:0,queuedIntervals:[],applying:false,applied:false,closed:false,completed:new Set(),dialog:null};active=state;
    const rebuild=d=>buildPeqEntries(getActors(),d,getZone(),{intervals:state.intervals});
    const finish=()=>{if(active!==state)return;active=null;if(state.queuedIntervals.length){for(const period of state.queuedIntervals)onDays(period.days,period);}else if(state.queued)onDays(state.queued);};
    const onClose=()=>{if(active!==state)return;state.closed=true;if(state.applying||state.finalizing)return;if(!state.intervals.length){finish();return;}
      state.finalizing=true;const settle=async()=>{for(const actor of Array.from(getActors()))await transact(actor,'cultivation-clock',async()=>{const entry=rebuild(state.days).find(e=>e.id===(actor.uuid??actor.id));if(entry&&Object.keys(entry.clockUpdates).length)await actor.update(entry.clockUpdates);});};
      return settle().catch(error=>globalThis.ui?.notifications?.warn?.('O saldo de tempo local precisa ser conferido: '+error.message)).finally(finish);
    };
    const onApply=async ids=>{
      if(!isActiveGM()||active!==state||state.closed||state.applying||state.applied||!Array.isArray(ids))return;
      state.applying=true;
      try {for(const id of new Set(ids)){
          if(state.completed.has(id))continue;const actor=Array.from(getActors()).find(a=>(a.uuid??a.id)===id);if(!actor)continue;
          await transact(actor,'cultivation-award',async()=>{const entry=rebuild(state.days).find(e=>e.id===id&&e.canGain);if(!entry)return;
            const updates={...entry.clockUpdates,'system.cultivation.essence':entry.newEssence};
            if(entry.itemUpdates?.length){if(typeof actor.performBulkUpdate!=='function')throw Error('A atualização conjunta do cultivo e do cristal não está disponível.');await actor.performBulkUpdate({actor:updates,item:entry.itemUpdates},{essenceCrystalCultivation:true});}else await actor.update(updates);
            state.completed.add(id);await notify(actor,entry,entry.localDays);
          });
        }state.applied=true;
      }finally{state.applying=false;if(state.closed)await onClose();}
    };
    try{const entries=rebuild(days);if(!days&&!entries.some(e=>e.canGain)){void onClose();return;}state.dialog=openDialog({days,entries,rebuild,onApply,onClose});}
    catch(error){active=null;throw error;}
  }
  return {onDays};
}
