import {practiceEvolutionState} from "./practice-evolution-state.mjs";
import {elementalWoodHeartQiMaximum} from './elemental-wood-heart-state.mjs';
import {withElementalDamageTransaction,elementalDamageReceiptUpdates} from './elemental-transactions.mjs';
import {elementalProjectionDamageState} from './elemental-projections.mjs';
import {elementalFireReduction} from './elemental-flames.mjs';
import {elementalConstructProtection} from './elemental-constructs.mjs';
import {elementalAvoidsDamage} from './elemental-reactions.mjs';
import {actorAttributeLimit} from './attribute-limits.mjs';
import {elementalPassiveBonuses,elementalTier} from "./elemental-rules.mjs";
import {soulBenefits,soulSaveBonus,addSoulSpiritDamage,soulRestUpdates,soulDamageBudget,reduceSoulDamageBudget,soulDamageUpdates,soulChannel,avatarMaxLossUpdates,restoreAvatarMaximum,soulDamageMaximum} from "./soul-path.mjs";
import {bodyBenefits,bodyWoundRecovery,bodyAttackAdvantages,stepBodyWeaponDamage} from "./body-path.mjs";
import {essenceState} from "./beast-essence-rules.mjs";
import {cultivationRank, cultivationRankBenefits, rankDamageAdjustment} from "./cultivation-rank-benefits.mjs";
import { isCultivator, cultivatorProgression } from "./cultivator-rules.mjs";
import { INITIAL_ATTRIBUTE_POINTS } from "./legacy2-attribute-budget.mjs";
import { weaponGroupRank, actorWeaponGroupRank, npcAttackProficiencyRank, proficienciaPorDefeitos } from "./legacy2-proficiencies.mjs";
import { extrasAtributosEstado, npcAttributeDistribution, npcNd, npcProfile, npcProficiencyRank } from "./legacy2-npc-profiles.mjs";
import { npcClassification } from "./legacy2-npc-classification.mjs";
import { ESCALA_DANO, linhaEscalaDano, formulaEscalaDano } from "./escala-dano.mjs";
import { alternativeSavesEnabled, alternativeSaveData } from "./legacy2-alternative-saves.mjs";

/**
 * ── RULESET 2.0 ──────────────────────────────────────────────────────────────
 * Camada de regras alternativas ("Jujutsu Legacy 2.0") sobre o mesmo data
 * model do fork. Toda diferença de comportamento é gateada por
 * `Ruleset.isV2()`; com o setting em "1.0" o sistema permanece idêntico à
 * versão clássica.
 *
 * Regras da 2.0:
 *  • Atributos de 1 a 12, sem modificadores — o valor entra direto no d20.
 *  • Escada de proficiência (perícias, salvaguardas, armas):
 *      0 Destreinado (−4) · 1 Treinado (+0) · 2 Proficiente (+1)
 *      3 Especialista (+2) · 4 Mestre (+3)
 *    Sobe-se um degrau por ponto de treino (pool: criação + 1/nível + GM).
 *  • Rolagem = 1d20 + Atributo + degrau ± vantagens (cada vantagem +1,
 *    cada desvantagem −1, até 6 de cada; net entre elas).
 *  • Sem dados de Vida/Energia; Estilo de Combate define vidaBase/energiaBase
 *    e o atributo principal do CR.
 *  • PV = (nível × vidaBase) + (CON × vidaBase) + PV da espécie.
 *  • PA Total = (energiaBase × nível) + treinos intensos de Energia Máxima
 *    (cada um soma energiaBase de novo).
 *  • CR = 10 + floor((atributoPrincipal + AGI + CON) / 3).
 *  • Flanqueamento estilo Crucible: cada grau conta como 1 vantagem.
 */

/** Escada de proficiência da 2.0. Índice = nível do degrau. */
export const RANKS = Object.freeze([
  { level: 0, label: "Destreinado", bonus: -4 },
  { level: 1, label: "Treinado", bonus: 0 },
  { level: 2, label: "Proficiente", bonus: 1 },
  { level: 3, label: "Especialista", bonus: 2 },
  { level: 4, label: "Mestre", bonus: 3 }
]);

/** Máximo de vantagens/desvantagens empilháveis em uma rolagem. */
export const MAX_VANTAGENS = 6;

/** Bônus por vantagem (positivo) e por desvantagem (negativo). */
export const BONUS_POR_VANTAGEM = 1;

