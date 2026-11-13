import {test} from "node:test";
import assert from "node:assert/strict";
let editor;try{editor=await import("../module/applications/shared/beast-essence-growth-editor.mjs");}catch(e){if(e.code!=="ERR_MODULE_NOT_FOUND")throw e;}
const scope="Immortals-system";
function fixture(){const calls=[];globalThis.game={user:{isGM:true},packs:new Map()};const item={id:"loot",type:"loot",isOwner:true,flags:{[scope]:{beastEssenceItem:{version:1,definition:{version:1,id:"essence",name:"Lobo",growth:"human"}}}},system:{description:{value:"<p>Minha nota.</p>"}},update:async changes=>calls.push(changes)};return{item,calls};}
test("world essence Rank edits save the current snapshot only after Narrator confirmation",async()=>{
 assert.equal(typeof editor?.editBeastEssenceItemGrowth,"function");const {item,calls}=fixture();
 await editor.editBeastEssenceItemGrowth(item,{requestGrowth:async()=>"earth"});assert.equal(calls.length,1);assert.equal(calls[0]["flags."+scope+".beastEssenceItem.definition"].growth,"earth");assert.equal(calls[0]["system.description.value"],undefined);
 await editor.editBeastEssenceItemGrowth(item,{requestGrowth:async()=>null});assert.equal(calls.length,1);
});
test("locked compendiums, players and permissions lost during the Rank dialog cannot edit essence items",async()=>{
 assert.equal(typeof editor?.editBeastEssenceItemGrowth,"function");const {item,calls}=fixture();game.user.isGM=false;
 await assert.rejects(()=>editor.editBeastEssenceItemGrowth(item,{requestGrowth:async()=>"earth"}),/Narrador/);
 game.user.isGM=true;item.pack="system.essences";game.packs.set(item.pack,{locked:true});
 await assert.rejects(()=>editor.editBeastEssenceItemGrowth(item,{requestGrowth:async()=>"earth"}),/bloqueado/);delete item.pack;
 await assert.rejects(()=>editor.editBeastEssenceItemGrowth(item,{requestGrowth:async()=>{game.user.isGM=false;return "earth";}}),/Narrador/);assert.equal(calls.length,0);
});
