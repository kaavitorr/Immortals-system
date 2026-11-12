import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {elementalTrainingGuideDocument} from '../module/systems/elemental-training-content.mjs';
let cleanup={};try{cleanup=await import('../utils/prune-integrated-cultivator-sources.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
test('source cleanup unlinks only integrated authored JSON and leaves external/background bytes intact',async t=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'immortals-integrated-'));assert.equal(path.dirname(path.resolve(directory)),path.resolve(os.tmpdir()));t.after(()=>rm(directory,{recursive:true,force:true}));
 const background='{"_id":"background-custom","type":"background","name":"Antecedente pessoal"}\n',external='{"_id":"external","type":"feat","name":"Manual","flags":{"Immortals-system":{"featureSection":"jj-path"}}}\n';
 await writeFile(path.join(directory,'background.json'),background);await writeFile(path.join(directory,'external.json'),external);await writeFile(path.join(directory,'class.json'),JSON.stringify({_id:'c0171a7000000001',type:'class'}));await writeFile(path.join(directory,'guide.json'),JSON.stringify(elementalTrainingGuideDocument()));await writeFile(path.join(directory,'elemental-copy.json'),JSON.stringify({_id:'copied-authorial',type:'feat',flags:{'Immortals-system':{elementalGuide:true}}}));await writeFile(path.join(directory,'keep.txt'),'not a JSON source');
 assert.equal(typeof cleanup.pruneIntegratedCultivatorSources,'function');const result=await cleanup.pruneIntegratedCultivatorSources({sourceRoot:directory});assert.equal(result.removed,2);assert.equal(await readFile(path.join(directory,'background.json'),'utf8'),background);assert.equal(await readFile(path.join(directory,'external.json'),'utf8'),external);assert.deepEqual((await readdir(directory)).sort(),['background.json','elemental-copy.json','external.json','keep.txt']);
 const second=await cleanup.pruneIntegratedCultivatorSources({sourceRoot:directory});assert.equal(second.removed,0);
});
