import {syncElementalFeatures} from "./elemental-feature-sync.mjs";
import {soulPathDocuments} from "./soul-path-content.mjs";
import {bodyPathDocuments} from "./body-path-content.mjs";
import {cultivationRankDocuments} from "./cultivation-rank-content.mjs";
import { cultivatorClassDocument, cultivatorFeatureDocuments, CULTIVATOR_LEGACY_GRANT_ID } from "./cultivator-content.mjs";
export const CULTIVATOR_UUID = "Immortals.Cultivador";
const SCOPE = "Immortals-system";
const pending = new WeakMap();

/** Internal class definition shared by creation and integrated sheets. */
export function cultivatorClassData(level=1) {
  const {_id,folder,...data}=cultivatorClassDocument(level);
  return data;
}
export function cultivatorDefinition() { return { ...cultivatorClassData(), uuid: CULTIVATOR_UUID }; }

/** Only the automatically seeded level-one class may coexist with an unfinished creation draft. */
export function hasOnlyCultivatorClass(actor) {
  return Array.from(actor.items ?? []).every(item => item.type === "class"
    && (item.getFlag?.(SCOPE, "cultivator") ?? item.flags?.[SCOPE]?.cultivator) === true
    && Number(item.system?.levels ?? 1) === 1) && (actor.items?.size ?? actor.items?.length ?? 0) <= 1;
}

/** Seed source data before persistence; never modify imported or duplicated characters. */
export function seedCultivatorClass(actor, data, options, userId) {
  if (actor.type !== "character" || !actor.isOwner || userId !== game.user.id || typeof actor.updateSource !== "function"
    || data._stats?.compendiumSource || data._stats?.duplicateSource || actor._stats?.compendiumSource || actor._stats?.duplicateSource
    || options.fromCompendium || options.keepId || options.noHook) return;
  const items = data.items ?? actor._source?.items ?? [];
  if (items.some(item => item.type === "class")) return;
  const cls = cultivatorClassData();
  cls._id = foundry.utils.randomID();
  actor.updateSource({ items: [...items, cls], "system.details.originalClass": cls._id });
}

/** Initialize existing empty sheets once; preserve every mechanic on an existing primary class. */
export async function ensureCultivatorClass(actor) {
  if (actor.type !== "character" || !actor.isOwner || actor.limited || actor.pack || actor.compendium) return null;
  if (pending.has(actor)) return pending.get(actor);
  const operation = (async () => {
    const classes = actor.itemTypes?.class ?? Array.from(actor.items ?? []).filter(item => item.type === "class");
    const cls = classes.find(item => item.getFlag?.(SCOPE, "legacy2") ?? item.flags?.[SCOPE]?.legacy2) ?? classes[0];
    if (cls) {
      const managed=cls.getFlag?.(SCOPE,"cultivator")??cls.flags?.[SCOPE]?.cultivator;
      const version=cls.getFlag?.(SCOPE,"cultivatorVersion")??cls.flags?.[SCOPE]?.cultivatorVersion;
      if(managed&&Number(version??0)<2){
        const canonical=cultivatorClassData();
        const patch={name:"Cultivador","system.description.value":canonical.system.description.value,
          ["flags."+SCOPE+".cultivatorVersion"]:2,
          ["flags."+SCOPE+".legacy2"]:{...(cls.getFlag?.(SCOPE,"legacy2")??cls.flags?.[SCOPE]?.legacy2),...canonical.flags[SCOPE].legacy2}};
        const previous=cls.getFlag?.(SCOPE,"legacy2")??cls.flags?.[SCOPE]?.legacy2;
        if(Number(version)>=1&&typeof previous?.atributoPrincipal==="string"&&canonical.flags[SCOPE].legacy2.atributoPrincipal.includes(previous.atributoPrincipal))
          patch["flags."+SCOPE+".legacy2"].atributoPrincipal=previous.atributoPrincipal;
        for(const[id,grant]of Object.entries(canonical.system.advancement))patch["system.advancement."+id]={...grant,value:cls.system?.advancement?.[id]?.value??grant.value};
        await cls.update(patch,{render:false});
      }else if(cls.name!=="Cultivador")await cls.update({name:"Cultivador"},{render:false});
      await migrateLegacyCultivatorGrants(actor);
      await syncElementalFeatures(actor);
      return cls;
    }
    const created = await actor.createEmbeddedDocuments("Item", [cultivatorClassData(actor.system?.details?.level)],
      { isAdvancement: true, render: false });
    await syncElementalFeatures(actor);
    return created[0] ?? null;
  })();
  pending.set(actor, operation);
  try { return await operation; }
  finally { if (pending.get(actor) === operation) pending.delete(actor); }
}

