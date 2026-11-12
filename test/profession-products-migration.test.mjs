import {beastCoreCompendiumDocuments} from "../module/systems/beast-cores.mjs";
import {essenceCrystalCompendiumDocuments} from "../module/systems/essence-crystals.mjs";
import {chineseWeaponCompendiumDocuments} from "../module/systems/chinese-weapons.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {professionProductDocument,professionProductCompendiumDocuments} from "../module/systems/profession-products-content.mjs";
import {professionPrice} from "../module/systems/profession-crafting-rules.mjs";
import {withElementalActorLock} from "../module/systems/elemental-runtime.mjs";
import {ensureProfessionProductsCompendium} from "../module/systems/profession-products-compendium.mjs";
let migration;try{migration=await import("../module/systems/profession-products-migration.mjs");}catch(error){if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;migration={};}
const SCOPE="Immortals-system";
const V1_EXPLOSIVE={
  "_id": "ab90b8ce15efb73a",
  "name": "Talismã Explosivo",
  "type": "consumable",
  "folder": "1a1dfff59dd402d3",
  "img": "systems/Immortals-system/assets/wuxia/profissoes-pintadas-v1/inscriptions.webp",
  "effects": [],
  "system": {
    "identifier": "profession-product-talisma-explosivo",
    "type": {
      "value": "scroll"
    },
    "quantity": 1,
    "description": {
      "value": "<p><strong>Nível do produto:</strong> 1.</p><h3>TALISMÃ EXPLOSIVO</h3>\n<table><tbody><tr><td>Tipo: Ataque</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Um talismã que pode ser atirado em uma direção a sua escolha com duas ações [2 ações], criando uma explosão no alcance de uma esfera de 12 metros de raio, causando 12 de dano para cada nível do símbolo. Todas as criaturas dentro do alcance devem realizar uma Salvaguarda de Agilidade. Sofrendo todo dano como dano do tipo Contundente ou metade se falharem. Metade do dano sofrido é convertido em dano de Fogo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table><p><strong>Resolução:</strong> Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre.</p><p><strong>Pendente:</strong> Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO. Confirmar o texto de sucesso e falha da Salvaguarda de Agilidade: a fonte diz dano total ou metade se falharem. Talismã Explosivo: confirme todo/metade do dano em sucesso e falha da salvaguarda.</p>"
    },
    "activities": {
      "838a39ebdb3219f9": {
        "_id": "838a39ebdb3219f9",
        "type": "damage",
        "name": "Liberar explosão (resultado pendente)",
        "activation": {
          "type": "action",
          "value": 2,
          "condition": "",
          "override": true
        },
        "consumption": {
          "spellSlot": false,
          "scaling": {
            "allowed": false,
            "max": ""
          },
          "targets": [
            {
              "type": "itemUses",
              "target": "",
              "value": "1",
              "scaling": {
                "mode": "",
                "formula": ""
              }
            }
          ]
        },
        "description": {
          "value": "<p><strong>Nível do produto:</strong> 1.</p><h3>TALISMÃ EXPLOSIVO</h3>\n<table><tbody><tr><td>Tipo: Ataque</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Um talismã que pode ser atirado em uma direção a sua escolha com duas ações [2 ações], criando uma explosão no alcance de uma esfera de 12 metros de raio, causando 12 de dano para cada nível do símbolo. Todas as criaturas dentro do alcance devem realizar uma Salvaguarda de Agilidade. Sofrendo todo dano como dano do tipo Contundente ou metade se falharem. Metade do dano sofrido é convertido em dano de Fogo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table><p><strong>Resolução:</strong> Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre.</p><p><strong>Pendente:</strong> Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO. Confirmar o texto de sucesso e falha da Salvaguarda de Agilidade: a fonte diz dano total ou metade se falharem. Talismã Explosivo: confirme todo/metade do dano em sucesso e falha da salvaguarda.</p><p><strong>Uso bloqueado — pendente:</strong> O texto não define de modo inequívoco o dano em sucesso e falha da salvaguarda; aguarde confirmação autoral.</p>",
          "chatFlavor": "Talismã Explosivo — Liberar explosão (resultado pendente)"
        },
        "duration": {
          "value": "",
          "units": "inst",
          "expiry": null,
          "special": "",
          "concentration": false,
          "override": true
        },
        "range": {
          "value": "",
          "units": "spec",
          "special": "Alcance não especificado na fonte; resolva com o narrador.",
          "override": true
        },
        "target": {
          "override": true,
          "prompt": true,
          "template": {
            "type": "radius",
            "size": "12",
            "width": "",
            "units": "m"
          },
          "affects": {
            "type": "creature",
            "count": "",
            "choice": false,
            "special": ""
          }
        },
        "uses": {
          "max": "",
          "spent": 0,
          "recovery": []
        },
        "effects": [],
        "flags": {
          "Immortals-system": {
            "professionProductActivity": {
              "productId": "talisma-explosivo",
              "key": "release",
              "level": 1,
              "quality": null,
              "manualResolution": false,
              "consumeItem": true,
              "rule": "explosiveTalisman",
              "save": "dex",
              "saveLabel": "Reflexo",
              "pendingResolution": "O texto não define de modo inequívoco o dano em sucesso e falha da salvaguarda; aguarde confirmação autoral.",
              "manualSaveDifficulty": true
            }
          }
        },
        "damage": {
          "critical": {
            "allow": false
          },
          "parts": [
            {
              "number": null,
              "denomination": null,
              "bonus": "",
              "types": [
                "bludgeoning"
              ],
              "custom": {
                "enabled": true,
                "formula": "6"
              },
              "scaling": {
                "mode": "",
                "number": 0,
                "formula": ""
              }
            },
            {
              "number": null,
              "denomination": null,
              "bonus": "",
              "types": [
                "fire"
              ],
              "custom": {
                "enabled": true,
                "formula": "6"
              },
              "scaling": {
                "mode": "",
                "number": 0,
                "formula": ""
              }
            }
          ]
        },
        "img": "systems/Immortals-system/assets/wuxia/profissoes-pintadas-v1/inscriptions.webp"
      }
    },
    "uses": {
      "max": "1",
      "spent": 0,
      "recovery": [],
      "autoDestroy": true
    }
  },
  "flags": {
    "Immortals-system": {
      "professionProduct": {
        "id": "talisma-explosivo",
        "kind": "talisman",
        "profession": "inscriptions",
        "level": 1,
        "quality": null
      },
      "professionProductManaged": true,
      "professionProductsContentVersion": 1,
      "professionProductAutomation": {
        "rules": [],
        "manual": [
          "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
        ],
        "pending": [
          "Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO.",
          "Confirmar o texto de sucesso e falha da Salvaguarda de Agilidade: a fonte diz dano total ou metade se falharem.",
          "Talismã Explosivo: confirme todo/metade do dano em sucesso e falha da salvaguarda."
        ]
      }
    }
  },
  "_key": "!items!ab90b8ce15efb73a"
};
const V1_PILL={
  "_id": "6feba5a23babf5a8",
  "name": "Pílula de Cura",
  "type": "consumable",
  "folder": "3ec1f795631fd283",
  "img": "systems/Immortals-system/assets/wuxia/pilulas-pintadas-v1/pilula-de-cura.webp",
  "effects": [],
  "system": {
    "identifier": "profession-product-pilula-de-cura",
    "type": {
      "value": "potion"
    },
    "quantity": 1,
    "description": {
      "value": "<p><strong>Nível do produto:</strong> 1. <strong>Qualidade:</strong> Inferior.</p><h3>PÍLULA DE CURA</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 0,5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Uma pílula que cura 1d4 + modificador Constituição a cada pílula ingerida e mais 1d4 a cada minuto por 10 minutos. A cada nível posterior, ela cura 1d4 adicional ao ser consumida e 1d4 adicional por minuto.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>60% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>15% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior.</td></tr></tbody></table><p><strong>Resolução:</strong> Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos. A cura inicial usa o nível desta pílula. Role mais 1d4 a cada minuto, durante 10 minutos; acompanhe a recuperação recorrente com o narrador.</p><p><strong>Pendente:</strong> Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO. Confirmar se a qualidade da pílula usa a menor margem dos três testes ou apenas a margem do teste de Criação.</p>"
    },
    "activities": {
      "ca3687d072f6d352": {
        "_id": "ca3687d072f6d352",
        "type": "heal",
        "name": "Consumir e rolar cura inicial",
        "activation": {
          "type": "",
          "value": 0,
          "condition": "",
          "override": true
        },
        "consumption": {
          "spellSlot": false,
          "scaling": {
            "allowed": false,
            "max": ""
          },
          "targets": [
            {
              "type": "itemUses",
              "target": "",
              "value": "1",
              "scaling": {
                "mode": "",
                "formula": ""
              }
            }
          ]
        },
        "description": {
          "value": "<p><strong>Nível do produto:</strong> 1. <strong>Qualidade:</strong> Inferior.</p><h3>PÍLULA DE CURA</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 0,5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Uma pílula que cura 1d4 + modificador Constituição a cada pílula ingerida e mais 1d4 a cada minuto por 10 minutos. A cada nível posterior, ela cura 1d4 adicional ao ser consumida e 1d4 adicional por minuto.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>60% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>15% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior.</td></tr></tbody></table><p><strong>Resolução:</strong> Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos. A cura inicial usa o nível desta pílula. Role mais 1d4 a cada minuto, durante 10 minutos; acompanhe a recuperação recorrente com o narrador.</p><p><strong>Pendente:</strong> Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO. Confirmar se a qualidade da pílula usa a menor margem dos três testes ou apenas a margem do teste de Criação.</p>",
          "chatFlavor": "Pílula de Cura — Consumir e rolar cura inicial"
        },
        "duration": {
          "value": "",
          "units": "inst",
          "expiry": null,
          "special": "",
          "concentration": false,
          "override": true
        },
        "range": {
          "value": "",
          "units": "self",
          "special": "",
          "override": true
        },
        "target": {
          "override": true,
          "prompt": false,
          "template": {
            "type": "",
            "size": "",
            "width": "",
            "units": "m"
          },
          "affects": {
            "type": "self",
            "count": "1",
            "choice": false,
            "special": ""
          }
        },
        "uses": {
          "max": "",
          "spent": 0,
          "recovery": []
        },
        "effects": [],
        "flags": {
          "Immortals-system": {
            "professionProductActivity": {
              "productId": "pilula-de-cura",
              "key": "consume",
              "level": 1,
              "quality": "inferior",
              "manualResolution": false,
              "consumeItem": true,
              "rule": "pilula-de-cura",
              "poison": 10,
              "recurringHealing": {
                "formula": "1d4",
                "intervalSeconds": 60,
                "repetitions": 10,
                "manual": true
              }
            }
          }
        },
        "healing": {
          "number": null,
          "denomination": null,
          "bonus": "",
          "types": [
            "healing"
          ],
          "custom": {
            "enabled": true,
            "formula": "1d4 + @abilities.con.mod"
          },
          "scaling": {
            "mode": "",
            "number": 0,
            "formula": ""
          }
        },
        "img": "systems/Immortals-system/assets/wuxia/pilulas-pintadas-v1/pilula-de-cura.webp"
      }
    },
    "uses": {
      "max": "1",
      "spent": 0,
      "recovery": [],
      "autoDestroy": true
    }
  },
  "flags": {
    "Immortals-system": {
      "professionProduct": {
        "id": "pilula-de-cura",
        "kind": "pill",
        "profession": "alchemy",
        "level": 1,
        "quality": "inferior"
      },
      "professionProductManaged": true,
      "professionProductsContentVersion": 1,
      "professionProductAutomation": {
        "rules": [
          {
            "type": "pillToxins",
            "quality": "inferior",
            "base": 20,
            "multiplier": 0.5,
            "value": 10
          }
        ],
        "manual": [
          "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos.",
          "A cura inicial usa o nível desta pílula. Role mais 1d4 a cada minuto, durante 10 minutos; acompanhe a recuperação recorrente com o narrador."
        ],
        "pending": [
          "Confirmar se os percentuais de Receitas e Materiais usam somente materiais ou receita + materiais; não converter cristais em PO.",
          "Confirmar se a qualidade da pílula usa a menor margem dos três testes ou apenas a margem do teste de Criação."
        ]
      }
    }
  },
  "_key": "!items!6feba5a23babf5a8"
};
const copy=value=>structuredClone(value);
const patch=item=>{assert.equal(typeof migration.prepareProfessionProductAuthorUpdate,"function");return migration.prepareProfessionProductAuthorUpdate(item);};
const migrate=(actor,game)=>{assert.equal(typeof migration.migrateProfessionProductItems,"function");return migration.migrateProfessionProductItems(actor,{game});};
function apply(document,updates){for(const[path,value]of Object.entries(updates)){if(path==="_id")continue;const parts=path.split("."),last=parts.pop();let target=document;for(const key of parts)target=target[key]??={};if(last.startsWith("-="))delete target[last.slice(2)];else target[last]=copy(value);}return document;}
const release=item=>Object.values(item.system.activities).find(activity=>activity.flags?.[SCOPE]?.professionProductActivity?.key==="release");
const activeGame=()=>({user:{id:"gm",isGM:true},users:{activeGM:{id:"gm"}}});
function owned(item=copy(V1_EXPLOSIVE)){item.isOwner=true;const actor={id:"migration-"+Math.random(),uuid:"Actor.migration-"+Math.random(),type:"character",isOwner:true,limited:false,items:new Map([[item._id,item]]),calls:[],async performBulkUpdate(updates){this.calls.push(copy(updates));for(const update of updates.item??[])apply(this.items.get(update._id),update);}};return actor;}
async function globals(values,callback){const old={};for(const[key,value]of Object.entries(values)){old[key]={has:Object.hasOwn(globalThis,key),value:globalThis[key]};globalThis[key]=value;}try{return await callback();}finally{for(const[key,value]of Object.entries(old))if(value.has)globalThis[key]=value.value;else delete globalThis[key];}}

