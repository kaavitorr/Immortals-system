import assert from 'node:assert/strict';
import {test} from 'node:test';
import {qiTalentDocument} from '../module/systems/qi-talents-content.mjs';
import {prepareQiTalentActivation,withQiTalentActivationLock} from '../module/systems/qi-talents-use.mjs';
const scope='Immortals-system',hooks=new Map();
globalThis.Hooks={on:(event,handler)=>{const handlers=hooks.get(event)??[];handlers.push(handler);hooks.set(event,handlers);}};
globalThis.foundry={utils:{isEmpty:value=>!value||Object.keys(value).length===0}};
const messages=[];globalThis.ChatMessage={getSpeaker:({actor})=>({actor:actor.id}),create:async message=>{messages.push(message);return message;}};
const api=await import('../module/applications/actor/jj/constant-cost.mjs');
const clone=value=>structuredClone(value);
function apply(actor,updates){for(const[path,value]of Object.entries(updates)){const keys=path.split('.'),last=keys.pop();let object=actor;for(const key of keys)object=object[key]??={};if(last.startsWith('-='))delete object[last.slice(2)];else object[last]=clone(value);}}
function fixture({paid=true,qi=20,skills=['levitacao-de-qi','voo-estavel']}={}){
 messages.length=0;const user={id:'gm',isGM:true};globalThis.game={user,users:{activeGM:user}};
 const actor={id:'a',uuid:'Actor.qi-upkeep',name:'Cultivador',isOwner:true,flags:{[scope]:{upkeep:{}}},items:new Map(),writes:[],
  system:{energy:{generated:qi,total:100},legacy2:{actions:{value:6}}},getFlag(s,k){return this.flags[s]?.[k];},
  async update(updates,options){this.writes.push({updates:clone(updates),options});if(this.updateGate)await this.updateGate;apply(this,updates);},
  async unsetFlag(s,k){delete this.flags[s][k];}};
 const combatant={id:'own',actor},combat={uuid:'Combat.qi-upkeep',id:'qi-upkeep',started:true,round:1,combatant,combatants:new Map([['own',combatant]])};
 const current={round:1,turn:0,combatantId:'own'};combat.current=current;game.combat=combat;
 const activities=skills.map((id,index)=>{const item=qiTalentDocument(id);item.id='item-'+index;item.actor=actor;const act=Object.values(item.system.activities)[0];act.id=act._id;act.item=item;act.actor=actor;
  act.getConstantUpkeep=()=>({active:Number(act.constantCost?.value)>0||!!act.constantCost?.concentration,value:Number(act.constantCost?.value)||2,pool:act.constantCost?.pool??'generated',type:act.constantCost?.value?'constant':'concentration'});
  item.system.activities=new Map([[act.id,act]]);actor.items.set(item.id,item);
  if(paid)actor.flags[scope].upkeep[act.id]={itemId:item.id,label:act.name,qiTalent:true,lastPaidTurn:'Combat.qi-upkeep:1:own'};return act;});
 return {actor,combat,current,activities};
}
function next(f,round){f.combat.round=round;f.current={round,turn:0,combatantId:'own'};f.combat.current=f.current;return f.current;}
const flags=f=>f.actor.flags[scope].upkeep;
const run=(f,current=f.current)=>{assert.equal(typeof api.processConstantUpkeepTurn,'function');return api.processConstantUpkeepTurn(f.combat,{},current);};

test('the actual combat hook skips the initial activation turn without a second Qi debit or flag write',async()=>{
 const f=fixture();await hooks.get('combatTurnChange')[0](f.combat,{},f.current);assert.equal(f.actor.system.energy.generated,20);assert.deepEqual(f.actor.writes,[]);assert.deepEqual(messages,[]);
});

test('each later owner turn pays Levitation4 and StableFlight1 once in one Qi-and-receipt update',async()=>{
 const f=fixture();next(f,2);await run(f);assert.equal(f.actor.system.energy.generated,15);assert.equal(f.actor.writes.length,1);
 for(const act of f.activities)assert.equal(flags(f)[act.id].lastPaidTurn,'Combat.qi-upkeep:2:own');
 assert.equal(f.actor.system.energy.total,100);assert.equal(f.actor.system.legacy2.actions.value,6);
 await run(f);assert.equal(f.actor.system.energy.generated,15);assert.equal(f.actor.writes.length,1);
 next(f,3);await run(f);assert.equal(f.actor.system.energy.generated,10);assert.equal(f.actor.writes.length,2);
 for(const act of f.activities)assert.equal(flags(f)[act.id].lastPaidTurn,'Combat.qi-upkeep:3:own');
});

test('insufficient Qi stops only unaffordable maintenance without partial charges or negative balances',async()=>{
 const f=fixture({qi:3});next(f,2);await run(f);assert.equal(f.actor.system.energy.generated,2);assert.equal(flags(f)[f.activities[0].id],undefined);
 assert.equal(flags(f)[f.activities[1].id].lastPaidTurn,'Combat.qi-upkeep:2:own');assert.equal(f.actor.writes.length,1);
 next(f,3);await run(f);assert.equal(f.actor.system.energy.generated,1);assert.equal(flags(f)[f.activities[0].id],undefined);
});

