import {elementalIllusionRecognition} from './elemental-perception.mjs';
const S='Immortals-system',wrapped=Symbol('elementalIllusionNativeVision');
const active=effect=>!effect.disabled&&!effect.isSuppressed;
const owns=(effect,actor,id)=>effect.flags?.[S]?.elementalIllusionBody?.sourceActorUuid===actor.uuid&&effect.flags[S].elementalIllusionBody.id===id;
/**
 * Foundry's DetectionMode.testVisibility delegates state checks to TokenDocument.hasStatusEffect,
 * then retains its own range, LOS, angle and light tests. A read-only view ignores only our
 * invisibility for one recognizing observer. The live actor, token and effects never change.
 */
export function elementalIllusionVisibilityTarget(visionSource,target){
 const document=target?.document,actor=document?.actor,observer=visionSource?.object?.document?.actor,state=actor?.flags?.[S]?.elementalState?.illusionDouble;
 if(!state?.active||!state.useId||!observer?.uuid)return target;
 const record=actor.flags[S].elementalProjections?.[state.useId];
 if(!record?.active||!record.registered||record.kind!=='illusionDouble'||record.sourceActorUuid!==actor.uuid||record.sourceTokenUuid!==document.uuid)return target;
 const invisible=globalThis.CONFIG?.specialStatusEffects?.INVISIBLE??'invisible',effects=Array.from(new Set([...actor.effects??[],...actor.appliedEffects??[]])).filter(active);
 if(!effects.some(effect=>owns(effect,actor,state.useId)&&effect.statuses?.has?.(invisible)))return target;
 // An independently acquired invisible status must continue to be handled by native vision.
 if(effects.some(effect=>!owns(effect,actor,state.useId)&&effect.statuses?.has?.(invisible)))return target;
 if(elementalIllusionRecognition(actor,observer,{useId:state.useId,recognition:state.recognition}).outcome!=='recognizes')return target;
 const visibleDocument=new Proxy(document,{get(original,key){
  if(key==='hasStatusEffect')return status=>status===invisible?false:original.hasStatusEffect(status);
  const value=Reflect.get(original,key,original);return typeof value==='function'?value.bind(original):value;
 }});
 return new Proxy(target,{get(original,key){if(key==='document')return visibleDocument;const value=Reflect.get(original,key,original);return typeof value==='function'?value.bind(original):value;}});
}
/** Install after native detection modes are configured. No global hidden flags or visual flashes. */
export function registerElementalIllusionVisionHooks(){
 const modes=globalThis.CONFIG?.Canvas?.detectionModes??{};
 for(const id of ['basicSight','lightPerception','darkvision']){
  const mode=modes[id],original=mode?.testVisibility;if(!original||original[wrapped])continue;
  const test=function(visionSource,configuration,config){const target=elementalIllusionVisibilityTarget(visionSource,config.object);return original.call(this,visionSource,configuration,target===config.object?config:{...config,object:target});};
  Object.defineProperty(test,wrapped,{value:true});mode.testVisibility=test;
 }
 if(registerElementalIllusionVisionHooks.installed)return;registerElementalIllusionVisionHooks.installed=true;
 let queued=false;const refresh=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;globalThis.canvas?.perception?.update?.({refreshVision:true,refreshVisibility:true});});};
 globalThis.Hooks?.on?.('updateActor',refresh);globalThis.Hooks?.on?.('createActiveEffect',refresh);globalThis.Hooks?.on?.('updateActiveEffect',refresh);globalThis.Hooks?.on?.('deleteActiveEffect',refresh);
}
