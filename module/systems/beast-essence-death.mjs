import {DESTINY_LINEAGES} from './cultivation-destiny.mjs';
import {npcDeathLoot} from "./npc-generator-loot.mjs";
import {BEAST_CORES, BEAST_CORE_BY_ID, beastCoreRealms, createBeastCoreItemData} from "./beast-cores.mjs";
import {buildBeastEssenceSnapshot, createBeastEssenceItemData} from "./beast-essence-capture.mjs";
import {ESSENCE_GROWTH, essenceDiscoveryState, essenceGrowthFromRoll} from "./beast-essence-rules.mjs";
import {CULTIVATION_RANKS} from "./cultivation-data.mjs";
import {CONCEITO_POR_ID} from "./elemental-concepts-data.mjs";

const SCOPE = "Immortals-system";
const DEATH_FLAG = "beastEssenceDeath";
const DISCOVERY_FLAG = "beastEssenceDiscovery";
const TEMPLATE = "systems/Immortals-system/templates/apps/beast-essence-capture.hbs";
const registered = new WeakMap();
const GROWTH = Object.fromEntries(Object.entries(ESSENCE_GROWTH).map(([id,value])=>[id,value.label]));
const ABILITIES = {str: "Força", dex: "Agilidade", con: "Constituição", int: "Intelecto", wis: "Sabedoria", cha: "Presença"};
const MOVEMENT = {walk: "Caminhada", fly: "Voo", swim: "Natação", climb: "Escalada", burrow: "Escavação"};
const SENSES = {darkvision: "Visão no escuro", blindsight: "Visão às cegas", tremorsense: "Sentido sísmico", truesight: "Visão verdadeira"};
const DAMAGES = {fire: "Fogo", cold: "Frio", poison: "Veneno", acid: "Ácido", lightning: "Relâmpago", thunder: "Trovão", bludgeoning: "Impacto", slashing: "Corte", piercing: "Perfuração", radiant: "Radiante", necrotic: "Necrótico", psychic: "Psíquico", force: "Energia", void: "Vazio"};
const values = collection => Array.from(collection?.contents ?? collection ?? []);
const knownRank = value => value !== null && value !== undefined && value !== "" && Number.isInteger(Number(value))
  && Number(value) >= 0 && Number(value) <= 10 ? Number(value) : null;
const saved = actor => actor.flags?.[SCOPE]?.[DEATH_FLAG] ?? {};
const canOwn = actor => {
  try { return actor?.isOwner !== false && !actor?.limited
    && (actor?.testUserPermission?.(globalThis.game?.user, "OWNER") ?? actor?.visible !== false); }
  catch { return false; }
};

/**
 * Read actual death, without interpreting an unset HP field as zero.
 * @param {object} actor
 * @returns {boolean}
 */
export function isBeastEssenceDead(actor) {
  if (actor?.type !== "npc"||actor.flags?.[SCOPE]?.elementalProjection) return false;
  const hp = actor.system?.attributes?.hp?.value;
  return actor.statuses?.has?.("dead") === true || (hp !== null && hp !== undefined && hp !== ""
    && Number.isFinite(Number(hp)) && Number(hp) <= 0);
}

/**
 * Reuse the dedicated world Item folder or create it after confirmation.
 * @param {object} game
 * @returns {Promise<object>}
 */
async function essenceFolder(game) {
  const existing = values(game.folders).find(folder => folder.type === "Item" && folder.name === "Essências de Besta");
  return existing ?? globalThis.Folder.create({name: "Essências de Besta", type: "Item", sorting: "a"});
}

/**
 * A controller owns one sequential review queue; dependencies keep the document boundary testable.
 * @param {object} dependencies
 * @returns {object}
 */
