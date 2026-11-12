import assert from "node:assert/strict";
import {test} from "node:test";
let data = {};
try { data = await import("../module/systems/qi-talents-data.mjs"); }
catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
const talents = () => { assert(Array.isArray(data.QI_TALENTS)); return data.QI_TALENTS; };
const find = id => { const result = talents().find(node => node.id === id); assert(result, id); return result; };
const text = id => find(id).description.replace(/<[^>]+>/g," ").replace(/\s+/g," ");
const expectedIds = [
  "aceleracao-marcial",
  "aceleracao-arriscada",
  "canalizacao-amplificadora",
  "canalizacao-de-combate",
  "mensagem-de-qi",
  "levitacao-de-qi",
  "sentido-divino",
  "pressao-de-cultivo",
  "manipulacao-precisa",
  "voo-estavel",
  "gestos-flecha-e-linha",
  "escudo-de-qi",
  "manipulacao-eficiente",
  "foco-multiplo",
  "gestos-cone-e-leque",
  "gestos-raio-e-emanacao",
  "aprimorar-alcance",
  "manipulacao-rapida",
  "corrupcao",
  "qi-demoniaco",
  "estimulo-de-sangue",
  "devorador-demoniaco",
  "refinar-constituicao",
  "lorde-demoniaco",
  "passo-esguio",
  "punho-devastador",
  "entrada-impactante",
  "punho-de-aco",
  "ataque-potencializado",
  "ira-do-berserker",
  "potencializacao-extrema",
  "corpo-indestrutivel",
  "ataque-cruel",
  "movimento-instantaneo",
  "movimento-suave",
  "dispersar-forca",
  "evasao-de-contra-ataque",
  "ataque-cadenciado",
  "reutilizacao-de-energia",
  "recuperacao-de-foco",
  "reflexo-aprimorado",
  "aceleracao-subita",
  "reativo",
  "velocidade-anormal",
  "lanca-destruidora",
  "corpo-endurecido",
  "destruidor-de-exercitos",
  "velocidade-descomunal",
  "defesa-absoluta",
  "corpo-fechado",
  "resistencia-superior",
  "regeneracao-acelerada",
  "corpo-perfeito",
  "protecao-da-alma",
  "fonte-de-poder",
  "leitura-perfeita",
  "clone-elemental",
  "analise-constante",
  "pressao-espiritual",
  "agressao-da-alma",
  "relacao-simbiotica",
  "detonacao-da-alma",
  "criacao-de-corpo-fisico",
  "intencao-belica",
  "encarnacao-de-cultivo",
  "forca-transcendente-divina",
  "criacao-da-lei"
];