export default class Ruleset {
  static elementalAvoidsDamage(actor,message,options){return elementalAvoidsDamage(actor,message,options);}
  static elementalProjectionDamageState(actor,options){return elementalProjectionDamageState(actor,options);}
  static elementalFireReduction(actor,parts,options){return elementalFireReduction(actor,parts,options);}
  static elementalConstructProtection(actor,parts,options){return elementalConstructProtection(actor,parts,options);}
  static elementalDamageTransaction(actor,options,apply,onDuplicate){return withElementalDamageTransaction(actor,options,apply,onDuplicate);}
  static elementalDamageReceiptUpdates(actor,options,result){return elementalDamageReceiptUpdates(actor,options,result);}
  static bodyBenefits(actor) {return bodyBenefits(this.isV2()?actor:null);}
  static elementalBenefits(actor) {return elementalPassiveBonuses(this.isV2()?actor:null);}
  /** Additive elemental movement in metres; Body movement is returned separately by bodyBenefits. */
  static movementBonus(actor) {return this.elementalBenefits(actor).movement;}
  /** Only remaining learned Wind clones contribute, with their printed per-tier budget. */
  static elementalArmorClassBonus(actor) {
    if (!this.isV2()) return 0;
    const tier = elementalTier(actor,"vento","controleVento");
    const clones = actor?.flags?.["Immortals-system"]?.elementalState?.windClones;
    if (!tier || !clones || clones.active === false) return 0;
    const bounded = (value,max=Infinity) => Number.isFinite(Number(value)) ? Math.min(max,Math.max(0,Math.trunc(Number(value)))) : 0;
    const maximum = tier === 1 ? 3 : tier === 2 ? 5 : bounded(actor?.system?.conceitos?.vento?.level,10);
    return Math.min(maximum,bounded(clones.remaining));
  }
  /** Darkness Cloak's numeric benefit belongs only to Stealth, never to a proficiency rank. */
  static elementalSkillBonus(actor,skillId) {
    if (!this.isV2() || skillId !== "ste" || actor?.flags?.["Immortals-system"]?.elementalState?.darknessCloak?.active !== true) return 0;
    return [0,0,5,10][elementalTier(actor,"escuridao","darknessCloak")];
  }

  static attributeLimit(actor,key) {return this.isV2()?actorAttributeLimit(actor,key):20;}
  static soulBenefits(actor) {return soulBenefits(this.isV2()?actor:null);}
  static soulSaveBonus(actor,key,options) {return this.isV2()?soulSaveBonus(actor,key,options):0;}
  static applySoulSpiritDamage(target,parts,options) {return this.isV2()?addSoulSpiritDamage(target,parts,options):0;}
  static soulChannel(actor,options) {return this.isV2()?soulChannel(actor,options):"";}
  static avatarMaxLossUpdates(actor,loss,updates) {return this.isV2()?avatarMaxLossUpdates(actor,loss,updates):{};}
  static restoreAvatarMaximum(actor,type,updates) {return this.isV2()?restoreAvatarMaximum(actor,type,updates):Number(actor.system?.attributes?.hp?.tempmax??0);}
  static soulDamageMaximum(actor,updates) {return soulDamageMaximum(actor,updates);}
  static soulDamageBudget(actor,parts,amount) {return this.isV2()?soulDamageBudget(actor,parts,amount):{normal:amount,soul:0};}
  static reduceSoulDamageBudget(budget,amount) {return reduceSoulDamageBudget(budget,amount);}
  static soulDamageUpdates(actor,amount) {return soulDamageUpdates(actor,amount);}
  static soulRestUpdates(actor,type,updates) {return this.isV2()?soulRestUpdates(actor,type,updates):{};}
  static bodyWoundRecovery(actor,type) {return bodyWoundRecovery(actor,type);}
  static bodyAttackAdvantages(actor) {return this.isV2()?bodyAttackAdvantages(actor):0;}
  static bodyWeaponDamage(actor,damage) {return this.isV2()?stepBodyWeaponDamage(actor,damage):damage;}

  static applyCultivationDamage(target,parts,options) {
    return this.isV2()?rankDamageAdjustment(target,parts,options):{bonus:0,immune:false};
  }


  /* ── Versão ativa ──────────────────────────────────────────────────────── */

