import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCultivationDestinyRuntime} from '../module/systems/cultivation-destiny-runtime.mjs';
import {withElementalActorLock} from '../module/systems/elemental-runtime.mjs';
import {registerBeastEssenceAuthority} from '../module/systems/beast-essence-authority.mjs';
let api={};try{api=await import('../module/systems/cultivation-destiny-authority.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const S='Immortals-system',flush=()=>new Promise(r=>setImmediate(r));
const patch=(a,p)=>{for(const[k,v]of Object.entries(p??{})){const keys=k.split('.');let o=a;for(const key of keys.slice(0,-1))o=o[key]??={};if(keys.at(-1).startsWith('-='))delete o[keys.at(-1).slice(2)];else o[keys.at(-1)]=structuredClone(v);}};
function harness(){
 assert.equal(typeof api.registerCultivationDestinyAuthority,'function');
 const users=[{id:'owner',active:true,isGM:false},{id:'gm',active:true,isGM:true}],listeners=new Map(),counts={owner:0,gm:0},messages=[];
 const actor={uuid:'Actor.authority',id:'authority',type:'character',isOwner:true,ownership:{owner:3},flags:{[S]:{}},itemTypes:{class:[{type:'class',system:{identifier:'cultivador'}}]},items:[],system:{cultivation:{rank:3,points:10}},testUserPermission:u=>u.isGM||u.id==='owner',async update(p){patch(this,p);}};
 const clients={};let ids=0;
 for(const user of users){
  const collection=[...users];collection.activeGM=users[1];collection.get=id=>users.find(u=>u.id===id);
  const game={user,users:collection,socket:{on:(_c,fn)=>{const rows=listeners.get(user.id)??[];rows.push(fn);listeners.set(user.id,rows);},off:(_c,fn)=>listeners.set(user.id,(listeners.get(user.id)??[]).filter(f=>f!==fn)),emit:(_c,p,opts)=>{messages.push({from:user.id,p});for(const id of opts?.recipients??[])for(const fn of listeners.get(id)??[])queueMicrotask(()=>fn(structuredClone(p),user.id));}}};
  const runtime=createCultivationDestinyRuntime({user:()=>user,idFactory:()=>String(++ids).padStart(16,'0'),commit:async(a,u)=>{counts[user.id]++;patch(a,u.actor);a.items=a.items.filter(i=>!u.delete?.includes(i._id));a.items.push(...u.create??[]);}});
  const prior=registerBeastEssenceAuthority({activate:async()=>true},{game,resolve:async()=>actor,timeoutMs:200});
  const authority=api.registerCultivationDestinyAuthority(runtime,{game,resolve:async()=>actor,timeoutMs:200});
  clients[user.id]={game,runtime,authority,prior};
 }
 return {actor,users,clients,counts,messages,close(){for(const c of Object.values(clients))c.prior.unregister();}};
}
test('GM and player destiny confirmations execute on one elected owner and cannot create two inheritance essences',async()=>{const h=harness();try{const input={key:'divine-lineage',lineageId:'phoenix',ability:'str'};const out=await Promise.allSettled([h.clients.gm.authority.dispatch(h.actor,'select',input,{expectedRevision:0}),h.clients.owner.authority.dispatch(h.actor,'select',input,{expectedRevision:0})]);assert.equal(h.counts.owner,1);assert.equal(h.counts.gm,0);assert.equal(h.actor.items.filter(i=>i.flags?.[S]?.beastEssenceItem).length,1);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);assert(h.messages.some(m=>m.from==='gm'));assert.equal(await h.clients.owner.prior.dispatch(h.actor,'activate'),true);}finally{h.close();}});
test('requester permission is revalidated after waiting in the native actor queue',async()=>{const h=harness();let release;try{const holder=withElementalActorLock(h.actor,'test-holder',async()=>new Promise(r=>release=r));await flush();const pending=h.clients.gm.authority.dispatch(h.actor,'select',{key:'own-origin'},{expectedRevision:0});await flush();h.users[1].isGM=false;release();await holder;await assert.rejects(pending,/permiss|propriet/i);assert.equal(h.counts.owner,0);}finally{h.close();}});
test('manual state changes are routed too and stale snapshots cannot overwrite another owner mantra edit',async()=>{const h=harness();try{h.actor.flags[S].cultivationDestiny={key:'unrivaled-genius',revision:1};const snapshot=api.cultivationDestinySnapshot(h.actor),options={expectedRevision:1,snapshot};const results=await Promise.allSettled([h.clients.gm.authority.dispatch(h.actor,'mantras',{mantras:[{name:'A',text:'A',essencePerDay:10}],activeMantra:0},options),h.clients.owner.authority.dispatch(h.actor,'mantras',{mantras:[{name:'B',text:'B',essencePerDay:20}],activeMantra:0},options)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert([10,20].includes(h.actor.flags[S].manualEssencePerDay));}finally{h.close();}});
test('remote destiny protocol rejects arbitrary methods and extra actor-update fields',async()=>{const h=harness();try{await assert.rejects(h.clients.gm.authority.dispatch(h.actor,'update',{key:'own-origin'},{expectedRevision:0}));await assert.rejects(h.clients.gm.authority.dispatch(h.actor,'select',{key:'own-origin','system.energy.total':999},{expectedRevision:0}));assert.equal(h.counts.owner,0);}finally{h.close();}});
