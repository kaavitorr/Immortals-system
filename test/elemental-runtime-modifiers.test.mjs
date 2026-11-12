import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resistanceCards,applyNumericResistances} from '../module/systems/legacy2-resistances.mjs';
import {offensiveBurstLimit} from '../module/applications/activity/legacy2-activation.mjs';
import Ruleset from '../module/systems/ruleset.mjs';
let version='2.0';
globalThis.game={settings:{get:()=>version}};
const actor=(abilities={},state={},resistances={})=>({type:'character',flags:{'Immortals-system':{elementalState:state}},itemTypes:{class:[]},system:{details:{level:8},elementAbilities:abilities,conceitos:{},cultivation:{rank:3,bodyCultivation:0,soulCultivation:0},legacy2:{resistances}},_source:{system:{legacy2:{resistances:structuredClone(resistances)}}}});
const sum=parts=>parts.reduce((total,part)=>total+part.value,0);

test('cards derive additive Avatar and physical ability resistance without changing manual sources',()=>{
 const a=actor({fogo:{avatarChamas:1},terra:{qiImutavel:2}}, {},{fire:{value:7},slashing:{value:5}});
 a.system.conceitos.fogo={level:2};const before=structuredClone(a);
 const cards=resistanceCards(a),fire=cards.find(card=>card.key==='fire'),slash=cards.find(card=>card.key==='slashing');
 assert.equal(fire.value,73);assert.equal(fire.baseValue,7);assert.equal(fire.ordinaryValue,73);assert.equal(fire.protectedValue,0);
 assert.equal(slash.value,8);assert.equal(slash.baseValue,5);
 assert.equal(resistanceCards(a).find(card=>card.key==='fire').value,73);assert.deepEqual(a,before);
});

test('typed parts share each additive resistance once per application',()=>{
 const a=actor({terra:{qiImutavel:3},fogo:{avatarChamas:1}}, {},{slashing:{value:5},fire:{value:4}});
 a.system.conceitos.fogo={level:2};
 const parts=[{type:'slashing',value:10},{type:'slashing',value:8},{type:'fire',value:100},{type:'fire',value:20}];
 applyNumericResistances(a,parts);
 assert.equal(sum(parts.filter(part=>part.type==='slashing')),8);assert.equal(sum(parts.filter(part=>part.type==='fire')),50);
 assert.equal(a.system.legacy2.resistances.slashing.value,5);assert.equal(a.system.legacy2.resistances.fire.value,4);
});

test('Body Fluid protects every canonical type and is excluded from manual editor values',()=>{
 const a=actor({agua:{corpoFluido:1}},{bodyFluid:true});const cards=resistanceCards(a);
 assert(cards.every(card=>card.value===25&&card.protectedValue===25&&card.ordinaryValue===0&&card.baseValue===0));
 const parts=cards.map(card=>({type:card.key,value:40}));applyNumericResistances(a,parts,{ignore:true});
 assert(parts.every(part=>part.value===15));
 assert(parts.every(part=>part.active.type.resistance===true&&part.active.type.protectedResistance===true));
 a.flags['Immortals-system'].elementalState.bodyFluid=false;
 assert(resistanceCards(a).every(card=>card.value===0));
 const unlearned=actor({}, {bodyFluid:true});assert(resistanceCards(unlearned).every(card=>card.value===0));
});

test('bypassing ordinary resistance and immunity cannot erase protected Body Fluid',()=>{
 const a=actor({agua:{corpoFluido:1},fogo:{avatarChamas:1}},{bodyFluid:true},{fire:{value:10,immune:true}});a.system.conceitos.fogo={level:2};
 const run=options=>{const parts=[{type:'fire',value:150}];applyNumericResistances(a,parts,options);return parts[0].value;};
 assert.equal(run({}),0);
 assert.equal(run({ignore:true}),125);
 assert.equal(run({ignore:{immunity:true,resistance:new Set(['fire'])}}),125);
 assert.equal(run({downgrade:true}),49);
 assert.equal(run({ignore:{immunity:true}}),49);
});

