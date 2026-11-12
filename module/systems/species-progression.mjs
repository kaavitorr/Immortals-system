import {cultivatorProgression} from "./cultivator-rules.mjs";
import {qiTalentRequirement} from './qi-talents-rules.mjs';
import {QI_TALENTS} from './qi-talents-data.mjs';
const scope='Immortals-system';
/** Racial gifts stay owned by their native advancement, outside purchased talent choices. */
export function speciesGrantedTalentNames(actor){
 return Array.from(actor?.items?.values?.()??actor?.items??[]).filter(i=>i.flags?.[scope]?.speciesTalentGrant&&i.flags?.[scope]?.talentoQi).map(i=>QI_TALENTS.find(t=>t.id===i.flags[scope].talentoQi.id)?.name??i.name);
}
export function speciesTalentAllowed(actor,item,{allowOwned=false}={}){
 const meta=item?.flags?.[scope]?.talentoQi;
 if(!meta)return false;
 const owned=Array.from(actor?.items?.values?.()??actor?.items??[]),ids=new Set(owned.map(i=>i.flags?.[scope]?.talentoQi?.id).filter(Boolean));
 if(ids.has(meta.id)&&!allowOwned)return false;
 return !meta.requirementRules||qiTalentRequirement(actor,meta.requirementRules,{has:id=>ids.has(id),learnedCount:ids.size}).ok;
}
/** Never rerun completed initial grants when cultivation changes. */
export function pendingSpeciesSteps(manager,level){
 const steps=[];
 for(const item of manager.clone.items){
  const flags=item.flags?.[scope];if(!flags?.species&&!flags?.speciesFeature)continue;
  for(let l=0;l<=level;l++)for(const flow of manager.constructor.flowsForLevel(item,l)){
   const a=flow.advancement,complete=(a.type??a.constructor?.typeName)==='ItemChoice'?a.getCounts(l).full:a.configuredForLevel(l);
   if(!complete)steps.push({type:'forward',flow,level});
  }
 }
 return steps;
}
export function registerSpeciesProgression(hooks){
 const pending=new Set();
 hooks.on('updateActor',async(actor,changes,options,userId)=>{
  if(userId!==globalThis.game?.user?.id||actor.type!=='character'||!actor.isOwner||pending.has(actor.uuid))return;
  const cultivation=changes.system?.cultivation;
  if(!cultivation?.rank&&!cultivation?.stage&&!Object.hasOwn(changes,'system.cultivation.rank')&&!Object.hasOwn(changes,'system.cultivation.stage'))return;
  if(!actor.itemTypes?.race?.some(i=>i.flags?.[scope]?.species))return;
  pending.add(actor.uuid);
  try{
   const Manager=(await import('../applications/advancement/advancement-manager.mjs')).default;
   class SpeciesManager extends Manager {
    _onClose(options){try{return super._onClose(options);}finally{pending.delete(actor.uuid);}}
   }
   const manager=new SpeciesManager(actor,{automaticApplication:true});
   manager.steps=pendingSpeciesSteps(manager,cultivatorProgression(actor).level);
   if(manager.steps.length){await manager.render({force:true});return;}
   pending.delete(actor.uuid);
  }catch(error){pending.delete(actor.uuid);console.error('Immortals Legacy | Progressão de Espécie',error);globalThis.ui?.notifications?.warn?.('Não foi possível abrir a progressão da espécie. Abra a Progressão do item para concluir os benefícios.');}
 });
}

/** Follow native receipts across separate racial choices when a prerequisite is removed. */
export async function revalidateSpeciesTalentGrants(actor){
 for(let pass=0;pass<100;pass++){
  let removed=false;
  for(const item of Array.from(actor?.items?.values?.()??actor?.items??[])){
   if(!item.flags?.[scope]?.speciesTalentGrant||speciesTalentAllowed(actor,item,{allowOwned:true}))continue;
   const origin=item.flags?.[scope]?.advancementOrigin??item.flags?.JujutsuLegacy?.advancementOrigin;
   const [parentId,advanceId]=String(origin??'').split('.'),parent=actor.items.get(parentId),advance=parent?.advancement?.byId?.[advanceId];
   if(!advance||!advance.configuration?.speciesTalents)continue;
   const id=item.id??item._id,found=Object.entries(advance.value.added??{}).find(([,added])=>Object.hasOwn(added,id));
   if(!found)continue;
   await advance.reverse(Number(found[0]),{uuid:found[1][id],skipEvaluation:true});removed=true;
  }
  if(!removed)return;
 }
 throw Error('Não foi possível estabilizar os requisitos dos talentos da espécie.');
}
