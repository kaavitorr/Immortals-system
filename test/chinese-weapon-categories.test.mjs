import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as weapons from '../module/systems/chinese-weapons.mjs';
const scope='Immortals-system';
const expected={ 'leque-de-ferro':'simpleM', zhanmadao:'martialM', jian:'simpleM', dao:'simpleM', guandao:'martialM', qiang:'martialM', 'espadas-de-gancho':'simpleM', 'laminas-borboleta':'simpleM', 'bastao-de-tres-secoes':'simpleM', 'martelo-meteoro':'martialM' };
test('the ten authored Chinese weapons use the requested light or heavy attack proficiency',()=>{
 const docs=weapons.chineseWeaponCompendiumDocuments().filter(d=>d.type==='weapon');
 assert.equal(docs.length,10);for(const d of docs)assert.equal(d.system.type.value,expected[d.system.identifier],d.name);
});
test('updating a previous Chinese weapon changes only its classification and completion marker',()=>{
 assert.equal(typeof weapons.prepareChineseWeaponCategoryUpdate,'function');
 const item=weapons.chineseWeaponCompendiumDocuments().find(d=>d.name==='Jian');
 delete item.flags[scope].weaponCategoryVersion;item.system.type.value='martialM';item.name='Jian de Lin';item.system.damage.base.custom={enabled:true,formula:'3d8 + 9'};
 const before=structuredClone(item),patch=weapons.prepareChineseWeaponCategoryUpdate(item);
 assert.deepEqual(patch,{_id:item._id,'system.type.value':'simpleM',['flags.'+scope+'.weaponCategoryVersion']:1});assert.deepEqual(item,before);
 item.flags[scope].weaponCategoryVersion=1;assert.equal(weapons.prepareChineseWeaponCategoryUpdate(item),null);
});
test('classification updates ignore unrelated IDs, non-weapons and future completed versions',()=>{
 assert.equal(typeof weapons.prepareChineseWeaponCategoryUpdate,'function');
 const old=weapons.chineseWeaponCompendiumDocuments().find(d=>d.name==='Qiang');delete old.flags[scope].weaponCategoryVersion;
 for(const changed of [{...old,_id:'unrelated'}, {...old,type:'equipment'}, {...old,flags:{[scope]:{weaponCategoryVersion:2}}}])assert.equal(weapons.prepareChineseWeaponCategoryUpdate(changed),null);
});
