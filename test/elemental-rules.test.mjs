import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as rules from '../module/systems/elemental-rules.mjs';
const rule = name => { assert.equal(typeof rules[name], 'function', name + ' must be exported'); return rules[name]; };
const actor = (abilities = {}, state = {}) => ({type:'character',flags:{'Immortals-system':{elementalState:state}},system:{elementAbilities:abilities,conceitos:{metal:{level:9},ilusao:{level:4}},cultivation:{rank:4}}});
const totals = parts => parts.reduce((sum, part) => sum + part.value, 0);

test('tiers reject invalid abilities and clamp malformed saved progression', () => {
 const tier = rule('elementalTier'), a = actor({fogo:{qiFlamejante:9,avatarChamas:3},agua:{qiFluido:-1}});
 assert.equal(tier(a,'fogo','qiFlamejante'),3);
 assert.equal(tier(a,'fogo','avatarChamas'),1);
 assert.equal(tier(a,'agua','qiFluido'),0);
 assert.equal(tier(a,'fogo','inventado'),0);
 assert.equal(tier(undefined,'gelo','geada'),0);
 a.system.elementAbilities.fogo.qiFlamejante = Infinity;
 assert.equal(tier(a,'fogo','qiFlamejante'),0);
});

test('passives add both movement sources and leave HP Base as an unapplied value', () => {
 const bonuses = rule('elementalPassiveBonuses');
 for (const [tier,movement,physical] of [[1,8,1],[2,16,3],[3,24,5]]) {
  const b = bonuses(actor({madeira:{qiDenso:tier},terra:{qiImutavel:tier},relampago:{qiEletrico:tier},vento:{ofensivaVento:tier}}));
  assert.equal(b.movement,movement);assert.equal(b.baseHPBonus,tier);assert.equal(b.physicalResistance,physical);
  assert.deepEqual(b.resistances,{bludgeoning:physical,piercing:physical,slashing:physical});
 }
});

test('Avatar and active learned Body Fluid remain separate ordinary and protected resistance', () => {
 const bonuses = rule('elementalPassiveBonuses');
 const a = actor({fogo:{avatarChamas:1},agua:{corpoFluido:1}},{bodyFluid:true});
 assert.equal(bonuses(a).fireResistance,60);assert.equal(bonuses(a).resistances.fire,60);assert.equal(bonuses(a).protectedResistance,25);
 a.flags['Immortals-system'].elementalState.bodyFluid = false;assert.equal(bonuses(a).protectedResistance,0);
 assert.equal(bonuses(actor({}, {bodyFluid:true})).protectedResistance,0);
});

test('Metal increases burst capacity only after learning Shatter', () => {
 const bonuses = rule('elementalPassiveBonuses');
 assert.equal(bonuses(actor()).burstExtraDice,0);
 assert.equal(bonuses(actor({metal:{estracalhar:1}})).burstExtraDice,4);
 const a = actor({metal:{estracalhar:3}});a.system.conceitos.metal.level=10;
 assert.equal(bonuses(a).burstExtraDice,5);
});

test('learning conversions never forces one and attack flat damage keeps its actual types', () => {
 const profile = rule('elementalDamageProfile');
 const a = actor({fogo:{qiFlamejante:2},relampago:{qiEletrico:3,punicaoTrovao:3},gelo:{frioCongelante:3}});
 assert.equal(profile(a).conversion,null);
 assert.deepEqual(profile(a,{isAttack:true}).attackBonuses,[{source:'fogo.qiFlamejante',type:'fire',value:3},{source:'relampago.punicaoTrovao',type:'lightning',value:6}]);
 assert.deepEqual(profile(a,{isTechnique:true}).attackBonuses,[]);
 assert.deepEqual(profile(a,{elementMode:'fire'}).conversion,{elementId:'fogo',type:'fire',fraction:1});
 assert.deepEqual(profile(a,{elementMode:'gelo'}).conversion,{elementId:'gelo',type:'cold',fraction:1});
 assert.equal(profile(actor(),{elementMode:'fire'}).conversion,null);
});

test('saved player selection supplies a half conversion and explicit empty mode disables it', () => {
 const profile = rule('elementalDamageProfile'), a = actor({fogo:{qiFlamejante:1}}, {damageMode:'fogo'});
 assert.deepEqual(profile(a).conversion,{elementId:'fogo',type:'fire',fraction:0.5});
 assert.equal(profile(a,{elementMode:''}).conversion,null);
});

