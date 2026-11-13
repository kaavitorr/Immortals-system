import {test} from "node:test";
import assert from "node:assert/strict";
let growth;try{growth=await import("../module/systems/beast-essence-growth.mjs");}catch(e){if(e.code!=="ERR_MODULE_NOT_FOUND")throw e;}
const scope="Immortals-system";
const essence=()=>({version:1,id:"essence",name:"Lobo",growth:"human",growthOrigin:"rolled",growthRoll:9,sourceRealm:2,ability:"str",elements:["fogo"],naturalWeapons:[],features:[],attacks:[]});
test("Rank updates preserve the original essence snapshot and roll without mutating it",()=>{
 assert.equal(typeof growth?.withBeastEssenceGrowth,"function");const before=essence(),copy=structuredClone(before);
 const updated=growth.withBeastEssenceGrowth(before,"earth");assert.equal(updated.growth,"earth");assert.equal(updated.growthOverride,true);assert.equal(updated.growthRoll,9);assert.equal(updated.sourceRealm,2);assert.deepEqual(before,copy);
 for(const invalid of ["constructor","",null,0])assert.throws(()=>growth.withBeastEssenceGrowth(before,invalid),/Rank|crescimento/);
});
test("item Rank updates refresh authored growth rules while preserving personal description and stock",()=>{
 assert.equal(typeof growth?.beastEssenceGrowthItemUpdate,"function");const item={id:"loot",flags:{[scope]:{beastEssenceItem:{version:1,definition:essence()}}},system:{quantity:3,description:{value:'<p><strong>Crescimento:</strong> Humano. <strong>Atributo:</strong> Força.</p><p><strong>Origem do crescimento:</strong> 1d100: 9.</p><p>Antes da integração: Condensação de Qi. Após a integração, acompanha seu cultivo até <strong>Formação de Base</strong>.</p><p>Minha anotação.</p>'}}};
 const before=structuredClone(item),update=growth.beastEssenceGrowthItemUpdate(item,"earth");
 assert.equal(update["flags."+scope+".beastEssenceItem.definition"].growth,"earth");
 assert.match(update["system.description.value"],/Crescimento:<\/strong> Terra/);assert.match(update["system.description.value"],/Mar Divino/);assert.match(update["system.description.value"],/Alterado pelo Narrador/);assert.match(update["system.description.value"],/Minha anotação/);assert.equal(update["system.quantity"],undefined);assert.deepEqual(item,before);
});
test("custom essence descriptions remain intact when no generated paragraphs are present",()=>{
 assert.equal(typeof growth?.beastEssenceGrowthItemUpdate,"function");const item={flags:{[scope]:{beastEssenceItem:{version:1,definition:essence()}}},system:{description:{value:"<p>Uma herança pessoal.</p>"}}};
 const update=growth.beastEssenceGrowthItemUpdate(item,"supreme");assert.equal(update["system.description.value"],undefined);
});
