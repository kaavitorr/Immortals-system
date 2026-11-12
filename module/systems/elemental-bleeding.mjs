/** Elemental bleeding uses its recorded attacker attribute, not the victim's current abilities. */
const S='Immortals-system',P='flags.'+S+'.elementalState.bleeding';
const positive=v=>Math.max(0,Math.floor(Number(v)||0));
export function elementalBleedingTurnPlan(actor,{turn}={}){
 const saved=actor.flags?.[S]?.elementalState?.bleeding;if(!saved||!turn)return null;
 const active=actor.statuses?.has?.('jj-sangramento')||actor.effects?.some(e=>!e.disabled&&e.statuses?.has?.('jj-sangramento'));
 if(!active)return{clear:true,damage:0};
 if(saved.lastTickTurn===turn||saved.tickStatus==='pending')return null;
 const instances=Array.isArray(saved.instances)?saved.instances.slice(0,8).filter(s=>positive(s.remainingTurns)>0):Array.from({length:Math.min(8,positive(saved.stacks))},()=>({primary:saved.primary,source:saved.source,remainingTurns:saved.remainingTurns,damageType:saved.damageType}));
 if(!instances.length)return{clear:true,damage:0};
 if(instances.some(s=>!Number.isFinite(s.primary)))return{pending:true,damage:0};
 const damage=instances.reduce((sum,s)=>sum+positive(s.primary),0),sources=[...new Set(instances.map(s=>s.source).filter(Boolean))];
 const nextInstances=instances.map(s=>({...s,remainingTurns:positive(s.remainingTurns)-1})).filter(s=>s.remainingTurns>0);
 return{damage,type:saved.damageType==='piercing'?'piercing':'slashing',source:sources.length===1?sources[0]:null,sources,next:{...saved,instances:nextInstances,stacks:nextInstances.length,remainingTurns:Math.max(0,...nextInstances.map(s=>s.remainingTurns)),lastTickTurn:turn,tickStatus:'complete'}};
}
/** Caller owns the shared actor turn lock. A reserved uncertain tick needs GM review, never blind retry. */
export async function processElementalBleedingTurn(actor,context){
 const plan=elementalBleedingTurnPlan(actor,context);if(!plan)return;
 if(plan.clear){await actor.update({['flags.'+S+'.elementalState.-=bleeding']:null});return plan;}
 if(plan.pending)return plan;
 const saved=actor.flags[S].elementalState.bleeding;
 await actor.update({[P]:{...saved,lastTickTurn:context.turn,tickStatus:'pending'}});
 try{if(plan.damage){const source=globalThis.fromUuidSync?.(plan.source,{strict:false}),parts=[{type:plan.type,value:plan.damage,active:{elemental:{processed:true,bonusSource:'metal.qiAfiado.bleeding'}}}];if(actor.applyDamage)await actor.applyDamage(parts,{sourceActor:source,isAttack:false,internalDamage:true,targetTokenUuid:context.combatant?.token?.uuid??actor.token?.uuid,elementalLockToken:context.lockToken,receipt:'bleeding:'+context.turn});else{const{applyDamageToActor}=await import('../applications/actor/jj/damage-application.mjs');await applyDamageToActor(actor,plan.damage,{damages:parts,sourceActor:source,isAttack:false,internalDamage:true,targetTokenUuid:context.combatant?.token?.uuid??actor.token?.uuid,elementalLockToken:context.lockToken,receipt:'bleeding:'+context.turn});}if(!(actor.flags?.[S]?.elementalDamageReceipts??[]).some(r=>r.id==='bleeding:'+context.turn&&r.status==='complete'))throw Error('A aplicação do dano não foi confirmada.');}
  if(plan.next.remainingTurns>0)await actor.update({[P]:plan.next});
  else{const effects=Array.from(actor.effects??[]).filter(e=>e.flags?.[S]?.elementalBleeding===true&&e.statuses?.has?.('jj-sangramento')).map(e=>e.id??e._id).filter(Boolean);if(effects.length)await actor.deleteEmbeddedDocuments('ActiveEffect',effects);await actor.update({['flags.'+S+'.elementalState.-=bleeding']:null});}
  return plan;
 }catch(error){globalThis.ui?.notifications?.warn?.('O dano de Sangramento precisa ser conferido pelo narrador: '+error.message);return{...plan,pending:true};}
}