test('active Mind Break uses at most the learned tier and reports recognition without guessing ranks', () => {
 const profile = rule('elementalDamageProfile'), a = actor({ilusao:{mindBreak:2}}, {mindBreak:{tier:3}});
 assert.deepEqual(profile(a,{isAttack:true}).conversion,{elementId:'ilusao',type:'psychic',fraction:1});
 assert.deepEqual(profile(a,{isAttack:true}).attackBonuses,[{source:'ilusao.mindBreak',type:'psychic',value:3}]);
 assert.deepEqual(profile(a).notes,[{code:'mindBreakRecognition',outcome:'unknown'}]);
 const npc = {type:'npc',system:{conceitos:{ilusao:{level:1}}}};
 assert.deepEqual(profile(a,{targetActor:npc}).notes,[{code:'mindBreakRecognition',outcome:'unknown'}]);
 npc.flags={'Immortals-system':{cultivationRank:3}};
 assert.deepEqual(profile(a,{targetActor:npc}).notes,[{code:'mindBreakRecognition',outcome:'affected'}]);
 npc.flags['Immortals-system'].cultivationRank=6;
 assert.deepEqual(profile(a,{targetActor:npc}).notes,[{code:'mindBreakRecognition',outcome:'seesThrough',reason:'cultivationRank'}]);
 npc.system.conceitos.ilusao.level=4;
 assert.deepEqual(profile(a,{targetActor:npc}).notes,[{code:'mindBreakRecognition',outcome:'seesThrough',reason:'illusionConcept'}]);
 assert.equal(profile(actor({}, {mindBreak:{tier:3}})).conversion,null);
});

test('half conversion preserves the combined odd total and source properties without fresh rolls', () => {
 const parts = rule('elementalDamageParts'), a = actor({fogo:{qiFlamejante:1}});
 const input = [{type:'slashing',value:5,properties:new Set(['mgc'])},{type:'piercing',value:4}];
 const before=structuredClone(input), output=parts(input,a,{elementMode:'fogo'});
 assert.equal(totals(output),9);assert.equal(totals(output.filter(p=>p.type==='fire')),4);
 assert.equal(totals(output.filter(p=>p.type==='slashing')),3);assert.equal(totals(output.filter(p=>p.type==='piercing')),2);
 assert.deepEqual(input,before);assert.notEqual(output[0],input[0]);
 assert.deepEqual(output.find(p=>p.type==='slashing').properties,new Set(['mgc']));
 output.find(p=>p.type==='slashing').properties.add('silver');assert.deepEqual(input[0].properties,new Set(['mgc']));
});

test('full conversion preserves mixed damage and appends each attack bonus exactly once', () => {
 const parts = rule('elementalDamageParts'), a = actor({fogo:{qiFlamejante:3},relampago:{punicaoTrovao:3}});
 const output = parts([{type:'slashing',value:11},{type:'cold',value:4}],a,{isAttack:true,elementMode:'fire'});
 assert.equal(totals(output),26);assert.equal(totals(output.filter(p=>p.type==='fire')),20);assert.equal(totals(output.filter(p=>p.type==='lightning')),6);
 assert.deepEqual(parts(output,a,{isAttack:true,elementMode:'fire'}),output);
 const restored=JSON.parse(JSON.stringify(output));assert.deepEqual(parts(restored,a,{isAttack:true,elementMode:'fire'}),restored);
});

test('Shatter adds typed flat damage once for each complete pair of paid burst dice', () => {
 const parts = rule('elementalDamageParts'), a = actor({metal:{estracalhar:3}});
 const output = parts([{type:'fire',value:15}],a,{isAttack:true,burstDice:5,burstType:'piercing'});
 assert.equal(totals(output),21);assert.equal(totals(output.filter(p=>p.type==='piercing')),6);
 assert.deepEqual(parts(output,a,{isAttack:true,burstDice:5,burstType:'piercing'}),output);
 assert.equal(totals(parts([{type:'fire',value:15}],a,{isTechnique:true,burstDice:1})),15);
 assert.equal(totals(parts([{type:'fire',value:15}],actor(),{isAttack:true,burstDice:10})),15);
});

test('healing, maximum HP, temporary HP, negative values and direct costs are never converted or amplified', () => {
 const parts = rule('elementalDamageParts'), a=actor({fogo:{qiFlamejante:3},metal:{estracalhar:3}});
 const input=[{type:'healing',value:12},{type:'temphp',value:5},{type:'maximum',value:2},{type:'slashing',value:-3}];
 assert.deepEqual(parts(input,a,{isAttack:true,elementMode:'fire',burstDice:6}),input);
 const damage=[{type:'slashing',value:10}];
 assert.deepEqual(parts(damage,a,{isAttack:true,elementMode:'fire',burstDice:6,direct:true}),damage);
 assert.deepEqual(parts(damage,a,{isAttack:true,elementMode:'fire',healing:true}),damage);
});

test('Body Fluid consumes the runtime active-object contract without trusting its stored numeric value',()=>{
 const bonuses=rule('elementalPassiveBonuses');
 const a=actor({agua:{corpoFluido:1}},{bodyFluid:{active:true,value:25,upkeepQi:15,pool:'generated',upkeepTurn:'combat:1:actor',source:'agua.corpoFluido',turn:'combat:1:actor'}});
 assert.equal(bonuses(a).protectedResistance,25);
 a.flags['Immortals-system'].elementalState.bodyFluid.value=999;assert.equal(bonuses(a).protectedResistance,25);
 a.flags['Immortals-system'].elementalState.bodyFluid.active=false;assert.equal(bonuses(a).protectedResistance,0);
 assert.equal(bonuses(actor({}, {bodyFluid:{active:true,value:25}})).protectedResistance,0);
});
