import {registerCultivationDestinyAuthority,dispatchCultivationDestiny} from './cultivation-destiny-authority.mjs';
import {destinyState, prepareDestinySelection, lineageDefinition, destinyOriginMatchesActor} from "./cultivation-destiny.mjs";
import {speciesDocuments} from "./wuxia-species.mjs";
import {MANUAL_RANKS, MANUAL_QUALITIES} from "./cultivation-manual.mjs";
import {withElementalActorLock} from "./elemental-runtime.mjs";
import {mayExecuteBeastEssence} from "./beast-essence-authority.mjs";

const SCOPE="Immortals-system"; const PATH="flags.Immortals-system.cultivationDestiny";
const ABILITIES=new Set(["str", "dex", "con", "int", "wis", "cha"]);
const ABILITY_LABELS={str:"Força",dex:"Agilidade",con:"Constituição",int:"Intelecto",wis:"Sabedoria",cha:"Presença"};
const ESSENCE_ART="systems/Immortals-system/assets/wuxia/essencias-pintadas-v1/essencia-de-besta.webp";
const copy=value => globalThis.foundry?.utils?.deepClone?.(value)??structuredClone(value);
const itemsOf=actor => Array.from(actor?.items?.contents??actor?.items?.values?.()??actor?.items??[]);
const rawOf=actor => actor?.flags?.[SCOPE]?.cultivationDestiny??{};
const grantOf=item => item?.flags?.[SCOPE]?.cultivationDestinyGrant;
const ownGrant=(actor, item) => item?.type==="feat"&&grantOf(item)?.version===1&&destinyOriginMatchesActor(actor,grantOf(item).actorUuid);
const recordsOf=raw => Array.isArray(raw.records)?copy(raw.records):Object.values(raw.records??{}).flat().filter(entry => entry&&typeof entry==="object").map(copy);
const escape=value => String(value??"").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const preview=(actor, raw) => ({
  type: actor.type, system: actor.system, items: actor.items, itemTypes: actor.itemTypes,
  flags: {...actor.flags, [SCOPE]: {...actor.flags?.[SCOPE], cultivationDestiny: raw}}
});

/**
 * Require ownership again immediately before the native write.
 * @param {object} actor
 * @param {object} user
 */
function requireOwner(actor, user) {
  if (actor?.type!=="character"||actor.isOwner!==true||actor.limited||(actor.canUserModify&&user&&!actor.canUserModify(user, "update"))) throw Error("Você não tem permissão para alterar este destino.");
}
/**
 * Reject stale dialogs and queued operations.
 * @param {object} actor
 * @param {number} expectedRevision
 */
function checkRevision(actor, expectedRevision) {
  if (expectedRevision!==undefined&&destinyState(actor).revision!==expectedRevision) throw Error("O destino mudou; abra o registro novamente.");
}
/**
 * Validate bounded narrative fields without interpreting them as HTML.
 * @param {*} value
 * @param {string} label
 * @param {object} root0
 * @param {boolean} root0.optional
 * @returns {string}
 */
function text(value, label, {optional=false}={}) {
  if (optional&&(value===undefined||value===null)) return "";
  if (typeof value!=="string"||(!optional&&!value.trim())) throw Error(`Informe ${label}.`);
  return value.trim().slice(0, 10000);
}
/**
 * Validate the declared cultivation realm independently of manual rarity.
 * @param {*} value
 * @param {object} state
 * @returns {number}
 */
function realm(value, state) {
  const rank=Number(value);
  if (value===null||value===""||typeof value==="boolean"||!Number.isInteger(rank)||rank<1||rank>state.rank) throw Error("O registro exige um reino de cultivo já alcançado, até o reino atual.");
  return rank;
}
/**
 * Accept only the existing named rarities and qualities.
 * @param {string} rarity
 * @param {string} quality
 * @returns {object}
 */
function classification(rarity, quality) {
  if (!MANUAL_RANKS.some(entry => entry.value===rarity)||!MANUAL_QUALITIES.some(entry => entry.value===quality)) throw Error("Confira a raridade e a qualidade da classificação.");
  return {rarity, quality};
}
/**
 * Record narrative duties once without changing constitutions or resources.
 * @param {object} raw
 * @param {string} key
 * @param {Function} idFactory
 */
