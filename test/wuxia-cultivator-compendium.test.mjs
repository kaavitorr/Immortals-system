import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as content from '../module/systems/cultivator-content.mjs';
import * as sync from '../module/systems/cultivator-compendium.mjs';
import {speciesDocuments} from "../module/systems/wuxia-species.mjs";
import {backgroundDocuments} from '../module/systems/wuxia-backgrounds.mjs';
const scope='Immortals-system';
const use=(object,key)=>{assert.equal(typeof object[key],'function');return object[key];};
function boundary(){
 const documents=new Map([['custom-item-0001',{_id:'custom-item-0001',name:'Criação do mestre',type:'feat',folder:null,system:{description:{value:'Preservar'}}}]]),folders=new Map(),calls=[];
 const pack={collection:'Immortals-system.geral',documentName:'Item',locked:true,folders:{contents:[]},async getIndex(){return new Map([...documents.values()].map(d=>[d._id,{_id:d._id,type:d.type,folder:d.folder}]));},async getDocuments(){return [...documents.values()];},async configure({locked}){this.locked=locked;}};
 const refresh=()=>pack.folders.contents=[...folders.values()];
 const Item={implementation:{async createDocuments(items,{pack:target,keepId}){assert.equal(target,pack.collection);assert.equal(keepId,true);calls.push('createItems');for(const item of items){assert(!documents.has(item._id));documents.set(item._id,structuredClone(item));}return items;},async updateDocuments(updates){calls.push('moveItems');for(const update of updates)Object.assign(documents.get(update._id),update);},async deleteDocuments(ids){calls.push('deleteItems');for(const id of ids)documents.delete(id);}}};
 const Folder={implementation:{async createDocuments(items){for(const item of items){if(item.folder)assert(folders.has(item.folder));folders.set(item._id,structuredClone(item));}refresh();return items;},async updateDocuments(updates){calls.push('moveFolders');for(const update of updates)Object.assign(folders.get(update._id),update);refresh();},async deleteDocuments(ids,options){calls.push('deleteFolders');assert.equal(options.deleteContents,false);for(const id of ids){assert(![...documents.values()].some(d=>d.folder===id),'item still inside retired folder');assert(![...folders.values()].some(d=>d.folder===id),'child folder still inside retired folder');folders.delete(id);}refresh();}}};
 const game={user:{id:'gm',isGM:true},packs:new Map([[pack.collection,pack]])};
 return {game,pack,Item,Folder,documents,folders,calls,refresh};
}

test('the public catalog contains backgrounds, Qi talents and combat techniques while cultivation rules remain internal',()=>{
 assert.deepEqual(content.cultivatorCompendiumDocuments().filter(d=>!d.flags?.[scope]?.talentoQi&&!d.flags?.[scope]?.qiTalentsFolder&&!d.flags?.[scope]?.combatManualTechnique&&!d.flags?.[scope]?.combatManualFolder),[...backgroundDocuments(),...speciesDocuments()]);assert.equal(content.cultivatorCompendiumDocuments().length,160+backgroundDocuments().length-48+speciesDocuments().length);assert(!content.cultivatorCompendiumDocuments().some(d=>d.type==='class'||d.flags?.[scope]?.cultivatorFeature||d.flags?.[scope]?.elementalManaged||d.flags?.[scope]?.elementalGuide));
 const cls=content.cultivatorClassDocument();assert.deepEqual(cls.system.advancement,{});assert.equal(cls.flags[scope].legacy2.vidaBase,5);assert.equal(cls.flags[scope].legacy2.energiaInicial,40);assert(use(content,'cultivatorInternalDocuments')().some(d=>d._id===cls._id));
});

test('Geral sync adds backgrounds once, preserves edits and unrelated content, and restores the original lock',async()=>{
 const b=boundary(),before=structuredClone(b.documents.get('custom-item-0001'));await sync.ensureCultivatorCompendium(b);assert.equal(b.documents.size,1+content.cultivatorCompendiumDocuments().filter(d=>d.type!=='Item').length);assert.equal(b.folders.size,content.cultivatorCompendiumDocuments().filter(d=>d.type==='Item').length);assert.equal(b.pack.locked,true);assert.deepEqual(b.documents.get(before._id),before);
 const bg=[...b.documents.values()].find(d=>d.type==='background');bg.system.description.value='Editado no mundo';await sync.ensureCultivatorCompendium(b);assert.equal(b.documents.size,1+content.cultivatorCompendiumDocuments().filter(d=>d.type!=='Item').length);assert.equal(bg.system.description.value,'Editado no mundo');
 b.pack.locked=false;await sync.ensureCultivatorCompendium(b);assert.equal(b.pack.locked,false);
});

