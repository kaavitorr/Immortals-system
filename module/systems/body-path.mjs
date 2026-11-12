/** Canonical Body path. Derived bonuses do not overwrite manual source values. */
const scope='Immortals-system';
export const BODY_HIT_POINTS_PER_LEVEL=10;
const integer=value=>Number.isFinite(Number(value))?Math.max(0,Math.trunc(Number(value))):0;
const flag=(actor,key)=>actor?.flags?.[scope]?.[key]??actor?.getFlag?.(scope,key);
export const bodyLevel=actor=>actor?.type==='npc'?0:Math.min(10,integer(actor?.system?.cultivation?.bodyCultivation));
export function bodyTurnKey(actor,combat=globalThis.game?.combat){
 const current=combat?.combatant?.actor;
 if(!combat?.started||!current||!(current===actor||current.uuid&&current.uuid===actor?.uuid))return null;
 return [combat.uuid??combat.id,combat.round,combat.combatant.id].join(':');
}
export function bodyBenefits(actor,combat=globalThis.game?.combat){
 const level=bodyLevel(actor),burst=flag(actor,'bodyMaravilhas'),turn=bodyTurnKey(actor,combat);
 return {level,extraHitPoints:BODY_HIT_POINTS_PER_LEVEL*level,attributeChoices:level+(level>=4?1:0),
  loadMultiplier:level>=1?10:1,athletics:level>=4?1:0,movement:level>=5?5:0,
  movementMultiplier:level>=5&&turn&&burst?.turn===turn?3:1,
  lifeBaseBonus:(level>=6?1:0)+(level>=9?2:0),qiBaseBonus:level>=10?5:0,
  refinement:level>=10?Math.floor(integer(actor?.system?.abilities?.con?.value)/2):0,
  naturalArmor:level>=2?{kind:level>=8?'pesada':'leve',rank:integer(actor?.system?.cultivation?.rank||1)+(level>=8?1:0)}:null,
  cure:level>=3,regeneration:level>=9?integer(actor?.system?.abilities?.con?.value):0};
}
export function bodyAttributeLimit(actor,key){return bodyLevel(actor)>=6&&['str','dex','con'].includes(key)?15:12;}
export function bodyWoundRecovery(actor,type){
 const level=bodyLevel(actor),current=actor?.type==='npc'?0:integer(actor?.system?.legacy2?.wounds?.value);
 const rate=type==='short'?(level>=9?0.2:level>=3?0.1:0):(level>=9?1:level>=3?0.4:0.2);
 const recovered=Math.min(current,Math.ceil(current*rate));return {current,rate,recovered,remaining:current-recovered};
}
const hitPoints=actor=>{const hp=actor.system?.attributes?.hp??{};return{value:integer(hp.value),max:integer(hp.effectiveMax??hp.max)};};
export function bodyCureUpdate(actor,combat=globalThis.game?.combat){
 if(bodyLevel(actor)<3)throw Error('Requer Portão da Cura.');
 const turn=bodyTurnKey(actor,combat);if(!turn)throw Error('Use a Cura no seu próprio turno de combate.');
 if(flag(actor,'bodyCureTurn')===turn)throw Error('Cura já utilizada neste turno.');
 const used=integer(flag(actor,'bodyCureUses'));if(used>=5)throw Error('Os cinco usos da Cura já foram gastos. Faça um descanso longo.');
 const actions=integer(actor.system?.legacy2?.actions?.value);if(actions<1)throw Error('Requer 1 Ponto de Ação disponível.');
 const hp=hitPoints(actor),healed=Math.min(Math.max(0,hp.max-hp.value),integer(actor.system?.abilities?.con?.value));
 if(!healed)throw Error('Não há Pontos de Vida para recuperar.');
 return {healed,updates:{'system.attributes.hp.value':hp.value+healed,'system.legacy2.actions.value':actions-1,
  ['flags.'+scope+'.bodyCureUses']:used+1,['flags.'+scope+'.bodyCureTurn']:turn}};
}
export function bodyRegenerationUpdate(actor,combat=globalThis.game?.combat){
 const benefits=bodyBenefits(actor),turn=bodyTurnKey(actor,combat);
 if(!benefits.regeneration||!turn||flag(actor,'bodyRegenerationTurn')===turn||actor.statuses?.has?.('dead')||actor.statuses?.has?.('jj-morto'))return null;
 const hp=hitPoints(actor),healed=Math.min(Math.max(0,hp.max-hp.value),benefits.regeneration);
 return {healed,updates:{...(healed?{'system.attributes.hp.value':hp.value+healed}:{}),['flags.'+scope+'.bodyRegenerationTurn']:turn}};
}
export function bodyMaravilhasUpdate(actor,combat=globalThis.game?.combat){
 if(bodyLevel(actor)<5)throw Error('Requer Portão das Maravilhas.');
 const turn=bodyTurnKey(actor,combat);if(!turn)throw Error('Use Maravilhas no seu próprio turno de combate.');
 const id=combat.uuid??combat.id,previous=flag(actor,'bodyMaravilhas'),used=previous?.combat===id?integer(previous.uses):0;
 if(used>=3)throw Error('Os três usos de Maravilhas deste encontro já foram gastos.');
 return {updates:{['flags.'+scope+'.bodyMaravilhas']:{combat:id,uses:used+1,turn,pending:true}}};
}
export function bodyAttackAdvantages(actor,combat=globalThis.game?.combat){
 const burst=flag(actor,'bodyMaravilhas');return bodyLevel(actor)>=5&&burst?.pending&&burst.turn&&burst.turn===bodyTurnKey(actor,combat)?6:0;
}
/** Improve the base damage at roll time; additional parts and saved weapon data stay intact. */
export function stepBodyWeaponDamage(actor,damage){
 if(bodyLevel(actor)<1)return damage;
 const clone=damage.clone?.()??{...damage,custom:{...damage.custom}};
 const step=die=>({4:6,6:8,8:10,10:12}[Number(die)]??Number(die));
 if(clone.custom?.enabled){
  const formula=String(clone.custom.formula??'');
  clone.custom={...clone.custom,formula:formula.replace(/^(\s*\d*d)(4|6|8|10|12)(?!\d)/i,(_all,prefix,die)=>prefix+step(die))};
 }else if(Number(clone.denomination)>0)clone.denomination=step(clone.denomination);
 return clone;
}
