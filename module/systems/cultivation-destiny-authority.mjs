import {registerBeastEssenceAuthority,dispatchBeastEssenceAction} from './beast-essence-authority.mjs';
import {destinyState} from './cultivation-destiny.mjs';
import {prepareDivineManualStudy,prepareDivineManualMantras,prepareDivineManualActivation,prepareDivineManualIdentification,prepareDivineManualMantraEdit} from './divine-manual.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
const S='Immortals-system',ACTION='cultivationDestiny';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const fields={
 select:['key','lineageId','elements','ability','story'],
 record:['kind','name','rank','rarity','quality','offeredName','offeredRarity','offeredQuality','story','confirmedByNarrator'],
 study:['name','rank','quality','properties','assimilate','elements','replaceIndex'],
 mantras:['mantras','activeMantra'],
 mantra:['text','essencePerDay','mantraIndex'],
 manuals:['indices'],
 identify:['index','elements','confirmedByNarrator']
};
const stable=v=>JSON.stringify(v,(_key,value)=>plain(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b))):value);
/** Compact stale-editor token; never sends the actor's flags or manual history over the socket. */
export function cultivationDestinySnapshot(actor){
 const f=actor?.flags?.[S]??{},text=stable([f.cultivationDestiny,f.divineManual,f.mantraText,f.manualEssencePerDay]);let h=2166136261;
 for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');
}
function command(method,payload,options={}){
 if(!Object.hasOwn(fields,method)||!plain(payload)||Object.keys(payload).some(k=>!fields[method].includes(k)))throw Error('Comando de herança inválido.');
 if(!Number.isInteger(options.expectedRevision)||options.expectedRevision<0)throw Error('Revisão de destino inválida.');
 if(options.snapshot!==undefined&&(typeof options.snapshot!=='string'||!/^[a-f0-9]{8}$/.test(options.snapshot)))throw Error('Revisão do manual inválida.');
 const primitive=v=>v===null||typeof v==='string'&&v.length<=30000||typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean';
 for(const[k,v]of Object.entries(payload)){
  if(v===undefined)continue;
  if(k==='mantras'){
   if(!Array.isArray(v)||v.length<1||v.length>2||v.some(m=>!plain(m)||Object.keys(m).some(key=>!['name','text','essencePerDay'].includes(key))||Object.values(m).some(x=>!primitive(x))))throw Error('Mantras inválidos.');
  }else if(Array.isArray(v)){if(v.length>13||v.some(x=>!primitive(x)))throw Error('Seleções inválidas.');}
  else if(!primitive(v))throw Error('Argumentos de herança inválidos.');
 }
 const cmd={method,payload,expectedRevision:options.expectedRevision,...(options.snapshot?{snapshot:options.snapshot}:{})},json=JSON.stringify(cmd);
 if(json.length>200000)throw Error('O registro de herança é grande demais.');return{cmd,json};
}
function decode(json){
 let value;try{value=JSON.parse(json);}catch{throw Error('Comando de herança inválido.');}
 if(!plain(value)||Object.keys(value).some(k=>!['method','payload','expectedRevision','snapshot'].includes(k)))throw Error('Comando de herança inválido.');
 return command(value.method,value.payload,value).cmd;
}
function writable(actor){if(actor?.type!=='character'||actor.isOwner!==true||actor.limited)throw Error('Você não tem permissão para alterar esta herança.');}
/** One authenticated elected owner serializes all destination and spiritual-manual writes. */
export function registerCultivationDestinyAuthority(runtime,options={}){
 const shared=registerBeastEssenceAuthority({[ACTION]:async(actor,json,authority={})=>{
  const cmd=decode(json),authorize=()=>{authority.authorize?.();writable(actor);if(destinyState(actor).revision!==cmd.expectedRevision)throw Error('O destino mudou; abra a janela novamente.');};
  authorize();
  if(cmd.method==='select'||cmd.method==='record'){
   const result=await runtime[cmd.method](actor,cmd.payload,{expectedRevision:cmd.expectedRevision,authorize});
   if(result===false)throw Error('Outra alteração desta herança está em andamento. Aguarde e abra a janela novamente.');return{success:true};
  }
  const result=await withElementalActorLock(actor,'cultivation-destiny-authority:'+cmd.method+(cmd.method==='mantra'?':'+Object.keys(cmd.payload).sort().join(','):''),async()=>{
   authorize();if(cmd.snapshot&&cultivationDestinySnapshot(actor)!==cmd.snapshot)throw Error('O manual mudou; abra a janela novamente.');
   const patch=cmd.method==='mantra'?prepareDivineManualMantraEdit(actor,cmd.payload):cmd.method==='identify'?prepareDivineManualIdentification(actor,cmd.payload):cmd.method==='study'?prepareDivineManualStudy(actor,cmd.payload):cmd.method==='mantras'?prepareDivineManualMantras(actor,cmd.payload):prepareDivineManualActivation(actor,cmd.payload.indices);
   authorize();await actor.update(patch,{cultivationDestinyUpdate:true});return true;
  });
  if(result===false)throw Error('Outra alteração deste manual está em andamento. Aguarde e abra a janela novamente.');return{success:true};
 }},options);
 return {dispatch(actor,method,payload,opts={}){try{const {json}=command(method,payload,{...opts,expectedRevision:opts.expectedRevision??destinyState(actor).revision});return shared.dispatch(actor,ACTION,[json]);}catch(error){return Promise.reject(error);}},unregister:()=>shared.unregister()};
}
export async function dispatchCultivationDestiny(actor,method,payload,options={}){
 const {json}=command(method,payload,{...options,expectedRevision:options.expectedRevision??destinyState(actor).revision});
 return dispatchBeastEssenceAction(actor,ACTION,[json]);
}