export function createBeastEssenceDeathController(dependencies = {}) {
  // System modules load before Foundry creates Game; resolve it when an event runs.
  const getGame = () => dependencies.game ?? globalThis.game;
  const capture = dependencies.capture ?? buildBeastEssenceSnapshot;
  const buildItem = dependencies.buildItem ?? createBeastEssenceItemData;
  const dialog = dependencies.dialog ?? showBeastEssenceCaptureDialog;
  const createItem = dependencies.createItem ?? (data => globalThis.Item.create(data, {renderSheet: false}));
  const ensureFolder = dependencies.ensureFolder ?? (() => essenceFolder(getGame()));
  const ensureCoreFolder = dependencies.ensureCoreFolder ?? (async () => values(getGame()?.folders).find(folder=>folder.type==="Item"&&folder.name==="Núcleos de Besta") ?? globalThis.Folder.create({name:"Núcleos de Besta",type:"Item",sorting:"a"}));
  const rollD100 = dependencies.rollD100 ?? (async () => (await new globalThis.Roll("1d100").evaluate()).total);
  const rules = dependencies.rules ?? {essenceDiscoveryState, essenceGrowthFromRoll};
  const makeId = dependencies.makeId
    ?? (() => globalThis.foundry?.utils?.randomID?.() ?? globalThis.crypto.randomUUID());
  const notify = dependencies.notify ?? (message => globalThis.ui?.notifications?.warn(message));
  const notifySuccess = dependencies.notifySuccess ?? (message => globalThis.ui?.notifications?.info(message));
  const states = new Map(); const pending = [];
  let running = null;
  const activeGM = () => {
    const game = getGame();
    return !!game?.user?.isGM && game.users?.activeGM?.id === game.user.id;
  };
  const allowed = actor => activeGM() && actor?.type === "npc" && canOwn(actor)
    && (npcDeathLoot(actor).essence || npcDeathLoot(actor).core);
  const current = entry => allowed(entry.actor) && isBeastEssenceDead(entry.actor)
    && states.get(entry.actor.uuid)?.episode === entry.episode;
  const assertCurrent = entry => {if (!current(entry)) throw new Error("A morte ou a permissão mudou. A essência não foi criada.");};
  const write = async (entry, patch) => {
    assertCurrent(entry);
    const previous = saved(entry.actor);
    if (previous.episode && previous.episode !== entry.episode) throw new Error("O episódio de morte mudou.");
    const record = {...previous, version: 1, episode: entry.episode, ...patch};
    await entry.actor.update({[`flags.${SCOPE}.${DEATH_FLAG}`]: record});
    assertCurrent(entry);
    return record;
  };

  const lootActors = entry => [...new Map([entry.actor, ...values(getGame()?.actors),
    ...values(getGame()?.scenes).flatMap(scene => values(scene.tokens).map(token => token.actor))]
    .filter(actor => actor?.uuid && canOwn(actor)).map(actor => [actor.uuid, actor])).values()];
  const lootReceipt = (item, actor = null) => ({itemId: item.id,
    itemUuid: item.uuid ?? (actor ? actor.uuid + '.Item.' + item.id : 'Item.' + item.id),
    recipientActorUuid: actor?.uuid ?? null, recipientName: actor?.name ?? null,
    destination: actor ? 'Inventário de ' + actor.name : 'Itens do mundo'});
  const existingLoot = (entry, predicate) => {
    for (const item of values(getGame()?.items)) if (predicate(item)) return {receipt:lootReceipt(item),item};
    for (const actor of lootActors(entry)) for (const item of values(actor.items)) {
      if (predicate(item)) return {receipt:lootReceipt(item, actor),item};
    }
    return null;
  };
  const destinationActor = (entry, recipient = entry.actor.uuid) => {
    if (recipient === 'world') return null;
    const actor = recipient === entry.actor.uuid ? entry.actor
      : values(getGame()?.actors).find(actor => actor.type === 'character' && actor.uuid === recipient);
    if (!actor || !canOwn(actor)) throw Error('O inventário de destino não está disponível ou você perdeu a permissão.');
    return actor;
  };
  async function deliverLoot(entry, data, recipient, folderFactory) {
    assertCurrent(entry);
    const actor = destinationActor(entry, recipient);
    let item;
    if (actor) {
      const source = {...data};
      delete source.folder; delete source.ownership;
      const created = await actor.createEmbeddedDocuments('Item', [source], {renderSheet: false});
      item = created?.[0];
    } else {
      const folder = await folderFactory();
      assertCurrent(entry);
      item = await createItem({...data, folder: folder.id, ownership: {default: 0}});
    }
    if (!item?.id) throw Error('A criação do material não foi concluída. Confira o inventário de destino.');
    return lootReceipt(item, actor);
  }
  const announceDelivery = (name, receipt) => notifySuccess(name + ' criado em ' + receipt.destination + '.');

  /**
   * Persist one discovery receipt before evaluating its die.
   * @param {object} entry
   * @param {object} snapshot
   * @param {object} input
   * @returns {Promise<object>}
   */
  async function discover(entry, snapshot, input = {}) {
    assertCurrent(entry);
    if (!npcDeathLoot(entry.actor).essence || npcDeathLoot(entry.actor).guaranteed) throw Error("Esta criatura não usa rolagem de descoberta.");
    if (saved(entry.actor).discovery) return structuredClone(saved(entry.actor).discovery);
    const sourceRank = snapshot.sourceRealm ?? knownRank(input.sourceRealm);
    if (sourceRank === null) throw new Error("Informe o reino de cultivo da criatura.");
    const reference = values(getGame()?.actors).find(actor => actor.type === "character"
      && (actor.id === input.referenceId || actor.uuid === input.referenceId));
    if (!reference || !canOwn(reference)) throw new Error("Escolha um cultivador de referência acessível.");
    const referenceRank = knownRank(reference.system?.cultivation?.rank);
    if (referenceRank === null) throw new Error("O cultivador de referência precisa de um reino de cultivo conhecido.");
    const ledger = reference.flags?.[SCOPE]?.[DISCOVERY_FLAG] ?? {version: 1, counters: {}, receipts: []};
    const receipt = (ledger.receipts ?? []).find(record => record.episode === entry.episode);
    const chance = receipt?.chance ?? rules.essenceDiscoveryState(sourceRank, referenceRank, {
      lowerKills: Number(ledger.counters?.[sourceRank])||0, divineBeast: input.divineBeast === true
    });
    if (!receipt) {
      assertCurrent(entry);
      const next = {version: 1, counters: {...ledger.counters},
        receipts: [...(ledger.receipts??[]), {episode: entry.episode, chance}].slice(-100)};
      if (chance.kind === "lower")next.counters[sourceRank]=chance.nextLowerKills;
      await reference.update({[`flags.${SCOPE}.${DISCOVERY_FLAG}`]: next});
      assertCurrent(entry);
    }
    const result = {...chance, referenceActorUuid: reference.uuid, sourceRank, referenceRank,
      divineBeast: input.divineBeast === true, attempted: true, roll: null, success: false};
    await write(entry, {discovery: result});
    if (chance.eligible) {
      const roll = await rollD100();
      if (!Number.isInteger(roll)||roll<1||roll>100) throw new Error("A rolagem de descoberta não foi concluída.");
      result.roll=roll; result.success=roll>=chance.threshold;
      await write(entry, {discovery: result});
    }
    return structuredClone(result);
  }

  /**
   * Persist one growth receipt, with automatic Supreme growth for divine beasts.
   * @param {object} entry
   * @returns {Promise<object>}
   */
  async function rollGrowth(entry, input = {}) {
    assertCurrent(entry);
    if (!npcDeathLoot(entry.actor).essence) throw Error("Esta criatura não possui Essência de Besta.");
    if (npcDeathLoot(entry.actor).guaranteed) input={...input,mode:"manual"};
    if (saved(entry.actor).growth) return structuredClone(saved(entry.actor).growth);
    const discovery = saved(entry.actor).discovery;
    if (!discovery?.success && input.mode!=="manual") throw new Error("Verifique a descoberta ou escolha criação manual antes de rolar o crescimento.");
    const divineBeast=discovery?.divineBeast===true || input.mode==="manual" && input.divineBeast===true;
    if (divineBeast) {const growth={id: "supreme", roll: null, attempted: true, divineBeast: true}; await write(entry, {growth}); return growth;}
    await write(entry, {growth: {id: null, roll: null, attempted: true}});
    const roll=await rollD100(); const id=rules.essenceGrowthFromRoll(roll);
    const growth={id, roll, attempted: true, divineBeast: false}; await write(entry, {growth}); return growth;
  }

  /** Generate one physical core, independently of spirit discovery and growth. */
  async function createCore(entry,input={}) {
    assertCurrent(entry);
    if (!npcDeathLoot(entry.actor).core) throw Error("Esta criatura não possui Núcleo de Besta.");
    const data=createBeastCoreItemData({...input,source:{actorUuid:entry.actor.uuid,name:entry.actor.name,deathEpisode:entry.episode}});
    const receipt=saved(entry.actor).core;
    if(receipt?.status==="created")return structuredClone(receipt);
    const existing=existingLoot(entry,item=>item.flags?.[SCOPE]?.beastCore?.source?.deathEpisode===entry.episode);
    if(existing){const core={status:'created',...existing.receipt,name:existing.item.name,elementId:existing.item.system?.type?.subtype,rank:existing.item.system?.beastCore?.rank};await write(entry,{core});return core;}
    if(receipt?.status==='creating')throw Error('A criação deste núcleo já foi iniciada. Confira o inventário de destino antes de tentar novamente.');
    destinationActor(entry,input.recipient);
    const core={status:'creating',itemId:null,name:data.name,elementId:input.elementId,rank:Number(input.rank)};
    await write(entry,{core});assertCurrent(entry);
    let delivery;
    try{delivery=await deliverLoot(entry,data,input.recipient,ensureCoreFolder);}
    catch(error){if(current(entry))await write(entry,{core:{...core,status:'failed'}});throw error;}
    const result={...core,...delivery,status:'created'};
    if(current(entry))await write(entry,{core:result});
    announceDelivery(data.name,delivery);
    return result;
  }

  /**
   * Review one current episode and revalidate sources before creating any loot.
   * @param {object} entry
   * @returns {Promise<void>}
   */
  async function process(entry) {
    if (!current(entry)) return;
    try {
      const previous=saved(entry.actor);
      if (previous.episode===entry.episode && ["created", "dismissed", "failed"].includes(previous.status)) return;
      await write(entry, {status: "review", ...(previous.status==="queued" ? {discovery:null,growth:null,itemId:null,itemUuid:null,recipientActorUuid:null,recipientName:null,destination:null} : {})});
      const snapshot=await capture(entry.actor);
      assertCurrent(entry);
      const loot=npcDeathLoot(entry.actor);
      const references=values(getGame()?.actors).filter(actor => actor.type==="character"&&canOwn(actor));
      const session={loot, references, defaultRecipient:entry.actor.uuid,
        recipients:[{value:entry.actor.uuid,label:"Inventário da criatura — "+entry.actor.name},
          ...references.map(actor=>({value:actor.uuid,label:"Inventário de "+actor.name})),
          {value:"world",label:"Itens do mundo — pastas de materiais"}],
        record: () => structuredClone(saved(entry.actor)),
        createCore: loot.core ? input => entry.corePromise??=createCore(entry,input).catch(error=>{entry.corePromise=null;throw error;}) : undefined,
        discover: input => entry.discoveryPromise??=discover(entry, snapshot, input)
          .catch(error => {entry.discoveryPromise=null; throw error;}),
        rollGrowth: input => entry.growthPromise??=rollGrowth(entry, input)
          .catch(error => {entry.growthPromise=null; throw error;})};
      const result=await dialog(snapshot, session);
      if (!current(entry)) return;
      if (!result) {await write(entry, {status: "dismissed"}); return;}
      if (!npcDeathLoot(entry.actor).essence) throw Error("Esta criatura não possui Essência de Besta.");
      if (npcDeathLoot(entry.actor).guaranteed) result.mode="manual";
      if (!["manual", "chance"].includes(result.mode)) throw new Error("Escolha verificação de chance ou criação manual.");
      const fresh=await capture(entry.actor);
      assertCurrent(entry);
      const sourceRealm=fresh.sourceRealm??knownRank(result.sourceRealm);
      if (sourceRealm===null) throw new Error("Informe o reino da criatura antes de criar a essência.");
      if (result.mode==="chance") {
        const state=saved(entry.actor);
        if (sourceRealm!==state.discovery?.sourceRank) throw new Error("O reino da criatura mudou após a descoberta.");
        if (!state.discovery?.success || !state.growth?.id) throw new Error("A descoberta e o crescimento precisam estar concluídos.");
        if (result.selection?.growth!==state.growth.id) throw new Error("O crescimento escolhido difere da rolagem registrada.");
      }
      const growth=saved(entry.actor).growth;
      if (growth && (!growth.id || result.selection?.growth!==growth.id)) throw new Error("O crescimento escolhido difere da rolagem registrada ou a rolagem não foi concluída.");
      const divineBeast=saved(entry.actor).discovery?.divineBeast===true || growth?.divineBeast===true || !growth && result.divineBeast===true;
      if (divineBeast && result.selection?.growth!=="supreme") throw new Error("Uma Besta Divina sempre possui crescimento Supremo.");
      const existing=existingLoot(entry,item => item.flags?.[SCOPE]?.beastEssenceItem?.definition?.id===entry.episode);
      if (existing) {await write(entry, {status: "created", ...existing.receipt}); return;}
      const data=buildItem({...fresh, sourceRealm}, {...result.selection, id: entry.episode,
        growthRoll: growth?.roll??null, growthOrigin: divineBeast ? "divine" : growth?.roll ? "rolled" : "manual"});
      destinationActor(entry,result.recipient);
      await write(entry, {status: "creating"});
      const delivery=await deliverLoot(entry,data,result.recipient,ensureFolder);
      if (current(entry)) await write(entry, {status: "created", ...delivery});
      announceDelivery(data.name,delivery);
    } catch (error) {
      if (current(entry)) {
        try {await write(entry, {status: "failed"});} catch {/* A lost permission must not trigger more writes. */}
        notify(error.message);
      }
    }
  }

  const controller={
    seed(actors) {for (const actor of values(actors))controller.track(actor); if(pending.length)return controller.drain();},
    track(actor) {
      if (actor?.type!=="npc"||states.has(actor.uuid)) return;
      const record=saved(actor),dead=isBeastEssenceDead(actor);
      states.set(actor.uuid, {dead, episode:record.episode??null});
      // Resume only a persisted, unopened review for this exact Actor/token.
      if (dead && allowed(actor) && record.status==="queued" && typeof record.episode==="string"
        && record.episode.startsWith(`${actor.uuid}.`)) pending.push({actor,episode:record.episode});
    },
    async observe(actor) {
      if (actor?.type!=="npc") return;
      if (!states.has(actor.uuid)) {controller.track(actor); return pending.length ? controller.drain() : undefined;}
      const before=states.get(actor.uuid); const dead=isBeastEssenceDead(actor);
      if (before.dead===dead) return;
      if (!dead) {
        states.set(actor.uuid, {dead: false, episode: null});
        if (allowed(actor)) await actor.update({[`flags.${SCOPE}.${DEATH_FLAG}`]: {version: 1, episode: null, status: "alive", discovery: null, growth: null, itemId: null, itemUuid: null, recipientActorUuid: null, recipientName: null, destination: null, core: null}});
        return;
      }
      const episode=`${actor.uuid}.${makeId()}`;
      states.set(actor.uuid, {dead: true, episode});
      if (!allowed(actor)) return;
      const entry={actor, episode};
      // The claim survives reloads; only an explicitly queued, unopened review is recovered.
      await actor.update({[`flags.${SCOPE}.${DEATH_FLAG}`]: {version: 1, episode, status: "queued", discovery: null, growth: null, itemId: null, itemUuid: null, recipientActorUuid: null, recipientName: null, destination: null, core: null}});
      if (!current(entry)) return;
      pending.push(entry);
      return controller.drain();
    },
    drain() {
      if (running) return running;
      running=(async () => {
        while (pending.length) {
          const entry=pending.shift();
          await process(entry);
        }
      })()
        .finally(() => {running=null;});
      return running;
    }
  };
  return controller;
}