test("only known managed version-one products receive an author migration",()=>{for(const change of [item=>item.flags[SCOPE].professionProductsContentVersion=0,item=>item.flags[SCOPE].professionProduct.id="custom",item=>item.flags[SCOPE].professionProductManaged=false,item=>item.flags[SCOPE].professionProduct.level=99]){const item=copy(V1_EXPLOSIVE);change(item);assert.equal(patch(item),null);}});
test("migration preserves item identity, quantity, player name, folder, effects and custom activities",()=>{const item=copy(V1_EXPLOSIVE);item.name="Explosão de Lin";item.system.quantity=9;item.folder="playerFolder";item.effects=[{_id:"customEffect",changes:[{key:"custom",value:4}]}];item.system.activities.custom={_id:"custom",type:"utility",roll:{formula:"2d4"}};const before=copy(item),update=patch(item);assert.equal(update._id,item._id);const result=apply(copy(item),update);for(const key of ["_id","name","folder","effects"])assert.deepEqual(result[key],before[key]);assert.equal(result.system.quantity,9);assert.deepEqual(result.system.activities.custom,before.system.activities.custom);assert.equal(result.flags[SCOPE].professionProductsContentVersion,2);assert.deepEqual(item,before);});
test("legacy explosive release becomes a native save while preserving user damage, targets and costs",()=>{const item=copy(V1_EXPLOSIVE),activity=release(item);activity.damage.parts[0].custom.formula="11d6 + 2";activity.target.template.size="18";activity.activation.value=3;activity.consumption.targets.push({type:"attribute",target:"energy.total",value:"7"});const before=copy(activity),result=apply(copy(item),patch(item)),fixed=release(result),canonical=release(professionProductDocument("talisma-explosivo"));assert.equal(fixed.type,"save");assert.equal(fixed.damage.onSave,"half");assert.deepEqual(fixed.save,canonical.save);assert.deepEqual(fixed.conditions,[]);assert.equal(fixed.damage.critical,undefined);assert.deepEqual(fixed.damage.parts,before.damage.parts);assert.deepEqual(fixed.target,before.target);assert.deepEqual(fixed.activation,before.activation);assert.deepEqual(fixed.consumption,before.consumption);});
test("custom save settings, conditions and nonlegacy critical data survive migration",()=>{const item=copy(V1_EXPLOSIVE),activity=release(item);activity.save={ability:["wis"],dc:{calculation:"flat",formula:"42"},bonus:"custom"};activity.conditions=["poisoned"];activity.damage.critical={allow:true,bonus:"9"};const fixed=release(apply(copy(item),patch(item)));assert.deepEqual(fixed.save,activity.save);assert.deepEqual(fixed.conditions,["poisoned"]);assert.deepEqual(fixed.damage.critical,activity.damage.critical);});
test("only the exact historical pendingResolution blocker is removed",()=>{const item=copy(V1_EXPLOSIVE),old=release(item).flags[SCOPE].professionProductActivity.pendingResolution;assert.ok(old);const fixed=release(apply(copy(item),patch(item)));assert.equal(fixed.flags[SCOPE].professionProductActivity.pendingResolution,undefined);release(item).flags[SCOPE].professionProductActivity.pendingResolution="Aguardar decisão específica da campanha";assert.equal(release(apply(copy(item),patch(item))).flags[SCOPE].professionProductActivity.pendingResolution,"Aguardar decisão específica da campanha");});
test("resolved author notes are removed while custom pending instructions remain",()=>{const item=copy(V1_EXPLOSIVE);item.flags[SCOPE].professionProductAutomation.pending.push("Conferir raio com o jogador");const result=apply(copy(item),patch(item));assert.deepEqual(result.flags[SCOPE].professionProductAutomation.pending,["Conferir raio com o jogador"]);const pill=apply(copy(V1_PILL),patch(copy(V1_PILL)));assert.deepEqual(pill.flags[SCOPE].professionProductAutomation.pending,[]);});
test("description migration keeps custom prose and corrects only the known explosive wording",()=>{const item=copy(V1_EXPLOSIVE);item.system.description.value+="<p>Nota do jogador: metade se falharem em outra técnica.</p>";release(item).description.value+="<p>Alcance adaptado pela mesa.</p>";const result=apply(copy(item),patch(item));assert.match(result.system.description.value,/Nota do jogador: metade se falharem em outra técnica/);assert.match(release(result).description.value,/Alcance adaptado pela mesa/);assert.doesNotMatch(result.system.description.value,/Confirmar se os percentuais|confirme todo.metade|fonte diz dano total ou metade/);assert.doesNotMatch(release(result).description.value,/Uso bloqueado — pendente:.*O texto não define/s);assert.match(result.system.description.value,/falha.*metade.*sucesso/s);assert.match(result.system.description.value,/materiais/);assert.match(apply(copy(V1_PILL),patch(copy(V1_PILL))).system.description.value,/apenas.*Criação|somente.*Criação/);});
test("new material-only pricing uses stored product level and supplies a native GP sale price from zero",()=>{const item=copy(V1_PILL);item.flags[SCOPE].professionProduct.level=2;item.system.price={value:0,denomination:"gp"};const result=apply(copy(item),patch(item));assert.equal(result.flags[SCOPE].professionProductPricing.basis,"ingredients");assert.equal(result.flags[SCOPE].professionProductPricing.creation.amount,1350);assert.deepEqual(result.system.price,{value:202.5,denomination:"gp"});});
test("custom nonzero prices are preserved while a validated old canonical quote can be refreshed",()=>{const item=copy(V1_PILL);item.system.price={value:987,denomination:"gp"};assert.deepEqual(apply(copy(item),patch(item)).system.price,item.system.price);const quote=professionPrice(1,{basis:"recipeAndMaterials",creationPercent:60,salePercent:15});item.flags[SCOPE].professionProductPricing=quote;item.system.price={value:quote.sale.amount,denomination:"gp"};assert.deepEqual(apply(copy(item),patch(item)).system.price,{value:90,denomination:"gp"});});
test("crystal quotes use native crystal prices and upper markets keep their own rank",()=>{const item=copy(V1_PILL);item.flags[SCOPE].professionProduct.level=4;const result=apply(copy(item),patch(item));assert.equal(result.flags[SCOPE].professionProductPricing.sale.currency,"spiritualCrystals");assert.deepEqual(result.system.price,{value:13.5,denomination:"essence-human"});item.flags[SCOPE].professionProduct.level=7;const upper=apply(copy(item),patch(item));assert.equal(upper.flags[SCOPE].professionProductPricing.reason,null);assert.deepEqual(upper.system.price,{value:15,denomination:"essence-sacred"});});
test("read-only and limited owned sources do not produce patches",()=>{for(const properties of [{isOwner:false},{limited:true}]){const item=Object.assign(copy(V1_EXPLOSIVE),properties);assert.equal(patch(item),null);}});
test("owned migration uses one native item bulk update and becomes idempotent at version two",async()=>{const actor=owned();assert.equal(await migrate(actor,activeGame()),1);assert.equal(actor.calls.length,1);assert.equal(actor.calls[0].item.length,1);assert.equal(await migrate(actor,activeGame()),0);assert.equal(actor.calls.length,1);});
test("owned migration requires the active GM and full actor ownership",async()=>{for(const change of [(a,g)=>g.user.isGM=false,(a,g)=>g.users.activeGM.id="other",a=>a.isOwner=false,a=>a.limited=true]){const actor=owned(),game=activeGame();change(actor,game);assert.equal(await migrate(actor,game),0);assert.equal(actor.calls.length,0);}});
test("concurrent owned migrations share the actor transaction queue without duplicate writes",async()=>{const actor=owned();const results=await Promise.all([migrate(actor,activeGame()),migrate(actor,activeGame())]);assert.equal(results.reduce((a,b)=>a+b,0),1);assert.equal(actor.calls.length,1);});
test("ownership is rechecked after waiting behind another elemental transaction",async()=>{const actor=owned();let release,entered;const started=new Promise(resolve=>entered=resolve);const hold=withElementalActorLock(actor,"other-elemental-work",async()=>{entered();await new Promise(resolve=>release=resolve);});await started;const pending=migrate(actor,activeGame());actor.isOwner=false;release();await hold;assert.equal(await pending,0);assert.equal(actor.calls.length,0);});
test("ready and later import hooks migrate eligible actor items once and ignore loose items",async()=>{assert.equal(typeof migration.registerProfessionProductMigrations,"function");const callbacks={},hooks={once:(name,callback)=>callbacks[name]=callback,on:(name,callback)=>callbacks[name]=callback};migration.registerProfessionProductMigrations(hooks);const actor=owned(),game={...activeGame(),actors:[actor]};await globals({game},()=>callbacks.ready());assert.equal(actor.calls.length,1);const imported=copy(V1_PILL);imported.isOwner=true;actor.items.set(imported._id,imported);imported.actor=actor;await globals({game},()=>callbacks.createItem(imported));assert.equal(actor.calls.length,2);await globals({game},()=>callbacks.createItem(copy(V1_PILL)));assert.equal(actor.calls.length,2);});
function packFixture(){const docs=[...professionProductCompendiumDocuments(),...chineseWeaponCompendiumDocuments(),...essenceCrystalCompendiumDocuments(),...beastCoreCompendiumDocuments()],sources=new Map(docs.filter(doc=>doc.type!=="Item").map(doc=>[doc._id,copy(doc)]));const old=copy(V1_EXPLOSIVE);old.name="Talismã editado no compêndio";old.system.quantity=11;sources.set(old._id,old);const calls={configure:[],updates:[],reads:0},pack={collection:"Immortals-system.equipamentos",documentName:"Item",locked:true,folders:docs.filter(doc=>doc.type==="Item"),async getIndex(){return [...sources.keys()].map(_id=>({_id}));},async getDocuments(query){calls.reads++;return [...sources.values()].filter(doc=>!query?._id__in||query._id__in.includes(doc._id));},async configure(update){calls.configure.push(copy(update));Object.assign(this,update);}};const game={...activeGame(),packs:{get:()=>pack}},Item={implementation:{async updateDocuments(updates,options){calls.updates.push({updates:copy(updates),options});for(const update of updates)apply(sources.get(update._id),update);},createDocuments(){throw Error("No missing items expected");}}};return{sources,calls,pack,game,Item,Folder:{}};}
test("existing public version-one sources are narrowly migrated under a temporary pack unlock",async()=>{const f=packFixture();assert.deepEqual(await ensureProfessionProductsCompendium(f),{created:0,folders:0});assert.equal(f.calls.updates.length,1);assert.equal(f.calls.updates[0].options.pack,"Immortals-system.equipamentos");const item=f.sources.get(V1_EXPLOSIVE._id);assert.equal(item.name,"Talismã editado no compêndio");assert.equal(item.system.quantity,11);assert.equal(release(item).type,"save");assert.equal(f.pack.locked,true);assert.deepEqual(f.calls.configure,[{locked:false},{locked:true}]);await ensureProfessionProductsCompendium(f);assert.equal(f.calls.updates.length,1);assert.equal(f.calls.configure.length,2);});
test("a public migration failure restores locking and preserves all existing item fields",async()=>{const f=packFixture(),before=copy(f.sources.get(V1_EXPLOSIVE._id));f.Item.implementation.updateDocuments=async()=>{throw Error("Migration failed");};await assert.rejects(ensureProfessionProductsCompendium(f),/Migration failed/);assert.equal(f.pack.locked,true);assert.deepEqual(f.sources.get(V1_EXPLOSIVE._id),before);});

