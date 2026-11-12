import {elementalQiPayment} from '../../../systems/elemental-vortex.mjs';
import {promptElementalAttackChoices,prepareElementalAttackModifiers} from "../../../systems/elemental-attack-modifiers.mjs";
import {withElementalActorLock} from "../../../systems/elemental-runtime.mjs";
import {createElementalUseContext} from "../../../systems/elemental-execution.mjs";
import {queueElementalMovementRetaliation} from "../../../systems/elemental-electric-retaliation.mjs";
import {elementalDamageSnapshot} from "../../../systems/elemental-damage.mjs";
import {elementalStableId} from "../../../systems/elemental-activity-data.mjs";
import {elementalRiderSnapshot,applyElementalAttackRiders} from "../../../systems/elemental-attack-riders.mjs";
/**
 * ── CARDS NATIVOS ────────────────────────────────────────────────────────────
 * Integra as mecânicas Jujutsu (Escala de Energia, Explosão Ofensiva com
 * Impacto Ecoante, Seis Olhos, Fulgor Negro, Crítico Excedente, Maestria,
 * consumo de PA com pagador de invocação e recurso customizado) ao pipeline
 * nativo de cards do dnd5e 6.0.0, no lugar dos cards customizados.
 *
 * Pontos de amarra:
 *  • `AttackActivity#rollAttack` (documents/activity/attack.mjs) chama
 *    `prepareJJAttackContext` ANTES da rolagem — os diálogos são assíncronos e
 *    não podem viver num hook (Hooks.call não awaita promessas).
 *  • `dnd5e.preRollDamage` injeta os dados extras (síncrono, lê o stash abaixo).
 *  • `dnd5e.rollAttack` detecta Fulgor Negro e Crítico Excedente (dados do
 *    acerto) e acrescenta ao stash antes do dano automático.
 *  • `dnd5e.rollDamage` posta o mini-card do Fulgor Negro (dano ×2,5).
 *  • `dnd5e.preActivityConsumption` tira os alvos `energy.*` do consumo nativo
 *    e os debita manualmente (com a redução do Seis Olhos) preservando o
 *    pagador (invocação → invocador).
 *  • `dnd5e.preUseActivity` valida saldo de PA/recurso customizado e reserva.
 */
import { chooseJJScale, applyScaleChoice, promptJJScale, scaleFormula } from "./jj-scale.mjs";
import { checkFulgorNegro } from "./fulgor-negro.mjs";
import { getMasteryTechniqueBonus } from "./mastery-milestones.mjs";
import { margemExcedente } from "../../../systems/peculiaridades-automacao.mjs";
import { applyDamageToActor } from "./damage-application.mjs";
import aggregateDamageRolls from "../../../dice/aggregate-damage-rolls.mjs";
import { scaleTypedDamage } from "../../../systems/legacy2-resistances.mjs";
import { registrarGatilhoDano } from "../../../systems/condicoes-dano.mjs";
import Ruleset from "../../../systems/ruleset.mjs";
import { activationChoices, energyConsumptionPlan, energyPayer, hasLegacy2Activation } from "../../activity/legacy2-activation.mjs";
import { reducaoCustoSeisOlhos } from "../../../systems/seis-olhos.mjs";

/* ── PAGADOR DE PA (invocação pode pagar pelo invocador) ──────────────────── */

function _paPayer(actor) {
  const flags = actor?.flags ?? {};
  const summon = flags.JujutsuLegacy?.summon ?? flags["Immortals-system"]?.summon;
  if ( !summon?.origin || summon.consumeSummoner !== true ) return actor;
  let doc = null;
  try { doc = fromUuidSync(summon.origin); } catch { doc = null; }
  return doc?.actor ?? doc?.parent ?? actor;
}

// Retorna quanto o Seis Olhos reduz do custo de PA do ator.
// Desvendado = 2; Vendado = 1 (2.0). Sem o item ou modo = 0.
function _seisOlhosReduction(actor) {
  return reducaoCustoSeisOlhos(actor);
}

/* ── EXPLOSÃO OFENSIVA (diálogo de PA) ────────────────────────────────────── */

async function _paDialog(actor, profBonus, denomination) {
  const paDisp = actor.system?.energy?.generated ?? 0;
  // Impacto Ecoante (treinamento geral): amplia o limite de dados da Explosão
  // Ofensiva em +2 por rank (Base +2, Evolução +4, Perfeição +6). NPCs não têm
  // treinamentos — a leitura opcional cobre isso (limite normal).
  const ecoanteRank = actor.system?.trainings?.impactoEcoante?.rank ?? 0;
  const ecoanteBonus = ecoanteRank * 2;
  const maxPA = Math.min(profBonus + ecoanteBonus, paDisp);

  if ( maxPA === 0 ) return 0; // sem PA disponível, não pergunta

  return foundry.applications.api.DialogV2.wait({
    window: { title: "⚡ Explosão Ofensiva" },
    content: `
      <div style="padding: 8px 0;">
        <p style="margin:0 0 8px">Gastar PQ de Qi Refinado para adicionar dados de dano?</p>
        <p style="margin:0 0 4px; font-size:12px; color:#aaa;">
          Qi Refinado disponível (PQ): <strong>${paDisp}</strong> &nbsp;|&nbsp;
          Máximo: <strong>${maxPA}</strong> d${denomination}${ecoanteBonus
            ? ` <span style="color:#c0a0ff">(limite ${profBonus} + ${ecoanteBonus} Impacto Ecoante)</span>`
            : ""}
        </p>
        <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
          <label style="flex:0 0 auto">Dados de PQ:</label>
          <input type="number" id="jj-pa-input"
                 value="0" min="0" max="${maxPA}"
                 style="width:60px; text-align:center;">
          <span style="font-size:12px; color:#aaa;">d${denomination} por dado</span>
        </div>
      </div>`,
    buttons: [
      {
        label:    "Confirmar",
        action:   "ok",
        default:  true,
        callback: (event, button, dialog) => {
          const input = dialog.element?.querySelector("#jj-pa-input") ?? document.querySelector("#jj-pa-input");
          return Math.max(0, Math.min(Number(input?.value ?? 0), maxPA));
        }
      },
      { label: "Sem PQ", action: "skip", callback: () => 0 },
      { label: "Cancelar", action: "cancel", callback: () => null }
    ],
    rejectClose: false,
    close: () => null
  });
}

