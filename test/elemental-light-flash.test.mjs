import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {elementalFeatureDocument} from '../module/systems/elemental-content.mjs';
import {activityConditionsSnapshot,resistActivityConditions} from '../module/systems/activity-conditions.mjs';
const scope='Immortals-system';
globalThis.Hooks={on(){},once(){}};globalThis.CONST={ACTIVE_EFFECT_MODES:{ADD:2,OVERRIDE:5,MULTIPLY:1}};
globalThis.CONFIG={DND5E:{abilities:{con:{label:'Constituição'}}},statusEffects:{'jj-cego':{id:'jj-cego',name:'Cego'}}};
globalThis.ui={notifications:{warn(){},info(){}}};globalThis.ChatMessage={getSpeaker:()=>({})};
globalThis.game={settings:{get:()=> '2.0'},time:{worldTime:100},i18n:{localize:x=>x}};
const {applyGameCondition}=await import('../module/applications/actor/jj/conditions.mjs');
const ae=readFileSync(new URL('../module/documents/active-effect.mjs',import.meta.url),'utf8'),expiryBody=ae.match(/isExpiryEvent\(event, context=\{\}\) \{([\s\S]*?)\n  \}/)[1];
const NativeExpiry=new Function('game','return class extends class {isExpiryEvent(){return false;}} {isExpiryEvent(event,context={}){'+expiryBody+'}}')(game);
function fixture({targetTurn=false}={}){
 const target={id:'target',uuid:'Actor.target',documentName:'Actor',name:'Alvo',isOwner:true,inCombat:true,items:[],effects:[],flags:{[scope]:{}},system:{traits:{ci:{value:new Set()}},legacy2:{actions:{value:6,max:6}}},getFlag(s,k){return this.flags[s]?.[k];},async setFlag(s,k,v){this.flags[s][k]=v;},async rollSavingThrow(){return[{total:1}];},async update(){}};
 const caster={id:'caster',actor:{uuid:'Actor.caster'}},combatant={id:'target-turn',actor:target};const combat={id:'fight',round:1,turn:targetTurn?1:0,combatant:targetTurn?combatant:caster,previous:{combatantId:targetTurn?combatant.id:caster.id},getCombatantsByActor:actor=>actor===target?[combatant]:[]};game.combat=combat;
 target.createEmbeddedDocuments=async(type,rows)=>rows.map(row=>{const effect=Object.assign(new NativeExpiry(),structuredClone(row),{id:'blind',actor:target,start:{combat,round:combat.round,turn:combat.turn},specialDuration:row.duration?.expiry??null,statuses:new Set(row.statuses),async delete(){target.effects=target.effects.filter(e=>e!==effect);},getFlag(s,k){return this.flags?.[s]?.[k];}});target.effects.push(effect);return effect;});
 const item=elementalFeatureDocument('luz','lightOrbs'),activity=Object.values(item.system.activities).find(a=>a.flags[scope].elementalActivity.key==='flash');activity.item={actor:caster.actor};activity.save.dc.value=18;
 const snapshot=activityConditionsSnapshot(activity),message={id:'flash',uuid:'ChatMessage.flash',flags:{[scope]:{activityConditions:snapshot}},getAssociatedRolls:()=>[]};
 const event=async(round,turn,ended)=>{combat.round=round;combat.turn=turn;combat.previous.combatantId=ended;for(const effect of [...target.effects])if(effect.isExpiryEvent('turnEnd',{combat,round,turn}))await effect.delete();};
 return {target,combat,combatant,activity,snapshot,message,event};
}

test('actual failed Light Flash condition save creates native target-end blindness and it expires at the next target turn end',async()=>{
 const f=fixture();assert.equal(f.snapshot.elementalLightFlash,true);const result=await resistActivityConditions(f.message,[f.target]);assert.equal(result[0].outcome,'applied');assert.equal(f.target.effects.length,1);assert.equal(f.target.effects[0].duration.expiry,'targetEnd');
 await f.event(1,0,'caster');assert.equal(f.target.effects.length,1);await f.event(1,1,f.combatant.id);assert.equal(f.target.effects.length,0);
});

test('Light Flash applied during the target own turn survives that edge and expires at its following turn end',async()=>{
 const f=fixture({targetTurn:true});await resistActivityConditions(f.message,[f.target]);await f.event(1,1,f.combatant.id);assert.equal(f.target.effects.length,1);await f.event(2,1,f.combatant.id);assert.equal(f.target.effects.length,0);
});

test('Light Flash never shortens or replaces unrelated existing blindness, and generic blindness stays generic',async()=>{
 const f=fixture(),foreign={statuses:new Set(['jj-cego']),duration:{expiry:'longRest'},origin:'Item.other',update:()=>assert.fail('foreign blindness must stay untouched')};f.target.effects.push(foreign);await resistActivityConditions(f.message,[f.target]);assert.equal(f.target.effects.length,2);assert.equal(f.target.effects[1].flags[scope].elementalLightFlash,true);assert.equal(foreign.duration.expiry,'longRest');assert.equal(foreign.origin,'Item.other');
 const generic=fixture();await applyGameCondition(generic.target,'jj-cego',{origin:'ChatMessage.generic'});assert.equal(generic.target.effects[0].duration,undefined);
});
