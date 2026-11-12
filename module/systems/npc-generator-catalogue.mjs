/** Stable catalogue identities and damage-based folders shared by the Wuxia generator. */
export const npcGeneratorNormalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const key = value => npcGeneratorNormalize(value).replace(/[^a-z0-9]/g, '');
export function npcGeneratorProfileKey(profile) {
  const source = profile?.source ?? profile;
  const identity = source?.flags?.['Immortals-system']?.encyclopedia?.key;
  return key((typeof identity === 'string' ? identity.split(':').at(-1) : null)
    ?? source?.system?.identifier ?? profile?.identifier ?? profile?.profileKey ?? profile?.key);
}
const EXCLUSIVE_TAXONOMIES = {
  cuspidoranaja: ["serpentes"],
  espreitadornoturno: ["felinos"],
  montariadeguerra: ["equideos"],
  atropelador: ["equideos"],
  fugaz: ["leporideos"],
  multiplicador: ["leporideos"],
  agourento: ["corvideos"],
  estridente: ["quiropteros"],
  brutamontes: ["primatas"],
  operaria: ["insetoides"],
  espreitadorvertical: ["miriapodes"],
  esmagador: ["crustaceos"],
  fragmentador: ["equinodermos"],
  soterrador: ["fossorios"],
  oitobraco: ["cefalopodes"],
  lanceirodemare: ["homenspeixe"],
  ceifadorabissal: ["homenspeixe"],
  multimembro: ["aberracoes"],
  metamorfo: ["mutantes"],
  cabecadeleao: ["quimeras"],
  corpodecabra: ["quimeras"],
  caudadeserpente: ["quimeras"],
  hidra: ["policefalos"],
  discordia: ["policefalos"],
  usurpador: ["parasitas"],
  colonia: ["fungoides"],
  adormecedor: ["plantascarnivoras"],
  incubo: ["pesadelos"],
  perseguidor: ["pesadelos"],
  devoradordeluz: ["umbranos"],
  portavoz: ["ocos"],
  ladraodenomes: ["fadas"],
  pactuante: ["fadas"],
  rastreadorancestral: ["saurios"],
  saqueadorardiloso: ["homensfera"],
  mergulhador: ["gargulas"],
  ressonador: ["cristalinos"],
  brinquedotraicoeiro: ["objetosanimados"]
};
const HUMANOID_ARCHETYPES = new Set([
  "guerreiro", "espadachim", "samurai", "lutador", "assassino", "atirador", "bastiao",
  "defensor", "justiceiro", "berserker", "duelista", "comandante", "infiltrador"
]);
// Humanoid forms described by the taxonomy; conceptual beings may also assume these forms.
const HUMANOID_TAXONOMIES = [
  "humanos", "homensfera", "homenspeixe", "lobisomens", "gigantes", "mortosvivossuperiores", "ocos", "fadas", "entidadesconceituais",
  "humano", "hibrido"
];

export const npcGeneratorArchetypeIsSpecific = archetype => Object.hasOwn(EXCLUSIVE_TAXONOMIES, npcGeneratorProfileKey(archetype));
export function npcGeneratorArchetypeTaxonomies(archetype) {
  const id = npcGeneratorProfileKey(archetype);
  return Object.hasOwn(EXCLUSIVE_TAXONOMIES, id) ? EXCLUSIVE_TAXONOMIES[id]
    : HUMANOID_ARCHETYPES.has(id) ? HUMANOID_TAXONOMIES : null;
}
export const NPC_EQUIPMENT_FOLDERS = Object.freeze([
  {key:'base',label:'Base'}, {key:'fire',label:'Fogo'}, {key:'acid',label:'Ácido'},
  {key:'lightning',label:'Elétrico'}, {key:'cold',label:'Frio'}, {key:'thunder',label:'Trovejante'},
  {key:'psychic',label:'Psíquico'}, {key:'radiant',label:'Energia'}, {key:'poison',label:'Veneno'},
  {key:'soul',label:'Alma'}, {key:'void',label:'Vazio'}, {key:'armor',label:'Armaduras'}, {key:'all',label:'Todos'}
]);
const elementalKeys = new Set(NPC_EQUIPMENT_FOLDERS.filter(f => !['base','armor','all'].includes(f.key)).map(f => f.key));
export function npcGeneratorEquipmentFolder(item) {
  if (item?.type === 'equipment') return 'armor';
  const types = new Set();
  const addTypes = values => {for (const value of typeof values === 'string' ? [values] : values ?? []) types.add(npcGeneratorNormalize(value));};
  const addDamage = damage => {addTypes(damage?.types);for (const part of damage?.parts ?? []) addTypes(Array.isArray(part) ? part[1] : part.types);};
  addDamage(item?.system?.damage?.base);addDamage(item?.system?.damage?.versatile);addDamage(item?.system?.damage);
  const activities = item?.system?.activities;
  for (const activity of activities?.contents ?? (typeof activities?.values === 'function' ? Array.from(activities.values()) : Object.values(activities ?? {}))) if (activity.type !== 'heal') addDamage(activity.damage);
  const authored = npcGeneratorNormalize(item?.flags?.['Immortals-system']?.elemento);
  if (!types.size) return elementalKeys.has(authored) ? authored : 'base';
  if (types.has(authored) && elementalKeys.has(authored)) return authored;
  return NPC_EQUIPMENT_FOLDERS.find(folder => elementalKeys.has(folder.key) && types.has(folder.key))?.key ?? 'base';
}
export function npcGeneratorEquipmentMatches(entry, filters = {}) {
  return (!filters.folder || filters.folder === 'all' || entry.folder === filters.folder)
    && (!filters.source || entry.pack === filters.source)
    && npcGeneratorNormalize(entry.name).includes(npcGeneratorNormalize(filters.query));
}
