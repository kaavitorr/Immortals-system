import {prepareCultivationDestinyContext,cultivationDestinyActions} from './cultivation-destiny-sheet.mjs';
import {destinyState} from '../../../systems/cultivation-destiny.mjs';
import {dispatchCultivationDestiny,cultivationDestinySnapshot} from '../../../systems/cultivation-destiny-authority.mjs';
import {CONCEITOS_ELEMENTOS} from '../../../systems/elemental-concepts-data.mjs';
import {constitutionModifiers} from '../../../systems/constitution-rules.mjs';
import {prepareConstitutionContext,constitutionActions,bindConstitutionSheet} from "./constitution-sheet.mjs";
import {crystalCultivationProjection} from "../../../systems/essence-crystals.mjs";
import {soulPathActions,prepareSoulPathContext,bindSoulPathSheet,ensureSoulPathEffects} from "./soul-path-sheet.mjs";
import {bodyPathActions,prepareBodyPathContext,ensureBodyPathEffects} from "./body-path-sheet.mjs";
import {cultivationRankBenefits} from "../../../systems/cultivation-rank-benefits.mjs";
import {cultivationRankDocuments} from "../../../systems/cultivation-rank-content.mjs";
import {rankBenefitActions} from "./cultivation-rank-sheet.mjs";
import { divineManualState } from "../../../systems/divine-manual.mjs";
import { MANUAL_RANKS, MANUAL_QUALITIES, cultivationManualClassification } from "../../../systems/cultivation-manual.mjs";
import { CULTIVATION_IMAGES } from "./wuxia-sheet.mjs";
import Ruleset from "../../../systems/ruleset.mjs";
import { CULTIVATION_RANKS, STAGES_POR_RANK, PT_POR_ESTAGIO, RUPTURA_CD, rankInfo, essenciaMax, custoRuptura } from "../../../systems/cultivation-data.mjs";
import { BODY_PATH, SOUL_PATH, pathRequirement } from "../../../systems/caminhos-data.mjs";
import { cultivationUpdate, essenceGoal, cultivationDifficulty, cultivationPointUpdates, tribulationWoundsUpdate, cultivationAdvanceState, cultivationBlocked, cultivationTribulationDice } from "../../../systems/cultivation.mjs";
import { getZoneLimit } from "./qi-zone.mjs";
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));
const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function cultivationPoints(actor) {
  if ( Ruleset.isV2() ) return Math.max(0,Math.floor(Number(actor.system.cultivation?.points)||0));
  const c=actor.system.curseResources??{};
  return Math.max(0,(c.trainingPoints??0)+(c.narratorTrainingPoints??0)-(c.lostTrainingPoints??0)-(c.spentTrainingPoints??0));
}
export function prepareCultivationContext(context, options) {
    const c = this.actor.system.cultivation ?? { rank: 1, stage: 1, essence: 0 };
    const rank = clamp(c.rank ?? 1, 1, CULTIVATION_RANKS.length);
    const stage = clamp(c.stage ?? 1, 1, STAGES_POR_RANK);
    const essence = Math.max(0, c.essence ?? 0);
    const pt = cultivationPoints(this.actor);
    const atStageMax = stage >= STAGES_POR_RANK;
    const atRankMax = rank >= CULTIVATION_RANKS.length;
    // No 3º estágio, a meta de Essência passa a ser o custo do PRÓXIMO rank
    // (requisito pra tentar o Rompimento). Antes disso, é o custo do rank atual.
    const essGoal = essenceGoal(c,this.actor);
    const essFull = essence >= essGoal;
    const stageAdvance = cultivationAdvanceState(this.actor, "stage");
    const rankAdvance = cultivationAdvanceState(this.actor, "breakthrough");
    const toxinBlocked = cultivationBlocked(this.actor);
    const btCost = rankAdvance.cost;

    // Pontos de Qi (pra barra da aba — mesmo recurso da sidebar)
    const energy = this.actor.system.energy ?? {};
    const qiVal = energy.total ?? 0;
    const qiMax = energy.max ?? 0;

    // ── Wuxia Legacy: Zona de Qi — cap diário de absorção de Essência ────
    // O ganho diário de Essência = min(limite da zona, absorção do Manual).
    // Zona: fonte única em jj/qi-zone.mjs. Manual: flag manualEssencePerDay.
    const zoneLimit = getZoneLimit();
    const manualAbsorb = this.actor.getFlag("Immortals-system", "manualEssencePerDay") ?? Infinity;
    const crystalProjection=crystalCultivationProjection(this.actor,1);
    const dailyEssenceCap = crystalProjection.boostedPerDay;

    context.constitution = prepareConstitutionContext(this);
    context.cultivation = {
      benefits:cultivationRankBenefits(rank),
      realmDescription:cultivationRankDocuments()[rank-1].system.description.value,
      rank, stage, stageMax: STAGES_POR_RANK,
      level: Ruleset.nivel(this.actor), damageDie:Ruleset.standardDamageDie(this.actor), talents:Ruleset.nivel(this.actor),
      stagePips: Array.from({ length: STAGES_POR_RANK }, (_, i) => ({ n: i + 1, filled: (i + 1) <= stage })),
      name: rankInfo(rank).name,
      essence, essMax: essGoal,
      essGoalIsNext: atStageMax && !atRankMax,
      essencePct: essGoal > 0 ? clamp(Math.round((essence / essGoal) * 100), 0, 100) : 0,
      essFull, pt,
      dailyEssenceCap,
      crystal: {equipped:crystalProjection.crystals.length>0, active:crystalProjection.crystals.some(c=>c.eligible),
        remaining:crystalProjection.crystals.filter(c=>c.eligible).reduce((sum,c)=>sum+c.remaining,0),
        status:crystalProjection.crystals.map(c=>c.name+": "+(c.eligible?c.remaining+" / "+c.capacity+" PEQ":c.reason)).join(" · ")},
      toxinBlocked, toxins: stageAdvance.toxicity.value, toxinStagePC: stageAdvance.toxicity.stagePC, toxinRankPC: rankAdvance.toxicity.rankPC,
      capUnlimited: dailyEssenceCap === Infinity,
      zoneLimit,
      zoneUnlimited: zoneLimit === Infinity,
      manualAbsorb: manualAbsorb === Infinity ? null : manualAbsorb,
      illumination: Math.max(0, c.illumination ?? 0),
      // Iluminação Profunda: 3 PI p/ avançar de Rank automaticamente (sem rolagem).
      // Disponível quando pode romper (3º estágio + essência cheia + tem 3 PI).
      canProfoundIllumination: !toxinBlocked && atStageMax && !atRankMax && essFull && (Math.max(0, c.illumination ?? 0) >= 3),
      qi: { value: qiVal, max: qiMax, pct: qiMax > 0 ? clamp(Math.round((qiVal / qiMax) * 100), 0, 100) : 0 },
      // Avançar estágio (dentro do rank)
      advanceCost: stageAdvance.cost,
      canAdvanceStage: !toxinBlocked && essFull && !atStageMax,
      advanceAfford: pt >= stageAdvance.cost,
      // Romper de Rank (no 3º estágio; exige a Essência do próximo rank acumulada)
      canBreakthrough: !toxinBlocked && atStageMax && !atRankMax && essFull,
      breakthroughCost: btCost,
      breakthroughAfford: pt >= btCost,
      breakthroughCD: rankAdvance.cd,
      canEditNarrative: this.isEditable && this.actor.isOwner && !!game.user?.isGM,
      combatAdvanceEligible: !toxinBlocked && essFull && !atStageMax && pt >= cultivationAdvanceState(this.actor, "combat").cost,
      persistentInjuries: Math.max(0,Number(c.persistentInjuries)||0),
      foundation: Number(c.foundation?.rank)===rank ? c.foundation : {rank,encounters:0,years:0},
      foundationDiscount: RUPTURA_CD-cultivationDifficulty(c),
      tribulationDice: cultivationTribulationDice(this.actor),
      atStageMax, atRankMax,
      nextRankName: atRankMax ? null : rankInfo(rank + 1).name,
      // Escada dos 10 ranks
      ranks: CULTIVATION_RANKS.map(r => ({
        rank: r.rank, name: r.name, essence: r.essence,
        description: cultivationRankDocuments()[r.rank-1].system.description.value,
        state: r.rank < rank ? "past" : (r.rank === rank ? "current" : "future")
      })),
      isEditMode: this.isEditMode,
      image: CULTIVATION_IMAGES.qi
    };

    // Caminhos de Cultivo (Corpo e Alma): 10 níveis cada, com estado por nível.
    const bodyLevel = clamp(c.bodyCultivation ?? 0, 0, 10);
    const soulLevel = clamp(c.soulCultivation ?? 0, 0, 10);
    const buildPath = (data, current, pathKey) => data.map(n => {
      const req = (n.level === current + 1) ? pathRequirement(pathKey, current, this.actor) : null;
      return {
        level: n.level, name: n.name, description: n.description,
        state: n.level <= current ? "completed" : (n.level === current + 1 ? "current" : "locked"),
        isCurrent: n.level === current + 1,
        isMaxed: current >= 10,
        req
      };
    });
    context.bodyPath = buildPath(BODY_PATH, bodyLevel, "body");
    context.soulPath = buildPath(SOUL_PATH, soulLevel, "soul");
    context.bodyLevel = bodyLevel;
    context.soulLevel = soulLevel;
    context.bodyImage = CULTIVATION_IMAGES.body;
    context.soulImage = CULTIVATION_IMAGES.soul;
    // Info do nível atual de cada caminho (pra o herói, igual ao reino de cultivo).
    context.bodyCurrent = bodyLevel > 0 ? BODY_PATH[bodyLevel - 1] : null;
    context.bodyNext = bodyLevel < 10 ? { ...BODY_PATH[bodyLevel], req: pathRequirement("body", bodyLevel, this.actor) } : null;
    context.soulCurrent = soulLevel > 0 ? SOUL_PATH[soulLevel - 1] : null;
    context.soulNext = soulLevel < 10 ? { ...SOUL_PATH[soulLevel], req: pathRequirement("soul", soulLevel, this.actor) } : null;

    // Contadores de pílulas (10 níveis de Alquimia cada).
    const buildPills = (map) => Array.from({ length: 10 }, (_, i) => i).map(i => ({
      level: i + 1, count: map?.[String(i + 1)] ?? map?.[i + 1] ?? 0
    }));
    context.bodyPills = buildPills(c.bodyPills ?? {});
    context.soulPills = buildPills(c.soulPills ?? {});

    context.cultivation.manualLimited = manualAbsorb !== Infinity;
    context.divineManual = divineManualState(this.actor);
    context.manual = {
      ...cultivationManualClassification({
        rank: this.actor.getFlag("Immortals-system", "manualRarity"),
        quality: this.actor.getFlag("Immortals-system", "manualClass") ?? (context.divineManual.active ? "inferior" : undefined)
      }),
      essencePerDay: this.actor.getFlag("Immortals-system", "manualEssencePerDay") ?? "",
      mantra: this.actor.getFlag("Immortals-system", "mantraText") ?? ""
    };
    context.cultivation.editable = this.isEditable;
    context.cultivation.canAdvanceStage &&= pt >= stageAdvance.cost;
    context.cultivation.canBreakthrough &&= pt >= btCost;
    context.cultivation.canProfoundIllumination &&= pt >= btCost;
    for ( const key of ["body", "soul"] ) {
      const level = key === "body" ? bodyLevel : soulLevel;
      context[key + "PendingAttribute"] = Array.from({length: level}, (_, i) => i + 1).find(n => !this.actor.effects?.some(e => e.flags?.["Immortals-system"]?.cultivationAttribute === key + ":" + n));
    }
    // Shared presentation keeps both paths aligned while preserving their own rules and fields.
    context.cultivationPaths = [
      { key: "body", tab: "corpo", label: "Corpo", title: "Caminho do Corpo", article: "do Corpo", pillName: "Pílulas do Sangue Divino", ladderTitle: "Portões do Corpo" },
      { key: "soul", tab: "alma", label: "Alma", title: "Caminho da Alma", article: "da Alma", pillName: "Pílulas da Nutrição da Alma", ladderTitle: "Revoluções da Alma" }
    ].map(path => {
      const level = context[path.key + "Level"];
      return {
        ...path, level, image: context[path.key + "Image"],
        current: context[path.key + "Current"], next: context[path.key + "Next"],
        nodes: context[path.key + "Path"], pills: context[path.key + "Pills"],
        pendingAttribute: context[path.key + "PendingAttribute"],
        markers: Array.from({ length: 10 }, (_, i) => ({ n: i + 1, filled: i < level }))
      };
    });
    prepareBodyPathContext(this,context);
    prepareSoulPathContext(this,context);
    context.cultivationDestiny=prepareCultivationDestinyContext(this);
    return context;
  }

