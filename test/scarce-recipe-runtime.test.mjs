import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as recipes from '../module/systems/profession-material-recipes.mjs';
import {professionPrice} from '../module/systems/profession-crafting-rules.mjs';
import {professionProductDocument,professionProductPricing} from '../module/systems/profession-products-content.mjs';
import {prepareProfessionRecipeUpdate} from '../module/systems/profession-recipe-migration.mjs';
const S='Immortals-system';
function apply(source,patch){for(const [path,value] of Object.entries(patch)){if(path==='_id')continue;const parts=path.split('.');let target=source;for(const key of parts.slice(0,-1))target=target[key]??={};target[parts.at(-1)]=structuredClone(value);}return source;}
test('actual recipe quote uses the sum of ingredient units and retains the authored benchmark',()=>{
 const r=recipes.professionRecipe('pilula-de-cura',1),q=recipes.professionRecipePricing('pilula-de-cura',1);
 assert.equal(q.creation.amount,r.price.value);assert.equal(q.sale.amount,r.price.value*0.15);assert.equal(q.basis,'ingredients');assert.deepEqual(q.referenceCreation,professionPrice(1,{creationPercent:60,salePercent:15}).creation);
 assert.deepEqual(professionProductPricing('pilula-de-cura',1),q);
});
test('elemental quotes remain pending until the element is selected',()=>{
 const q=recipes.professionRecipePricing('matriz-de-acumulo-elemental',1);assert.deepEqual(professionProductDocument('pilula-da-afinidade-elemental').system.price,{value:0,denomination:'gp'});assert.equal(q.creation,null);assert.equal(q.sale,null);assert.equal(q.reason,'elementSelection');
 const r=recipes.professionRecipe('matriz-de-acumulo-elemental',1,'Fogo');assert.equal(recipes.professionRecipePricing('matriz-de-acumulo-elemental',1,'Fogo').creation.amount,r.price.value);
});
test('generated products and matching activities have one actual quote and use units',()=>{
 const p=professionProductDocument('pilula-de-cura',{level:4}),q=recipes.professionRecipePricing('pilula-de-cura',4);
 assert.equal(p.flags[S].professionRecipeVersion,2);assert.equal(p.system.price.value,q.sale.amount);assert.match(p.system.description.value,/data-iw-recipe-pricing="2"/);assert.doesNotMatch(p.system.description.value,/Quantidades em porções/);
 for(const a of Object.values(p.system.activities))assert.match(a.description.value,/data-iw-recipe-pricing="2"/);
});
test('version 1 canonical sale and quote migrate once while personal text and prices survive',()=>{
 const p=professionProductDocument('pilula-de-cura',{level:4}),old=professionPrice(4,{creationPercent:60,salePercent:15});
 p.flags[S].professionRecipeVersion=1;p.flags[S].professionProductPricing=old;p.system.price={value:old.sale.amount,denomination:'essence-human'};
 p.system.description.value='<p>Minha observação.</p><p><strong>Custo de criação (somente materiais):</strong> antigo. <strong>Venda por unidade:</strong> antigo.</p>'+p.system.description.value;
 const patch=prepareProfessionRecipeUpdate(p);assert.equal((patch['system.price']??p.system.price).value,recipes.professionRecipePricing('pilula-de-cura',4).sale.amount);assert.match(patch['system.description.value'],/Minha observação/);assert.equal((patch['system.description.value'].match(/data-iw-recipe-pricing="2"/g)||[]).length,1);
 apply(p,patch);assert.equal(prepareProfessionRecipeUpdate(p),null);
 p.system.price={value:777,denomination:'gp'};p.flags[S].professionRecipeVersion=1;assert.equal(prepareProfessionRecipeUpdate(p)['system.price'],undefined);
});

test('element-only reconfiguration refreshes canonical sale with the selected composition',async()=>{
 const {prepareProfessionProductConfigurationUpdate}=await import('../module/applications/item/profession-product-config.mjs');
 const p=professionProductDocument('pilula-da-afinidade-elemental',{level:4,element:'Fogo'}),actor={isOwner:true,limited:false};
 const item={...p,id:p._id,isOwner:true,isEmbedded:true,actor,toObject:()=>structuredClone(p)};
 const patch=prepareProfessionProductConfigurationUpdate(item,{level:4,quality:'inferior',element:'Água'});
 assert.equal(patch['flags.'+S+'.professionProductPricing'].creation.amount,recipes.professionRecipePricing('pilula-da-afinidade-elemental',4,'Água').creation.amount);
 assert.equal(patch['flags.'+S+'.professionRecipeVersion'],2);assert.equal(patch['system.price'].value,recipes.professionRecipePricing('pilula-da-afinidade-elemental',4,'Água').sale.amount);
 p.system.price={value:777,denomination:'gp'};assert.equal(prepareProfessionProductConfigurationUpdate(item,{level:4,quality:'inferior',element:'Água'})['system.price'],undefined);
});

test('fresh canonical products do not trigger redundant native migrations, including unselected elemental templates',async()=>{
 const {professionProductCompendiumDocuments}=await import('../module/systems/profession-products-content.mjs');
 const {prepareProfessionProductAuthorUpdate}=await import('../module/systems/profession-products-migration.mjs');
 for(const p of professionProductCompendiumDocuments().filter(d=>d.type!=='Item'))assert.equal(prepareProfessionProductAuthorUpdate(p),null,p.name);
});

test('full product migration preserves personal cost rows in both descriptions and native activities',async()=>{
 const {prepareProfessionProductAuthorUpdate}=await import('../module/systems/profession-products-migration.mjs');
 const p=professionProductDocument('pilula-de-cura'),activity=Object.values(p.system.activities)[0];
 const rows=[
 '<tr><td>Valor Base de Criação</td><td>Receita ancestral: 7.500 PO</td></tr>',
 '<tr><td>Valor Base de Criação</td><td>75% do valor base de Receitas e Materiais.</td></tr>',
 '<tr><td>Valor Base de Criação</td><td>350% do valor base de Receitas e Materiais.</td></tr>'
 ];
 const authored='<tr><td>Valor Base de Criação</td><td>60% do valor base de Receitas e Materiais.</td></tr>';
 p.system.description.value='<table>'+rows.join('')+authored+'</table>';activity.description.value=p.system.description.value;
 const patch=prepareProfessionProductAuthorUpdate(p);assert(patch);
 for(const text of [patch['system.description.value'],patch['system.activities.'+activity._id+'.description.value']]){for(const row of rows)assert(text.includes(row),row);assert(!text.includes(authored));assert.match(text,/Soma dos ingredientes desta receita/);}
 apply(p,patch);assert.equal(prepareProfessionProductAuthorUpdate(p),null);
});