async function _consumePA(actor, quantidade, reducaoJaAplicada = false) {
  // Se a técnica já teve custo de PA (activity targets), a redução do Seis
  // Olhos já foi aplicada lá — não aplica de novo na Explosão Ofensiva.
  const custo = reducaoJaAplicada ? quantidade : Math.max(0, quantidade - _seisOlhosReduction(actor));
  const payer = _paPayer(actor); // invocação → invocador; senão, o próprio
  const atual = payer.system?.energy?.generated ?? 0;
  if ( atual < custo ) {
    ui.notifications.warn(`${payer.name} não tem PQ de Qi Refinado suficiente! (${atual} disponível, ${custo} necessário)`);
    return false;
  }
  await payer.update({ "system.energy.generated": atual - custo }, { isEnergySystem: true });
  if ( payer !== actor ) ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `🔗 <strong>${actor.name}</strong> (invocação) gastou <strong>${custo} PQ de Qi Refinado</strong> de <strong>${payer.name}</strong>.`
  });
  return true;
}

/* ── CRÍTICO EXCEDENTE (acerto supera a CA em 10+) ─────────────────────────── */

/* ── CONTEXTO PENDENTE DE DANO (ataque → dano) ─────────────────────────────── */

const _pendingDamage = new Map(); // chave estável → contexto

/**
 * Chave estável de uma activity: o pipeline de uso roda sobre um CLONE do item
 * (mixin.use → item.clone com keepId), cujo uuid difere do original que o botão
 * de dano do card resolve depois — ids de item/activity são preservados no clone.
 */
function _stashKey(activity) {
  const item = activity?.item;
  return `${item?.actor?.id ?? "?"}:${item?.id ?? "?"}:${activity?.id ?? "?"}`;
}

function _ensureExtras(activity) {
  const key = _stashKey(activity);
  let ctx = _pendingDamage.get(key);
  if ( !ctx ) {
    ctx = { rolls: [], masteryBonus: 0, fulgorAtivo: false };
    _pendingDamage.set(key, ctx);
  }
  return ctx;
}

/**
 * Kokusen (Fulgor Negro) ativo para o dano desta activity — o ataque tirou 20
 * natural e o Fulgor foi ativado. O dano automático então ROLA O BASE (sem os
 * dados dobrados do crítico) e o mini-card ×2,5 incide sobre esse base.
 * @param {Activity} activity A activity do ataque.
 * @returns {boolean}
 */
export function fulgorAtivoPara(activity) {
  return _pendingDamage.get(_stashKey(activity))?.fulgorAtivo === true;
}

/**
 * Crítico Excedente ativo para o dano desta activity — o acerto superou a CA
 * do alvo na margem sem ser crítico. O dano automático rola como crítico
 * (dados dobrados), igual ao 20 natural sem Black Flash.
 * @param {Activity} activity A activity do ataque.
 * @returns {boolean}
 */
export function excedenteCriticoPara(activity) {
  return _pendingDamage.get(_stashKey(activity))?.excedenteCritico === true;
}

/**
 * Dados extras da técnica (Explosão Ofensiva, Maestria) — guardados para o dano.
 */
function _buildTechniqueExtras(actor, item, { paGastos = 0, physicalImpulse = Ruleset.isRestringido(actor) } = {}) {
  const rolls = [];
  if ( paGastos > 0 ) rolls.push({ parts: [`${paGastos * (physicalImpulse ? 2 : 1)}d`], label: physicalImpulse ? "Impulso Físico (PE)" : "Explosão Ofensiva (PQ)", paDice: true });
  return { rolls, masteryBonus: getMasteryTechniqueBonus(actor, item) };
}

/**
 * Roda os diálogos Jujutsu antes da rolagem de ataque (Escala de Energia →
 * Explosão Ofensiva), consome o PA escolhido e guarda os dados extras que
 * serão injetados na rolagem de dano. Chamado por AttackActivity#rollAttack.
 * @returns {Promise<boolean>} `false` quando o jogador cancelou (não rola).
 */
