/** Persistent choices for elemental techniques. Generated elemental feats never own these choices. */
const SCOPE='Immortals-system';
const definitions={
 'fogo:cancaoFogo':{label:'Canção do Fogo',damageType:'fire',grades:[3,5,7]},
 'agua:bencaoAgua':{label:'Benção da Água',auxiliary:[5,10,15],support:true},
 'relampago:cancaoTrovao':{label:'Canção do Trovão',damageType:'lightning',grades:[3,5,7],auxiliary:[6,10,15]}
};
const values=collection=>Array.from(collection?.values?.()??Object.values(collection??{}));
const grants=actor=>actor?.flags?.[SCOPE]?.elementalChoices?.grants??{};

export function elementalGrantSlots(actor,elementId,abilityId){
 const key=elementId+':'+abilityId,definition=definitions[key];if(!definition)return [];
 const tier=Math.max(0,Math.min(3,Number(actor?.system?.elementAbilities?.[elementId]?.[abilityId])||0));
 if(!tier&&!Object.keys(grants(actor)).some(id=>id.startsWith(key+':')))return [];
 return [1,2,3].map(index=>{const id=key+':'+index,saved=grants(actor)[id]??{},item=values(actor?.items).find(i=>i.uuid===saved.techniqueUuid);return{
  id,elementId,abilityId,index,active:index<=tier,maxGrade:definition.grades?.[index-1]??null,maxQi:definition.auxiliary?.[index-1]??null,
  ...saved,label:definition.label+' · '+index,techniqueName:item?.name??saved.techniqueName??'',missing:!!saved.techniqueUuid&&!item,
  requirement:definition.grades?'Técnica de '+(index===1&&elementId==='fogo'?'':'até ')+definition.grades[index-1]+'º grau'+(definition.auxiliary?' ou auxiliar até '+definition.auxiliary[index-1]+' PQ':' de Fogo'):'Auxiliar de suporte · até '+definition.auxiliary[index-1]+' PQ'
 };});
}
function findSlot(actor,id){const [elementId,abilityId]=String(id).split(':');return elementalGrantSlots(actor,elementId,abilityId).find(s=>s.id===id);}
function qiCeiling(activity){
 const scale=activity.consumption?.scaling,max=scale?.allowed?Number(scale.max):1;
 if(!Number.isInteger(max)||max<1)return null;
 let cost=0;for(const target of activity.consumption?.targets??[]){
  if(target.type!=='attribute'||!['energy.generated','energy.total'].includes(target.target))continue;
  if(target.target==='energy.total')return null;
  const base=Number(target.value);if(!Number.isFinite(base)||base<0)return null;
  let extra=0;if(max>1&&target.scaling?.mode){if(target.scaling.mode!=='amount')return null;extra=Number(target.scaling.formula);if(!Number.isFinite(extra)||extra<0)return null;}
  cost+=base+(max-1)*extra;
 }return cost;
}
export function validateElementalGrant(actor,slotId,technique){
 const invalid=reason=>({valid:false,reason});const slot=findSlot(actor,slotId);if(!slot?.active)return invalid('Esta vaga exige um grau ainda não aprendido.');
 if(technique?.type!=='spell'||technique.actor?.uuid!==actor?.uuid)return invalid('Escolha uma técnica pertencente a esta ficha.');
 const definition=definitions[slot.elementId+':'+slot.abilityId],grade=Number(technique.system?.level),activities=values(technique.system?.activities);
 if(!Number.isInteger(grade)||grade<0||!activities.length)return invalid('Configure o grau e as atividades da técnica.');
 if(grade>0){
  if(!slot.maxGrade||grade>slot.maxGrade||slotId==='fogo:cancaoFogo:1'&&grade!==3)return invalid('O grau da técnica não corresponde à vaga.');
  const damage=activities.flatMap(a=>a.damage?.parts??[]);
  if(!damage.length||damage.some(part=>{const types=Array.from(part.types??[]);return !types.length||types.some(type=>type!==definition.damageType);}))return invalid('Configure todo o dano da técnica como '+(definition.damageType==='fire'?'Fogo':'Eletricidade')+'.');
 }else{
  if(!slot.maxQi)return invalid('Esta vaga concede uma técnica de dano, não uma auxiliar.');
  const costs=activities.map(qiCeiling);if(costs.some(cost=>cost===null))return invalid('Configure custos numéricos de Qi Refinado e um limite de escala verificável.');
  if(Math.max(...costs)>slot.maxQi)return invalid('A auxiliar ultrapassa o limite de '+slot.maxQi+' PQ.');
  const metadata=technique.flags?.[SCOPE]?.elementalTechnique;
  if(definition.support&&(metadata?.nature!=='support'||!['healing','defense','utility'].includes(metadata?.purpose)))return invalid('Indique natureza Suporte e finalidade cura, defesa ou utilidade.');
  if(definition.support&&activities.some(a=>['attack','damage','save'].includes(a.type)&&a.damage?.parts?.length))return invalid('A Benção da Água não concede uma auxiliar ofensiva.');
 }
 return{valid:true,reason:'',slot};
}
export async function assignElementalGrant(actor,slotId,techniqueUuid,{resolveUuid=globalThis.fromUuid}={}){
 if(actor?.isOwner===false)throw Error('Sem permissão para configurar esta ficha.');
 const technique=await resolveUuid?.(techniqueUuid),validation=validateElementalGrant(actor,slotId,technique);
 if(!validation.valid)throw Error(validation.reason);
 if(Object.entries(grants(actor)).some(([id,record])=>id!==slotId&&record.techniqueUuid===techniqueUuid))throw Error('Esta técnica já ocupa outra vaga elemental.');
 const record={version:1,techniqueUuid,techniqueName:technique.name};
 return{record,updates:{['flags.'+SCOPE+'.elementalChoices.grants.'+slotId]:record}};
}
export function elementalTechniqueGrantAccess(actor,technique){
 if(!technique?.flags?.[SCOPE]?.elementalGrantOnly)return{allowed:true};
 const links=Object.entries(grants(actor)).filter(([,record])=>record.techniqueUuid===technique.uuid);
 const allowed=links.some(([id])=>validateElementalGrant(actor,id,technique).valid);
 return{allowed,reason:allowed?'':'A técnica depende de uma concessão elemental ativa e válida. Revise sua vaga na aba Conceitos.'};
}