test('an unpaid maintenance is removed once and cannot resume merely by refilling Qi',async()=>{
 const f=fixture({qi:0,skills:['levitacao-de-qi']});next(f,2);await run(f);assert.equal(f.actor.system.energy.generated,0);assert.deepEqual(flags(f),{});
 assert.equal(Object.hasOwn(f.actor.writes[0].updates,'system.energy.generated'),false);f.actor.system.energy.generated=20;next(f,3);await run(f);
 assert.equal(f.actor.system.energy.generated,20);assert.equal(f.actor.writes.length,1);
});

test('Qi maintenance has no out-of-combat drain and does not use an unrelated actors turn',async()=>{
 const f=fixture();f.combat.started=false;next(f,2);await run(f);assert.equal(f.actor.system.energy.generated,20);assert.deepEqual(f.actor.writes,[]);
 f.combat.started=true;f.combat.combatants.set('other',{id:'other',actor:{isOwner:true,getFlag:()=>({}),system:{energy:{}}}});await run(f,{round:2,combatantId:'other'});
 assert.equal(f.actor.system.energy.generated,20);assert.deepEqual(f.actor.writes,[]);
});

test('only the active GM or the owner when no GM exists may drain maintenance',async()=>{
 const f=fixture({skills:['levitacao-de-qi']});next(f,2);game.users.activeGM={id:'another-gm'};await run(f);assert.equal(f.actor.system.energy.generated,20);
 game.users.activeGM=null;f.actor.isOwner=false;await run(f);assert.equal(f.actor.system.energy.generated,20);
 f.actor.isOwner=true;await run(f);assert.equal(f.actor.system.energy.generated,16);assert.equal(f.actor.writes.length,1);
});

test('Qi maintenance requires enabled constant cost and never turns a narrative Qi shield into automatic maintenance',async()=>{
 const f=fixture({skills:['levitacao-de-qi','escudo-de-qi']});f.activities[0].constantCost.enabled=false;
 f.activities[1].getConstantUpkeep=()=>({active:true,value:2,pool:'generated',type:'concentration'});next(f,2);await run(f);
 assert.equal(f.actor.system.energy.generated,20);assert.deepEqual(flags(f),{});assert.equal(f.actor.writes.length,1);
 assert.equal(Object.keys(f.actor.writes[0].updates).some(k=>k.startsWith('system.')),false);
});

test('a cancelled Qi pre-use does not create upkeep, spend Qi or post an activation message',async()=>{
 const f=fixture({paid:false});for(const handler of hooks.get('dnd5e.preUseActivity'))handler(f.activities[0]);await new Promise(r=>setImmediate(r));
 assert.deepEqual(flags(f),{});assert.equal(f.actor.system.energy.generated,20);assert.deepEqual(f.actor.writes,[]);assert.deepEqual(messages,[]);
});

test('maintenance waits for an in-flight activation and rereads its balance and newly committed upkeep',async()=>{
 const f=fixture({paid:false,skills:['levitacao-de-qi']}),act=f.activities[0];let release;f.actor.updateGate=new Promise(r=>release=r);
 const activation=withQiTalentActivationLock(act,async()=>{const plan=prepareQiTalentActivation(act,{consume:true},{actionCost:0,turn:'Combat.qi-upkeep:1:own'});
  await f.actor.update({...plan.actor,'system.energy.generated':16},{isEnergySystem:true});});
 await new Promise(r=>setImmediate(r));assert.equal(f.actor.writes.length,1);next(f,2);let completed=false;const upkeep=run(f).then(result=>{completed=true;return result;});
 try{await new Promise(r=>setImmediate(r));assert.equal(completed,false);assert.equal(f.actor.writes.length,1);assert.equal(f.actor.system.energy.generated,20);}
 finally{release();await activation;await upkeep;}
 assert.equal(f.actor.system.energy.generated,12);assert.equal(f.actor.writes.length,2);assert.equal(flags(f)[act.id].lastPaidTurn,'Combat.qi-upkeep:2:own');
});

test('concurrent duplicate turn notifications commit a single maintenance payment',async()=>{
 const f=fixture({skills:['levitacao-de-qi']});next(f,2);let release;f.actor.updateGate=new Promise(r=>release=r);
 const first=run(f);await new Promise(r=>setImmediate(r));const duplicate=run(f);await new Promise(r=>setImmediate(r));
 try{assert.equal(f.actor.writes.length,1);}finally{release();await Promise.all([first,duplicate]);}
 assert.equal(f.actor.system.energy.generated,16);assert.equal(f.actor.writes.length,1);
});

test('legacy upkeep without Qi flags keeps its original pools and does not require the display checkbox',async()=>{
 const f=fixture({paid:false,skills:['levitacao-de-qi']});const act=f.activities[0];act.flags={};act.constantCost={enabled:false,value:'3',pool:'total'};
 flags(f)[act.id]={itemId:act.item.id,label:'Legacy technique'};next(f,2);await run(f);
 assert.equal(f.actor.system.energy.total,97);assert.equal(f.actor.system.energy.generated,20);assert.equal(flags(f)[act.id].lastPaidTurn,undefined);
 assert.equal(f.actor.writes.length,1);
});