export async function prepareJJAttackContext(activity) {
  if (Ruleset.isV2()) {
    const choices=await promptElementalAttackChoices(activity.actor??activity.item?.actor,activity);
    if(choices===null)return false;
    activity._elementalAttackChoices=choices;activity._elementalAttackModifiers=prepareElementalAttackModifiers({actor:activity.actor??activity.item?.actor,activity},choices);return true;
  }
  const actor = activity?.item?.actor;
  const item = activity?.item;
  if ( !actor || !item ) return true;

  const damageParts = activity.damage?.parts ?? [];
  const isSpell = item.type === "spell";
  const profBonus = actor.system?.attributes?.prof ?? 2;
  const paDenomination = isSpell ? (damageParts[0]?.denomination ?? 6) : 4;

  // 1º — Escala de Energia: escolhe (não deduz) para permitir cancelar tudo.
  const escolhaEscala = await chooseJJScale({ actor, activity });
  if ( escolhaEscala === null ) return false;

  // 2º — Explosão Ofensiva: PA escolhido e consumido ANTES da rolagem.
  const paGastos = await _paDialog(actor, profBonus, paDenomination);
  if ( paGastos === null ) return false;
  if ( paGastos > 0 ) {
    const tecnicaTemCustoPA = (activity.consumption?.targets ?? []).some(
      t => t.target === "energy.generated" || t.target === "energy.total"
    );
    if ( !(await _consumePA(actor, paGastos, tecnicaTemCustoPA)) ) return false;
  }

  // 3º — Deduz o PA da escala e reserva o bônus para o dano.
  const escala = await applyScaleChoice({ actor, activity, incrementos: escolhaEscala.incrementos });

  const extras = _buildTechniqueExtras(actor, item, { paGastos });
  if ( escala.bonusFormula ) {
    extras.rolls.push({ parts: [escala.bonusFormula], label: "↗ Escala de Energia" });
  }
  // Denominação do dado de PA definida aqui (o preRollDamage injeta a fórmula).
  extras.paDenomination = paDenomination;
  _pendingDamage.set(_stashKey(activity), extras);
  return true;
}

/**
 * Pede a Escala de Energia para técnicas de dano/cura/salvaguarda (deduz na
 * hora) e guarda o contexto para a injeção no dano. Em salvaguardas sem etapa
 * de ataque, pergunta também a Explosão Ofensiva (PA). Chamado pelos wrappers
 * de `rollDamage` das activities (diálogo assíncrono não cabe em hook).
 * @returns {Promise<boolean>} `false` quando o jogador cancelou (não rola).
 */
export async function maybePromptJJScale(activity) {
  if (hasLegacy2Activation(activity)) return true; // Choices are made in activation; damage resolves their saved card snapshot.
  const actor = activity?.item?.actor;
  const item = activity?.item;
  if ( !actor || !item ) return true;
  const hasScale = !!(activity.jjScale?.formula ?? "").trim() || !!activity.jjScale?.enabled;
  const isSave = activity.type === "save";
  // Técnicas de dano/cura sem Escala e sem salvaguarda não abrem diálogo, mas a
  // Maestria 3 (bônus passivo) ainda precisa ser injetada no dano.
  const isDamageOrHeal = (activity.type === "damage") || (activity.type === "heal");
  if ( !hasScale && !isSave && !isDamageOrHeal ) return true;
  if ( _pendingDamage.has(_stashKey(activity)) ) return true; // contexto do ataque pendente

  let escolhaEscala = null;
  if ( hasScale ) {
    escolhaEscala = await chooseJJScale({ actor, activity });
    if ( escolhaEscala === null ) return false; // cancelado
  }

  // Salvaguarda: a Explosão Ofensiva (PA) é perguntada aqui, no dano.
  let paGastos = 0;
  if ( isSave && !Ruleset.isV2() ) {
    const damageParts = activity.damage?.parts ?? [];
    const isSpell = item.type === "spell";
    const paDenomination = isSpell ? (damageParts[0]?.denomination ?? 6) : 4;
    const profBonus = actor.system?.attributes?.prof ?? 2;
    const escolhido = await _paDialog(actor, profBonus, paDenomination);
    if ( escolhido === null ) return false;
    paGastos = escolhido;
    if ( paGastos > 0 ) {
      const tecnicaTemCustoPA = (activity.consumption?.targets ?? []).some(
        t => t.target === "energy.generated" || t.target === "energy.total"
      );
      if ( !(await _consumePA(actor, paGastos, tecnicaTemCustoPA)) ) return false;
    }
  }

  const escala = escolhaEscala
    ? await applyScaleChoice({ actor, activity, incrementos: escolhaEscala.incrementos })
    : { bonusFormula: null };

  const extras = _buildTechniqueExtras(actor, item, { paGastos });
  if ( escala.bonusFormula ) {
    extras.rolls.push({ parts: [escala.bonusFormula], label: "↗ Escala de Energia" });
  }
  const damageParts = activity.damage?.parts ?? [];
  extras.paDenomination = Ruleset.isV2() ? 4 : item.type === "spell" ? (damageParts[0]?.denomination ?? 6) : 4;
  _pendingDamage.set(_stashKey(activity), extras);
  return true;
}

/** Activation has already paid: reserve d4s for its damage without a second PA dialog or debit. */
export function stashLegacy2Activation(activity, choices, { origin } = {}) {
  const actor = activity.item.actor;
  const config = activationChoices(activity, choices);
  const extras = _buildTechniqueExtras(actor, activity.item, { paGastos: config.pa, physicalImpulse: config.physicalImpulse });
  extras.paDenomination = 4;
  const formula = scaleFormula(activity.jjScale?.formula, config.scale ?? 0);
  if (formula) extras.rolls.push({ parts: [formula], label: "Escala de Energia" });
  extras.origin = origin;
  extras.legacy2 = config;
  _pendingDamage.set(_stashKey(activity), extras);
}

