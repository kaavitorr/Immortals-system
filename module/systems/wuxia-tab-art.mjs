const BASE='systems/Immortals-system/assets/wuxia/tabs-neutras-v2/';
const shared={cultivationManual:'manual-de-cultivo',details:'resumo',inventory:'inventario',professions:'profissoes',features:'caracteristicas',skills:'pericias',spells:'tecnicas',concepts:'conceitos-elementais',effects:'efeitos'};
const images=roles=>Object.freeze(Object.fromEntries(Object.entries(roles).map(([tab,asset])=>[tab,BASE+asset+'.webp'])));

/** Shared tab functions share artwork; NPC biography keeps its dedicated icon. */
export const WUXIA_TAB_IMAGES=Object.freeze({
  character:images({...shared,cultivation:'cultivo',beastEssence:'essencia-de-besta'}),
  npc:images({...shared,biography:'biografia',specialTraits:'detalhes-npc'})
});
