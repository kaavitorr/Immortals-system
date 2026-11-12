import {PROFESSION_PRODUCTS} from './profession-products-data.mjs';
const SCOPE='Immortals-system';
const BASE='systems/Immortals-system/assets/wuxia/';

/** One asset mapping for the compendium, activities and actor catalogue. */
export function professionProductImage(product){
 if(typeof product==='string')product=PROFESSION_PRODUCTS.find(entry=>entry.id===product);
 if(!product)throw Error('Produto de profissão desconhecido.');
 if(product.kind==='pill')return BASE+'pilulas-pintadas-v1/'+product.id+'.webp';
 if(product.kind==='talisman')return BASE+'talismas-pintados-v1/'+product.id+'.webp';
 if(product.kind==='tool')return BASE+'ferramentas-pintadas-v1/'+product.id+'.webp';
 if(product.kind==='inscription')return BASE+'inscricoes-pintadas-v1/'+product.id+'.webp';
 if(product.kind==='matrix')return BASE+'matrizes-pintadas-v1/'+product.id+'.webp';
 if(product.kind==='treasure')return BASE+'tesouros-pintados-v1/'+product.id+'.webp';
 return BASE+'profissoes-pintadas-v1/'+product.profession+'.webp';
}

/** Replace only the former system placeholder; personal art and all game data survive. */
export function prepareProfessionProductArtUpdate(item){
 if(!item||item.isOwner===false||item.limited)return null;
 const owner=item.actor??(['character','npc'].includes(item.parent?.type)?item.parent:null);
 if(owner&&(owner.isOwner!==true||owner.limited))return null;
 const source=item.toObject?.()??item,flags=source.flags?.[SCOPE],config=flags?.professionProduct;
 if(![1,2].includes(flags?.professionProductsContentVersion))return null;
 if(flags.professionProductManaged!==true&&!(flags.professionProductManaged===false&&owner?.isOwner===true))return null;
 const product=PROFESSION_PRODUCTS.find(entry=>entry.id===config?.id&&['talisman','tool','inscription','matrix','treasure'].includes(entry.kind));
 if(!product||config.kind!==product.kind||config.profession!==product.profession)return null;
 const expectedType=product.kind==='treasure'?(product.id==='tesouro-arma'?'weapon':'equipment'):product.kind==='talisman'?'consumable':['inscription','matrix'].includes(product.kind)?'equipment':product.toolType==='equipment'?'tool':'loot';
 if(source.type!==expectedType)return null;
 if(product.levels){if(!Number.isInteger(config.level)||config.level<product.levels.min||config.level>product.levels.max)return null;}
 else if(config.level!=null)return null;
 if(Object.keys(config).some(key=>!['id','kind','profession','level','quality','element'].includes(key)))return null;
 const old=BASE+'profissoes-pintadas-v1/'+product.profession+'.webp',image=professionProductImage(product);
 if(source.img!==old&&source.img!==image)return null;
 const id=source._id??item.id;if(!id)return null;
 const update={_id:id};if(source.img===old)update.img=image;
 for(const [key,activity] of Object.entries(source.system?.activities??{})){
  if(!/^[A-Za-z0-9]{1,64}$/.test(key)||['constructor','prototype'].includes(key))continue;
  if(activity.flags?.[SCOPE]?.professionProductActivity?.productId!==product.id)continue;
  if(activity.img===old||!activity.img)update['system.activities.'+key+'.img']=image;
 }
 return Object.keys(update).length>1?update:null;
}
