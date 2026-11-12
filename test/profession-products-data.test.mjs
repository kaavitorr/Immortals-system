import assert from "node:assert/strict";
import {test} from "node:test";
let catalog;
try { catalog = await import("../module/systems/profession-products-data.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; catalog = {}; }
const products = () => { assert.ok(Array.isArray(catalog.PROFESSION_PRODUCTS), "The authored profession catalogue must be exported"); return catalog.PROFESSION_PRODUCTS; };
const product = id => { const entry = products().find(value => value.id === id); assert.ok(entry, id + " must be available to the item factory"); return entry; };
const numeric = entry => [entry.levels.min, entry.levels.max, entry.dc.min, entry.dc.max, entry.creationPercent, entry.salePercent, entry.toxinMultiplier, entry.hpPerLevel].filter(value => value !== undefined);

test("catalogue exposes every authored recipe once and each tangible tool separately", () => {
  const counts = Object.fromEntries(["pill", "matrix", "inscription", "talisman", "tool", "treasure"].map(kind => [kind, products().filter(entry => entry.kind === kind).length]));
  assert.deepEqual(counts, {pill: 20, matrix: 19, inscription: 10, talisman: 10, tool: 23, treasure: 4});
  assert.equal(new Set(products().map(entry => entry.id)).size, products().length);
  assert.equal(products().filter(entry => entry.name === "Matriz de Prisão").length, 1);
  for (const entry of products()) {
    assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(["alchemy", "inscriptions", "matrices", "artisan", "beasts"].includes(entry.profession));
    assert.match(entry.descriptionHTML, /<p>|<table>/);
    assert.doesNotMatch(entry.descriptionHTML, /<script|<iframe|onerror=/i);
  }
});

test("pill creation metadata preserves all twenty recipes including exceptional ranges and toxin multipliers", () => {
  const expected = [
    ["pilula-de-cura",1,10,14,14,60,15,0.5],
    ["pilula-do-sangue-divino",1,10,16,16,350,300,0.2],
    ["pilula-de-nutricao-da-alma",3,10,17,17,500,300,0.2],
    ["pilula-de-limpeza-de-meridianos",1,10,16,16,150,50,1],
    ["pilula-da-abertura-celestial",1,10,19,19,500,300,2],
    ["pilula-de-recuperacao-de-qi",1,10,14,14,100,20,0.5],
    ["pilula-do-milagre-azul",3,10,16,16,400,300,2],
    ["pilula-das-9-revolucoes-da-mente",5,5,20,20,3000,200,3],
    ["pilula-do-sangue-carmesim",1,10,14,14,200,200,5],
    ["pilula-espiritual-terrena",1,10,16,16,150,200,1.5],
    ["pilula-da-condensacao-elemental-de-x",1,10,16,16,200,200,1],
    ["pilula-do-balanceamento-de-origem",6,6,22,22,5000,300,5],
    ["pilula-de-cura-de-veneno",1,10,14,20,500,25,1],
    ["pilula-da-afinidade-elemental",1,10,20,20,10000,300,3],
    ["pilula-do-corpo-espiritual",1,10,17,17,500,200,3],
    ["pilula-da-salvaguarda",4,10,22,22,20000,300,5],
    ["pilula-das-chamas-do-renascimento",7,7,25,25,25000,500,20],
    ["pilula-da-tranquilidade",1,10,15,15,300,200,2],
    ["pilula-do-mundo-ilimitado",4,10,16,16,800,200,2],
    ["pilula-da-explosao-de-vitalidade",1,10,16,16,500,250,5]
  ];
  for (const [id,...values] of expected) assert.deepEqual(numeric(product(id)), values, id);
  assert.equal(product("pilula-de-cura-de-veneno").name, "Pílula de Cura de Veneno");
  assert.ok(product("pilula-de-cura-de-veneno").aliases.includes("Poison Healing Pill"));
  assert.match(product("pilula-de-cura-de-veneno").descriptionHTML, /CD aumenta em \+2.*300%/s);
});

test("pill lot sizes remain authored rules and exceptional usage requirements remain visible", () => {
  assert.match(product("pilula-de-cura").quantityRule, /até 3.*\+2/);
  assert.match(product("pilula-de-recuperacao-de-qi").quantityRule, /até 3.*\+2/);
  assert.match(product("pilula-de-limpeza-de-meridianos").quantityRule, /1 Pílula.*adicional/);
  assert.match(product("pilula-de-cura-de-veneno").quantityRule, /3 pílulas.*\+3/);
  assert.match(product("pilula-do-sangue-divino").quantityRule, /uma pílula, não importa a qualidade/);
  assert.match(product("pilula-do-balanceamento-de-origem").descriptionHTML, /única dessas na vida/);
  assert.match(product("pilula-da-afinidade-elemental").extraRequirement, /essência.*rank/i);
  assert.match(product("pilula-das-chamas-do-renascimento").extraRequirement, /fênix.*Lorde Sagrado/);
});

test("matrix metadata preserves nineteen distinct structures, their durability and creation costs", () => {
  const expected = [
    ["matriz-de-acumulo-de-qi",1,10,14,500,100], ["matriz-de-acumulo-elemental",1,10,16,750,100],
    ["matriz-ilusoria-de-combate",3,10,18,1500,100], ["matriz-de-ocultacao",1,10,18,500,100],
    ["matriz-de-defesa",1,10,16,750,300], ["matriz-de-ataque",1,10,16,750,100],
    ["matriz-de-restauracao-de-terreno",1,10,18,8000,100], ["matriz-de-cofre",1,10,20,15000,500],
    ["matriz-de-ilusao-assassina",1,10,20,1000,250], ["matriz-de-teletransporte",4,10,25,5000,100],
    ["matriz-de-estabilizacao",1,10,22,2500,50], ["matriz-de-aceleracao-temporal",4,10,25,5000,50],
    ["matriz-de-prisao",1,10,18,1500,150], ["matriz-de-selamento",1,10,20,10000,200],
    ["matriz-de-voo",1,10,16,2000,100], ["matriz-de-paralisia",1,10,16,1000,100],
    ["matriz-de-contencao",1,10,19,750,100], ["matriz-de-refinamento-corporal",1,10,23,25000,100],
    ["matriz-de-refinamento-da-alma",1,10,25,25000,100]
  ];
  for (const [id,min,max,dc,cost,hp] of expected) {
    const entry = product(id);
    assert.deepEqual(numeric(entry), [min,max,dc,dc,cost,hp], id);
    assert.ok(entry.weakPoint);
  }
  assert.equal(product("matriz-de-cofre").weakPoint, "Nenhum");
  assert.match(product("matriz-de-teletransporte").extraRequirement, /Espaço.*1.000 Cristais Espaciais/);
  assert.match(product("matriz-de-aceleracao-temporal").extraRequirement, /Tempo.*tesouro do tempo/);
  assert.match(product("matriz-de-defesa").additionalCostRule, /por 5.*dobra/);
  assert.match(product("matriz-de-ataque").additionalCostRule, /por 10.*dobra/);
});

test("all inscription recipes retain support type, level and economic metadata", () => {
  const expected = [
    ["simbolo-avassalador",2,14,100,200,"Arma"], ["simbolo-da-alma-infundida",1,17,300,300,"Alma"],
    ["simbolo-do-acumulo-de-qi",1,18,400,250,"Corpo"], ["simbolo-do-selo-de-conflito",1,17,150,200,"Corpo"],
    ["simbolo-de-aprimoramento-de-pilula",4,20,500,300,"Pílula"], ["simbolo-de-preservacao",1,15,400,250,"Pílula"],
    ["simbolo-da-mente-calma",1,18,600,250,"Corpo"], ["simbolo-do-fio-incomparavel",1,18,750,300,"Arma"],
    ["simbolo-da-dispersao-de-dano",1,17,750,300,"Armadura"], ["simbolo-da-mente-sagaz",1,21,1500,350,"Alma"]
  ];
  for (const [id,min,dc,cost,sale,support] of expected) {
    assert.deepEqual(numeric(product(id)), [min,10,dc,dc,cost,sale], id);
    assert.equal(product(id).supportType, support);
  }
  assert.match(product("simbolo-avassalador").descriptionHTML, /42de dano.*54 de dano/s);
});

test("all talismans retain activation and constraints with the author-corrected explosive save", () => {
  const expected = [
    ["talisma-explosivo",1,16,300,200], ["talisma-de-barreira",1,16,300,200], ["talisma-de-fuga",1,20,300,200],
    ["talisma-de-selamento",1,21,300,200], ["talisma-de-ocultacao",1,19,700,300], ["talisma-de-estagnacao",1,16,600,250],
    ["talisma-de-aviso",5,18,800,300], ["talisma-de-controle",1,18,800,300], ["talisma-de-defesa-suprema",1,22,1000,400],
    ["talisma-de-ataque-supremo",1,20,1200,300]
  ];
  for (const [id,min,dc,cost,sale] of expected) assert.deepEqual(numeric(product(id)), [min,10,dc,dc,cost,sale], id);
  assert.match(product("talisma-explosivo").descriptionHTML, /sucesso causa metade/);
  assert.ok(!product("talisma-explosivo").pending.some(value => /sucesso.*falha|falha.*sucesso/i.test(value)));
  assert.match(product("talisma-de-fuga").extraRequirement, /Espaço.*Nível 3/);
  assert.match(product("talisma-de-defesa-suprema").extraRequirement, /Espaço.*Nível 3/);
  assert.ok(product("talisma-de-fuga").manual.some(value => /destino/i.test(value)));
});

test("named tools and books expose only explicit gold prices and preserve starter quantities", () => {
  const tools = products().filter(entry => entry.kind === "tool");
  const priced = tools.filter(entry => entry.price).map(entry => [entry.id,entry.price.value,entry.price.denomination]).sort();
  assert.deepEqual(priced, [
    ["disco-de-matriz",500,"gp"], ["livro-de-esquemas-gerais-de-inscricoes",15000,"gp"],
    ["livro-de-esquemas-gerais-de-matrizes",10000,"gp"], ["livro-de-forja-basica",10000,"gp"], ["papel-de-talisma",50,"gp"]
  ].sort());
  assert.match(product("papel-de-talisma").quantityRule, /20/);
  assert.match(product("lingote-de-ferro").quantityRule, /4/);
  assert.match(product("nucleo-de-matriz-simples").quantityRule, /2/);
  assert.match(product("kit-de-primeiros-socorros").quantityRule, /3/);
  assert.match(product("racao-para-bestas").quantityRule, /10/);
  assert.match(product("livro-de-receitas-gerais-de-alquimia").descriptionHTML, /500 pedras espirituais/);
  for (const tool of tools) { assert.equal(tool.levels, undefined); assert.equal(tool.dc, undefined); }
});

test("treasure catalogue supplies four generic authored types and their tables", () => {
  const entries = products().filter(entry => entry.kind === "treasure");
  assert.deepEqual(entries.map(entry => entry.id).sort(), ["tesouro-acessorio","tesouro-arma","tesouro-armadura","tesouro-voador"]);
  for (const entry of entries) {
    assert.deepEqual(entry.levels,{min:1,max:10});
    assert.equal(entry.creationPercent,5000);
    assert.match(entry.descriptionHTML, /<table>/);
    assert.match(entry.descriptionHTML, /ingrediente de rank mais baixo/);
    assert.equal(entry.damage, undefined);
    assert.equal(entry.weaponType, undefined);
    assert.ok(entry.manual.some(value => /material|habilidade|efeito/i.test(value)));
  }
  assert.deepEqual(product("tesouro-arma").rankRules.map(row=>row.baseDamage),["1d4","1d6","1d8","1d10","1d12","1d12 + 1"]);
  assert.deepEqual(product("tesouro-armadura").rankRules.map(row=>row.resistance),[1,2,4,6,8,10]);
  assert.match(product("tesouro-acessorio").descriptionHTML, /27 PQ/);
  assert.match(product("tesouro-voador").descriptionHTML, /18 de CR Base e 21 de deslocamento/);
});

test("profession guides keep common progression, source tables, tools and current skill attributes", () => {
  const guides = catalog.PROFESSION_GUIDES;
  assert.ok(guides);
  assert.deepEqual(Object.keys(guides).sort(),["alchemy","artisan","beasts","inscriptions","matrices"]);
  for (const [key,guide] of Object.entries(guides)) {
    assert.equal(guide.profession,key);
    assert.ok(guide.summary);
    assert.match(guide.commonRulesHTML,/5 Pontos de Cultivo/);
    assert.match(guide.commonRulesHTML,/98%/);
    assert.match(guide.commonRulesHTML,/3.000 PO/);
    assert.match(guide.commonRulesHTML,/Contribuições/);
    assert.match(guide.descriptionHTML,/<p>/);
    assert.ok(guide.tools.length >= 3);
    for (const id of guide.tools) assert.equal(product(id).profession,key);
    for (const check of guide.creationChecks ?? []) assert.ok(["dex","wis","con"].includes(check.ability));
    assert.doesNotMatch(guide.descriptionHTML,/Teste de Atributo de Espírito/);
  }
  assert.deepEqual(guides.alchemy.creationChecks.map(check=>[check.skill,check.ability]),[["slt","dex"],["ani","wis"],["arc","con"]]);
  assert.deepEqual(guides.matrices.creationChecks.map(check=>check.skill),["ani","arc"]);
  assert.match(guides.alchemy.descriptionHTML,/20 Pontos de Toxina/);
  assert.match(guides.beasts.descriptionHTML,/32/);
  assert.match(guides.artisan.descriptionHTML,/Supremo/);
});

test("unresolved author decisions and manual tactical effects remain explicit for consuming flows", () => {
  for (const entry of products().filter(value => value.creationPercent !== undefined)) {
    assert.equal(entry.priceBasis, "materials", entry.id);
  }
  assert.ok(!catalog.PROFESSION_GUIDES.alchemy.pending.some(value => /margem|Criação/.test(value)));
  assert.match(catalog.PROFESSION_GUIDES.alchemy.descriptionHTML,/usa somente a margem de sucesso do teste de Criação/);
  for (const id of ["matriz-de-refinamento-corporal","matriz-de-refinamento-da-alma"]) {
    assert.ok(product(id).pending.some(value=>/Efeito Pendente/i.test(value)));
    assert.match(product(id).descriptionHTML,/Efeito Pendente/);
  }
  assert.ok(catalog.PROFESSION_GUIDES.beasts.pending.some(value => /diminui em CD/.test(value)));
  assert.deepEqual(product("simbolo-da-mente-calma").pending,[]);
  assert.deepEqual(product("talisma-de-controle").pending,[]);
  assert.doesNotMatch(JSON.stringify(catalog),/Jujutsu|Divindade/);
});
