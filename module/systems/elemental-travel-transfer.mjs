/** Native cross-scene transfer of a Token, including its synthetic ActorDelta. */
const S='Immortals-system', FLAG='flags.'+S;
const clone=value=>structuredClone(value);
const values=collection=>Array.from(collection?.values?.()??collection??[]);
const documentName=doc=>doc?.documentName??doc?.constructor?.documentName;
const different=(a,b)=>JSON.stringify(a)!==JSON.stringify(b);

/** Rewrite complete UUIDs and descendant UUIDs, including UUID-keyed elemental maps. */
export function rebaseElementalTransitReferences(value,oldUuid,newUuid,actorUuid){
 const rewrite=text=>{
  if(text===oldUuid)return newUuid;
  const prefix=actorUuid??oldUuid;
  return prefix.startsWith(oldUuid+'.')||prefix===oldUuid?(text===prefix||text.startsWith(prefix+'.')?newUuid+text.slice(oldUuid.length):text):text;
 };
 if(typeof value==='string')return rewrite(value);
 if(Array.isArray(value))return value.map(entry=>rebaseElementalTransitReferences(entry,oldUuid,newUuid,actorUuid));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,entry])=>[rewrite(key),rebaseElementalTransitReferences(entry,oldUuid,newUuid,actorUuid)]));
}
function rebaseDocument(data,type,oldUuid,newUuid,actorUuid){
 const result=clone(data);
 if(data.flags?.[S]){const scope=rebaseElementalTransitReferences(data.flags[S],oldUuid,newUuid,actorUuid);result.flags[S]=scope;}
 if(type==='ActiveEffect'&&typeof data.origin==='string')result.origin=rebaseElementalTransitReferences(data.origin,oldUuid,newUuid,actorUuid);
 if(type==='Token'&&data.delta)result.delta=rebaseDocument(data.delta,'ActorDelta',oldUuid,newUuid,actorUuid);
 if(['Actor','ActorDelta'].includes(type))for(const [field,childType]of [['items','Item'],['effects','ActiveEffect']])if(Array.isArray(data[field]))result[field]=data[field].map(child=>rebaseDocument(child,childType,oldUuid,newUuid,actorUuid));
 if(type==='Item'&&Array.isArray(data.effects))result.effects=data.effects.map(child=>rebaseDocument(child,'ActiveEffect',oldUuid,newUuid,actorUuid));
 return result;
}
function replace(value){
 const operator=globalThis.foundry?.data?.operators?.ForcedReplacement;
 if(!operator?.create)throw Error('A substituição nativa de dados não está disponível.');
 return operator.create(value);
}
/** Native ObjectField updates merge leaf changes. Only literal UUID-keyed maps require replacement. */
function referencePatch(before,after){
 if(!different(before,after))return undefined;
 if(!before||!after||typeof before!=='object'||typeof after!=='object'||Array.isArray(before)||Array.isArray(after))return clone(after);
 const keys=new Set([...Object.keys(before),...Object.keys(after)]);
 if([...keys].some(key=>key.includes('.')))return replace(after);
 const patch={};for(const key of keys){if(!Object.hasOwn(after,key))patch['-='+key]=null;else{const change=referencePatch(before[key],after[key]);if(change!==undefined)patch[key]=change;}}
 return patch;
}
function documentReferenceChanges(source,type,oldUuid,newUuid,actorUuid){
 const changes={};
 if(source.flags?.[S]){const patch=referencePatch(source.flags[S],rebaseElementalTransitReferences(source.flags[S],oldUuid,newUuid,actorUuid));if(patch!==undefined)changes.flags={[S]:patch};}
 if(type==='ActiveEffect'&&typeof source.origin==='string'){const origin=rebaseElementalTransitReferences(source.origin,oldUuid,newUuid,actorUuid);if(origin!==source.origin)changes.origin=origin;}
 if(type==='Item'&&Array.isArray(source.effects)){const effects=[];for(const effect of source.effects){const patch=documentReferenceChanges(effect,'ActiveEffect',oldUuid,newUuid,actorUuid);if(Object.keys(patch).length)effects.push({_id:effect._id,...patch});}if(effects.length)changes.effects=effects;}
 return changes;
}
export function elementalTransitDestinationLevel(scene,requested){
 const level=requested??scene?.initialLevel?.id;
 if(!level||!scene?.levels?.has?.(level))throw Error('O nível de chegada não existe mais na cena de destino.');
 return level;
}
export function elementalTransitActorOperation(actor,updates){
 return actor.parent?.delta?{action:'update',documentName:'ActorDelta',parent:actor.parent,updates:[{_id:actor.parent.delta.id,...updates}]}:
  {action:'update',documentName:'Actor',updates:[{_id:actor.id,...updates}]};
}
function completedScope(actor,id,transit,arrivalUuid,completedAt){
 const scope=clone(actor.flags?.[S]??{}),record=scope.elementalCalendarEffects[id];
 scope.elementalCalendarEffects[id]={...record,status:'ended',transit:{...transit,status:'complete',completedAt,arrivalTokenUuid:arrivalUuid}};
 return scope;
}
function referenceOperations(actor,sourceToken,oldUuid,newUuid,scopeOverride){
 const operations=[],seen=new Set();
 function visit(doc){
  if(!doc||!doc.uuid||seen.has(doc.uuid)||doc.uuid===sourceToken.uuid||!sourceToken.actorLink&&(doc.uuid===actor.uuid||doc.uuid.startsWith(actor.uuid+'.')))return;
  seen.add(doc.uuid);
  const type=documentName(doc),changes={};
  const scope=doc.uuid===actor.uuid&&scopeOverride?scopeOverride:doc.flags?.[S];
  if(scope){const rebased=rebaseElementalTransitReferences(scope,oldUuid,newUuid,actor.uuid),patch=referencePatch(doc.flags?.[S]??{},rebased);if(patch!==undefined)changes[FLAG]=patch;}
  if(type==='ActiveEffect'&&typeof doc.origin==='string'){const origin=rebaseElementalTransitReferences(doc.origin,oldUuid,newUuid,actor.uuid);if(origin!==doc.origin)changes.origin=origin;}
  if(type==='Actor'&&doc.parent?.delta){
   // ActorDelta updates also materialize changed inherited children, without replacing its tombstones.
   for(const [field,childType]of [['items','Item'],['effects','ActiveEffect']]){
    const children=[];for(const child of values(doc[field])){const source=child.toObject(),patch=documentReferenceChanges(source,childType,oldUuid,newUuid,actor.uuid);if(Object.keys(patch).length)children.push({_id:child.id,...patch});}
    if(children.length)changes[field]=children;
   }
   if(Object.keys(changes).length)operations.push(elementalTransitActorOperation(doc,changes));
   return;
  }
  if(Object.keys(changes).length)operations.push({action:'update',documentName:type,...(doc.parent?{parent:doc.parent}:{}),updates:[{_id:doc.id,...changes}]});
  for(const field of ['items','effects','tokens','drawings','templates','regions','behaviors','tiles','notes','lights','sounds','walls','combatants','groups'])for(const child of values(doc[field]))visit(child);
  if(type==='Token'&&!doc.actorLink)visit(doc.actor);
 }
 const game=globalThis.game;
 for(const field of ['actors','scenes','messages','items','combats'])for(const doc of values(game?.[field]))visit(doc);
 // The linked source actor may not be loaded in a world collection in a test or an unusual client context.
 if(sourceToken.actorLink)visit(actor);
 return operations;
}

