import {IMMORTALS_PRICE_CURRENCIES} from './wuxia-currency.mjs';
/** First six levels are authored; upper markets extend that scale for the material catalogue. */
export const MATERIAL_MARKETS=Object.freeze(Object.fromEntries([
 [1,3000,500,'gp',null],[2,15000,1500,'gp',null],[3,100000,10000,'gp',null],
 [4,5000,100,'spiritualCrystals','human'],[5,5000,100,'spiritualCrystals','earth'],[6,5000,100,'spiritualCrystals','heaven'],
 [7,5000,100,'spiritualCrystals','sacred'],[8,25000,500,'spiritualCrystals','sacred'],
 [9,5000,100,'spiritualCrystals','divine'],[10,5000,100,'spiritualCrystals','supreme']
].map(([level,recipe,materials,currency,rank])=>[level,Object.freeze({recipe,materials,currency,rank})])));
export function nativeMarketPrice(quote){
 if(!quote||!Number.isFinite(quote.amount)||quote.amount<0)throw Error('Cotação inválida.');
 const denomination=quote.currency==='gp'?'gp':quote.currency==='spiritualCrystals'?'essence-'+quote.rank:null;
 if(!denomination||!IMMORTALS_PRICE_CURRENCIES[denomination])throw Error('Unidade de preço inválida.');
 return {value:quote.amount,denomination};
}
export function materialPriceUnits(material){
 const category=material.category;
 if(category==='reagente')return 1;
 if(category==='minerio'){
  const precious=/ouro|prata|jade|safira|diamante|rubi|platina|pal.dio|ir.dio|.smio/i.test(material.name??'');
  return Math.min(4,(precious?3:2)+(material.level>=7?1:0));
 }
 if(!['planta','parte-animal'].includes(category))throw Error('Categoria de material inválida.');
 const elemental=['tempo','espaco'].includes(material.element)?4:['luz','escuridao'].includes(material.element)?3:['relampago','vento','gelo','ilusao'].includes(material.element)?2:1;
 return Math.min(4,elemental+(category==='parte-animal'?1:0));
}
/** Each unit is a usable specimen with preserved Qi; scarcity is priced per ingredient, with no gold/crystal exchange. */
export function materialPrice(material){
 if(!Number.isInteger(material?.level)||!MATERIAL_MARKETS[material.level])throw Error('Nível de material inválido.');
 const market=MATERIAL_MARKETS[material.level];
 return nativeMarketPrice({amount:market.materials*materialPriceUnits(material)/10,currency:market.currency,rank:market.rank});
}
export function marketPriceLabel(price){
 const value=Number(price?.value),entry=IMMORTALS_PRICE_CURRENCIES[price?.denomination];
 if(!Number.isFinite(value)||!entry)return 'Preço não definido';
 const amount=value.toLocaleString('pt-BR',{maximumFractionDigits:6});
 if(!entry.priceOnly)return amount+' '+entry.abbreviation;
 return amount+' '+entry.label.replace('Cristal de Essência',value===1?'Cristal de Essência':'Cristais de Essência');
}