/** Read the specific paid activation, including after reload or from another user's client. */
export function legacy2DamageContext(activity, config = {}) {
  const origin = config.jj2Origin;
  const message = origin ? game.messages?.get(origin) : null;
  const snapshot = message?.flags?.["Immortals-system"]?.activation;
  const applied = snapshot?.damageApplied || (origin && Array.from(game.messages?.values?.() ?? [])
    .some(card => card.flags?.["Immortals-system"]?.activationDamage === origin));
  const pending = _pendingDamage.get(_stashKey(activity));
  if (pending && pending.origin === origin && !applied) return pending;
  const choices = snapshot && !applied ? snapshot : {};
  const extras = _buildTechniqueExtras(activity.item.actor, activity.item, { paGastos: choices.pa ?? 0, physicalImpulse: choices.physicalImpulse === true });
  extras.paDenomination = 4;
  const formula = scaleFormula(choices.scaleFormula ?? activity.jjScale?.formula, choices.scale ?? 0);
  if (formula) extras.rolls.push({ parts: [formula], label: "Escala de Energia" });
  return extras;
}

/** Paid dice remain until success. The new damage card records usage; its author need not own the old card. */
export async function finishLegacy2Damage(activity, config = {}) {
  const origin = config.jj2Origin;
  const pending = _pendingDamage.get(_stashKey(activity));
  if (pending?.origin === origin) _pendingDamage.delete(_stashKey(activity));
}

/** Direct attacks pay only after their configuration is accepted, before evaluating the roll. */
export async function commitLegacy2Attack(activity, choices, { prepaid = false } = {}) {
  if (!Ruleset.isV2()) return true;
  const actor=activity.actor??activity.item.actor,payer=prepaid?actor:energyPayer(actor);
  const participants=[...new Set([actor,payer])].sort((a,b)=>String(a.uuid??a.id).localeCompare(String(b.uuid??b.id)));
  const run=async()=>{
    const config=activationChoices(activity,choices);
    const elemental=prepareElementalAttackModifiers({actor,activity},activity._elementalAttackChoices??{});
    if(elemental.automaticHitTargets?.length&&activity._elementalAttackTargets?.some(uuid=>!elemental.automaticHitTargets.includes(uuid)))throw Error('Chasing Lightning só pode atingir a criatura escolhida na ativação.');
    const plan=prepaid?{payer,updates:{}}:energyConsumptionPlan(activity,{consume:false,legacy2:config});
    const payment={...elementalQiPayment(plan.payer,plan.updates),sourceActorUuid:actor.uuid,payerActorUuid:plan.payer.uuid};
    if(plan.payer===actor){const updates={...plan.updates,...elemental.updates};if(Object.keys(updates).length)await actor.update(updates,{isEnergySystem:true});}
    else{if(Object.keys(plan.updates).length)await plan.payer.update(plan.updates,{isEnergySystem:true});if(Object.keys(elemental.updates).length)await actor.update(elemental.updates,{isEnergySystem:true});}
    activity._elementalQiPayment=payment;
    activity._elementalAttackModifiers=elemental;
    if(!prepaid)stashLegacy2Activation(activity,config);
    return true;
  };
  const locked=index=>index===participants.length?run():withElementalActorLock(participants[index],'attack:'+actor.uuid+':'+activity.id,()=>locked(index+1));
  try{return await locked(0);}catch(error){ui.notifications.warn(error.message);return false;}
}

/**
 * Consome o contexto pendente de uma activity (usado no dano).
 * @returns {object|null} O contexto, ou null se não houver.
 */
export function popPendingDamage(activity) {
  if ( !activity ) return null;
  const key = _stashKey(activity);
  const ctx = _pendingDamage.get(key) ?? null;
  _pendingDamage.delete(key);
  return ctx;
}

/* ── FULGOR NEGRO (×2,5) ───────────────────────────────────────────────────── */

// Ator+atividade com Fulgor ativado no ataque — o mini-card ×2,5 é postado no
// rollDamage e o estado sai daqui.
const _fulgorPendentes = new Set(); // stashKey

function _fulgorCardHTML(actor, totalBase, totalMult, damageTypes, damages) {
  const tipos = JSON.stringify(damageTypes ?? []);
  return `
<div class="jj-fulgor-mini" data-amount="${totalMult}" data-damage-types="${foundry.utils.escapeQuotes(tipos)}" ${damages ? `data-damages="${foundry.utils.escapeQuotes(JSON.stringify(damages))}"` : ""}>
  <span class="jj-fulgor-label"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-12h-7z"/></svg> Fulgor Negro ×2,5</span>
  <span class="jj-fulgor-totals">${totalBase} → <strong>${totalMult}</strong></span>
  <button class="jj-fulgor-aplicar" data-action="jj-fulgor-aplicar">Aplicar</button>
</div>`;
}

/**
 * Pós-acerto: Fulgor Negro (dado natural) e Crítico Excedente (acerto ≥ CA do
 * alvo + 10, quando não é crítico) alimentam o stash do dano. Chamado com
 * await pelo wrapper de AttackActivity#rollAttack ENTRE a rolagem de acerto e
 * o dano automático — hook (Hooks.callAll) não awaita promessas, e aqui há
 * rolagem secundária/setFlag no caminho do Fulgor.
 * @param {Activity} activity A activity do ataque.
 * @param {D20Roll[]} rolls   Rolagens de acerto.
 */
