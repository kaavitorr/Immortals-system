import {qiTalentImage} from "./general-content-art.mjs";
import {QI_TALENTS,QI_TALENT_CATEGORIES} from './qi-talents-data.mjs';
import {qiTalentNativeData,qiTalentStableId} from './qi-talents-activities.mjs';
const SCOPE='Immortals-system';
export const QI_TALENTS_CONTENT_VERSION=1;
export const QI_TALENTS_FOLDER_ID=qiTalentStableId('qi-talents:folder:root');
const categories={
 'Habilidades de Qi':{color:'#4e8f9f',icon:'systems/Immortals-system/icons/svg/items/spell.svg'},
 'Adaptação Física':{color:'#b57859',icon:'systems/Immortals-system/icons/svg/items/weapon.svg'},
 'Habilidades Especiais':{color:'#6f8793',icon:'systems/Immortals-system/icons/svg/items/feature.svg'},
 'Imortalidade':{color:'#bb9e57',icon:'systems/Immortals-system/icons/svg/conceitos/luz.svg'}
};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=value=>Array.isArray(value)?value:value?[String(value)]:[];
/** Accessible text replaces the action glyph from the supplied source. */
function bookHtml(html=''){return String(html).replace(/\[(⬢+)\]/gu,(_,actions)=>'['+actions.length+' '+(actions.length===1?'ação':'ações')+']').replace(/⬢/gu,'ação').replace(/★/gu,'');}
export const qiTalentCategoryFolderId=category=>qiTalentStableId('qi-talents:folder:'+category);
function folder(category){return {_id:category?qiTalentCategoryFolderId(category):QI_TALENTS_FOLDER_ID,name:category??'Talentos de Qi',type:'Item',folder:category?QI_TALENTS_FOLDER_ID:null,sorting:'a',color:categories[category]?.color??'#bb9e57',flags:{[SCOPE]:{qiTalentsFolder:category??'root',qiTalentsContentVersion:QI_TALENTS_CONTENT_VERSION}}};}
/** One source-independent native feat; learning and actor-derived passives belong to the sheet workflow. */
export function qiTalentDocument(id){
 const talent=QI_TALENTS.find(entry=>entry.id===id);if(!talent)throw new RangeError('Talento de Qi desconhecido.');
 const native=qiTalentNativeData(id),img=qiTalentImage(id);
 const manual=[...new Set([...list(talent.manual),...native.manual])],pending=[...new Set([...list(talent.pending),...native.pending])];
 const boundaries=manual.length?'<p><strong>Resolução:</strong> '+manual.map(escape).join(' ')+'</p>':'';
 const unresolved=pending.length?'<p><strong>Pendente:</strong> '+pending.map(escape).join(' ')+'</p>':'';
 const source=bookHtml(talent.descriptionHTML??talent.description),description='<p><strong>Categoria:</strong> '+escape(talent.category)+'. <strong>Caminho:</strong> '+escape(talent.path)+'.</p>'+source+boundaries+unresolved;
 for(const activity of Object.values(native.activities)){activity.img=img;const metadata=activity.flags[SCOPE].qiTalentActivity;activity.description.value=description+(metadata.pendingCost?'<p><strong>Custo pendente — uso bloqueado:</strong> '+escape(metadata.pendingCost)+'</p>':'');activity.description.chatFlavor=talent.name+' — '+activity.name;}
 return {_id:qiTalentStableId('qi-talents:item:'+id),name:talent.name,type:'feat',folder:qiTalentCategoryFolderId(talent.category),img,effects:native.effects,
  system:{identifier:'qi-talent-'+id,type:{value:'feat'},description:{value:description},activities:native.activities},
  flags:{[SCOPE]:{talentoQi:{id:talent.id,categoria:talent.category,caminho:talent.path,...(talent.paths?{caminhos:[...talent.paths]}:{}),requisitos:[...talent.requirements],...(talent.requirementRules?{requirementRules:structuredClone(talent.requirementRules)}:{}),basic:!!talent.basic},
   qiTalentsContentVersion:QI_TALENTS_CONTENT_VERSION,qiTalentAutomation:{rules:native.rules,manual,pending},featureSection:'jj-basic'}}};
}
/** The four printed categories and their 67 authored talent feats. No live pack is touched. */
export function qiTalentCompendiumDocuments(){return[folder(),...QI_TALENT_CATEGORIES.map(category=>folder(category)),...QI_TALENTS.map(talent=>qiTalentDocument(talent.id))];}
