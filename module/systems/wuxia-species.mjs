import {SPECIES_FEATURES,SPECIES_LINEAGES,SPECIES_TAXONOMIES} from './wuxia-species-data.mjs';
import {speciesImage,speciesFeatureImage} from './general-content-art.mjs';
import {QI_TALENTS} from './qi-talents-data.mjs';
import {qiTalentStableId} from './qi-talents-activities.mjs';
const scope='Immortals-system',pack='Compendium.Immortals-system.geral.Item.';
export const SPECIES_FOLDER_ID='1a2c000000000001',SPECIES_FEATURE_FOLDER_ID='1a2c000000000002',SPECIES_LINEAGE_FOLDER_ID='1a2c000000000003',SPECIES_TAXONOMY_FOLDER_ID='1a2c000000000004';
const hash=value=>{let n=2166136261;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');};
export const speciesStableId=key=>'1a2c1000'+hash(key);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=paragraphs=>paragraphs.map(p=>'<p>'+escape(p.replace(/[⬢+]/gu,m=>'['+(m.length-2)+' ações]'))+'</p>').join('');
const featUuid=name=>pack+speciesStableId('feature:'+name);
const feat=(name,paragraphs,extra={})=>({_id:speciesStableId('feature:'+name),name,type:'feat',folder:SPECIES_FEATURE_FOLDER_ID,img:speciesFeatureImage(name,'systems/Immortals-system/icons/svg/items/race.svg'),system:{identifier:'especie-'+hash(name),type:{value:'race'},description:{value:html(paragraphs)},advancement:{},...extra},effects:[],flags:{[scope]:{speciesFeature:name,speciesContentVersion:1,featureSection:'species'}}});
function grant(key,title,names,level=0){const id=speciesStableId('grant:'+key);return{_id:id,type:'ItemGrant',level,title,configuration:{items:names.map(name=>({uuid:featUuid(name),optional:false})),optional:false},value:{}};}
function choice(key,title,uuids,count=1,level=0,extra={}){const id=speciesStableId('choice:'+key);return{_id:id,type:'ItemChoice',title,configuration:{choices:{[level]:{count,replacement:false}},pool:uuids.map(uuid=>({uuid})),allowDrops:false,type:'feat',restriction:{},...extra},value:{}};}
const advances=list=>Object.fromEntries(list.map(a=>[a._id,a]));
/** Native species, their feats, and the book's single ancestry/variant choices. */
export function speciesDocuments(){
 const features=SPECIES_FEATURES.map(f=>feat(f.name,f.paragraphs));
 const lineages=SPECIES_LINEAGES.map(entry=>({...feat(entry.name,entry.paragraphs),folder:SPECIES_LINEAGE_FOLDER_ID,flags:{[scope]:{speciesFeature:entry.name,speciesLineage:true,speciesContentVersion:1,featureSection:'species'}}}));
 const variants=[['Demônios do Charme',['Cultivo Demoníaco','Troca de Faces']],['Demônios da Brutalidade',['Físico Poderoso','Físico Insano']],['Demônios Traiçoeiros',['Voo Demoníaco','Maldição Demoníaca']]].map(([name,names])=>({...feat(name,['Escolha apenas uma variante demoníaca. Suas características são recebidas pela progressão.'],{advancement:advances([grant(name,name,names)])}),folder:SPECIES_LINEAGE_FOLDER_ID}));
 const taxonomies=SPECIES_TAXONOMIES.map(t=>({...feat('Traços Animalescos — '+t.name,['Taxonomia da linhagem: '+t.name+'. Receba duas características desta taxonomia.'],{advancement:advances([choice('taxonomy:'+t.id,'Duas características — '+t.name,t.items,2)])}),folder:SPECIES_TAXONOMY_FOLDER_ID,img:t.img}));
 const animal=features.find(f=>f.name==='Traços Animalescos');animal.system.advancement=advances([choice('taxonomy','Taxonomia da Besta Divina',taxonomies.map(t=>pack+t._id))]);
 const talents=QI_TALENTS.map(t=>pack+qiTalentStableId('qi-talents:item:'+t.id));
 const adaptation=features.find(f=>f.name==='Adaptação');adaptation.system.advancement=advances([choice('human-adaptation','Dois talentos adicionais',talents,2,0,{speciesTalents:true})]);
 const taotie=lineages.find(f=>f.name==='Taotie'),rollId=speciesStableId('taotie-affinity');taotie.system.activities={[rollId]:{_id:rollId,type:'utility',name:'Verificar afinidade com Espaço',activation:{type:'',value:0},consumption:{targets:[],spellSlot:false},target:{affects:{type:'self'},prompt:false},range:{units:'self'},roll:{formula:'1d20',name:'16 ou mais: afinidade com Espaço',prompt:false,visible:true}}};
 const make=(key,name,hp,walk,swim,sizes,names,extra=[])=>{const sizeId=speciesStableId('size:'+key);return{_id:speciesStableId('species:'+key),name,type:'race',img:speciesImage(key),folder:SPECIES_FOLDER_ID,system:{identifier:'especie-'+key,type:{value:'humanoid'},description:{value:'<p>Espécie de Immortals Legacy. '+hp+' Pontos de Vida adicionais; caminhada '+walk+' m e nado '+swim+' m.</p><p>Características e escolhas são concedidas pela Progressão. Apenas uma espécie e uma variante/ancestralidade por personagem.</p>'},movement:{units:'m',speeds:{walk,swim}},advancement:advances([{_id:sizeId,type:'Size',level:0,configuration:{sizes},value:{}},grant(key,'Características de '+name,names),...extra])},effects:[],flags:{[scope]:{species:{key},pvAdicional:hp,speciesContentVersion:1}}};};
 const asiId=speciesStableId('demon-attributes');
 const races=[
  make('humano','Humano',4,10,5,['med'],['Afinidade Neutra','Adaptação'],[grant('human-species-talent','Talento de Espécie',['Talento de Espécie'],4),choice('human-species-talent','Talento de Espécie — Formação de Núcleo',talents,1,4,{speciesTalents:true})]),
  make('meio-monstro','Meio Monstro',8,9,1.5,['sm','med','lg'],['Traços Animalescos','Absorção de Linhagem','Dificuldade de Aprendizado'],[choice('lineage','Ancestralidade',lineages.map(f=>pack+f._id)),grant('divine-transformation','Transformação Divina — Núcleo Rotativo',['Transformação Divina'],7)]),
  make('demonio','Demônio',10,12,4.5,['med'],['Regeneração Demoníaca','Sede de Sangue','Núcleo Demoníaco','Incompatibilidade'],[choice('demon-variant','Variante demoníaca',variants.map(f=>pack+f._id)),{_id:asiId,type:'AbilityScoreImprovement',level:0,title:'Ajuste de atributos da espécie',configuration:{points:2,cap:2,fixed:{},locked:[],max:20},value:{}}])
 ];
 races.find(r=>r.flags[scope].species.key==='demonio').flags[scope].atributosAdicionais=2;
 return [{_id:SPECIES_FOLDER_ID,name:'Espécies',type:'Item',folder:null,sorting:'a',color:'#b79a71'},...[[SPECIES_FEATURE_FOLDER_ID,'Características de Espécie'],[SPECIES_LINEAGE_FOLDER_ID,'Ancestralidades e Variantes'],[SPECIES_TAXONOMY_FOLDER_ID,'Traços Animalescos por Taxonomia']].map(([id,name])=>({_id:id,name,type:'Item',folder:SPECIES_FOLDER_ID,sorting:'a',color:'#7b8d99'})),...races,...features,...lineages,...variants,...taxonomies];
}
/** Add missing authored progression to older pack backgrounds without replacing the master's edits. */
export function backgroundAdvancementMigration(source,canonical){
 if(source.type!=='background'||canonical?.type!=='background')return null;
 const key=source.flags?.[scope]?.background?.key,expected=canonical.flags?.[scope]?.background?.key;
 const references=[source._stats?.compendiumSource,source.flags?.[scope]?.sourceId,source.flags?.[scope]?.creation2Source,source.flags?.JujutsuLegacy?.sourceId];
 if(source._id!==canonical._id&&!(key&&key===expected)&&!references.includes(pack+canonical._id))return null;
 const updates={_id:source._id};
 const current=source.system?.advancement??{};
 for(const [id,a] of Object.entries(canonical.system.advancement))if(!current[id])updates['system.advancement.'+id]=structuredClone(a);
 if((source.flags?.[scope]?.backgroundRuleVersion??0)<2)updates['flags.'+scope+'.backgroundRuleVersion']=2;
 return Object.keys(updates).length>1?updates:null;
}