  /** Versão das regras configurada no mundo ("1.0" | "2.0"). */
  static get version() {
    return game.settings.get("Immortals-system", "rulesetVersion") ?? "2.0";
  }

  /** O mundo está rodando as regras 2.0? */
  static isV2() {
    return this.version === "2.0";
  }

  /* ── Escada de proficiência ───────────────────────────────────────────── */

  /** Bônus do degrau na rolagem (−4 a +3); clamp em [0, 4]. */
  static rankBonus(rank) {
    return RANKS[Math.min(4, Math.max(0, Math.floor(Number(rank) || 0)))].bonus;
  }

  /** Label do degrau. */
  static rankLabel(rank) {
    return RANKS[Math.min(4, Math.max(0, Math.floor(Number(rank) || 0)))].label;
  }

  /** Parte de fórmula do degrau para o breakdown (null quando não altera). */
  static rankPart(rank) {
    const bonus = this.rankBonus(rank);
    return bonus === 0 ? null : bonus;
  }

  /* ── Pontos de treino ──────────────────────────────────────────────────── */

  /**
   * Pool total de pontos de treino de um ator na 2.0:
   * criação (CONFIG, calibrável) + 1 por nível + concessões do Mestre
   * + a conversão de Defeitos (cada 2 Pontos de Defeito = 1 Ponto).
   */
  static trainingPointsTotal(actor) {
    if (this.isV2() && isCultivator(actor)) return cultivatorProgression(actor).proficiency
      + Number(actor?.system?.legacy2?.pontos?.extra ?? 0) + proficienciaPorDefeitos(actor);
    const stylePoints = this.isV2() ? this.estilo(actor)?.proficiencias : null;
    const creation = stylePoints ? ["armas", "salvaguardas", "pericias"].reduce((sum, key) => sum + (Number.isFinite(Number(stylePoints[key])) ? Math.max(0, Math.floor(Number(stylePoints[key]))) : 0), 0)
      : Number(CONFIG.JUJUTSU?.trainingPoints?.criacao ?? 4);
    const level = Number(actor?.system?.details?.level ?? 1);
    const extra = Number(actor?.system?.legacy2?.pontos?.extra ?? 0);
    const defeitos = proficienciaPorDefeitos(actor);
    return creation + (stylePoints ? Math.max(0, level - 1) : level) + extra + defeitos;
  }

  /** Pontos ainda disponíveis (total − gastos). */
  static trainingPointsAvailable(actor) {
    const alternateRanks = actor?.system?.legacy2?.alternativeSaves;
    const spent = this.isV2() && (alternativeSavesEnabled() || Object.keys(alternateRanks ?? {}).length)
      ? this.trainingPointsSpent(actor) : Number(actor?.system?.legacy2?.pontos?.gastos ?? 0);
    return Math.max(0, this.trainingPointsTotal(actor) - spent);
  }

  /**
   * Soma todos os degraus gastos de um ator (perícias + salvaguardas +
   * armas) — usado para manter `pontos.gastos` coerente.
   */
  static trainingPointsSpent(actor) {
    const l2 = actor?.system?.legacy2;
    if ( !l2 ) return 0;
    const sum = (obj) => Object.values(obj ?? {}).reduce((t, n) => t + (Math.floor(Number(n) || 0)), 0);
    return sum(l2.skills) + sum(alternativeSavesEnabled() ? l2.alternativeSaves : l2.saves) + sum(l2.armas);
  }

  /* ── Vantagens empilháveis ────────────────────────────────────────────── */

  /**
   * Converte contagens brutas de vantagem/desvantagem no modificador líquido
   * da rolagem (+1 por vantagem e −1 por desvantagem, limitado a ±6).
   * @param {number} vantagens   0-6.
   * @param {number} desvantagens 0-6.
   * @returns {number} Modificador líquido inteiro.
   */
  static netAdvantageBonus(vantagens, desvantagens) {
    const net = Math.min(MAX_VANTAGENS, Math.max(0, Math.floor(vantagens)))
              - Math.min(MAX_VANTAGENS, Math.max(0, Math.floor(desvantagens)));
    return net * BONUS_POR_VANTAGEM;
  }

  /** Categorias de ameaça do NPC 2.0 → multiplicador de PV. */
  static get categoriasNpc() {
    return CONFIG.JUJUTSU?.categoriasNpc ?? { lacaio: 0.5, lacain: 0.5, normal: 1, elite: 1.5, chefe: 2 };
  }

