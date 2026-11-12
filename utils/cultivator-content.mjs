import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {cultivatorCompendiumDocuments} from "../module/systems/cultivator-content.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const destination=path.join(root,"packs/_source/geral");
await fs.mkdir(destination,{recursive:true});
for(const doc of cultivatorCompendiumDocuments()){
  const folder=doc.type==="Item";
  const slug=doc.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  await fs.writeFile(path.join(destination,slug+"-"+doc._id+".json"),JSON.stringify({...doc,_key:(folder?"!folders!":"!items!")+doc._id},null,2)+"\n");
}
console.log("Fontes do Geral geradas em packs/_source/geral.");