const busy = new Set();
const attributeBusy = new Set();
async function advance(sheet, kind) {
  if (!sheet.isEditable || !sheet.actor.isOwner || busy.has(sheet.actor.uuid)) return;
  if (kind === "combat" && !game.user?.isGM) return;
  const actor = sheet.actor;
  busy.add(actor.uuid);
  try {
    const initial = actor.system.cultivation ?? {};
    const rank = initial.rank ?? 1, stage = initial.stage ?? 1;
    const tribulationDice=cultivationTribulationDice(actor);
    const isPath = kind === "body" || kind === "soul";
    const level = initial[kind + "Cultivation"] ?? 0;
    const req = isPath ? pathRequirement(kind, level, actor) : null;
    const needsRoll = kind === "breakthrough" || (kind === "soul" && level >= 2);
    const label = isPath ? (kind === "body" ? "Caminho do Corpo" : "Caminho da Alma")
      : kind === "stage" ? "Avançar estágio" : kind === "combat" ? "Avanço em combate"
        : kind === "illumination" ? "Iluminação Profunda" : "Rompimento";
    const preview = cultivationUpdate(actor, kind, {points:cultivationPoints(actor), rollTotal:20});
    const cost = preview.cost;
    const content = "<p>" + escape(label) + ": <strong>" + cost + " PC</strong>"
      + (req ? " e " + req.pills + " pílulas de nível " + req.pillLevel + ". Treino: " + req.dias + " dias." : ".") + "</p>"
      + (kind === "stage" ? "<p>O avanço ocorre durante um descanso longo.</p>" : "")
      + (kind === "combat" ? "<p>Avanço autorizado pelo mestre. O custo-base é zero; toxinas podem acrescentar PC. Recupera um terço do Qi máximo, arredondado para cima.</p>" : "")
      + (kind === "illumination" ? "<p>Consome 3 PI e a Essência necessária; avanço garantido.</p>" : "")
      + (kind === "breakthrough" ? "<p>1d20 contra CD " + cultivationAdvanceState(actor,kind).cd
        + ". Cada PI reduz a CD em 3. Falha perde os PC, mantém a Essência e causa Ferimento Persistente.</p>"
        + (tribulationDice ? "<p>Em caso de falha, a tribulação causa <strong>" + tribulationDice + "d10</strong> diretamente em Feridas, sem redução.</p>" : "")
        + '<label>PI a gastar <input type="number" name="piSpent" value="0" min="0" max="' + (initial.illumination ?? 0) + '"></label>' : "")
      + (kind === "soul" && needsRoll ? "<p>1d20 contra CD "+cultivationDifficulty(initial)+". Falha consome os recursos e perde um nível do cultivo normal.</p>"+(tribulationDice?"<p>A falha também causa "+tribulationDice+"d10 diretamente em Feridas.</p>":"") : "");
    const choice = await foundry.applications.api.DialogV2.wait({
      classes:["iw-dialog","iw-cultivation-dialog"], modal:true, window:{title:label}, content,
      buttons:[{label:"Confirmar",action:"confirm",default:true,callback:(_e,_b,dialog)=>({pi:Number(dialog.element.querySelector('[name="piSpent"]')?.value)||0})},
        {label:"Cancelar",action:"cancel",type:"button",callback:()=>false}], rejectClose:false, close:()=>null
    });
    if (!choice || !sheet.isEditable || !actor.isOwner) return;
    const current = actor.system.cultivation ?? {};
    if ((current.rank ?? 1) !== rank || (current.stage ?? 1) !== stage || (isPath && (current[kind + "Cultivation"] ?? 0) !== level))
      throw Error("O cultivo mudou durante a confirmação. Abra o avanço novamente.");
    let roll;
    if (needsRoll) {
      roll = await new Roll("1d20").evaluate();
      await roll.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:label});
    }
    if (!sheet.isEditable || !actor.isOwner) return;
    const result = cultivationUpdate(actor,kind,{points:cultivationPoints(actor),rollTotal:roll?.total,piSpent:Math.max(0,Math.floor(choice.pi || 0))});
    if (Ruleset.isV2()) Object.assign(result.updates,cultivationPointUpdates(actor,result.cost));
    else result.updates["system.curseResources.spentTrainingPoints"] = (actor.system.curseResources?.spentTrainingPoints ?? 0) + result.cost;
    if (result.tribulationDice) {
      const tribulation = await new Roll(result.tribulationDice + "d10").evaluate();
      await tribulation.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:"Tribulação · dano direto em Feridas"});
      Object.assign(result.updates,tribulationWoundsUpdate(actor,tribulation.total));
    }
    if (!sheet.isEditable || !actor.isOwner) return;
    await actor.update(result.updates);
    if (kind === "combat" && result.success) {
      const maximum = Math.max(0,Number(actor.system.energy?.max)||0);
      const value = Math.max(0,Number(actor.system.energy?.total)||0);
      await actor.update({"system.energy.total":Math.min(maximum,value + Math.ceil(maximum / 3))});
    }
    if (kind === "breakthrough" && !result.success) {
      const injury = actor.effects?.find(effect=>effect.flags?.["Immortals-system"]?.cultivationInjury);
      if (!injury) await actor.createEmbeddedDocuments("ActiveEffect", [{
        name:"Ferimento Persistente",img:"icons/svg/blood.svg",disabled:false,
        description:"Sofrido em uma tentativa de romper o reino de cultivo. O tratamento e suas consequências são acompanhados pelo mestre.",
        flags:{"Immortals-system":{cultivationInjury:true}},changes:[]
      }]);
    }
    if (isPath && result.success) {await syncPathEffects.call(sheet);await choosePathAttribute(sheet,kind,level+1);}
    await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:"<strong>" + escape(actor.name) + "</strong>: " + escape(label)
      + " — " + (result.success ? "avanço concluído" : "falha") + " (" + result.cost + " PC"
      + (roll ? " · resultado " + roll.total + " / CD " + result.cd : "") + ")."});
  } catch (error) {ui.notifications.warn(error.message);}
  finally {busy.delete(actor.uuid);}
}

