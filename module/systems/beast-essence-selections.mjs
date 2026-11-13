/** Per-form choices use only the native records already captured in the essence. */
export const ESSENCE_SELECTION_FIELDS=Object.freeze({
  normalArchetypeFeatures:{maximum:5,source:"archetype",label:"habilidades do Arquétipo na forma normal"},
  weakenedArchetypeFeatures:{maximum:1,source:"archetype",label:"habilidades do Arquétipo na forma enfraquecida"},
  normalFeatures:{maximum:2,source:"features",label:"características da forma normal"},
  weakenedFeatures:{maximum:1,source:"features",label:"características da forma enfraquecida"},
  normalAttacks:{maximum:2,source:"attacks",actions:3,label:"ataques da forma normal"},
  weakenedAttacks:{maximum:1,source:"attacks",actions:6,label:"ataques da forma enfraquecida"}
});
const list=value=>Array.isArray(value)?value:[];
const candidates=(essence,field)=>field.source==="archetype"?list(essence?.archetype?.features):list(essence?.[field.source]);

export function validateBeastEssenceSelections(essence,selection={}) {
  const result={};
  for(const [name,field] of Object.entries(ESSENCE_SELECTION_FIELDS)) {
    const keys=selection[name]??[],records=candidates(essence,field);
    if(!Array.isArray(keys)||keys.length>field.maximum||new Set(keys).size!==keys.length
      ||keys.some(key=>typeof key!=="string"||!records.some(record=>record.key===key&&(!field.actions||Number.isInteger(record.actions)&&record.actions>=1&&record.actions<=field.actions))))
      throw new RangeError("Seleção inválida de "+field.label+". Escolha até "+field.maximum+" opção(ões) disponíveis.");
    result[name]=[...keys];
  }
  return result;
}
export function withBeastEssenceSelections(essence,selection) {
  if(essence?.version!==1||!essence.id)throw Error("Escolha uma essência válida para selecionar as habilidades.");
  if(!selection||typeof selection!=="object"||Array.isArray(selection))throw new RangeError("Seleção de habilidades inválida.");
  return {...structuredClone(essence),...validateBeastEssenceSelections(essence,{...essence,...selection})};
}
export function beastEssenceArchetypeFeatures(essence,mode,level=Infinity) {
  const field=mode==="normal"?"normalArchetypeFeatures":"weakenedArchetypeFeatures";
  const keys=new Set(list(essence?.[field]).slice(0,ESSENCE_SELECTION_FIELDS[field].maximum));
  const seen=new Set();
  return list(essence?.archetype?.features).filter(record=>{
    if(!keys.has(record.key)||seen.has(record.key)||!Number.isFinite(Number(record.level))||Number(record.level)<0||Number(record.level)>level)return false;
    seen.add(record.key);return true;
  });
}
export function beastEssenceSelectionPending(essence) {
  return list(essence?.archetype?.features).length>0&&(!Array.isArray(essence.normalArchetypeFeatures)||!Array.isArray(essence.weakenedArchetypeFeatures));
}
/** Socket commands carry bounded choice identifiers, never native Item data. */
export function parseBeastEssenceSelections(value) {
  if(typeof value!=="string"||value.length>16384)throw Error("Seleção de habilidades inválida.");
  let data;try{data=JSON.parse(value);}catch{throw Error("Seleção de habilidades inválida.");}
  if(!data||typeof data!=="object"||Array.isArray(data)||Object.keys(data).some(key=>!Object.hasOwn(ESSENCE_SELECTION_FIELDS,key)))throw Error("Seleção de habilidades inválida.");
  for(const [key,entries] of Object.entries(data))if(!Array.isArray(entries)||entries.length>ESSENCE_SELECTION_FIELDS[key].maximum||entries.some(entry=>typeof entry!=="string"||!entry||entry.length>1024))throw Error("Seleção de habilidades inválida.");
  return data;
}
export function prepareBeastEssenceSelectionContext(essence,selection=essence,error="") {
  const groups=[
    {label:"Habilidades do Arquétipo",normalName:"normalArchetypeFeatures",weakenedName:"weakenedArchetypeFeatures",records:list(essence?.archetype?.features)},
    {label:"Características e habilidades adicionais",normalName:"normalFeatures",weakenedName:"weakenedFeatures",records:list(essence?.features)},
    {label:"Ataques especiais",normalName:"normalAttacks",weakenedName:"weakenedAttacks",records:list(essence?.attacks)}
  ];
  return {name:essence.name,error,groups:groups.map(group=>({...group,normalLimit:ESSENCE_SELECTION_FIELDS[group.normalName].maximum,weakenedLimit:ESSENCE_SELECTION_FIELDS[group.weakenedName].maximum,
    records:group.records.map(record=>({key:record.key,name:record.data?.name??record.itemName??record.key,img:record.data?.img,level:record.level,
      normal:list(selection?.[group.normalName]).includes(record.key),weakened:list(selection?.[group.weakenedName]).includes(record.key),
      normalEligible:group.normalName!=="normalAttacks"||record.actions>=1&&record.actions<=3,weakenedEligible:group.weakenedName!=="weakenedAttacks"||record.actions>=1&&record.actions<=6}))}))};
}
