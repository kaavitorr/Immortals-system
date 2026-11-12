/** Currency and quantities belong to the native advancement preview, never render hooks. */
const count = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
export const grantItemQuantity = entry => Math.max(1, count(entry?.quantity ?? 1));
export function grantCurrencyUpdate(actor, currency = {}, value = {}, {reverse = false} = {}) {
 const updates = {};
 for (const key of ['gp','sp','cp']) {
  const amount = count(reverse ? value.currency?.[key] : currency[key]);
  if (!amount || (!reverse && value.currency?.[key] !== undefined)) continue;
  const current = count(actor?.system?._source?.currency?.[key] ?? actor?.system?.currency?.[key]);
  updates['system.currency.'+key] = Math.max(0,current+(reverse ? -amount : amount));
 }
 return updates;
}
export function grantCurrencyReceipt(currency = {}) {
 return Object.fromEntries(['gp','sp','cp'].filter(k=>count(currency[k])).map(k=>[k,count(currency[k])]));
}
export function grantCurrencyLabel(currency = {}) {
 return Object.entries(grantCurrencyReceipt(currency)).map(([k,v])=>v+' '+({gp:'PO',sp:'PS',cp:'PC'}[k])).join(' · ');
}

/** Receipts survive spending and selling: inventory balances never prove an award is still due. */
export function grantHasPendingBenefits(configuration = {}, value = {}) {
 const granted = new Set(Object.values(value.added ?? {}));
 return (configuration.items ?? []).some(item => !configuration.optional && !item.optional && !granted.has(item.uuid))
  || Object.keys(grantCurrencyReceipt(configuration.currency)).some(key => value.currency?.[key] === undefined);
}

/** Completion validates required choices after the native form has collected its edited field. */
export function advancementCompletionError(flow){
 const a=flow?.advancement,type=a?.type??a?.constructor?.typeName;
 if(type==='ItemGrant'&&grantHasPendingBenefits(a.configuration,a.value))return 'A entrega de itens ou moedas ainda não foi concluída. Confira os itens vinculados na Progressão antes de continuar.';
 if(type==='ItemChoice'){const c=a.getCounts(flow.level);if(!c.full)return 'Escolha '+c.max+' '+(c.max===1?'item':'itens')+' antes de continuar ('+c.current+' selecionados).';}
 if(type==='AbilityScoreImprovement'&&flow.item?.flags?.['Immortals-system']?.species&&flow.points?.available>0){
  const config=a.configuration,assignments=a.value.assignments??{},source=a.actor.system._source?.abilities??a.actor.system.abilities??{};
  const canSpend=Object.entries(a.actor.system.abilities??{}).some(([key,ability])=>a.canImprove(key)&&!config.locked.has(key)&&(assignments[key]??0)<(config.cap??Infinity)&&(source[key]?.value??ability.value??0)<Math.max(ability.max??20,config.max??-Infinity));
  if(canSpend)return 'Distribua os '+flow.points.total+' pontos de atributo da espécie antes de continuar.';
 }
 return null;
}
/** Deleting a species also removes unlocks earned before a later cultivation regression. */
export function advancementCleanupLevel(item,current){
 const flags=item?.flags?.['Immortals-system'];if(!flags?.species&&!flags?.speciesFeature)return current;
 const advancements=Object.values(item.advancement?.byId??item.system?.advancement??{});
 return Math.max(current,...advancements.flatMap(a=>a.levels??(a.type==='ItemChoice'?Object.keys(a.configuration?.choices??{}).map(Number):[a.level??0])).filter(Number.isFinite));
}
