/** Current denominations; hidden legacy data is retained only for existing documents. */
export const IMMORTALS_CURRENCIES = {
  gp: {label:"Peça de Ouro",shortLabel:"Ouro",abbreviation:"PO",conversion:1,exchangeGroup:"coins",icon:"systems/Immortals-system/assets/wuxia/moedas-pintadas-v1/peca-ouro.webp"},
  sp: {label:"Peça de Silver",shortLabel:"Silver",abbreviation:"PS",conversion:10,exchangeGroup:"coins",icon:"systems/Immortals-system/assets/wuxia/moedas-pintadas-v1/peca-prata.webp"},
  cp: {label:"Peça de Cobre",shortLabel:"Cobre",abbreviation:"PC",conversion:100,exchangeGroup:"coins",icon:"systems/Immortals-system/assets/wuxia/moedas-pintadas-v1/peca-bronze.webp"},
  yen: {hidden:true,label:"Yen",shortLabel:"Yen",abbreviation:"¥",conversion:1,exchangeGroup:"yen",icon:"systems/Immortals-system/icons/currency/gold.webp"}
};

export function currencyExchangeEntries(config, denomination) {
  if (!config[denomination]) return [];
  const group = config[denomination].exchangeGroup ?? "default";
  return Object.entries(config).filter(([, value]) =>
    (value.exchangeGroup ?? "default") === group && Number.isFinite(value.conversion) && value.conversion > 0);
}

/** Consolidate each exchange group separately, preserving the input ledger. */
export function convertCurrencyBalances(currency, config, round = Math.floor) {
  const result = {...Object.fromEntries(Object.keys(config).map(key => [key, 0])), ...currency};
  const groups = new Map();
  for (const [key, value] of Object.entries(config)) {
    if (!Number.isFinite(value.conversion) || value.conversion <= 0) continue;
    const group = value.exchangeGroup ?? "default";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push([key, value]);
  }
  for (const entries of groups.values()) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a[1].conversion - b[1].conversion);
    const smallest = entries.at(-1)[1].conversion;
    let amount = entries.reduce((sum, [key, value]) =>
      sum + Math.max(0, Number(result[key]) || 0) * (smallest / value.conversion), 0);
    for (const [key, value] of entries) {
      const ratio = smallest / value.conversion;
      result[key] = round(amount / ratio, key);
      amount -= result[key] * ratio;
    }
  }
  return result;
}

/** Crystal units are quotation denominations only; actual crystals stay in the item inventory. */
export const IMMORTALS_PRICE_CURRENCIES = Object.freeze({
 ...Object.fromEntries(Object.entries(IMMORTALS_CURRENCIES).filter(([,value])=>!value.hidden)),
 ...Object.fromEntries([
  ['human','Humano','humano-comum'],['earth','Terra','terra-comum'],['heaven','Céu','ceu-comum'],
  ['sacred','Sagrado','sagrado-comum'],['divine','Divino','divino-comum'],['supreme','Supremo','supremo-unico']
 ].map(([rank,label,asset])=>['essence-'+rank,Object.freeze({label:'Cristal de Essência '+label+' '+(rank==='supreme'?'Único':'Comum'),
  abbreviation:'CE '+label,shortLabel:label,rank,quality:rank==='supreme'?'unique':'common',priceOnly:true,
  icon:'systems/Immortals-system/assets/wuxia/cristais-essencia-pintados-v1/'+asset+'.webp'})]))
});