  static categoriaMult(actor) {
    return npcClassification(actor).hpMultiplier;
  }

  /** Espírito Amaldiçoado (2.0): a energia que gasta É a própria vida. */
  static isEspirito(actor) {
    return this.isV2() && (npcProfile(actor, "taxonomy")?.vidaEnergia
      ?? (actor?.system?.legacy2?.taxonomia === "espirito"));
  }

  /** O ator compartilha PV e pool de energia (espíritos amaldiçoados)? */
  static vidaEnergia(actor) {
    return this.isEspirito(actor);
  }

  /* ── NPCs estilo Crucible (2.0) ────────────────────────────────────────── */

  /**
   * Todos os NPCs recebem a base inicial de atributos no ND 1 e +1 por ND seguinte —
   * Elite/Chefe somam +2/+3 a cada 4 NDs, independentes do arquétipo.
   */
  static npcAttributeBudget(actor) {
    return INITIAL_ATTRIBUTE_POINTS + npcNd(actor?.system?.legacy2?.nd) - 1
      + extrasAtributosEstado(actor?.system?.legacy2?.categoria, actor?.system?.legacy2?.nd);
  }

  /**
   * Taxonomia distribui os pontos iniciais; Arquétipo define apenas o crescimento.
   */
  static npcAbilityValues(actor) {
    return npcAttributeDistribution(actor)?.values ?? null;
  }

  /** Atributo principal do NPC (maior peso do Arquétipo) para o CR. */
  static npcPrincipal(actor) {
    const arq = npcProfile(actor, "archetype") ?? npcProfile(actor, "taxonomy");
    const pesos = arq?.pesos ?? {};
    let principal = arq?.atributoPrincipal ?? null;
    if ( !principal ) {
      let melhor = -1;
      for ( const [key, peso] of Object.entries(pesos) ) {
        if ( Number(peso || 0) > melhor ) { melhor = Number(peso || 0); principal = key; }
      }
    }
    return principal ?? "str";
  }

  /* ── Ranks por contexto (2.0) ─────────────────────────────────────────── */

  /** Rank 0-4 da perícia (null quando não mapeada). */
  static skillRank(actor, skillId) {
    if (this.isV2() && actor?.type === "npc") return npcProficiencyRank(actor, "skills", skillId);
    return Math.min(4,Number(actor?.system?.legacy2?.skills?.[skillId] ?? 0)+(this.isV2()&&skillId==="ath"?bodyBenefits(actor).athletics:0));
  }

  /** Rank 0-4 da salvaguarda do atributo. */
  static saveRank(actor, abilityId) {
    const alternative = this.alternativeSave(actor, abilityId);
    if ( alternative ) return alternative.rank;
    if (this.isV2() && actor?.type === "npc") return npcProficiencyRank(actor, "saves", abilityId);
    return Number(actor?.system?.legacy2?.saves?.[abilityId] ?? 0);
  }

  static alternativeSave(actor, abilityId) {
    return alternativeSaveData(actor, abilityId, this);
  }

  /** Weapon ranks retain manual categories; NPC attacks also have a cultivation-based minimum. */
  static armaRank(actor, item) {
    if (!item) return 1;
    const npc = this.isV2() && actor?.type === 'npc';
    // Player techniques keep their existing Trained baseline; NPC attack techniques progress too.
    if (item.type !== 'weapon') return npc ? npcAttackProficiencyRank(actor) : 1;
    const override = item.getFlag?.('Immortals-system', 'grupo') || null;
    const category = override ?? item.system?.type?.value ?? item.system?.weaponType;
    return npc ? actorWeaponGroupRank(actor, category) : weaponGroupRank(actor?.system?.legacy2?.armas, category);
  }

  /** A arma tem uma propriedade (Set ou objeto, conforme a versão do dado). */
  static temPropriedade(item, chave) {
    const p = item?.system?.properties;
    if ( !p ) return false;
    return typeof p.has === "function" ? p.has(chave) : !!p[chave];
  }

  /**
   * Pontos de atributo adicionais concedidos pela Origem (flag viva no item
   * race) — somam ao orçamento de atributos na criação e na ficha.
   */
  static atributosAdicionais(actor) {
    return (actor?.itemTypes?.race ?? []).reduce((soma, r) =>
      soma + (Number(r.getFlag?.("Immortals-system", "atributosAdicionais")) || 0), 0);
  }

