import assert from "node:assert/strict";
import {test} from "node:test";
import {access} from "node:fs/promises";
const art=await import("../module/systems/armor-artwork.mjs").catch(error=>{if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;return {}});
test("heroic artwork covers the ten existing armor IDs and keeps its old images available",async()=>{
 assert(Array.isArray(art.ARMOR_ARTWORK));assert.equal(art.ARMOR_ARTWORK.length,10);
 for(const entry of art.ARMOR_ARTWORK){await access(new URL("../"+entry.image.replace("systems/Immortals-system/",""),import.meta.url));if(entry.previous.startsWith("systems/Immortals-system/"))await access(new URL("../"+entry.previous.replace("systems/Immortals-system/",""),import.meta.url));}
});
test("art revision changes only the stock portrait and never overwrites a custom image or armor data",()=>{
 assert.equal(typeof art.prepareArmorArtworkUpdate,"function");
 for(const entry of art.ARMOR_ARTWORK){const source={_id:entry.id,name:"Nome do mestre",type:"equipment",img:entry.previous,system:{type:{value:entry.type},armor:{value:17,rarityLevel:6}},effects:[{_id:"custom"}],flags:{custom:{value:1}}},before=structuredClone(source);const patch=art.prepareArmorArtworkUpdate(source);assert.deepEqual(source,before);assert.equal(patch._id,entry.id);assert.equal(patch.img,entry.image);assert.equal(Object.keys(patch).length,3);assert.equal(art.prepareArmorArtworkUpdate({...source,img:"worlds/custom.webp"}),null);assert.equal(art.prepareArmorArtworkUpdate({...source,img:entry.image}),null);assert.equal(art.prepareArmorArtworkUpdate({...source,_id:"custom"}),null);}
});
