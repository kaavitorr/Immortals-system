import {npcCultivationRank} from './npc-cultivation.mjs';
import {soulBenefits} from "./soul-path.mjs";
/** Benefits are derived from the realm, never persisted as stacking bonuses. */
const scope='Immortals-system';
const nonnegative=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
export function cultivationRank(actor) {
 const derived=npcCultivationRank(actor);if(derived!==null)return derived;
 const raw=actor?.type==='npc'?(actor.flags?.[scope]?.cultivationRank??actor.getFlag?.(scope,'cultivationRank')):actor?.system?.cultivation?.rank;
 if(raw===undefined||raw===null||raw==='')return null;
 const value=Number(raw);return Number.isInteger(value)&&value>=0&&value<=10?value:null;
}
export function cultivationRankBenefits(rank) {
 rank=nonnegative(rank);
 return {rank,elementalTraining:rank>=2,meditationQi:rank>=3?5:0,
  trainingDifficultyReduction:rank>=5?4:0,trainingLevelLimit:5,damagePerRank:rank>=5?3:0,
  illuminationExtra:rank>=6?1:0,pathTimeMultiplier:rank>=7?0.5:1,pathMoneyMultiplier:rank>=7?0.5:1,
  bodyPointReduction:rank>=7?1:0,soulPointReduction:rank>=7?2:0,extraQi:rank>=8?100:0,
  immunityGap:rank>=8?4:0,freeCombatManuals:rank>=9?2:0,freeCombatManualGrade:9,
  basicQiAbilities:[1,3,4,5,6,7,8,9].filter(value=>value<=rank).length,
  divinePending:rank>=10};
}
export function rankTrainingDifficultyReduction(actor,targetLevel) {
 const benefits=cultivationRankBenefits(cultivationRank(actor)),level=Number(targetLevel);
 return Number.isInteger(level)&&level>=1&&level<=benefits.trainingLevelLimit?benefits.trainingDifficultyReduction:0;
}
export function professionDifficultyReduction(actor,targetLevel) {return rankTrainingDifficultyReduction(actor,targetLevel)+soulBenefits(actor).professionReduction;}
export function meditationUpdate(actor,minutes) {
 const benefits=cultivationRankBenefits(cultivationRank(actor));
 if(!benefits.meditationQi)throw Error('Meditação requer Núcleo Rotativo.');
 if(!Number.isInteger(minutes)||minutes<0)throw Error('Informe uma quantidade inteira de minutos.');
 const energy=actor.system?.energy??{},current=nonnegative(energy.total),maximum=nonnegative(energy.max);
 const value=Math.max(current,Math.min(maximum,current+Math.floor(minutes/10)*benefits.meditationQi));
 return {recovered:value-current,updates:{'system.energy.total':value}};
}
/** A concession is different from editing the current balance or refunding a cost. */
export function illuminationGrantUpdate(actor,amount) {
 if(!Number.isSafeInteger(amount)||amount<0)throw Error('Informe uma quantidade inteira de PI.');
 const benefits=cultivationRankBenefits(cultivationRank(actor)),received=amount*(1+benefits.illuminationExtra);
 return {received,updates:{'system.cultivation.illumination':nonnegative(actor.system?.cultivation?.illumination)+received}};
}
/** Mutate the fresh damage parts once, before multipliers/resistances; unknown realms stay unknown. */
export function rankDamageAdjustment(target,parts,{sourceActor,direct=false,healing=false}={}) {
 const result={bonus:0,immune:false};
 if(direct||healing||!sourceActor||sourceActor===target||sourceActor.uuid&&sourceActor.uuid===target?.uuid)return result;
 const source=cultivationRank(sourceActor),destination=cultivationRank(target);
 if(source===null||destination===null)return result;
 const eligible=parts.filter(part=>Number(part.value)>0&&!['healing','temphp','maximum'].includes(part.type));
 if(!eligible.length||eligible.some(part=>part.active?.cultivationRank))return result;
 const attack=cultivationRankBenefits(source),defense=cultivationRankBenefits(destination);
 if(defense.immunityGap&&destination-source>=defense.immunityGap){
  result.immune=true;for(const part of eligible){part.value=0;(part.active??={}).cultivationRank={immune:true};}
 }else if(attack.damagePerRank&&source>destination){
  result.bonus=attack.damagePerRank*(source-destination);eligible[0].value+=result.bonus;
  (eligible[0].active??={}).cultivationRank={bonus:result.bonus};
 }
 return result;
}
