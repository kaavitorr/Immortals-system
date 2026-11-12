/** Thirteen concepts and training costs imported from Wuxia. Darkness grants Void resistance. */
export const CONCEPT_LEVEL_COSTS = {
  1:  { pt: 1,  qi: 15,  cd: 10, dias: 3 },
  2:  { pt: 2,  qi: 30,  cd: 12, dias: 6 },
  3:  { pt: 3,  qi: 45,  cd: 14, dias: 9 },
  4:  { pt: 4,  qi: 60,  cd: 16, dias: 12 },
  5:  { pt: 5,  qi: 90,  cd: 18, dias: 15 },
  6:  { pt: 6,  qi: 100, cd: 20, dias: 18 },
  7:  { pt: 7,  qi: 120, cd: 21, dias: 21 },
  8:  { pt: 8,  qi: 140, cd: 22, dias: 24 },
  9:  { pt: 9,  qi: 160, cd: 23, dias: 27 },
  10: { pt: 10, qi: 210, cd: 24, dias: 30 }
};


/**
 * @typedef {Object} ElementoConceito
 * @property {string} id            Identificador (chave no mapping `conceitos`).
 * @property {string} label         Nome de exibição.
 * @property {"basico"|"intermediario"|"avancado"} raridade
 * @property {string} cor           Cor temática (hex).
 * @property {string} icon          Caminho do ícone.
 * @property {Object<number>} resistencia  Map { tipoDeDano: pontosPorNivel }.
 * @property {{cdAdd?:number, qiAdd?:(lvl:number)=>number, qiMult?:number, diasMult?:number}} adicionais
 *   Multiplicadores/adicionais de custo por raridade. Para Intermediário o padrão
 *   é { cdAdd:2, qiAdd:(l)=>5*l, diasMult:2 }. Avançado é por-elemento.
 */

/** @type {ElementoConceito[]} */
export const CONCEITOS_ELEMENTOS = [
  // ── BÁSICOS ──
  { id: "madeira",  label: "Madeira",   raridade: "basico",   cor: "#4a7c3a", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/madeira.webp",
    resistencia: { acid: 2, poison: 2 } },
  { id: "fogo",     label: "Fogo",      raridade: "basico",   cor: "#e8521f", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/fogo.webp",
    resistencia: { fire: 3 } },
  { id: "terra",    label: "Terra",     raridade: "basico",   cor: "#a0732a", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/terra.webp",
    resistencia: { bludgeoning: 2 } },
  { id: "metal",    label: "Metal",     raridade: "basico",   cor: "#9aa4b0", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/metal.webp",
    resistencia: { slashing: 1, piercing: 1 } },
  { id: "agua",     label: "Água",      raridade: "basico",   cor: "#2e86c1", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/agua.webp",
    resistencia: { bludgeoning: 2 } },

  // ── INTERMEDIÁRIOS ── (+2 CD, +5×Nível Qi, ×2 dias)
  { id: "relampago", label: "Relâmpago", raridade: "intermediario", cor: "#9b59d0", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/relampago.webp",
    resistencia: { lightning: 3 } },
  { id: "vento",     label: "Vento",     raridade: "intermediario", cor: "#85c1e9", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/vento.webp",
    resistencia: { thunder: 3 } },
  { id: "gelo",      label: "Gelo",      raridade: "intermediario", cor: "#5dade2", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/gelo.webp",
    resistencia: { cold: 3 } },
  { id: "ilusao",    label: "Ilusão",    raridade: "intermediario", cor: "#bb8fce", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/ilusao.webp",
    resistencia: { psychic: 3 } },

  // ── AVANÇADOS ── (multiplicadores por-elemento, ver `adicionais`)
  { id: "luz",      label: "Luz",       raridade: "avancado", cor: "#f4d03f", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/luz.webp",
    resistencia: { radiant: 3 },
    adicionais: { cdAdd: 3, qiMult: 2, diasMult: 3 } },
  { id: "escuridao", label: "Escuridão", raridade: "avancado", cor: "#4a3a6a", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/escuridao.webp",
    resistencia: { void: 3 },
    adicionais: { cdAdd: 3, qiMult: 2, diasMult: 3 } },
  { id: "tempo",    label: "Tempo",     raridade: "avancado", cor: "#7d8c98", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/tempo.webp",
    resistencia: { slashing: 2, piercing: 2, bludgeoning: 2 },
    adicionais: { cdAdd: 6, qiMult: 3, diasMult: 3 } },
  { id: "espaco",   label: "Espaço",    raridade: "avancado", cor: "#5d6d7e", icon: "systems/Immortals-system/assets/wuxia/conceitos-pintados-v1/espaco.webp",
    resistencia: { slashing: 2, piercing: 2, bludgeoning: 2 },
    adicionais: { cdAdd: 6, qiMult: 3, diasMult: 3 } },
];

/** Mapa id → elemento, p/ lookup rápido. */
export const CONCEITO_POR_ID = Object.fromEntries(CONCEITOS_ELEMENTOS.map(e => [e.id, e]));

/**
 * Multiplicadores/adicionais de custo por raridade (padrão; entradas avançadas
 * sobrescrevem via campo `adicionais`).
 */
const ADICIONAIS_POR_RARIDADE = {
  basico: {},
  intermediario: { cdAdd: 2, qiAdd: lvl => 5 * lvl, diasMult: 2 },
};

/**
 * Custo final para treinar `elemento` até `nivel` (nivel-alvo, 1–10).
 * Retorna { cd, qi, dias, pt } já com multiplicadores de raridade aplicados.
 * @param {ElementoConceito|string} elemento  Elemento ou seu id.
 * @param {number} nivel                       Nível-alvo (1–10).
 * @returns {{cd:number, qi:number, dias:number, pt:number}|null}
 */
export function custoConceito(elemento, nivel) {
  const el = typeof elemento === "string" ? CONCEITO_POR_ID[elemento] : elemento;
  if ( !el ) return null;
  const base = CONCEPT_LEVEL_COSTS[nivel];
  if ( !base ) return null;

  // Adicionais: os do elemento (avançado) vencem; senão o padrão da raridade.
  const ad = { ...(ADICIONAIS_POR_RARIDADE[el.raridade] ?? {}), ...(el.adicionais ?? {}) };

  const cd = base.cd + (ad.cdAdd ?? 0);

  // Qi: base + qiAdd(lvl) (intermediário) ou base × qiMult (avançado).
  let qi = base.qi;
  if ( typeof ad.qiAdd === "function" ) qi += ad.qiAdd(nivel);
  if ( Number.isFinite(ad.qiMult) ) qi *= ad.qiMult;

  // Tabela aprovada: três dias por nível; raridade multiplica a duração-base.
  const dias = base.dias * (ad.diasMult ?? 1);

  return { cd, qi: Math.round(qi), dias, pt: base.pt };
}

/**
 * Conta quantos elementos o ator já desbloqueou (unlocked: true).
 * @param {object} conceitosData  O mapping system.conceitos do ator.
 * @returns {number}
 */
export function contarDesbloqueados(conceitosData = {}) {
  return Object.values(conceitosData).filter(c => c?.unlocked).length;
}
