import assert from "node:assert/strict";
import {test} from "node:test";
let mod={};try{mod=await import("../module/systems/wuxia-backgrounds.mjs");}catch(error){if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;}
const documents=()=>{assert.equal(typeof mod.backgroundDocuments,"function");return mod.backgroundDocuments();};
const feature=(key)=>documents().find(doc=>doc.type==="feat"&&doc.flags["Immortals-system"].backgroundFeature===key);
test("all 23 origins grant exactly their own feature, with stable unique IDs and no invented proficiencies",()=>{
 const docs=documents(),backgrounds=docs.filter(d=>d.type==="background"),ids=new Set(docs.map(d=>d._id));
 assert.equal(backgrounds.length,23);assert.equal(docs.filter(d=>d.type==="feat").length,23);assert.equal(ids.size,docs.length);
 for(const doc of docs)assert.match(doc._id,/^[a-zA-Z0-9]{16}$/);
 for(const bg of backgrounds){const advances=Object.values(bg.system.advancement);assert(advances.length>=2);assert.equal(advances[0].type,"ItemGrant");assert.equal(advances[0].level,0);const grants=advances[0].configuration.items;assert.equal(grants.length,1);assert(ids.has(grants[0].uuid.split(".").at(-1)));assert.equal(bg.effects.length,0);}
 assert.deepEqual(documents(),docs);assert(backgrounds.some(d=>d.name==="Órfão"));
});
test("starting gold is PO and retains every origin's specified amount",()=>{
 const expected=[80,30,100,120,60,120,40,100,60,100,200,10,50,30,15,60,80,30,100,500,100,30,15];
 const backgrounds=documents().filter(d=>d.type==="background");assert.deepEqual(backgrounds.map(d=>d.flags["Immortals-system"].background.startingGold),expected);
 for(const bg of backgrounds){assert.deepEqual(bg.system.startingEquipment.map(e=>[e.type,e.key,e.count]),[["currency","gp",bg.flags["Immortals-system"].background.startingGold]]);assert.equal(bg.system.wealth,"");assert(bg.system.description.value.includes("Equipamentos iniciais"));assert(!/créditos|\$1/.test(bg.system.description.value));}
});
test("rest-limited features recover correctly; urban routes are not consumed by the daily meal",()=>{
 for(const key of ["ator","comerciante","cozinheiro","vagabundo"]){assert.equal(feature(key).system.uses.max,"1");assert.deepEqual(feature(key).system.uses.recovery.map(r=>r.period),["lr"]);}
 assert.deepEqual(feature("estudioso").system.uses.recovery.map(r=>r.period),["sr"]);
 const orphan=feature("orfao"),activities=Object.values(orphan.system.activities);assert.equal(orphan.system.uses.max,"");assert.equal(activities.length,2);assert.equal(activities[0].uses.max,"");assert.equal(activities[1].uses.max,"1");assert.deepEqual(activities[1].uses.recovery.map(r=>r.period),["day"]);
});
test("weekly and monthly limits remain explicit and never reset after a long rest",()=>{
 for(const key of ["aprendiz-marcial","mendigo"]){const doc=feature(key);assert.equal(doc.system.uses.max,"1");assert.deepEqual(doc.system.uses.recovery,[]);assert.match(doc.system.description.value,/semana|mês/);assert.match(doc.system.description.value,/manualmente/);}
});
test("manuals, danger and narrative constraints stay intact without automatic assimilation or invulnerability",()=>{
 const bastard=feature("bastardo"),demon=feature("cultivador-demoniaco"),servant=feature("servo-do-jovem-mestre");
 assert.match(bastard.system.description.value,/Céu/);assert.match(bastard.system.description.value,/1d12/);assert.match(bastard.system.description.value,/8 ou menos/);assert.match(bastard.system.description.value,/exceto.*absorção/);
 assert.match(demon.system.description.value,/Sagrado/);assert.match(demon.system.description.value,/vida inocente por semana/);assert.equal(demon.effects.length,0);
 assert(servant.system.description.value.includes("1/3"));assert.equal(servant.effects.length,0);
 assert.match(feature("membro-de-seita").system.description.value,/metade/);assert.match(feature("iniciado-em-medicina").system.description.value,/metade.*deslocamento/);
});
test("initial benefits preserve existing coins, enforce only explicit starting cultivation and are not used for imports",()=>{
 documents();const find=key=>documents().find(d=>d.type==="background"&&d.flags["Immortals-system"].background.key===key);
 assert.equal(typeof mod.backgroundCreationBenefits,"function");
 const actor={system:{currency:{gp:7,sp:8,cp:9,yen:456},cultivation:{rank:1,stage:1}}};
 assert.deepEqual(mod.backgroundCreationBenefits(actor,find("ator")),{actor:{"system.currency.gp":107},cultivation:null});
 const result=mod.backgroundCreationBenefits(actor,find("servo-do-jovem-mestre"));assert.equal(result.actor["system.currency.gp"],507);assert.deepEqual(result.cultivation,{rank:1,stage:3});
 assert.equal(mod.backgroundCreationBenefits({...actor,system:{...actor.system,cultivation:{rank:2,stage:1}}},find("servo-do-jovem-mestre")).cultivation,null);
 assert.equal(mod.backgroundCreationBenefits(actor,find("monge")).actor["system.details.hair"],"Careca");
 assert.deepEqual(actor.system.currency,{gp:7,sp:8,cp:9,yen:456});assert.deepEqual(mod.backgroundCreationBenefits(actor,{type:"background",system:{}}),{actor:{},cultivation:null});
});

test("origin checks use the sheet's Sorte skill with their book DC and never charge actions or Qi",()=>{
 const expected={acompanhante:15,"aprendiz-marcial":15,ator:16,"cacador-de-recompensas":15,comerciante:15,cozinheiro:15,"matador-de-aluguel":15,monge:16,musico:17,pescador:16,soldado:17,vagabundo:16};
 for(const doc of documents().filter(d=>d.type==="feat"))for(const activity of Object.values(doc.system.activities)){
  assert.equal(activity.activation.value,0);assert(!activity.consumption.targets.some(t=>t.type==="attribute"));
  if(activity.type!=="check")continue;assert.deepEqual(activity.check.associated,["luc"]);assert.equal(activity.check.ability,"");assert.equal(activity.check.dc.calculation,"");assert.equal(activity.check.dc.formula,expected[doc.flags["Immortals-system"].backgroundFeature]?String(expected[doc.flags["Immortals-system"].backgroundFeature]):"");
 }
});
test("rest-limited checks consume one item use; the orphan's daily meal consumes only its own activity",()=>{
 for(const key of ["ator","comerciante","cozinheiro","estudioso","vagabundo"]){const check=Object.values(feature(key).system.activities).find(a=>a.type==="check");assert.deepEqual(check.consumption.targets,[{type:"itemUses",target:"",value:"1"}]);}
 const [routes,food]=Object.values(feature("orfao").system.activities);assert.deepEqual(routes.consumption.targets,[]);assert.deepEqual(food.consumption.targets,[{type:"activityUses",target:"",value:"1"}]);
});