function obligation(raw, key, idFactory) {
  const records=recordsOf(raw);
  const kind=key==="immortal-soul"?"resource-obligation":key==="reincarnated"?"reincarnated-obligation":null;
  if (!kind||records.some(entry => entry.kind===kind)) return;
  records.push(key==="immortal-soul"
    ?{id: idFactory(), kind, name: "Metade dos recursos adquiridos", text: "Entregue metade dos recursos adquiridos para nutrir a alma do mestre. Cada entrega concreta deve ser confirmada pelo narrador; nenhum recurso é retirado automaticamente."}
    :{id: idFactory(), kind, name: "Constituição inicial — Humano Inferior", initialRarity: "humano", initialQuality: "inferior", resourceMultiplier: 2, text: "A constituição deve começar em Humano Inferior e exige o dobro de recursos para evoluir. Uma constituição já existente é preservada; a adequação e os recursos concretos devem ser tratados com o narrador."});
  raw.records=records;
}
/**
 * Copy only the chosen authored lineage, without racial grants or weaknesses.
 * @param {object} lineage
 * @param {object} actor
 * @param {Function} idFactory
 * @returns {object}
 */
function lineageGrant(lineage, actor, idFactory) {
  const canonical=speciesDocuments().find(item => item.type==="feat"&&item.flags?.[SCOPE]?.speciesLineage&&item.name===lineage.name);
  if (!canonical) throw Error("A característica nativa desta linhagem não está disponível.");
  const source=copy(canonical);
  source._id=idFactory(); delete source.folder; delete source._stats;
  source.system.advancement={};
  source.system.description.value=source.system.description.value.replace(/<p>Fraquezas:[\s\S]*?<\/p>/gi, "");
  source.flags[SCOPE].cultivationDestinyGrant={version: 1, key: "divine-lineage", lineageId: lineage.id, actorUuid: actor.uuid??actor.id};
  source.flags[SCOPE].featureSection="jj-combat";
  return source;
}
/**
 * Reconcile only this actor’s grants, preserving existing native lineage items.
 * @param {object} actor
 * @param {object} state
 * @param {Function} idFactory
 * @returns {object}
 */
function grantPlan(actor, state, idFactory) {
  const own=itemsOf(actor).filter(item => ownGrant(actor, item));
  const desired=state.active&&state.key==="divine-lineage"&&state.unlocked?lineageDefinition(state.lineageId):null;
  const existing=desired?own.filter(item => grantOf(item).lineageId===desired.id):[];
  const personal=desired&&itemsOf(actor).some(item => !ownGrant(actor, item)&&item.type==="feat"&&item.flags?.[SCOPE]?.speciesLineage&&item.flags[SCOPE].speciesFeature===desired.name);
  const keep=!personal?existing[0]:null;
  return {
    create: desired&&!personal&&!keep?[lineageGrant(desired, actor, idFactory)]:[],
    delete: own.filter(item => item!==keep).map(item => item.id??item._id)
  };
}
/**
 * Create the native essence schema without inventing creature statistics or powers.
 * @param {object} actor
 * @param {object} state
 * @param {string} ability
 * @param {Function} idFactory
 * @returns {object}
 */
function essenceItem(actor, state, ability, idFactory) {
  const lineage=lineageDefinition(state.lineageId);
  const native=speciesDocuments().find(item => item.name===lineage.name&&item.flags?.[SCOPE]?.speciesLineage);
  const definition={version: 1, id: idFactory(), name: lineage.name, img: ESSENCE_ART, sourceActorUuid: "", sourceRealm: null, growth: "supreme", growthOrigin: "divine", growthRoll: null, ability, elements: [...state.elements], lineageId: lineage.id,
    tokenTexture: "", taxonomy: null, archetype: null, naturalWeapons: [], features: [], attacks: [], normalFeatures: [], weakenedFeatures: [], normalAttacks: [], weakenedAttacks: [], destinyOrigin: {actorUuid: actor.uuid??actor.id, key: "divine-lineage", lineageId: lineage.id}};
  return {_id: idFactory(), name: `Essência de Besta — ${lineage.name}`, type: "loot", img: definition.img, system: {type: {value: "material"}, quantity: 1, description: {value: `<p>Essência de Besta de <strong>${escape(lineage.name)}</strong>, de Rank Supremo, recebida pela Linhagem Divina.</p><p>Atributo escolhido: ${escape(ABILITY_LABELS[ability])}. A integração e os poderes ficam disponíveis no Núcleo Rotativo, ou imediatamente para Meio Monstro. A integração usa o descanso longo e os custos normais de Essência de Besta.</p><p>Os benefícios da linhagem são apresentados na característica correspondente.</p>`, chat: ""}}, flags: {[SCOPE]: {beastEssenceItem: {version: 1, definition}, cultivationDestinyEssence: {version: 1, actorUuid: actor.uuid??actor.id, lineageId: lineage.id}}}};
}

