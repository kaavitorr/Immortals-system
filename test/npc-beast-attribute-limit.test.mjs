import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import Ruleset from '../module/systems/ruleset.mjs';
import {prepareNpc2Abilities} from '../module/systems/legacy2-npc-attributes.mjs';
import {npcAttributeDistribution, NPC_ABILITIES} from '../module/systems/legacy2-npc-profiles.mjs';
import {buildNpc2Context} from '../module/applications/actor/jj/legacy2-npc-sheet.mjs';
const scope='Immortals-system';
globalThis.CONFIG={JUJUTSU:{}};
globalThis.game={settings:{get:(_scope,key)=>key==='regraSalvaguarda'?true:'2.0'}};
const config={abilities:Object.fromEntries(NPC_ABILITIES.map(key=>[key,{label:key,abbreviation:key}])),movementTypes:{},movementUnits:{}};
const weights={str:12,dex:0,con:0,int:0,wis:0,cha:0};
function npc(level=1,nature='beast') {
 return {type:'npc',flags:{[scope]:{npcNature:nature}},items:[],itemTypes:{class:[]},getFlag(){},
  system:{legacy2:{nd:String(level),categoria:'normal'},abilities:Object.fromEntries(NPC_ABILITIES.map(key=>[key,{value:99,_source:{value:99}}])),attributes:{hp:{},movement:{}},energy:{},armorPoints:{}}};
}
function withProfiles(actor) {
 actor.items=['taxonomy','archetype'].map(type=>({id:type,type,name:type,system:{pesos:weights}}));
 return actor;
}
test('Beast ceilings follow all thirty cultivation levels, starting the extra realm bonus at Lorde Divino',()=>{
 for(let level=1;level<=30;level++)for(const key of NPC_ABILITIES){
  const a=npc(level),expected=14+Math.max(0,Math.ceil(level/3)-5);
  a.flags[scope].cultivationRank=10;a.system.cultivation={rank:10};
  assert.equal(Ruleset.attributeLimit(a,key),expected,level+' '+key);
  assert.equal(Ruleset.attributeLimit(npc(level,'human'),key),12);
 }
});
test('Beast ceilings preserve the matching player path baseline without granting it to players or human NPCs',()=>{
 const a=npc(30);a.flags[scope].soulCultivation=9;
 assert.equal(Ruleset.attributeLimit(a,'wis'),22);assert.equal(Ruleset.attributeLimit(a,'str'),19);
 a.flags[scope].npcNature='human';assert.equal(Ruleset.attributeLimit(a,'wis'),15);
 const player={...npc(30),type:'character',system:{cultivation:{bodyCultivation:6,soulCultivation:9}}};
 for(const key of NPC_ABILITIES)assert.equal(Ruleset.attributeLimit(player,key),15);
 delete player.system.cultivation;assert.equal(Ruleset.attributeLimit(player,'str'),12);
 const legacy=npc();delete legacy.flags[scope].npcNature;assert.equal(Ruleset.attributeLimit(legacy,'str'),12);
 const setting=game.settings.get;game.settings.get=()=> '1.0';
 try{assert.equal(Ruleset.attributeLimit(npc(30),'str'),20);}finally{game.settings.get=setting;}
});
test('manual Beast preparation sets the numeric and native field ceilings and leaves saved values intact',()=>{
 for(const [level,limit]of [[1,14],[15,14],[16,15],[19,16],[22,17],[25,18],[28,19],[30,19]]){
  const a=npc(level);prepareNpc2Abilities(a);
  for(const key of NPC_ABILITIES){assert.equal(a.system.abilities[key].value,limit);assert.equal(a.system.abilities[key].max,limit);assert.equal(a.system.abilities[key]._source.value,99);}
 }
});
test('automatic Beast allocation uses the same ceiling, budget and zero-weight restrictions as preparation',()=>{
 for(let level=1;level<=30;level++)for(const category of ['normal','elite','chefe']){
  const a=withProfiles(npc(level));a.system.legacy2.categoria=category;
  const d=npcAttributeDistribution(a),cap=14+Math.max(0,Math.ceil(level/3)-5);
  assert.equal(d.values.str,Math.min(cap,d.budget-5));
  assert.equal(Object.values(d.values).reduce((sum,v)=>sum+v,0)+d.unspent,d.budget);
  assert.equal(d.budget,npcAttributeDistribution({...a,flags:{[scope]:{npcNature:'human'}}}).budget);
  for(const key of NPC_ABILITIES.filter(key=>key!=='str'))assert.equal(d.values[key],1);
  prepareNpc2Abilities(a);assert.equal(a.system.abilities.str.value,d.values.str);
 }
});
test('sheet fields expose the current Beast ceiling and preserve legal manual values above twelve',()=>{
 const a=npc(30);for(const ability of Object.values(a.system.abilities)){ability.value=19;ability._source.value=19;}
 const view=buildNpc2Context(a,config,Ruleset,{});
 for(const ability of view.abilities){assert.equal(ability.maximum,19);assert.equal(ability.sourceValue,19);}
 const template=readFileSync(new URL('../templates/actors/npc-ability-scores-2.hbs',import.meta.url),'utf8');
 assert.match(template,/max="{{maximum}}"/);
});
