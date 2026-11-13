import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const manifest=JSON.parse(await readFile(new URL("../system.json",import.meta.url),"utf8"));
const startupSource=await readFile(new URL("../dnd5e.mjs",import.meta.url),"utf8");
const startup=startupSource.match(/^async function _handleMigration\(\) \{[\s\S]*?^\}/m)?.[0];
assert(startup,"native startup migration handler exists");
const runStartup=new Function("game","dnd5e","foundry","migrations","ui","return ("+startup+")();");
const newer=(left,right)=>String(left??"0").localeCompare(String(right??"0"),"en",{numeric:true})>0;
function setup({checkpoint=manifest.version,documents=1,isGM=true,system=manifest}={}) {
 const saved=new Map([["systemMigrationVersion",checkpoint],["firstRun",false]]),calls=[];
 const game={user:{isGM},system:structuredClone(system),world:{flags:{}},actors:{size:documents},scenes:{size:0},items:{size:0},settings:{set:async(scope,key,value)=>{assert.equal(scope,"Immortals-system");saved.set(key,value);calls.push(["save",key,value]);}}};
 const dnd5e={settings:new Proxy({},{get:(_target,key)=>saved.get(key)})},foundry={utils:{isNewerVersion:newer}},ui={notifications:{error:()=>calls.push(["warning"])}};
 const migrations={reparentCompendiums:()=>calls.push(["folders"]),migrateWorld:async()=>{calls.push(["migrate"]);await game.settings.set("Immortals-system","systemMigrationVersion",game.system.version);}};
 return {game,saved,calls,run:()=>runStartup(game,dnd5e,foundry,migrations,ui),count:()=>calls.filter(c=>c[0]==="migrate").length};
}
test("entering an already migrated Immortals world does not run the legacy migration again",async()=>{
 const f=setup();await f.run();await f.run();assert.equal(f.count(),0);assert.deepEqual(f.calls,[]);
});
test("an older world migrates once, persists its version and skips the next login",async()=>{
 const f=setup({checkpoint:"1.2.2"});await f.run();assert.equal(f.count(),1);assert.equal(f.saved.get("systemMigrationVersion"),manifest.version);
 await f.run();assert.equal(f.count(),1);
});
test("a new empty world records the current version without migrating after its first character is created",async()=>{
 const f=setup({checkpoint:null,documents:0});await f.run();assert.equal(f.count(),0);assert.equal(f.saved.get("systemMigrationVersion"),manifest.version);
 f.game.actors.size=1;await f.run();assert.equal(f.count(),0);
});
test("later schema upgrades still migrate once and players do not start world migrations",async()=>{
 const system={...manifest,version:"1.2.4",flags:{...manifest.flags,needsMigrationVersion:"1.2.4"}},f=setup({checkpoint:"1.2.3",system});
 await f.run();await f.run();assert.equal(f.count(),1);
 const player=setup({isGM:false,checkpoint:"1.2.2"});await player.run();assert.equal(player.count(),0);assert.deepEqual(player.calls,[]);
});
test("world migration waits for its completion checkpoint before reporting success",async()=>{
 const source=await readFile(new URL("../module/migration.mjs",import.meta.url),"utf8"),fn=source.match(/^export async function migrateWorld\([\s\S]*?^\}/m)?.[0].replace("export ","");assert(fn);
 const run=new Function("game","ui","getMigrationData","migrateSettings","return ("+fn+")();");
 const collection=()=>Object.assign([],{size:0,invalidDocumentIds:new Set()}),updates=[];let release,writing=false;
 const gate=new Promise(resolve=>release=resolve),game={system:{version:manifest.version},packs:[],actors:collection(),items:collection(),macros:[],tables:[],scenes:[],messages:[],folders:[],settings:{set:async(scope,key,value)=>{assert.equal(scope,"Immortals-system");assert.equal(key,"systemMigrationVersion");assert.equal(value,manifest.version);writing=true;await gate;}}};
 const ui={notifications:{info:()=>({element:{classList:{add(){}}},update:value=>updates.push(value)})}};
 const pending=run(game,ui,async()=>({}),async()=>{});
 try{await new Promise(resolve=>setImmediate(resolve));assert.equal(writing,true);assert.equal(updates.length,0);}finally{release();await pending;}
 assert.equal(updates.length,1);assert.equal(updates[0].pct,1);
});
