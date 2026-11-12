import assert from 'node:assert/strict';
import {test} from 'node:test';
let rules={};
try {rules=await import('../module/systems/qi-talents-rules.mjs');}
catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const scope='Immortals-system';
const actor=(rank=1,stage=1)=>({type:'character',flags:{[scope]:{}},items:[{type:'class',system:{identifier:'cultivador'}}],
  system:{cultivation:{rank,stage,bodyCultivation:0,soulCultivation:0,points:20,spentTrainingPoints:7},legacy2:{especiaisExtra:0,pontos:{extra:40,gastos:11}}}});
const call=(name,...args)=>{assert.equal(typeof rules[name],'function',name+' must exist');return rules[name](...args);};
const requirement=(a,rule,context)=>call('qiTalentRequirement',a,rule,context);
const budget=(a,context)=>call('qiTalentBudget',a,context);
const purchase=a=>call('qiTalentPurchaseUpdate',a);
function apply(a,updates){for(const [path,value] of Object.entries(updates)){const keys=path.split('.'),last=keys.pop();let object=a;
  for(const key of keys)object=object[key]??={};object[last]=structuredClone(value);}}
const nodes=new Map([
 ['ordinary',{id:'ordinary',category:'Habilidades de Qi'}],['body',{id:'body',category:'Habilidades Especiais',path:'Cultivo do Corpo'}],
 ['soul',{id:'soul',category:'Habilidades Especiais',path:'Cultivo da Alma'}],
 ['immortal-a',{id:'immortal-a',category:'Imortalidade',path:'Reino da Imortalidade'}],
 ['immortal-b',{id:'immortal-b',category:'Imortalidade',path:'Reino da Imortalidade'}],
 ['immortal-c',{id:'immortal-c',category:'Imortalidade',path:'Reino da Imortalidade'}]
]);

test('cultivation rank uses explicit NPC rank and never guesses from NPC classification or character levels',()=>{
 const a=actor(4,2);a.system.details={level:30};assert.equal(call('qiCultivationRank',a),4);
 const npc={type:'npc',system:{cultivation:{rank:9},details:{cr:12}},flags:{[scope]:{}}};
 assert.equal(call('qiCultivationRank',npc),null);npc.flags[scope].cultivationRank=0;assert.equal(call('qiCultivationRank',npc),0);
 npc.flags[scope].cultivationRank=6;assert.equal(call('qiCultivationRank',npc),6);
 for(const invalid of [undefined,null,'','   ',[],{},false,true,1.5,-1,11,NaN,Infinity]){npc.flags[scope].cultivationRank=invalid;assert.equal(call('qiCultivationRank',npc),null);}
});

test('rank gates use realm threshold without confusing stages with rank',()=>{
 assert.equal(requirement(actor(1,3),{type:'rank',min:2,text:'Formação de Núcleo'}).ok,false);
 assert.deepEqual(requirement(actor(2,1),{type:'rank',min:2,text:'Formação de Núcleo'}),{ok:true,text:'Formação de Núcleo',type:'rank'});
 assert.equal(requirement(actor(8,3),{type:'rank',min:9}).ok,false);
 assert.equal(requirement(actor(9),{type:'rank',min:9}).ok,true);
});

test('Body gates map Forjando and Temperando to1/2 and the eight Portões to3 through10',()=>{
 const a=actor(10);for(const min of [1,2,3,4,5,6,7,8,9,10]){
  a.system.cultivation.bodyCultivation=min-1;assert.equal(requirement(a,{type:'body',min}).ok,false);
  a.system.cultivation.bodyCultivation=min;assert.equal(requirement(a,{type:'body',min}).ok,true);
 }
 a.system.cultivation.bodyCultivation=0;a.system.cultivation.soulCultivation=10;assert.equal(requirement(a,{type:'body',min:1}).ok,false);
});

test('Soul gates map Avatar to1 and each Revolution to its ordinal plus1',()=>{
 const a=actor();for(const min of [1,2,3,4,5,6,7,8,9,10]){
  a.system.cultivation.soulCultivation=min-1;assert.equal(requirement(a,{type:'soul',min}).ok,false);
  a.system.cultivation.soulCultivation=min;assert.equal(requirement(a,{type:'soul',min}).ok,true);
 }
});