  /**
   * Bônus de proficiência do ataque com ESTA arma — a propriedade Intuitiva
   * reduz a penalidade de Destreinado de −4 para −2.
   */
  static bonusArma(actor, item) {
    const bonus = this.rankBonus(this.armaRank(actor, item));
    if ( (bonus <= -4) && this.temPropriedade(item, "intu") ) return -2;
    return bonus;
  }

  /** Parte de fórmula do bônus de proficiência da arma (Intuitiva inclusa). */
  static rankPartArma(actor, item) {
    const bonus = this.bonusArma(actor, item);
    return bonus === 0 ? null : bonus;
  }

  /**
   * Parte de fórmula do bônus líquido de vantagens empilháveis (null quando
   * zero). `extra` soma graus extras (ex.: flanqueamento) às vantagens.
   */
  static advantagePart({ vantagens = 0, desvantagens = 0, grausFlanqueamento = 0 } = {}) {
    const bonus = this.netAdvantageBonus(vantagens + grausFlanqueamento, desvantagens);
    return bonus === 0 ? null : bonus;
  }

  /* ── Estatísticas derivadas ───────────────────────────────────────────── */

  /**
   * Nível efetivo do ator na 2.0: jogadores usam details.level, NPCs usam o
   * ND gravado em legacy2.nd (details.level de NPC é derivado de CR).
   */
  static nivel(actor) {
    if (this.isV2() && isCultivator(actor)) return cultivatorProgression(actor).level;
    if (actor?.type === "npc" && this.isV2()) return npcNd(actor.system?.legacy2?.nd);
    const nd = Number(actor?.system?.legacy2?.nd);
    return Number.isFinite(nd) && (nd > 0) ? nd : Number(actor?.system?.details?.level ?? 1);
  }

  /* ── Escala de Dano de NPC (2.0) ───────────────────────────────────────── */

  /** Tabela canônica da Escala de Dano (linhas { nd, dados }). */
  static ESCALA_DANO = ESCALA_DANO;

  /** Linha da Escala de Dano para um ND (ímpar cai no par anterior). */
  static isCultivator(actor) { return isCultivator(actor); }

  static standardDamageDie(actor) { return isCultivator(actor) ? cultivatorProgression(actor).damageDie : 4; }

  static escalaDano(nd) {
    return linhaEscalaDano(nd);
  }

  /**
   * Fórmula de dano da escala: `formulaEscalaDano(nd, { atributo })` — com
   * número ("1d6 + 3") ou placeholder ("1d6 + @mod"). Armas de NPC usam
   * "@escala + @mod" no dano e o rolldata resolve a linha pelo ND.
   */
  static formulaEscalaDano(nd, options) {
    return formulaEscalaDano(nd, options);
  }

  /**
   * Config do Estilo de Combate do ator — lida do item de Classe criado a
   * partir do compendium "Geral - 2.0" (flag Immortals-system.legacy2 no item):
   * { vidaBase, energiaBase, atributoPrincipal, principalEscolhivel }.
   * Null quando o ator não tem Estilo.
   */
  static estilo(actor) {
    const classe = actor?.itemTypes?.class?.find(c =>
      !!c.getFlag("Immortals-system", "legacy2"));
    return classe?.getFlag("Immortals-system", "legacy2") ?? null;
  }

  /** Match the combat-style identifier even when the owned item is renamed. */
  static isRestringido(actor) {
    return !!actor?.itemTypes?.class?.some(item =>
      (item.identifier ?? item.system?.identifier) === "restringido") && this.isV2();
  }

  static staminaMax(actor) {
    const con = Math.max(0, Math.floor(Number(actor?.system?.abilities?.con?.value) || 0));
    return (this.nivel(actor) >= 10 ? 8 : 4) + con;
  }

  static physicalImpulseLimit(actor) {
    return Math.max(0, Math.ceil(this.nivel(actor) / 2));
  }

  /**
   * Iniciativa 2.0 — bônus passivo: ((Agilidade + Intelecto) / 2), arredondado
   * para baixo (a rolagem é 1d20 [Vantagens] + este valor).
   */
  static iniciativa(actor) {
    const agi = Number(actor?.system?.abilities?.dex?.value) || 1;
    const int = Number(actor?.system?.abilities?.int?.value) || 1;
    return Math.floor((agi + int) / 2);
  }

