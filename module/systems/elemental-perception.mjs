import {elementalStableId} from './elemental-activity-data.mjs';
import {npcCultivationState} from './npc-cultivation.mjs';
const S='Immortals-system';
const state=actor=>actor?.flags?.[S]?.elementalState??{};
const known=(value,max)=>value!==null&&value!==undefined&&value!==''&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=max?Number(value):null;
function cultivation(actor){
 if(actor?.type==='npc'&&Object.hasOwn(actor.system?.legacy2??{},'nd')){const level=known(actor.system.legacy2.nd,30);return level&&level>=1?npcCultivationState(actor):null;}
 const rank=known(actor?.system?.cultivation?.rank,10),stage=known(actor?.system?.cultivation?.stage,3);
 return rank&&stage?{rank,stage,level:(rank-1)*3+stage}:null;
}
export function hasElementalDivineSense(actor){return Array.from(actor?.items?.values?.()??actor?.items??[]).some(item=>!item.isSuppressed&&item.flags?.[S]?.talentoQi?.id==='sentido-divino');}
/** Used privately by the detection resolver, not sent as an explanation of an unseen creature. */
export function elementalDivineSenseProfile(actor,{target,worldTime=globalThis.game?.time?.worldTime??0}={}){
 const saved=state(actor),progression=cultivation(actor),learned=hasElementalDivineSense(actor),active=learned&&saved.divineSenseActive?.active===true;
 const blinded=Array.from(actor?.effects??[]).some(effect=>!effect.disabled&&!effect.isSuppressed&&effect.flags?.[S]?.elementalLightFlash===true);
 const boost=saved.divineSense,multiplier=boost&&Number(boost.expiresAt)>worldTime&&[2,3,10].includes(Number(boost.multiplier))?Number(boost.multiplier):1;
 const base=progression?5*progression.level:0,range=active&&!blinded?base*multiplier:0;
 const cloak=state(target).darknessCloak,targetProgression=cultivation(target),blocked=!!(cloak?.active&&(!cloak.expiresAt||cloak.expiresAt>worldTime)&&progression&&targetProgression&&progression.rank<=targetProgression.rank+Number(cloak.ranksAbove??0));
 return{learned,active,blinded,base,multiplier,range,canDetect:range>0&&!blocked,penetratesObjects:true};
}
/** Opaque observer keys allow adjudication without publishing a list of hidden creatures. */
export const elementalIllusionObserverKey=(sourceActorUuid,useId,observerUuid)=>elementalStableId('illusion-recognition:'+sourceActorUuid+':'+useId+':'+observerUuid);
export function elementalIllusionRecognition(source,target,{useId,recognition}={}){
 const sourceConcept=known(source?.system?.conceitos?.ilusao?.level,10),targetConcept=known(target?.system?.conceitos?.ilusao?.level,10),left=cultivation(source),right=cultivation(target);
 if(sourceConcept!==null&&targetConcept!==null&&targetConcept>=sourceConcept)return{outcome:'recognizes',private:true};
 if(left&&right&&right.rank>=left.rank+2)return{outcome:'recognizes',private:true};
 if(sourceConcept!==null&&targetConcept!==null&&left&&right)return{outcome:'affected',private:true};
 if(useId&&source?.uuid&&target?.uuid&&recognition?.version===1&&recognition.id===useId&&recognition.sourceActorUuid===source.uuid){
  const decision=recognition.decisions?.[elementalIllusionObserverKey(source.uuid,useId,target.uuid)];
  if(['recognizes','affected'].includes(decision))return{outcome:decision,private:true,adjudicated:true};
 }
 return{outcome:'unknown',private:true};
}