/** The core's batch is atomic; cancellation or failure preserves the source and all external references. */
export function prepareElementalSceneTransfer(actor,token,scene,id,transit,completedAt){
 let tokenId=token.id;
 for(let attempt=0;!tokenId||scene.tokens.has(tokenId);attempt++){
  if(attempt>=50)throw Error('Não foi possível reservar um identificador livre para a chegada.');
  tokenId=globalThis.foundry?.utils?.randomID?.();
 }
 const level=elementalTransitDestinationLevel(scene,transit.destination.level);
 const arrivalUuid=scene.uuid+'.Token.'+tokenId,oldUuid=token.uuid;
 const scope=completedScope(actor,id,transit,arrivalUuid,completedAt);
 const source=token.toObject(),data=rebaseDocument(source,'Token',oldUuid,arrivalUuid,actor.uuid);
 Object.assign(data,{_id:tokenId,x:transit.destination.x,y:transit.destination.y,elevation:transit.destination.elevation,level,hidden:transit.previousHidden??false});
 data.flags??={};data.flags[S]??={};
 // Keep the original identities in this receipt, so a stale source actor can recognize an already-applied batch.
 data.flags[S].elementalArrival={id,sourceActorUuid:actor.uuid,sourceTokenUuid:token.uuid};
 if(!token.actorLink){
  data.delta??={};data.delta.flags??={};
  data.delta.flags[S]=rebaseElementalTransitReferences(scope,oldUuid,arrivalUuid,actor.uuid);
  // A changed inherited Item/Effect must enter the delta; the remaining raw delta and tombstones stay intact.
  for(const [field,type]of [['items','Item'],['effects','ActiveEffect']])for(const child of values(actor[field])){
   const raw=child.toObject(),rebased=rebaseDocument(raw,type,oldUuid,arrivalUuid,actor.uuid);if(!different(raw,rebased))continue;
   data.delta[field]??=[];const index=data.delta[field].findIndex(entry=>entry._id===child.id);
   if(index>=0)data.delta[field][index]=rebased;else data.delta[field].push(rebased);
  }
 }
 const operations=[{action:'create',documentName:'Token',parent:scene,data:[data],keepId:true},
  ...referenceOperations(actor,token,oldUuid,arrivalUuid,token.actorLink?scope:null),
  {action:'delete',documentName:'Token',parent:token.parent,ids:[token.id],replacements:{[token.id]:arrivalUuid}}];
 return {operations,arrivalUuid,tokenId};
}