/**
 * Format the review without persisting the private candidate snapshot.
 * @param {object} snapshot
 * @param {object} session
 * @param {object} form
 * @param {string} error
 * @returns {object}
 */
export function prepareBeastEssenceCaptureContext(snapshot, session, form = {}, error = "") {
  const record=session.record(); const selected=(name, key) => (form.selection?.[name]??[]).includes(key);
  const profileView=(profile,isArchetype=false) => ({name: profile.name, img: profile.img,isArchetype,
    features: (profile.features??[]).map(entry => ({key:entry.key,name: entry.data.name, img: entry.data.img, level: entry.level,normal:selected("normalArchetypeFeatures",entry.key),weakened:selected("weakenedArchetypeFeatures",entry.key)})),
    summary: [...Object.entries(profile.resistances??{}).flatMap(([key, value]) => {
      const points=typeof value==="number"?value:value?.value;
      return value?.immune?[`Imunidade a ${DAMAGES[key]??key}`]:points?[`${DAMAGES[key]??key}: ${points}`]:[];
    }), ...Object.entries(profile.movement??{}).flatMap(([key, value]) => MOVEMENT[key]&&value>0?[`${MOVEMENT[key]}: ${value} m`]:[]),
    ...Object.entries(profile.senses??{}).flatMap(([key, value]) => value>0?[`${SENSES[key]??key}: ${value} m`]:[])].join("; ")});
  const growth=record.growth?.id??form.selection?.growth??"human";
  const rankName=rank=>CULTIVATION_RANKS.find(value=>value.rank===rank)?.name??"—";
  const essenceEnabled=session.loot?.essence!==false,guaranteed=session.loot?.guaranteed===true;
  const hasCore=typeof session.createCore==="function" && session.loot?.core!==false;
  const coreElement=BEAST_CORE_BY_ID[form.core?.elementId??session.loot?.elementId]?.id??(snapshot.elements.length===1&&BEAST_CORE_BY_ID[snapshot.elements[0]]?snapshot.elements[0]:"neutro");
  const coreRank=form.core?.rank??(snapshot.sourceRealm>0?snapshot.sourceRealm:1);
  const core=hasCore?{created:record.core?.status==="created",name:record.core?.name,destination:record.core?.destination??"Itens do mundo",img:BEAST_CORE_BY_ID[record.core?.elementId??coreElement]?.img,
    elements:BEAST_CORES.map(entry=>({value:entry.id,label:entry.label,selected:entry.id===coreElement})),
    realms:beastCoreRealms().map(entry=>({...entry,selected:entry.value===Number(coreRank)}))}:null;
  return {recipients:(session.recipients??[]).map(option=>({...option,selected:option.value===(form.recipient??session.defaultRecipient)})),
    essenceEnabled, guaranteed, core, canCreateCore:hasCore&&!core.created, name: snapshot.name, img: snapshot.img, error, mode: form.mode??"chance", manual: form.mode==="manual", chance: form.mode!=="manual",
    sourceRealm: snapshot.sourceRealm??form.sourceRealm??"", knownSourceRealm: snapshot.sourceRealm!==null,
    realms: [{value: 0, label: "Mortal"}, ...CULTIVATION_RANKS.map(rank => ({value: rank.rank, label: rank.name}))]
      .map(option => ({...option, selected: String(option.value)===String(snapshot.sourceRealm??form.sourceRealm??"")})),
    references: session.references.map(actor => ({id: actor.id, name: actor.name,
      selected: actor.id===form.referenceId})),
    divineBeast: record.discovery ? record.discovery.divineBeast===true : record.growth ? record.growth.divineBeast===true : form.divineBeast===true,
    lineageOptions:DESTINY_LINEAGES.map(l=>({value:l.id,label:l.name,selected:l.id===form.selection?.lineageId})),
    divineBeastLocked: !!record.discovery || !!record.growth, tokenTexture: form.selection?.tokenTexture??snapshot.tokenTexture,
    growth, growthLocked: !!record.growth,
    growths: Object.entries(ESSENCE_GROWTH).map(([value, data]) => ({value, label:data.label, selected:value===growth,
      range:data.rollMin===data.rollMax?String(data.rollMin):`${data.rollMin}–${data.rollMax}`, limit:rankName(data.limitRank)})),
    abilities: snapshot.highestAbilities.map(value => ({value, label: ABILITIES[value],
      selected: value===(form.selection?.ability??snapshot.highestAbilities[0])})),
    elements: snapshot.elements.map(value => ({value, label: CONCEITO_POR_ID[value]?.label??value,
      selected: (form.selection?.elements??[]).includes(value)})),
    profiles: [snapshot.taxonomy?profileView(snapshot.taxonomy):null,snapshot.archetype?profileView(snapshot.archetype,true):null].filter(Boolean),
    naturalWeapons: snapshot.naturalWeapons.map(entry => ({name: entry.data.name, img: entry.data.img})),
    features: snapshot.features.map(entry => ({key: entry.key, name: entry.data.name, img: entry.data.img, normal: selected("normalFeatures", entry.key), weakened: selected("weakenedFeatures", entry.key)})),
    attacks: snapshot.attacks.map((entry, index) => ({key: entry.key, index, name: `${entry.itemName} — ${entry.data.system.activities[entry.activityId]?.name??entry.activityId}`, img: entry.data.img,
      actions: entry.actions, actionsLabel: entry.actions === 1 ? "1 ação" : `${entry.actions} ações`,
      area: entry.area?"Área":"Alvo único", normalEligible: entry.actions<=3,
      normal: selected("normalAttacks", entry.key), weakened: selected("weakenedAttacks", entry.key),
      damageInstances: form.selection?.attackCosts?.[entry.key]?.damageInstances??entry.damageInstances,
      effectQi: form.selection?.attackCosts?.[entry.key]?.effectQi??entry.effectQi??""})),
    warnings: snapshot.warnings??[], canDiscover: essenceEnabled && !guaranteed && !record.discovery,
    canGrowth: essenceEnabled && !record.growth,
    discovery: guaranteed ? "Essência garantida na criação da criatura. Role o crescimento ou escolha o rank manualmente, e revise as características." : record.discovery?record.discovery.success?`Essência encontrada: d100 ${record.discovery.roll} (mínimo ${record.discovery.threshold}).`
      :record.discovery.eligible?`Nenhuma essência: d100 ${record.discovery.roll??"não concluído"} (mínimo ${record.discovery.threshold}).`
        :record.discovery.kind==="lower"?`Abates de rank inferior: ${record.discovery.nextLowerKills} de 10. Ainda sem rolagem.`:"Esta criatura não permite uma rolagem pela diferença de rank.":"A chance é verificada uma vez para este episódio de morte.",
    growthResult: record.growth?.id?`Crescimento ${GROWTH[record.growth.id]}${record.growth.roll?` (d100 ${record.growth.roll}).`:" — Besta Divina."}`:""};
}

