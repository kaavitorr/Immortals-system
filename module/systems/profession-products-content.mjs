import {professionRecipeHtml,professionRecipePricing,professionRecipePricingHtml,recipeCostDescription} from './profession-material-recipes.mjs';
import {nativeMarketPrice} from './material-economy.mjs';
import {professionProductImage} from "./profession-product-art.mjs";
import {PROFESSION_PRODUCTS} from './profession-products-data.mjs';
import {professionProductConfiguration,professionProductNativeData,professionProductStableId} from './profession-products-activities.mjs';
import {refinedEquipmentProfile} from './refined-equipment.mjs';
const SCOPE='Immortals-system';
export const PROFESSION_PRODUCTS_CONTENT_VERSION=2;
export const PROFESSION_PRODUCTS_FOLDER_ID=professionProductStableId('profession-products:folder:root');
export const PROFESSION_PRODUCT_CATEGORIES=Object.freeze([
 {kind:'pill',name:'Pílulas',color:'#7d8861'},{kind:'inscription',name:'Inscrições',color:'#968d69'},
 {kind:'talisman',name:'Talismãs',color:'#ac8769'},{kind:'matrix',name:'Matrizes',color:'#708d9a'},
 {kind:'tool',name:'Ferramentas',color:'#95846b'},{kind:'treasure',name:'Tesouros',color:'#aa9566'}
].map(Object.freeze));
export const professionProductCategoryFolderId=kind=>professionProductStableId('profession-products:folder:'+kind);
const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const bookHtml=html=>String(html??'').replace(/\[(⬢+)\]/gu,(_,actions)=>'['+actions.length+' '+(actions.length===1?'ação':'ações')+']').replace(/⬢/gu,'ação').replace(/★/gu,'');
const qualityLabels={inferior:'Inferior',common:'Comum',superior:'Superior',perfect:'Perfeita'};
function folder(category){return{_id:category?professionProductCategoryFolderId(category.kind):PROFESSION_PRODUCTS_FOLDER_ID,name:category?.name??'Profissões',type:'Item',folder:category?PROFESSION_PRODUCTS_FOLDER_ID:null,sorting:'a',color:category?.color??'#968262',flags:{[SCOPE]:{professionProductsFolder:category?.kind??'root',professionProductsContentVersion:PROFESSION_PRODUCTS_CONTENT_VERSION}}};}
function physicalType(product){
 if(product.kind==='pill'||product.kind==='talisman')return{type:'consumable',subtype:product.kind==='pill'?'potion':'scroll'};
 if(product.kind==='matrix')return{type:'equipment',subtype:'vehicle'};
 if(product.kind==='inscription')return{type:'equipment',subtype:'wondrous'};
 if(product.kind==='tool')return product.toolType==='equipment'?{type:'tool',subtype:'art'}:{type:'loot',subtype:['material','supply'].includes(product.toolType)?'material':'gear'};
 if(product.id==='tesouro-arma')return{type:'weapon',subtype:''};
 return{type:'equipment',subtype:product.id==='tesouro-voador'?'vehicle':'wondrous'};
}