test('Soul Penetration reduces ordinary resistance once while Body Fluid stays intact',()=>{
 const a=actor({agua:{corpoFluido:1}},{bodyFluid:true},{soul:{value:10}});a.system.cultivation.soulCultivation=4;
 const source=actor();source.system.cultivation.soulCultivation=5;
 const parts=[{type:'soul',value:30},{type:'soul',value:50}];applyNumericResistances(a,parts,{sourceActor:source});
 assert.equal(sum(parts),40);
 const ignored=[{type:'soul',value:80}];applyNumericResistances(a,ignored,{sourceActor:source,ignore:true});assert.equal(sum(ignored),55);
 const protectedOnly=actor({agua:{corpoFluido:1}},{bodyFluid:true});const plain=[{type:'soul',value:80}];
 applyNumericResistances(protectedOnly,plain,{sourceActor:source});assert.equal(sum(plain),55);
});

test('active learned Wind barrier adds ordinary physical reduction and remains bypassable',()=>{
 const a=actor({vento:{barreiraVento:2},terra:{qiImutavel:2}},{windBarrier:{value:10}},{slashing:{value:2}});
 assert.equal(resistanceCards(a).find(card=>card.key==='slashing').value,15);
 const parts=[{type:'slashing',value:30},{type:'fire',value:30}];applyNumericResistances(a,parts);
 assert.deepEqual(parts.map(part=>part.value),[15,30]);
 const ignored=[{type:'slashing',value:30}];applyNumericResistances(a,ignored,{ignore:true});assert.equal(sum(ignored),30);
 const unlearned=actor({}, {windBarrier:{value:10}});assert.equal(resistanceCards(unlearned).find(card=>card.key==='slashing').value,0);
 a.flags['Immortals-system'].elementalState.windBarrier.active=false;assert.equal(resistanceCards(a).find(card=>card.key==='slashing').value,5);
});

test('Ruleset exposes elemental movement once without altering Body movement or source speed',()=>{
 const a=actor({relampago:{qiEletrico:3},vento:{ofensivaVento:3}});a.system.cultivation.bodyCultivation=5;
 assert.equal(typeof Ruleset.movementBonus,'function');assert.equal(typeof Ruleset.elementalBenefits,'function');
 assert.equal(Ruleset.movementBonus(a),24);assert.equal(Ruleset.movementBonus(a),24);assert.equal(Ruleset.elementalBenefits(a).movement,24);
 assert.equal(Ruleset.bodyBenefits(a).movement,5);
 try{version='1.0';assert.equal(Ruleset.movementBonus(a),0);}finally{version='2.0';}
});

test('offensive burst capacity includes Metal levels once and leaves physical impulse unchanged',()=>{
 const a=actor({metal:{estracalhar:3}});a.system.conceitos.metal={level:9};
 assert.equal(offensiveBurstLimit(a),8);assert.equal(offensiveBurstLimit(a),8);
 a.system.elementAbilities.metal.estracalhar=1;assert.equal(offensiveBurstLimit(a),8);
 delete a.system.elementAbilities.metal.estracalhar;assert.equal(offensiveBurstLimit(a),4);
 a.system.elementAbilities.metal.estracalhar=3;a.itemTypes.class=[{identifier:'restringido'}];assert.equal(offensiveBurstLimit(a),4);
});

test('protected Body Fluid cannot be bypassed by untyped damage or a noncanonical damage type',()=>{
 const a=actor({agua:{corpoFluido:1}},{bodyFluid:true});
 const parts=[{value:40},{type:'force',value:40},{type:'necrotic',value:40},{type:'healing',value:40},{type:'temphp',value:40},{type:'maximum',value:40}];
 applyNumericResistances(a,parts,{ignore:true});assert.deepEqual(parts.map(part=>part.value),[15,15,15,40,40,40]);
});
