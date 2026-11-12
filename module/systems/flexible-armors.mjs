/** The three authored flexible armors reuse their existing equipment document IDs. */
export const FLEXIBLE_ARMOR_PRESETS = Object.freeze([
  {id: "leatherArmor0000", type: "light", name: "Armadura Flexível Leve", base: 2, limit: null, art: "leve",
    description: "Tecido acolchoado e couro flexível protegem o tronco sem restringir os movimentos."},
  {id: "brigandine000000", type: "medium", name: "Armadura Flexível Média", base: 6, limit: 8, art: "media",
    description: "Lâminas de couro sobrepostas a uma base de tecido equilibram proteção e mobilidade."},
  {id: "chainMail0000000", type: "heavy", name: "Armadura Flexível Pesada", base: 12, limit: 4, art: "pesada",
    description: "Camadas de lâminas articuladas e tecido espesso oferecem uma proteção robusta e flexível."}
].map(Object.freeze));

/** Revise only the selected public armor's presentation and CR, once; never replace the whole item. */
export function prepareFlexibleArmorUpdate(item) {
  if (!item || item.isOwner === false || item.limited === true) return null;
  const source = item.toObject?.() ?? item;
  const preset = FLEXIBLE_ARMOR_PRESETS.find(entry => entry.id === (source._id ?? item.id));
  if (!preset || source.type !== "equipment" || source.system?.type?.value !== preset.type) return null;
  if ((source.flags?.["Immortals-system"]?.flexibleArmorVersion ?? 0) >= 1) return null;
  const contribution = preset.limit === null ? "Agilidade, sem limite" : "Agilidade, até +" + preset.limit;
  const formula = preset.limit === null ? preset.base + " + Agilidade"
    : preset.base + " + Agilidade (máximo +" + preset.limit + ")";
  return {
    _id: preset.id,
    name: preset.name,
    img: "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-flexivel-" + preset.art + ".webp",
    "system.armor.value": preset.base,
    "system.armor.ability": "dex",
    "system.armor.dex": preset.limit,
    "system.source.custom": "Immortals Legacy",
    "system.description.value": "<p>" + preset.description + "</p><p><strong>Classe de Resistência:</strong> "
      + formula + ".</p><p>Usa o valor de " + contribution + ", substituindo a defesa sem armadura.</p>",
    "flags.Immortals-system.flexibleArmorVersion": 1
  };
}
