import {practiceEvolutionEvidence,ensurePracticeEvolutionEvidence,recordPracticeEvidenceIssued,recordPracticeClaimIntent,completedPracticeClaim,recordPracticeClaimCompleted} from './practice-evolution-evidence.mjs';
import {practiceEvolutionState} from './practice-evolution-state.mjs';
import {isCultivator,cultivatorProgression} from './cultivator-rules.mjs';
import {carregarGrafo,avaliarNo,possuidas} from './especializacoes-2.mjs';
import {qiTalentDocument} from './qi-talents-content.mjs';
import {qiTalentStableId} from './qi-talents-activities.mjs';
import {withElementalActorLock} from './elemental-runtime.mjs';
export {practiceEvolutionState} from './practice-evolution-state.mjs';
const S='Immortals-system',P='flags.'+S+'.practiceEvolution',copy=v=>structuredClone(v),identifier=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
function character(actor){if(actor?.type!=='character'||!isCultivator(actor)||actor.pack||actor.compendium)throw Error('Evolução na Prática requer uma ficha de jogador Cultivador.');}
function narrator(actor,user){character(actor);if(!user?.isGM||actor.isOwner===false)throw Error('Somente o Narrador pode conceder e aplicar esta evolução.');const active=globalThis.game?.users?.activeGM;if(active&&active.id!==user.id)throw Error('A evolução será concluída pelo Narrador ativo.');}
function ledger(actor){const saved=actor.flags?.[S]?.practiceEvolution;if(saved&&(saved.version!==1||!saved.grants||Array.isArray(saved.grants)))throw Error('O registro de Evolução na Prática precisa ser conferido pelo Narrador.');return copy(saved??{version:1,cycle:0,usedInCycle:false,grants:{}});}
export function planPracticeEvolutionGrant(actor,{id,user,expectedCycle,combatConfirmed=false,worldTime=globalThis.game?.time?.worldTime??0}={}){
 narrator(actor,user);if(!identifier(id))throw Error('Identificação da evolução inválida.');const saved=ledger(actor),state=practiceEvolutionState(actor);
 if(saved.grants[id])return{actor:{},create:[],alreadyApplied:true,grant:saved.grants[id]};
 if(expectedCycle!==undefined&&expectedCycle!==state.cycle)throw Error('O descanso mudou; confira a concessão novamente.');
 if(!combatConfirmed)throw Error('O Narrador precisa confirmar a saída de um combate mortal.');
 if(!state.canGrant)throw Error('Uma evolução já foi concedida desde o último descanso longo.');
 const grant={id,cycle:state.cycle,status:'pending',issuedBy:user.id,issuedAt:Number(worldTime)||0,evidenceUuid:'ChatMessage.'+qiTalentStableId('practice-evolution-evidence:'+actor.uuid+':'+id)};return{actor:{[P+'.version']:1,[P+'.cycle']:state.cycle,[P+'.usedInCycle']:true,[P+'.grants.'+id]:grant},create:[],grant};
}
function futureView(actor){const level=Math.min(30,cultivatorProgression(actor).level+1);return{type:actor.type,uuid:actor.uuid,flags:actor.flags,items:actor.items,itemTypes:actor.itemTypes,system:{...actor.system,cultivation:{...actor.system.cultivation,rank:Math.ceil(level/3),stage:(level-1)%3+1}},getFlag:(s,k)=>actor.getFlag?.(s,k)??actor.flags?.[s]?.[k]};}
export function practiceEvolutionTalentChoices(actor,graph,{ignoreGrantId}={}){character(actor);const view=futureView(actor),owned=new Set(possuidas(actor)),items=Array.from(actor.items??[]);return Array.from(graph?.porNome?.values?.()??[]).filter(node=>node.qiTalent&&node.id&&!owned.has(node.nome)&&!items.some(item=>(ignoreGrantId===undefined||item.flags?.[S]?.practiceEvolutionGrant!==ignoreGrantId)&&(item.flags?.[S]?.qiTalentId===node.id||item.flags?.[S]?.talentoQi?.id===node.id))&&avaliarNo(view,node).estado==='disponivel');}
export function planPracticeEvolutionClaim(actor,{grantId,requestId,benefit,amount,talentId}={}, {graph,source}={}){
 character(actor);if(!identifier(grantId)||typeof requestId!=='string'||!requestId.trim()||requestId.length>250)throw Error('Escolha de evolução inválida.');
 if(!['qi','cultivation','talent'].includes(benefit))throw Error('Escolha um dos três benefícios de evolução.');
 if(benefit==='cultivation'&&(!Number.isSafeInteger(amount)||amount<1||amount>3))throw Error('Escolha de 1 a 3 Pontos de Cultivo.');
 const saved=ledger(actor),grant=saved.grants[grantId];if(grant&&grant.id!==grantId)throw Error('A identificação da concessão precisa de conferência.');if(!grant)throw Error('O Narrador ainda não concedeu esta evolução.');
 if(grant.status==='claimed'){if(grant.claimId===requestId&&grant.benefit===benefit&&(benefit!=='cultivation'||grant.amount===amount)&&(benefit!=='talent'||grant.talentId===talentId))return{actor:{},create:[],alreadyApplied:true,grant};const error=Error('Esta evolução já foi utilizada em outro benefício.');error.terminal=true;throw error;}
 if(grant.status!=='pending')throw Error('Esta concessão precisa ser conferida pelo Narrador.');
 const updates={},create=[];let talentName=null;
 if(benefit==='cultivation'){const points=Number(actor.system.cultivation.points??0);if(!Number.isSafeInteger(points)||points<0||!Number.isSafeInteger(points+amount))throw Error('O saldo de Pontos de Cultivo precisa de conferência.');updates['system.cultivation.points']=points+amount;}
 if(benefit==='talent'){const node=practiceEvolutionTalentChoices(actor,graph,{ignoreGrantId:grantId}).find(n=>n.id===talentId);if(!node)throw Error('A habilidade não atende aos pré-requisitos de até um nível de cultivo acima.');
  const document=source??qiTalentDocument(node.id),data=typeof document.toObject==='function'?document.toObject():copy(document);
  if(data.type!=='feat'||data.flags?.[S]?.talentoQi?.id!==node.id)throw Error('A habilidade de Qi selecionada não corresponde ao catálogo.');
  delete data.uuid;data._id=qiTalentStableId('qi-talent:actor-item:'+actor.uuid+':'+node.id);data.folder=null;data.name=node.nome;data._stats={...data._stats,compendiumSource:node.uuid};
  data.flags??={};data.flags[S]={...data.flags[S],especializacaoAdquirida:true,qiTalentManaged:true,qiTalentId:node.id,featureSection:'jj-talents',practiceEvolutionGrant:grantId};
  if(!Array.from(actor.items??[]).some(i=>(i.id??i._id)===data._id&&i.flags?.[S]?.qiTalentManaged&&i.flags?.[S]?.qiTalentId===node.id))create.push(data);talentName=node.nome;updates['flags.'+S+'.especializacoesConcedidas']=[...new Set([...(actor.getFlag?.(S,'especializacoesConcedidas')??actor.flags?.[S]?.especializacoesConcedidas??[]),node.nome])];
 }
 const record={...grant,status:'claimed',claimId:requestId,benefit,...(benefit==='cultivation'?{amount}:{}),...(talentName?{talentId,talentName,maximumLevel:Math.min(30,cultivatorProgression(actor).level+1)}:{})};updates[P+'.grants.'+grantId]=record;return{actor:updates,create,grant:record};
}
async function talentOptions(actor,choice){if(choice.benefit!=='talent')return{};let graph=await carregarGrafo();const node=practiceEvolutionTalentChoices(actor,graph,{ignoreGrantId:choice.grantId??choice.id}).find(n=>n.id===choice.talentId);if(!node)throw Error('A habilidade de Qi não está mais disponível.');let source;try{source=await globalThis.fromUuid?.(node.uuid);}catch{}graph=await carregarGrafo();return{graph,source:source??qiTalentDocument(node.id)};}
function sameReceipt(a,b){return a&&a.status===b.status&&a.id===b.id&&a.issuedBy===b.issuedBy&&a.evidenceUuid===b.evidenceUuid&&(b.status!=='claimed'||a.claimId===b.claimId&&a.benefit===b.benefit&&a.amount===b.amount&&a.talentId===b.talentId);}
async function apply(actor,plan,evidence){
 const expected=plan.grant,items=()=>Array.from(actor.items??[]),present=()=>items().some(i=>i.flags?.[S]?.qiTalentManaged===true&&i.flags?.[S]?.qiTalentId===expected.talentId);
 if(!actor.performBulkUpdate)throw Error('A operação nativa conjunta da ficha não está disponível.');
 if(!plan.alreadyApplied)await actor.performBulkUpdate({actor:plan.actor,create:plan.create??[]});
 const actual=actor.flags?.[S]?.practiceEvolution?.grants?.[expected.id];if(!sameReceipt(actual,expected))throw Error('A gravação do benefício não foi confirmada; retome o mesmo registro no chat.');
 if(expected.benefit==='talent'&&!present()){if(plan.alreadyApplied){const source=evidence.flags[S].practiceEvolutionGrant.claimIntent?.itemSource;if(!source)throw Error('A criação da habilidade está pendente de conferência.');await actor.performBulkUpdate({create:[structuredClone(source)]});}if(!present())throw Error('A criação da habilidade não foi confirmada; retome a mesma escolha.');}
 return plan;
}
function grantedView(actor,grant){return{type:actor.type,uuid:actor.uuid,isOwner:actor.isOwner,system:actor.system,itemTypes:actor.itemTypes,items:actor.items,flags:{...actor.flags,[S]:{...actor.flags?.[S],practiceEvolution:{...ledger(actor),usedInCycle:true,grants:{...ledger(actor).grants,[grant.id]:grant}}}},getFlag(s,k){return this.flags?.[s]?.[k];}};}
export async function grantPracticeEvolution(actor,choice={}){return withElementalActorLock(actor,'practice-grant:'+choice.id,async()=>{
 narrator(actor,choice.user);const initial=planPracticeEvolutionGrant(actor,choice),proof=await ensurePracticeEvolutionEvidence(actor,initial.grant,choice);
 if(initial.alreadyApplied){const record=initial.grant;if(record.status==='claimed'){const result=await apply(actor,{...initial,grant:record},proof);if(proof.flags[S].practiceEvolutionGrant.claimIntent)await recordPracticeClaimCompleted(proof,{requestId:record.claimId});else await recordPracticeEvidenceIssued(proof);return result;}if(!choice.benefit){await apply(actor,initial,proof);await recordPracticeEvidenceIssued(proof);return initial;}}
 if(!choice.benefit){const fresh=planPracticeEvolutionGrant(actor,{...choice,expectedCycle:initial.grant.cycle});fresh.grant.issuedBy=initial.grant.issuedBy;const result=await apply(actor,fresh,proof);await recordPracticeEvidenceIssued(proof);return result;}
 const options=await talentOptions(actor,choice),fresh=planPracticeEvolutionGrant(actor,{...choice,expectedCycle:initial.grant.cycle});fresh.grant.issuedBy=initial.grant.issuedBy;narrator(actor,choice.user);const view=grantedView(actor,fresh.grant),claim={...choice,grantId:choice.id,requestId:choice.requestId??'direct:'+choice.id};let combined=planPracticeEvolutionClaim(view,claim,options);
 await recordPracticeClaimIntent(proof,claim,combined);if(choice.benefit==='talent')options.graph=await carregarGrafo();const final=planPracticeEvolutionGrant(actor,{...choice,expectedCycle:initial.grant.cycle});final.grant.issuedBy=initial.grant.issuedBy;narrator(actor,choice.user);combined=planPracticeEvolutionClaim(grantedView(actor,final.grant),claim,options);combined.actor={...final.actor,...combined.actor};const result=await apply(actor,combined,proof);await recordPracticeClaimCompleted(proof,claim);return result;
 });}
export async function claimPracticeEvolution(actor,choice,{user=globalThis.game?.user}={}){narrator(actor,user);return withElementalActorLock(actor,'practice-claim:'+choice.requestId,async()=>{
 narrator(actor,user);const grant=ledger(actor).grants[choice.grantId];if(grant&&grant.id!==choice.grantId)throw Error('A identificação da concessão precisa de conferência.');if(!grant)throw Error('O Narrador ainda não concedeu esta evolução.');const proof=await practiceEvolutionEvidence(actor,grant);
 if(completedPracticeClaim(proof,choice))return{actor:{},create:[],alreadyApplied:true,grant};
 if(grant.status==='claimed'){const answer=await apply(actor,planPracticeEvolutionClaim(actor,choice),proof);await recordPracticeClaimCompleted(proof,choice);return answer;}
 const options=await talentOptions(actor,choice);let plan=planPracticeEvolutionClaim(actor,choice,options);await recordPracticeClaimIntent(proof,choice,plan);if(choice.benefit==='talent')options.graph=await carregarGrafo();narrator(actor,user);plan=planPracticeEvolutionClaim(actor,choice,options);const answer=await apply(actor,plan,proof);await recordPracticeClaimCompleted(proof,choice);return answer;
 });}
