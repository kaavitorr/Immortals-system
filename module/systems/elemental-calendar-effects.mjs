/** Preparation/world-time records never simulate a creature's combat turns. */
const S='Immortals-system';
export function elementalDilationCost(tier,multiplier){
 if(!Number.isInteger(tier)||tier<1||tier>3||!Number.isInteger(multiplier)||multiplier<1||multiplier>[0,3,10,100][tier])throw Error('Fator de dilatação fora do limite.');
 return[0,10,30,100][tier]+(tier===1?0:Math.ceil(Math.max(0,multiplier-[0,3,5,10][tier])/(tier===2?1:5))*10);
}
export function prepareElementalCalendarEffect(kind,tier,choices,context){
 if(!context?.requestId||!Number.isFinite(context.worldTime))throw Error('A preparação exige um uso e horário registrados.');
 if(!Number.isInteger(tier)||tier<1||tier>3)throw Error('Grau elemental inválido.');
 const record={version:1,id:context.requestId,kind,tier,sourceActorUuid:context.sourceActorUuid,createdAt:context.worldTime,lastAdvancedAt:context.worldTime,status:'preparing',readyAt:context.worldTime,expiresAt:null};
 if(kind==='timeDilation'){if(!['quick','slow'].includes(choices.direction))throw Error('Escolha acelerar ou desacelerar.');elementalDilationCost(tier,choices.multiplier);record.status='active';record.direction=choices.direction;record.multiplier=choices.multiplier;record.expiresAt=context.worldTime+600;}
 else if(kind==='timeFreeze'){record.readyAt+=tier===3?60:3600;record.expiresAt=record.readyAt+[0,1,3,30][tier]*86400;record.immuneAtTimeConcept=[0,3,5,7][tier];}
 else if(kind==='spaceRip'){
  record.transitRounds=3;
  if(tier<3)record.readyAt+=tier===1?600:60;
  else{const roll=choices.preparationRoll;if(!Number.isInteger(roll)||roll<1||roll>4)throw Error('A preparação precisa da rolagem real de 1d4 rodadas.');record.preparationRoll=roll;record.readyAt+=roll*6;if(context.combat?.id){record.combatId=context.combat.id;record.readyCombatRound=Number(context.combat.round)+roll;}}
 }else if(kind==='plantGrowth'){record.status='active';record.maturationPerDay=[0,2,10,100][tier];record.maturedDays=0;record.expiresAt=context.worldTime+[0,3,5,10][tier]*86400;}
 else if(kind==='miniaturizeRealm')record.readyAt+=3600;
 else throw Error('Preparação elemental desconhecida.');
 return record;
}
export function elementalPreparationState(record,now,{combatId,round}={}){
 if(record.status==='ended'||record.expiresAt!==null&&now>=record.expiresAt)return{status:'ended',remainingSeconds:0};
 if(record.readyCombatRound&&record.combatId===combatId&&Number.isFinite(round))return round<record.readyCombatRound?{status:'preparing',remainingRounds:record.readyCombatRound-round}:{status:'ready',remainingSeconds:0};
 return{status:now<record.readyAt?'preparing':['plantGrowth','timeDilation'].includes(record.kind)?'active':'ready',remainingSeconds:Math.max(0,record.readyAt-now)};
}
export function advanceElementalEffects(actor,{from,to,eventId,combatId,round}={}){
 const saved=actor.flags?.[S]?.elementalCalendarEffects??{},records=structuredClone(saved),updates={};
 if(!Number.isFinite(to)||!Number.isFinite(from)||to<=from)return{records,updates,qiSpent:0};
 let changed=false;for(const record of Object.values(records)){
  if(record.lastEventId===eventId||record.lastAdvancedAt>=to||record.status==='ended')continue;
  const start=Math.max(from,record.lastAdvancedAt??record.createdAt),end=Math.min(to,record.expiresAt??to);
  if(record.kind==='plantGrowth'&&end>start)record.maturedDays=(Number(record.maturedDays)||0)+(end-start)/86400*record.maturationPerDay;
  record.status=elementalPreparationState(record,to,{combatId,round}).status;if(record.kind==='miniaturizeRealm'&&record.status==='ready'&&actor.flags?.[S]?.elementalLongTerm?.realms?.[record.realmId]){updates['flags.'+S+'.elementalLongTerm.realms.'+record.realmId+'.miniaturized']=true;updates['flags.'+S+'.elementalLongTerm.realms.'+record.realmId+'.miniaturizedAt']=record.readyAt;record.status='ended';}record.lastAdvancedAt=to;record.lastEventId=eventId;changed=true;
 }
 if(changed)updates['flags.'+S+'.elementalCalendarEffects']=records;
 return{records,updates,qiSpent:0};
}
