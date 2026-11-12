import assert from 'node:assert/strict';import {test} from 'node:test';
test('browser caches row metadata and preserves checked choices through folder, search and source filters',async()=>{
 const {activateNpcEquipmentBrowser}=await import('../module/applications/actor/jj/npc-generator-browser.mjs');
 const control=()=>({value:'',handlers:{},addEventListener(e,fn){this.handlers[e]=fn;}});
 const search=control(),source=control(),count={},empty={hidden:true},heading={};let reads=0,queries=0,writes=0;
 const rows=Array.from({length:1000},(_,i)=>{const input={checked:i===0};return {input,dataset:{get equipmentName(){reads++;return 'Arma '+i;},equipmentSource:'PdN',equipmentFolder:'base'},_hidden:false,get hidden(){return this._hidden;},set hidden(v){writes++;this._hidden=v;},querySelector(){queries++;return input;}};});
 const buttons=['base','fire','all'].map(folder=>({...control(),dataset:{equipmentFolder:folder},setAttribute(){}}));
 const selectors={'[data-equipment-search]':search,'[data-equipment-source]':source,'[data-equipment-count]':count,'[data-equipment-empty]':empty,'[data-equipment-heading]':heading};
 const picker={...control(),querySelector:s=>selectors[s],querySelectorAll:s=>s==='.iw-ng-equipment-card'?rows:buttons};
 const state={folder:'base',source:'',query:''};activateNpcEquipmentBrowser({querySelector:()=>picker},state);
 assert.equal(reads,1000);assert.equal(queries,1000);assert.equal(writes,0);
 search.value='arma 1';search.handlers.input();assert.equal(rows.filter(r=>!r.hidden).length,111);
 buttons[1].handlers.click();assert(rows.every(r=>r.hidden));assert(rows[0].input.checked);
 buttons[2].handlers.click();assert.equal(rows.filter(r=>!r.hidden).length,111);assert.equal(reads,1000);assert.equal(queries,1000);
 assert.equal(state.folder,'all');assert.equal(state.query,'arma 1');source.value='Mundo';source.handlers.change();assert(rows.every(r=>r.hidden));assert(rows[0].input.checked);assert.equal(empty.hidden,false);
});
