import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import Ruleset from '../module/systems/ruleset.mjs';
globalThis.game={settings:{get:(_scope,key)=>key==='rulesetVersion'?'2.0':false}};
Number.prototype.toNearest??=function(step){return Math.round(this/step)*step;};Math.clamp??=((v,a,b)=>Math.min(b,Math.max(a,v)));
const source=readFileSync(new URL('../module/data/actor/templates/attributes.mjs',import.meta.url),'utf8');
test('carga multiplica também bônus manuais sem aumentar o peso dos itens',()=>{
 globalThis.CONFIG={DND5E:{encumbrance:{baseUnits:{default:{imperial:'lb'}},threshold:{encumbered:{imperial:1},heavilyEncumbered:{imperial:2},maximum:{imperial:3}}},actorSizes:{orderedKeys:['med'],med:{token:1}}}};
 const body=source.match(/static prepareEncumbrance\(rollData, \{ validateItem \}=\{\}\) \{([\s\S]*?)\n  \}/)[1];
 const prepare=new Function('Ruleset','CONFIG','game','simplifyBonus','convertWeight','return function(rollData,{validateItem}={}){'+body+'}')(Ruleset,CONFIG,game,Number,n=>n);
 const system={abilities:{str:{value:3}},traits:{size:'med'},attributes:{encumbrance:{bonuses:{maximum:2,overall:0,encumbered:0,heavilyEncumbered:0},multipliers:{maximum:1,overall:1,encumbered:1,heavilyEncumbered:1}}}};
 system.parent={type:'character',items:[{system:{totalWeightIn:()=>7}}],flags:{},system:{cultivation:{bodyCultivation:1}}};
 prepare.call(system,{});assert.equal(system.attributes.encumbrance.max,110);assert.equal(system.attributes.encumbrance.value,7);assert.equal(system.attributes.encumbrance.mod,10);
});
test('Maravilhas soma cinco metros antes de multiplicar e continua respeitando impedimentos de movimento',()=>{
 globalThis.CONFIG={DND5E:{movementTypes:{walk:{},fly:{}},defaultUnits:{length:{imperial:'ft'}},conditionTypes:{}}};
 const body=source.match(/static prepareMovement\(rollData=this\.parent\.getRollData\(\)\) \{([\s\S]*?)\n  \}/)[1];
 const prepare=new Function('Ruleset','simplifyBonus','defaultUnits','convertLength','ConditionData','return function(rollData){'+body+'}')(Ruleset,v=>Number(v)||0,()=> 'm',v=>v,{hasLevels:()=>false});
 const actor={type:'character',uuid:'Actor.lin',flags:{},system:{cultivation:{bodyCultivation:5}},statuses:new Set(),hasConditionEffect:()=>false};actor.statuses.reduce=(_fn,initial)=>initial;
 const system={parent:actor,abilities:{str:{value:3}},traits:{},_source:{attributes:{movement:{speeds:{walk:8}}}},attributes:{ac:{},movement:{speeds:{walk:8,fly:0},units:'m',bonus:0,multiplier:1}}};
 prepare.call(system,{});assert.equal(system.attributes.movement.speed,13);assert.equal(system.attributes.movement.speeds.fly,0);
 game.combat={id:'combat',started:true,round:1,turn:0,combatant:{id:'lin',actor}};actor.flags['Immortals-system']={bodyMaravilhas:{turn:'combat:1:lin'}};system.attributes.movement.speeds.walk=8;prepare.call(system,{});assert.equal(system.attributes.movement.speed,39);
 actor.hasConditionEffect=key=>key==='noMovement';system.attributes.movement.speeds.walk=8;prepare.call(system,{});assert.equal(system.attributes.movement.speed,0);
});

test('rolagem nativa melhora o dado da arma e o versátil sem alterar dados salvos ou dano adicional',()=>{
 const attack=readFileSync(new URL('../module/data/activity/attack-data.mjs',import.meta.url),'utf8');
 const start=attack.indexOf('  _processDamagePart(damage, rollConfig, rollData, index=0, options={}) {');const end=attack.indexOf('\n  }',start);
 const method=attack.slice(start,end+4);
 class Base{_processDamagePart(damage){return{parts:[damage.number+'d'+damage.denomination],data:{mod:3},options:{}};}}
 class Roll{get isDeterministic(){return false;}}
 const Native=new Function('Base','Ruleset','Roll','simplifyBonus','return class extends Base {'+method+'}')(Base,Ruleset,Roll,Number);
 globalThis.foundry={utils:{setProperty(){}}};
 const activity=new Native();activity.actor={system:{cultivation:{bodyCultivation:1}},getFlag:()=>0};activity.getActionType=()=> 'mwak';activity.attack={type:{classification:'weapon'}};
 const versatile={number:1,denomination:8,clone(){return{...this};}};activity.item={type:'weapon',system:{isVersatile:true,damage:{versatile},magicalBonus:0}};
 const damage={base:true,number:1,denomination:6,clone(){return{...this};},steppedDenomination(){return 6;}};
 assert.equal(activity._processDamagePart(damage,{},{}).parts[0],'1d8');assert.equal(damage.denomination,6);
 assert.equal(activity._processDamagePart(damage,{attackMode:'twoHanded'},{}).parts[0],'1d10');assert.equal(versatile.denomination,8);
 assert.equal(activity._processDamagePart({...damage,base:false},{},{}).parts[0],'1d6');
});
