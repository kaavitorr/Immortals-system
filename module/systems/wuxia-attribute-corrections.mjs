/** Narrow compatibility corrections for the retired Espírito attribute, preserving spirit-themed fiction. */
const S='Immortals-system';
const oldNote='A fonte exige Salvaguarda de Espírito, atributo que não existe na ficha atual. Confirmar qual salvaguarda deve substituí-la antes de automatizar o efeito.';
const replacements=[
 ['Espírito — confirme a salvaguarda atual com o narrador.','Intelecto (Reflexo); CD definida pelo narrador.'],
 ['Confirme o acerto e a salvaguarda equivalente a Espírito antes de aplicar Atordoado; a fonte não fornece CD nem alcance.','Confirme o acerto e a salvaguarda de Intelecto (Reflexo) antes de aplicar Atordoado; a fonte não fornece CD nem alcance.'],
 ['As salvaguardas de Espírito, Sabedoria e Presença da fonte exigem escolha explícita entre Fortitude, Reflexo e Vontade; não some três vezes o bônus à mesma salvaguarda.','A inscrição concede +2 em Intelecto (Reflexo), Sabedoria (Fortitude) e Presença (Vontade), uma vez em cada salvaguarda.'],
 ['Vontade (adaptação de Espírito)','Reflexo (Intelecto)'],
 ['Testes de Atributo de Percepção e Investigação','testes de Percepção (Sabedoria) e Investigação (Intelecto)']
];
export function correctWuxiaAttributeText(text){
 if(typeof text!=='string')return text;
 for(const[old,next]of replacements)text=text.split(old).join(next);
 return text.split(oldNote).join('')
  .replace(/(testes? de\s+)Espírito\s*\(Percepção\)/giu,'$1Sabedoria (Percepção)')
  .replace(/(testes? de\s+)Espírito\s*\(Controle de Qi\)/giu,'$1Constituição (Controle de Qi)')
  .replace(/((?:atributos?(?: de)?|salvaguardas? de)\s+)Espírito\b(?!\s+(?:de Batalha|Amaldiçoado))/giu,'$1Intelecto')
  .replace(/([+−-]\s*\d+\s+em\s+)Espírito\b(?=\s*(?:[,.;]|$|(?:e|ou)\b))/giu,'$1Intelecto')
  .replace(/((?:distribuir|distribua)\s+entre\s+)Espírito\b(?=\s*,\s*Sabedoria\b)/giu,'$1Intelecto')
  .replace(/(testes? de atributo de\s+)Percepção\b/giu,'$1Sabedoria')
  .replace(/(testes? de atributo de\s+)Controle de Qi\b/giu,'$1Constituição')
  .replace(/<p><strong>Pendente:<\/strong>\s*<\/p>/gu,'');
}
const get=(source,path)=>path.split('.').reduce((value,key)=>value?.[key],source);
const list=value=>Array.from(value?.contents??value?.values?.()??value??[]);
const activeGM=game=>!!game?.user?.isGM&&(!game.users?.activeGM||game.users.activeGM.id===game.user.id);
/** Existing patches win as input, so a simultaneous authored update never loses its additions. */
export function prepareWuxiaAttributeCorrection(item,previous={}){
 if(!item||item.isOwner===false||item.limited===true)return null;
 const source=item.toObject?.()??item,id=source._id??item.id,flags=source.flags?.[S];
 if(!id||!flags||!(flags.soulPath||flags.cultivatorFeature||flags.talentoQi||flags.qiTalentManaged||flags.backgroundFeature||flags.combatManualTechnique||flags.professionProduct))return null;
 const updates={_id:id},tiro=flags.combatManualTechnique?.id==='tiro-de-advertencia';
 const field=path=>Object.hasOwn(previous,path)?previous[path]:get(source,path);
 const revise=value=>{
  if(typeof value!=='string')return value;
  const text=correctWuxiaAttributeText(value);
  return tiro?text.replace('Depois do acerto, resolva Vontade sem outro gasto da técnica.','Depois do acerto, resolva Reflexo (Intelecto) sem outro gasto da técnica.'):text;
 };
 const patchText=path=>{const value=field(path),next=revise(value);if(next!==value)updates[path]=next;};
 patchText('system.description.value');
 for(const name of ['professionProductAutomation.manual','professionProductAutomation.pending','combatManualTechnique.manualResolution','combatManualTechnique.sourceCorrections']){
  const path='flags.'+S+'.'+name,value=field(path);if(!Array.isArray(value))continue;
  const next=value.filter(note=>note!==oldNote).map(revise);if(JSON.stringify(next)!==JSON.stringify(value))updates[path]=next;
 }
 for(const[id,activity]of Object.entries(source.system?.activities??{})){
  if(!/^[A-Za-z0-9_-]{1,64}$/u.test(id)||['__proto__','constructor','prototype'].includes(id))continue;
  const path='system.activities.'+id+'.';patchText(path+'description.value');
  patchText(path+'flags.'+S+'.professionProductActivity.manualSave');
  const meta=activity.flags?.[S]?.combatManualActivity,ability=field(path+'save.ability');
  if(tiro&&meta?.techniqueId==='tiro-de-advertencia'&&meta.key==='reaction-save'&&Array.isArray(ability)&&ability.length===1&&ability[0]==='con')updates[path+'save.ability']=['int'];
 }
 return Object.keys(updates).length>1?updates:null;
}
export async function migrateWuxiaAttributeItems(actor,{game=globalThis.game}={}){
 const allowed=()=>activeGM(game)&&actor?.isOwner===true&&!actor.limited&&['character','npc'].includes(actor.type)&&(!actor.canUserModify||actor.canUserModify(game.user,'update'));
 if(!allowed()||typeof actor.performBulkUpdate!=='function')return 0;
 const{withElementalActorLock}=await import('./elemental-runtime.mjs');
 return await withElementalActorLock(actor,'wuxia-attribute-correction',async()=>{
  if(!allowed())return 0;const item=list(actor.items).map(item=>prepareWuxiaAttributeCorrection(item)).filter(Boolean);
  if(!item.length)return 0;await actor.performBulkUpdate({item});return item.length;
 })||0;
}
const registrations=new WeakSet();
export function registerWuxiaAttributeCorrections(hooks=globalThis.Hooks){
 if(!hooks?.once||registrations.has(hooks))return;registrations.add(hooks);
 const actor=subject=>migrateWuxiaAttributeItems(subject).catch(error=>globalThis.ui?.notifications?.warn?.('Não foi possível atualizar os atributos do conteúdo: '+error.message));
 const loose=async item=>{
  if(!activeGM(globalThis.game)||item.actor||item.parent||item.pack||item.isOwner!==true||item.limited||item.canUserModify&&!item.canUserModify(game.user,'update'))return;
  const patch=prepareWuxiaAttributeCorrection(item);if(patch)await item.update(patch);
 };
 hooks.once('ready',async()=>{
  const{elementalCalendarSubjects}=await import('./elemental-local-time.mjs');
  for(const subject of elementalCalendarSubjects())await actor(subject);
  for(const item of list(globalThis.game?.items))try{await loose(item);}catch(error){globalThis.ui?.notifications?.warn?.(error.message);}
 });
 hooks.on?.('createActor',subject=>{void actor(subject);});
 hooks.on?.('createItem',item=>{if(item.actor)void actor(item.actor);else void loose(item).catch(error=>globalThis.ui?.notifications?.warn?.(error.message));});
}
