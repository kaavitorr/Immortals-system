import {MANUAL_RANKS,MANUAL_QUALITIES,cultivationManualClassification} from './cultivation-manual.mjs';
import {isCultivator} from './cultivator-rules.mjs';
import {destinyState,destinyManualAllowed} from './cultivation-destiny.mjs';
const scope='Immortals-system',prefix='flags.'+scope+'.';
const flag=(actor,key)=>actor?.getFlag?.(scope,key)??actor?.flags?.[scope]?.[key];
const int=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
const validRate=value=>value===null||value===undefined||value===''?null:typeof value!=='boolean'&&Number.isFinite(Number(value))&&Number(value)>=0?Math.floor(Number(value)):undefined;
export function divineManualState(actor){
 const classification=cultivationManualClassification({rank:flag(actor,'manualRarity'),quality:flag(actor,'manualClass')??'inferior'});
 const saved=flag(actor,'divineManual')??{},assimilations=Array.isArray(saved.assimilations)?structuredClone(saved.assimilations):[],destiny=destinyState(actor),unlimited=destiny.key==='unrivaled-genius',maximumActive=unlimited?2:1;
 const savedIndices=Array.isArray(saved.activeAssimilations)?saved.activeAssimilations.filter(i=>Number.isInteger(i)&&i>=0&&i<assimilations.length):assimilations.map((_a,i)=>i).slice(-maximumActive);
 const selectedIndices=[...new Set(savedIndices)].slice(-maximumActive);
 const activeIndices=selectedIndices.filter(i=>destinyManualAllowed(actor,assimilations[i]?.elements??[]));
 const index=Math.max(0,MANUAL_RANKS.findIndex(rank=>rank.value===classification.rank)),absorption=MANUAL_RANKS[Math.min(MANUAL_RANKS.length-1,index+1)];
 const stored=Array.isArray(saved.mantras)?structuredClone(saved.mantras).slice(0,2):[];
 const fallback={name:'Mantra de cultivo',text:flag(actor,'mantraText')??'',essencePerDay:validRate(flag(actor,'manualEssencePerDay'))??null};
 const storedActive=Math.min(Math.max(0,stored.length-1),int(saved.activeMantra));
 const mantras=unlimited?(stored.length?stored:[fallback]):[stored[storedActive]??fallback];
 const activeMantra=unlimited?Math.min(mantras.length-1,storedActive):0;
 mantras[activeMantra]={...mantras[activeMantra],text:flag(actor,'mantraText')??mantras[activeMantra].text??'',essencePerDay:validRate(flag(actor,'manualEssencePerDay'))??null};
 return {...classification,title:saved.sealed===false?'Manual Supremo':'Manual Supremo Selado',active:isCultivator(actor),sealed:saved.sealed!==false,assimilations,unlimited,maximumActive,selectedIndices,activeIndices,activeAssimilations:activeIndices.map(i=>({...assimilations[i],index:i})),remaining:Math.max(0,3-assimilations.length),absorptionRank:absorption.value,absorptionRankLabel:absorption.label,absorptionRealm:destiny.absorptionRealm,absorptionRealmLabel:destiny.absorptionRealmLabel,mantras,activeMantra,activeMantraSlot:storedActive,maximumMantras:maximumActive};
}
export function prepareDivineManualStudy(actor,{rank,quality,name,properties='',assimilate=false,elements=[],replaceIndex}={}){
 const current=divineManualState(actor),rankIndex=MANUAL_RANKS.findIndex(o=>o.value===rank),qualityIndex=MANUAL_QUALITIES.findIndex(o=>o.value===quality);
 if(!current.active||rankIndex<0||qualityIndex<0||typeof name!=='string'||!name.trim())throw Error('Confira o nome e a classificação do manual estudado.');
 if(!destinyManualAllowed(actor,elements))throw Error('Este manual não pertence à afinidade da sua Linhagem Divina.');
 if(assimilate&&!current.unlimited&&current.remaining<1)throw Error('As três oportunidades de assimilação já foram utilizadas.');
 const currentRank=Math.max(0,MANUAL_RANKS.findIndex(o=>o.value===current.rank)),currentQuality=Math.max(0,MANUAL_QUALITIES.findIndex(o=>o.value===current.quality));
 const upgrade=rankIndex>currentRank||(rankIndex===currentRank&&qualityIndex>currentQuality),saved=flag(actor,'divineManual')??{},assimilations=[...current.assimilations];
 let indices=[...current.selectedIndices];
 if(assimilate){
  assimilations.push({name:name.trim().slice(0,160),rank,quality,properties:typeof properties==='string'?properties.slice(0,30000):'',elements:[...elements]});
  if(current.unlimited){if(indices.length>=2){const replace=replaceIndex===undefined?indices[0]:Number(replaceIndex);if(!indices.includes(replace))throw Error('Escolha qual manual ativo será substituído.');indices=indices.filter(i=>i!==replace);}indices.push(assimilations.length-1);}
  else indices=[assimilations.length-1];
 }
 return {[prefix+'manualRarity']:upgrade?rank:current.rank,[prefix+'manualClass']:upgrade?quality:current.quality,[prefix+'divineManual']:{...saved,sealed:saved.sealed!==false,assimilations,activeAssimilations:indices}};
}
/** The active mantra alone feeds the existing daily calendar and crystal calculation. */
export function prepareDivineManualMantras(actor,{mantras,activeMantra=0}={}){
 const current=divineManualState(actor);
 if(!current.active||!Array.isArray(mantras)||mantras.length<1||mantras.length>current.maximumMantras)throw Error('Confira a quantidade de mantras permitidos pelo destino.');
 if(!Number.isInteger(activeMantra)||activeMantra<0||activeMantra>=mantras.length)throw Error('Escolha um único mantra ativo.');
 const normalized=mantras.map((m,i)=>{const rate=validRate(m?.essencePerDay);if(rate===undefined)throw Error('A absorção deve ser um número positivo, zero ou ficar em branco.');return {name:String(m?.name??'Mantra '+(i+1)).trim().slice(0,160)||'Mantra '+(i+1),text:String(m?.text??'').slice(0,30000),essencePerDay:rate};});
 const saved=flag(actor,'divineManual')??{},selected=normalized[activeMantra],updates={[prefix+'divineManual']:{...saved,mantras:normalized,activeMantra},[prefix+'mantraText']:selected.text};
 if(selected.essencePerDay===null)updates[prefix+'-=manualEssencePerDay']=null;else updates[prefix+'manualEssencePerDay']=selected.essencePerDay;
 return updates;
}
export function prepareDivineManualActivation(actor,indices){
 const state=divineManualState(actor);
 if(!state.active||!state.unlimited||!Array.isArray(indices)||indices.length>2||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=state.assimilations.length))throw Error('Escolha até dois manuais assimilados para manter ativos.');
 return {[prefix+'divineManual']:{...(flag(actor,'divineManual')??{}),activeAssimilations:[...indices]}};
}

