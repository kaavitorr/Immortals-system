import {bodyTurnKey} from './body-path.mjs';
const scope='Immortals-system';
const integer=value=>Number.isFinite(Number(value))?Math.max(0,Math.trunc(Number(value))):0;
const flag=(actor,key)=>actor?.flags?.[scope]?.[key]??actor?.getFlag?.(scope,key);
export function soulLevel(actor){
 if(actor?.type!=='npc')return Math.min(10,integer(actor?.system?.cultivation?.soulCultivation));
 const raw=flag(actor,'soulCultivation');if(raw===undefined||raw===null||raw===''||typeof raw==='boolean')return null;
 const level=Number(raw);return Number.isInteger(level)&&level>=0&&level<=10?level:null;
}
export function soulBenefits(actor){
 const level=soulLevel(actor)??0;
 return {level,extraHitPoints:level,attributeChoices:level+(level>=3?2:0)+(level>=9?2:0),qiBaseBonus:level>0?2:0,
  spiritDamage:level>=2?3*Math.floor(level/2):0,barrierMax:level>=3?30+10*(level-3):0,
  psychicResistance:level>=4?10:0,soulResistance:level>=4?10:0,mentalDefense:level>=4?1:0,
  penetration:level>=5?5:0,battleIntegrity:level>=7?50*level:0,
  absorptionMultiplier:level>=8?3:1,professionReduction:level>=8?5:0,
  regeneration:level>=9?10:0,extraMentalChoices:level>=9?2:0,immortal:level>=10};
}
export function soulAttributeLimit(actor,key){return (soulLevel(actor)??0)>=9&&['int','wis','cha'].includes(key)?15:12;}
export function soulBarrierState(actor){
 const max=soulBenefits(actor).barrierMax,spent=integer(flag(actor,'soulBarrierSpent')),value=Math.max(0,max-spent);
 return{max,spent,value,pct:max?100*value/max:0};
}
export function soulBarrierUpdate(actor,value){
 const {max}=soulBarrierState(actor);
 if(!Number.isInteger(value)||value<0||value>max)throw Error('Informe um valor entre zero e o máximo de PV temporários da Alma.');
 return{['flags.'+scope+'.soulBarrierSpent']:max-value};
}
export function soulWoundsState(actor){
 const total=integer(actor?.system?.legacy2?.wounds?.value),value=Math.min(total,integer(actor?.system?.legacy2?.wounds?.soul));
 return{total,value};
}
/** Classify existing wounds; changing this subset never adds the same damage twice. */
export function soulWoundsUpdate(actor,value){
 const {total}=soulWoundsState(actor);
 if(!Number.isInteger(value)||value<0||value>total)throw Error('As Feridas da Alma devem estar entre zero e as Feridas totais.');
 return{'system.legacy2.wounds.soul':value};
}
export function soulRegenerationUpdate(actor,combat=globalThis.game?.combat){
 const benefits=soulBenefits(actor),turn=bodyTurnKey(actor,combat);
 if(actor?.type==='npc'||!benefits.regeneration||!turn||flag(actor,'soulRegenerationTurn')===turn||actor.statuses?.has?.('dead')||actor.statuses?.has?.('jj-morto'))return null;
 const wounds=soulWoundsState(actor),recovered=Math.min(wounds.value,benefits.regeneration);
 return{recovered,updates:{...(recovered?{'system.legacy2.wounds.value':wounds.total-recovered,'system.legacy2.wounds.soul':wounds.value-recovered}:{}),
  ['flags.'+scope+'.soulRegenerationTurn']:turn}};
}
export function soulRestUpdates(actor,type,updates={}){
 const result={},wounds=soulWoundsState(actor),remaining=integer(updates['system.legacy2.wounds.value']??wounds.total);
 if(wounds.value>remaining)result['system.legacy2.wounds.soul']=remaining;
 if(type!=='long'||actor?.type!=='character')return result;
 if(soulBenefits(actor).barrierMax)result['flags.'+scope+'.soulBarrierSpent']=0;
 result['flags.'+scope+'.soulLastRest']={hp:integer(updates['system.attributes.hp.value']??actor.system?.attributes?.hp?.value),
  qi:integer(updates['system.energy.total']??actor.system?.energy?.total),worldTime:Number.isFinite(globalThis.game?.time?.worldTime)?game.time.worldTime:null};
 return result;
}
export function soulSaveBonus(actor,key,{mindSoul=false}={}){
 return mindSoul&&['fortitude','vontade'].includes(key)?soulBenefits(actor).mentalDefense:0;
}
export function soulAvatarUpdate(actor,active=true){
 if((soulLevel(actor)??0)<1)throw Error('Requer Avatar da Alma.');
 if(!active)return{['flags.'+scope+'.soulAvatar']:{active:false}};
 if(flag(actor,'soulAvatar')?.active)throw Error('Seu avatar já está manifestado.');
 const actions=actor.system?.legacy2?.actions??{},available=Math.min(integer(actions.value),integer(actions.max??6));
 if(available<1)throw Error('Requer 1 Ponto de Ação disponível.');
 return{'system.legacy2.actions.value':integer(actions.value)-1,['flags.'+scope+'.soulAvatar']:{active:true}};
}
/** Additional psychic damage is conditional on the target and on an actual attack roll. */
export function addSoulSpiritDamage(target,parts,{sourceActor,isAttack=false,healing=false,direct=false}={}){
 if(!isAttack||healing||direct||!sourceActor||sourceActor===target||sourceActor.uuid&&sourceActor.uuid===target?.uuid)return 0;
 const source=soulLevel(sourceActor),destination=soulLevel(target);
 if(source===null||destination===null||source<=destination||parts.some(part=>part.active?.soulSpirit))return 0;
 if(!parts.some(part=>Number.isFinite(part.value)&&part.value>0&&!['healing','temphp','maximum'].includes(part.type)))return 0;
 const bonus=soulBenefits(sourceActor).spiritDamage;if(!bonus)return 0;
 parts.push({type:'psychic',value:bonus,active:{soulSpirit:true}});return bonus;
}