/**
 * Read only named controls from the native DialogV2 form.
 * @param {HTMLFormElement} element
 * @param {object} snapshot
 * @returns {object}
 */
function readCaptureForm(element, snapshot) {
  const form=new FormData(element); const get=name => form.get(name); const list=name => form.getAll(name).map(String);
  const attackCosts={};
  snapshot.attacks.forEach((entry, index) => {const damage=get(`damage-${index}`); const effect=get(`effect-${index}`); attackCosts[entry.key]={}; if (damage!=="")attackCosts[entry.key].damageInstances=Number(damage); if (effect!=="")attackCosts[entry.key].effectQi=Number(effect);});
  return {recipient:String(get("recipient")??"world"),core:{elementId:String(get("coreElement")??"neutro"),rank:Number(get("coreRank"))},mode: String(get("mode")), sourceRealm: knownRank(get("sourceRealm")), referenceId: String(get("referenceId")??""), divineBeast: get("divineBeast")==="on",
    selection: {lineageId:String(get("lineageId")??"")||undefined,growth: String(get("growth")), ability: String(get("ability")), elements: list("elements"), normalArchetypeFeatures:list("normalArchetypeFeatures"),weakenedArchetypeFeatures:list("weakenedArchetypeFeatures"),normalFeatures: list("normalFeatures"), weakenedFeatures: list("weakenedFeatures"), normalAttacks: list("normalAttacks"), weakenedAttacks: list("weakenedAttacks"), attackCosts, tokenTexture: String(get("tokenTexture")??"")}};
}

