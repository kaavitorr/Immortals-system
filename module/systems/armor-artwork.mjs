/** Authored heroic portraits; previous artwork stays available in the asset library. */
export const ARMOR_ARTWORK = Object.freeze([
  {
    "id": "brigandine000000",
    "type": "medium",
    "previous": "systems/Immortals-system/assets/wuxia/armaduras-flexiveis-pintadas-v1/armadura-flexivel-media.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-flexivel-media.webp"
  },
  {
    "id": "chainMail0000000",
    "type": "heavy",
    "previous": "systems/Immortals-system/assets/wuxia/armaduras-flexiveis-pintadas-v1/armadura-flexivel-pesada.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-flexivel-pesada.webp"
  },
  {
    "id": "heavyHides000000",
    "type": "medium",
    "previous": "icons/equipment/chest/vest-leather-tattered-white.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/peles-pesadas.webp"
  },
  {
    "id": "leatherArmor0000",
    "type": "light",
    "previous": "systems/Immortals-system/assets/wuxia/armaduras-flexiveis-pintadas-v1/armadura-flexivel-leve.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-flexivel-leve.webp"
  },
  {
    "id": "paddedArmor00000",
    "type": "light",
    "previous": "icons/equipment/chest/robe-layered-white.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-acolchoada.webp"
  },
  {
    "id": "plateMail0000000",
    "type": "heavy",
    "previous": "icons/equipment/chest/breastplate-cuirass-steel-grey.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-de-placas.webp"
  },
  {
    "id": "ringMail00000000",
    "type": "medium",
    "previous": "icons/equipment/chest/breastplate-layered-leather-studded-black.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-de-aneis.webp"
  },
  {
    "id": "scaleMail0000000",
    "type": "medium",
    "previous": "icons/equipment/chest/breastplate-banded-steel-studded.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-de-escamas.webp"
  },
  {
    "id": "splintMail000000",
    "type": "heavy",
    "previous": "icons/equipment/chest/breastplate-layered-steel-black.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-de-tiras.webp"
  },
  {
    "id": "studdedLeatherAr",
    "type": "light",
    "previous": "icons/equipment/chest/breastplate-layered-leather-studded-brown.webp",
    "image": "systems/Immortals-system/assets/wuxia/armaduras-heroicas-pintadas-v2/armadura-couro-batido.webp"
  }
].map(Object.freeze));

/** Update stock compendium artwork once while respecting the GM's custom portraits. */
export function prepareArmorArtworkUpdate(item) {
  if (!item || item.isOwner === false || item.limited === true) return null;
  const source=item.toObject?.() ?? item;
  const entry=ARMOR_ARTWORK.find(entry=>entry.id === (source._id ?? item.id));
  if (!entry || source.type !== "equipment" || source.system?.type?.value !== entry.type || source.img !== entry.previous) return null;
  return {_id:entry.id,img:entry.image,"flags.Immortals-system.armorArtworkVersion":2};
}
