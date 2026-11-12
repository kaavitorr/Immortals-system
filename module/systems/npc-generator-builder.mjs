import {npcGeneratorProfileKey, npcGeneratorArchetypeTaxonomies, npcGeneratorArchetypeIsSpecific, npcGeneratorEquipmentFolder} from './npc-generator-catalogue.mjs';
import {validNpcEquipment} from "./legacy2-npc-equipment.mjs";
import Ruleset from './ruleset.mjs';
import {validNpcScale,npcAttributeDistribution} from './legacy2-npc-profiles.mjs';
import {NPC_CLASSIFICATIONS} from './legacy2-npc-classification.mjs';
import {BEAST_CORE_BY_ID} from './beast-cores.mjs';
const SCOPE='Immortals-system';
const values=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const raw=d=>d.toObject?.()??structuredClone(d);
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const family=s=>{const key=normalize(s).replace(/^arquetipos/,'');return ({sabiosecivilizados:'humanoides',mineraleconstructo:'constructoseminerais'})[key]??key;};
const readable=(doc,user=globalThis.game?.user)=>doc?.visible!==false&&(doc?.testUserPermission?.(user,'OBSERVER')??true);
const armorTypes=new Set(['light','medium','heavy','natural','shield']);
export const validGeneratorEquipment=d=>d?.type==='weapon'&&!/[(]\s*npc\s*[)]/i.test(d.name??'')||d?.type==='equipment'&&armorTypes.has(d.system?.type?.value);
const plain=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

/** Preserve the compendium's actual document and folder relationships, without modifying it. */
export function profileRecord(doc,pack={}){
 const source=raw(doc),folders=new Map(values(pack.folders).map(f=>[f.id??f._id,f]));
 let id=typeof source.folder==='object'?source.folder?.id:source.folder;const folderNames=[],seen=new Set();
 while(id&&!seen.has(id)){seen.add(id);const folder=folders.get(id);if(!folder)break;folderNames.unshift(folder.name);id=typeof folder.folder==='object'?folder.folder?.id:folder.folder;}
 const restrictions=source.flags?.[SCOPE]?.npcGenerator?.taxonomies??source.system?.taxonomias??[];
 return {uuid:doc.uuid??'Compendium.'+pack.collection+'.Item.'+(source._id??doc.id),name:source.name,type:source.type,img:source.img,
 identifier:source.system?.identifier??'',folderNames,families:folderNames.map(family).filter(f=>!['taxonomias','arquetipos'].includes(f)),
 taxonomies:Array.isArray(restrictions)?restrictions.filter(v=>typeof v==='string'&&v):[],general:!restrictions.length&&(!folderNames.length||family(folderNames.at(-1))==='gerais'),source};
}

