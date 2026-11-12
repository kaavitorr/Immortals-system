import {CONCEITOS_ELEMENTOS} from './elemental-concepts-data.mjs';
import {CULTIVATION_RANKS} from './cultivation-data.mjs';
export const BEAST_CORE_TYPE='beastCore';
const SCOPE='Immortals-system';
export const BEAST_CORES=Object.freeze([...CONCEITOS_ELEMENTOS.map(({id,label})=>({id,label})),{id:'neutro',label:'Neutro'}].map(entry=>Object.freeze({...entry,img:'systems/Immortals-system/assets/wuxia/nucleos-pintados-v1/'+entry.id+'.webp'})));
export const BEAST_CORE_BY_ID=Object.freeze(Object.fromEntries(BEAST_CORES.map(entry=>[entry.id,entry])));
export const beastCoreSubtypes=()=>Object.fromEntries(BEAST_CORES.map(entry=>[entry.id,entry.label]));
export const beastCoreRealms=()=>CULTIVATION_RANKS.map(entry=>({value:entry.rank,label:entry.name}));
function validate(elementId,rank){
 const definition=Object.hasOwn(BEAST_CORE_BY_ID,elementId)?BEAST_CORE_BY_ID[elementId]:null;if(!definition)throw Error('Escolha um elemento válido para o núcleo, ou Neutro.');
 if(typeof rank==='boolean'||rank===null||rank===undefined||rank===''||!Number.isInteger(Number(rank))||Number(rank)<1||Number(rank)>10)throw Error('Escolha um reino de cultivo entre Condensação de Qi e Divindade.');
 return {...definition,rank:Number(rank),realmName:CULTIVATION_RANKS.find(entry=>entry.rank===Number(rank)).name,elementId:elementId==='neutro'?null:elementId};
}
/** Cores are material consumables, independent from spirit essences and PEQ crystals. */
export function beastCoreConfiguration(item){
 if(item?.type!=='consumable'||item.system?.type?.value!==BEAST_CORE_TYPE)return null;
 try{return validate(item.system.type.subtype,item.system.beastCore?.rank??1);}catch{return null;}
}
/** Keep one-unit native use semantics and update only known stock artwork. */
export function prepareBeastCoreChanges(item,changed={}){
 const read=path=>Object.hasOwn(changed,path)?changed[path]:path.split('.').reduce((value,key)=>value?.[key],changed);
 if(item?.type!=='consumable'||(read('system.type.value')??item.system?.type?.value)!==BEAST_CORE_TYPE)return null;
 const subtype=read('system.type.subtype')??item.system?.type?.subtype;
 const definition=validate(subtype||'neutro',read('system.beastCore.rank')??item.system?.beastCore?.rank??1);
 const patch={'system.type.subtype':definition.id,'system.beastCore.rank':definition.rank,'system.uses.max':'1','system.uses.autoDestroy':true,'system.uses.recovery':[]};
 const stock=BEAST_CORES.some(entry=>entry.img===item.img)||!item.img||item.img==='icons/svg/item-bag.svg';
 if(!Object.hasOwn(changed,'img')&&stock&&item.img!==definition.img)patch.img=definition.img;
 return patch;
}
/** Build a private, unowned world Item only from the Narrator's explicit material selection. */
export function createBeastCoreItemData({elementId,rank,source}={}){
 const definition=validate(elementId,rank),img=definition.img;
 const description='<p>Um núcleo físico de besta: uma esfera de cristal perfeitamente redonda, '+(definition.elementId?'da cor do elemento '+definition.label+'.':'sem afinidade elemental.')+'</p><p>O núcleo é um material consumível, distinto da Essência de Besta que contém a alma da criatura. Consulte o elemento e o reino nos detalhes deste item para verificar os requisitos de treinamentos e receitas.</p><p>Use Consumir núcleo somente quando uma regra exigir seu consumo. Cada uso remove uma unidade; possuir o núcleo não concede afinidade, transformação ou PEQ automaticamente.</p>';
 const activityId='iwCoreConsume001';
 return {name:'Núcleo de Besta — '+definition.label+(source?' · '+definition.realmName:''),type:'consumable',img,ownership:{default:0},effects:[],
 system:{identifier:'nucleo-de-besta-'+definition.id,type:{value:BEAST_CORE_TYPE,subtype:definition.id},beastCore:{rank:definition.rank},quantity:1,equipped:false,
 description:{value:description,chat:''},uses:{max:'1',spent:0,recovery:[],autoDestroy:true},activities:{[activityId]:{
 _id:activityId,type:'utility',name:'Consumir núcleo',img,activation:{type:'',value:0,condition:'Somente quando uma regra exigir o consumo do núcleo.',override:true},
 consumption:{spellSlot:false,scaling:{allowed:false,max:''},targets:[{type:'itemUses',target:'',value:'1',scaling:{mode:'',formula:''}}]},
 description:{value:description,chatFlavor:'Núcleo de Besta — '+definition.label},effects:[],uses:{max:'',spent:0,recovery:[]},
 duration:{value:'',units:'inst',override:true},range:{value:'',units:'self',override:true},target:{override:true,prompt:false,affects:{type:'self',count:'1',choice:false},template:{type:'',size:'',units:'m'}}}}},
 flags:{[SCOPE]:{beastCore:{version:1,...(source?{source:{actorUuid:String(source.actorUuid??''),name:String(source.name??''),deathEpisode:String(source.deathEpisode??'')}}:{})}}}};
}
/** Fourteen realm-1 templates; the realm of a recovered core is configured at death. */
export function beastCoreCompendiumDocuments(){
 const folder='iwBeastCores0001';
 return [{_id:folder,name:'Núcleos de Besta',type:'Item',folder:null,sorting:'a',color:'#8f9fae'},...BEAST_CORES.map((entry,index)=>{
 const item=createBeastCoreItemData({elementId:entry.id,rank:1});delete item.ownership;
 return {...item,_id:'iwBeastCore'+String(index+1).padStart(5,'0'),folder};
 })];
}