/**
 * One native review is visible at a time; chance/growth results are durably recorded before reopening it.
 * @param {object} snapshot
 * @param {object} session
 * @returns {Promise<object|null>}
 */
export async function showBeastEssenceCaptureDialog(snapshot, session) {
  let form={recipient:session.defaultRecipient??"world",mode: session.loot?.guaranteed?"manual":"chance", core:{elementId:session.loot?.elementId??undefined}, sourceRealm: snapshot.sourceRealm, selection: {}}; let error="";
  while (true) {
    const context=prepareBeastEssenceCaptureContext(snapshot, session, form, error);
    const content=await globalThis.foundry.applications.handlebars.renderTemplate(TEMPLATE, context);
    const buttons=[];
    const button=(action, label) => ({action, label,
      callback: (_event, button) => ({action, form: readCaptureForm(button.form, snapshot)})});
    if(context.canCreateCore)buttons.push(button("core", "Gerar núcleo"));
    if (context.canDiscover)buttons.push(button("discover", "Verificar chance"));
    if (context.canGrowth)buttons.push(button("growth", "Rolar crescimento · 1d100"));
    if(context.essenceEnabled)buttons.push(button("create", "Criar essência"));
    buttons.push({action: "cancel", label: context.core?.created?"Encerrar revisão":"Dispensar", callback: () => false});
    const answer=await globalThis.foundry.applications.api.DialogV2.wait({classes: ["iw-dialog", "iw-beast-essence-capture-dialog"],
      window: {title: (context.core?(context.essenceEnabled?"Núcleo e Essência — ":"Núcleo de Besta — "):"Essência de Besta — ")+snapshot.name}, position: {width: 820}, modal: true, content, buttons, rejectClose: false});
    if (!answer || answer === "cancel" || answer.action === "cancel") return null;
    form=answer.form; error="";
    try {
      if(answer.action==="core"){await session.createCore({...form.core,recipient:form.recipient});continue;}
      if (answer.action==="discover") {await session.discover(form); continue;}
      if (answer.action==="growth") {await session.rollGrowth(form); continue;}
      if (!context.essenceEnabled) throw Error("Esta criatura não possui Essência de Besta.");
      if (context.guaranteed) form.mode="manual";
      if (form.sourceRealm===null) throw new Error("Informe o reino da criatura antes de criar a essência.");
      if (form.mode==="manual" && (form.divineBeast || session.record().discovery?.divineBeast) && !session.record().growth) await session.rollGrowth(form);
      const record=session.record();
      if (record.discovery || record.growth) form.divineBeast=record.discovery?.divineBeast===true || record.growth?.divineBeast===true;
      if (record.growth?.id) form.selection.growth=record.growth.id;
      if (record.growth && !record.growth.id) throw new Error("A rolagem de crescimento não foi concluída. Dispense esta revisão e confira os dados.");
      if (form.mode==="chance") {
        if (!record.discovery?.success||!record.growth?.id) throw new Error("Conclua descoberta e crescimento, ou escolha criação manual.");
        form.selection.growth=record.growth.id;
      }
      createBeastEssenceItemData({...snapshot, sourceRealm: form.sourceRealm}, {...form.selection, id: "review-validation"});
      return form;
    } catch (failure) {
      const names = {normalFeatures: "características da forma normal", weakenedFeatures: "características da forma enfraquecida",
        normalAttacks: "ataques da forma normal", weakenedAttacks: "ataques da forma enfraquecida"};
      error = String(failure.message)
        .replace(/normalFeatures|weakenedFeatures|normalAttacks|weakenedAttacks/g, name => names[name]);
    }
  }
}

