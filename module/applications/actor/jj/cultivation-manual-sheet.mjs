import {cultivationManualClassification} from '../../../systems/cultivation-manual.mjs';
import {isCultivator} from '../../../systems/cultivator-rules.mjs';
import {WUXIA_TAB_IMAGES} from '../../../systems/wuxia-tab-art.mjs';
/** Compatibility keys keep existing native techniques and template bundles usable. */
export const MANUAL_GROUPS=Object.freeze([
  {id:'inata',label:'Fundamentos',tecnicasLabel:'Técnicas dos fundamentos',description:'Princípios e habilidades que sustentam o manual.'},
  {id:'m1',label:'Primeira manifestação',tecnicasLabel:'Técnicas da primeira manifestação',description:'O primeiro conjunto de habilidades do seu caminho.'},
  {id:'m2',label:'Segunda manifestação',tecnicasLabel:'Técnicas da segunda manifestação',description:'Desenvolvimentos e variações do manual.'},
  {id:'m3',label:'Terceira manifestação',tecnicasLabel:'Técnicas da terceira manifestação',description:'As expressões mais avançadas do manual.'}
].map(Object.freeze));
const flag=(actor,key)=>actor?.getFlag?.('Immortals-system',key)??actor?.flags?.['Immortals-system']?.[key];
export function prepareManualContext(actor,legacy={}, {editable=false}={}) {
  if(actor?.limited)return{hidden:true,name:'',slots:[],editable:false};
  const {proficiencia,tiers,manipulacoes,...data}=legacy;
  const classification=cultivationManualClassification({rank:flag(actor,'manualRarity'),quality:flag(actor,'manualClass')??(isCultivator(actor)?'inferior':undefined)});
  const slots=MANUAL_GROUPS.map(group=>({...data.slots?.find(slot=>slot.id===group.id),...group}));
  return {...data,...classification,slots,name:flag(actor,'cultivationManualName')??data.name??'',
    image:WUXIA_TAB_IMAGES[actor?.type??'character']?.cultivationManual,
    editable:editable&&actor?.isOwner!==false,requirementMax:30,
    techniqueCount:slots.reduce((sum,slot)=>sum+(slot.tecnicas?.length??0),0)};
}

/** Classification controls share cultivation flags without duplicate form names. */
export function bindManualSheet(sheet) {
  const root=sheet.element?.querySelector('.iw-cultivation-manual');if(!root)return;
  for(const input of root.querySelectorAll('[data-manual-field]')) {
    if(input.dataset.bound)continue;input.dataset.bound='true';
    input.addEventListener('change',async()=>{
      if(!sheet.isEditable||sheet.actor.isOwner===false||sheet.actor.limited)return;
      const key=input.dataset.manualField;if(!['manualRarity','manualClass'].includes(key))return;
      const classification=cultivationManualClassification({rank:flag(sheet.actor,'manualRarity'),quality:flag(sheet.actor,'manualClass')??(isCultivator(sheet.actor)?'inferior':undefined)});
      const choices=key==='manualRarity'?classification.rankOptions:classification.qualityOptions;
      if(!choices.some(option=>option.value===input.value))return;
      await sheet.actor.setFlag('Immortals-system',key,input.value);
    });
  }
}

/** Template metadata is optional; old bundles without it do not rewrite the current manual. */
export function manualTemplateActorUpdates(manual={}) {
  const updates={};
  if(typeof manual.name==='string'&&manual.name.trim())updates['flags.Immortals-system.cultivationManualName']=manual.name.trim().slice(0,120);
  const classification=cultivationManualClassification({rank:manual.rank,quality:manual.quality});
  if(typeof manual.rank==='string'&&manual.rank.trim()&&manual.rank.length<=80)updates['flags.Immortals-system.manualRarity']=classification.rank;
  if(typeof manual.quality==='string'&&manual.quality.trim()&&manual.quality.length<=80)updates['flags.Immortals-system.manualClass']=classification.quality;
  return updates;
}
