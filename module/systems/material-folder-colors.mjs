import {configureCompendium,withCompendiumWrite} from './compendium-configuration.mjs';
/** Shared, restrained folder palette; source files are generated from these same values. */
export const MATERIAL_FOLDER_COLORS=Object.freeze({
 madeira:'#466b52',fogo:'#85473f',terra:'#7b6249',metal:'#5f6d78',agua:'#365f78',
 relampago:'#8b6c36',vento:'#51766d',gelo:'#4e7c89',ilusao:'#795d67',luz:'#806d3f',
 escuridao:'#3c414c',tempo:'#71614f',espaco:'#445674',minerios:'#77614b',reagentes:'#6b6553'
});
const SCOPE='Immortals-system',pending=new WeakMap(),registrations=new WeakSet();
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const idOf=d=>d?._id??d?.id;
const activeGM=g=>g?.user?.isGM===true&&(!g.users?.activeGM||g.users.activeGM.id===g.user.id);
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
/** Resolve the branch by stock metadata; plain descendants inherit without touching their names or order. */
export function prepareMaterialFolderColorUpdates(folders){
 const sources=list(folders).map(d=>d.toObject?.()??d),byId=new Map(sources.map(d=>[idOf(d),d])),cache=new Map();
 const resolve=(id,visiting=new Set())=>{
  if(cache.has(id))return cache.get(id);if(visiting.has(id))return null;
  const d=byId.get(id);if(!d)return null;visiting.add(id);
  const flags=d.flags?.[SCOPE],parent=typeof d.folder==='string'?d.folder:idOf(d.folder);
  let key=flags?.alchemyMaterialsFolder?.element;
  if(flags?.oreMaterialFolder)key='minerios';if(flags?.reagentMaterialFolder)key='reagentes';
  if(!Object.hasOwn(MATERIAL_FOLDER_COLORS,key)&&!parent)key=normalize(d.name);
  const color=Object.hasOwn(MATERIAL_FOLDER_COLORS,key)?MATERIAL_FOLDER_COLORS[key]:resolve(parent,visiting);
  visiting.delete(id);cache.set(id,color);return color;
 };
 return sources.flatMap(d=>{const color=resolve(idOf(d));return color&&String(d.color??'').toLowerCase()!==color?[{_id:idOf(d),color}]:[];});
}
/** Native Folder-only update after other material publishers have completed; never rewrites pack databases. */
export async function ensureMaterialFolderColors({game=globalThis.game,Folder=globalThis.Folder}={}){
 if(!activeGM(game))return 0;const pack=game.packs?.get?.(SCOPE+'.materiais');if(!pack||pack.documentName!=='Item')return 0;
 if(pending.has(pack))return pending.get(pack);
 const work=withCompendiumWrite(pack,async()=>{
  if(!activeGM(game))return 0;const updates=prepareMaterialFolderColorUpdates(pack.folders);if(!updates.length)return 0;
  const locked=pack.locked;let updated=0;
  try{if(locked)await configureCompendium(pack,{locked:false});
   for(let offset=0;offset<updates.length;offset+=100){if(!activeGM(game))break;const batch=updates.slice(offset,offset+100);await (Folder?.implementation??Folder).updateDocuments(batch,{pack:pack.collection});updated+=batch.length;}
   return updated;
  }finally{if(locked)await configureCompendium(pack,{locked:true});}
 });pending.set(pack,work);try{return await work;}finally{if(pending.get(pack)===work)pending.delete(pack);}
}
export function registerMaterialFolderColors(hooks=globalThis.Hooks){if(typeof hooks?.once!=='function'||registrations.has(hooks))return;registrations.add(hooks);hooks.once('ready',async()=>{try{await ensureMaterialFolderColors();}catch(error){console.error('Immortals Legacy | Cores das pastas de Materiais',error);globalThis.ui?.notifications?.warn?.('Não foi possível aplicar as cores das pastas de Materiais: '+error.message);}});}
