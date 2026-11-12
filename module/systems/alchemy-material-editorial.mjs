import {configureCompendium, withCompendiumWrite} from './compendium-configuration.mjs';
const PACK_ID = 'Immortals-system.materiais';
const SCOPE = 'Immortals-system';
const pending = new WeakMap();
const registrations = new WeakSet();
const ownedPending = new WeakMap();
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);

async function loadEditorial() {
  const path = 'systems/Immortals-system/json/alchemy-material-editorial.json';
  const url = globalThis.foundry?.utils?.getRoute?.(path) ?? path;
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error('Não foi possível ler a revisão dos materiais.');
  return response.json();
}

const sourceOf=item=>item?.toObject?.()??item;
function referenceId(item){
 const source=sourceOf(item),uuid=source?._stats?.compendiumSource??item?.sourceId??source?.flags?.core?.sourceId;
 return typeof uuid==='string'?/^Compendium\.Immortals-system\.materiais\.(?:Item\.)?([A-Za-z0-9]{16})$/.exec(uuid)?.[1]:undefined;
}
/** Only exact canonical versions are revised; commercial-unit paragraphs and narrator edits survive. */
export function prepareAlchemyMaterialEditorialUpdate(item, reference, {unitHtmls=[],unitHtml,allowOwnedCopy=false}={}) {
 const source=sourceOf(item),id=source?._id??source?.id;
 if(!id||!reference?._id||(allowOwnedCopy?referenceId(item)!==reference._id:id!==reference._id)
  ||source.type!=='loot'||source.system?.type?.value!=='material'||!(source.flags?.[SCOPE]?.alchemyMaterial||source.flags?.[SCOPE]?.oreMaterial||source.flags?.[SCOPE]?.reagentMaterial))return null;
 const update={_id:id},after=reference.after??{},versions=[reference.before,...(Array.isArray(reference.history)?reference.history:[]),reference.after].filter(Boolean);
 if(typeof after.name==='string'&&after.name.trim()&&after.name!==source.name&&versions.some(v=>v.name===source.name))update.name=after.name;
 const current=source.system?.description?.value;
 if(typeof current==='string'&&typeof after.descriptionHtml==='string'&&after.descriptionHtml.trim()){
  for(const version of versions){
   if(typeof version.descriptionHtml!=='string'||!version.descriptionHtml)continue;
   const suffix=current===version.descriptionHtml?'':Array.isArray(unitHtmls)?unitHtmls.find(unit=>typeof unit==='string'&&unit&&current===version.descriptionHtml+unit):undefined;
   if(suffix===undefined)continue;
   const revised=after.descriptionHtml+(suffix||(typeof unitHtml==='string'?unitHtml:''));if(revised!==current)update['system.description.value']=revised;break;
  }
 }
 return Object.keys(update).length>1?update:null;
}

export async function ensureAlchemyMaterialEditorial({game = globalThis.game, Item = globalThis.Item,
  load = loadEditorial} = {}) {
  if (!activeGM(game)) return {updated: 0};
  const pack = game.packs?.get?.(PACK_ID);
  if (!pack || pack.documentName !== 'Item') return {updated: 0};
  if (pending.has(pack)) return pending.get(pack);
  const work = withCompendiumWrite(pack, async () => {
    const catalogue = await load();
    if (!Array.isArray(catalogue.entries)) throw new Error('Catálogo editorial de materiais inválido.');
    const references = new Map(catalogue.entries.map(entry => [entry._id, entry]));
    const index = list(await pack.getIndex({fields: ['type', 'system.type.value', 'system.description.value',
      'flags.' + SCOPE + '.alchemyMaterial','flags.' + SCOPE + '.oreMaterial','flags.' + SCOPE + '.reagentMaterial']}));
    const updates = index.map(item => prepareAlchemyMaterialEditorialUpdate(item, references.get(item._id ?? item.id), {unitHtmls:catalogue.unitHtmls,unitHtml:catalogue.unitHtml})).filter(Boolean);
    if (!updates.length || !activeGM(game)) return {updated: 0};
    const locked = pack.locked;
    let updated = 0;
    try {
      if (locked) await configureCompendium(pack, {locked: false});
      for (let offset = 0; offset < updates.length; offset += 200) {
        if (!activeGM(game)) break;
        const batch = updates.slice(offset, offset + 200);
        await (Item?.implementation ?? Item).updateDocuments(batch, {pack: pack.collection});
        updated += batch.length;
      }
      return {updated};
    } finally {
      if (locked) await configureCompendium(pack, {locked: true});
    }
  });
  pending.set(pack, work);
  try { return await work; }
  finally { if (pending.get(pack) === work) pending.delete(pack); }
}

/** Refresh proven native copies too; only text fields of owned stock materials can be changed. */
export async function ensureOwnedAlchemyMaterialEditorial({game=globalThis.game,load=loadEditorial}={}){
 if(!activeGM(game))return {actors:0,items:0};
 if(ownedPending.has(game))return ownedPending.get(game);
 const task=(async()=>{
  const catalogue=await load();if(!Array.isArray(catalogue.entries))throw Error('Catálogo editorial de materiais inválido.');
  const refs=new Map(catalogue.entries.map(e=>[e._id,e])),actors=new Map();
  for(const actor of list(game.actors))if(actor)actors.set(actor.uuid??actor,actor);
  for(const scene of list(game.scenes))for(const token of list(scene.tokens)){const actor=token.actor;if(actor)actors.set(actor.uuid??actor,actor);}
  const result={actors:0,items:0};
  for(const actor of actors.values()){
   if(!activeGM(game))break;
   if(!['character','npc'].includes(actor.type)||actor.isOwner!==true||actor.limited||typeof actor.updateEmbeddedDocuments!=='function')continue;
   const updates=list(actor.items).filter(item=>item.isOwner!==false&&!item.limited).map(item=>{
    const ref=refs.get(referenceId(item));
    return prepareAlchemyMaterialEditorialUpdate(item,ref,{unitHtmls:catalogue.unitHtmls,unitHtml:catalogue.unitHtml,allowOwnedCopy:true});
   }).filter(Boolean);
   if(!updates.length)continue;
   await actor.updateEmbeddedDocuments('Item',updates);result.actors++;result.items+=updates.length;
  }
  return result;
 })();ownedPending.set(game,task);try{return await task;}finally{if(ownedPending.get(game)===task)ownedPending.delete(game);}
}

export function registerAlchemyMaterialEditorial(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== 'function' || registrations.has(hooks)) return;
  registrations.add(hooks);
  hooks.once('ready', async () => {
    try {
      let catalogue;const load=async()=>catalogue??=await loadEditorial();
      await ensureAlchemyMaterialEditorial({load});
      await ensureOwnedAlchemyMaterialEditorial({load});
    }
    catch (error) {
      console.error('Immortals Legacy | Revisão de Materiais', error);
      globalThis.ui?.notifications?.warn?.('Não foi possível atualizar os textos de Materiais: '
        + (error?.message ?? String(error)));
    }
  });
}
