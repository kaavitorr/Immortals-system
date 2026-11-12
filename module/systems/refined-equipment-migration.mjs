import {PROFESSION_PRODUCTS,refinedTreasureText} from './profession-products-data.mjs';
import {professionProductDocument} from './profession-products-content.mjs';
const scope='Immortals-system';
/** Only the two managed compendium templates are refreshed. Owned and custom equipment keep their statistics. */
export function prepareRefinedTreasureUpdate(item) {
  const source=item?.toObject?.()??item,flags=source?.flags?.[scope],config=flags?.professionProduct;
  if(flags?.professionProductManaged!==true||flags.refinedEquipmentRulesVersion===1
    ||!['tesouro-arma','tesouro-armadura'].includes(config?.id))return null;
  const product=PROFESSION_PRODUCTS.find(entry=>entry.id===config.id);
  const level=Number(config.level);if(!Number.isInteger(level)||level<1||level>10)return null;
  const canonical=professionProductDocument(product.id,{level});
  if((source._id??source.id)!==canonical._id||source.type!==canonical.type)return null;
  const update={_id:canonical._id,['flags.'+scope+'.refinedEquipmentRulesVersion']:1};
  const html=source.system?.description?.value,next=refinedTreasureText(html);
  if(next!==html)update['system.description.value']=next;
  for(const [id,activity] of Object.entries(source.system?.activities??{})) {
    if(activity.flags?.[scope]?.professionProductActivity?.productId!==product.id)continue;
    const previous=activity.description?.value,updated=refinedTreasureText(previous);
    if(updated!==previous)update['system.activities.'+id+'.description.value']=updated;
  }
  const path=product.id==='tesouro-arma'?'refinement':'armor';
  if(source.system?.[path]?.rarityLevel===undefined||source.system[path].rarityLevel===0)update['system.'+path+'.rarityLevel']=level;
  const rules=flags.professionProductAutomation?.rules;
  if(Array.isArray(rules))update['flags.'+scope+'.professionProductAutomation.rules']=rules.map(rule=>rule.type==='treasureTemplate'||rule.rule==='treasureTemplate'?{...rule,rankRules:structuredClone(product.rankRules)}:rule);
  return update;
}
