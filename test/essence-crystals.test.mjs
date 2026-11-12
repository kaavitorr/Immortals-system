import {test} from 'node:test';
import assert from 'node:assert/strict';
let rules;try{rules=await import('../module/systems/essence-crystals.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;rules={};}
const scope='Immortals-system';
const crystal=(id,capacity=100,remaining=capacity,equipped=true)=>({id,name:'Cristal '+id,type:'equipment',sort:0,system:{equipped,quantity:1},flags:{[scope]:{essenceCrystal:{enabled:true,capacity,remaining}}}});
const actor=(items=[],essence=0,soul=0,manual=10)=>({type:'character',id:'hero',name:'Hero',items,system:{cultivation:{rank:1,stage:1,essence,soulCultivation:soul}},getFlag:(_scope,key)=>key==='manualEssencePerDay'?manual:undefined});
const project=(a,days=1,zone={level:'mediano'})=>{assert.equal(typeof rules.crystalCultivationProjection,'function');return rules.crystalCultivationProjection(a,days,zone);};

test('only explicitly configured, equipped crystals with quantity can accelerate cultivation',()=>{
 const c=crystal('a');const normal={...crystal('normal'),flags:{}};
 assert.equal(project(actor([c])).gain,20);assert.equal(project(actor([normal])).gain,10);
 for(const patch of [{equipped:false},{quantity:0}])assert.equal(project(actor([{...c,system:{...c.system,...patch}}])).gain,10);
 assert.equal(project(actor([crystal('empty',100,0)])).gain,10);
});
test('capacity uses half the lower mantra or regional absorption limit, not the higher one',()=>{
 for(const {manual,zone,capacity,remaining,gain,spent,minimum} of [
  {manual:10,zone:'mediano',capacity:4,remaining:4,gain:10,spent:0,minimum:5},
  {manual:10,zone:'perfeito',capacity:5,remaining:2,gain:12,spent:2,minimum:5},
  {manual:80,zone:'mediano',capacity:7,remaining:7,gain:15,spent:0,minimum:8},
  {manual:80,zone:'mediano',capacity:8,remaining:2,gain:17,spent:2,minimum:8}
 ]){
  const p=project(actor([crystal('boundary',capacity,remaining)],0,0,manual),1,{level:zone});
  assert.equal(p.crystals[0].minimum,minimum);assert.equal(p.gain,gain);assert.equal(p.crystalSpent,spent);
 }
});
test('boost doubles normal absorption and consumes only extra PEQ with a partial final day',()=>{
 const c=crystal('a',100,15),a=actor([c]);const p=project(a,3);
 assert.equal(p.gain,45);assert.equal(p.crystalBonus,15);assert.equal(p.crystalSpent,15);
 assert.equal(p.itemUpdates[0]['flags.'+scope+'.essenceCrystal.remaining'],0);assert.equal(c.flags[scope].essenceCrystal.remaining,15);
});
test('near the goal the crystal spends only useful bonus and stops on the day the goal is reached',()=>{
 let p=project(actor([crystal('a')],235),2);assert.equal(p.gain,15);assert.equal(p.crystalSpent,5);
 p=project(actor([crystal('a')],240),2);assert.equal(p.gain,10);assert.equal(p.crystalSpent,0);assert.deepEqual(p.itemUpdates,[]);
});
test('several equipped crystals are used sequentially and never raise the boost past double',()=>{
 const a=actor([crystal('b',100,30),crystal('a',100,15)]);const p=project(a,2);
 assert.equal(p.gain,40);assert.equal(p.crystalSpent,20);assert.equal(p.itemUpdates.length,2);
 const left=Object.fromEntries(p.itemUpdates.map(u=>[u._id,u['flags.'+scope+'.essenceCrystal.remaining']]));
 assert.deepEqual(left,{a:0,b:25});
});
test('Soul eight triples base absorption and the crystal doubles that result',()=>{
 const p=project(actor([crystal('a')],0,8));assert.equal(p.basePerDay,30);assert.equal(p.gain,60);assert.equal(p.crystalSpent,30);
});
test('zero days, suspended mantra and final cultivation ceiling never spend crystal fuel',()=>{
 const a=actor([crystal('a')]);assert.equal(project(a,0).crystalSpent,0);
 assert.equal(project(actor([crystal('a')],0,0,0)).gain,0);
 a.system.cultivation.rank=10;a.system.cultivation.stage=3;assert.equal(project(a,2).gain,0);
});
test('unlimited placeholder limits do not disqualify a crystal when the other limit is finite',()=>{
 assert.equal(project(actor([crystal('a',20)],0,0,null)).gain,30);
 assert.equal(project(actor([crystal('a',10)]),1,{level:'supremo'}).gain,20);
});
test('large advances project in bounded work and preserve the cap without wasting fuel',()=>{
 const p=project(actor([crystal('a',1000000)]),1000000000);assert.equal(p.value,250);assert.equal(p.crystalSpent,120);
});
test('configuration clamps invalid numeric input and never refills an exhausted crystal',()=>{
 assert.equal(typeof rules.essenceCrystalConfiguration,'function');
 assert.equal(rules.essenceCrystalConfiguration(crystal('a',10,99)).remaining,10);
 assert.equal(rules.essenceCrystalConfiguration(crystal('a',10,0)).remaining,0);
 assert.equal(rules.essenceCrystalConfiguration(crystal('a',-1,-3)).capacity,0);
});


function calendarFixture(){
 const a=actor([crystal('a',100,25)]);a.hasPlayerOwner=true;a.writes=[];a.batches=[];
 a.update=async patch=>{a.writes.push(patch);a.system.cultivation.essence=patch['system.cultivation.essence'];};
 a.performBulkUpdate=async plan=>{a.batches.push(structuredClone(plan));if(a.fail)throw Error('failed write');
 a.system.cultivation.essence=plan.actor['system.cultivation.essence'];for(const patch of plan.item??[]){const item=a.items.find(i=>i.id===patch._id);item.flags[scope].essenceCrystal.remaining=patch['flags.'+scope+'.essenceCrystal.remaining'];}};
 return a;
}
test('calendar awards extra PEQ and spends fuel in one native batch, at most once',async()=>{
 const {createPeqController}=await import('../module/systems/peq.mjs');const a=calendarFixture();let dialog;
 const controller=createPeqController({getActors:()=>[a],getZone:()=>({level:'mediano'}),isActiveGM:()=>true,openDialog:opts=>{dialog=opts;return{addDays(){}};}});
 controller.onDays(2);assert.equal(dialog.entries[0].projected,40);await dialog.onApply([a.id]);await dialog.onApply([a.id]);
 assert.equal(a.system.cultivation.essence,40);assert.equal(a.items[0].flags[scope].essenceCrystal.remaining,5);assert.equal(a.batches.length,1);assert.equal(a.writes.length,0);
});
test('cancel and unequipping while preview is open never consume the crystal',async()=>{
 const {createPeqController}=await import('../module/systems/peq.mjs');const a=calendarFixture();let dialog;
 const controller=createPeqController({getActors:()=>[a],getZone:()=>({level:'mediano'}),isActiveGM:()=>true,openDialog:opts=>{dialog=opts;return{addDays(){}};}});
 controller.onDays(2);dialog.onClose();assert.equal(a.batches.length,0);controller.onDays(1);a.items[0].system.equipped=false;await dialog.onApply([a.id]);
 assert.equal(a.system.cultivation.essence,10);assert.equal(a.items[0].flags[scope].essenceCrystal.remaining,25);assert.equal(a.batches.length,0);
});
test('failed batch writes do not consume fuel or award PEQ and can be retried safely',async()=>{
 const {createPeqController}=await import('../module/systems/peq.mjs');const a=calendarFixture();let dialog;a.fail=true;
 const controller=createPeqController({getActors:()=>[a],getZone:()=>({level:'mediano'}),isActiveGM:()=>true,openDialog:opts=>{dialog=opts;return{addDays(){}};}});
 controller.onDays(1);await assert.rejects(()=>dialog.onApply([a.id]),/failed write/);assert.equal(a.system.cultivation.essence,0);
 assert.equal(a.items[0].flags[scope].essenceCrystal.remaining,25);a.fail=false;await dialog.onApply([a.id]);assert.equal(a.system.cultivation.essence,20);
});


test('pill toxin blocking prevents both crystal use and ordinary cultivation',()=>{
 const a=actor([crystal('a')]);a.flags={[scope]:{pillToxins:{value:101}}};
 assert.equal(project(a,5).gain,0);assert.equal(project(a,5).crystalSpent,0);
});

test('stock crystal documents have stable IDs, authored capacities and valid source copies',async()=>{
 const {readFile}=await import('node:fs/promises');const docs=rules.essenceCrystalCompendiumDocuments();assert.equal(docs.length,17);for(const doc of docs)assert.equal(doc._id.length,16);
 const stock=docs.find(d=>d.type==='consumable');assert.equal(stock.system.type.value,'essenceCrystal');assert.equal(stock.system.uses.max,'10');
 const file=new URL('../packs/_source/equipamentos/Cristal_de_Essencia_'+stock._id+'.yml',import.meta.url);assert.deepEqual(JSON.parse(await readFile(file,'utf8')),stock);
});
