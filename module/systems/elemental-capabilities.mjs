import {elementalPaidParents} from './elemental-paid-parent.mjs';
import {previewElementalRewind} from './elemental-history.mjs';
import{elementalNativeData}from'./elemental-activity-data.mjs';import{ELEMENT_ABILITIES}from'./elemental-abilities-data.mjs';
const S='Immortals-system';const num=v=>Math.max(0,Number(v)||0);
const completePassives=new Set(['qiDenso','qiFlamejante','qiImutavel','estracalhar','punicaoTrovao','geada','qiAfiado','frioCongelante']);
const partialPassives={qiEletrico:['Deslocamento e conversão de dano','Reações de movimento e retaliação dependem do evento de combate.'],ofensivaVento:['Deslocamento adicional','Alcance do modo escolhido registrado; posicionamento é conferido no mapa.'],qiAfiado:['Gatilho crítico e salvaguarda','Dano dos acúmulos de Sangramento.'],frioCongelante:['Conversão e salvaguarda em crítico','Condição da Perfeição depende da definição confirmada.']};
export function elementalCapabilityState(actor,elementId,abilityId,context={}){
 const ability=ELEMENT_ABILITIES[elementId]?.find(a=>a.id===abilityId),tier=Math.min(ability?.level10?1:3,num(actor?.system?.elementAbilities?.[elementId]?.[abilityId]));
 if(!ability||!tier)return{clauses:[],fullyAutomatic:false,canUse:false,reason:'Habilidade ainda não aprendida.',costRange:null};
 const native=elementalNativeData(elementId,abilityId,tier),activity=context.activity,state=actor.flags?.[S]?.elementalState??{},meta=activity?.flags?.[S]?.elementalActivity;
 let clauses=completePassives.has(abilityId)?[{status:'automatic',label:'Bônus aplicado pela ficha e pelo combate.'}]:partialPassives[abilityId]?[{status:'automatic',label:partialPassives[abilityId][0]},{status:'assisted',label:partialPassives[abilityId][1]}]:[{status:abilityId==='qiDenso'?'rulePending':'assisted',label:abilityId==='qiDenso'?'Vida Base: integração em andamento.':'Use a atividade e suas escolhas para resolver a habilidade.'}];
 if(abilityId==='qiEletrico')clauses=[{status:'automatic',label:'Deslocamento, conversão e imunidade a reações de movimento registradas.'},...(tier===3?[{status:'automatic',label:'Reações excepcionais recebem o dano do grau aprendido de Punição do Trovão; sem a habilidade aprendida, não há retaliação.'}]:[])];
 if(abilityId==='coracaoMadeira')clauses=[{status:'automatic',label:'Sacrifício único de 100 Qi máximo e 1 Constituição; renascimento em 30 dias com PV e Qi total completos; Constituição retorna em 10 anos.'},{status:'assisted',label:'O narrador confirma o prazo manual de 1/100 da vida para recriar o coração e devolver o máximo de Qi ainda sacrificado.'}];
 if(abilityId==='selfHaste')clauses=[{status:'automatic',label:'Uma ativação por turno. As ações adicionais são recebidas e consumidas pelo combate.'}];
 if(abilityId==='mindBreak')clauses=[{status:'automatic',label:'Conversão de dano e manutenção de 2 PQ no início de cada turno.'},...(tier===3?[{status:'assisted',label:'Cópia com recursos compartilhados. Reconhecimento permite atingir o corpo; o narrador posiciona a cópia e confere observadores sem dados suficientes.'}]:[])];
 if(abilityId==='illusionDouble')clauses=[{status:'automatic',label:'Duplo com reservas próprias, invisibilidade do corpo, manutenção e espera de 30 dias.'},{status:'assisted',label:'Quem reconhece pode atingir o corpo. O narrador posiciona o duplo e confere privadamente observadores sem dados suficientes; áreas ainda podem alcançar o corpo.'}];
 const descriptions={overlappingSpace:'Projeções usam ações e Qi do original; os graus superiores controlam um ataque comum gratuito por cópia.',ilusaoRealista:'Escolha aparência, sons e tamanho; o reconhecimento é conferido privadamente pelo narrador.',mudancaCenario:'Registre o cenário e use a troca de tamanhos 4:1 quando disponível.',chasingLightning:'Escolha a posição atrás do alvo. O acerto só é liberado após o movimento e o consumo do deslocamento.',lightOrbs:'Cada orbe tem posição e deslocamento próprios. Os efeitos usam o conjunto pago e a grade só nasce após um acerto.',timeFreeze:'Posicione a área com o narrador; preparação, imunidades e bloqueios são conferidos por token.',darknessVortex:'Absorção usa o Qi total pago pelo atacante. A alternativa regional agenda a exaustão inevitável e a conferência das matrizes.',manipulacaoChamas:'Chamas controladas reaproveitam seu investimento; a redução de Fogo pertence ao ataque recebido.',defesaCortante:'A retaliação é vinculada ao atacante e concluída pelo cartão pago.',spaceRip:'Escolha um marcador de destino após a preparação. A chegada respeita três rodadas de trânsito.'};if(descriptions[abilityId])clauses=[{status:'assisted',label:descriptions[abilityId]}];
 const energy=Array.from(activity?.consumption?.targets??[]).find(t=>t.type==='attribute'&&/^(system\.)?energy\.(generated|total)$/.test(t.target));
 const pool=energy?.target.split('.').at(-1),min=energy?num(energy.value):0,maxScale=Math.max(1,num(activity?.consumption?.scaling?.max)||1),step=num(energy?.scaling?.formula)||1;
 const costRange=energy?{min,max:min+(maxScale-1)*step,pool}:null;let reason='';
 if(actor.isOwner===false)reason='Você não pode editar esta ficha.';
 else if(costRange&&num(actor.system.energy?.[pool])<min)reason='PQ insuficientes na reserva selecionada.';
 else if(num(actor.system.legacy2?.actions?.value)<num(activity?.activation?.value))reason='Pontos de Ação insuficientes.';
 const key=elementId+':'+abilityId+':'+meta?.key,now=Number(context.worldTime??globalThis.game?.time?.worldTime)||0;
 if(!reason&&num(state.cooldowns?.[key]?.availableAt)>now)reason='Aguarde o intervalo desta habilidade.';
 if(!reason&&abilityId==='coracaoMadeira'){
  if(actor.flags?.[S]?.elementalLongTerm?.woodHeart)reason='Acompanhe o ciclo do coração já criado nos efeitos da ficha.';
  else if(num(actor.system?.abilities?.con?.value)<2)reason='O sacrifício deve manter pelo menos 1 Constituição.';
  else if(num(actor.system?.energy?.max)<100)reason='Criar o coração exige pelo menos 100 Qi máximo.';
 }
 const combat=globalThis.game?.combat,turn=context.turn??(combat?.started&&combat.combatant?.id?(combat.uuid??combat.id)+':'+combat.round+':'+combat.combatant.id:null);if(!reason&&meta?.rule==='selfHaste'&&turn&&state.haste?.turn===turn)reason='Self Haste só pode ser usado uma vez por turno.';
 if(!reason&&meta?.rule==='chasingLightningCritical'&&!state.chasingLightning?.pending)reason='Conclua primeiro o movimento pago do Chasing Lightning.';
 if(!reason&&abilityId==='rewind'){const preview=previewElementalRewind(actor,now);if(!preview.available||preview.pending?.length)reason='Acumule uma hora de histórico completo real para usar Rewind.';}
 if(!reason&&meta?.paidBy&&!elementalPaidParents(actor,activity).length)reason='Conclua primeiro um acerto da etapa paga desta habilidade.';
 if(!reason&&meta?.linked&&!Object.values(state.receipts??{}).some(r=>r.source?.abilityId===abilityId&&r.key===meta.linked))reason='Ative primeiro a etapa principal desta habilidade.';
 const uses=activity?.uses,maxUses=num(uses?.max),availableUses=Math.max(0,maxUses-num(uses?.spent));
 if(!reason&&maxUses&&availableUses<1)reason='Os usos disponíveis já foram gastos.';
 const item=activity?.item,itemUse=Array.from(activity?.consumption?.targets??[]).find(t=>t.type==='itemUses'&&Number(t.value)>0),itemMax=num(item?.system?.uses?.max),itemRemaining=Math.max(0,itemMax-num(item?.system?.uses?.spent));
 if(!reason&&itemUse&&itemRemaining<num(itemUse.value))reason='Não há orbes ou usos suficientes.';
 const fullyAutomatic=clauses.every(c=>c.status==='automatic');return{clauses,fullyAutomatic,canUse:!reason,reason,costRange,uses:maxUses?{available:availableUses,max:maxUses}:itemUse?{available:itemRemaining,max:itemMax}:null,duration:activity?.duration??null,notes:native.pending};
}
