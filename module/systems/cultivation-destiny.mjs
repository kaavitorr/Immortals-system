import {CULTIVATION_RANKS} from './cultivation-realms.mjs';
const SCOPE='Immortals-system',PATH='flags.'+SCOPE+'.cultivationDestiny';
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
export const CULTIVATION_DESTINIES=deepFreeze([
 {key:'immortal-soul',name:'Alma Imortal',summary:'Um mestre imortal vive junto à sua alma e orienta sua jornada.',benefit:'Receba um Manual de Combate equivalente a cada reino alcançado. O mestre pode conceder até dois Manuais de Cultivo compatíveis, limitados ao seu reino e, no máximo, Divino Inferior.',penalty:'Entregue metade de todos os recursos adquiridos para nutrir a alma do mestre.',narrative:'Um cultivador imortal torna-se seu mestre secreto enquanto procura recuperar o próprio corpo.'},
 {key:'reincarnated',name:'Cultivador Reencarnado',summary:'As marcas de uma vida suprema retornam com você aos Reinos Inferiores.',benefit:'Reduza em 2 a CD das rupturas de reino, da compreensão de Conceitos Elementais e do ingresso ou avanço nas profissões.',penalty:'Sua constituição começa em Humano Inferior e exige o dobro de recursos para evoluir.',narrative:'As palavras do Grande Dao estão gravadas em sua alma, embora as memórias da vida anterior permaneçam seladas.'},
 {key:'supreme-legacy',name:'Legado do Ancião Supremo',summary:'Uma relíquia no Dantian preserva uma dimensão de conhecimentos e tesouros.',benefit:'A partir do Núcleo Rotativo, ofereça um tesouro por outro de rank equivalente, adequado às suas necessidades. Somente você pode utilizar o tesouro recebido.',penalty:'A manutenção da dimensão reduz sua velocidade de cultivo em 40%.',narrative:'Um ancião enviou seu legado aos Reinos Inferiores para evitar que seus inimigos o tomassem.'},
 {key:'divine-lineage',name:'Linhagem Divina',summary:'Uma herança concedida pelo Dao corre em seu sangue.',benefit:'Receba os benefícios de uma Besta Divina e uma Essência de Besta correspondente de Rank Supremo. Os poderes despertam no Núcleo Rotativo; um Meio Monstro pode manifestar a segunda linhagem desde o início.',penalty:'Use somente essências da criatura escolhida e manuais compatíveis com sua afinidade. Sua velocidade de cultivo é reduzida em 20%.',narrative:'A linhagem não impõe outra penalidade racial além das restrições deste destino.'},
 {key:'unrivaled-genius',name:'Gênio Incomparável',summary:'Seu talento permite conciliar dois caminhos de cultivo.',benefit:'Assimilações ilimitadas; mantenha até dois manuais e dois mantras, usando apenas um mantra por vez. Reduza em 3 a CD para aprender Manuais de Combate e avançar proficiências.',penalty:'Onde houver tribulação, seu dano passa a 10d10 por reino de cultivo.',narrative:'Esforço e escolhas determinam se o talento incomparável alcançará o destino que os Céus reservaram.'},
 {key:'own-origin',name:'Encontro destinado próprio',summary:'Conte como recebeu sua herança espiritual.',benefit:'Seu Mantra de Absorção é considerado um reino acima do seu reino de cultivo atual.',penalty:'Nenhuma característica ou penalidade adicional.',narrative:'A origem é definida com o narrador. A taxa de PEQ continua registrada conforme o mantra e a tabela da campanha.'}
]);
export const DESTINY_LINEAGES=deepFreeze([
 {id:'dragon',name:'Dragão',elements:[],choices:'basic-intermediate'},
 {id:'fox',name:'Jiuweihu (Raposa de 9 Caudas)',elements:['ilusao']},
 {id:'phoenix',name:'Phoenix',elements:['fogo']},
 {id:'tiger',name:'Tigre Branco',elements:['terra','metal']},
 {id:'tortoise',name:'Tartaruga Negra',elements:['agua']},
 {id:'roc',name:'Pássaro Roc',elements:['vento','espaco']},
 {id:'qilin',name:'Qilin',elements:['fogo','relampago']},
 {id:'taotie',name:'Taotie',elements:[],choices:'taotie'}
]);
export const lineageDefinition=id=>DESTINY_LINEAGES.find(entry=>entry.id===id)??null;
const elements=new Set(['madeira','fogo','terra','metal','agua','relampago','vento','gelo','ilusao','luz','escuridao','tempo','espaco']);
const basic=new Set(['madeira','fogo','terra','metal','agua']),intermediate=new Set(['relampago','vento','gelo','ilusao']);
const list=c=>Array.from(c?.contents??c?.values?.()??c??[]);
const isCultivator=actor=>actor?.type==='character'&&list(actor.itemTypes?.class??actor.items).some(item=>(item.system?.identifier??item.identifier)==='cultivador'||item.flags?.[SCOPE]?.cultivator===true||item.getFlag?.(SCOPE,'cultivator')===true);
const halfMonster=actor=>list(actor?.itemTypes?.race??actor?.items).some(item=>item.flags?.[SCOPE]?.species?.key==='meio-monstro'||item.system?.identifier==='especie-meio-monstro');
const int=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
export function destinyState(actor){
 const raw=actor?.flags?.[SCOPE]?.cultivationDestiny??{},active=isCultivator(actor),definition=active?CULTIVATION_DESTINIES.find(d=>d.key===raw.key)??null:null;
 const key=definition?.key??null,lineage=key==='divine-lineage'?lineageDefinition(raw.lineageId):null;
 const chosen=lineage?.choices?Array.isArray(raw.elements)?[...new Set(raw.elements.filter(id=>elements.has(id)))]:[]:lineage?.elements??[];
 const rank=Math.min(10,Math.max(1,int(actor?.system?.cultivation?.rank)||1));
 return {active,key,definition,revision:int(raw.revision),rank,unlocked:key!=='divine-lineage'||!!lineage&&(rank>=3||halfMonster(actor)),halfMonster:halfMonster(actor),lineageId:lineage?.id??null,lineageName:lineage?.name??'',elements:[...chosen],ability:raw.ability??null,ownOrigin:key==='own-origin',story:typeof raw.story==='string'?raw.story:'',records:structuredClone(raw.records??{}),absorptionRealm:key==='own-origin'?Math.min(10,rank+1):null,absorptionRealmLabel:key==='own-origin'?CULTIVATION_RANKS[Math.min(9,rank)]?.name:null};
}
/** Numeric benefits are derived from the selected native player destiny, never written into base values. */
export function destinyModifiers(actor){
 const state=destinyState(actor),key=state.key;
 return {absorptionMultiplier:key==='supreme-legacy'?.6:key==='divine-lineage'?.8:1,breakthroughCDReduction:key==='reincarnated'?2:0,elementTrainingCDReduction:key==='reincarnated'?2:0,professionCDReduction:key==='reincarnated'?2:0,manualCombatCDReduction:key==='unrivaled-genius'?3:0,proficiencyCDReduction:key==='unrivaled-genius'?3:0,tribulationDicePerRank:key==='unrivaled-genius'?10:null,constitutionResourceMultiplier:key==='reincarnated'?2:1};
}
export function prepareDestinySelection(actor,input={}, {expectedRevision}={}){
 const state=destinyState(actor),raw=actor?.flags?.[SCOPE]?.cultivationDestiny??{};
 if(!state.active)throw Error('Esta herança pertence a um personagem Cultivador.');
 if(expectedRevision!==undefined&&expectedRevision!==state.revision)throw Error('O destino mudou; abra a escolha novamente.');
 const definition=CULTIVATION_DESTINIES.find(d=>d.key===input.key);if(!definition)throw Error('Escolha um destino válido.');
 const next={...structuredClone(raw),version:1,revision:state.revision+1,key:definition.key,story:typeof input.story==='string'?input.story.trim().slice(0,10000):''};
 if(input.key==='reincarnated'&&actor?.flags?.[SCOPE]?.constitution?.primary)next.constitutionStartFulfilled=true;
 if(input.key==='divine-lineage'){
  const lineage=lineageDefinition(input.lineageId);if(!lineage)throw Error('Escolha uma Besta Divina válida.');
  const chosen=Array.isArray(input.elements)?input.elements:[];
  if(chosen.some(id=>!elements.has(id))||new Set(chosen).size!==chosen.length)throw Error('Escolha afinidades elementais válidas e distintas.');
  if(lineage.choices==='basic-intermediate'&&(chosen.length!==2||!chosen.some(id=>basic.has(id))||!chosen.some(id=>intermediate.has(id))))throw Error('Dragão exige um elemento básico e um intermediário.');
  if(lineage.choices==='taotie'&&(chosen.length>1||chosen.some(id=>id!=='espaco')))throw Error('Taotie admite apenas a afinidade Espaço confirmada pela rolagem.');
  next.lineageId=lineage.id;next.elements=[...(lineage.choices?chosen:lineage.elements)];
  if(input.ability!==undefined&&!['str','dex','con','int','wis','cha'].includes(input.ability))throw Error('Escolha o atributo da essência.');
  next.ability=input.ability??raw.ability??null;
 }else{next.lineageId=null;next.elements=[];next.ability=null;}
 return {[PATH]:next};
}
/** Source metadata must explicitly identify the permitted divine beast; names are never guessed. */
export function destinyEssenceAllowed(actor,definition){const state=destinyState(actor),origin=definition?.destinyOrigin;if(origin&&(origin.key!=='divine-lineage'||!destinyOriginMatchesActor(actor,origin.actorUuid)||state.key!=='divine-lineage'||origin.lineageId!==state.lineageId))return false;return state.key!=='divine-lineage'||!!state.lineageId&&definition?.lineageId===state.lineageId;}
/** A lineage manual is compatible only when every declared element belongs to its affinity. */
export function destinyManualAllowed(actor,declaredElements=[]){const state=destinyState(actor);if(state.key!=='divine-lineage')return true;return !!state.lineageId&&Array.isArray(declaredElements)&&declaredElements.length>0&&declaredElements.every(id=>state.elements.length?state.elements.includes(id):id==='neutro');}
export function destinyLearningDC(actor,kind,baseDC){if(!['combat-manual','proficiency'].includes(kind)||!Number.isFinite(baseDC))throw Error('Informe o aprendizado e a CD base.');return Math.max(1,baseDC-(kind==='combat-manual'?destinyModifiers(actor).manualCombatCDReduction:destinyModifiers(actor).proficiencyCDReduction));}

/** Synthetic characters inherit the same personal grant ownership as their base actor. */
export function destinyOriginMatchesActor(actor,uuid){return typeof uuid==='string'&&!!uuid&&(uuid===(actor?.uuid??actor?.id)||(actor?.isToken===true&&!!actor.id&&uuid==='Actor.'+actor.id));}