const elementalPendingNotices=new Map(),elementalPendingNotified=new Set();
const elementalEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const elementalRiderNames={geada:'Geada',qiAfiado:'Qi Afiado',frioCongelante:'Frio Congelante',punicaoTrovao:'Punição do Trovão',windClones:'Clones de Vento',attackRiders:'Efeitos do ataque'};
const elementalPendingReasons={missingAttackSnapshot:'o ataque antigo não registrou os valores dos efeitos; confira-os antes de concluir',projectionNeedsReview:'confirme o efeito contra a projeção, sem alterar o corpo original',damageNotCommitted:'a aplicação final do dano ainda não foi confirmada; retome o mesmo ataque',permission:'o responsável com permissão precisa concluir este efeito',unknownTarget:'alvo não identificado no ataque',unknownTargets:'alvos não registrados no ataque',unknownOutcome:'resultado de acerto ainda não registrado',unknownEnemy:'relação de inimizade não confirmada',unknownNaturalDie:'resultado original do d20 indisponível',missingDifficulty:'dificuldade da salvaguarda indisponível',missingCondition:'condição indisponível no sistema',missingSavingThrow:'salvaguarda indisponível',saveCancelled:'salvaguarda cancelada',operationFailed:'a operação não foi concluída',previousAttemptUncertain:'o resultado da tentativa anterior precisa ser conferido',missingAttackIdentity:'ataque sem identificação registrada',unknownPrimary:'atributo principal indisponível'};

/** Persist a privacy-preserving, idempotent notice; pending results never grant extra permission. */
export async function showElementalRiderPending(activity,rolls,result){
 if(!result?.pending?.length)return;
 const actor=activity?.item?.actor??activity?.actor,message=rolls?.[0]?.parent;
 const attack=message?.uuid??message?.id;
 if(!attack){ui.notifications.warn('Há efeitos elementais pendentes deste ataque; o narrador precisa conferir os alvos e resultados.');return;}
 let executionContext=null;try{executionContext=createElementalUseContext(activity,{}, {requestId:elementalStableId('elemental-use:'+attack),originEventId:attack,targets:(message.system?.evaluatedTargets??[]).map(row=>row.token??(typeof row.actor==='string'?row.actor:row.actor?.uuid)).filter(Boolean)});}catch{}
 const id=elementalStableId('elemental-pending:'+attack);
 if(elementalPendingNotified.has(id)||game.messages?.get?.(id))return;
 if(elementalPendingNotices.has(id))return elementalPendingNotices.get(id);
 const operation=(async()=>{
  const pending=result.pending.map(entry=>{
   let document;try{document=typeof entry.target==='string'?globalThis.fromUuidSync?.(entry.target,{strict:false}):null;}catch{}
   return {...entry,targetName:document?.actor?.name??document?.name??entry.target??'alvo não identificado'};
  });
  const rows=pending.map(entry=>'<li><strong>'+elementalEscape(elementalRiderNames[entry.rider]??'Efeito elemental')+'</strong> — '+elementalEscape(entry.targetName)+': '+elementalEscape(elementalPendingReasons[entry.reason]??'resolução manual necessária')+'.</li>').join('');
  try{
   await ChatMessage.create({_id:id,type:'generic',speaker:message.speaker??ChatMessage.getSpeaker({actor}),
    whisper:Array.from(message.whisper??[],user=>user.id??user),blind:message.blind===true,
    content:'<p><strong>Efeitos elementais pendentes — '+elementalEscape(actor?.name??'Criatura')+'</strong></p><ul>'+rows+'</ul><p>O narrador ou responsável deve conferir o ataque registrado antes de concluir estes efeitos.</p>'+(executionContext?'<button type="button" data-action="completeElementalRequest">Concluir efeitos · Narrador</button>':''),
    flags:{'Immortals-system':{...(executionContext?{elementalRequest:{version:1,kind:'attackRiders',context:executionContext}}:{}),elementalRiderPendingNotice:{attack,sourceActor:actor?.uuid,activity:activity?.uuid??activity?.id,pending}}}},{keepId:true});
   elementalPendingNotified.add(id);
  }catch(error){
   if(game.messages?.get?.(id))elementalPendingNotified.add(id);
   else ui.notifications.warn('Há efeitos elementais pendentes deste ataque; não foi possível registrar o aviso no chat.');
  }
 })();
 elementalPendingNotices.set(id,operation);
 try{return await operation;}finally{elementalPendingNotices.delete(id);}
}

/** The paid origin fixes the elemental profile; the newly accepted attack fixes its burst purchase. */
export function snapshotElementalAttack(activity,choices={}, {origin}={}){
 const actor=activity?.item?.actor??activity?.actor;
 const original=(origin?game.messages?.get?.(origin)?.flags?.['Immortals-system']?.elementalSnapshot:null)
  ??(activity?._jj2Activation?.prepaid?activity._elementalDamageSnapshot:null);
 return elementalDamageSnapshot(actor,{riders:original?.riders??elementalRiderSnapshot(activity,{criticalMargin:margemExcedente(actor)}),isAttack:true,isTechnique:activity.item?.type==='spell'||activity.attack?.type?.classification==='spell',
  ...(original?.profile?{profile:original.profile}:{}),attackModifiers:activity._elementalAttackModifiers??original?.attackModifiers,burstDice:Number(choices.pa??original?.burstDice??0),burstType:original?.burstType??'slashing'});
}