test("the complete source catalog contains exactly 67 unique talents across four categories",()=>{
  assert.deepEqual(data.QI_TALENT_CATEGORIES,["Habilidades de Qi","Adaptação Física","Habilidades Especiais","Imortalidade"]);
  assert.equal(talents().length,67);assert.deepEqual(talents().map(node=>node.id).sort(),[...expectedIds].sort());
  assert.equal(new Set(talents().map(node=>node.id)).size,67);
  for(const node of talents()){assert.match(node.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert(data.QI_TALENT_CATEGORIES.includes(node.category));assert.equal(typeof node.path,"string");assert(Array.isArray(node.requirements));assert.equal(typeof node.basic,"boolean");assert(node.description.length>80);assert.equal(node.descriptionHTML,node.description);}
  assert.deepEqual(data.QI_TALENT_CATEGORIES.map(category=>talents().filter(node=>node.category===category).length),[24,19,20,4]);
  assert.equal(talents().filter(node=>node.basic).length,10);
  assert.deepEqual(data.QI_TALENT_MISSING,["Explosão de Velocidade"]);assert(!talents().some(node=>node.name==="Explosão de Velocidade"));
});

test("typed requirements preserve AND, OR, counts, ranks and any-gesture alternatives",()=>{
  assert.deepEqual(find("manipulacao-precisa").requirementRules,{type:"and",rules:[{type:"node",id:"canalizacao-amplificadora"},{type:"node",id:"canalizacao-de-combate"}]});
  assert.deepEqual(find("foco-multiplo").requirementRules,{type:"and",rules:[{type:"node",id:"escudo-de-qi"},{type:"node",id:"manipulacao-eficiente"}]});
  assert.deepEqual(find("voo-estavel").requirementRules,{type:"and",rules:[{type:"rank",min:4},{type:"node",id:"levitacao-de-qi"}]});
  assert.deepEqual(find("manipulacao-rapida").requirementRules,{type:"or",rules:[{type:"count",min:8},{type:"node",id:"aprimorar-alcance"}]});
  assert.deepEqual(find("aprimorar-alcance").requirementRules,{type:"anyGesture"});
  const walk=rule=>{if(!rule)return;if(rule.type==="node")assert(talents().some(node=>node.id===rule.id),rule.id);for(const child of rule.rules??[])walk(child);};
  for(const node of talents())walk(node.requirementRules);
});

test("Body and Soul access thresholds map the named gates without inventing talent chains",()=>{
  const body=["velocidade-anormal","lanca-destruidora","corpo-endurecido","destruidor-de-exercitos","velocidade-descomunal","defesa-absoluta","corpo-fechado","resistencia-superior","regeneracao-acelerada","corpo-perfeito"];
  const soul=["protecao-da-alma","fonte-de-poder","leitura-perfeita","clone-elemental","analise-constante","pressao-espiritual","agressao-da-alma","relacao-simbiotica","detonacao-da-alma","criacao-de-corpo-fisico"];
  body.forEach((id,index)=>assert.deepEqual(find(id).requirementRules,{type:"body",min:index+1}));
  soul.forEach((id,index)=>assert.deepEqual(find(id).requirementRules,{type:"soul",min:index+1}));
  assert.deepEqual(["intencao-belica","encarnacao-de-cultivo","forca-transcendente-divina","criacao-da-lei"].map(id=>find(id).requirementRules),[{type:"rank",min:5},{type:"rank",min:6},{type:"rank",min:7},{type:"rank",min:9}]);
  assert.equal(find("passo-esguio").requirementRules,undefined);assert.equal(find("punho-devastador").requirementRules,undefined);
});

test("Instant Movement is one talent with two paths and either original prerequisite",()=>{
  const movement=find("movimento-instantaneo");assert.equal(talents().filter(node=>node.name==="Movimento Instantâneo").length,1);
  assert.equal(movement.path,"Corpo de Guerreiro");assert.deepEqual(movement.paths,["Corpo de Guerreiro","Combate Veloz"]);
  assert.deepEqual(movement.requirementRules,{type:"or",rules:[{type:"node",id:"ataque-cruel"},{type:"node",id:"aceleracao-subita"}]});
  assert.match(text("movimento-instantaneo"),/5 metros/);assert.match(text("movimento-instantaneo"),/2 vantagens/);
});

test("authored nested abilities, tables, alternative choices and special resource formulas remain complete",()=>{
  assert.match(text("canalizacao-amplificadora"),/CANALIZAR ENERGIA/i);assert.match(text("canalizacao-amplificadora"),/Movimento/);assert.match(text("canalizacao-amplificadora"),/Pulo/);
  assert.match(text("canalizacao-de-combate"),/EXPLOSÃO DE ENERGIA/i);assert.match(text("canalizacao-de-combate"),/DEFESA SÓLIDA/i);assert.match(text("canalizacao-de-combate"),/4d8/);assert.match(text("canalizacao-de-combate"),/Reação/);
  assert.match(find("gestos-flecha-e-linha").description,/<table>/);for(const value of ["15 metros","25 metros","35 metros"])assert(text("gestos-flecha-e-linha").includes(value));
  assert.match(text("gestos-cone-e-leque"),/180°/);assert.match(text("gestos-cone-e-leque"),/55°/);assert.match(text("gestos-raio-e-emanacao"),/35 de Linha e 15 de Raio/);
  assert.match(text("corrupcao"),/Caminho do Devorador/);assert.match(text("corrupcao"),/4 Pontos de Qi Base/);assert.match(text("corrupcao"),/Caminho do Abate/);assert.match(text("corrupcao"),/Pontos de Vida Base aumentam em \+2/);
  assert.match(text("manipulacao-rapida"),/REDUÇÃO DE POTÊNCIA/i);assert.match(text("manipulacao-rapida"),/dois deles preparados/);assert.match(text("manipulacao-rapida"),/A cada 3 Ranks/);
  assert.match(text("encarnacao-de-cultivo"),/3 avatares/);assert.match(text("criacao-da-lei"),/35 Pontos de Qi/);
  assert(!talents().some(node=>["canalizar-energia","explosao-de-energia","defesa-solida","reducao-de-potencia"].includes(node.id)));
});

test("unresolved resource abbreviations and copy errors stay explicit instead of becoming invented costs",()=>{
  assert.match(text("evasao-de-contra-ataque"),/1 PE/);assert(find("evasao-de-contra-ataque").pending.some(note=>note.includes("PE")));
  assert.match(text("corpo-perfeito"),/2 PE/);assert.match(text("pressao-espiritual"),/4 PA/);assert.match(text("agressao-da-alma"),/4 PA/);
  assert(find("aceleracao-marcial").pending.some(note=>/recuperados/.test(note)));
  assert(find("gestos-raio-e-emanacao").pending.some(note=>/Leque ou Cone/.test(note)));
  assert(find("detonacao-da-alma").pending.some(note=>/Ferida/.test(note)));
  assert(!talents().some(node=>"cost" in node||"autoGrant" in node||"repeatable" in node||"maxPurchases" in node));
});

test("only authorized terminology and obvious title spelling are normalized, with old names retained",()=>{
  for(const node of talents())assert.doesNotMatch(node.description,/energia amaldiçoada|feitiço inato|fulgor negro/i);
  assert.equal(find("analise-constante").name,"Análise Constante");assert(find("analise-constante").aliases.includes("Análise Cosntante"));
  assert.match(text("reutilizacao-de-energia"),/recebe 1d4 de dano adicional/);
  assert.match(text("fonte-de-poder"),/metade do seu atributo de Presença/);
  assert.match(text("leitura-perfeita"),/arredondado para baixo/);
});
