/** Authored Essence Crystal ranks; capacity is PEQ per crystal reservoir. */
export const ESSENCE_CRYSTAL_TYPE='essenceCrystal';
const groups=[
 ['humano','Humano',[10,15,20]],['terra','Terra',[60,80,100]],['ceu','Céu',[200,250,400]],
 ['sagrado','Sagrado',[500,1000,2000]],['divino','Divino',[3000,6000,10000]],['supremo','Supremo',[25000]]
];
const qualities=[['inferior','Inferior'],['comum','Comum'],['superior','Superior']];
export const ESSENCE_CRYSTALS=Object.freeze(groups.flatMap(([rank,rankLabel,capacities])=>capacities.map((capacity,index)=>{
 const [quality,qualityLabel]=capacities.length===1?['unico','Único']:qualities[index],id=rank+'-'+quality;
 return Object.freeze({id,rank,rankLabel,quality,qualityLabel,capacity,name:'Cristal de Essência — '+rankLabel+' '+qualityLabel,
 img:'systems/Immortals-system/assets/wuxia/cristais-essencia-pintados-v1/'+id+'.webp'});
})));
export const ESSENCE_CRYSTAL_BY_ID=Object.freeze(Object.fromEntries(ESSENCE_CRYSTALS.map(entry=>[entry.id,entry])));
export const essenceCrystalSubtypes=()=>Object.fromEntries(ESSENCE_CRYSTALS.map(entry=>[entry.id,entry.rankLabel+' · '+entry.qualityLabel+' — '+entry.capacity.toLocaleString('pt-BR')+' PEQ']));
export function crystalConsumableDefinition(item){
 return item?.type==='consumable'&&item.system?.type?.value===ESSENCE_CRYSTAL_TYPE?ESSENCE_CRYSTAL_BY_ID[item.system.type.subtype]??null:null;
}
/** Keep fixed authored capacity and spent charge semantics when editing a crystal. */
export function prepareCrystalConsumableChanges(item,changed={}){
 const read=path=>Object.hasOwn(changed,path)?changed[path]:path.split('.').reduce((value,key)=>value?.[key],changed);
 const type=read('system.type.value')??item?.system?.type?.value;
 if(item?.type!=='consumable'||type!==ESSENCE_CRYSTAL_TYPE)return null;
 const subtype=read('system.type.subtype')??item.system?.type?.subtype,definition=ESSENCE_CRYSTAL_BY_ID[subtype];if(!definition)return null;
 const raw=read('system.uses.spent')??item.system?.uses?.spent??0,spent=Number(raw);
 if(!Number.isSafeInteger(spent)||spent<0)throw Error('A Essência consumida deve ser um número inteiro positivo ou zero.');
 return {'system.uses.max':String(definition.capacity),'system.uses.spent':Math.min(definition.capacity,spent),'system.uses.recovery':[],'system.uses.autoDestroy':false};
}
