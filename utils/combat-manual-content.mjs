import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {combatManualCompendiumDocuments} from '../module/systems/combat-manual-content.mjs';
const directory=new URL('../packs/_source/geral/',import.meta.url);
await fs.mkdir(directory,{recursive:true});
for(const document of combatManualCompendiumDocuments()){
 const slug=document.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const source={...document,_key:(document.type==='Item'?'!folders!':'!items!')+document._id};
 await fs.writeFile(new URL(slug+'-'+document._id+'.json',directory),JSON.stringify(source,null,2)+'\n');
}
console.log('29 técnicas e 11 pastas geradas em '+fileURLToPath(directory));