/**
 * Register lifecycle observations; ready recovers queued reviews without claiming old corpses.
 * @param {object} hooks
 * @param {object} options
 * @returns {object}
 */
export function registerBeastEssenceDeathHooks(hooks = globalThis.Hooks, options = {}) {
  if (registered.has(hooks)) return registered.get(hooks);
  const controller=options.controller??createBeastEssenceDeathController(options);
  const registrations=[];
  const on=(name, callback) => registrations.push([name, hooks.on(name, callback)]);
  const actorOf=effect => effect?.parent?.type==="npc"?effect.parent:null;
  const observe=actor => controller.observe(actor).catch(error => globalThis.console?.error("Immortals: Essência de Besta", error));
  const seedAll = () => {
    const game=options.game??globalThis.game;
    return controller.seed([...values(game?.actors), ...values(game?.scenes).flatMap(scene => values(scene.tokens).map(token => token.actor).filter(Boolean))]);
  };
  on("ready", seedAll);
  on("canvasReady", seedAll);
  on("createToken", token => controller.track(token.actor));
  on("createActor", actor => controller.track(actor));
  on("preUpdateActor", actor => controller.track(actor)); on("updateActor", observe);
  for (const event of ["preCreateActiveEffect", "preUpdateActiveEffect", "preDeleteActiveEffect"])on(event, effect => controller.track(actorOf(effect)));
  for (const event of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"])on(event, effect => observe(actorOf(effect)));
  on("updateCombat", () => controller.drain()); on("deleteCombat", () => controller.drain());
  if ((options.game??globalThis.game)?.ready)seedAll();
  controller.unregister=() => {for (const [name, id] of registrations)hooks.off(name, id); registered.delete(hooks);};
  registered.set(hooks, controller); return controller;
}
