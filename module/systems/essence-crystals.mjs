import {ESSENCE_CRYSTALS,ESSENCE_CRYSTAL_TYPE,crystalConsumableDefinition} from "./essence-crystal-data.mjs";
import {dailyEssenceGain, projectEssence} from './cultivation.mjs';
import {getZoneLimit} from '../applications/actor/jj/qi-zone.mjs';
const SCOPE='Immortals-system';
const integer=value=>Number.isFinite(Number(value))?Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(Number(value)))):0;
const itemsOf=actor=>Array.from(actor?.items?.contents??actor?.items?.values?.()??actor?.items??[]);

/** Capacity belongs to this reservoir, independent of Item quantity; zero never refills itself. */
export function essenceCrystalConfiguration(item){
 const definition=crystalConsumableDefinition(item);
 if(item?.type==='consumable'&&item.system?.type?.value===ESSENCE_CRYSTAL_TYPE){
  const capacity=definition?.capacity??0,spent=Math.min(capacity,integer(item.system?.uses?.spent));
  return {enabled:!!definition,capacity,remaining:capacity-spent,spent,storage:'uses',definition,equipped:item.system?.equipped===true,quantity:integer(item.system?.quantity)};
 }
 const stored=item?.flags?.[SCOPE]?.essenceCrystal??{},capacity=integer(stored.capacity);
 return {enabled:item?.type==='equipment'&&stored.enabled===true,capacity,remaining:Math.min(capacity,integer(stored.remaining)),equipped:item?.system?.equipped===true,quantity:integer(item?.system?.quantity)};
}

/** Unlimited placeholders impose no additional finite requirement. */
export function equippedEssenceCrystals(actor,zone){
 const manual=actor.getFlag?.(SCOPE,'manualEssencePerDay')??null,regional=getZoneLimit(zone);
 const limits=[manual,regional].filter(value=>value!==null&&value!==''&&Number.isFinite(Number(value))).map(Number);
 const minimum=limits.length?Math.ceil(Math.max(0,Math.min(...limits))/2):null;
 return itemsOf(actor).map(item=>({item,...essenceCrystalConfiguration(item)})).filter(entry=>entry.enabled&&entry.equipped&&entry.quantity>0)
 .sort((a,b)=>integer(a.item.sort)-integer(b.item.sort)||String(a.item.id??a.item._id).localeCompare(String(b.item.id??b.item._id)))
 .map(entry=>({...entry,minimum,eligible:minimum!==null&&entry.capacity>0&&entry.capacity>=minimum&&entry.remaining>0,
 reason:!entry.capacity?'Defina a capacidade do cristal':!entry.remaining?'Cristal esgotado':minimum===null?'Defina um limite de absorção':entry.capacity<minimum?'Capacidade inferior ao mínimo de '+minimum+' PEQ':''}));
}

/** Pure day-by-day-equivalent plan; several reservoirs supply one x2 bonus, never stacked multipliers. */
export function crystalCultivationProjection(actor,days,zone){
 const c=actor.system?.cultivation??{},manual=actor.getFlag?.(SCOPE,'manualEssencePerDay')??null;
 const basePerDay=dailyEssenceGain(zone,manual,c,actor),start=projectEssence(c,0,basePerDay,actor);
 const crystals=equippedEssenceCrystals(actor,zone),eligible=crystals.filter(entry=>entry.eligible);
 const reservoirs=eligible.map(entry=>({...entry,left:entry.remaining,spent:0}));
 let fuel=reservoirs.reduce((sum,entry)=>sum+entry.left,0),remainingDays=integer(days),gap=Math.max(0,start.goal-start.current),value=start.current,spent=0;
 const boostedPerDay=basePerDay+Math.min(basePerDay,fuel);
 const consume=amount=>{let needed=amount;for(const entry of reservoirs){const use=Math.min(needed,entry.left);entry.left-=use;entry.spent+=use;needed-=use;if(!needed)break;}fuel-=amount;spent+=amount;};
 if(remainingDays&&basePerDay>0&&projectEssence(c,1,basePerDay,actor).gain>0){
  if(!Number.isFinite(basePerDay)){value+=gap;gap=0;}
  while(remainingDays&&gap>0){
   if(!fuel){const gain=Math.min(gap,remainingDays*basePerDay);value+=gain;gap-=gain;break;}
   const full=Math.min(remainingDays,Math.floor(fuel/basePerDay),Math.floor(gap/(2*basePerDay)));
   if(full>0){const bonus=full*basePerDay;consume(bonus);value+=2*bonus;gap-=2*bonus;remainingDays-=full;continue;}
   const regular=Math.min(basePerDay,gap);value+=regular;gap-=regular;
   const extra=Math.min(basePerDay,fuel,gap);if(extra){consume(extra);value+=extra;gap-=extra;}remainingDays--;
  }
 }
 const used=reservoirs.filter(entry=>entry.spent>0);
 return {...start,value,gain:value-start.current,basePerDay,boostedPerDay,crystalBonus:spent,crystalSpent:spent,
  crystals:crystals.map(entry=>({id:entry.item.id??entry.item._id,name:entry.item.name,capacity:entry.capacity,remaining:entry.remaining,minimum:entry.minimum,eligible:entry.eligible,reason:entry.reason})),
  crystalNames:used.map(entry=>entry.item.name).join(', '),
  itemUpdates:used.map(entry=>entry.storage==='uses'?{_id:entry.item.id??entry.item._id,'system.uses.spent':entry.capacity-entry.left}:{_id:entry.item.id??entry.item._id,['flags.'+SCOPE+'.essenceCrystal.remaining']:entry.left})};
}

/** Sixteen stock consumables start full and use native PEQ charges. Legacy equipment stays supported. */
export function essenceCrystalCompendiumDocuments(){
 const folder='iwEssenceCryst01';
 return [{_id:folder,name:'Cristais de Essência',type:'Item',folder:null,sorting:'a'},...ESSENCE_CRYSTALS.map((entry,index)=>({
 _id:'iwCrystal'+String(index+1).padStart(7,'0'),name:entry.name,type:'consumable',folder,img:entry.img,effects:[],
 system:{identifier:'cristal-de-essencia-'+entry.id,type:{value:ESSENCE_CRYSTAL_TYPE,subtype:entry.id},quantity:1,equipped:false,
 uses:{max:String(entry.capacity),spent:0,recovery:[],autoDestroy:false},activities:{},
 description:{value:'<p>Pedra ou gema formada pela exposição prolongada a Qi denso, encontrada em veias espirituais.</p><p><strong>'+entry.rankLabel+' · '+entry.qualityLabel+'</strong> — reserva total de <strong>'+entry.capacity.toLocaleString('pt-BR')+' PEQ</strong>.</p><p>Recite seu mantra segurando este cristal equipado para dobrar a velocidade de cultivo até a reserva se esgotar. Sua capacidade deve atingir metade da absorção efetiva: o menor limite entre o mantra e a região. O calendário desconta somente a Essência extra concedida, permitindo um último dia parcial.</p><p>A reserva não se recupera em descansos. Cristais com saldos diferentes devem ficar em itens separados.</p>',chat:''}},
 flags:{[SCOPE]:{essenceCrystal:{version:2}}}
 }))];
}
