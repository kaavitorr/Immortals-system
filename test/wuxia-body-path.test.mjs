import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bodyBenefits,bodyAttributeLimit,bodyWoundRecovery,bodyCureUpdate,bodyRegenerationUpdate,bodyMaravilhasUpdate,bodyAttackAdvantages,stepBodyWeaponDamage} from '../module/systems/body-path.mjs';
const actor=(level=0)=>({type:'character',id:'lin',uuid:'Actor.lin',flags:{},system:{cultivation:{bodyCultivation:level,rank:3},abilities:{con:{value:5}},legacy2:{actions:{value:4,max:6},wounds:{value:23}},attributes:{hp:{value:20,max:60,effectiveMax:49}}}});
const combat=a=>({id:'fight',uuid:'Combat.fight',started:true,round:1,turn:0,combatant:{id:'lin-token',actor:a}});
test('Corpo concede dez PV e uma escolha por nível; os portões substituem os benefícios antigos',()=>{
 for(const [level,pv] of [[0,0],[1,10],[4,40],[6,60],[9,90],[10,100]]){const b=bodyBenefits(actor(level));assert.equal(b.extraHitPoints,pv);assert.equal(b.attributeChoices,level+(level>=4?1:0));}
 const a=actor(6);assert.equal(bodyAttributeLimit(a,'str'),15);assert.equal(bodyAttributeLimit(a,'dex'),15);assert.equal(bodyAttributeLimit(a,'con'),15);assert.equal(bodyAttributeLimit(a,'wis'),12);
 assert.equal(bodyBenefits(actor(5)).movement,5);assert.equal(bodyBenefits(actor(10)).refinement,2);
 assert.equal(bodyBenefits(actor(6)).lifeBaseBonus,1);assert.equal(bodyBenefits(actor(9)).lifeBaseBonus,3);assert.equal(bodyBenefits(actor(10)).qiBaseBonus,5);
});
test('Forjando aumenta só o dado base sem sobrescrever dano de arma ou superar d12',()=>{
 const damage={number:2,denomination:6,bonus:'3',custom:{enabled:false}};const before=structuredClone(damage);
 assert.equal(stepBodyWeaponDamage(actor(1),damage).denomination,8);assert.deepEqual(damage,before);
 assert.equal(stepBodyWeaponDamage(actor(0),damage).denomination,6);assert.equal(stepBodyWeaponDamage(actor(1),{denomination:12}).denomination,12);
 assert.equal(stepBodyWeaponDamage(actor(1),{denomination:20}).denomination,20);
 assert.equal(stepBodyWeaponDamage(actor(1),{custom:{enabled:true,formula:'2d6 + 3'}}).custom.formula,'2d8 + 3');
 assert.equal(stepBodyWeaponDamage(actor(1),{custom:{enabled:true,formula:'@danoCultivo'}}).custom.formula,'@danoCultivo');
});
test('Cura e Vida mudam a recuperação de Feridas sem aplicar percentuais duas vezes',()=>{
 assert.equal(bodyWoundRecovery(actor(2),'short').remaining,23);assert.equal(bodyWoundRecovery(actor(2),'long').remaining,18);
 assert.equal(bodyWoundRecovery(actor(3),'short').remaining,20);assert.equal(bodyWoundRecovery(actor(3),'long').remaining,13);
 assert.equal(bodyWoundRecovery(actor(9),'short').remaining,18);assert.equal(bodyWoundRecovery(actor(9),'long').remaining,0);
});
test('Portão da Cura consome uma ação e um uso, limita a cura e exige o próprio turno',()=>{
 const a=actor(3),c=combat(a),result=bodyCureUpdate(a,c);assert.equal(result.healed,5);assert.equal(result.updates['system.legacy2.actions.value'],3);assert.equal(result.updates['flags.Immortals-system.bodyCureUses'],1);
 a.flags['Immortals-system']={bodyCureTurn:result.updates['flags.Immortals-system.bodyCureTurn']};assert.throws(()=>bodyCureUpdate(a,c),/turno/);
 c.round=2;assert.doesNotThrow(()=>bodyCureUpdate(a,c));a.flags['Immortals-system'].bodyCureUses=5;assert.throws(()=>bodyCureUpdate(a,c),/usos/);
 assert.throws(()=>bodyCureUpdate(actor(2),c),/Cura/);assert.throws(()=>bodyCureUpdate(a,null),/turno/);
 a.flags={};a.system.legacy2.actions.value=0;assert.throws(()=>bodyCureUpdate(a,c),/Ação/);
 a.system.legacy2.actions.value=3;a.system.attributes.hp.value=48;assert.equal(bodyCureUpdate(a,c).healed,1);
});
test('regeneração da Vida recupera CON uma vez por turno e não depende de estar abaixo da metade',()=>{
 const a=actor(9),c=combat(a);a.system.attributes.hp.value=45;const result=bodyRegenerationUpdate(a,c);assert.equal(result.healed,4);
 a.flags['Immortals-system']={bodyRegenerationTurn:result.updates['flags.Immortals-system.bodyRegenerationTurn']};assert.equal(bodyRegenerationUpdate(a,c),null);
 assert.equal(bodyRegenerationUpdate(actor(8),c),null);
});
test('Maravilhas tem três usos por encontro, triplica o movimento uma vez e prepara seis vantagens',()=>{
 const a=actor(5),c=combat(a),result=bodyMaravilhasUpdate(a,c);a.flags['Immortals-system']={bodyMaravilhas:result.updates['flags.Immortals-system.bodyMaravilhas']};
 assert.equal(bodyAttackAdvantages(a,c),6);assert.equal(bodyBenefits(a,c).movementMultiplier,3);
 a.flags['Immortals-system'].bodyMaravilhas.pending=false;assert.equal(bodyAttackAdvantages(a,c),0);assert.equal(bodyBenefits(a,c).movementMultiplier,3);
 a.flags['Immortals-system'].bodyMaravilhas.uses=3;assert.throws(()=>bodyMaravilhasUpdate(a,c),/usos/);
 c.round=2;assert.equal(bodyBenefits(a,c).movementMultiplier,1);assert.equal(bodyAttackAdvantages(a,c),0);
 c.id='new';c.uuid='Combat.new';assert.doesNotThrow(()=>bodyMaravilhasUpdate(a,c));
});
