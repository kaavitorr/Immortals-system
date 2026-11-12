/** Native activity sources for the printed elemental rules. No world documents are created here. */
const SCOPE='Immortals-system';

/** Deterministic, browser-safe Foundry document ID, keyed by meaning rather than position. */
export function elementalStableId(key) {
  let a=2166136261,b=2246822519;
  for (const c of String(key)) { a=Math.imul(a^c.charCodeAt(0),16777619); b=Math.imul(b^c.charCodeAt(0),3266489917); }
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
const part=(formula,type='healing')=>({number:null,denomination:null,bonus:'',types:[type],custom:{enabled:true,formula:String(formula)},scaling:{mode:'',number:0,formula:''}});
const dice=(number,denomination,type='healing',scales=false)=>({number,denomination,bonus:'',types:[type],custom:{enabled:false,formula:''},scaling:{mode:scales?'whole':'',number:scales?1:0,formula:''}});
const uses=(max,period)=>({max:String(max),spent:0,recovery:period?[{period,type:'recoverAll'}]:[]});
const consumption=(type,value,target='',formula='')=>({type,target,value:String(value),scaling:{mode:formula?'amount':'',formula}});

/** Activity data remains pure JSON so it can be imported by compendium tooling and owned-item reconciliation. */
export function elementalNativeData(elementId,abilityId,tier,{qiPool='generated'}={}) {
  if (!['total','generated'].includes(qiPool)) throw new RangeError('Reserva de Qi inválida.');
  const activities={},rules=[],manual=[],pending=[];
  const data={activities,effects:[],rules,manual,pending};
  const pick=(...values)=>values[tier-1];
  const rule=(type,details={})=>rules.push({...details,type});
  const gm=message=>manual.push(message);
  function activity(key,name,type='utility',options={}) {
    const {qi=0,maxQi,increment=1,actions=0,reaction=false,condition='',range,rangeUnits,rangeSpecial='',target='self',count=1,choice=false,radius,duration,durationUnits='inst',expiry=null,special='',formula,healing,damage,save,limit,meta={},pool=qiPool,upkeep,...extra}=options;
    const scaled=maxQi!==undefined&&maxQi>qi;
    // Native UI's maximum is the scaling VALUE (increase + 1), not the number of increments.
    const max=scaled?String(1+Math.floor((maxQi-qi)/increment)):'';
    const targets=qi?[consumption('attribute',qi,'energy.'+pool,scaled?String(increment):'')]:[];
    const a={_id:elementalStableId('elemental:'+elementId+':'+abilityId+':activity:'+key),type,name,
      activation:{type:reaction?'reaction':actions?'action':'',value:actions,condition,override:true},
      consumption:{spellSlot:false,scaling:{allowed:scaled,max},targets},
      description:{value:'',chatFlavor:''},
      duration:{value:duration===undefined?'':String(duration),units:durationUnits,expiry,special,concentration:false,override:true},
      range:{value:range===undefined?'':String(range),units:rangeUnits??(range===undefined?(target==='self'?'self':'spec'):'m'),special:rangeSpecial||(range===undefined&&target!=='self'?'O livro não especifica alcance.':''),override:true},
      target:{override:true,prompt:target!=='self',template:{type:radius===undefined?'':'radius',size:radius===undefined?'':String(radius),units:'m'},affects:{type:target,count:count===null?'':String(count),choice,special:''}},
      uses:{max:'',spent:0,recovery:[]},effects:[],
      flags:{[SCOPE]:{elementalActivity:{elementId,abilityId,tier,key,...meta}}}};
    if(type==='utility')a.roll={formula:formula??'',name,visible:!!formula,prompt:false};
    if(type==='heal')a.healing=healing??part(formula??'0');
    if(type==='damage')a.damage={critical:{allow:false},parts:damage??[]};
    if(type==='attack') {a.attack={ability:'spellcasting',bonus:'',flat:false,type:{value:'ranged',classification:'spell'},critical:{threshold:20}};a.damage={includeBase:false,critical:{bonus:''},parts:damage??[]};a.conditions=[];}
    if(type==='save') {a.save={ability:[save??'con'],bonus:'',dc:{calculation:'',formula:''},visible:true};a.damage={onSave:'none',parts:damage??[]};a.conditions=[];}
    if(type==='teleport')a.teleport={override:true,value:String(range??0),units:'m'};
    if(limit){a.uses=uses(limit.max,limit.period);targets.push(consumption('activityUses',1));}
    if(upkeep)a.constantCost={enabled:true,value:String(upkeep),pool,concentration:false};
    Object.assign(a,extra);
    activities[a._id]=a;
    return a;
  }
  const touch={rangeUnits:'touch',target:'creature'};
  const nextTurn={duration:1,durationUnits:'round',expiry:'turnStart'};
  const addStatus=(a,status)=>{a.conditions=[{_id:elementalStableId(a._id+':'+status),condition:status,save:'con'}];};
  switch(abilityId) {
    case 'qiVibrante': {
      activity('heal','Curar','heal',{...touch,actions:1,qi:tier===1?2:1,...(tier>1?{maxQi:pick(2,6,15)}:{}),formula:tier===1?'5':tier===2?'3 * @scaling':'3 * @scaling + min(1, max(0, @scaling - 8)) * @elemental.modifier',meta:{requiresLivingTarget:true}});
      activity('stabilize','Estabilizar','utility',{...touch,actions:1,qi:2,meta:{rule:'stabilize'}});
      gm('A estabilização é aplicada à criatura tocada; a cura de Qi Vibrante exige mais de 0 PV.'); break;
    }
    case 'vitalidadeCrescente': {
      activity('barrier','Barreira de Qi','utility',{qi:tier===1?3:1,maxQi:pick(3,6,15),actions:1,reaction:true,...nextTurn,formula:tier===1?'5d8':'8 * @scaling',meta:{rule:'finiteBarrier',capacityFormula:tier===1?'5d8':'8 * @scaling',expires:'turnStart'}});
      activity('growth','Acelerar plantas','utility',{qi:pick(3,6,15),target:'object',count:null,duration:pick(3,5,10),durationUnits:'day',meta:{rule:'plantGrowth',maturationPerDay:pick(2,10,100)}});
      gm('O crescimento e o amadurecimento das plantas são resolvidos pelo narrador.');break;
    }
    case 'qiDenso': rule('baseHitPoints',{value:tier});break;
    case 'coracaoMadeira':
      activity('heart','Criar Coração de Madeira','utility',{meta:{rule:'woodHeart',sacrifice:{qiMaximum:100,constitution:1},rebirthDays:30,constitutionRecoveryYears:10,lifespanFraction:0.01}});
      gm('O narrador confirma apenas mortes sem estado de morto e o prazo manual de 1/100 da vida para recriar o núcleo e devolver o Qi máximo ainda sacrificado. Sacrifícios, renascimento com PV/Qi total completos em 30 dias e retorno da Constituição em 10 anos seguem o calendário do mundo.');break;
    case 'qiFlamejante':rule('damageConversion',{damageType:'fire',fraction:tier===1?0.5:1,optional:true});rule('attackDamageBonus',{damageType:'fire',value:pick(2,3,5),attacks:['common','technique']});break;
    case 'manipulacaoChamas': {
      const max=pick(1,5,15);
      activity('control','Criar e controlar chamas','utility',{qi:1,maxQi:max,target:'object',count:null,meta:{volumeM3:pick(1,125,10000),rule:'flameManipulation'}});
      activity('attack','Atacar com chamas','attack',{qi:1,maxQi:max,range:pick(15,25,35),target:'creature',damage:[part('3 * @scaling + @elemental.primary','fire')],meta:{volumeM3:pick(1,125,10000),rule:'flameAttack',requiresAttackResolution:true}});
      activity('reduce','Controlar chamas recebidas','utility',{qi:1,maxQi:max,target:'self',condition:'Ao ser alvo de um ataque de chamas.',formula:'5',meta:{rule:'fireDamageReduction',damageType:'fire',value:5}});
      gm('Escolha controlar, atacar ou dispersar as mesmas chamas; não pague novamente por redirecionar chamas já controladas. Ataques de técnica com alcance de 15, 25 ou 35 metros conforme o grau.');
      break;
    }
    case 'cancaoFogo':rule('techniqueGrant',{damageTypes:['fire'],grades:[3,5,7].slice(0,tier),condition:'queimado',save:'con',conditionMustBePurchased:true});gm('Crie as técnicas concedidas conforme a Biblioteca da Seita; o grau não determina dano, custo ou condição gratuitos.');break;
    case 'avatarChamas':
      rule('resistance',{damageTypes:['fire'],value:60});
      activity('teleport','Desfazer-se em chamas','teleport',{range:30,limit:{max:3,period:'initiative'},condition:'Ao ser alvo de ataque comum ou sofrer uma técnica, antes de conhecer o dano.',meta:{rule:'flameEscape',encounterLimit:3}});break;
    case 'qiImutavel':rule('resistance',{damageTypes:['bludgeoning','piercing','slashing'],value:pick(1,3,5)});break;
    case 'pelePedra':
      activity('armor','Receber Pontos de Armadura','utility',{qi:tier===1?5:1,maxQi:pick(5,10,20),formula:tier===1?'20':'4 * @scaling',limit:{max:1,period:'lr'},durationUnits:'spec',special:'Até os Pontos de Armadura se esgotarem.',meta:{rule:'armorPoints',formula:tier===1?'20':'4 * @scaling'}});break;
    case 'manipulacaoTerra':
      activity('shape','Manipular terra','utility',{qi:tier===1?2:1,maxQi:pick(2,5,5),target:'object',count:null,meta:{rule:'earthStructure',volumeM3:pick(1,125,1000),sectionWidthM:3,hitPoints:tier===3?75:50,armorClass:tier===3?18:15}});
      gm('Objetos e estruturas de terra são definidos pelo narrador; nenhuma cena, parede ou criatura é criada automaticamente.');break;
    case 'prisaoTerra': {
      const a=activity('attack','Prisão de Terra — acerto','attack',{qi:100,pool:'total',actions:2,range:30,target:'creature',meta:{rule:'earthPrisonAttack',followUp:'save'}});
      activity('save','Prisão de Terra — salvaguarda','save',{range:30,target:'creature',save:'dex',condition:'Somente após acertar a jogada de técnica; o Qi e as ações já foram pagos.',meta:{rule:'earthPrisonSave',paidBy:a._id,hitPoints:5000,spaceConceptExit:10}});
      gm('Após o acerto e a falha de Agilidade, o narrador resolve a esfera de 5.000 PV, a imunidade a ataques externos e o bloqueio de teletransporte.');break;
    }
    case 'qiAfiado':rule('criticalCondition',{condition:'sangramento',save:'str',maxStacks:pick(1,5,8)});break;
    case 'defesaCortante':
      activity('retaliate','Defesa Cortante','damage',{qi:1,maxQi:pick(3,6,9),target:'creature',condition:'Quando uma criatura inimiga escolher você como alvo de um ataque comum ou de técnica.',damage:[part('3 * @scaling','slashing')],meta:{rule:'slashingRetaliation'}});break;
    case 'estracalhar':rule('offensiveBurst',{damageTypes:['slashing','piercing'],damagePerTwoDice:tier,extraDicePerConceptLevels:2});break;
    case 'qiDilacerador':
      activity('boost','Aprimorar acerto e dano','utility',{qi:1,maxQi:20,formula:'@scaling',condition:'Aplicar à jogada de ataque escolhida.',meta:{rule:'laceratingQi',attackBonusPerQi:1,finalDamagePerQi:1,maximum:20}});
      gm('Aplique o bônus apenas à jogada escolhida e o dano adicional ao final do cálculo.');break;
    case 'qiFluido':
      activity('whip','Formar chicote de água','utility',{qi:pick(1,2,5),range:'6 + 1.5 * @conceitos.agua.level',duration:1,durationUnits:'minute',meta:{rule:'waterWhip',reachFormula:'6 + 1.5 * @conceitos.agua.level',advantages:pick(0,1,3)}});gm('O chicote usa os ataques do personagem; seu alcance e suas vantagens pertencem somente ao chicote.');break;
    case 'bolhaVersatil':
      activity('bubble','Criar bolha protetora','utility',{...touch,qi:pick(5,5,20),duration:pick(1,8,8),durationUnits:'hour',meta:{rule:'protectiveBubble',hitPoints:pick(25,50,100),armorClass:pick(15,18,22),oncePerTargetLongRest:true,conditionsImmune:tier>1?['queimado','sangramento','envenenado']:[]}});
      gm('A bolha separa o dano da criatura e permite respirar; acompanhe seus próprios PV e a limitação por criatura a cada descanso longo.');break;
    case 'bencaoAgua':rule('auxiliaryGrant',{nature:'support',maxQi:[5,10,15].slice(0,tier),purposes:['healing','defense','utility']});gm('Construa cada técnica auxiliar de suporte nas regras da Biblioteca da Seita.');break;
    case 'corpoFluido':
      activity('fluid','Manter Corpo Fluído','utility',{qi:15,upkeep:15,durationUnits:'spec',special:'Enquanto forem pagos 15 Qi por rodada.',meta:{rule:'unignorableResistance',value:25,allDamageTypes:true}});
      gm('A resistência 25 não pode ser ignorada; a manutenção nativa cobra 15 Qi no início de cada turno enquanto estiver ativa.');break;
    case 'qiEletrico':rule('movementBonus',{meters:pick(5,10,15)});rule('damageConversion',{damageType:'lightning',fraction:tier===1?0.5:1,optional:true});if(tier>1)rule('noMovementReactions');if(tier===3)rule('movementRetaliation',{abilityId:'punicaoTrovao'});break;
    case 'punicaoTrovao':
      rule('thunderPunishment',{trigger:'miss',damageType:'lightning',formula:tier===1?'floor(@elemental.primary / 2)':'@elemental.primary'});
      if(tier===3)rule('thunderPunishment',{trigger:'hit',damageType:'lightning',value:6});break;
    case 'cancaoTrovao':rule('techniqueGrant',{damageTypes:['lightning'],grades:[3,5,7].slice(0,tier),auxiliaryMaxQi:[6,10,15].slice(0,tier),condition:'incapacitado',save:'con',conditionMustBePurchased:true});gm('Crie cada técnica ou auxiliar escolhida conforme a Biblioteca da Seita.');break;
    case 'chasingLightning':
      activity('chase','Chasing Lightning','utility',{qi:4,target:'creature',range:'@attributes.movement.walk',condition:'Consome seu deslocamento; apareça atrás de uma criatura ao alcance dele.',meta:{rule:'chasingLightning',automaticHit:true,consumeMovement:true}});
      activity('critical','Verificar acerto crítico','utility',{qi:4,condition:'Opcional, depois de pagar Chasing Lightning; esta rolagem verifica apenas o crítico.',meta:{rule:'chasingLightningCritical',linked:'chase'}});
      gm('Escolha um ataque comum ou de técnica já existente. O acerto é garantido; o gasto opcional de 4 Qi permite rolar somente para verificar crítico.');break;
    case 'barreiraVento':
      activity('barrier','Barreira contra danos físicos','utility',{qi:pick(3,6,20),...nextTurn,meta:{rule:'temporaryResistance',damageTypes:['bludgeoning','piercing','slashing'],value:pick(5,10,20)}});
      activity('breathe','Respirar em qualquer ambiente','utility',{qi:pick(3,6,20),duration:pick(1,4,12),durationUnits:'hour',meta:{rule:'environmentalBreathing'}});break;
    case 'ofensivaVento':rule('movementBonus',{meters:pick(3,6,9)});rule('meleeToRanged',{meters:pick(9,12,18),retainMeleeEffects:true});break;
    case 'controleVento':
      activity('dash','Disparada','utility',{actions:1,meta:{rule:'dash'}});
      activity('clones','Criar clones de vento','utility',{qi:pick(5,10,12),durationUnits:'spec',special:'Até ser atingido uma vez por clone ou ficar sem clones.',meta:{rule:'windClones',count:tier===3?'@conceitos.vento.level':pick(3,5,0),armorClassPerClone:1,armorClassMaximum:30,loseOnHit:1}});
      gm('Os clones são defesas ilusórias, sem criação de novos atores. Reduza o bônus de CR em 1 por ataque que atingir.');break;
    case 'domoVento':
      activity('dome','Criar Domo de Vento','utility',{qi:20,radius:45,target:'creature',count:null,duration:10,durationUnits:'minute',meta:{rule:'windDome',spaceConceptExit:10,endsUnconscious:true}});
      gm('O narrador delimita o domo e resolve a impossibilidade de sair, inclusive por teletransporte sem Espaço 10.');break;
    case 'frioCongelante':rule('damageConversion',{damageType:'cold',fraction:tier===1?0.5:1,optional:true});rule('criticalCondition',{attack:'technique',condition:tier===3?'congelando':'hipotermico',save:'con',dcBonus:tier===3?3:0});break;
    case 'skyFreeze':
      activity('structure','Criar estruturas de gelo','utility',{qi:pick(5,10,15),actions:1,target:'object',count:tier===3?1:pick(10,20,0),meta:{rule:'iceStructure',widthM:3,heightM:30,maximumSize:tier===3?'huge':null,hitPoints:pick(35,55,100),armorClass:pick(13,16,22),cover:'total',domeCooldownSeconds:tier===3?60:0}});
      gm('Pilares, estruturas e cobertura total são definidos pelo narrador. Após a destruição de um domo de Perfeição, aguarde 1 minuto para criar outro.');break;
    case 'geada':rule('frostStacks',{naturalThreshold:pick(18,16,12),maximum:pick(3,4,5),attackPenaltyPerStack:1,dexSavePenaltyPerStack:1,removeQiPerStack:1});break;
    case 'eternalPrison':
      activity('prison','Criar prisão de gelo','utility',{...touch,qi:20,radius:3,durationUnits:'spec',special:'20 Qi no início de cada turno; permanente ao totalizar 500 Qi.',meta:{rule:'eternalIcePrison',hitPoints:2000,indestructibleToLowerCultivation:true,permanentAtQi:500,upkeepQi:20}});
      activity('maintain','Manter prisão de gelo','utility',{qi:20,condition:'No início do seu turno, até totalizar 500 Qi investidos.',meta:{rule:'eternalIcePrisonUpkeep',permanentAtQi:500}});
      gm('Escolha um objeto, estrutura, criatura voluntária/incapaz de lutar ou área elegível. Registre o total investido; ao alcançar 500 Qi, encerre os pagamentos.');break;
    case 'ilusaoRealista':
      activity('illusion','Criar ilusões realistas','utility',{qi:pick(2,10,20),target:'object',count:pick(1,10,80),duration:pick(10,1,8),durationUnits:tier===1?'minute':'hour',meta:{rule:'realisticIllusion',size:tier===1?'small':'medium',piercedByConceptLevel:true,piercedByRanksAbove:2}});
      gm('O narrador representa as ilusões e verifica quem consegue enxergá-las como falsas.');break;
    case 'mindBreak':
      activity('mind','Ativar Mind Break','utility',{qi:pick(2,4,10),condition:'No início do seu turno.',durationUnits:'spec',special:'2 PQ no início de cada turno para manter.',meta:{rule:'mindBreak',damageType:'psychic',fraction:tier===1?0.5:1,bonus:tier>1?3:0,redirectReactions:tier===3}});
      if(tier===3)gm('A cópia compartilha ações e recursos do corpo. Quem reconhece a ilusão pode atingir o corpo; observadores sem dados suficientes exigem conferência privada do narrador antes do consumo.');break;
    case 'mudancaCenario':
      activity('scenery','Mudar cenário','utility',{qi:pick(5,10,20),target:'object',count:null,duration:1,durationUnits:'hour',meta:{rule:'illusoryScenery',areaM2:pick(100,1000,100000),illusionSizeRatio:4,piercedByConceptLevel:true,piercedByRanksAbove:2}});
      gm('A área é dada em metros quadrados; o livro não define formato. O narrador representa o cenário e as criaturas ilusórias sem alterar a cena automaticamente.');break;
    case 'illusionDouble':
      activity('double','Criar Illusion Double','utility',{qi:30,upkeep:30,condition:'No início de cada um de seus turnos.',durationUnits:'spec',special:'Após encerrar, aguarde 30 dias para usar novamente.',meta:{rule:'illusionDouble',areaKm:10000,cooldownDays:30,cooldownStarts:'end',independentQi:true}});
      gm('O duplo tem ficha e Qi próprios. Invisibilidade do corpo, reconhecimento, manutenção e espera de 30 dias são registrados; o narrador posiciona a cópia e confere privadamente observadores sem dados suficientes. Efeitos em área ainda podem alcançar o corpo.');break;
    case 'toqueCurativo':
      activity('heal','Curar','heal',{...touch,actions:1,qi:1,maxQi:pick(5,15,30),healing:dice(1,4,'healing',true)});
      activity('stabilize','Estabilizar','utility',{...touch,actions:1,qi:2,meta:{rule:'stabilize'}});gm('A estabilização é aplicada à criatura tocada a 0 PV.');break;
    case 'visaoAlcance':
      activity('vision','Ampliar Sentido Divino','utility',{qi:pick(5,10,20),duration:pick(10,10,1),durationUnits:tier===3?'hour':'minute',meta:{rule:'divineSenseMultiplier',multiplier:pick(2,3,10),mirror:true}});
      gm('O espelho mostra o que o Sentido Divino alcançar e emite som conforme o foco; o narrador decide o que pode ser percebido.');break;
    case 'lightOrbs': {
      const n=pick(3,6,10);data.uses={max:String(n),spent:n,recovery:[]};
      const create=activity('create','Criar orbes de luz','utility',{actions:1,qi:pick(5,10,15),meta:{rule:'lightOrbCreation',count:n,movementM:18}});create.consumption.targets.push(consumption('itemUses','-@item.uses.spent'));
      const blast=activity('blast','Light Blast','attack',{range:18,target:'creature',damage:[part('@danoCultivo','radiant')],meta:{rule:'lightBlast',damageType:'radiant',useStandardAttackDamage:true}});blast.consumption.targets.push(consumption('itemUses',1));
      const grid=activity('grid','Light Grid — acerto','attack',{range:18,target:'creature',meta:{rule:'lightGrid',maximumOrbs:tier,contactDamagePerOrb:10}});grid.consumption.scaling={allowed:tier>1,max:String(tier)};grid.consumption.targets.push(consumption('itemUses',1,'',tier>1?'1':''));
      activity('grid-contact','Light Grid — tocar a grade','damage',{range:18,target:'creature',condition:'Quando a criatura se mover e tocar uma grade já criada; selecione o número de orbes da grade.',damage:[part('10 * @scaling','radiant')],consumption:{spellSlot:false,scaling:{allowed:tier>1,max:String(tier)},targets:[]},meta:{rule:'lightGridContact',noOrbCost:true}});
      const flash=activity('flash','Light Flash','save',{range:18,radius:pick(7.5,12,18),target:'creature',count:null,save:'con',duration:1,durationUnits:'turn',expiry:'turnEnd',condition:'No máximo uma vez por rodada. Origem da área: o orbe, apenas quem pode usar Sentido Divino.',meta:{rule:'lightFlash',oncePerRound:true,origin:'orb',requiresDivineSense:true}});flash.consumption.targets.push(consumption('itemUses',1));addStatus(flash,'jj-cego');
      gm('O contador nativo representa um conjunto de orbes; criar um novo conjunto repõe o contador. Mova sua origem e resolva a visão por Sentido Divino. Light Blast usa o dado padrão de cultivo como dano de Energia; modificações específicas do ataque padrão por habilidades devem ser confirmadas pelo narrador. Para PdN sem dado padrão de cultivo, o narrador deve configurar explicitamente o dano nativo de Light Blast antes do uso; Light Grid causa dano apenas ao tocar a grade, nunca ao acertar.');break;
    }
    case 'recuperacaoMassa':
      activity('heal','Recuperação em Massa','heal',{qi:50,range:2000,target:'creature',count:null,choice:true,healing:dice(50,4),meta:{rule:'massRecovery',constitutionCost:1,recoverConstitutionPerDay:1,recoverOn:'lr'}});
      gm('A ativação confirma o custo de 1 Constituição, mantendo o mínimo de 1 e os pontos distribuíveis. A dívida é recuperada automaticamente em 1 ponto por dia ao concluir um descanso longo; sua ficha e a prévia do descanso mostram o saldo.');break;
    case 'absorcao': {
      const attack=activity('attack','Absorção — ataque','attack',{qi:1,maxQi:pick(3,8,15),target:'creature',damage:[part('3 * @scaling','void')],meta:{rule:'voidAbsorptionAttack',healingPerQi:'1d4'}});
      const heal=activity('heal','Absorção — cura própria','heal',{healing:dice(1,4,'healing',true),condition:'Depois do ataque pago, selecione exatamente o mesmo Qi gasto.',meta:{rule:'voidAbsorptionHealing',paidBy:attack._id,healSelf:true}});heal.consumption.scaling={allowed:true,max:String(pick(3,8,15))};
      gm('A cura própria é uma etapa do mesmo uso pago. Selecione o mesmo Qi investido no ataque e não pague novamente.');break;
    }
    case 'letargia': {
      activity('save','Preparar Letargia no ataque','utility',{qi:pick(3,5,5),condition:'Aplica Vazio ao ataque escolhido e resolve a salvaguarda de cada alvo atingido.',meta:{rule:'lethargy',damageType:'void',save:'con',condition:'jj-letargico',dcBonus:pick(0,2,3)}});
      gm('O ataque preparado usa dano de Vazio; a salvaguarda de Letargia é resolvida nos alvos desse ataque, sem outro custo de Qi.');break;
    }
    case 'darknessCloak':
      activity('cloak','Ativar Darkness Cloak','utility',{actions:2,duration:10,durationUnits:'minute',meta:{rule:'darknessCloak',ranksAbove:tier===3?2:1,stealthBonus:pick(0,5,10)}});break;
    case 'darknessVortex':
      activity('vortex','Absorver Qi de ataques','utility',{qi:30,duration:1,durationUnits:'round',expiry:'turnEnd',special:'Até o fim do seu próximo turno.',meta:{rule:'darknessVortex',oncePerAttackerLongRest:true}});
      activity('world-vortex','Absorção de Qi da região','utility',{target:'object',count:null,durationUnits:'spec',special:'Uma vez a cada 30 dias.',meta:{rule:'regionalQiAbsorption',areaKm:1000,cooldownDays:30,fullQiRecovery:true,exhaustion:5,exhaustionDelayHours:2}});
      gm('A absorção por atacante é limitada a uma vez por criatura por descanso longo. A alternativa regional, as matrizes e a exaustão são resolvidas pelo narrador; registre a espera de 30 dias.');break;
    case 'slowQuickZone':
      activity('zone','Criar zona de dilatação temporal','utility',{qi:pick(10,30,100),maxQi:pick(10,80,280),increment:10,radius:pick(9,30,300),target:'creature',count:null,duration:10,durationUnits:'minute',meta:{rule:'timeDilation',baseMaximumMultiplier:pick(3,5,10),maximumMultiplier:pick(3,10,100),multiplierStep:pick(0,1,5),extraQiPerStep:10,conceptTrainingForbidden:true}});
      gm('Aceleração ou desaceleração e efeitos narrativos são definidos pelo narrador. O custo básico permite até 3/5/10 vezes; cada escala acrescenta 1 vez no Dominado ou 5 vezes na Perfeição.');break;
    case 'selfHaste':
      activity('haste','Receber ações adicionais','utility',{qi:pick(3,6,10),...nextTurn,meta:{rule:'selfHaste',actionsGranted:tier,expires:'turnStart',incompatible:'overlappingSpace'}});break;
    case 'timeFreeze':
      activity('freeze','Congelar área no tempo','utility',{qi:pick(20,40,100),condition:tier===3?'Preparação de 1 minuto.':'Preparação de 1 hora.',radius:pick(30,120,300),target:'creature',count:null,duration:pick(1,3,30),durationUnits:'day',meta:{rule:'timeFreeze',preparationSeconds:tier===3?60:3600,immuneAtTimeConcept:pick(3,5,7)}});
      gm('A preparação não consome PA. O narrador verifica imunidades e encerra o congelamento se houver interação proibida com criatura ou objeto contendo Qi.');break;
    case 'rewind':
      activity('rewind','Voltar o corpo em uma hora','utility',{actions:3,qi:50,pool:'total',condition:'Uma vez a cada 30 dias.',meta:{rule:'rewind',lookbackHours:1,cooldownDays:30,restoredQiPenalty:50}});
      gm('A prévia usa uma hora de histórico real da ficha: PV, Qi total, Feridas, usos, condições e consumos. O Qi total restaurado fica 50 abaixo daquele estado; os 3 Pontos de Ação e a espera de 30 dias permanecem pagos. A restauração é concluída pelo narrador a partir do cartão pago.');break;
    case 'spaceStep':
      activity('teleport','Space Step','teleport',{qi:4,range:tier===1?15:40,limit:{max:1,period:'turnStart'},meta:{rule:'spaceStep',noMovementReactions:true}});
      if(tier===3)activity('advantages','Vantagens de Space Step','utility',{qi:4,condition:'Opcional, após pagar o teletransporte de Space Step.',meta:{rule:'spaceStepAdvantages',advantages:4,linked:'teleport'}});break;
    case 'overlappingSpace':
      activity('copies','Criar cópias de espaço','utility',{actions:1,qi:pick(2,6,10),duration:1,durationUnits:'turn',expiry:'turnEnd',meta:{rule:'overlappingSpace',copies:tier,freeCommonAttackEach:tier>1,sharedQi:true,incompatible:'selfHaste'}});
      gm('O narrador resolve as cópias e suas ações usando a mesma reserva de Qi; nenhum ator é clonado automaticamente.');break;
    case 'spaceRip':
      activity('portal','Abrir rasgo do espaço','utility',{qi:pick(10,20,30),range:pick(1000,50000,500000),target:'space',condition:pick('Preparação de 10 minutos; trânsito de 3 rodadas.','Preparação de 1 minuto.','Preparação de 1d4 rodadas.'),meta:{rule:'spaceRip',preparation:pick('10 minutos','1 minuto','1d4 rodadas'),preparationSeconds:pick(600,60,null),preparationRounds:tier===3?'1d4':null,transitRounds:3}});
      gm('O narrador define entrada, destino e tempo de travessia do portal; não mova fichas imediatamente antes da preparação terminar.');break;
    case 'mysticalRealm':
      activity('realm','Criar Reino Místico','utility',{meta:{rule:'mysticalRealm',sacrificeCultivationLevels:2,minimumCultivation:'Imperador Sagrado',radiusKm:10000}});
      activity('miniature','Miniaturizar Reino Místico','utility',{condition:'Preparação de 1 hora.',meta:{rule:'miniaturizeRealm',preparationSeconds:3600}});
      gm('A criação exibe a prévia do sacrifício de 2 níveis normais e registra o reino de 10.000 km, com seu cultivo e teto de Qi originais. A cena, paisagem e matrizes são configuradas com o narrador.');break;
    default: throw new RangeError('Habilidade elemental desconhecida: '+abilityId);
  }
  return data;
}