/**
 * Commit grants, receipts and metadata together through the native actor boundary.
 * @param {object} root0
 * @param {Function|object} root0.user
 * @param {Function} root0.idFactory
 * @param {Function} root0.commit
 * @returns {object}
 */
export function createCultivationDestinyRuntime({
  user=() => globalThis.game?.user,
  idFactory=() => globalThis.foundry?.utils?.randomID?.()??globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, 16),
  commit=(actor, updates) => actor.performBulkUpdate(updates, {isEnergySystem: true, cultivationDestinyUpdate: true})
}={}) {
  const allowed=actor => requireOwner(actor, typeof user==="function"?user():user);
  const locked=async (actor, action, callback) => {
    allowed(actor);
    return withElementalActorLock(actor, `cultivation-destiny:${action}`, async () => {allowed(actor); return callback();});
  };
  const apply=async (actor, updates, revision) => {
    allowed(actor); checkRevision(actor, revision);
    await commit(actor, updates); return updates;
  };
  return {
    select(actor, input={}, options={}) {
      return locked(actor, "select", async () => {
        options.authorize?.();const revision=destinyState(actor).revision;
        const patch=prepareDestinySelection(actor, input, options);
        const raw=copy(patch[PATH]);
        const state=destinyState(preview(actor, raw));
        if (state.key==="divine-lineage"&&!ABILITIES.has(input.ability)) throw Error("Escolha o atributo principal desta essência; ele não é inferido da criatura.");
        obligation(raw, state.key, idFactory);
        const grants=grantPlan(actor, state, idFactory);
        const receipts=Array.isArray(raw.essenceReceipts)?copy(raw.essenceReceipts):[];
        if (state.key==="divine-lineage"&&!receipts.length) {
          const item=essenceItem(actor, state, input.ability, idFactory); grants.create.push(item);
          receipts.push({
            id: item.flags[SCOPE].beastEssenceItem.definition.id, itemId: item._id,
            lineageId: state.lineageId, ability: input.ability
          });
          raw.essenceReceipts=receipts;
        }
        options.authorize?.();return apply(actor, {actor: {[PATH]: raw}, ...grants}, revision);
      });
    },
    sync(actor) {
      return locked(actor, "sync", async () => {
        const state=destinyState(actor); const own=itemsOf(actor).some(item => ownGrant(actor, item));
        if ((!rawOf(actor).key||state.revision<1)&&!own) return false;
        const plan=grantPlan(actor, state, idFactory);
        if (!plan.create.length&&!plan.delete.length) return false;
        return apply(actor, {actor: {}, ...plan}, state.revision);
      });
    },
    record(actor, input={}, options={}) {
      return locked(actor, "record", async () => {
        options.authorize?.();const state=destinyState(actor); if (!state.active||!state.key) throw Error("Escolha o destino antes de registrar suas entregas.");
        checkRevision(actor, options.expectedRevision??input.expectedRevision);
        const raw=copy(rawOf(actor)); const records=recordsOf(raw); const kind=input.kind;
        if (!["combat-manual", "cultivation-manual", "resource-contribution", "legacy-exchange"].includes(kind)) throw Error("Escolha um tipo de registro válido para seu destino.");
        if (input.confirmedByNarrator!==true) throw Error("Confirme com o narrador a entrega ou troca concreta antes de registrá-la.");
        const entry={id: idFactory(), kind, name: text(input.name, "o nome recebido"), confirmedByNarrator: true, story: text(input.story, "o relato", {optional: true})};
        if (kind==="legacy-exchange") {
          if (state.key!=="supreme-legacy"||state.rank<3) throw Error("O legado só permite trocas a partir do Reino do Núcleo Rotativo.");
          Object.assign(entry, classification(input.rarity, input.quality), {rank: realm(input.rank, state), offeredName: text(input.offeredName, "o nome do tesouro oferecido")});
          classification(input.offeredRarity, input.offeredQuality);
          if (input.offeredRarity!==entry.rarity||input.offeredQuality!==entry.quality) throw Error("Os tesouros devem ter a mesma raridade e qualidade, de rank equivalente.");
          Object.assign(entry, {
            offeredRarity: input.offeredRarity, offeredQuality: input.offeredQuality, personalUseOnly: true
          });
        } else {
          if (state.key!=="immortal-soul") throw Error("Este registro de ensinamento ou entrega pertence à Alma Imortal.");
          if (kind!=="resource-contribution") {
            Object.assign(entry, classification(input.rarity, input.quality), {rank: realm(input.rank, state)});
            if (kind==="combat-manual"&&records.some(record => record.kind==="combat-manual"&&Number(record.rank)===entry.rank)) throw Error("O manual de combate deste reino já foi registrado.");
            if (kind==="cultivation-manual") {
              if (records.filter(record => record.kind==="cultivation-manual").length>=2) throw Error("As duas concessões de Manuais de Cultivo já foram registradas.");
              const index=MANUAL_RANKS.findIndex(rank => rank.value===entry.rarity); const cap=MANUAL_RANKS.findIndex(rank => rank.value==="divino");
              if (index>cap||(index===cap&&entry.quality!=="inferior")) throw Error("O limite de concessão é Divino Inferior.");
              entry.compatible=true; entry.capDivinoInferior=true;
            }
          }
        }
        records.push(entry); raw.records=records; raw.revision=state.revision+1;
        options.authorize?.();await apply(actor, {actor: {[PATH]: raw}}, state.revision); return entry;
      });
    }
  };
}
const native=createCultivationDestinyRuntime();
export const selectCultivationDestiny=(actor, input, options) => dispatchCultivationDestiny(actor,'select',input,options);
export const syncCultivationDestiny=actor => native.sync(actor);
export const recordCultivationDestiny=(actor, input, options) => dispatchCultivationDestiny(actor,'record',input,options);
const registrations=new WeakSet();
/**
 * Reconcile native feats on the elected owner; hooks never deliver an essence.
 * @param {object} hooks
 * @param {object} root0
 * @param {object} root0.runtime
 * @param {Function} root0.mayProcess
 * @param {Function} root0.actors
 */
