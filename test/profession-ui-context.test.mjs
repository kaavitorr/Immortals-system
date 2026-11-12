import assert from "node:assert/strict";
import {test} from "node:test";
import {readFile} from "node:fs/promises";
import {PROFESSION_PRODUCTS, PROFESSION_GUIDES} from "../module/systems/profession-products-data.mjs";
let context;
try { context = await import("../module/systems/profession-ui-context.mjs"); }
catch(error) { if(error.code!=="ERR_MODULE_NOT_FOUND") throw error; context={}; }
const use=name=>{assert.equal(typeof context[name],"function",name+" must prepare profession presentation");return context[name];};
const actor=(level=0,key="alchemy")=>({limited:false,flags:{"Immortals-system":{professions:{[key]:{level}}}},system:{cultivation:{points:50}}});
const products=value=>value.productGroups.flatMap(group=>group.items);

test("the profession catalog context is pure and preserves every authored product and guide",()=>{
  const a=actor(3), before=structuredClone(a), p=use("prepareProfessionProductContext")(a,"alchemy");
  assert.equal(p.level,3); assert.equal(p.levelLabel,"Nível 3"); assert.equal(p.rankLabel,"Núcleo Rotativo");
  assert.equal(p.guideHTML,PROFESSION_GUIDES.alchemy.descriptionHTML);
  assert.deepEqual(products(p).map(item=>item.id),PROFESSION_PRODUCTS.filter(item=>item.profession==="alchemy"&&item.kind!=="tool").map(item=>item.id));
  assert.equal(p.tools.length,5); assert.equal(p.requiredTalent,"Botânico"); assert.equal(p.extraRequirements[0],"Conceito do Fogo — Nível 1");
  assert.deepEqual(a,before);
  p.tools[0].name="Changed presentation";
  assert.notEqual(PROFESSION_PRODUCTS.find(item=>item.id===p.tools[0].id).name,"Changed presentation");
});

test("entry and next-level availability are separate from catalog craftability",()=>{
  const novice=use("prepareProfessionProductContext")(actor(),"alchemy");
  assert.equal(novice.levelLabel,"Não iniciado"); assert.equal(novice.levelGallery.length,10);
  const healing=products(novice).find(item=>item.id==="pilula-de-cura");
  assert.equal(healing.craftable,true); assert.equal(healing.eligible,true); assert.deepEqual(healing.eligibleLevels,[1]);
  const soul=products(novice).find(item=>item.id==="pilula-de-nutricao-da-alma");
  assert.equal(soul.craftable,true); assert.equal(soul.eligible,false); assert.equal(soul.eligibilityLabel,"A partir do nível 3");
  const established=use("prepareProfessionProductContext")(actor(2),"alchemy");
  assert.deepEqual(products(established).find(item=>item.id===soul.id).eligibleLevels,[3]);
  assert.equal(established.levelGallery.filter(item=>item.current).length,1);
  assert.equal(established.levelGallery.find(item=>item.next).level,3);
});

test("product rows show exact difficulty ranges and local painted pill artwork",()=>{
  const p=use("prepareProfessionProductContext")(actor(10),"alchemy");
  const healing=products(p).find(item=>item.id==="pilula-de-cura"), poison=products(p).find(item=>item.id==="pilula-de-cura-de-veneno");
  assert.equal(healing.dcLabel,"CD 14"); assert.equal(healing.levelRangeLabel,"Níveis 1–10");
  assert.equal(poison.dcLabel,"CD 14–20");
  assert.equal(healing.image,"systems/Immortals-system/assets/wuxia/pilulas-pintadas-v1/pilula-de-cura.webp");
  assert.ok(healing.searchText.includes("cura"));
  assert.equal(p.levelGallery.at(-1).current,true); assert.equal(p.levelGallery.some(item=>item.next),false);
  assert.ok(p.tools.every(item=>item.craftable===false));
});

