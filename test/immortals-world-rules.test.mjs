import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { ensureWorldRules } from "../module/systems/fixed-world-rules.mjs";
import Ruleset from "../module/systems/ruleset.mjs";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
function registrations() {
  const registered = new Map();
  const statements = read("module/settings.mjs").match(/  game.settings.register\("Immortals-system", "(?:rulesetVersion|regraSalvaguarda|showWorldRulesOnEntry)", \{[\s\S]*?\r?\n  }\);/g) ?? [];
  for (const statement of statements) new Function("game", statement)({settings:{register:(_scope,key,definition)=>registered.set(key,definition)}});
  return registered;
}
function world({version="1.0", saves=false, gm=true, activeGM="gm"}={}) {
  const settings = new Map([["rulesetVersion",version],["regraSalvaguarda",saves]]), defaults=registrations();
  const state={settings,writes:[],prompts:0,reloads:0,broadcasts:[],actorWrites:0,events:[]};
  globalThis.game={world:{id:"world"},user:{id:"gm",isGM:gm},users:{activeGM:{id:activeGM}},
    actors:[{update:()=>state.actorWrites++}],
    settings:{get:(_scope,key)=>settings.get(key) ?? defaults.get(key)?.default,set:async(scope,key,value)=>{
      assert.equal(scope,"Immortals-system");if(state.fail===key)throw Error("Setting unavailable");
      state.writes.push([key,value]);state.events.push("write:"+key);settings.set(key,value);
    }},socket:{emit:event=>{state.broadcasts.push(event);state.events.push(event);}}};
  globalThis.foundry={utils:{debouncedReload:()=>{state.reloads++;state.events.push("reloadLocal");}},
    applications:{api:{DialogV2:{wait:async()=>{state.prompts++;return null;}}}}};
  return state;
}

test("new worlds register only internal 2.0 and three-save defaults, without rule controls",()=>{
  const settings=registrations(), version=settings.get("rulesetVersion"), saves=settings.get("regraSalvaguarda");
  assert.equal(version.default,"2.0");assert.equal(version.config,false);assert.deepEqual(Object.keys(version.choices),["2.0"]);
  assert.equal(saves.default,true);assert.equal(saves.config,false);assert.equal(saves.scope,"world");
  assert.equal(settings.has("showWorldRulesOnEntry"),false);
});
test("old worlds adopt 2.0 and three saves before one client reload, without a modal or actor writes",async()=>{
  const state=world();assert.equal(await ensureWorldRules(),true);
  assert.deepEqual(state.writes,[["rulesetVersion","2.0"],["regraSalvaguarda",true]]);
  assert.deepEqual(state.events,["write:rulesetVersion","write:regraSalvaguarda","reload","reloadLocal"]);
  assert.equal(state.prompts,0);assert.equal(state.actorWrites,0);
  assert.equal(await ensureWorldRules(),false);assert.equal(state.reloads,1);assert.equal(state.writes.length,2);
});
test("new worlds and already updated worlds enter without writes, reloads, or prompts",async()=>{
  for(const options of [{version:null,saves:null},{version:"2.0",saves:true}]){
    const state=world(options);assert.equal(await ensureWorldRules(),false);
    assert.deepEqual(state.writes,[]);assert.equal(state.reloads,0);assert.equal(state.prompts,0);
  }
});
test("players and other GMs never attempt world writes or reload anyone",async()=>{
  for(const options of [{gm:false},{activeGM:"someone-else"}]){const state=world(options);
    assert.equal(await ensureWorldRules(),false);assert.deepEqual(state.writes,[]);assert.equal(state.reloads,0);assert.equal(state.prompts,0);}
});
test("partial failures preserve existing actor data and can retry before any client reload",async()=>{
  const state=world();state.fail="regraSalvaguarda";
  await assert.rejects(ensureWorldRules(),/Setting unavailable/);
  assert.equal(state.reloads,0);assert.deepEqual(state.broadcasts,[]);assert.equal(state.actorWrites,0);
  state.fail=null;assert.equal(await ensureWorldRules(),true);assert.equal(state.settings.get("rulesetVersion"),"2.0");
  assert.equal(state.settings.get("regraSalvaguarda"),true);assert.equal(state.reloads,1);assert.equal(state.prompts,0);
});
test("the actual ready callback normalizes old worlds without entering the removed rules modal",async()=>{
  const state=world();let ready,welcome=0;
  const hook=read("dnd5e.mjs").match(/Hooks.once\("dnd5e.ready", async \(\) => \{[\s\S]*?\r?\n}\);/)[0];
  new Function("Hooks","presentWorldRules","ensureWorldRules","applications","ui",hook)(
    {once:(name,callback)=>{assert.equal(name,"dnd5e.ready");ready=callback;}},ensureWorldRules,ensureWorldRules,
    {WelcomeScreen:{presentScreen:()=>welcome++}},{notifications:{error:message=>{throw Error(message);}}});
  await ready();assert.equal(state.settings.get("rulesetVersion"),"2.0");assert.equal(state.settings.get("regraSalvaguarda"),true);
  assert.equal(state.prompts,0);assert.equal(state.reloads,1);assert.equal(welcome,0);
  await ready();assert.equal(state.reloads,1);assert.equal(welcome,1);
});
test("the ruleset fallback selects the new sheet before a world value has been saved",()=>{
  world({version:null,saves:null});assert.equal(Ruleset.version,"2.0");assert.equal(Ruleset.isV2(),true);
});