test('NPC path gates require explicitly known flags rather than copied PC path data',()=>{
 const npc={type:'npc',system:{cultivation:{bodyCultivation:10,soulCultivation:10}},flags:{[scope]:{}}};
 assert.equal(requirement(npc,{type:'body',min:1}).ok,false);assert.equal(requirement(npc,{type:'soul',min:1}).ok,false);
 npc.flags[scope].bodyCultivation=3;npc.flags[scope].soulCultivation=2;
 assert.equal(requirement(npc,{type:'body',min:3}).ok,true);assert.equal(requirement(npc,{type:'body',min:4}).ok,false);
 assert.equal(requirement(npc,{type:'soul',min:2}).ok,true);assert.equal(requirement(npc,{type:'soul',min:3}).ok,false);
});

test('typed node and count conditions compose with and/or including any learned gesture',()=>{
 const a=actor(),has=id=>new Set(['channel-a','gestos-cone-e-leque']).has(id);
 assert.equal(requirement(a,{type:'and',rules:[{type:'node',id:'channel-a'},{type:'node',id:'channel-b'}]},{has}).ok,false);
 assert.equal(requirement(a,{type:'or',rules:[{type:'count',min:8},{type:'anyGesture'}]},{has,learnedCount:7}).ok,true);
 assert.equal(requirement(a,{type:'and',rules:[{type:'node',id:'channel-a'},{type:'count',min:8}]},{has,learnedCount:8}).ok,true);
 assert.equal(requirement(a,{type:'count',min:8},{learnedCount:7}).ok,false);
 assert.equal(requirement(a,{type:'anyGesture'},{has:id=>id==='gestos-raio-e-emanacao'}).ok,true);
 assert.equal(requirement(a,{type:'anyGesture'},{has:id=>id==='other-gesture'}).ok,false);
});

test('missing, unsupported or malformed requirements cannot silently unlock talents',()=>{
 const a=actor(10);for(const rule of [null,{},'Formação de Núcleo',{type:'unknown'},{type:'rank',min:NaN},{type:'body',min:1.5},{type:'soul',min:11},
  {type:'node',id:''},{type:'and',rules:[]},{type:'or',rules:[]},{type:'count',min:-1}])assert.equal(requirement(a,rule,{has:()=>true,learnedCount:99}).ok,false);
 assert.equal(requirement(a,{type:'node',id:'missing'}).ok,false);
});

test('base talent budget follows cultivation level and preserves independent existing extras',()=>{
 const a=actor(2,3);a.system.legacy2.especiaisExtra=4;const before=structuredClone(a),result=budget(a,{learned:['ordinary'],nodes});
 assert.equal(result.base,6);assert.equal(result.extra,4);assert.equal(result.total,10);assert.equal(result.used,1);assert.equal(result.available,9);
 assert.deepEqual(result.restricted.immortality,{total:0,used:0,available:0,nodes:[]});assert.deepEqual(a,before);
});

test('rank5 grants exactly two restricted Immortality choices once, without reducing ordinary choices',()=>{
 const a=actor(5),result=budget(a,{learned:['ordinary','immortal-a','immortal-b'],nodes});
 assert.equal(result.base,13);assert.equal(result.total,13);assert.equal(result.used,1);assert.equal(result.available,12);
 assert.deepEqual(result.restricted.immortality,{total:2,used:2,available:0,nodes:['immortal-a','immortal-b']});
 const high=budget(actor(10),{nodes});assert.equal(high.restricted.immortality.total,2);
});

test('restricted choices are allocated before clamping an overdrawn ordinary budget',()=>{
 const a=actor(5);const learned=['immortal-a','immortal-b',...Array.from({length:14},(_,i)=>'old-'+i)];
 const result=budget(a,{learned,nodes});assert.equal(result.used,14);assert.equal(result.available,0);assert.equal(result.overdrawn,1);
 assert.equal(result.restricted.immortality.used,2);assert.equal(result.restricted.immortality.available,0);
});

test('a third Immortality talent costs an ordinary choice while pre-rank5 talents remain charged normally',()=>{
 const mature=budget(actor(5),{learned:['immortal-a','immortal-b','immortal-c'],nodes});assert.equal(mature.used,1);assert.equal(mature.available,12);
 const early=budget(actor(4),{learned:['immortal-a','immortal-b'],nodes});assert.equal(early.used,2);assert.equal(early.restricted.immortality.total,0);
});