const migrationQueues=new WeakMap();
const ruleDocuments=[...cultivatorFeatureDocuments(),...cultivationRankDocuments(),...bodyPathDocuments(),...soulPathDocuments()];
const ruleIds=new Set(ruleDocuments.map(doc=>doc._id));
const ruleKeys=new Set(ruleDocuments.map(doc=>doc.flags[SCOPE].cultivatorFeature));
const itemId=item=>item.id??item._id;
const internalReference=uuid=>typeof uuid==="string"&&uuid.startsWith("Compendium.Immortals-system.geral.Item.")&&ruleIds.has(uuid.split(".").at(-1));
const eligible=actor=>actor?.type==="character"&&actor.isOwner&&!actor.limited&&!actor.pack&&!actor.compendium&&!String(actor.uuid??"").startsWith("Compendium.");
/** Retire only previously automatic rule grants; manual copies and ItemChoice selections survive. */
export async function migrateLegacyCultivatorGrants(actor){
 if(!eligible(actor))return {deleted:0,updated:0};
 if(migrationQueues.has(actor))return migrationQueues.get(actor);
 const operation=(async()=>{
  const items=Array.from(actor.items??[]),classes=items.filter(item=>item.type==="class"&&item.flags?.[SCOPE]?.cultivator===true);
  const origins=new Set(),added=new Set(),patches=[];
  for(const cls of classes){
   const advancement=cls._source?.system?.advancement??cls.system?._source?.advancement??cls.system?.advancement??{};
   const grant=advancement[CULTIVATOR_LEGACY_GRANT_ID],patch={};
   if(grant?.type==="ItemGrant"){
    const configured=grant.configuration?.items??[],owned=grant.value?.added??{};
    const internal=configured.some(entry=>internalReference(typeof entry==="string"?entry:entry.uuid))||Object.values(owned).some(internalReference);
    if(internal){
     origins.add(itemId(cls)+"."+CULTIVATOR_LEGACY_GRANT_ID);
     for(const[id,uuid]of Object.entries(owned))if(internalReference(uuid))added.add(id);
     const retained=configured.filter(entry=>!internalReference(typeof entry==="string"?entry:entry.uuid));
     const retainedAdded=Object.fromEntries(Object.entries(owned).filter(([,uuid])=>!internalReference(uuid)));
     if(retained.length||Object.keys(retainedAdded).length){const next=structuredClone(grant);next.configuration={...next.configuration,items:retained};next.value={...next.value,added:retainedAdded};patch["system.advancement."+CULTIVATOR_LEGACY_GRANT_ID]=next;}
     else patch["system.advancement.-="+CULTIVATOR_LEGACY_GRANT_ID]=null;
    }
   }
   if(Number(cls.flags?.[SCOPE]?.cultivatorVersion??0)<3)patch["flags."+SCOPE+".cultivatorVersion"]=3;
   if(Object.keys(patch).length)patches.push([cls,patch]);
  }
  const remove=items.filter(item=>{
   if(item.type!=="feat")return false;
   const flags=item.flags?.[SCOPE]??{},known=ruleKeys.has(flags.cultivatorFeature),source=item._stats?.compendiumSource??item._source?._stats?.compendiumSource;
   const explicit=known&&(flags.bodyPathManaged===true||flags.soulPathManaged===true||flags.cultivationRankManaged===true);
   const linked=(origins.has(flags.advancementOrigin)||origins.has(flags.advancementRoot))&&(known||internalReference(source));
   return explicit||linked||added.has(itemId(item));
  }).map(itemId);
  // Remove owned auto-grants before their provenance is retired, so failed deletes can be retried safely.
  if(remove.length)await actor.deleteEmbeddedDocuments("Item",remove,{render:false,isAdvancement:true});
  for(const[cls,patch]of patches)await cls.update(patch,{render:false});
  return {deleted:remove.length,updated:patches.length};
 })();
 migrationQueues.set(actor,operation);
 try{return await operation;}finally{if(migrationQueues.get(actor)===operation)migrationQueues.delete(actor);}
}
