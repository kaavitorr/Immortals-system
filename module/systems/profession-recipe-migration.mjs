import {professionRecipeHtml,professionRecipePricing,professionRecipePricingHtml,recipeCostDescription} from './profession-material-recipes.mjs';
import {RECIPE_PRODUCTS} from './profession-material-recipes-data.mjs';
import {nativeMarketPrice} from './material-economy.mjs';
const SCOPE='Immortals-system';
const equalPrice=(a,b)=>a?.value===b?.value&&a?.denomination===b?.denomination;
const strip=html=>String(html??'').replace(/<section data-iw-recipe="1"[^>]*>[\s\S]*?<\/section>/g,'').replace(/<p data-iw-recipe-pricing="2">[\s\S]*?<\/p>/g,'').replace(/<p><strong>Custo de criação \(somente materiais\):<\/strong>[\s\S]*?<\/p>/g,'').replace(/<p><strong>Preço de referência:<\/strong> cotação de mercado necessária para o nível \d+\.<\/p>/g,'');
/** Touch only the generated recipe block, blank/canonical sale price, and matching native activity descriptions. */
export function prepareProfessionRecipeUpdate(item,prior={}){
 const source=item?.toObject?.()??item,config=source?.flags?.[SCOPE]?.professionProduct,p=config&&Object.hasOwn(RECIPE_PRODUCTS,config.id)?RECIPE_PRODUCTS[config.id]:null;
 if(!p||config.kind!==p.kind||config.profession!==p.profession)return null;
 const owner=item?.actor??(['character','npc'].includes(item?.parent?.type)?item.parent:null);
 if(item?.isOwner===false||item?.limited||owner&&(owner.isOwner!==true||owner.limited))return null;
 const flags=source.flags[SCOPE];
 if(![1,2].includes(flags.professionProductsContentVersion)||!(flags.professionProductManaged===true||flags.professionProductManaged===false&&owner?.isOwner===true))return null;
 if(Object.keys(config).some(k=>!['id','kind','profession','level','quality','element'].includes(k)))return null;
 if(p.kind==='pill'?!['inferior','common','superior','perfect'].includes(config.quality):config.quality!==null)return null;
 const expected=p.kind==='pill'||p.kind==='talisman'?'consumable':config.id==='tesouro-arma'?'weapon':'equipment';
 if(source.type!==expected)return null;
 let html;try{html=professionRecipeHtml(config.id,config.level,config.element);}catch{return null;}
 const update={_id:source._id??item.id};
 const quote=professionRecipePricing(config.id,config.level,config.element);
 if(JSON.stringify(prior['flags.'+SCOPE+'.professionProductPricing']??source.flags[SCOPE].professionProductPricing)!==JSON.stringify(quote))update['flags.'+SCOPE+'.professionProductPricing']=quote;
 const revise=(path,current)=>{const before=prior[path]??current;if(typeof before!=='string')return;const after=recipeCostDescription(strip(before),config.id)+professionRecipePricingHtml(quote)+html;if(after!==before)update[path]=after;};
 revise('system.description.value',source.system?.description?.value);
 for(const [id,a] of Object.entries(source.system?.activities??{}))if(/^[A-Za-z0-9]{1,64}$/.test(id)&&!['constructor','prototype'].includes(id)&&a.flags?.[SCOPE]?.professionProductActivity?.productId===config.id)revise('system.activities.'+id+'.description.value',a.description?.value);
 if(source.flags?.[SCOPE]?.professionRecipeVersion!==2)update['flags.'+SCOPE+'.professionRecipeVersion']=2;
 if(p.salePercent!==undefined){
  const sale=quote.sale?nativeMarketPrice(quote.sale):{value:0,denomination:'gp'};
  const price=prior['system.price']??source.system?.price,previous=source.flags?.[SCOPE]?.professionProductPricing?.sale;
  let old=null;try{if(previous)old=nativeMarketPrice(previous);}catch{}
  // A pending elemental template already has no sale price; do not turn absence into a write.
  const priced=quote.sale||old&&price!==undefined&&price.value!==0;
  if(priced&&(price===undefined||price.value===0||old&&equalPrice(price,old))&&!equalPrice(price,sale))update['system.price']=sale;
 }
 return Object.keys(update).length>1?update:null;
}