export function registerCultivationDestinyRuntime(hooks=globalThis.Hooks, {
  runtime=native, mayProcess=mayExecuteBeastEssence, actors=() => globalThis.game?.actors??[]
}={}) {
  if (!hooks||registrations.has(hooks)) return; registrations.add(hooks);
  const reconcile=actor => {
    if (actor?.type!=="character"||actor.isOwner!==true||!mayProcess(actor)) return;
    if (!rawOf(actor).key&&!itemsOf(actor).some(grantOf)) return;
    return runtime.sync(actor).catch(error => {console.error("Immortals | Destino de Cultivo", error); globalThis.ui?.notifications?.warn?.(error.message);});
  };
  hooks.on("ready", async () => {if(runtime===native)registerCultivationDestinyAuthority(native);for (const actor of actors()) await reconcile(actor);});
  hooks.on("updateActor", (actor, _changes, options) => {if (options?.cultivationDestinyUpdate) return; return reconcile(actor);});
  for(const event of ["createItem","updateItem","deleteItem"])hooks.on(event,(item,changesOrOptions,options)=>{const opts=event==="updateItem"?options:changesOrOptions;if(opts?.cultivationDestinyUpdate)return;const actor=item.actor??item.parent;if(["class","race"].includes(item.type)||item.flags?.[SCOPE]?.speciesLineage||grantOf(item))return reconcile(actor);});
}