test("crafted owned v1 copies marked unmanaged retain provenance and edits while receiving confirmed author fixes",async()=>{const item=copy(V1_EXPLOSIVE);item.flags[SCOPE].professionProductManaged=false;item.flags[SCOPE].professionCraft={productId:"talisma-explosivo",level:1,success:true,dc:16,totals:[{skill:"ani",total:22}],at:12345};item.name="Lote explosivo de Lin";item.system.quantity=4;const craft=copy(item.flags[SCOPE].professionCraft),actor=owned(item);item.actor=actor;assert.ok(patch(item));assert.equal(await migrate(actor,activeGame()),1);const updated=actor.items.get(item._id);assert.equal(updated.name,"Lote explosivo de Lin");assert.equal(updated.system.quantity,4);assert.deepEqual(updated.flags[SCOPE].professionCraft,craft);assert.equal(updated.flags[SCOPE].professionProductManaged,false);assert.equal(release(updated).type,"save");assert.equal(updated.flags[SCOPE].professionProductsContentVersion,2);});
test("known owned configured copies marked unmanaged need canonical configuration and native item type",()=>{const item=copy(V1_EXPLOSIVE);item.flags[SCOPE].professionProductManaged=false;const actor=owned(item);item.actor=actor;assert.ok(patch(item));item.flags[SCOPE].professionProduct.extraCustomMode=true;assert.equal(patch(item),null);delete item.flags[SCOPE].professionProduct.extraCustomMode;item.type="weapon";assert.equal(patch(item),null);});

test("active-GM public migration reads raw source from read-only locked-pack documents",async()=>{const f=packFixture();f.pack.getDocuments=async query=>[...f.sources.values()].filter(doc=>query._id__in.includes(doc._id)).map(source=>({id:source._id,isOwner:false,toObject:()=>copy(source)}));assert.deepEqual(await ensureProfessionProductsCompendium(f),{created:0,folders:0});assert.equal(f.calls.updates.length,1);assert.equal(release(f.sources.get(V1_EXPLOSIVE._id)).type,"save");assert.equal(f.pack.locked,true);assert.deepEqual(f.calls.configure,[{locked:false},{locked:true}]);});
