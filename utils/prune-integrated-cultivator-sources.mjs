import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {isInternalCultivatorDocument} from "../module/systems/cultivator-content.mjs";
const defaultRoot=fileURLToPath(new URL("../packs/_source/geral/",import.meta.url));
/** Remove only canonical integrated JSON sources. Never open the compiled/live pack. */
export async function pruneIntegratedCultivatorSources({sourceRoot=defaultRoot,backupRoot}={}){
 const root=path.resolve(sourceRoot),backup=backupRoot&&path.resolve(backupRoot),removed=[];
 for(const entry of await fs.readdir(root,{withFileTypes:true})){
  if(!entry.isFile()||path.extname(entry.name)!==".json")continue;
  const target=path.resolve(root,entry.name);
  if(path.dirname(target)!==root)throw new Error("A fonte está fora da pasta autorizada.");
  const raw=await fs.readFile(target,"utf8"),document=JSON.parse(raw);
  if(!isInternalCultivatorDocument(document))continue;
  if(backup){await fs.mkdir(backup,{recursive:true});try{await fs.copyFile(target,path.join(backup,entry.name),1);}catch(error){if(error.code!=="EEXIST")throw error;}}
  await fs.unlink(target);removed.push(entry.name);
 }
 return {removed:removed.length,files:removed};
}