async function recordFoundation(sheet,years=false) {
  if(!sheet.isEditable||!sheet.actor.isOwner||!game.user?.isGM||busy.has(sheet.actor.uuid))return;
  const actor=sheet.actor,c=actor.system.cultivation??{},rank=c.rank??1;
  const foundation=Number(c.foundation?.rank)===rank?{...c.foundation}:{rank,encounters:0,years:0};
  if(!years)return actor.update({"system.cultivation.foundation":{...foundation,encounters:Math.max(0,Number(foundation.encounters)||0)+1}});
  const answer=await foundry.applications.api.DialogV2.wait({classes:["iw-dialog","iw-cultivation-dialog"],modal:true,window:{title:"Reclusão"},
    content:'<p>Cada '+rank+' ano(s) completos reduz a CD em 1 neste reino.</p><label>Anos decorridos <input type="number" name="years" value="'+rank+'" min="0" step="1"></label>',
    buttons:[{action:"save",label:"Registrar",default:true,callback:(_e,_b,d)=>({years:Number(d.element.querySelector('[name="years"]').value)})},{action:"cancel",label:"Cancelar",type:"button",callback:()=>false}],rejectClose:false});
  if(!answer||!sheet.isEditable||!actor.isOwner||!game.user?.isGM)return;
  const now=actor.system.cultivation??{};if((now.rank??1)!==rank)return;
  const previous=Number(now.foundation?.rank)===rank?now.foundation:{rank,encounters:0,years:0};
  return actor.update({"system.cultivation.foundation":{...previous,years:Math.max(0,Number(previous.years)||0)+Math.max(0,Math.floor(answer.years)||0)}});
}