test('Body and Soul advancement do not grant extra choices without an explicit receive rule',()=>{
 const a=actor(1);a.system.cultivation.bodyCultivation=10;a.system.cultivation.soulCultivation=10;
 const result=budget(a,{learned:['body','soul'],nodes});assert.equal(result.total,1);assert.equal(result.used,2);assert.equal(result.overdrawn,1);
 assert.equal(result.restricted.immortality.total,0);
});

test('free grants, duplicate IDs and unknown legacy names never double charge or silently erase existing choices',()=>{
 const a=actor(5),result=budget(a,{learned:['ordinary','ordinary','immortal-a','immortal-b','old-specialization'],granted:['ordinary','ordinary','immortal-a'],nodes});
 assert.equal(result.learned,2);assert.equal(result.granted,2);assert.equal(result.used,1);assert.equal(result.available,12);
 assert.deepEqual(result.restricted.immortality,{total:2,used:1,available:1,nodes:['immortal-b']});
});

test('unrelated classes and NPCs do not acquire a cultivation talent pool from level or classification',()=>{
 const a=actor(10);a.items=[{type:'class',system:{identifier:'other'}}];assert.equal(budget(a).base,0);assert.equal(budget(a).total,0);
 const npc={type:'npc',flags:{[scope]:{cultivationRank:10}},system:{cultivation:{rank:10,stage:3},legacy2:{}}};
 assert.equal(budget(npc).base,0);assert.equal(budget(npc).restricted.immortality.total,0);
});

test('a five-PC purchase adds one ordinary choice and writes balance, spending and rank receipt atomically without mutation',()=>{
 const a=actor(2,1);a.system.legacy2.especiaisExtra=3;const before=structuredClone(a),updates=purchase(a);
 assert.deepEqual(a,before);assert.equal(updates['system.cultivation.points'],15);assert.equal(updates['system.cultivation.spentTrainingPoints'],12);
 assert.equal(updates['system.legacy2.especiaisExtra'],4);assert.deepEqual(updates['flags.Immortals-system.qiTalentPurchases.2'],{rank:2,cost:5});
 apply(a,updates);assert.deepEqual(a.system.legacy2.pontos,before.system.legacy2.pontos);assert.equal(budget(a).extra,4);
});

test('one purchase per realm survives stage advances and leaving then returning to the same realm',()=>{
 const a=actor(2);apply(a,purchase(a));a.system.cultivation.stage=3;assert.throws(()=>purchase(a),/reino|Rank|compr/i);
 a.system.cultivation.rank=3;apply(a,purchase(a));assert.equal(a.system.cultivation.points,10);
 a.system.cultivation.rank=2;assert.throws(()=>purchase(a),/reino|Rank|compr/i);
 assert.deepEqual(a.flags[scope].qiTalentPurchases,{2:{rank:2,cost:5},3:{rank:3,cost:5}});
});

test('purchases reject insufficient, fractional, negative and corrupt balances rather than rounding them into new choices',()=>{
 for(const value of [4,4.9,5.1,-1,NaN,Infinity,true,'']){const a=actor();a.system.cultivation.points=value;assert.throws(()=>purchase(a));}
 for(const key of ['spentTrainingPoints','especiaisExtra']){const a=actor();(key==='especiaisExtra'?a.system.legacy2:a.system.cultivation)[key]=1.5;assert.throws(()=>purchase(a));}
 const exact=actor();exact.system.cultivation.points=5;assert.equal(purchase(exact)['system.cultivation.points'],0);
});

test('purchases require a known PC realm and preserve unrelated rank receipts and flags',()=>{
 const a=actor(4);a.flags[scope].qiTalentPurchases={2:{rank:2,cost:5,note:'old'}};a.flags[scope].manual='keep';const before=structuredClone(a);
 const updates=purchase(a);assert.deepEqual(a,before);assert.equal(Object.keys(updates).length,4);apply(a,updates);
 assert.equal(a.flags[scope].manual,'keep');assert.equal(a.flags[scope].qiTalentPurchases[2].note,'old');
 for(const bad of [null,0,1.5,11]){const b=actor();b.system.cultivation.rank=bad;assert.throws(()=>purchase(b));}
 assert.throws(()=>purchase({type:'npc',flags:{[scope]:{cultivationRank:5}},system:{cultivation:{points:20},legacy2:{}}}));
});