/** Component prices keep each crystal rank separate from native gold. */
export function professionProductPricing(product,level,element){
 if(typeof product==='string')product=PROFESSION_PRODUCTS.find(entry=>entry.id===product);
 if(typeof product?.creationPercent!=='number'||!Number.isFinite(product.creationPercent))return null;
 return professionRecipePricing(product.id,level??product.levels?.min,element);
}
/** Fresh native source for one configured physical product; no actor or compendium is written. */
export function professionProductDocument(id,configuration={}){
 const config=professionProductConfiguration(id,configuration),product=PROFESSION_PRODUCTS.find(entry=>entry.id===id),native=professionProductNativeData(id,config),category=PROFESSION_PRODUCT_CATEGORIES.find(entry=>entry.kind===product.kind),physical=physicalType(product);
 const img=professionProductImage(product);
 const configurationText=[config.level===null?'':'<strong>Nível do produto:</strong> '+config.level,config.quality?'<strong>Qualidade:</strong> '+qualityLabels[config.quality]:'',config.element?'<strong>Elemento:</strong> '+escape(config.element):''].filter(Boolean).join('. ');
 const manual=native.manual.length?'<p><strong>Resolução:</strong> '+native.manual.map(escape).join(' ')+'</p>':'';
 const pending=native.pending.length?'<p><strong>Pendente:</strong> '+native.pending.map(escape).join(' ')+'</p>':'';
 const pricing=professionProductPricing(product,config.level,config.element);
 const description=(configurationText?'<p>'+configurationText+'.</p>':'')+bookHtml(product.kind==='tool'?product.descriptionHTML:recipeCostDescription(product.descriptionHTML,product))+manual+pending+professionRecipePricingHtml(pricing)+professionRecipeHtml(id,config.level,config.element);
 for(const activity of Object.values(native.activities)){activity.img=img;activity.description.value=description;activity.description.chatFlavor=product.name+' — '+activity.name;const meta=activity.flags[SCOPE].professionProductActivity;if(meta.pendingCost||meta.pendingResolution)activity.description.value+='<p><strong>Uso bloqueado — pendente:</strong> '+escape(meta.pendingCost??meta.pendingResolution)+'</p>';}
 const system={identifier:'profession-product-'+id,type:{value:physical.subtype},quantity:1,description:{value:description},...(['loot'].includes(physical.type)?{}:{activities:native.activities})};
 if(product.id==='tesouro-arma'){system.refinement={rarityLevel:config.level};system.damage={base:{number:1,denomination:refinedEquipmentProfile(config.level).weapon.denomination,bonus:'',types:[]}};}
 if(product.id==='tesouro-armadura')system.armor={rarityLevel:config.level};
 if(physical.type==='consumable')system.uses={max:'1',spent:0,recovery:[],autoDestroy:true};
 if(physical.type==='equipment'||physical.type==='weapon'||physical.type==='tool')system.equipped=false;
 if(physical.type==='tool'){system.ability='wis';system.proficient=null;system.bonus='';}
 if(product.price)system.price=structuredClone(product.price);
 if(pricing?.sale)system.price=nativeMarketPrice(pricing.sale);
 else if(pricing?.pending)system.price={value:0,denomination:'gp'};
 if(product.kind==='matrix'){
  const hp=Number(product.hpPerLevel??0)*config.level;system.hp={value:hp,max:hp,dt:0,conditions:product.weakPoint??''};
  if(id==='matriz-de-defesa')system.armor={value:20+config.level};
  if(id==='matriz-de-cofre')system.armor={value:21+config.level};
 }
 return{_id:professionProductStableId('profession-products:item:'+id),name:product.name,type:physical.type,folder:professionProductCategoryFolderId(category.kind),img,effects:native.effects,system,
  flags:{[SCOPE]:{professionProduct:config,professionProductManaged:true,...(product.kind!=='tool'?{professionRecipeVersion:2}:{}),...(['tesouro-arma','tesouro-armadura'].includes(id)?{refinedEquipmentRulesVersion:1}:{}),professionProductsContentVersion:PROFESSION_PRODUCTS_CONTENT_VERSION,...(pricing?{professionProductPricing:pricing}:{}),
   professionProductAutomation:{rules:native.rules,manual:native.manual,pending:native.pending,...(product.weakPoint?{weakPoint:product.weakPoint}:{}),...(product.hpPerLevel?{hpPerLevel:product.hpPerLevel}:{})}}}};
}
/** Root folder, six category folders, and the single authored product catalogue. */
export function professionProductCompendiumDocuments(){return[folder(),...PROFESSION_PRODUCT_CATEGORIES.map(folder),...PROFESSION_PRODUCTS.map(product=>professionProductDocument(product.id))];}