async function studyManual(sheet) {
  if(!sheet.isEditable||!sheet.actor.isOwner||sheet.actor.limited||busy.has(sheet.actor.uuid))return;
  const actor=sheet.actor,state=divineManualState(actor),destiny=destinyState(actor),manualSnapshot=cultivationDestinySnapshot(actor);if(!state.active)return;
  busy.add(actor.uuid);
  try {
    const options=list=>list.map(option=>'<option value="'+option.value+'">'+escape(option.label)+'</option>').join('');
    const opportunity=state.unlimited?'Assimilações ilimitadas':state.remaining+' de 3 oportunidades restantes';
    const elementOptions=[{value:'',label:'Não informado'},{value:'neutro',label:'Neutro'},...CONCEITOS_ELEMENTOS.map(e=>({value:e.id,label:e.label}))];
    const replacement=state.unlimited&&state.activeAssimilations.length===2?'<label class="iw-manual-study-wide">Manual ativo a substituir<select name="manual-replace">'+state.activeAssimilations.map(m=>'<option value="'+m.index+'">'+escape(m.name)+'</option>').join('')+'</select></label>':'';
    const content='<div class="iw-manual-study-editor"><label class="iw-manual-study-wide">Manual estudado<input type="text" name="manual-name" required></label><label>Rank<select name="manual-rank">'+options(MANUAL_RANKS)+'</select></label><label>Qualidade<select name="manual-quality">'+options(MANUAL_QUALITIES)+'</select></label><label class="iw-manual-study-wide">Elemento do manual<select name="manual-element">'+options(elementOptions)+'</select></label><label class="iw-manual-study-wide">Características e observações<textarea name="manual-properties" rows="4"></textarea></label>'+replacement+'<label class="iw-manual-study-wide"><input type="checkbox" name="manual-assimilate" '+(state.unlimited||state.remaining?'':'disabled')+'> Assimilar propriedades ('+opportunity+')</label><p class="iw-manual-study-wide">Ler sem assimilar eleva apenas a classificação. '+(state.unlimited?'Você pode manter até dois conjuntos de propriedades ativos.':'Uma assimilação substitui as propriedades ativas e preserva o histórico.')+'</p>'+(destiny.key==='divine-lineage'?'<p class="iw-manual-study-wide">Sua Linhagem Divina exige um manual de elemento compatível com sua afinidade.</p>':'')+'</div>';
    const answer=await foundry.applications.api.DialogV2.wait({classes:['iw-dialog','iw-cultivation-dialog','iw-manual-study-dialog'],modal:true,position:{width:620},window:{title:'Estudar Manual de Cultivo'},content,
      buttons:[{action:'study',label:'Estudar',default:true,callback:(_e,_b,d)=>{const el=d.element,value=name=>el.querySelector('[name="'+name+'"]')?.value;return{name:value('manual-name'),rank:value('manual-rank'),quality:value('manual-quality'),properties:value('manual-properties'),elements:value('manual-element')?[value('manual-element')]:[],replaceIndex:value('manual-replace')===undefined?undefined:Number(value('manual-replace')),assimilate:el.querySelector('[name="manual-assimilate"]').checked};}},{action:'cancel',label:'Cancelar',type:'button',callback:()=>false}],rejectClose:false});
    if(answer&&sheet.isEditable&&actor.isOwner&&!actor.limited){
      if(destinyState(actor).revision!==destiny.revision)throw Error('O destino mudou enquanto o manual era estudado. Abra o estudo novamente.');
      await dispatchCultivationDestiny(actor,'study',answer,{expectedRevision:destiny.revision,snapshot:manualSnapshot});
    }
  }catch(error){ui.notifications.warn(error.message);}finally{busy.delete(actor.uuid);}
}
export const cultivationActions = {
  ...cultivationDestinyActions,
  ...constitutionActions,
  ...rankBenefitActions,
  ...bodyPathActions,
  ...soulPathActions,
  cultivationAdvanceCombat: function(){return advance(this,"combat");},
  cultivationRecordEncounter: function(){return recordFoundation(this);},
  cultivationRecordReclusion: function(){return recordFoundation(this,true);},
  cultivationStudyManual: function(){return studyManual(this);},
  cultivationAdvanceStage: function(){return advance(this,"stage");},
  cultivationBreakthrough: function(){return advance(this,"breakthrough");},
  cultivationProfoundIllumination: function(){return advance(this,"illumination");},
  cultivationAdvancePath: function(_event,target){if(["body","soul"].includes(target.dataset.path))return advance(this,target.dataset.path);},
  cultivationChooseAttribute: function(_event,target){return choosePathAttribute(this,target.dataset.path,Number(target.dataset.level));}
};
export function bindCultivationSheet(sheet) {
  bindConstitutionSheet(sheet);
  bindSoulPathSheet(sheet);
  const tab=sheet.element.querySelector(".cultivation-tab");
  if(!tab)return;
  if(!sheet.isEditable)for(const el of tab.querySelectorAll("input,select,textarea,button:not(.cult-subtab-btn)"))el.disabled=true;
  const show = key => {
    const buttons = [...tab.querySelectorAll(".cult-subtab-btn")];
    key = buttons.some(b => b.dataset.subtab === key) ? key : "cultivo";
    sheet._cultSubtab = key;
    for ( const button of buttons ) {
      const active = button.dataset.subtab === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for ( const panel of tab.querySelectorAll(".cult-subtab") ) {
      const active = panel.dataset.subtabContent === key;
      panel.classList.toggle("active", active);
      panel.setAttribute("aria-hidden", String(!active));
    }
  };
  // Keep editing sections open when the actor rerenders after a field changes.
  sheet._cultOpenSections ??= new Set();
  for ( const section of tab.querySelectorAll("details[data-cult-section]") ) {
    if ( section.dataset.bound ) continue;
    section.dataset.bound = "1";
    section.open = sheet._cultOpenSections.has(section.dataset.cultSection);
    section.addEventListener("toggle", () => {
      const key = section.dataset.cultSection;
      if ( section.open ) sheet._cultOpenSections.add(key);
      else sheet._cultOpenSections.delete(key);
    });
  }
  show(sheet._cultSubtab??"cultivo");
  for(const b of tab.querySelectorAll(".cult-subtab-btn")){if(b.dataset.bound)continue;b.dataset.bound="1";b.addEventListener("click",()=>show(b.dataset.subtab));}
  const pointInput=tab.querySelector("[data-cult-points]");
  if(pointInput&&!pointInput.dataset.bound){pointInput.dataset.bound="1";pointInput.disabled=!sheet.isEditable||!sheet.actor.isOwner||!game.user?.isGM;pointInput.addEventListener("change",event=>{event.stopPropagation();if(sheet.isEditable&&sheet.actor.isOwner&&game.user?.isGM)return sheet.actor.update({"system.cultivation.points":Math.max(0,Math.floor(Number(pointInput.value)||0))});});}
  const fields={"manual-rarity":"manualRarity","manual-class":"manualClass","manual-essence":"manualEssencePerDay","manual-mantra":"mantraText"};
  for(const [attr,key] of Object.entries(fields))for(const el of tab.querySelectorAll("[data-"+attr+"]")){
    if(el.dataset.bound)continue;el.dataset.bound="1";const mantraIndex=divineManualState(sheet.actor).activeMantraSlot;el.addEventListener("change",async()=>{if(!sheet.isEditable||!sheet.actor.isOwner||sheet.actor.limited)return;
      const options = key === "manualRarity" ? MANUAL_RANKS : key === "manualClass" ? MANUAL_QUALITIES : null;
      if ( options && !options.some(option => option.value === el.value) && el.value !== sheet.actor.getFlag("Immortals-system", key) ) return;
      try {
        if(["manualEssencePerDay","mantraText"].includes(key)&&divineManualState(sheet.actor).active){
          const payload=key==="mantraText"?{text:el.value,mantraIndex}:{essencePerDay:el.value.trim()===""?null:el.value,mantraIndex};
          await dispatchCultivationDestiny(sheet.actor,'mantra',payload,{expectedRevision:destinyState(sheet.actor).revision});
        }else if(key==="manualEssencePerDay"&&el.value.trim()==="")await sheet.actor.unsetFlag("Immortals-system",key);
        else await sheet.actor.setFlag("Immortals-system",key,key==="manualEssencePerDay"?Math.max(0,Math.floor(Number(el.value)||0)):el.value);
      }catch(error){globalThis.ui?.notifications?.warn?.(error.message);}
    });
  }
  const qi=tab.querySelector("[data-cult-qi]");if(qi&&!qi.dataset.bound){qi.dataset.bound="1";qi.addEventListener("change",()=>{if(sheet.isEditable&&sheet.actor.isOwner)return sheet.actor.update({"system.energy.total":Math.max(0,Math.floor(Number(qi.value)||0))});});}
}
async function choosePathAttribute(sheet,key,level) {
  const isLimit=key==="body-limit",isSoulExtra=key==="soul-insight",path=isLimit?"body":isSoulExtra?"soul":key;
  if(!sheet.isEditable||!sheet.actor.isOwner||!["body","soul"].includes(path)||!Number.isInteger(level)||level<1||level>(sheet.actor.system.cultivation?.[path+"Cultivation"]??0)||(isLimit&&level!==4)||(isSoulExtra&&(![1,2].includes(level)||(sheet.actor.system.cultivation?.soulCultivation??0)<9)))return;
  const actor=sheet.actor,tag=isLimit?"body:limit":isSoulExtra?"soul:insight:"+level:key+":"+level;
  if(actor.effects.some(e=>e.flags?.["Immortals-system"]?.cultivationAttribute===tag))return;
  const lock=actor.uuid+":"+tag;if(attributeBusy.has(lock))return;attributeBusy.add(lock);
  try{
    const choices=isLimit?{str:"Força",dex:"Agilidade"}:path==="body"?{str:"Força",dex:"Agilidade",con:"Constituição"}:{int:"Intelecto",wis:"Sabedoria",cha:"Presença"};
    const title=isSoulExtra?"Oitava Revolução · atributo "+level+" de 2":isLimit?"Portão do Limite · atributo adicional":"Atributo do "+(path==="body"?"Corpo":"Alma")+" · nível "+level;
    const selected=await foundry.applications.api.DialogV2.wait({classes:["iw-dialog","iw-cultivation-dialog"],modal:true,window:{title},
      content:"<p>Escolha um atributo para receber +1. Você pode deixar a escolha para depois, na aba Cultivo.</p>",
      buttons:[...Object.entries(choices).map(([action,label])=>({action,label,disabled:Number(actor.system.abilities?.[action]?.value??0)>=Ruleset.attributeLimit(actor,action),callback:()=>action})),{action:"later",label:"Depois",callback:()=>null}],rejectClose:false,close:()=>null});
    if(!selected||!choices[selected]||!sheet.isEditable||!actor.isOwner||level>(actor.system.cultivation?.[path+"Cultivation"]??0)||(isSoulExtra&&(actor.system.cultivation?.soulCultivation??0)<9))return;
    if(actor.effects.some(e=>e.flags?.["Immortals-system"]?.cultivationAttribute===tag))return;
    if(Number(actor.system.abilities?.[selected]?.value??0)>=Ruleset.attributeLimit(actor,selected)){ui.notifications.warn("Este atributo já está no limite.");return;}
    await actor.createEmbeddedDocuments("ActiveEffect",[{name:(isSoulExtra?"Oitava Revolução "+level:isLimit?"Portão do Limite":path==="body"?"Corpo "+level:"Alma "+level)+": "+choices[selected],img:"icons/svg/upgrade.svg",origin:actor.uuid,
      flags:{"Immortals-system":{cultivationAttribute:tag}},changes:[{key:"system.abilities."+selected+".value",mode:2,value:"1"}]}]);
  }finally{attributeBusy.delete(lock);}
}

async function syncBodyEffects() {return ensureBodyPathEffects(this.actor);}

async function syncSoulEffects(soulLevel) {
    if(Ruleset.isV2())return ensureSoulPathEffects(this.actor);
    const ICON_REV2 = "systems/Immortals-system/icons/svg/conceitos/ilusao.svg";
    const ICON_REV3 = "systems/Immortals-system/icons/svg/damage/psychic.svg";

    const EFFECTS = [
      // Segunda Revolução (nv.3): +1 Intelecto e +1 Sabedoria.
      { flagId: "soulRev2", minLevel: 3, name: "Segunda Revolução da Alma", icon: ICON_REV2,
        changes: [
          { key: "system.abilities.int.value", mode: 2, value: "1" },   // +1 Intelecto
          { key: "system.abilities.wis.value", mode: 2, value: "1" }    // +1 Sabedoria
        ]
      },
      // Terceira Revolução (nv.4): Resistência 10 Psíquico/Alma + Salvaguardas ESP/SAB/PRE.
      { flagId: "soulRev3", minLevel: 4, name: "Terceira Revolução da Alma", icon: ICON_REV3,
        changes: [
          { key: Ruleset.isV2() ? "system.legacy2.resistances.psychic.value" : "system.traits.dm.amount.psychic", mode: 2, value: Ruleset.isV2() ? "10" : "-10" },  // Resistência 10 Psíquico
          { key: Ruleset.isV2() ? "system.legacy2.resistances.soul.value" : "system.traits.dm.amount.soul", mode: 2, value: Ruleset.isV2() ? "10" : "-10" },     // Resistência 10 Alma
          { key: "system.abilities.int.bonuses.save", mode: 2, value: "2" },  // +2 Salv. Intelecto
          { key: "system.abilities.wis.bonuses.save", mode: 2, value: "2" },  // +2 Salv. Sabedoria
          { key: "system.abilities.cha.bonuses.save", mode: 2, value: "2" }   // +2 Salv. Presença
        ]
      }
    ];

    for ( const def of EFFECTS ) {
      const existing = this.actor.effects.find(e => e.flags?.["Immortals-system"]?.soulEffect === def.flagId);
      const shouldHave = soulLevel >= def.minLevel;
      if ( shouldHave && !existing ) {
        await ActiveEffect.create({
          name: def.name,
          img: def.icon,
          origin: this.actor.uuid,
          disabled: false,
          flags: { "Immortals-system": { soulEffect: def.flagId } },
          changes: def.changes
        }, { parent: this.actor });
      } else if ( shouldHave && existing ) {
        await existing.update({ changes: def.changes, name: def.name });
      } else if ( !shouldHave && existing ) {
        await existing.delete();
      }
    }
  }

async function syncPathEffects() { await syncBodyEffects.call(this,this.actor.system.cultivation?.bodyCultivation??0);await syncSoulEffects.call(this,this.actor.system.cultivation?.soulCultivation??0); }
