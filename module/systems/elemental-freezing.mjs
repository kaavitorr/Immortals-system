/** Congelando keeps the native one-round duration, Lento and the attacker's recorded attribute. */
const S='Immortals-system',P='flags.'+S+'.elementalState.freezing';
export function elementalFreezingTurnPlan(actor,{turn}={}){
 const saved=actor.flags?.[S]?.elementalState?.freezing;if(!saved||!turn)return null;
 const active=actor.statuses?.has?.('jj-congelando')||actor.effects?.some(e=>!e.disabled&&e.statuses?.has?.('jj-congelando'));
 if(!active)return{clear:true,damage:0};
 if(saved.lastTickTurn===turn||saved.tickStatus==='pending')return null;
 if(!(saved.remainingTurns>0))return{clear:true,damage:0};
 if(!Number.isFinite(saved.primary))return{pending:true,damage:0};
 return{damage:Math.max(0,Math.floor(saved.primary)),type:'cold',source:saved.source,next:{...saved,remainingTurns:0,lastTickTurn:turn,tickStatus:'complete'}};
}
export async function processElementalFreezingTurn(actor,context){
 const plan=elementalFreezingTurnPlan(actor,context);if(!plan)return;
 if(plan.clear){await actor.update({['flags.'+S+'.elementalState.-=freezing']:null});return plan;}
 if(plan.pending)return plan;
 await actor.update({[P]:{...actor.flags[S].elementalState.freezing,lastTickTurn:context.turn,tickStatus:'pending'}});
 try{if(plan.damage){const parts=[{type:'cold',value:plan.damage,active:{elemental:{processed:true,bonusSource:'gelo.frioCongelante.freezing'}}}],options={sourceActor:globalThis.fromUuidSync?.(plan.source,{strict:false}),isAttack:false,internalDamage:true,targetTokenUuid:context.combatant?.token?.uuid??actor.token?.uuid,elementalLockToken:context.lockToken,receipt:'freezing:'+context.turn};if(actor.applyDamage)await actor.applyDamage(parts,options);else{const{applyDamageToActor}=await import('../applications/actor/jj/damage-application.mjs');await applyDamageToActor(actor,plan.damage,{...options,damages:parts});}if(!(actor.flags?.[S]?.elementalDamageReceipts??[]).some(r=>r.id===options.receipt&&r.status==='complete'))throw Error('A aplicação do dano não foi confirmada.');}await actor.update({[P]:plan.next});return plan;}
 catch(error){globalThis.ui?.notifications?.warn?.('O dano de Congelando precisa ser conferido pelo narrador: '+error.message);return{...plan,pending:true};}
}
