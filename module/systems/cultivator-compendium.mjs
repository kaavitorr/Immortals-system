import {configureCompendium} from "./compendium-configuration.mjs";
import {backgroundAdvancementMigration} from "./wuxia-species.mjs";
import {prepareWuxiaAttributeCorrection} from './wuxia-attribute-corrections.mjs';
import {prepareGeneralContentArtUpdate} from "./general-content-art.mjs";
import {cultivatorCompendiumDocuments,isInternalCultivatorDocument} from "./cultivator-content.mjs";
let pending;
const list=collection=>Array.from(collection?.contents??collection?.values?.()??collection??[]);
const idOf=document=>document?._id??document?.id;
const parentOf=document=>typeof document?.folder==="string"?document.folder:idOf(document?.folder)??null;
/** Retire canonical integrated records and add backgrounds through native APIs, preserving custom documents. */
export async function ensureCultivatorCompendium({game=globalThis.game,Item=globalThis.Item,Folder=globalThis.Folder}={}) {
 if(!game?.user?.isGM)return {created:0,deleted:0};
 if(game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return {created:0,deleted:0};
 const pack=game.packs.get("Immortals-system.geral");if(!pack||pack.documentName!=="Item")return {created:0,deleted:0};
 if(pending)return pending;
 pending=(async()=>{
  const docs=cultivatorCompendiumDocuments(),index=list(await pack.getIndex());
  const items=pack.getDocuments?await pack.getDocuments():await Promise.all(index.map(entry=>pack.getDocument(idOf(entry))));
  const folderRecords=list(pack.folders),folderMap=new Map(folderRecords.map(folder=>[idOf(folder),folder]));
  const retiredItems=items.filter(isInternalCultivatorDocument),retiredFolders=folderRecords.filter(isInternalCultivatorDocument);
  const retiredFolderIds=new Set(retiredFolders.map(idOf)),ids=new Set(index.map(idOf)),folderIds=new Set(folderRecords.map(idOf));
  const publicIds=new Set(docs.filter(doc=>doc.type!=="Item").map(idOf));
  const canonicalById=new Map(docs.map(doc=>[doc._id,doc]));
  const progressUpdates=items.map(item=>item.toObject?.()??item).map(item=>backgroundAdvancementMigration(item,canonicalById.get(item._id))).filter(Boolean);
  const iconUpdates=items.filter(item=>publicIds.has(idOf(item))).map(item=>item.toObject?.()??item).map(prepareGeneralContentArtUpdate).filter(Boolean);
  const attributeUpdates=items.filter(item=>publicIds.has(idOf(item))).map(item=>prepareWuxiaAttributeCorrection(item.toObject?.()??item)).filter(Boolean);
  const missing=docs.filter(doc=>doc.type!=="Item"&&!ids.has(doc._id)),folders=docs.filter(doc=>doc.type==="Item"&&!folderIds.has(doc._id));
  const survivingParent=folder=>{let parent=parentOf(folder),seen=new Set();while(parent&&retiredFolderIds.has(parent)){if(seen.has(parent))return null;seen.add(parent);parent=parentOf(folderMap.get(parent));}return parent;};
  const itemMoves=items.filter(item=>!isInternalCultivatorDocument(item)&&retiredFolderIds.has(parentOf(item))).map(item=>({_id:idOf(item),folder:survivingParent(item)}));
  const folderMoves=folderRecords.filter(folder=>!isInternalCultivatorDocument(folder)&&retiredFolderIds.has(parentOf(folder))).map(folder=>({_id:idOf(folder),folder:survivingParent(folder)}));
  if(!missing.length&&!folders.length&&!retiredItems.length&&!retiredFolders.length&&!iconUpdates.length&&!progressUpdates.length&&!attributeUpdates.length)return {created:0,deleted:0,moved:0,foldersDeleted:0};
  if(!game.user?.isGM||game.users?.activeGM&&game.users.activeGM.id!==game.user.id)return {created:0,deleted:0};
  const mergedItemUpdates=new Map(itemMoves.map(patch=>[patch._id,patch]));
  for(const patch of [...iconUpdates,...progressUpdates,...attributeUpdates])mergedItemUpdates.set(patch._id,{...mergedItemUpdates.get(patch._id),...patch});
  const locked=pack.locked,options={pack:pack.collection},itemApi=Item.implementation??Item,folderApi=Folder.implementation??Folder;
  try {
   if(locked)await configureCompendium(pack, {locked:false});
   // Move custom descendants first. A failed move prevents deletion of their parent folder.
   if(mergedItemUpdates.size)await itemApi.updateDocuments([...mergedItemUpdates.values()],options);
   if(folderMoves.length)await folderApi.updateDocuments(folderMoves,options);
   if(retiredItems.length)await itemApi.deleteDocuments(retiredItems.map(idOf),options);
   const depth=folder=>{let count=0,parent=parentOf(folder),seen=new Set();while(parent&&!seen.has(parent)){seen.add(parent);count++;parent=parentOf(folderMap.get(parent));}return count;};
   for(const folder of retiredFolders.sort((a,b)=>depth(b)-depth(a))){await folderApi.deleteDocuments([idOf(folder)],{...options,deleteSubfolders:false,deleteContents:false});folderIds.delete(idOf(folder));}
   while(folders.length){
    const ready=folders.filter(doc=>!doc.folder||folderIds.has(doc.folder));
    if(!ready.length)throw new Error("Há uma pasta sem pai válido no conteúdo do Geral.");
    await folderApi.createDocuments(ready,{...options,keepId:true});
    for(const folder of ready){folderIds.add(folder._id);folders.splice(folders.findIndex(doc=>doc._id===folder._id),1);}
   }
   if(missing.length)await itemApi.createDocuments(missing,{...options,keepId:true});
   return {created:missing.length,deleted:retiredItems.length,moved:itemMoves.length+folderMoves.length,foldersDeleted:retiredFolders.length};
  }finally{if(locked)await configureCompendium(pack, {locked:true});}
 })();
 try{return await pending;}finally{pending=null;}
}
export function registerCultivatorCompendium(hooks) {
 hooks.once("ready",async()=>{
  try{await ensureCultivatorCompendium();}
  catch(error){console.error("Immortals Legacy | Conteúdo do Geral",error);ui.notifications.warn("Não foi possível atualizar os antecedentes e retirar as cópias de regras integradas do Geral: "+error.message);}
 });
}