/** Keep compatible specific profiles and always offer the unrestricted general archetypes. */
export function npcGeneratorArchetypes(taxonomy,archetypes=[]){
 if(!taxonomy)return[];
 const keys=new Set([taxonomy.uuid,taxonomy.source?._id,taxonomy.identifier,taxonomy.name].filter(Boolean).flatMap(v=>[v,normalize(v)]));
 const exact=archetypes.filter(a=>a.taxonomies?.some(k=>keys.has(k)||keys.has(normalize(k)))||!a.taxonomies?.length&&a.families?.some(k=>keys.has(k)));
 const canonical=archetypes.filter(a=>!a.taxonomies?.length&&npcGeneratorArchetypeTaxonomies(a)?.includes(npcGeneratorProfileKey(taxonomy)));
 const exclusive=canonical.filter(npcGeneratorArchetypeIsSpecific);
 const matching=archetypes.filter(a=>!a.general&&!a.taxonomies?.length&&!npcGeneratorArchetypeTaxonomies(a)&&a.families?.some(k=>taxonomy.families?.includes(k)));
 const general=archetypes.filter(a=>a.general&&!npcGeneratorArchetypeTaxonomies(a));
 const specific=exact.length?exact:exclusive.length?exclusive:canonical.length?canonical:matching;
 return [...new Map([...specific,...general].map(archetype=>[archetype.uuid,archetype])).values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

/** Only public compendium APIs are used; individual broken optional packs remain visible as warnings. */
export async function loadNpcGeneratorCatalog({game=globalThis.game}={}){
 if(!game?.user?.isGM)throw Error('Apenas o Narrador pode abrir o gerador.');
 const catalog={taxonomies:[],archetypes:[],equipment:[],warnings:[]};
 const addEquipment=(row,pack)=>catalog.equipment.push({uuid:row.uuid??'Compendium.'+pack.collection+'.Item.'+(row._id??row.id),name:row.name,img:row.img,type:row.type,subtype:row.system?.type?.value,pack:pack.title??pack.metadata?.label??pack.collection,folder:npcGeneratorEquipmentFolder(row)});
 for(const doc of values(game.items)){
  if(!readable(doc,game.user))continue;
  if(['taxonomy','archetype'].includes(doc.type))catalog[doc.type==='taxonomy'?'taxonomies':'archetypes'].push(profileRecord(doc,{folders:game.folders}));
  else if(validGeneratorEquipment(doc))addEquipment(doc,{title:'Mundo'});
 }
 const packs=values(game.packs).filter(pack=>pack.documentName==='Item'&&pack.testUserPermission?.(game.user,'OBSERVER')!==false);
 const results=await Promise.allSettled(packs.map(async pack=>{
  const index=values(await pack.getIndex({fields:['type','img','system.type.value','system.damage','system.activities','flags.Immortals-system.elemento']}));
  const ids=index.filter(d=>['taxonomy','archetype'].includes(d.type)).map(d=>d._id??d.id);
  const profiles=ids.length?values(await pack.getDocuments({_id__in:ids})):[];
  return {pack,index,profiles};
 }));
 for(let i=0;i<results.length;i++){
  const result=results[i],pack=packs[i];
  if(result.status==='rejected'){catalog.warnings.push('Não foi possível ler '+(pack.title??pack.collection)+': '+result.reason.message);continue;}
  for(const doc of result.value.profiles)if(readable(doc,game.user)&&['taxonomy','archetype'].includes(doc.type))catalog[doc.type==='taxonomy'?'taxonomies':'archetypes'].push(profileRecord(doc,pack));
  for(const row of result.value.index.filter(validGeneratorEquipment))addEquipment(row,pack);
 }
 for(const key of ['taxonomies','archetypes','equipment'])catalog[key].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.uuid.localeCompare(b.uuid));
 return catalog;
}

function selection(draft,catalog){
 const taxonomy=catalog.taxonomies.find(d=>d.uuid===draft.taxonomyUuid);
 const archetype=npcGeneratorArchetypes(taxonomy,catalog.archetypes).find(d=>d.uuid===draft.archetypeUuid);
 const rank=Number(draft.rank),stage=Number(draft.stage),category=draft.category??'normal';
 const errors=[];
 if(!taxonomy)errors.push('Escolha uma Taxonomia do compêndio.');
 if(!archetype)errors.push('Escolha um Arquétipo compatível com a Taxonomia.');
 if(!Number.isInteger(rank)||rank<1||rank>10||!Number.isInteger(stage)||stage<1||stage>3)errors.push('Escolha um reino e um estágio válidos.');
 if(!Object.hasOwn(NPC_CLASSIFICATIONS,category))errors.push('Escolha uma classificação válida.');
 for(const profile of [taxonomy,archetype].filter(Boolean))if(!validNpcScale(profile.source.system?.pesos))errors.push('A distribuição de atributos de '+profile.name+' é inválida.');
 return {taxonomy,archetype,rank,stage,category,level:(rank-1)*3+stage,errors};
}

/** Read actual granted items for the chosen cultivation level, retaining unavailable selections for explicit review. */
export async function previewNpcGenerator(draft,catalog,{resolve=globalThis.fromUuid}={}){
 const selected=selection(draft,catalog),{taxonomy,archetype,rank,stage,category,level}=selected;
 const errors=[...selected.errors],features=[],equipment=[];
 if(errors.length)return {...selected,errors,features,equipment,ready:false};
 const exclusions=new Set(draft.excludedFeatures??[]),gearExclusions=new Set(draft.excludedEquipment??[]),wanted=new Map();
 for(const profile of [taxonomy,archetype])for(const entry of profile.source.system.habilidades??[]){
  if(!entry.uuid||!Number.isFinite(Number(entry.nd)))continue;
  const previous=wanted.get(entry.uuid);wanted.set(entry.uuid,{minLevel:Math.min(previous?.minLevel??Infinity,Number(entry.nd)),profiles:[...new Set([...(previous?.profiles??[]),profile.name])]});
 }
 for(const [uuid,meta]of wanted){
  let doc;try{doc=await resolve?.(uuid);}catch{}
  const available=doc?.type==='feat'&&readable(doc),eligible=meta.minLevel<=level,enabled=eligible&&!exclusions.has(uuid);
  features.push({uuid,...meta,name:doc?.name??'Habilidade indisponível',img:doc?.img??'icons/svg/aura.svg',selected:enabled,allowed:!exclusions.has(uuid),eligible,available,description:plain(doc?.system?.description?.value),source:available?raw(doc):null});
  if(enabled&&!available)errors.push('Desmarque a habilidade indisponível ou restaure sua origem: '+uuid+'.');
 }
 const taxGear=taxonomy.source.system.equipamentos??{},arqGear=archetype.source.system.equipamentos??{},armor=arqGear.armadura??taxGear.armadura;
 const inherited=new Map();if(armor)inherited.set(armor,{origin:arqGear.armadura?archetype.name:taxonomy.name,kind:'armadura'});
 for(const profile of [taxonomy,archetype])for(const uuid of profile.source.system.equipamentos?.armas??[])if(!inherited.has(uuid))inherited.set(uuid,{origin:profile.name,kind:'armas'});
 const choices=new Map([...inherited.keys()].filter(uuid=>!gearExclusions.has(uuid)).map(uuid=>[uuid,{uuid,quantity:1,equipped:true}]));
 for(const entry of draft.equipment??[]){if(!entry.uuid||entry.inherited===true&&!inherited.has(entry.uuid))continue;choices.set(entry.uuid,{...entry});}
 for(const [uuid,entry]of choices){
  let doc;try{doc=await resolve?.(uuid);}catch{}
  const available=validGeneratorEquipment(doc)&&(!inherited.has(uuid)||validNpcEquipment(doc,inherited.get(uuid).kind))&&readable(doc),quantity=Number(entry.quantity??1);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>9999)errors.push('A quantidade de equipamentos deve ser um inteiro entre 1 e 9999.');
  if(!available)errors.push('Remova ou restaure o equipamento indisponível: '+uuid+'.');
  equipment.push({uuid,name:doc?.name??'Equipamento indisponível',img:doc?.img??'icons/svg/item-bag.svg',type:doc?.type,subtype:doc?.system?.type?.value,
   quantity,equipped:entry.equipped!==false,origin:inherited.get(uuid)?.origin??'Adicionado',inherited:inherited.has(uuid),manualPinned:entry.inherited===false,available,source:available?raw(doc):null});
 }
 const nature=['human','beast'].includes(draft.nature)?draft.nature:taxonomy.families.includes('humanoides')?'human':'beast';
 const model={type:'npc',items:[{...taxonomy.source,id:'taxonomy'},{...archetype.source,id:'archetype'}],itemTypes:{class:[]},flags:{[SCOPE]:{npcNature:nature}},system:{legacy2:{nd:String(level),categoria:category,taxonomia:'taxonomy',arquetipo:'archetype'},abilities:{}},getFlag(){return null;}};
 const distribution=npcAttributeDistribution(model);
 model.system.abilities=Object.fromEntries(Object.entries(distribution.values).map(([k,value])=>[k,{value}]));
 const classification=NPC_CLASSIFICATIONS[category],principal=Ruleset.npcPrincipal(model),a=distribution.values;
 const stats={abilities:a,hp:Ruleset.maxHitPoints(model),qi:Ruleset.maxEnergy(model),actions:classification.actions,refinement:2*level,cr:10+Math.floor((a[principal]+a.dex+a.con)/3)};
 const loot={configured:true,essence:draft.loot?.essence===true,core:draft.loot?.core===true,guaranteed:true,elementId:draft.loot?.elementId??'neutro'};
 if(loot.core&&!Object.hasOwn(BEAST_CORE_BY_ID,loot.elementId))errors.push('Escolha o elemento do Núcleo de Besta.');
 return {...selected,features,equipment,errors,ready:!errors.length,stats,distribution,loot,nature};
}

