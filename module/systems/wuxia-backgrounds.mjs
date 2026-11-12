import {grantCurrencyReceipt} from "./advancement-grants.mjs";
import {backgroundEquipmentDocuments,backgroundEquipmentAdvancements} from "./background-equipment.mjs";
import {backgroundImage} from "./general-content-art.mjs";
import {WUXIA_BACKGROUNDS} from "./wuxia-backgrounds-data.mjs";
export const BACKGROUND_FOLDER_ID="bacc000000000001";
export const BACKGROUND_FEATURE_FOLDER_ID="bacc000000000002";
const scope="Immortals-system",pack="Compendium.Immortals-system.geral.Item.";
const hash=value=>{let n=2166136261;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,"0");};
const id=(prefix,key)=>prefix+hash(key);
const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paragraphs=text=>String(text).split(/\n+/).filter(Boolean).map(p=>"<p>"+escape(p)+"</p>").join("");
const uses=period=>({spent:0,max:period?"1":"",recovery:period&&!["week","month"].includes(period)?[{period,type:"recoverAll",formula:""}]:[]});

function activity(entry,{key="luck",name=entry.feature.name,period=null,formula=null,consumeItem=false}={}){
 const activityId=id("bacc4000",entry.key+":"+key);
 return {_id:activityId,type:formula?"utility":"check",name,img:backgroundImage(entry.key,{feature:true}),activation:{type:"",value:0,condition:"Conforme as condições da característica."},
  consumption:{spellSlot:false,targets:consumeItem?[{type:"itemUses",target:"",value:"1"}]:period?[{type:"activityUses",target:"",value:"1"}]:[]},
  target:{affects:{type:"self"},prompt:false,template:{units:"m"}},range:{units:"self"},uses:uses(period),
  description:{chatFlavor:name,value:paragraphs(entry.feature.description)},
  ...(formula?{roll:{formula,name,prompt:false,visible:true}}:{check:{ability:"",associated:["luc"],bonus:"",dc:{calculation:"",formula:entry.feature.dc?String(entry.feature.dc):""},visible:true}})};
}
function featureDocument(entry){
 const f=entry.feature,period=f.recovery??f.manualRecovery,activities=[];
 if(entry.key==="orfao")activities.push(activity(entry,{name:"Rotas urbanas"}),activity(entry,{key:"food",name:"Encontrar comida e água",period:"day"}));
 else if(f.description.includes("Sorte"))activities.push(activity(entry,{consumeItem:!!period}));
 else if(f.roll)activities.push(activity(entry,{formula:f.roll,consumeItem:!!period}));
 if(entry.key==="comerciante")activities.push(activity(entry,{key:"sale",name:"Bônus da venda bem-sucedida",formula:"3d10 * 10"}));
 if(entry.key==="pescador")activities.push(activity(entry,{key:"species",name:"Nova espécie — após pescar o peixe",formula:"1d20"}));
 const manual=f.manualRecovery?"<p><em>Controle de uso: uma vez por "+(f.manualRecovery==="week"?"semana":"mês")+". Reponha o uso manualmente quando esse período terminar no calendário da campanha.</em></p>":"";
 return {_id:id("bacc2000",entry.key),name:f.name,type:"feat",img:backgroundImage(entry.key,{feature:true}),folder:BACKGROUND_FEATURE_FOLDER_ID,
  system:{identifier:"antecedente-"+entry.key,type:{value:"background"},description:{value:paragraphs(f.description)+manual},uses:uses(period),activities:Object.fromEntries(activities.map(a=>[a._id,a]))},
  effects:[],flags:{[scope]:{backgroundFeature:entry.key,backgroundRuleVersion:1,featureSection:"jj-origin"}}};
}
/** Native backgrounds and their linked features; choices and narrative consequences remain explicit. */
export function backgroundDocuments(){
 const folders=[{_id:BACKGROUND_FOLDER_ID,name:"Antecedentes",type:"Item",folder:null,sorting:"a",color:"#b79a71"},
  {_id:BACKGROUND_FEATURE_FOLDER_ID,name:"Características de Antecedente",type:"Item",folder:BACKGROUND_FOLDER_ID,sorting:"a",color:"#7b8d99"}];
 const backgrounds=WUXIA_BACKGROUNDS.map(entry=>{
  const grantId=id("bacc3000",entry.key),feature=featureDocument(entry),featureUuid=pack+feature._id;
  const rules={key:entry.key,startingGold:entry.startingGold,equipment:entry.equipment,...(entry.startingCultivation?{startingCultivation:entry.startingCultivation}:{}),...(entry.hair?{hair:entry.hair}:{})};
  return {_id:id("bacc1000",entry.key),name:entry.name,type:"background",img:backgroundImage(entry.key),folder:BACKGROUND_FOLDER_ID,
   system:{identifier:"antecedente-"+entry.key,description:{value:paragraphs(entry.description)+"<h3>Equipamentos iniciais</h3><p>"+escape(entry.equipment)+" <strong>"+entry.startingGold+" PO.</strong></p><h3>@UUID["+featureUuid+"]{"+entry.feature.name+"}</h3>"+paragraphs(entry.feature.description)},
    wealth:"",startingEquipment:[{_id:id("bacc5000",entry.key),group:null,sort:0,type:"currency",key:"gp",count:entry.startingGold,requiresProficiency:false}],
    advancement:{[grantId]:{_id:grantId,type:"ItemGrant",level:0,title:"Característica de Antecedente",configuration:{items:[{uuid:featureUuid,optional:false}],optional:false},value:{}},...backgroundEquipmentAdvancements(entry)}},
   effects:[],flags:{[scope]:{background:rules,backgroundRuleVersion:2}}};
 });
 return [...folders,...backgrounds,...WUXIA_BACKGROUNDS.map(featureDocument),...backgroundEquipmentDocuments()];
}
/** Used only by the guarded creation transaction, never by sheet opens or compendium imports. */
export function backgroundCreationBenefits(actor,background){
 const rules=background?.flags?.[scope]?.background,updates={};let cultivation=null;
 if(!rules||background.type!=="background"||!WUXIA_BACKGROUNDS.some(entry=>entry.key===rules.key))return {actor:updates,cultivation};
 const initial=Object.values(background.system?.advancement??{}).filter(a=>a.type==="ItemGrant"&&Number(a.level??0)<=1&&a.configuration?.currency);
 const currency=initial.length?initial.reduce((sum,a)=>{for(const [key,value] of Object.entries(grantCurrencyReceipt(a.configuration.currency)))sum[key]=(sum[key]??0)+value;return sum;},{}):{gp:rules.startingGold};
 for(const [key,value]of Object.entries(currency))if(Number.isFinite(value)&&value>=0)updates["system.currency."+key]=Math.max(0,Number(actor.system?.currency?.[key])||0)+value;
 if(rules.hair)updates["system.details.hair"]=rules.hair;
 const current=actor.system?.cultivation??{},start=rules.startingCultivation;
 if(start&&((Number(current.rank)||1)-1)*3+(Number(current.stage)||1)<(start.rank-1)*3+start.stage){
  cultivation={...start};updates["system.cultivation.rank"]=start.rank;updates["system.cultivation.stage"]=start.stage;
 }
 return {actor:updates,cultivation};
}