/** Preserve the NPC damage rules until their wound treatment is defined separately. */
export function soulDamageBudget(actor,parts,amount){
 const total=Number(amount)||0;
 const soul=actor?.type==='character'?Math.min(Math.max(0,Math.trunc(total)),Math.floor((Array.isArray(parts)?parts:[]).reduce((sum,part)=>sum+(part.type==='soul'&&part.value>0?part.value:0),0))):0;
 return{normal:total-soul,soul};
}
/** Shared reductions keep mixed damage proportions; shield and common temporary HP only receive normal damage. */
export function reduceSoulDamageBudget(budget,amount){
 const normal=Math.max(0,budget.normal),total=normal+budget.soul,reduction=Math.min(total,Math.max(0,Number(amount)||0));
 if(!total||!reduction)return budget;
 const soulReduction=Math.min(budget.soul,Math.floor(reduction*budget.soul/total));
 budget.soul-=soulReduction;budget.normal-=reduction-soulReduction;return budget;
}
export function soulDamageUpdates(actor,amount){
 const damage=integer(amount),hp=actor?.system?.attributes?.hp??{},wounds=soulWoundsState(actor);
 const result={absorbed:0,wounds:0,effectiveMax:Math.max(0,Number(hp.effectiveMax??hp.max)||0),updates:{}};
 if(!damage||actor?.type!=='character')return result;
 const shield=soulBarrierState(actor);result.absorbed=Math.min(damage,shield.value);result.wounds=damage-result.absorbed;
 if(result.absorbed)result.updates['flags.'+scope+'.soulBarrierSpent']=shield.spent+result.absorbed;
 if(result.wounds){
  result.updates['system.legacy2.wounds.value']=wounds.total+result.wounds;
  result.updates['system.legacy2.wounds.soul']=wounds.value+result.wounds;
  result.effectiveMax=Math.max(0,(Number(hp.max)||0)-Math.floor((wounds.total+result.wounds)/2)+(Number(hp.tempmax)||0));
 }
 return result;
}

export function soulChannel(actor,{itemType,area=false,healing=false}={}){
 if(healing)return '';const channel=flag(actor,'soulChannel'),level=soulLevel(actor)??0;
 if(channel==='soul'&&level>=5)return 'soul';
 if(channel==='psychic'&&level>=1&&flag(actor,'soulAvatar')?.active&&itemType==='spell'&&!area)return 'psychic';
 return '';
}
export function soulChannelUpdate(actor,value){
 const level=soulLevel(actor)??0;
 if(value!==''&&!(value==='soul'&&level>=5)&&!(value==='psychic'&&level>=1&&flag(actor,'soulAvatar')?.active))throw Error('Esta canalização ainda não está disponível.');
 return{['flags.'+scope+'.soulChannel']:value};
}
/** Only psychic damage actually reaching life can impose the avatar's temporary maximum loss. */
export function avatarMaxLossUpdates(actor,loss,updates={}){
 loss=integer(loss);if(!loss||soulLevel(actor)!==0)return{};
 const hp=actor?.system?.attributes?.hp??{},source=actor.system?._source?.attributes?.hp??actor._source?.system?.attributes?.hp??hp;
 return{'system.attributes.hp.tempmax':Number(updates['system.attributes.hp.tempmax']??source.tempmax??0)-loss,
  ['flags.'+scope+'.soulAvatarHpLoss']:integer(flag(actor,'soulAvatarHpLoss'))+loss};
}
export function restoreAvatarMaximum(actor,type,updates={}){
 const hp=actor?.system?.attributes?.hp??{},loss=type==='long'?integer(flag(actor,'soulAvatarHpLoss')):0;
 if(loss){const source=actor.system?._source?.attributes?.hp??actor._source?.system?.attributes?.hp??hp;
  updates['system.attributes.hp.tempmax']=Number(source.tempmax??0)+loss;updates['flags.'+scope+'.-=soulAvatarHpLoss']=null;}
 return Number(hp.tempmax??0)+loss;
}

export function soulDamageMaximum(actor,updates={}){
 const hp=actor?.system?.attributes?.hp??{},source=actor?.system?._source?.attributes?.hp??actor?._source?.system?.attributes?.hp??hp;
 const wounds=actor?.type==='npc'?0:integer(updates['system.legacy2.wounds.value']??actor?.system?.legacy2?.wounds?.value);
 const delta=Object.hasOwn(updates,'system.attributes.hp.tempmax')?Number(updates['system.attributes.hp.tempmax'])-Number(source.tempmax??0):0;
 return Math.max(0,Number(hp.max??hp.effectiveMax??0)-Math.floor(wounds/2)+Number(hp.tempmax??0)+delta);
}