  /** Habilidades de especialização grátis iniciais concedidas pelo Estilo. */
  static especializacoesIniciais(actor) {
    return Number(this.estilo(actor)?.espIniciais ?? 0);
  }

  /**
   * Pontos de Proficiência destinados pelo Estilo na criação:
   * { armas, salvaguardas, pericias } (padrão 0 quando ausente).
   */
  static proficienciasDoEstilo(actor) {
    const p = this.estilo(actor)?.proficiencias ?? {};
    return {
      armas: Number(p.armas ?? 0),
      salvaguardas: Number(p.salvaguardas ?? 0),
      pericias: Number(p.pericias ?? 0)
    };
  }

  /**
   * Atributo principal resolvido: para Estilos com escolha (Restringido:
   * FOR ou AGI) usa system.legacy2.principalEscolhido; para os demais, o
   * valor fixo do Estilo.
   */
  static atributoPrincipal(actor) {
    const estilo = this.estilo(actor);
    if ( !estilo ) return "str";
    if ( Array.isArray(estilo.atributoPrincipal) ) {
      const escolha = actor?.system?.legacy2?.principalEscolhido;
      return estilo.atributoPrincipal.includes(escolha) ? escolha : estilo.atributoPrincipal[0];
    }
    if ( estilo.principalEscolhivel && estilo.atributoPrincipal === "str" ) {
      return actor?.system?.legacy2?.principalEscolhido === "dex" ? "dex" : "str";
    }
    return estilo.atributoPrincipal ?? "str";
  }

  /**
   * Pontos de Vida máximos na 2.0:
   * • NPC: 10 × ND + 15 × CON, reduzido/ampliado pelo estado
   *   (Lacaio ×0.5, Normal ×1, Elite ×1.5, Chefe ×2). Espíritos usam a mesma
   *   base — a energia deles É essa vida (vidaEnergia).
   * • Personagem: (nível × vidaBase) + (CON × vidaBase) + bônus fixos, onde a
   *   Vida Base da Origem (pvEspecie) SOMA à vidaBase do Estilo.
   */
  static maxHitPoints(actor, { ignoreOverride = false } = {}) {
    if (this.isV2() && !ignoreOverride && ["character", "npc"].includes(actor?.type)) {
      // Read the saved maximum, never the calculated value from a previous preparation.
      const source = actor.system?._source?.attributes?.hp ?? actor._source?.system?.attributes?.hp;
      const override = actor.type === "npc" ? (source?.maxOverride ?? actor.system?.attributes?.hp?.maxOverride) : source?.max;
      if (override !== null && override !== undefined && String(override).trim() !== ""
        && Number.isFinite(Number(override)) && Number(override) >= 0) return Math.trunc(Number(override));
    }
    const nd = this.nivel(actor);
    const con = Number(actor?.system?.abilities?.con?.value ?? 1);
    if ( this.isV2() && (actor?.type === "npc") ) {
      const bonus = elementalTier(actor,'madeira','qiDenso') * (nd + con + Math.ceil(nd / 3) - 1);
      return Math.max(1, Math.round(((10 * nd) + (15 * con) + bonus) * this.categoriaMult(actor))+this.soulBenefits(actor).extraHitPoints);
    }
    if (this.isV2() && isCultivator(actor)) {
      const bonus = Number(actor?.system?.legacy2?.pvBonusOrigem ?? 0)
        + (actor?.itemTypes?.race ?? []).reduce((sum,item)=>sum+Number(item.getFlag?.("Immortals-system","pvAdicional")??0),0);
      return Math.max(1,cultivatorProgression(actor).hp+bonus);
    }
    const estilo = this.estilo(actor);
    const pvEspecie = Number(actor?.system?.legacy2?.pvEspecie ?? 0);
    // Vida Base da Origem soma à base do Estilo: cada nível e ponto de
    // Constituição passam a render o valor ajustado (7 + 2 = 9 por nível/CON).
    const vidaBase = Math.max(1, Number(estilo?.vidaBase ?? 4) + pvEspecie);
    const level = nd;
    // Pontos de Vida adicional da Origem (flag na race): bônus fixo — não escala
    // com nível nem Constituição. Fontes: o item de Origem na ficha e o valor
    // carregado no prepare (criação).
    const pvBonus = Number(actor?.system?.legacy2?.pvBonusOrigem ?? 0)
      + (actor?.itemTypes?.race ?? []).reduce((soma, r) =>
        soma + Number(r.getFlag?.("Immortals-system", "pvAdicional") ?? 0), 0);
    const base = ((level + con) * vidaBase) + pvBonus + this.bodyBenefits(actor).extraHitPoints + this.soulBenefits(actor).extraHitPoints;
    return Math.max(1, base);
  }

