import {configureCompendium,withCompendiumWrite} from './compendium-configuration.mjs';
const SCOPE='Immortals-system',PACK=SCOPE+'.materiais',pending=new WeakMap(),registrations=new WeakSet();
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]),idOf=d=>d?._id??d?.id;
const activeGM=g=>g?.user?.isGM===true&&(!g.users?.activeGM||g.users.activeGM.id===g.user.id);
const empty=()=>({created:0,folders:0,updated:0});
const equalPrice=(a,b)=>a?.value===b?.value&&a?.denomination===b?.denomination;
async function loadCatalogue(){const path='systems/Immortals-system/json/material-economy-catalogue.json';const response=await fetch(globalThis.foundry?.utils?.getRoute?.(path)??path,{cache:'no-store'});if(!response.ok)throw Error('Não foi possível ler os preços e reagentes.');return response.json();}
/** Exact old-field matches protect later narrator edits; generated unit text is never duplicated. */
export function prepareMaterialMarketUpdate(item,reference,unitHtml,previousUnitHtml=[]){
 const source=item?.toObject?.()??item,flags=source?.flags?.[SCOPE];
 if(!source||idOf(source)!==reference?._id||source.type!=='loot'||source.system?.type?.value!=='material'||!(flags?.alchemyMaterial||flags?.oreMaterial||flags?.reagentMaterial))return null;
 const update={_id:idOf(source)};
 const stockPrices=[reference.beforePrice,...(Array.isArray(reference.previousPrices)?reference.previousPrices:[])];
 if(stockPrices.some(price=>equalPrice(source.system.price,price))&&!equalPrice(source.system.price,reference.price))update['system.price']=structuredClone(reference.price);
 const html=source.system.description?.value;
 if(typeof html==='string'&&typeof unitHtml==='string'&&unitHtml){
  let revised=html,placed=html.includes(unitHtml);
  // Only exact generated paragraphs are ours to replace, including beside custom narrator notes.
  for(const previous of Array.isArray(previousUnitHtml)?previousUnitHtml:[]){
   if(typeof previous!=='string'||!previous||previous===unitHtml)continue;
   revised=revised.replaceAll(previous,()=>{if(placed)return '';placed=true;return unitHtml;});
  }
  if(revised===html&&html===reference.descriptionHtml&&!/data-iw-material-unit\s*=/.test(html))revised=html+unitHtml;
  if(revised!==html)update['system.description.value']=revised;
 }
 if(JSON.stringify(flags.materialEconomy)!==JSON.stringify(reference.market))update['flags.'+SCOPE+'.materialEconomy']=reference.market;
 return Object.keys(update).length>1?update:null;
}
export async function ensureMaterialEconomyCompendium({game=globalThis.game,Item=globalThis.Item,Folder=globalThis.Folder,load=loadCatalogue}={}){
 if(!activeGM(game))return empty();const pack=game.packs?.get?.(PACK);if(!pack||pack.documentName!=='Item')return empty();if(pending.has(pack))return pending.get(pack);
 const work=withCompendiumWrite(pack,async()=>{
  if(!activeGM(game))return empty();const catalogue=await load();if(!Array.isArray(catalogue.entries)||!Array.isArray(catalogue.documents)||typeof catalogue.unitHtml!=='string')throw Error('Catálogo de preços inválido.');
  const index=list(await pack.getIndex({fields:['type','system.type.value','system.price','system.description.value','flags.'+SCOPE+'.alchemyMaterial','flags.'+SCOPE+'.oreMaterial','flags.'+SCOPE+'.reagentMaterial','flags.'+SCOPE+'.materialEconomy']}));
  const ids=new Set(index.map(idOf)),folderIds=new Set(list(pack.folders).map(idOf)),refs=new Map(catalogue.entries.map(e=>[e._id,e]));
  const folders=catalogue.documents.filter(d=>d.type==='Item'&&!folderIds.has(d._id));const items=catalogue.documents.filter(d=>d.type!=='Item'&&!ids.has(d._id));
  const updates=index.map(d=>prepareMaterialMarketUpdate(d,refs.get(idOf(d)),catalogue.unitHtml,catalogue.previousUnitHtml)).filter(Boolean);if((!folders.length&&!items.length&&!updates.length)||!activeGM(game))return empty();
  const locked=pack.locked,options={pack:pack.collection,keepId:true},result=empty();
  try{
   if(locked)await configureCompendium(pack,{locked:false});
   while(folders.length){if(!activeGM(game))return result;const ready=folders.filter(d=>!d.folder||folderIds.has(d.folder));if(!ready.length)throw Error('Uma pasta de reagentes não possui pasta superior válida.');await (Folder?.implementation??Folder).createDocuments(ready,options);result.folders+=ready.length;for(const d of ready){folderIds.add(d._id);folders.splice(folders.findIndex(f=>f._id===d._id),1);}}
   if(items.length&&activeGM(game)){await (Item?.implementation??Item).createDocuments(items,options);result.created=items.length;}
   for(let offset=0;offset<updates.length;offset+=200){if(!activeGM(game))break;const batch=updates.slice(offset,offset+200);await (Item?.implementation??Item).updateDocuments(batch,{pack:pack.collection});result.updated+=batch.length;}
   return result;
  }finally{if(locked)await configureCompendium(pack,{locked:true});}
 });pending.set(pack,work);try{return await work;}finally{if(pending.get(pack)===work)pending.delete(pack);}
}
export function registerMaterialEconomyCompendium(hooks=globalThis.Hooks){if(typeof hooks?.once!=='function'||registrations.has(hooks))return;registrations.add(hooks);hooks.once('ready',async()=>{try{await ensureMaterialEconomyCompendium();}catch(error){console.error('Immortals Legacy | Materiais e reagentes',error);globalThis.ui?.notifications?.warn?.('Não foi possível atualizar os preços e reagentes: '+error.message);}});}
