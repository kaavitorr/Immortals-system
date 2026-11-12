import {practiceEvolutionRestUpdates} from './practice-evolution-state.mjs';
import {elementalVortexRestRecovery} from './elemental-regional-vortex.mjs';
import Ruleset from './ruleset.mjs';
import {elementalConstitutionView,elementalRestDebtUpdates} from './elemental-long-term.mjs';
import {bodyBenefits,bodyWoundRecovery} from './body-path.mjs';
import {restoreAvatarMaximum,soulDamageMaximum,soulRestUpdates} from './soul-path.mjs';
const nonnegative=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
/** Shared read-only plan for the native rest and its dialog. Source statistics are never mutated. */
export function immortalsRestRecovery(actor,config={},pendingUpdates={}){
 const type=config.type??'long',short=type==='short',hp=actor.system?.attributes?.hp??{},energy=actor.system?.energy??{};
 const exhaustion=elementalVortexRestRecovery(actor,{...config,type});
 const updates={...pendingUpdates,...exhaustion.updates,...practiceEvolutionRestUpdates(actor,type)},wounds=bodyWoundRecovery(actor,type);
 if(config.recoverTemp)updates['system.attributes.hp.temp']=0;
 if(config.recoverTempMax)updates['system.attributes.hp.tempmax']=0;
 if(wounds.recovered)updates['system.legacy2.wounds.value']=wounds.remaining;
 updates['system.energy.total']=short?Math.min(nonnegative(energy.max),nonnegative(energy.total)+Math.floor(nonnegative(energy.max)*.1)):nonnegative(energy.max);
 if(!short&&actor.flags?.['Immortals-system']?.elementalBubbleUsed)updates['flags.Immortals-system.elementalBubbleUsed']=false;
 if(!short&&actor.flags?.['Immortals-system']?.elementalVortexAttackers)updates['flags.Immortals-system.elementalVortexAttackers']={};
 if(!short&&bodyBenefits(actor).cure){updates['flags.Immortals-system.bodyCureUses']=0;updates['flags.Immortals-system.-=bodyCureTurn']=null;}
 restoreAvatarMaximum(actor,type,updates);
 const debt=elementalRestDebtUpdates(actor,{type});Object.assign(updates,debt.updates);let recoveredActor=actor;if(debt.recovered){const con=Number(actor.system?.abilities?.con?.value??1),view=elementalConstitutionView(actor,con+debt.recovered),delta=Ruleset.maxHitPoints(view)-Ruleset.maxHitPoints(actor);view.system.attributes={...actor.system.attributes,hp:{...hp,max:nonnegative(hp.max)+delta}};recoveredActor=view;}
 const maximum=soulDamageMaximum(recoveredActor,updates),current=nonnegative(hp.value);
 updates['system.attributes.hp.value']=maximum;
 Object.assign(updates,soulRestUpdates(actor,type,updates));
 return{updates,exhaustion,constitution:{recovered:debt.recovered,remaining:debt.remaining},wounds:{...wounds,percent:Math.round(wounds.rate*100),applicable:actor.type!=='npc'},
  life:{current,maximum,value:maximum,gained:Math.max(0,maximum-current),delta:maximum-current},
  qi:{current:nonnegative(energy.total),maximum:nonnegative(energy.max),value:updates['system.energy.total'],gained:Math.max(0,updates['system.energy.total']-nonnegative(energy.total))}};
}
