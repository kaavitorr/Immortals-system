/** Canonical realm ladder shared by player cultivation and NPC levels. */
/** Os 10 Ranks de Cultivo. `essence` = Essência de Qi por estágio naquele rank. */
export const CULTIVATION_RANKS = [
  { rank: 1,  key: "condensacao",   name: "Condensação de Qi",    essence: 250 },
  { rank: 2,  key: "nucleo",        name: "Formação de Núcleo",   essence: 500 },
  { rank: 3,  key: "rotativo",      name: "Núcleo Rotativo",      essence: 2_500 },
  { rank: 4,  key: "marDivino",     name: "Mar Divino",           essence: 5_000 },
  { rank: 5,  key: "transformacao", name: "Transformação Divina", essence: 25_000 },
  { rank: 6,  key: "lordeDivino",   name: "Lorde Divino",         essence: 125_000 },
  { rank: 7,  key: "lordeSagrado",  name: "Lorde Sagrado",        essence: 625_000 },
  { rank: 8,  key: "imperador",     name: "Imperador Sagrado",    essence: 5_000_000 },
  { rank: 9,  key: "empirico",      name: "Empírico",             essence: 20_000_000 },
  { rank: 10, key: "divindade",     name: "Divindade",            essence: 100_000_000 },
];

export const STAGES_POR_RANK  = 3;      // estágios dentro de cada rank
