import {ESSENCE_GROWTH, beastEssenceDefinition} from "./beast-essence-rules.mjs";
import {CULTIVATION_RANKS} from "./cultivation-data.mjs";
const SCOPE="Immortals-system";
const copy=value=>structuredClone(value);
const rankName=rank=>CULTIVATION_RANKS.find(entry=>entry.rank===rank)?.name??"Não informado";

export function withBeastEssenceGrowth(definition,growth) {
  if(typeof growth!=="string"||!Object.hasOwn(ESSENCE_GROWTH,growth))throw new RangeError("Rank de crescimento inválido.");
  if(definition?.version!==1||!definition.id||!Object.hasOwn(ESSENCE_GROWTH,definition.growth))throw Error("Escolha uma essência válida para alterar o Rank.");
  return {...copy(definition),growth,growthOverride:true};
}
export const beastEssenceGrowthChoices=()=>Object.entries(ESSENCE_GROWTH).map(([id,rule])=>({id,label:rule.label,limit:rankName(rule.limitRank)}));
export function beastEssenceGrowthItemContext(item,{editable=false,user=globalThis.game?.user}={}) {
  const definition=beastEssenceDefinition(item),rule=ESSENCE_GROWTH[definition?.growth];
  return rule?{label:rule.label,limit:rankName(rule.limitRank),canEdit:editable&&user?.isGM===true}:null;
}

/** Refresh only stock growth paragraphs. Personal notes and the captured source remain intact. */
export function beastEssenceGrowthItemUpdate(item,growth) {
  const previous=beastEssenceDefinition(item),definition=withBeastEssenceGrowth(previous,growth),rule=ESSENCE_GROWTH[growth];
  const update={["flags."+SCOPE+".beastEssenceItem.definition"]:definition};
  const before=item.system?.description?.value;
  if(typeof before!=="string")return update;
  const guide='<p>Antes da integração: Condensação de Qi. Após a integração, acompanha seu cultivo até <strong>'+rankName(rule.limitRank)+'</strong>.'
    +(rule.limitRank<10?' Forma enfraquecida em '+rankName(rule.limitRank+1)+'.':'')
    +(rule.limitRank+2<=10?' Todos os benefícios cessam a partir de '+rankName(rule.limitRank+2)+'.':'')+'</p>';
  let description=before.replace(/(<strong>Crescimento:<\/strong>\s*)[^<]*(\.\s*<strong>Atributo:<\/strong>)/,(_match,start,end)=>start+rule.label+end)
    .replace(/<p><strong>Origem do crescimento:<\/strong>[\s\S]*?<\/p>/,'<p><strong>Origem do crescimento:</strong> Alterado pelo Narrador.</p>')
    .replace(/<p>Antes da integração: Condensação de Qi\.[\s\S]*?<\/p>/,guide);
  if(item.flags?.[SCOPE]?.cultivationDestinyEssence)description=description.replace('de Rank '+ESSENCE_GROWTH[previous.growth].label,'de Rank '+rule.label);
  if(description!==before)update['system.description.value']=description;
  return update;
}
