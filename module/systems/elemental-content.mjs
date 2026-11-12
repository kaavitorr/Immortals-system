import {ELEMENT_ABILITIES} from './elemental-abilities-data.mjs';
import {CONCEITO_POR_ID} from './elemental-concepts-data.mjs';
import {elementalNativeData,elementalStableId} from './elemental-activity-data.mjs';

export const ELEMENTAL_CONTENT_VERSION=2;
export const ELEMENTAL_FOLDER_ID=elementalStableId('elemental:folder:root');
const SCOPE='Immortals-system';
const TIER_NAMES=['Inicial','Dominado','Perfeição'];

/** Replace source action/star glyphs with accessible words in native descriptions. */
function bookHtml(text='') {
  return text.replace(/\[(⬢+)\]/gu,(_,actions)=>'['+actions.length+' '+(actions.length===1?'ação':'ações')+']')
    .replace(/⬢/gu,'ação').replace(/★/gu,'');
}
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function folder(elementId) {
  const concept=CONCEITO_POR_ID[elementId];
  return {_id:elementId?elementalStableId('elemental:folder:'+elementId):ELEMENTAL_FOLDER_ID,
    name:concept?.label??'Habilidades Elementais',type:'Item',folder:elementId?ELEMENTAL_FOLDER_ID:null,
    color:concept?.cor??'#655347',sorting:'a',flags:{[SCOPE]:{elementalFolder:elementId||'root',elementalContentVersion:ELEMENTAL_CONTENT_VERSION}}};
}

/** Create one current-tier native feat; tier requirements and acquisition are enforced by the owner workflow. */
export function elementalFeatureDocument(elementId,abilityId,tier=1,{qiPool='generated'}={}) {
  const concept=CONCEITO_POR_ID[elementId],ability=ELEMENT_ABILITIES[elementId]?.find(entry=>entry.id===abilityId);
  if(!concept||!ability)throw new RangeError('Elemento ou habilidade elemental desconhecida.');
  if(!Number.isInteger(tier)||tier<1||tier>3||(ability.level10&&tier!==1))throw new RangeError('Tier elemental inválido.');
  const native=elementalNativeData(elementId,abilityId,tier,{qiPool});
  const sections=[['Inicial',ability.desc],...(!ability.level10?[['Dominado',ability.dominado],['Perfeição',ability.perfeicao]]:[])];
  const rules=sections.filter(([,html])=>html).map(([label,html])=>'<h3>'+label+'</h3>'+bookHtml(html)).join('');
  const current=bookHtml(ability.desc+(tier>1?(ability.dominado??''):'')+(tier>2?(ability.perfeicao??''):''));
  const boundaries=native.manual.length?'<p><strong>Resolução:</strong> '+native.manual.map(escape).join(' ')+'</p>':'';
  const pending=native.pending.length?'<p><strong>Regra pendente:</strong> '+native.pending.map(escape).join(' ')+'</p>':'';
  for(const activity of Object.values(native.activities)) {
    activity.img=concept.icon;
    activity.description.value='<p><strong>'+escape(ability.name)+' — '+(ability.level10?'Nível 10':TIER_NAMES[tier-1])+'</strong></p>'+current+boundaries+pending;
    activity.description.chatFlavor=ability.name+' — '+activity.name;
  }
  return {_id:elementalStableId('elemental:'+elementId+':'+abilityId),name:ability.name,type:'feat',
    folder:elementalStableId('elemental:folder:'+elementId),img:concept.icon,effects:native.effects,
    system:{identifier:'elemental-'+elementId+'-'+abilityId.replace(/[A-Z]/g,l=>'-'+l.toLowerCase()),
      type:{value:'class'},description:{value:'<p><strong>Conceito:</strong> '+escape(concept.label)+'. <strong>Forma atual:</strong> '+(ability.level10?'Nível 10':TIER_NAMES[tier-1])+'.</p>'+rules+boundaries+pending},
      activities:native.activities,...(native.uses?{uses:native.uses}:{})},
    flags:{[SCOPE]:{elementalManaged:true,elementalAbility:{elementId,abilityId,tier},elementalContentVersion:ELEMENTAL_CONTENT_VERSION,
      elementalAutomation:{rules:native.rules,manual:native.manual,pending:native.pending},featureSection:'jj-elemental'}}};
}

/** Root and element folders followed by all 52 default feats; no live compendium is mutated. */
export function elementalCompendiumDocuments({qiPool='generated',childFolders=true}={}) {
  const documents=[folder()];
  if(childFolders)for(const elementId of Object.keys(ELEMENT_ABILITIES))documents.push(folder(elementId));
  for(const [elementId,abilities] of Object.entries(ELEMENT_ABILITIES))for(const ability of abilities) {
    const item=elementalFeatureDocument(elementId,ability.id,1,{qiPool});
    if(!childFolders)item.folder=ELEMENTAL_FOLDER_ID;
    documents.push(item);
  }
  return documents;
}