function copyItem(source,uuid,id){
 const data=structuredClone(source);for(const key of ['_id','id','uuid','folder','ownership','pack','_key'])delete data[key];
 data._id=id;data._stats={compendiumSource:uuid.startsWith("Compendium.")?uuid:null};return data;
}

/** All sources are resolved before one atomic native Actor creation; no provisional creature is created. */
export async function createGeneratedNpc(draft,catalog,{game=globalThis.game,Actor=globalThis.Actor,resolve=globalThis.fromUuid,randomId=()=>globalThis.foundry?.utils?.randomID?.()??crypto.randomUUID().replaceAll('-','').slice(0,16)}={}){
 const allowed=()=>game?.user?.isGM===true&&(!game.user.can||game.user.can('ACTOR_CREATE'));
 if(!allowed())throw Error('Apenas o Narrador pode criar NPCs.');
 const fresh={...catalog,taxonomies:[...catalog.taxonomies],archetypes:[...catalog.archetypes]};
 for(const [key,uuid]of [['taxonomies',draft.taxonomyUuid],['archetypes',draft.archetypeUuid]]){
  const known=fresh[key].find(d=>d.uuid===uuid);if(!known)continue;
  const doc=await resolve?.(uuid);if(!doc||doc.type!==(key==='taxonomies'?'taxonomy':'archetype')||!readable(doc,game.user))throw Error('Um perfil selecionado ficou indisponível. Abra a seleção novamente.');
  fresh[key]=fresh[key].map(d=>d===known?{...known,name:doc.name,img:doc.img,source:raw(doc)}:d);
 }
 const preview=await previewNpcGenerator(draft,fresh,{resolve});if(!preview.ready)throw Error(preview.errors.join(' '));
 if(!allowed())throw Error('A permissão de criação mudou.');
 const items=[],ids={};
 for(const [kind,profile]of [['taxonomy',preview.taxonomy],['archetype',preview.archetype]]){
  const id=randomId(),data=copyItem(profile.source,profile.uuid,id);ids[kind]=id;
  ((data.flags??={})[SCOPE]??={}).npcProfileSource=profile.uuid;items.push(data);
 }
 for(const feature of preview.features.filter(f=>f.selected)){const data=copyItem(feature.source,feature.uuid,randomId());((data.flags??={})[SCOPE]??={}).npcProfileFeature={source:feature.uuid};items.push(data);}
 for(const gear of preview.equipment){const data=copyItem(gear.source,gear.uuid,randomId());data.system.quantity=gear.quantity;data.system.equipped=gear.equipped;if('container' in data.system)data.system.container=null;
  const flags=((data.flags??={})[SCOPE]??={});delete flags.npcArchetypeEquipment;
  if(gear.inherited)flags.npcArchetypeEquipment={source:gear.uuid,...(gear.manualPinned?{pinned:true}:{})};items.push(data);}
 const allFeatureIds=new Set([...preview.taxonomy.source.system.habilidades??[],...preview.archetype.source.system.habilidades??[]].map(e=>e.uuid));
 const excludedFeatures=[...new Set(draft.excludedFeatures??[])].filter(uuid=>allFeatureIds.has(uuid));
 const data={name:String(draft.name??'').trim()||preview.archetype.name+' '+preview.taxonomy.name,type:'npc',img:preview.taxonomy.img,items,
 system:{abilities:Object.fromEntries(Object.entries(preview.stats.abilities).map(([k,value])=>[k,{value}])),legacy2:{taxonomia:ids.taxonomy,arquetipo:ids.archetype,nd:String(preview.level),categoria:preview.category,actions:{max:preview.stats.actions,value:preview.stats.actions}},attributes:{hp:{value:preview.stats.hp,max:preview.stats.hp,maxOverride:null},movement:{units:'m'}},energy:{total:preview.stats.qi,generated:0}},
 flags:{[SCOPE]:{npcNature:preview.nature,npcGenerator:{version:1,excludedFeatures,excludedEquipment:[...new Set(draft.excludedEquipment??[])],equipmentState:Object.fromEntries(preview.equipment.filter(e=>e.inherited).map(e=>[e.uuid,{equipped:e.equipped,quantity:e.quantity}]))},beastLoot:preview.loot}}};
 const api=Actor?.implementation??Actor;if(!api?.create)throw Error('A criação de atores está indisponível.');
 return api.create(data,{renderSheet:false,keepEmbeddedIds:true});
}
