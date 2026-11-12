import {PROFESSION_MATERIAL_RECIPES,RECIPE_MATERIALS,RECIPE_PRODUCTS} from './profession-material-recipes-data.mjs';
import {marketPriceLabel} from './material-economy.mjs';
import {professionPrice} from './profession-crafting-rules.mjs';
import {PROFESSION_PRODUCTS} from './profession-products-data.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const RECIPE_ELEMENTS=Object.freeze([['madeira','Madeira'],['fogo','Fogo'],['terra','Terra'],['metal','Metal'],['agua','Água'],['relampago','Relâmpago'],['vento','Vento'],['gelo','Gelo'],['ilusao','Ilusão'],['luz','Luz'],['escuridao','Escuridão'],['tempo','Tempo'],['espaco','Espaço']].map(([id,label])=>Object.freeze({id,label})));
const elemental=new Set(['pilula-da-condensacao-elemental-de-x','pilula-da-afinidade-elemental','matriz-de-acumulo-elemental']);
export const isElementalRecipe=id=>elemental.has(id);
const aliases={fire:'fogo',wood:'madeira',earth:'terra',water:'agua',wind:'vento',lightning:'relampago',ice:'gelo',illusion:'ilusao',light:'luz',darkness:'escuridao',time:'tempo',space:'espaco',raio:'relampago'};
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
/** A detached recipe quote: calling this never spends inventory, currency, or cultivation resources. */
export function professionRecipe(id,level,element){
 const product=Object.hasOwn(RECIPE_PRODUCTS,id)?RECIPE_PRODUCTS[id]:null;if(!product)return null;
 level=level??product.levels.min;
 if(!Number.isInteger(level)||level<product.levels.min||level>product.levels.max)throw Error('Nível inválido para esta receita.');
 let elementId='';
 if(isElementalRecipe(id)){
  if(element===undefined||element===null||element==='')return {productId:id,level,requiresElement:true,elements:RECIPE_ELEMENTS};
  const normalized=normalize(element);
  elementId=RECIPE_ELEMENTS.find(e=>e.id===(aliases[normalized]??normalized))?.id;
  if(!elementId)throw Error('Escolha um elemento válido para a receita.');
 }
 const key=id+':'+level+':'+elementId,r=PROFESSION_MATERIAL_RECIPES[key];
 if(!r)throw Error('A receita deste nível não está disponível.');
 return {...structuredClone(r),key,requiresElement:false,ingredients:r.ingredients.map(i=>({...i,...structuredClone(RECIPE_MATERIALS[i.id]),id:i.id,uuid:'Compendium.Immortals-system.materiais.Item.'+i.id}))};
}
/** Actual component cost; the authored percentage remains available as a benchmark. */
export function professionRecipePricing(id,level,element){
 const product=Object.hasOwn(RECIPE_PRODUCTS,id)?RECIPE_PRODUCTS[id]:null;if(!product)return null;
 const r=professionRecipe(id,level,element),reference=professionPrice(r.level,{basis:'materials',creationPercent:product.creationPercent,salePercent:product.salePercent});
 const base={...reference,basis:'ingredients',referenceCreation:reference.creation,referenceSale:reference.sale,creation:null,sale:null,pending:r.requiresElement,reason:r.requiresElement?'elementSelection':null,marketManual:false};
 if(r.requiresElement)return base;
 const denomination=r.price.denomination,currency=denomination==='gp'?'gp':'spiritualCrystals',rank=denomination==='gp'?null:denomination.replace(/^essence-/,'');
 const creation={amount:r.ingredients.reduce((n,i)=>n+i.quantity*i.price.value,0),currency,rank};
 return {...base,creation,sale:reference.salePercent===null?null:{...creation,amount:creation.amount*reference.salePercent/100}};
}
/** Refresh only the authored cost row, leaving unrelated personal prose intact. */
export function recipeCostDescription(html,product){
 const text=String(html??''),id=typeof product==='string'?product:product?.id;
 const source=PROFESSION_PRODUCTS.find(entry=>entry.id===id);
 const authored=source?.descriptionHTML?.match(/<tr><td>Valor Base de Criação<\/td><td>[^<]*<\/td><\/tr>/)?.[0];
 return authored?text.split(authored).join('<tr><td>Custo de criação</td><td>Soma dos ingredientes desta receita.</td></tr>'):text;
}
export function professionRecipePricingHtml(quote){
 if(!quote)return '';
 if(!quote.creation)return '<p data-iw-recipe-pricing="2">Escolha o elemento para consultar o custo de criação e a venda.</p>';
 const label=money=>marketPriceLabel({value:money.amount,denomination:money.currency==='gp'?'gp':'essence-'+money.rank});
 return '<p data-iw-recipe-pricing="2"><strong>Custo de criação (ingredientes):</strong> '+escape(label(quote.creation))+'. <strong>Venda por unidade:</strong> '+(quote.sale?escape(label(quote.sale)):'não definida pela fonte')+'.</p>';
}
export function professionRecipeHtml(id,level,element){
 const r=professionRecipe(id,level,element);if(!r)return '';
 if(r.requiresElement)return '<section data-iw-recipe="1" class="iw-material-recipe"><header><strong>Receita de preparo</strong><span>Nível '+r.level+'</span></header><p>Escolha o elemento para ver os ingredientes desta receita.</p></section>';
 const rows=r.ingredients.map(i=>'<li class="'+(i.category==='reagente'?'is-reagent':'')+'"><img src="'+escape(i.img)+'" alt=""><span class="iw-recipe-quantity" title="Unidades do ingrediente">'+i.quantity+'</span><div class="iw-recipe-identity"><a class="content-link" data-iw-material="1" data-link data-id="'+i.id+'" data-type="Item" data-pack="Immortals-system.materiais" data-uuid="'+i.uuid+'">'+escape(i.name)+'</a><small>'+(i.category==='reagente'?'Reagente · ':'')+escape(i.role)+'</small></div><span class="iw-recipe-price" title="'+escape(marketPriceLabel(i.price))+' por unidade">'+escape(marketPriceLabel({value:i.price.value*i.quantity,denomination:i.price.denomination}))+'</span></li>').join('');
 return '<section data-iw-recipe="1" data-iw-recipe-key="'+escape(r.key)+'" class="iw-material-recipe"><header><strong>Receita de preparo</strong><span>Nível '+r.level+(r.element?' · '+escape(RECIPE_ELEMENTS.find(e=>e.id===r.element).label):'')+'</span></header><p class="iw-recipe-basis">Por tentativa de criação. Quantidades em unidades de cada ingrediente.</p><ol>'+rows+'</ol><footer><span>Custo dos componentes</span><strong>'+escape(marketPriceLabel(r.price))+'</strong></footer>'+(r.note?'<p class="iw-recipe-note">'+escape(r.note)+'</p>':'')+'</section>';
}
/** Refresh this modal alone; changing level/element does not rerender the actor sheet. */
export function bindProfessionRecipePreview(app,product){
 const root=app?.element,panel=root?.querySelector?.('[data-profession-recipe-preview]');if(!panel)return;
 const refresh=()=>{try{panel.innerHTML=professionRecipeHtml(product.id,Number(root.querySelector('[name="product-level"]').value),root.querySelector('[name="product-element"]')?.value);}catch(error){panel.textContent=error.message;}};
 root.addEventListener('change',event=>{if(['product-level','product-element'].includes(event.target?.name))refresh();});
 root.addEventListener('click',async event=>{const link=event.target?.closest?.('[data-iw-material]');if(!link||!panel.contains(link))return;event.preventDefault();event.stopPropagation();const doc=await globalThis.fromUuid?.(link.dataset.uuid);doc?.sheet?.render(true);});
 refresh();
}