/** Confirm only missing legacy metadata; this never changes a manual's powers or assimilation count. */
export function prepareDivineManualIdentification(actor,{index,elements=[],confirmedByNarrator=false}={}){
 const state=divineManualState(actor),saved=flag(actor,'divineManual')??{};
 if(!state.active||destinyState(actor).key!=='divine-lineage'||confirmedByNarrator!==true||!Number.isInteger(index)||index<0||index>=state.assimilations.length)throw Error('Confirme com o narrador a afinidade de um manual antigo.');
 if(state.assimilations[index].elements?.length)throw Error('A afinidade deste manual já está registrada.');
 if(!destinyManualAllowed(actor,elements))throw Error('Esta afinidade não é compatível com sua Linhagem Divina.');
 const assimilations=structuredClone(state.assimilations);assimilations[index].elements=[...elements];
 return {[prefix+'divineManual']:{...saved,assimilations}};
}

/** Change only the active mantra fields, retaining the other stored mantra across destiny changes. */
export function prepareDivineManualMantraEdit(actor,input={}){
 const current=divineManualState(actor),saved=flag(actor,'divineManual')??{};
 if(!current.active||!input||typeof input!=='object'||Array.isArray(input)||!['text','essencePerDay'].some(key=>Object.hasOwn(input,key))||Object.keys(input).some(key=>!['text','essencePerDay','mantraIndex'].includes(key)))throw Error('Informe o texto ou a absorção do mantra ativo.');
 const stored=Array.isArray(saved.mantras)?structuredClone(saved.mantras).slice(0,2):[];
 const index=stored.length?Math.min(stored.length-1,int(saved.activeMantra)):0;
 if(Object.hasOwn(input,'mantraIndex')&&(!Number.isInteger(input.mantraIndex)||input.mantraIndex!==index))throw Error('O mantra ativo mudou; edite novamente o mantra exibido.');
 const active={...(stored[index]??current.mantras[current.activeMantra])};
 active.text=flag(actor,'mantraText')??active.text??'';
 active.essencePerDay=validRate(flag(actor,'manualEssencePerDay'))??null;
 if(Object.hasOwn(input,'text')){
  if(typeof input.text!=='string')throw Error('O texto do mantra deve ser um texto válido.');
  active.text=input.text.slice(0,30000);
 }
 if(Object.hasOwn(input,'essencePerDay')){
  const rate=validRate(input.essencePerDay);
  if(rate===undefined)throw Error('A absorção deve ser um número positivo, zero ou ficar em branco.');
  active.essencePerDay=rate;
 }
 stored[index]=active;
 const updates={[prefix+'divineManual']:{...saved,mantras:stored,activeMantra:index},[prefix+'mantraText']:active.text};
 if(active.essencePerDay===null)updates[prefix+'-=manualEssencePerDay']=null;else updates[prefix+'manualEssencePerDay']=active.essencePerDay;
 return updates;
}
