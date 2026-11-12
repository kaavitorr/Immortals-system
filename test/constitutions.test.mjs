import assert from 'node:assert/strict';import {test} from 'node:test';
let data={},rules={};try{data=await import('../module/systems/constitutions-data.mjs');rules=await import('../module/systems/constitution-rules.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const scope='Immortals-system',record=(id,extra={})=>({id,quality:id.startsWith('divine-')||id.startsWith('supreme-')?'unica':'inferior',affinities:[],...extra});
const actor=(selected=null,rank=1,extra={})=>({type:'character',flags:{[scope]:{constitution:selected?{version:1,revision:1,primary:record(selected),absorbed:[],forms:[],context:{},...extra}:undefined}},system:{cultivation:{rank,stage:1,points:100,essence:0},energy:{total:100,max:100,generated:50},abilities:{str:{value:4},dex:{value:3},con:{value:4},int:{value:3},wis:{value:3},cha:{value:3}}}});
const state=a=>{assert.equal(typeof rules.constitutionState,'function');return rules.constitutionState(a);};
const updates=(a,value,options)=>{assert.equal(typeof rules.constitutionSelectionUpdates,'function');return rules.constitutionSelectionUpdates(a,value,options);};
const modifiers=a=>{assert.equal(typeof rules.constitutionModifiers,'function');return rules.constitutionModifiers(a);};

test('the integrated catalogue includes all45 book constitutions and six rarity groups with full rules and legal evolution references',()=>{
 assert.equal(data.CONSTITUTIONS.length,45);assert.deepEqual(Object.fromEntries(data.CONSTITUTION_RARITIES.map(r=>[r.id,data.CONSTITUTIONS.filter(c=>c.rarity===r.id).length])),{human:8,earth:8,heaven:8,sacred:8,divine:9,supreme:4});assert.equal(new Set(data.CONSTITUTIONS.map(c=>c.id)).size,45);
 for(const c of data.CONSTITUTIONS){assert(c.description.length>0);assert(c.sourceName);assert(c.minimumRank>=1&&c.minimumRank<=10);assert(c.evolutionMethod!==undefined);assert(c.additionalEffects);assert(c.curse);if(c.evolutionId)assert(data.CONSTITUTIONS.some(v=>v.id===c.evolutionId));}
 assert.equal(data.CONSTITUTIONS.find(c=>c.id==='human-corpo-de-pilula').name,'Corpo de Pílula');assert.equal(data.CONSTITUTIONS.find(c=>c.id==='divine-corpo-yin-divino-extremo').minimumRank,4);
});

test('unrevealed, malformed and dormant selections do not silently grant constitutions or overwrite source actor statistics',()=>{
 const a=actor(),before=structuredClone(a);assert.equal(state(a).primary,null);assert.equal(modifiers(a).absorptionMultiplier,1);assert.deepEqual(a,before);
 a.flags[scope].constitution={primary:{id:'unknown'},absorbed:[record('divine-amado-pelos-ceus')]};assert.equal(state(a).entries.length,0);
 const dormant=state(actor('divine-ira-dos-ceus',4));assert.equal(dormant.primary.baseActive,false);assert.equal(dormant.primary.additionalActive,true);
});

test('changing or clearing constitution replaces its selection and stops old forms without touching cultivation level, attributes or items',()=>{
 const a=actor('divine-amado-pelos-ceus',7,{forms:[{constitutionId:'divine-ira-dos-ceus'}],absorbed:[record('human-alinhamento-celestial')]});const before=structuredClone(a);
 const plan=updates(a,record('human-corpo-elemental',{quality:'comum',affinities:['fogo']}));const saved=plan['flags.'+scope+'.constitution'];assert.equal(saved.primary.id,'human-corpo-elemental');assert.deepEqual(saved.primary.affinities,['fogo']);assert.deepEqual(saved.absorbed,[]);assert.deepEqual(saved.forms,[]);assert.equal(saved.revision,2);assert.deepEqual(a,before);assert.equal(Object.keys(plan).length,1);
 const cleared=updates(a,null)['flags.'+scope+'.constitution'];assert.equal(cleared.primary,null);assert.deepEqual(cleared.absorbed,[]);assert.deepEqual(cleared.forms,[]);
 assert.throws(()=>updates(a,record('missing')),/constitui/i);assert.throws(()=>updates(a,record('human-corpo-elemental',{quality:'unica'})),/classe/i);
 assert.throws(()=>updates(a,record('divine-amado-pelos-ceus',{quality:'inferior'})),/classe/i);
});

test('elemental affinities obey the authored capacity and advanced-element exceptions',()=>{
 const a=actor();assert.throws(()=>updates(a,record('human-corpo-elemental',{affinities:['luz']})),/avançad|elemento/i);assert.throws(()=>updates(a,record('human-corpo-elemental',{affinities:['fogo','agua']})),/afinidade|elemento/i);assert.throws(()=>updates(a,record('earth-corpo-elemental-superior',{affinities:['fogo','fogo']})),/repet|afinidade/i);
 const u=updates(a,record('heaven-corpo-elemental-celestial',{affinities:['fogo','luz','escuridao']}));assert.equal(u['flags.'+scope+'.constitution'].primary.affinities.length,3);
});

test('only the Supreme Devourer permits three distinct additional non-Supreme constitutions and replacement removes the old bonuses',()=>{
 const a=actor('supreme-corpo-devorador-de-constituicoes',7);let u=updates(a,record('human-alinhamento-celestial'),{slot:0});a.flags[scope].constitution=u['flags.'+scope+'.constitution'];
 assert.equal(state(a).entries.length,2);assert.equal(modifiers(a).absorptionMultiplier,1.3);
 assert.throws(()=>updates(a,record('human-alinhamento-celestial'),{slot:1}),/repet|duplic/i);assert.throws(()=>updates(a,record('supreme-corpo-omni-elemental'),{slot:1}),/Suprem/i);assert.throws(()=>updates(a,record('earth-bencao-celestial'),{slot:3}),/espaço|slot/i);
 u=updates(a,record('earth-bencao-celestial'),{slot:0});a.flags[scope].constitution=u['flags.'+scope+'.constitution'];assert.equal(modifiers(a).absorptionMultiplier,2);assert.equal(state(a).entries.length,2);
 assert.throws(()=>updates(actor('human-alinhamento-celestial'),record('earth-bencao-celestial'),{slot:0}),/Devorador/i);
});

test('the five atmospheric absorption bodies use30 percent,100 percent,500 percent,20x and100x with source-specific effect gates',()=>{
 for(const[id,value]of [['human-alinhamento-celestial',1.3],['earth-bencao-celestial',2],['heaven-filho-dos-ceus',6],['sacred-favorito-dos-ceus',20],['divine-amado-pelos-ceus',100]])assert.equal(modifiers(actor(id,1)).absorptionMultiplier,value,id);
 assert.equal(modifiers(actor('sacred-corpo-da-tribulacao-sagrado',1)).breakthroughCDReduction,5);assert.equal(modifiers(actor('divine-corpo-da-tribulacao-divina',1)).freeCultivationThroughRank,5);
 assert.equal(modifiers(actor('supreme-corpo-refinador-de-ceu',1)).normalPCFactor,.5);assert.equal(modifiers(actor('supreme-corpo-omni-elemental',1)).rankEssenceMultiplier,2);assert.equal(modifiers(actor('supreme-corpo-omni-elemental',1)).stageEssenceMultiplier,1);
});

test('selection revision prevents an old picker from overwriting newer constitution choices',()=>{
 assert.throws(()=>updates(actor('human-alinhamento-celestial'),record('human-corpo-yin'),{expectedRevision:0}),/mudou|atualiz/i);
 const a=actor('human-corpo-yin');const before=structuredClone(a);state(a);modifiers(a);assert.deepEqual(a,before);
});
