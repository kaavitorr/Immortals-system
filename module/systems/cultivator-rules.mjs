import {elementalTier} from "./elemental-rules.mjs";
import {soulBenefits} from "./soul-path.mjs";
import {bodyBenefits} from "./body-path.mjs";
import {cultivationRankBenefits} from "./cultivation-rank-benefits.mjs";
/** Canonical Cultivador numbers; class levels never replace cultivation stages. */
export const CULTIVATOR_RULES = Object.freeze({
  lifeInitial:5, lifePerConstitution:5, lifePerStage:5, lifePerRealm:10,
  qiInitial:40, qiPerStage:10, qiPerRealm:20, proficiencyInitial:5, talentInitial:1
});
export const CULTIVATOR_PRIMARY_ABILITIES = Object.freeze(["str","dex","int","wis","cha"]);
const integer = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
export function isCultivator(actor) {
  if(actor?.type!=="character")return false;
  return Array.from(actor.itemTypes?.class??actor.items??[]).some(item=>item.type==="class"||item.system?.identifier
    ? (item.system?.identifier??item.identifier)==="cultivador" || item.getFlag?.("Immortals-system","cultivator")===true
      || item.flags?.["Immortals-system"]?.cultivator===true : false);
}
export function cultivatorProgression(actor,{baseHPBonus=elementalTier(actor,"madeira","qiDenso")}={}) {
  const source=actor?.system?.cultivation??{},rank=Math.min(10,Math.max(1,integer(source.rank)||1));
  const stage=Math.min(3,Math.max(1,integer(source.stage)||1)),level=(rank-1)*3+stage;
  const con=integer(actor?.system?.abilities?.con?.value??1),rules=CULTIVATOR_RULES,lifeBonus=Math.min(3,integer(baseHPBonus));
  return {rank,stage,level,
    hp:soulBenefits(actor).extraHitPoints+bodyBenefits(actor).extraHitPoints+(rules.lifeInitial+lifeBonus)+con*(rules.lifePerConstitution+lifeBonus)+(rank-1)*(2*(rules.lifePerStage+lifeBonus)+rules.lifePerRealm+2*lifeBonus)+(stage-1)*(rules.lifePerStage+lifeBonus),
    qi:cultivationRankBenefits(rank).extraQi+rules.qiInitial+(rank-1)*(2*rules.qiPerStage+rules.qiPerRealm)+(stage-1)*rules.qiPerStage,
    proficiency:rules.proficiencyInitial+level-1,talents:level,damageDie:[4,6,8,10,12][Math.min(4,rank-1)]};
}
