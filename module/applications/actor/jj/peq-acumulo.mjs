import {elementalSecondsPerDay,elementalCalendarSubjects} from '../../../systems/elemental-local-time.mjs';
import {withElementalActorLock} from '../../../systems/elemental-runtime.mjs';
import { createPeqController } from "../../../systems/peq.mjs";
import { getZoneLimit, QI_ZONES } from "./qi-zone.mjs";
import CalendarData5e from "../../../data/calendar/calendar-data.mjs";
import PeqAcumuloDialog from "./peq-dialog.mjs";
function zoneInfo(){const zone=game.settings.get("Immortals-system","qiZone")??{};const z=QI_ZONES.find(z=>z.id===(zone.level??"mediano"))??QI_ZONES[3];const limit=getZoneLimit(zone);return {label:z.label,limitLabel:Number.isFinite(limit)?String(limit):"sem limite",mods:[zone.veiaEspiritual?"Veia Espiritual ×10":"",zone.seita?"Seita ×2":""].filter(Boolean).join(" · ")};}
const controller=createPeqController({
  getActors:elementalCalendarSubjects,transact:withElementalActorLock,
  getZone:()=>game.settings.get("Immortals-system","qiZone")??{},
  isActiveGM:()=>!!game.user?.isGM&&game.users.activeGM?.id===game.user.id,
  openDialog:options=>{
    const dialog=new PeqAcumuloDialog({...options,zoneInfo:zoneInfo()});
    dialog.addEventListener("close",options.onClose,{once:true});
    dialog.render(true);return dialog;
  },
  notify:async(actor,entry,days)=>{
    const recipients=game.users.filter(u=>u.isGM||actor.testUserPermission(u,"OWNER")).map(u=>u.id);
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),whisper:recipients,content:'<strong>'+foundry.utils.escapeHTML(actor.name)+'</strong> cultivou por '+days+' dia(s): <strong>+'+entry.projected+' PEQ</strong> ('+entry.newEssence+'/'+entry.essGoal+').'+(entry.crystalSpent?' <span>Do cristal: +'+entry.crystalBonus+' PEQ; reserva consumida: '+entry.crystalSpent+' PEQ.</span>':'')});
  }
});
Hooks.on("updateWorldTime",(worldTime,delta,options={},userId)=>{
  if(delta<=0||!game.user?.isGM||game.users.activeGM?.id!==game.user.id)return;
  if(!options.dnd5e?.deltas)CalendarData5e.onUpdateWorldTime(worldTime,delta,options,userId);
  const days=options.dnd5e?.deltas?.midnights??0;
  controller.onDays(days,{from:worldTime-delta,to:worldTime,days,secondsPerDay:elementalSecondsPerDay()});
});