test("inscriptions keep talismans in their own group and starting tool quantities remain visible",()=>{
  const p=use("prepareProfessionProductContext")(actor(1,"inscriptions"),"inscriptions");
  assert.deepEqual(p.productGroups.map(group=>group.kind),["inscription","talisman"]);
  assert.equal(p.tools.find(tool=>tool.id==="papel-de-talisma").quantity,20);
  assert.equal(p.tools.find(tool=>tool.id==="papel-de-talisma").quantityLabel,"20 ×");
  const beasts=use("prepareProfessionProductContext")(actor(1,"beasts"),"beasts");
  assert.equal(beasts.hasProducts,false); assert.equal(beasts.isBeasts,true); assert.equal(beasts.tools.find(tool=>tool.id==="racao-para-bestas").quantity,10);
});

test("limited viewers receive no profession level, catalog or toxin information",()=>{
  const a=actor(8); a.limited=true; a.flags["Immortals-system"].pillToxins={value:120,highestValue:120,blockedUntilClear:true};
  const p=use("prepareProfessionProductContext")(a,"alchemy"), toxins=use("prepareProfessionToxinContext")(a);
  assert.equal(p.hidden,true); assert.equal(p.level,null); assert.deepEqual(p.productGroups,[]); assert.deepEqual(p.tools,[]); assert.equal(p.guideHTML,"");
  assert.equal(toxins.hidden,true); assert.equal(toxins.value,null); assert.equal(toxins.toxins,null);
  assert.throws(()=>context.prepareProfessionProductContext(a,"prototype"));
});

test("toxin context keeps fractional values and reports persisted cultivation block",()=>{
  const a=actor(); a.flags["Immortals-system"].pillToxins={value:12.4,highestValue:120,blockedUntilClear:true};
  const before=structuredClone(a), p=use("prepareProfessionToxinContext")(a);
  assert.equal(p.value,12.4); assert.equal(p.toxins,12.4); assert.equal(p.displayLabel,"12,4"); assert.equal(p.pending,true);
  assert.equal(p.penalties.rankDC,1); assert.equal(p.penalties.rankPC,1); assert.equal(p.penalties.stagePC,2);
  assert.equal(p.blockedUntilClear,true); assert.ok(p.statusLabel.includes("bloqueado")); assert.ok(p.detoxLabel.includes("90"));
  assert.deepEqual(a,before);
});

test("toxin timing labels preserve calendar months and the higher rate reached",()=>{
  const a=actor(); a.flags["Immortals-system"].pillToxins={value:12,highestValue:40};
  assert.equal(use("prepareProfessionToxinContext")(a).detoxLabel,"10 dias de cultivo por ponto");
  a.flags["Immortals-system"].pillToxins={value:90,highestValue:90};
  assert.equal(context.prepareProfessionToxinContext(a).detoxLabel,"1 mês de cultivo por ponto");
  a.flags["Immortals-system"].pillToxins={value:120,highestValue:120};
  assert.equal(context.prepareProfessionToxinContext(a).value,120); assert.equal(context.prepareProfessionToxinContext(a).meterPercent,100);
});

test("the profession view exposes product consultation, explicit crafting and local search while preserving ledgers",async()=>{
  const html=await readFile(new URL("../templates/actors/tabs/character-professions.hbs",import.meta.url),"utf8");
  assert.match(html,/data-action="professionConfigure"/); assert.match(html,/data-action="professionCraft"/); assert.match(html,/data-action="professionOpenProduct"/);
  assert.match(html,/data-action="professionRules"/); assert.match(html,/data-action="professionToxins"/); assert.match(html,/data-action="professionBeast"/);
  assert.match(html,/data-profession-search/); assert.match(html,/data-profession-product-group/); assert.match(html,/data-profession-product/);
  for(const action of ["professionAddRecord","professionOpenRecord","professionDeleteRecord","professionStartProject"]) assert.ok(html.includes('data-action="'+action+'"'));
  assert.ok(html.includes('role="tablist"')); assert.ok(html.includes('role="tabpanel"')); assert.ok(html.includes('type="search"'));
  assert.ok(!html.includes('name="system.')); assert.ok(!html.includes('<script')); assert.ok(!/\p{Extended_Pictographic}/u.test(html));
});
