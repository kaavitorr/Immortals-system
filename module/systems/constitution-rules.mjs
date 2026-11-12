import {destinyState} from './cultivation-destiny.mjs';
import {CONSTITUTIONS,CONSTITUTION_RARITIES} from './constitutions-data.mjs';
import {CONCEITO_POR_ID} from './elemental-concepts-data.mjs';
const SCOPE='Immortals-system',PATH='flags.'+SCOPE+'.constitution';
const definitions=new Map(CONSTITUTIONS.map(d=>[d.id,d]));
const rarityOf=id=>CONSTITUTION_RARITIES.find(r=>r.id===id);
const integer=(value,fallback=0)=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):fallback;
const rawState=actor=>actor?.flags?.[SCOPE]?.constitution??{};
const DEVOURER='supreme-corpo-devorador-de-constituicoes';
const YANG=['fogo','metal','relampago','luz'],YIN=['agua','gelo','ilusao','escuridao'];
export const constitutionDefinition=id=>definitions.get(id)??null;
export const constitutionCultivationRank=actor=>actor?.type==='npc'?Math.max(1,Math.min(10,Math.ceil((integer(actor.system?.legacy2?.nd)||1)/3))):Math.max(1,Math.min(10,integer(actor?.system?.cultivation?.rank)||1));
function selection(value,{strict=false,absorbed=false}={}){
 if(!value)return null;
 const def=definitions.get(value.id);if(!def){if(strict)throw Error('Constituição desconhecida.');return null;}
 if(absorbed&&def.rarity==='supreme'){if(strict)throw Error('O Devorador não pode absorver constituições Supremas.');return null;}
 const rarity=rarityOf(def.rarity),quality=value.quality??rarity.qualities[0];
 if(!rarity.qualities.includes(quality)){if(strict)throw Error('Classe inválida para esta constituição.');return null;}
 const raw=Array.isArray(value.affinities)?value.affinities:[],affinities=[...new Set(raw.filter(id=>Object.hasOwn(CONCEITO_POR_ID,id)))];
 const capacity=def.mechanics.affinityCount??0;
 if(strict&&raw.length!==affinities.length)throw Error('Afinidade inválida ou repetida.');
 if(strict&&affinities.length>capacity)throw Error('Quantidade de afinidades elementais excedida.');
 if(strict&&!def.mechanics.advancedAffinities&&affinities.some(id=>CONCEITO_POR_ID[id].raridade==='avancado'))throw Error('Esta constituição não aceita afinidade com elemento avançado.');
 const legal=affinities.filter(id=>def.mechanics.advancedAffinities||CONCEITO_POR_ID[id].raridade!=='avancado').slice(0,capacity);
 return {id:def.id,quality,affinities:legal};
}
/** Read-only view: malformed flags never grant an arbitrary constitution or absorbed slots. */
export function constitutionState(actor,{worldTime=globalThis.game?.time?.worldTime}={}){
 const raw=rawState(actor),rank=constitutionCultivationRank(actor),primary=selection(raw.primary),absorbed=[];
 if(primary?.id===DEVOURER)for(const value of Array.isArray(raw.absorbed)?raw.absorbed.slice(0,3):[]){const s=selection(value,{absorbed:true});if(s&&!absorbed.some(v=>v.id===s.id))absorbed.push(s);}
 const entry=(s,slot)=>{const definition=definitions.get(s.id);return {...s,slot,definition,rarity:rarityOf(definition.rarity),baseActive:rank>=definition.minimumRank,additionalActive:definition.additionalRank!==null&&rank>=definition.additionalRank,affinityReady:s.affinities.length===(definition.mechanics.affinityCount??0)};};
 const main=primary?entry(primary,'primary'):null,entries=main?[main,...absorbed.map((s,i)=>entry(s,i))]:[];
 const forms=(Array.isArray(raw.forms)?raw.forms:[]).filter((form,i,list)=>entries.some(e=>e.id===form.constitutionId&&e.baseActive&&['wrath','blood'].includes(e.definition.mechanics.family))&&list.findIndex(v=>v.constitutionId===form.constitutionId)===i&&(!Number.isFinite(worldTime)||!Number.isFinite(form.expiresAt)||form.expiresAt>worldTime));
 return {version:1,revision:integer(raw.revision),rank,primary:main,absorbed:entries.slice(1),entries,forms,context:structuredClone(raw.context??{}),isDevourer:primary?.id===DEVOURER,empty:!primary};
}
/** Only a new primary constitution is constrained; subsequent narrated evolution stays available. */
export function requiresReincarnatedInitialConstitution(actor){return destinyState(actor).key==='reincarnated'&&!actor?.flags?.[SCOPE]?.cultivationDestiny?.constitutionStartFulfilled&&!constitutionState(actor).primary;}
/** One whitelisted record replaces arrays atomically under native recursive flag merges. */
export function constitutionSelectionUpdates(actor,value,{slot='primary',expectedRevision}={}){
 const current=constitutionState(actor),raw=rawState(actor);
 if(expectedRevision!==undefined&&expectedRevision!==current.revision)throw Error('A constituição mudou. Abra a escolha novamente.');
 const isMain=slot==='primary';if(!isMain&&(!Number.isInteger(slot)||slot<0||slot>2))throw Error('Espaço de constituição inválido.');
 if(!isMain&&!current.isDevourer)throw Error('Somente o Corpo Devorador pode receber constituições adicionais.');
 const next=selection(value,{strict:true,absorbed:!isMain});let primary=current.primary?selection(current.primary):null,absorbed=current.absorbed.map(selectionValue=>selection(selectionValue));
 if(isMain){if(primary?.id!==next?.id)absorbed=[];primary=next;}else{if(next&&absorbed.some((s,i)=>i!==slot&&s.id===next.id))throw Error('Constituição absorvida duplicada.');if(next)absorbed[slot]=next;else absorbed.splice(slot,1);absorbed=absorbed.filter(Boolean);}
 if(isMain&&next&&requiresReincarnatedInitialConstitution(actor)&&(definitions.get(next.id)?.rarity!=='human'||next.quality!=='inferior'))throw Error('A constituição inicial do Cultivador Reencarnado deve ser Humano Inferior.');
 if(primary?.id!==DEVOURER)absorbed=[];
 const record={version:1,revision:current.revision+1,primary,absorbed,forms:[],context:structuredClone(raw.context??{})};
 const updates={[PATH]:record};if(isMain&&destinyState(actor).key==='reincarnated'&&(next||current.primary))updates['flags.'+SCOPE+'.cultivationDestiny.constitutionStartFulfilled']=true;return updates;
}
/** Source-based modifiers are derived, never written over attributes, proficiencies or cultivation levels. */
export function constitutionModifiers(actor){
 const state=constitutionState(actor),context=state.context;
 const result={absorptionMultiplier:1,stageEssenceMultiplier:1,rankEssenceMultiplier:1,normalPCFactor:1,freeCultivationThroughRank:0,breakthroughCDReduction:0,breakthroughStage:1,noTribulation:false,toxinImmune:false,pillRepeatMultiplier:1,pillToxinFactor:1,pillEffectMultiplier:1,knownPillDCReduction:0,newPillDCReduction:0,crystalMultiplier:1,minimumPillLevel:0,minimumTreasureRarityLevel:0,pending:[]};
 for(const entry of state.entries){const m=entry.definition.mechanics;
  if(entry.baseActive){
   if(m.family==='celestial-absorption')result.absorptionMultiplier*=m.absorptionMultiplier;
   result.freeCultivationThroughRank=Math.max(result.freeCultivationThroughRank,m.freeCultivationThroughRank??0);
   if(m.family==='tribulation'){result.breakthroughCDReduction=Math.max(result.breakthroughCDReduction,m.breakthroughCDReduction);result.breakthroughStage=2;}
   if(m.family==='alchemy'){result.toxinImmune ||=m.toxinImmune;result.pillRepeatMultiplier*=m.pillRepeatMultiplier;result.pillToxinFactor*=m.toxinImmune?0:1/m.toxinDivisor;result.pillEffectMultiplier*=m.pillEffectMultiplier;}
   if(m.family==='heaven-refiner')result.normalPCFactor*=.5;
   if(m.family==='omni')result.rankEssenceMultiplier*=2;
   if(m.family==='celestial-god'){result.noTribulation=true;result.toxinImmune=true;result.minimumPillLevel=5;result.minimumTreasureRarityLevel=7;}
   if(m.family==='devourer'){
    const mode=context.devourerCounting;if(['additional','all'].includes(mode)){const factor=2**(state.absorbed.length+(mode==='all'?1:0));result.stageEssenceMultiplier*=factor;result.rankEssenceMultiplier*=factor;}else result.pending.push('Defina com o Narrador se a maldição conta apenas as absorvidas ou também a constituição Devoradora.');
   }
  }
  if(entry.additionalActive){
   if(m.family==='celestial-absorption'&&m.crystalMultiplier>1){result.crystalMultiplier*=m.crystalMultiplier;result.pending.push('O bônus de quantidade recebida dos cristais precisa de uma regra de conversão; a reserva continua usando o consumo normal.');}
   if(m.family==='alchemy'){result.knownPillDCReduction+=m.knownPillDCReduction;result.newPillDCReduction+=m.newPillDCReduction;}
   if(m.family==='yang'||m.family==='yin'){if(context.dualPartner===(m.family==='yang'?'yin':'yang'))result.absorptionMultiplier*=m.dualCultivationMultiplier;if(context.zoneAspect===m.family)result.absorptionMultiplier*=m.zoneMultiplier;}
   if(m.family==='wrath'&&context.demonicQi===true)result.absorptionMultiplier*=m.demonicAbsorptionMultiplier;
  }
 }
 result.pending=[...new Set(result.pending)];return result;
}
/** Read-only training discounts; callers persist claims only with a real paid attempt. */
export function constitutionTrainingModifiers(actor,elementId,targetLevel){
 const state=constitutionState(actor),element=CONCEITO_POR_ID[elementId];const result={pcFactor:1,qiFactor:1,timeFactor:1,cdFactor:1,freePC:false,basicCosts:false,ignoreCore:false,claims:[]};if(!element)return result;
 for(const entry of state.entries){if(!entry.baseActive)continue;const m=entry.definition.mechanics;
  if(m.family==='elemental'&&entry.affinityReady&&entry.affinities.includes(elementId)||m.family==='omni'){result.pcFactor*=.5;result.qiFactor*=.5;result.timeFactor*=.5;if(m.family==='omni')result.basicCosts=true;}
  if((m.family==='yang'&&YANG.includes(elementId))||(m.family==='yin'&&YIN.includes(elementId))){result.pcFactor*=m.trainingPCFactor;result.qiFactor*=m.trainingQiFactor;result.timeFactor*=m.trainingTimeFactor;if(targetLevel<=m.freeElementLevel)result.freePC=true;}
  if(m.family==='heaven-refiner')result.pcFactor*=2;
  if(m.family==='tribulation'){
   const key=entry.id+':'+state.rank,used=actor?.flags?.[SCOPE]?.constitutionStudyLedger?.[key]??[];
   if(used.includes(elementId)||used.length<2){result.pcFactor*=.5;result.qiFactor*=.5;result.cdFactor*=.5;result.ignoreCore=true;if(!used.includes(elementId))result.claims.push({key,elementId});}
  }
 }
 return result;
}
export function constitutionStudyUpdates(actor,claims){const result={};for(const claim of claims??[]){const path='flags.'+SCOPE+'.constitutionStudyLedger.'+claim.key;const used=actor?.flags?.[SCOPE]?.constitutionStudyLedger?.[claim.key]??[];if(!used.includes(claim.elementId)&&used.length<2)result[path]=[...used,claim.elementId];}return result;}
