import {npcCultivationRank} from './npc-cultivation.mjs';
import {isCultivator, cultivatorProgression} from './cultivator-rules.mjs';

const scope='Immortals-system';
const gestureIds=Object.freeze(['gestos-flecha-e-linha','gestos-cone-e-leque','gestos-raio-e-emanacao']);
const flag=(actor,key)=>actor?.flags?.[scope]?.[key]??actor?.getFlag?.(scope,key);
const present=value=>typeof value==='number'||typeof value==='string'&&value.trim()!=='';
const safeInteger=value=>present(value)&&Number.isSafeInteger(Number(value))&&Number(value)>=0;
const boundedLevel=value=>safeInteger(value)&&Number(value)<=10?Number(value):null;
const nonnegative=value=>safeInteger(value)?Number(value):0;

/** Modern NPC realms derive from their cultivation level; legacy documents retain explicit flags. */
export function qiCultivationRank(actor){
 const derived=npcCultivationRank(actor);if(derived!==null)return derived;
 return boundedLevel(actor?.type==='npc'?flag(actor,'cultivationRank'):actor?.system?.cultivation?.rank);
}

function pathLevel(actor,path){
 return boundedLevel(actor?.type==='npc'?flag(actor,path+'Cultivation'):actor?.system?.cultivation?.[path+'Cultivation']);
}

/** Evaluate authored prerequisite ASTs; prose and unsupported rules never imply permission. */
export function qiTalentRequirement(actor,rule,{has=()=>false,learnedCount=0}={}){
 const type=rule?.type;
 const result=(ok,text,kind=type)=>({ok:Boolean(ok),text:typeof rule?.text==='string'&&rule.text.trim()?rule.text:text,type:kind});
 if(type==='and'||type==='or'){
  if(!Array.isArray(rule.rules)||!rule.rules.length)return result(false,'Requisitos não configurados.');
  const children=rule.rules.map(child=>qiTalentRequirement(actor,child,{has,learnedCount}));
  return result(type==='and'?children.every(child=>child.ok):children.some(child=>child.ok),children.map(child=>'('+child.text+')').join(type==='and'?' e ':' ou '));
 }
 if(type==='node'){
  const id=typeof rule.id==='string'?rule.id.trim():'';
  return result(Boolean(id)&&typeof has==='function'&&has(id),id||'Talento não configurado.');
 }
 if(type==='anyGesture')return result(typeof has==='function'&&gestureIds.some(id=>has(id)),'Um gesto qualquer');
 if(['rank','body','soul','count'].includes(type)){
  const min=rule.min,valid=safeInteger(min)&&Number(min)>=(type==='count'?0:1)&&(type==='count'||Number(min)<=10);
  const current=type==='rank'?qiCultivationRank(actor):type==='count'?(safeInteger(learnedCount)?Number(learnedCount):null):pathLevel(actor,type);
  const label={rank:'Rank de Cultivo',body:'Cultivo do Corpo',soul:'Cultivo da Alma',count:'talentos de Qi'}[type];
  return result(valid&&current!==null&&current>=Number(min),String(min??'?')+' '+label);
 }
 return result(false,'Requisito não reconhecido.','info');
}

const identity=value=>typeof value==='string'?value.trim():String(value?.id??value?.name??'').trim();
const unique=values=>new Set(Array.from(values??[],identity).filter(Boolean));
const nodeAt=(nodes,key)=>nodes instanceof Map?nodes.get(key):nodes?.[key];
const immortal=node=>node?.category==='Imortalidade'||node?.categoria==='Imortalidade';

/**
 * Restricted choices pay first. Free grants and unknown legacy names are preserved;
 * unknown names still consume an ordinary choice instead of disappearing from the budget.
 * total/used/available describe only the ordinary pool; learned excludes free grants.
 */
export function qiTalentBudget(actor,{learned=[],granted=[],nodes=new Map()}={}){
 const gifted=unique(granted),selected=Array.from(unique(learned)).filter(id=>!gifted.has(id));
 const rank=qiCultivationRank(actor),cultivator=isCultivator(actor),known=cultivator&&rank!==null&&rank>=1;
 const base=known?cultivatorProgression(actor).talents:0,extra=nonnegative(actor?.system?.legacy2?.especiaisExtra),total=base+extra;
 const restrictedTotal=known&&rank>=5?2:0;
 const restrictedNodes=selected.filter(id=>immortal(nodeAt(nodes,id))).slice(0,restrictedTotal);
 const used=selected.length-restrictedNodes.length;
 return {base,extra,total,used,available:Math.max(0,total-used),overdrawn:Math.max(0,used-total),
  learned:selected.length,granted:gifted.size,
  restricted:{immortality:{total:restrictedTotal,used:restrictedNodes.length,available:restrictedTotal-restrictedNodes.length,nodes:restrictedNodes}}};
}

/**
 * Prepare one actor update for the book's optional five-PC purchase. The caller serializes
 * application and decides whether this rule replaces the separate ten-PC exchange.
 * Receipts persist per realm even after regression, and do not modify previously earned extras.
 */
export function qiTalentPurchaseUpdate(actor){
 const rank=qiCultivationRank(actor);
 if(!isCultivator(actor)||rank===null||rank<1)throw Error('Compra de talento requer um personagem Cultivador com reino conhecido.');
 const ledger=flag(actor,'qiTalentPurchases')??{};
 if(typeof ledger!=='object'||Array.isArray(ledger))throw Error('Registro de compras de talentos inválido.');
 if(Object.hasOwn(ledger,String(rank)))throw Error('Já foi comprado um Talento de Qi neste reino.');
 const cultivation=actor.system?.cultivation??{},points=cultivation.points,spent=cultivation.spentTrainingPoints??0,extra=actor.system?.legacy2?.especiaisExtra??0;
 if(!safeInteger(points)||!safeInteger(spent)||!safeInteger(extra)||Number(points)<5||Number(spent)>Number.MAX_SAFE_INTEGER-5||Number(extra)>=Number.MAX_SAFE_INTEGER)
  throw Error('Informe saldos inteiros válidos e pelo menos 5 Pontos de Cultivo disponíveis.');
 return {'system.cultivation.points':Number(points)-5,'system.cultivation.spentTrainingPoints':Number(spent)+5,
  'system.legacy2.especiaisExtra':Number(extra)+1,['flags.'+scope+'.qiTalentPurchases.'+rank]:{rank,cost:5}};
}