test('native cleanup removes only deterministic internal IDs and moves custom descendants before folders',async()=>{
 const b=boundary(),internal=use(content,'cultivatorInternalDocuments')();for(const d of internal)(d.type==='Item'?b.folders:b.documents).set(d._id,structuredClone(d));
 b.folders.set('custom-folder',{_id:'custom-folder',type:'Item',name:'Pasta pessoal',folder:content.CULTIVATOR_FOLDER_ID});b.documents.set('custom-direct',{_id:'custom-direct',type:'feat',folder:content.CULTIVATOR_FOLDER_ID,name:'Manual'});b.documents.set('custom-child',{_id:'custom-child',type:'feat',folder:'custom-folder',name:'Talento escolhido'});
 b.documents.set('external-flags',{_id:'external-flags',type:'feat',flags:{[scope]:{featureSection:'jj-path'}},name:'Manual preservado'});
 const authored=internal.find(d=>d.type==='feat'&&d.flags?.[scope]?.cultivatorFeature);b.documents.set('authored-copy',{...structuredClone(authored),_id:'authored-copy'});b.refresh();
 const result=await sync.ensureCultivatorCompendium(b);assert(result.deleted>0);assert.equal(b.documents.get('custom-direct').folder,null);assert.equal(b.folders.get('custom-folder').folder,null);assert.equal(b.documents.get('custom-child').folder,'custom-folder');assert(b.documents.has('external-flags'));assert(b.documents.has('authored-copy'));assert.equal(b.documents.get('authored-copy').folder,null);assert.equal(b.folders.size,1+content.cultivatorCompendiumDocuments().filter(d=>d.type==='Item').length);assert.equal(b.pack.locked,true);
 for(const d of internal)assert(!(d.type==='Item'?b.folders:b.documents).has(d._id));assert(b.calls.indexOf('moveItems')<b.calls.indexOf('deleteFolders'));assert(b.calls.indexOf('moveFolders')<b.calls.indexOf('deleteFolders'));
});

test('players do not write and any failed native migration relocks the pack before returning the error',async()=>{
 const b=boundary();b.game.user.isGM=false;await sync.ensureCultivatorCompendium(b);assert.equal(b.documents.size,1);assert.equal(b.calls.length,0);
 b.game.user.isGM=true;b.Item.implementation.createDocuments=async()=>{throw Error('Failed write');};await assert.rejects(()=>sync.ensureCultivatorCompendium(b),/Failed write/);assert.equal(b.pack.locked,true);
 const c=boundary(),internal=use(content,'cultivatorInternalDocuments')();c.folders.set(content.CULTIVATOR_FOLDER_ID,internal.find(d=>d._id===content.CULTIVATOR_FOLDER_ID));c.documents.set('custom-direct',{_id:'custom-direct',type:'feat',folder:content.CULTIVATOR_FOLDER_ID});c.refresh();c.Item.implementation.updateDocuments=async()=>{throw Error('Failed move');};await assert.rejects(()=>sync.ensureCultivatorCompendium(c),/Failed move/);assert(c.folders.has(content.CULTIVATOR_FOLDER_ID));assert.equal(c.pack.locked,true);
});


test('ready sync creates all 29 manual techniques once and preserves an edited technique on later loads',async()=>{
 const b=boundary();await sync.ensureCultivatorCompendium(b);
 const manuals=[...b.documents.values()].filter(d=>d.flags?.[scope]?.combatManualTechnique);
 assert.equal(manuals.length,29);assert.equal([...b.folders.values()].filter(d=>d.flags?.[scope]?.combatManualFolder).length,11);
 const edited=manuals.find(d=>d.name==='First Wave');edited.name='Onda da minha seita';edited.system.activities={custom:{name:'Edição do mestre'}};edited.system.description.value='Texto editado';
 await sync.ensureCultivatorCompendium(b);assert.equal([...b.documents.values()].filter(d=>d.flags?.[scope]?.combatManualTechnique).length,29);
 assert.equal(edited.name,'Onda da minha seita');assert.equal(edited.system.description.value,'Texto editado');assert.deepEqual(edited.system.activities,{custom:{name:'Edição do mestre'}});assert.equal(b.pack.locked,true);
});
