import {COMBAT_MANUAL_CATEGORIES, COMBAT_MANUAL_TECHNIQUES} from './combat-manual-data.mjs';
const SCOPE='Immortals-system';
export const COMBAT_MANUAL_CONTENT_VERSION=1;
function stableId(key){let a=2166136261,b=2246822519;for(const c of key){a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b^c.charCodeAt(0),3266489917);}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
const id=key=>stableId('combat-manual:'+key);
export const COMBAT_MANUAL_FOLDER_ID=id('folder:root');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categoryOf=entry=>COMBAT_MANUAL_CATEGORIES.find(c=>c.id===entry.category);
const imageOf=category=>category.img.startsWith('icons/')?category.img:'systems/Immortals-system/'+category.img;
const damageTypes={'Contundente':'bludgeoning','Cortante':'slashing','Perfurante':'piercing','Trovejante':'thunder'};
function damagePart(entry,override){
 const printed=entry.sourceCard.damage;
 if(!override&&printed==='Nenhum')return [];
 const dice=printed.match(/^(\d+)d(\d+)/),fixed=printed.match(/^\d+/);
 const value=override??(dice?{dice:Number(dice[1]),die:Number(dice[2]),type:damageTypes[printed.split(' ').at(-1)]}:{formula:fixed?.[0],type:damageTypes[printed.split(' ').at(-1)]});
 if(!value.type||!value.dice&&!value.formula)throw Error('Dano inválido: '+entry.id);
 return [{number:value.dice??null,denomination:value.die??null,bonus:'',types:[value.type],custom:{enabled:!value.dice,formula:value.formula??''},scaling:{mode:'',number:0,formula:''}}];
}
function duration(entry){
 const printed=entry.sourceCard.duration;
 if(/minuto/i.test(printed))return {value:'1',units:'minute',expiry:null,special:printed,concentration:/Concentração/i.test(printed),override:true};
 if(/turno/i.test(printed))return {value:'1',units:'turn',expiry:/início/i.test(printed)?'turnStart':'turnEnd',special:printed,concentration:false,override:true};
 return {value:'',units:'inst',expiry:null,special:'',concentration:false,override:true};
}
function range(entry){
 if(entry.mechanics.range)return {...entry.mechanics.range,value:String(entry.mechanics.range.value??''),special:entry.mechanics.range.special??'',override:true};
 const printed=entry.sourceCard.range;
 const units=printed==='Toque'?'touch':printed==='Pessoal'||/Emanação|Esfera/.test(printed)?'self':printed==='Arma'?'spec':'m';
 return {value:units==='m'?(printed.match(/\d+(?:[,.]\d+)?/)?.[0]??'').replace(',','.'):'',units,special:units==='spec'?'Alcance da arma utilizada.':'',override:true};
}
function template(entry){
 if(entry.mechanics.template)return {type:entry.mechanics.template.type,size:String(entry.mechanics.template.size??''),width:'',units:'m'};
 const text=entry.sourceCard.range,type=/Linha/.test(text)?'line':/Cone/.test(text)?'cone':/Emanação/.test(text)?'radius':/Esfera/.test(text)?'sphere':'';
 return {type,size:type?(text.match(/\d+(?:[,.]\d+)?/)?.[0]??'').replace(',','.'):'',width:'',units:'m'};
}
function description(entry){
 const category=categoryOf(entry),m=entry.mechanics;
 const rows=[['Categoria',category.name],['Técnica',entry.auxiliary?'Auxiliar':entry.grade+'º Grau'],['Custo',entry.qi+' PQ de Qi Refinado'],['Ações',entry.actions+(entry.reaction?' · Reação':'')],['Alcance',entry.sourceCard.range],['Duração',entry.sourceCard.duration],['Arma',entry.weapon]];
 if(entry.sourceCard.requirements&&!['-','Nenhum'].includes(entry.sourceCard.requirements))rows.push(['Requisito do quadro',entry.sourceCard.requirements]);
 if(entry.sourceCard.combinedAttack!==null)rows.push(['Ataque Combinado',entry.sourceCard.combinedAttack?'Possível':'Impossível']);
 const notes=[...(m.corrections??[]),...(m.manual??[])];
 return '<table><tbody>'+rows.map(([label,value])=>'<tr><th>'+escape(label)+'</th><td>'+escape(value)+'</td></tr>').join('')+'</tbody></table>'+entry.description.map(text=>'<p>'+escape(text.replace(/\s*\[⬢+\]/gu,''))+'</p>').join('')+(notes.length?'<h3>Observações</h3>'+notes.map(text=>'<p>'+escape(text)+'</p>').join(''):'');
}
function nativeActivity(entry,key='main',options={}){
 const m={...entry.mechanics,...options},category=categoryOf(entry),type=m.type;
 const a={_id:id('activity:'+entry.id+':'+key),type,name:m.name??entry.name,img:imageOf(category),
  activation:{type:(m.reaction??entry.reaction)?'reaction':'action',value:m.actions??entry.actions,condition:m.conditionText??(entry.reaction?'Use somente quando ocorrer o gatilho descrito na técnica.':''),override:true},
  consumption:{spellSlot:false,scaling:{allowed:false,max:''},targets:(m.qi??entry.qi)>0?[{type:'attribute',target:'energy.generated',value:String(m.qi??entry.qi),scaling:{mode:'',formula:''}}]:[]},
  description:{value:description(entry),chatFlavor:entry.name},duration:{...duration(entry),...m.duration},range:range({...entry,mechanics:m}),
  target:{override:true,prompt:(m.target??'creature')!=='self',template:m.template?{...m.template,size:String(m.template.size??''),width:'',units:'m'}:template(entry),affects:{type:m.target??(entry.sourceCard.range==='Pessoal'&&type==='utility'?'self':'creature'),count:m.allTargets?'':'1',choice:m.choice===true,special:''}},
  uses:{max:'',spent:0,recovery:[]},effects:[],flags:{[SCOPE]:{combatManualActivity:{techniqueId:entry.id,key,rangeLocked:m.rangeLocked===true,manualResolution:(m.manual?.length??0)>0}}}};
 if(type==='utility')a.roll={formula:m.roll??'',name:m.name??entry.name,visible:!!m.roll,prompt:false};
 if(type==='attack'){
  a.attack={ability:'spellcasting',bonus:'',flat:false,type:{value:m.attackMode??'melee',classification:'spell'},critical:{threshold:m.critical??20}};
  a.damage={includeBase:false,critical:{bonus:''},parts:damagePart(entry,m.damage)};
 }
 if(type==='save'){
  a.save={ability:[m.save??'con'],bonus:'',dc:{calculation:'spellcasting',formula:''},visible:true};
  a.damage={onSave:m.onSave??'none',parts:m.noDamage?[]:damagePart(entry,m.damage)};
 }
 if(type==='attack'||type==='save')a.conditions=m.condition?[{_id:id('condition:'+entry.id+':'+key),condition:m.condition.id,save:m.condition.save}]:[];
 return a;
}
/** A stand-alone native technique, never an actor's already-assigned manifestation or a Qi talent. */
export function combatManualTechniqueDocument(techniqueId){
 const entry=COMBAT_MANUAL_TECHNIQUES.find(e=>e.id===techniqueId);if(!entry)throw new RangeError('Técnica de Manual de Combate desconhecida.');
 const category=categoryOf(entry),main=nativeActivity(entry),activities={[main._id]:main};
 for(const mode of entry.mechanics.alternatives??[]){
  const a=nativeActivity(entry,mode.key,{...mode,conditionText:mode.condition??'Escolha esta versão em lugar da ativação principal.',condition:entry.mechanics.condition,template:{type:'',size:''}});activities[a._id]=a;
 }
 for(const rider of entry.mechanics.extraSaves??[]){
  const a=nativeActivity(entry,rider.key,{type:'save',name:rider.name,save:rider.save,qi:0,actions:0,reaction:false,noDamage:true,condition:null,conditionText:'Somente após acertar a técnica; não é uma nova ativação.',template:{type:'',size:''}});activities[a._id]=a;
 }
 return {_id:id('item:'+entry.id),name:entry.name,type:'spell',folder:id('folder:'+entry.category),sort:(COMBAT_MANUAL_TECHNIQUES.filter(e=>e.category===entry.category).findIndex(e=>e.id===entry.id)+1)*100000,img:imageOf(category),effects:[],
  system:{identifier:'combat-manual-'+entry.id,level:entry.grade??0,ability:'',school:'',method:'innate',prepared:1,properties:[],materials:{value:'',consumed:false,cost:0,supply:0},activation:structuredClone(main.activation),duration:structuredClone(main.duration),range:structuredClone(main.range),target:{template:structuredClone(main.target.template),affects:structuredClone(main.target.affects)},description:{value:description(entry)},activities},
  flags:{[SCOPE]:{combatManualContentVersion:COMBAT_MANUAL_CONTENT_VERSION,combatManualTechnique:{id:entry.id,category:entry.category,grade:entry.grade,auxiliary:entry.auxiliary,weapon:entry.weapon,qi:entry.qi,actions:entry.actions,reaction:entry.reaction,combinedAttack:entry.sourceCard.combinedAttack,source:{book:'Immortals Legacy — Livro do Jogador v2.1',pages:'46–51',section:'4.2 Manuais de Combate e Ranks',card:structuredClone(entry.sourceCard)},manualResolution:[...(entry.mechanics.manual??[])],sourceCorrections:[...(entry.mechanics.corrections??[])]}}}};
}
/** Public catalogue; the native additive Geral synchronizer handles live creation. */
export function combatManualCompendiumDocuments(){
 const folders=[{_id:COMBAT_MANUAL_FOLDER_ID,name:'Manuais de Combate',type:'Item',folder:null,sorting:'m',color:'#b79a71',flags:{[SCOPE]:{combatManualFolder:'root',combatManualContentVersion:COMBAT_MANUAL_CONTENT_VERSION}}},...COMBAT_MANUAL_CATEGORIES.map((category,index)=>({_id:id('folder:'+category.id),name:category.name,type:'Item',folder:COMBAT_MANUAL_FOLDER_ID,sort:(index+1)*100000,sorting:'m',color:'#9bb0bf',flags:{[SCOPE]:{combatManualFolder:category.id,combatManualContentVersion:COMBAT_MANUAL_CONTENT_VERSION}}}))];
 return [...folders,...COMBAT_MANUAL_TECHNIQUES.map(entry=>combatManualTechniqueDocument(entry.id))];
}
