import {WUXIA_BACKGROUNDS} from "./wuxia-backgrounds-data.mjs";
import {QI_TALENTS} from "./qi-talents-data.mjs";
import {SPECIES_FEATURES,SPECIES_LINEAGES} from "./wuxia-species-data.mjs";
import {prepareBackgroundEquipmentArtUpdate} from "./background-equipment-art.mjs";

const SCOPE = "Immortals-system", BASE = "systems/Immortals-system/assets/wuxia/";
const backgrounds = new Map(WUXIA_BACKGROUNDS.map(entry => [entry.key, entry]));
const talents = new Map(QI_TALENTS.map(entry => [entry.id, entry]));
const species = new Set(["humano", "demonio", "meio-monstro"]);
const speciesArtKey = name => name.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
const speciesFeatures = new Map(SPECIES_FEATURES.map(entry => [entry.name,speciesArtKey(entry.name)]));
const speciesLineages = new Map([
  ...SPECIES_LINEAGES.map(entry => entry.name),
  "Demônios da Brutalidade","Demônios do Charme","Demônios Traiçoeiros"
].map(name => [name,speciesArtKey(name)]));

const oldQiImages = new Set([
  "systems/Immortals-system/icons/svg/items/spell.svg",
  "systems/Immortals-system/icons/svg/items/weapon.svg",
  "systems/Immortals-system/icons/svg/items/feature.svg",
  "systems/Immortals-system/icons/svg/conceitos/luz.svg"
]);

export function backgroundImage(key, {feature = false} = {}) {
  if (!backgrounds.has(key)) throw new RangeError("Antecedente desconhecido.");
  return BASE + (feature ? "antecedentes-pintados-v1/habilidades/" : "antecedentes-pintados-v2/") + key + ".webp";
}
export function qiTalentImage(id) {
  if (!talents.has(id)) throw new RangeError("Talento de Qi desconhecido.");
  return BASE + "talentos-qi-pintados-v2/" + id + ".webp";
}
export function speciesImage(key) {
  if (!species.has(key)) throw new RangeError("Espécie desconhecida.");
  return BASE + "especies-pintadas-v1/" + key + ".webp";
}
export function speciesFeatureImage(name, fallback = null) {
  const key = speciesFeatures.get(name);
  if (key) return BASE + "caracteristicas-especie-pintadas-v1/" + key + ".webp";
  const lineage = speciesLineages.get(name);
  return lineage ? BASE + "ancestralidades-variantes-pintadas-v1/" + lineage + ".webp" : fallback;
}


const previousQiTalentImages=id=>new Set([...oldQiImages,BASE+"talentos-qi-pintados-v1/"+id+".webp"]);
/** Resolve stock images for a cached tree while retaining personal artwork. */
export function qiTalentImageForSource(id,image){
  if(!talents.has(id))return image??"systems/Immortals-system/icons/svg/items/feature.svg";
  return !image||previousQiTalentImages(id).has(image)?qiTalentImage(id):image;
}

/** Only images authored by the system are replaced; game data and personal artwork stay intact. */
export function prepareGeneralContentArtUpdate(item) {
  if (!item || item.isOwner === false || item.limited === true) return null;
  const owner = item.actor ?? (["character", "npc"].includes(item.parent?.type) ? item.parent : null);
  if (owner && (owner.isOwner !== true || owner.limited === true)) return null;
  const source = item.toObject?.() ?? item, flags = source.flags?.[SCOPE];
  if (flags?.backgroundEquipment) return prepareBackgroundEquipmentArtUpdate(source);
  let image, previous, qiId, backgroundKey, speciesKey, speciesFeatureKey, feature = false;
  if (source.type === "race" && species.has(flags?.species?.key)) {
    speciesKey = flags.species.key;
  } else if (source.type === "feat" && (speciesFeatures.has(flags?.speciesFeature) || speciesLineages.has(flags?.speciesFeature))) {
    speciesFeatureKey = flags.speciesFeature;
  } else if (source.type === "background" && backgrounds.has(flags?.background?.key)) {
    backgroundKey = flags.background.key;
  } else if (source.type === "feat" && backgrounds.has(flags?.backgroundFeature)) {
    backgroundKey = flags.backgroundFeature;
    feature = true;
  } else if (source.type === "feat" && talents.has(flags?.talentoQi?.id)) {
    qiId = flags.talentoQi.id;
  } else return null;
  if (speciesKey || speciesFeatureKey) {
    image = speciesKey ? speciesImage(speciesKey) : speciesFeatureImage(speciesFeatureKey);
    previous = new Set(["systems/Immortals-system/icons/svg/items/race.svg"]);
  } else if (backgroundKey) {
    image = backgroundImage(backgroundKey, {feature});
    previous = new Set([backgrounds.get(backgroundKey).img]);
    if (!feature) previous.add(BASE + "antecedentes-pintados-v1/" + backgroundKey + ".webp");
  } else {
    image = qiTalentImage(qiId);
    previous = previousQiTalentImages(qiId);
  }
  if (!previous.has(source.img) && source.img !== image) return null;
  const id = source._id ?? item.id;
  if (!id) return null;
  const patch = {_id: id};
  if (previous.has(source.img)) patch.img = image;
  for (const [key, activity] of Object.entries(source.system?.activities ?? {})) {
    if (!/^[A-Za-z0-9]{1,64}$/.test(key) || ["constructor", "prototype"].includes(key)) continue;
    const native = qiId ? activity.flags?.[SCOPE]?.qiTalentActivity?.talentId === qiId
      : feature && /^bacc4000[a-f0-9]{8}$/.test(key) && activity._id === key;
    if (native && (previous.has(activity.img) || !activity.img)) patch["system.activities." + key + ".img"] = image;
  }
  return Object.keys(patch).length > 1 ? patch : null;
}
