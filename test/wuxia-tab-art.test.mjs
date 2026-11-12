import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {buildLegacy2Context,LEGACY2_TABS,LEGACY2_TAB_ICONS} from '../module/applications/actor/jj/legacy2-sheet.mjs';
import {buildNpc2Context,NPC2_TABS} from '../module/applications/actor/jj/legacy2-npc-sheet.mjs';
const require=createRequire(import.meta.url),hbs=require('handlebars').create();
for(const [key,fn]of Object.entries({eq:(a,b)=>a===b,or:(...a)=>a.slice(0,-1).some(Boolean),and:(...a)=>a.slice(0,-1).every(Boolean),not:a=>!a}))hbs.registerHelper(key,fn);
hbs.registerPartial('systems/Immortals-system/templates/actors/parts/jj2-icon.hbs',readFileSync(new URL('../templates/actors/parts/jj2-icon.hbs',import.meta.url),'utf8'));
const render=hbs.compile(readFileSync(new URL('../templates/actors/character-tabs-hunter-2.hbs',import.meta.url),'utf8'));
const keys=['str','dex','con','int','wis','cha'],config={abilities:Object.fromEntries(keys.map(k=>[k,{label:k,abbreviation:k}])),movementTypes:{},movementUnits:{}};
const rules={estilo:()=>null,atributoPrincipal:()=>'str',npcPrincipal:()=>'dex',rankBonus:()=>0,rankLabel:()=>'Destreinado',nivel:()=>7,atributosAdicionais:()=>0,trainingPointsTotal:()=>4,trainingPointsAvailable:()=>4};
function actor(type){return{type,isOwner:true,system:{abilities:Object.fromEntries(keys.map(k=>[k,{value:5,_source:{value:1}}])),legacy2:{nd:'7',categoria:'elite',actions:{value:2,max:8}},attributes:{hp:{value:90,max:120},movement:{}},energy:{total:80,max:120,generated:12},armorPoints:{value:25,max:20}},items:[],getFlag(){}};}
const context=type=>type==='npc'?buildNpc2Context(actor(type),config,rules,{}):buildLegacy2Context(actor(type),config,rules);
function tabs(type){return(type==='npc'?NPC2_TABS:LEGACY2_TABS).map(([id,label,icon])=>({id,label,icon:icon??LEGACY2_TAB_ICONS[id],active:id==='details'}));}
test('player and NPC presentation covers all navigation entries with thirteen own WebP assets',()=>{
 const paths=new Set();for(const type of ['character','npc']){const data=context(type);assert(data.tabImages);assert.deepEqual(Object.keys(data.tabImages).sort(),tabs(type).map(t=>t.id).sort());for(const tab of tabs(type)){const file=data.tabImages[tab.id];assert.match(file,/^systems\/Immortals-system\/assets\/wuxia\/tabs-neutras-v2\/[^/]+\.webp$/);paths.add(file);}}assert.equal(paths.size,13);
 const player=context('character').tabImages,npc=context('npc').tabImages;assert.equal(player.biography,undefined);assert(npc.biography);assert.notEqual(npc.details,npc.specialTraits);assert.equal(player.details,npc.details);assert.equal(player.features,npc.features);
});
test('both real tab menus render individual cutout images with the existing labels and native actions',()=>{
 for(const type of ['character','npc']){const entries=tabs(type),html=render({tabs:entries,jj2:context(type)});assert.equal((html.match(/class="iw-tab-art"/g)??[]).length,entries.length);assert.equal((html.match(/data-action="tab"/g)??[]).length,entries.length);assert.equal((html.match(/aria-pressed="true"/g)??[]).length,1);for(const tab of entries){assert(html.includes('data-tab="'+tab.id+'"'));assert(html.includes('data-tooltip="'+tab.label+'"'));assert(html.includes('aria-label="'+tab.label+'"'));assert(html.includes('src="'+context(type).tabImages[tab.id]+'"'));}assert.equal((html.match(/aria-hidden="true"/g)??[]).length,entries.length);}
});
test('unknown extension tabs retain the SVG fallback and tab artwork never mutates actor data',()=>{
 const html=render({tabs:[{id:'extension',label:'Extensão',icon:'dice'}],jj2:{tabImages:{}}});assert(!html.includes('class="iw-tab-art"'));assert(html.includes('<svg'));assert(html.includes('aria-label="Extensão"'));
 for(const type of ['character','npc']){const a=actor(type),before=structuredClone(a.system);if(type==='npc')buildNpc2Context(a,config,rules,{});else buildLegacy2Context(a,config,rules);assert.deepEqual(a.system,before);}
});