export async function postJJAttackRoll(activity, rolls) {
  const actor = activity?.item?.actor;
  if ( !actor ) return;
  const roll = rolls?.[0];
  if ( !roll ) return;

  if (Ruleset.isV2()) await queueElementalMovementRetaliation(activity, roll.parent);

  const recordedTargets=Array.from(roll.parent?.system?.evaluatedTargets??roll.parent?.system?.targets??[]).map(row=>{let token;try{token=typeof row.token==='string'?globalThis.fromUuidSync?.(row.token,{strict:false}):null;}catch{}let recordedActor=typeof row.actor==='object'?row.actor:token?.actor;try{recordedActor??=typeof row.actor==='string'?globalThis.fromUuidSync?.(row.actor,{strict:false}):null;}catch{}return{actor:recordedActor,ac:row.ac};});
  const recordedTarget=recordedTargets[0];
  const elementalMeta=activity.flags?.['Immortals-system']?.elementalActivity;
  if(Ruleset.isV2()&&['voidAbsorptionAttack','earthPrisonAttack','lightGrid'].includes(elementalMeta?.rule)&&roll.parent?.uuid){
    await withElementalActorLock(actor,'record-linked:'+roll.parent.uuid,async()=>{
      const origin=roll.parent.getOriginatingMessage?.()??(typeof roll.parent.system?.origin==='object'?roll.parent.system.origin:game.messages?.get?.(String(roll.parent.system?.origin??'').split('.').at(-1)));
      const requestId=origin?.flags?.['Immortals-system']?.elementalUseContext?.requestId;
      const latest=actor.flags?.['Immortals-system']?.elementalState?.receipts?.[activity.id];
      const receipt=requestId?actor.flags?.['Immortals-system']?.elementalUseReceipts?.[requestId]:latest;
      if(!receipt||receipt.source?.itemId!==activity.item.id)return;
      const targets=Array.from(roll.parent.system?.evaluatedTargets??[]);
      const recorded={...receipt,attackMessageUuid:roll.parent.uuid,attackHit:targets.some(t=>t.isMiss===false||t.outcome==='hit'),attackTargets:targets.map(t=>({actor:typeof t.actor==='object'?t.actor.uuid:t.actor,token:t.token,hit:t.isMiss===false||t.outcome==='hit'}))};
      await actor.update({...(!requestId||latest?.requestId===requestId?{['flags.Immortals-system.elementalState.receipts.'+activity.id]:recorded}:{}),...(receipt.requestId?{['flags.Immortals-system.elementalUseReceipts.'+receipt.requestId]:recorded}:{})});
      if(elementalMeta.rule==='lightGrid'&&origin?.flags?.['Immortals-system']?.elementalUseContext){const id=elementalStableId('light-grid-request:'+roll.parent.uuid);if(!game.messages?.get?.(id))await ChatMessage.create({_id:id,type:'generic',speaker:roll.parent.speaker,content:'<p>Light Grid · a grade será registrada no alvo do acerto. O dano ocorre somente ao tocar as grades.</p><button type="button" data-action="completeElementalRequest">Concluir grade · Narrador</button>',flags:{'Immortals-system':{elementalRequest:{version:1,kind:'lightGrid',context:{...origin.flags['Immortals-system'].elementalUseContext,originEventId:roll.parent.uuid}}}}},{keepId:true});}
    });
  }
  const d20Results = roll.dice?.[0]?.results ?? [];
  const d20Ativo = (d20Results.find(r => !r.discarded) ?? d20Results[0])?.result;

  // ── CRÍTICO EXCEDENTE (auto) ────────────────────────────────────────────
  // Com um alvo marcado, se o acerto superar a CA dele na margem (10, ou 8
  // com Rastro da Desgraça) e NÃO for crítico, o dano é rolado como CRÍTICO —
  // mesmo funcionamento do 20 natural sem Black Flash: os dados de dano são
  // dobrados. Síncrono — o stash precisa estar pronto antes do dano automático.
  if ( !roll.isCritical && (!activity._elementalAttackModifiers?.automaticHit||activity._elementalAttackModifiers.criticalOnly)) {
    const alvo = Ruleset.isV2()?recordedTarget:Array.from(game.user.targets ?? [])[0];
    const caAlvo = Number(Ruleset.isV2()?recordedTarget?.ac:alvo?.actor?.system?.attributes?.ac?.value);
    if ( Number.isFinite(caAlvo) && roll.total >= (caAlvo + margemExcedente(actor)) ) {
      _ensureExtras(activity).excedenteCritico = true;
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<span class="jj-pa-badge" style="color:#50b0ff;border-color:#205080;">★ Crítico Excedente! (${roll.total} ≥ CA ${caAlvo}+${margemExcedente(actor)} — dados de dano dobrados)</span>`
      });
    }
  }

  // ── FULGOR NEGRO ────────────────────────────────────────────────────────
  const isFulgor = Ruleset.isV2()?false:await checkFulgorNegro(actor, d20Ativo);
  if ( isFulgor ) {
    _fulgorPendentes.add(_stashKey(activity));
    _ensureExtras(activity).fulgorAtivo = true;
  }

  // ── CONDIÇÕES DE DANO (8.3) ─────────────────────────────────────────────
  // Crítico de 20 natural ou Fulgor Negro dispara a salvaguarda do alvo
  // quando o dano for aplicado (gatilho por atacante+alvo, com TTL).
  if ( (d20Ativo === 20 && (!activity._elementalAttackModifiers?.automaticHit || activity._elementalAttackModifiers.criticalOnly)) || isFulgor ) {
    const alvo = Ruleset.isV2()?recordedTarget:Array.from(game.user.targets ?? [])[0];
    if ( alvo?.actor && alvo.actor !== actor ) {
      registrarGatilhoDano(alvo.actor, {
        tipos: [...new Set((activity.damage?.parts ?? []).flatMap(p => Array.from(p.types ?? [])))],
        atacante: actor, fulgor: isFulgor
      });
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<span class="jj-pa-badge">☠️ ${isFulgor ? "Fulgor Negro" : "Crítico de 20 natural"} — ${alvo.actor.name} deverá passar na Salvaguarda quando o dano for aplicado.</span>`
      });
    }
  }
  const elemental = await applyElementalAttackRiders(activity,rolls,{isCritical:roll.isCritical || excedenteCriticoPara(activity) || isFulgor});
  await showElementalRiderPending(activity,rolls,elemental);
  return elemental;
}

