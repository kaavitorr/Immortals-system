import {test} from "node:test";
import assert from "node:assert/strict";
import Handlebars from "handlebars";
import {readFile} from "node:fs/promises";
import {prepareBeastEssenceSelectionContext} from "../module/systems/beast-essence-selections.mjs";
let editor;try{editor=await import("../module/applications/shared/beast-essence-selection-editor.mjs");}catch(e){if(e.code!=="ERR_MODULE_NOT_FOUND")throw e;}
const scope="Immortals-system";
const essence=()=>({version:1,id:"essence",name:"Lobo <antigo>",growth:"human",archetype:{features:Array.from({length:8},(_,i)=>({key:"a"+i,level:i+1,data:{name:"Habilidade "+i,type:"feat",system:{activities:{}}}}))},features:[],attacks:[],normalFeatures:[],weakenedFeatures:[],normalAttacks:[],weakenedAttacks:[]});
test("selection dialog renders independent five/one checkboxes, existing choices and escaped names",async()=>{
 const source=await readFile(new URL("../templates/apps/beast-essence-selections.hbs",import.meta.url),"utf8"),render=Handlebars.compile(source),e=essence();e.normalArchetypeFeatures=["a0"];e.weakenedArchetypeFeatures=["a7"];
 const html=render(prepareBeastEssenceSelectionContext(e));assert.match(html,/Lobo &lt;antigo&gt;/);assert.match(html,/Normal: até 5/);assert.match(html,/Enfraquecida: até 1/);
 assert.equal((html.match(/name="normalArchetypeFeatures"/g)??[]).length,8);assert.equal((html.match(/name="weakenedArchetypeFeatures"/g)??[]).length,8);assert.equal((html.match(/checked/g)??[]).length,2);
});
test("Narrator can configure an existing world essence and cancellation or lost permission never writes",async()=>{
 assert.equal(typeof editor?.editBeastEssenceItemSelections,"function");globalThis.game={user:{isGM:true},packs:new Map()};const updates=[],item={id:"loot",isOwner:true,flags:{[scope]:{beastEssenceItem:{version:1,definition:essence()}}},update:async patch=>updates.push(patch)};
 await editor.editBeastEssenceItemSelections(item,{requestSelections:async()=>({normalArchetypeFeatures:["a0","a1","a2","a3","a4"],weakenedArchetypeFeatures:["a7"]})});assert.equal(updates.length,1);assert.equal(updates[0]["flags."+scope+".beastEssenceItem.definition"].normalArchetypeFeatures.length,5);
 await editor.editBeastEssenceItemSelections(item,{requestSelections:async()=>null});assert.equal(updates.length,1);
 await assert.rejects(()=>editor.editBeastEssenceItemSelections(item,{requestSelections:async()=>{game.user.isGM=false;return {};}}),/Narrador/);assert.equal(updates.length,1);
});


test("capture review exposes archetype choices separately from automatic taxonomy traits",async()=>{
 const {prepareBeastEssenceCaptureContext}=await import("../module/systems/beast-essence-death.mjs");
 const snapshot={...essence(),sourceRealm:2,highestAbilities:["str"],elements:[],naturalWeapons:[],taxonomy:{name:"Taxonomia",features:[]}},form={selection:{normalArchetypeFeatures:["a0"],weakenedArchetypeFeatures:["a7"]}};
 const context=prepareBeastEssenceCaptureContext(snapshot,{record:()=>({}),references:[]},form),render=Handlebars.compile(await readFile(new URL("../templates/apps/beast-essence-capture.hbs",import.meta.url),"utf8"));
 const html=render(context);assert.equal((html.match(/name="normalArchetypeFeatures"/g)??[]).length,8);assert.equal((html.match(/name="weakenedArchetypeFeatures"/g)??[]).length,8);assert.equal(context.profiles[1].features[0].normal,true);assert.equal(context.profiles[1].features[7].weakened,true);
});