  /**
   * PA Total (energia máxima) na 2.0:
   * (energiaBase × nível) + (treinos intensos de Energia Máxima × energiaBase)
   * + Energia Adicional da Origem (bônus fixo vivo no item race), onde a
   * Energia Base da Origem (energiaEspecie) SOMA à energiaBase do Estilo.
   * @param {object} [options] Evita recomputar o treino intenso quando o
   *                            chamador já o tem em mãos.
   */
  static maxEnergy(actor, { intenseMax = null } = {}) {
    if (this.isRestringido(actor)) return 0;
    // Espírito Amaldiçoado (2.0): a energia máxima é o próprio PV máximo.
    if ( this.isEspirito(actor) ) return elementalWoodHeartQiMaximum(actor,this.maxHitPoints(actor));
    // NPC 2.0: Energia = 30 × ND, sempre (o Refinamento, 2 × ND, vive no
    // genMax da ficha — npc.mjs).
    if ( this.isV2() && (actor?.type === "npc") ) return elementalWoodHeartQiMaximum(actor,30 * this.nivel(actor)+cultivationRankBenefits(cultivationRank(actor)).extraQi);
    const estilo = this.estilo(actor);
    // Estilo sem energiaBase (Restringido — usa Pontos de Estamina) → 0.
    let energiaBase;
    if ( estilo && ("energiaBase" in estilo) ) energiaBase = Number(estilo.energiaBase ?? 0);
    else energiaBase = Number(npcProfile(actor, "taxonomy")?.energiaBase ?? 10);
    // Energia Colossal (modificador lendário): dobra APENAS o valor descrito no
    // Estilo de Combate (a raiz) — aumentos de origem de poder e peculiaridades
    // NÃO são dobrados (efeito em flags.Immortals-system.energiaColossal).
    if ( estilo && ("energiaBase" in estilo)
      && (Number(actor?.flags?.["Immortals-system"]?.energiaColossal) > 0) ) {
      energiaBase *= 2;
    }
    // Energia Base da Origem soma à base do Estilo (snapshot energiaEspecie).
    energiaBase = Math.max(0, energiaBase + Number(actor?.system?.legacy2?.energiaEspecie ?? 0));
    const level = this.nivel(actor);
    if ( intenseMax === null ) {
      intenseMax = Number(actor?.system?.energy?.intensiveTraining?.maxEnergy ?? 0);
    }
    // Energia Adicional da Origem: bônus fixo no total. O carrier
    // energiaBonusOrigem existe só no preview da criação; atores reais ficam
    // com 0 e usam a flag viva do item.
    const energiaOrigem = Number(actor?.system?.legacy2?.energiaBonusOrigem ?? 0)
      + (actor?.itemTypes?.race ?? []).reduce((soma, r) =>
        soma + Number(r.getFlag?.("Immortals-system", "energiaAdicional") ?? 0), 0);
    if (this.isV2() && isCultivator(actor)) return elementalWoodHeartQiMaximum(actor,cultivatorProgression(actor).qi+practiceEvolutionState(actor).qiBonus+(intenseMax*energiaBase)+energiaOrigem+(Number(essenceState(actor).qiBonus)||0));
    return elementalWoodHeartQiMaximum(actor,(energiaBase * level) + (intenseMax * energiaBase) + energiaOrigem);
  }

  /**
   * Classe de Resistência na 2.0:
   * 10 + floor((atributoPrincipal do estilo + AGI + CON) / 3).
   */
  static resistanceClass(actor) {
    const principal = this.atributoPrincipal(actor);
    const attr = (id) => Number(actor?.system?.abilities?.[id]?.value ?? 1);
    // Regra do Cap. 5: principal Agilidade soma AGI + AGI + CON.
    const agi = attr("dex") + ((principal === "dex") ? attr("dex") : 0);
    const pri = (principal === "dex") ? 0 : attr(principal);
    return 10 + Math.floor((pri + agi + attr("con")) / 3);
  }
}