/* ── HOOKS ─────────────────────────────────────────────────────────────────── */

(function _registerNativeCardHooks() {

  // Valida saldo de PA dos alvos energy.* antes do diálogo de uso (com a
  // redução do Seis Olhos) e reserva/consome o recurso customizado (flag
  // resourceCost), cobrindo também ataques e salvaguardas.
  const _pendingResourceDeductions = new Map(); // `${payerId}:${resId}` -> nº reservado
  function _reserveCustomResource(payer, activity) {
    const rc = activity.flags?.["Immortals-system"]?.resourceCost;
    if ( !rc?.id || !(Number(rc.amount) > 0) ) return { ok: true };
    const need = Number(rc.amount);
    const list = payer.getFlag("Immortals-system", "customResources") ?? [];
    const idx  = list.findIndex(r => r.id === rc.id);
    if ( idx < 0 ) {
      ui.notifications.warn(`O recurso configurado em "${activity.name}" não existe mais em ${payer.name} — custo removido.`);
      return { ok: true };
    }
    const key = `${payer.id}:${rc.id}`;
    const pendente = _pendingResourceDeductions.get(key) ?? 0;
    const have = Number(list[idx].current ?? 0) - pendente;
    if ( have < need ) return { ok: false, name: list[idx].name, have, need };
    _pendingResourceDeductions.set(key, pendente + need);
    return { ok: true, key, resId: rc.id, need };
  }
  async function _commitCustomResource(payer, reserva) {
    if ( !reserva?.key ) return; // nada foi reservado (sem custo configurado, ou órfão já tratado)
    {
      const list = payer.getFlag("Immortals-system", "customResources") ?? [];
      const idx  = list.findIndex(r => r.id === reserva.resId);
      if ( idx < 0 ) return;
      const have = Number(list[idx].current ?? 0);
      const updated = list.map((r, i) => i === idx ? { ...r, current: Math.max(0, have - reserva.need) } : r);
      await payer.update({ "flags.Immortals-system.customResources": updated });
    }
    const restante = (_pendingResourceDeductions.get(reserva.key) ?? 0) - reserva.need;
    if ( restante > 0 ) _pendingResourceDeductions.set(reserva.key, restante);
    else _pendingResourceDeductions.delete(reserva.key);
  }

  Hooks.on("dnd5e.preUseActivity", (activity) => {
    const actor = activity?.item?.actor;
    if ( !actor ) return;
    const payer = _paPayer(actor);

    // PA da técnica (alvos energy.*): valida saldo líquido do Seis Olhos.
    for ( const target of Ruleset.isV2() ? [] : activity.consumption?.targets ?? [] ) {
      const isGerada = target.target === "energy.generated";
      const isTotal  = target.target === "energy.total";
      if ( !isGerada && !isTotal ) continue;
      const custo = Math.max(0, Number(target.value ?? 0) - _seisOlhosReduction(actor));
      if ( custo <= 0 ) continue;
      const atual = isGerada ? (payer.system?.energy?.generated ?? 0) : (payer.system?.energy?.total ?? 0);
      const label = isGerada ? "PQ de Qi Refinado" : "PQ de Qi Total";
      if ( atual < custo ) {
        ui.notifications.warn(`${payer.name} não tem ${label} suficiente! (${atual} disponível, ${custo} necessário)`);
        return false;
      }
    }

    // Recurso customizado — reserva/commit cobrindo qualquer atividade.
    if ( activity.flags?.["Immortals-system"]?.resourceCost?.id ) {
      const reserva = _reserveCustomResource(payer, activity);
      if ( reserva.ok === false ) {
        ui.notifications.warn(`${payer.name} não tem ${reserva.name} suficiente! (${reserva.have} disponível, ${reserva.need} necessário)`);
        return false; // bloqueia o uso
      }
      _commitCustomResource(payer, reserva).then(() => {
        if ( payer !== actor && reserva.key ) ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `🔗 <strong>${actor.name}</strong> (invocação) gastou <strong>${reserva.need} ${reserva.name}</strong> de <strong>${payer.name}</strong>.`
        });
      });
    }
  });

  // Tira os alvos energy.* do consumo nativo e os debita manualmente
  // (preserva pagador de invocação, redução do Seis Olhos e a flag
  // isEnergySystem).
  Hooks.on("dnd5e.preActivityConsumption", (activity, usageConfig) => {
    if (Ruleset.isV2()) return; // Native awaited batch includes technique PA and offensive burst together.
    const actor = activity?.item?.actor;
    if ( !actor ) return;
    const targets = activity.consumption?.targets ?? [];
    const ehPA = i => {
      const t = targets[i]?.target;
      return (t === "energy.generated") || (t === "energy.total");
    };
    const consume = usageConfig?.consume;
    if ( !consume ) return;
    if ( Array.isArray(consume.resources) ) {
      if ( !consume.resources.some(ehPA) ) return;
      consume.resources = consume.resources.filter(i => !ehPA(i));
    } else if ( consume.resources === true ) {
      consume.resources = targets.map((_, i) => i).filter(i => !ehPA(i));
    } else return;

    // Débito manual pós-confirmação do diálogo.
    const payer = _paPayer(actor);
    (async () => {
      let gastoTotal = 0;
      let poolLabel = null;
      for ( const target of targets ) {
        const isGerada = target.target === "energy.generated";
        const isTotal  = target.target === "energy.total";
        if ( !isGerada && !isTotal ) continue;
        const custo = Math.max(0, Number(target.value ?? 0) - _seisOlhosReduction(actor));
        if ( custo <= 0 ) continue;
        const campo = isGerada ? "system.energy.generated" : "system.energy.total";
        const atual = isGerada ? (payer.system?.energy?.generated ?? 0) : (payer.system?.energy?.total ?? 0);
        const label = isGerada ? "PQ de Qi Refinado" : "PQ de Qi Total";
        if ( atual < custo ) {
          ui.notifications.warn(`${payer.name} não tem ${label} suficiente! (${atual} disponível, ${custo} necessário)`);
          continue;
        }
        await payer.update({ [campo]: atual - custo }, { isEnergySystem: true });
        gastoTotal += custo;
        poolLabel = (poolLabel === null || poolLabel === label) ? label : "PQ";
      }
      if ( gastoTotal > 0 && payer !== actor ) {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `🔗 <strong>${actor.name}</strong> (invocação) gastou <strong>${gastoTotal} ${poolLabel ?? "PQ"}</strong> de <strong>${payer.name}</strong>.`
        });
      }
    })();
  });



  // Injeta os dados extras do ataque na rolagem de dano (síncrono).
  Hooks.on("dnd5e.preRollDamage", (config) => {
    const activity = config?.subject;
    if ( !activity ) return;
    const extras = Ruleset.isV2() ? legacy2DamageContext(activity, config) : popPendingDamage(activity);
    if ( !extras ) return;

    const rollData = activity.getRollData({ roll: { ability: config.ability, attackMode: config.attackMode } });
    const temDadoBase = (config.rolls ?? []).some(entry =>
      String((entry?.parts ?? []).join(" ")).match(/\d*d\d+/i));

    for ( const extra of extras.rolls ) {
      // Dado de PA: denominação resolvida no contexto do ataque/salvaguarda.
      const parts = extra.paDice
        ? extra.parts.map(p => String(p).replace(/d$/, `d${extras.paDenomination ?? 4}`))
        : extra.parts;
      config.rolls ??= [];
      config.rolls.push({
        data: rollData,
        parts,
        options: { flavor: extra.label, ...(Ruleset.isV2() ? {
          jj2InheritDamageType: true, type: config.rolls[0]?.options?.type
        } : {}) }
      });
    }
    // Maestria 3: modificador principal somado ao dano de técnicas — APENAS
    // quando o dano base é rolagem de dado (não em valores fixos).
    if ( extras.masteryBonus && temDadoBase ) {
      config.rolls.push({
        data: rollData,
        parts: [String(extras.masteryBonus)],
        options: { flavor: "★ Maestria" }
      });
    }
  });

  // Mini-card do Fulgor Negro: total ×2,5 com botão de aplicar.
  Hooks.on("dnd5e.rollDamage", (rolls, data) => {
    const activity = data?.subject;
    if ( !activity ) return;
    const key = _stashKey(activity);
    if ( !_fulgorPendentes.has(key) ) return;
    _fulgorPendentes.delete(key);

    const actor = activity.item?.actor;
    const typed = Ruleset.isV2() ? aggregateDamageRolls(rolls ?? []).map(roll => ({type: roll.options.type, value: Math.max(0, roll.total)})) : null;
    const damages = typed ? scaleTypedDamage(typed, 2.5) : undefined;
    const totalBase = typed ? typed.reduce((sum, damage) => sum + damage.value, 0) : (rolls ?? []).reduce((sum, r) => sum + (r?.total ?? 0), 0);
    const totalMult = damages ? damages.reduce((sum, damage) => sum + damage.value, 0) : Math.ceil(totalBase * 2.5);
    const damageTypes = typed ? [...new Set(typed.map(damage => damage.type).filter(Boolean))] : [...new Set((activity.damage?.parts ?? []).flatMap(p => Array.from(p.types ?? [])))];
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: _fulgorCardHTML(actor, totalBase, totalMult, damageTypes, damages)
    });
  });

  // Botão "Aplicar" do mini-card do Fulgor Negro nos tokens selecionados.
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if ( !root ) return;
    if ( root.querySelector(".jujutsu-card") ) return; // card customizado legado
    root.querySelectorAll("[data-action='jj-fulgor-aplicar']").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const mini = btn.closest(".jj-fulgor-mini");
        if ( !mini ) return;
        const amount = Number(mini.dataset.amount ?? 0);
        let tipos = [];
        try { tipos = JSON.parse(mini.dataset.damageTypes || "[]"); } catch { tipos = []; }
        let damages;
        try { if (mini.dataset.damages) damages = JSON.parse(mini.dataset.damages); } catch { return; }
        const tokens = canvas.tokens?.controlled ?? [];
        if ( !tokens.length ) {
          ui.notifications.warn("Selecione um ou mais tokens no canvas antes de aplicar o dano.");
          return;
        }
        for ( const token of tokens ) {
          if ( token.actor && await applyDamageToActor(token.actor, amount, { damageTypes: tipos, damages, sourceActor: message.getAssociatedActor?.() ?? message.system?.actor, targetTokenUuid: token.document?.uuid??token.uuid, sourceEventUuid: message.uuid, receipt: 'legacy-extra:'+message.uuid+':'+(token.document?.uuid??token.uuid) }) === false ) return;
        }
        const nomes = tokens.map(t => t.name).join(", ");
        ui.notifications.info(`${amount} de dano (Fulgor Negro) aplicado em: ${nomes}`);
        btn.textContent = `✓ ${amount} aplicado`;
        btn.disabled = true;
        btn.style.opacity = "0.6";
      });
    });
  });
})();
