/** Native profession products. Item quantity is debited only by native consumption. */
import {constitutionModifiers} from './constitution-rules.mjs';
import {PROFESSION_PRODUCTS} from './profession-products-data.mjs';
const SCOPE='Immortals-system';
const qualityAliases={inferior:'inferior',common:'common',comum:'common',superior:'superior',perfect:'perfect',perfeita:'perfect',perfeito:'perfect'};
const qualityToxins={inferior:20,common:8,superior:4,perfect:2};
export function professionProductStableId(key){let a=2166136261,b=2246822519;for(const character of String(key)){a=Math.imul(a^character.charCodeAt(0),16777619);b=Math.imul(b^character.charCodeAt(0),3266489917);}return(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
export function professionProductConfiguration(id,{level,quality,element}={}){
 const product=PROFESSION_PRODUCTS.find(entry=>entry.id===id);if(!product)throw new RangeError('Produto de profissão desconhecido.');
 level=level===undefined?(product.levels?.min??null):level;
 if(product.levels&&(!Number.isInteger(level)||level<product.levels.min||level>product.levels.max))throw new RangeError('O nível está fora dos limites desta receita.');
 if(!product.levels&&level!==null)throw new RangeError('Esta ferramenta não possui nível na fonte.');
 quality=quality===undefined?(product.kind==='pill'?'inferior':null):quality;
 if(quality!==null){quality=qualityAliases[String(quality).toLocaleLowerCase('pt-BR')];if(!quality)throw new RangeError('Qualidade de produto inválida.');}
 if(product.kind==='pill'&&!quality)throw new RangeError('Escolha a qualidade da pílula.');
 if(element!==undefined&&(typeof element!=='string'||!element.trim()||element.length>80))throw new RangeError('Escolha um elemento válido.');
 return{id:product.id,kind:product.kind,profession:product.profession,level,quality,...(element===undefined?{}:{element:element.trim()})};
}
const part=(formula,types)=>({number:null,denomination:null,bonus:'',types:Array.isArray(types)?types:[types],custom:{enabled:true,formula:String(formula)},scaling:{mode:'',number:0,formula:''}});
const consume=(type,value,target='',increment='')=>({type,target,value:String(value),scaling:{mode:increment?'amount':'',formula:String(increment)}});
const asList=value=>Array.isArray(value)?[...value]:value?[String(value)]:[];
/** Product level belongs to the item, independently of the consumer's cultivation. */
export function professionProductNativeData(id,configuration={}){
 const config=professionProductConfiguration(id,configuration),product=PROFESSION_PRODUCTS.find(entry=>entry.id===id),level=config.level;
 const data={activities:{},effects:[],rules:[],manual:[],pending:[]};
 const rule=(type,details={})=>data.rules.push({type,...details}),manual=text=>data.manual.push(text);
 const activity=(key,name,type='utility',options={})=>{
  const {actions=0,reaction=false,qi=0,pool='generated',consumeItem=product.kind==='pill'||product.kind==='talisman',formula='',damage=[],target='self',count=1,range,template='',size='',duration='',units='inst',expiry=null,special='',condition='',meta={},scaleMax='',scaleQi='',...extra}=options;
  const targets=consumeItem?[consume('itemUses',1)]:[];if(qi)targets.push(consume('attribute',qi,'energy.'+pool,scaleQi));
  const a={_id:professionProductStableId('profession-product:'+id+':'+key),type,name,
   activation:{type:reaction?'reaction':actions?'action':'',value:actions,condition,override:true},
   consumption:{spellSlot:false,scaling:{allowed:!!scaleMax,max:String(scaleMax)},targets},
   description:{value:'',chatFlavor:''},duration:{value:String(duration),units,expiry,special,concentration:false,override:true},
   range:{value:range===undefined?'':String(range),units:range===undefined?(target==='self'?'self':'spec'):'m',special:range===undefined&&target!=='self'?'Alcance não especificado na fonte; resolva com o narrador.':'',override:true},
   target:{override:true,prompt:target!=='self',template:{type:template,size:String(size),width:'',units:'m'},affects:{type:target,count:count===null?'':String(count),choice:false,special:''}},
   uses:{max:'',spent:0,recovery:[]},effects:[],flags:{[SCOPE]:{professionProductActivity:{productId:id,key,level,quality:config.quality,...(config.element?{element:config.element}:{}),manualResolution:type==='utility',consumeItem,...meta}}}};
  if(type==='utility')a.roll={formula:String(formula),name,visible:!!formula,prompt:false};
  if(type==='heal')a.healing=part(formula,'healing');
  if(type==='damage')a.damage={critical:{allow:false},parts:damage};
  if(type==='save'){a.save={ability:['dex'],bonus:'',dc:{calculation:'initial',formula:''},visible:true};a.damage={onSave:'half',parts:damage};a.conditions=[];}
  if(type==='reduction')a.reduction={formula:String(formula)};
  Object.assign(a,extra);data.activities[a._id]=a;return a;
 };
 if(product.kind==='pill'){
  const toxin=qualityToxins[config.quality]*Number(product.toxinMultiplier??1),poison=['pilula-do-sangue-divino','pilula-de-nutricao-da-alma'].includes(id)?Math.floor(toxin):toxin;
  rule('pillToxins',{quality:config.quality,base:qualityToxins[config.quality],multiplier:product.toxinMultiplier??1,value:poison});
  const meta={rule:id,poison};
  if(id==='pilula-de-cura'){
   activity('consume','Consumir e rolar cura inicial','heal',{formula:level+'d4 + @abilities.con.mod',meta:{...meta,recurringHealing:{formula:level+'d4',intervalSeconds:60,repetitions:10,manual:true}}});
   manual('A cura inicial usa o nível desta pílula. Role mais '+level+'d4 a cada minuto, durante 10 minutos; acompanhe a recuperação recorrente com o narrador.');
  }else{
   if(id==='pilula-de-limpeza-de-meridianos')Object.assign(meta,{essenceMultiplier:2,days:3});
   if(id==='pilula-da-abertura-celestial')Object.assign(meta,{nextBreakthrough:{difficultyReduction:3,cultivationCostMultiplier:0.7,rounding:'ceil'}});
   if(id==='pilula-de-recuperacao-de-qi')Object.assign(meta,{restoreQiDice:1,maximumSpentQiDice:2,manualShortRest:true});
   if(id==='pilula-do-milagre-azul')Object.assign(meta,{nextIlluminationMultiplier:2,expiresOn:['rankAdvance','illuminationGain'],maximumDays:10});
   if(id==='pilula-das-9-revolucoes-da-mente')Object.assign(meta,{divineSenseMultiplier:3,requiresRankAdvance:5,permanent:true});
   if(id==='pilula-do-sangue-carmesim')Object.assign(meta,{attributeBonus:2,temporaryRefinedQiFraction:0.3,rounding:'ceil',halfBenefitWhenOneRankAbove:true,durationMinutes:10,manualAftereffect:{exhaustion:2,constitutionLoss:1,days:180}});
   if(id==='pilula-espiritual-terrena')Object.assign(meta,{nextBreakthroughToxinsIgnored:20,additionalPerRankAbove:20});
   if(id.includes('condensacao-elemental'))Object.assign(meta,{nextElementTrainingDifficultyReduction:1,requiresMatchingConceptLevel:true,requiresElement:true});
   if(id==='pilula-do-balanceamento-de-origem')Object.assign(meta,{essenceAbsorptionMultiplier:1.2,oncePerLifetime:true,permanent:true});
   if(id==='pilula-de-cura-de-veneno')Object.assign(meta,{manualPoisonRarity:true});
   if(id==='pilula-da-afinidade-elemental')Object.assign(meta,{requiresElement:true,elementAffinityMaximumLevel:level,elementTrainingCostMultiplier:0.5,requiresBeastEssence:true,permanent:true});
   if(id==='pilula-do-corpo-espiritual')Object.assign(meta,{requiresPhysicianQi:true,requiresMatchingCultivationRank:true,restoredHitPoints:30,maximumHours:1,manualLimbRegeneration:true});
   if(id==='pilula-da-salvaguarda')Object.assign(meta,{nextSevereInjuryProtection:['remainAt1HitPoint','negateBrutalOrPersistentWound','ignoreMaximumHitPointLossFor10Minutes']});
   if(id==='pilula-das-chamas-do-renascimento')Object.assign(meta,{restoreAllHitPoints:true,restoreAllRefinedQi:true,requiresPhoenixFlames:true});
   if(id==='pilula-da-tranquilidade')Object.assign(meta,{nextBreakthroughPreventsHeartDemon:true});
   if(id==='pilula-do-mundo-ilimitado')Object.assign(meta,{nextSuccessfulRankAdvancePermanentQi:30});
   if(id==='pilula-da-explosao-de-vitalidade')Object.assign(meta,{rollAllRemainingHitDice:true,extraHitDice:3,manualAftereffect:{preventHitDiceRecoveryDays:5,exhaustion:2,days:5}});
   activity('consume','Consumir pílula (resolver efeito)','utility',{meta});
   manual('O consumo usa uma unidade da pilha e registra as toxinas. Resolva o efeito descrito com o narrador, incluindo requisitos, duração e eventuais benefícios ou consequências permanentes. Possuir a pílula não concede seus efeitos.');
  }
 }else if(product.kind==='talisman'){
  switch(id){
   case 'talisma-explosivo':
    activity('release','Liberar explosão','save',{actions:2,target:'creature',count:null,template:'radius',size:12,damage:[part(6*level,'bludgeoning'),part(6*level,'fire')],meta:{rule:'explosiveTalisman',save:'dex',saveLabel:'Reflexo',manualSaveDifficulty:true}});
    manual('A explosão causa todo o dano na falha de Reflexo e metade no sucesso. A fonte não fornece CD da salvaguarda: confirme a CD com o narrador antes de resolvê-la; a atividade conserva o cálculo nativo padrão.');break;
   case 'talisma-de-barreira':activity('barrier','Ativar barreira','reduction',{reaction:true,formula:20*level,units:'spec',special:'Até o início do seu próximo turno.',meta:{rule:'barrierTalisman',consumptionOnActivate:true,untilNextTurn:true,singleAttackOnly:false,manualGeometry:true}});manual('A redução de '+20*level+' dura até o início do próximo turno. Selecione a duração correspondente ao ativar a redução e confirme a geometria com o narrador.');break;
   case 'talisma-de-fuga':activity('escape','Ativar fuga','utility',{reaction:true,range:10000*level,meta:{rule:'escapeTalisman',manualDestination:true,randomDestination:true,distanceMeters:10000*level}});manual('O narrador sorteia um destino a '+10000*level+' metros, confirma a segurança e move o token.');break;
   case 'talisma-de-selamento':activity('seal','Criar barreira de selamento','utility',{actions:1,target:'creature',count:null,template:'radius',size:30,meta:{rule:'sealingTalisman',barrierHitPoints:150*level,blocksRanksAtMost:level,damagedOnlyByHigherRank:true,manualGeometry:true}});manual('Desenhe a barreira de raio de 30 metros e acompanhe seus '+150*level+' PV. O narrador aplica os limites de rank; nenhum muro ou ator é criado automaticamente.');break;
   case 'talisma-de-ocultacao':activity('conceal','Rasgar e ocultar','utility',{meta:{rule:'concealmentTalisman',condition:'invisible',maximumMovementMetersPerRound:3,divineSenseMaximumRank:level}});manual('Aplique Invisível e confira o movimento a cada rodada e o rank de quem usa Sentido Divino.');break;
   case 'talisma-de-estagnacao':activity('stagnate','Rasgar e criar área de estagnação','utility',{target:'creature',count:null,template:'radius',size:120,meta:{rule:'stagnationTalisman',movementMultiplier:0.5,maximumAffectedRank:level+2,manualGeometry:true}});manual('Marque o raio de 120 metros e aplique metade do deslocamento somente a criaturas dentro do limite de rank.');break;
   case 'talisma-de-aviso':activity('bind','Vincular aviso à alma (manual)','utility',{consumeItem:false,range:100000*2**(level-5),meta:{rule:'warningTalisman',manualSoulBinding:true,consumeOnDeath:true,imageRadiusMeters:210,maximumRangeMeters:100000*2**(level-5)}});manual('Vincule o portador e o destinatário. O talismã é destruído somente quando a morte desencadeia o envio; o vínculo não consome a unidade. O narrador resolve a imagem e o alcance.');break;
   case 'talisma-de-controle':activity('control','Rasgar e tentar controlar','utility',{target:'creature',count:1,duration:1,units:'minute',meta:{rule:'controlTalisman',manualHit:true,manualSave:'Intelecto (Reflexo); CD definida pelo narrador.',condition:'stunned',maximumAffectedRank:level,endsWhen:['damagedAtTurnEnd','moved']}});manual('Confirme o acerto e a salvaguarda de Intelecto (Reflexo) antes de aplicar Atordoado; a fonte não fornece CD nem alcance.');break;
   case 'talisma-de-defesa-suprema':activity('defend','Resolver defesa suprema','utility',{range:300*level,condition:'Ao sofrer um ataque total de criatura ao menos 2 ranks acima do seu, dentro do limite do talismã.',meta:{rule:'supremeDefenseTalisman',negateTriggeringDamage:true,automaticTrigger:true,maximumAttackerRank:level,minimumAttackerRanksAboveUser:2,manualDestination:true}});manual('O narrador confirma o gatilho, anula o dano e move o usuário até '+300*level+' metros na direção escolhida.');break;
   case 'talisma-de-ataque-supremo':activity('release','Liberar ataque armazenado','utility',{actions:1,target:'creature',count:null,meta:{rule:'supremeAttackTalisman',requiresStoredAttack:true,manualStoredAttack:true}});manual('Armazene previamente um ataque válido e registre o Qi Refinado pago pela criatura que o carregou. Ao liberar, use os dados, área e alcance desse ataque; nenhum ataque genérico é inventado.');break;
  }
 }else if(product.kind==='inscription'){
  if(id==='simbolo-do-selo-de-conflito'){
   activity('activate','Ativar Selo de Conflito','utility',{actions:1,qi:11-level,pool:'total',duration:level,units:'round',meta:{rule:'conflictSeal',attributeBonus:2,attributes:['str','dex','con'],manualAppliedInscription:true}});
   manual('Confirme que a inscrição foi aplicada ao corpo. Registre +2 em Força, Agilidade e Constituição durante '+level+' rodadas e remova o benefício ao terminar; nenhum atributo é alterado automaticamente.');
  }else if(id==='simbolo-avassalador'){
   const a=activity('strike','Violent Strike','damage',{actions:2,qi:4,scaleQi:1,scaleMax:2+2*(level-2),target:'creature',damage:[part('42 + 6 * @scaling',['bludgeoning','slashing','piercing'])],meta:{rule:'violentStrike',requiresAppliedWeapon:true,advanceMeters:3,maximumAdditionalQi:2+2*(level-2),manualSave:'Fortitude (Constituição); CD não fornecida pela fonte.',condition:'bleeding'}});
   a.damage.parts[0].custom.formula='42';a.damage.parts[0].scaling={mode:'whole',number:0,formula:'6'};
   manual('Aplique à arma o aumento de um passo de dano. Para Violent Strike, escolha o dano físico da arma, avance 3 metros e confirme com o narrador o acerto e a salvaguarda de Fortitude contra Sangramento.');
  }else{
   activity('apply','Aplicar inscrição (resolução manual)','utility',{meta:{rule:id,requiresAppliedInscription:true}});
   manual('A inscrição só concede seu benefício depois de aplicada ao suporte indicado e confirmada pelo narrador. Possuí-la no inventário não concede bônus nem condições.');
   if(id==='simbolo-da-mente-calma')manual('A inscrição concede +2 em Intelecto (Reflexo), Sabedoria (Fortitude) e Presença (Vontade), uma vez em cada salvaguarda.');
  }
 }else if(product.kind==='matrix'){
  if(/refinamento-(corporal|da-alma)$/.test(id)){data.pending.push('Efeito Pendente — a fonte ainda não define o refinamento; nenhuma atividade de ativação é criada.');}
  else{
   const meta={rule:id,manualInstallation:true,manualGeometry:true,...(product.hpPerLevel?{matrixHitPoints:product.hpPerLevel*level}:{})};
   if(id==='matriz-de-defesa')Object.assign(meta,{radiusMeters:30,armorClass:20+level,damageAdjustmentPerRank:5});
   if(id==='matriz-de-cofre')Object.assign(meta,{radiusMeters:90,armorClass:21+level,damageAdjustmentPerRank:5,requiresKey:true});
   if(id==='matriz-de-ataque')Object.assign(meta,{radiusMeters:30,maximumOperators:6,damagePerRefinedQi:3,manualEnergyContribution:true});
   if(id==='matriz-de-teletransporte')Object.assign(meta,{maximumCreatures:20,maximumRangeKilometers:5000+15000*(level-4),peqPerKilometer:1,requiresLinkedMatrix:true,manualDestination:true,manualCrystalConsumption:true});
   if(id==='matriz-de-acumulo-de-qi')Object.assign(meta,{maximumCultivationIncreasePercent:20*level,maximumAdditionalEssencePerDay:10*level});
   if(id==='matriz-de-estabilizacao')Object.assign(meta,{baseCraftingDifficultyReduction:2,additionalPerLevelBelow:1,excludesMatrices:true,maximumCreationLevel:level});
   if(id==='matriz-de-prisao')Object.assign(meta,{peqPerCreaturePerDay:1,maximumQiDispersalRank:level,manualCrystalConsumption:true});
   if(id==='matriz-de-selamento')Object.assign(meta,{peqPerDay:5,maximumPrisonerRank:level+2,condition:'unconscious',manualCrystalConsumption:true});
   if(id==='matriz-de-voo')Object.assign(meta,{peqPerDay:level,maximumWeightTons:50,radiusMeters:9*5**(level-1),manualCrystalConsumption:true});
   if(id==='matriz-de-aceleracao-temporal')Object.assign(meta,{radiusMeters:60,timeMultiplier:10*2**(level-4),affectsCultivators:level>=8});
   activity('operate','Operar matriz (resolução manual)','utility',{meta});
   manual('Instale e delimite a matriz junto ao narrador. Registre operadores, alvos, recursos externos e manutenção conforme a descrição; nenhum ator, cristal ou local é alterado automaticamente.');
  }
 }else if(product.kind==='treasure'){
  rule('treasureTemplate',{level,rankRules:structuredClone(product.rankRules??{}),requiresMaterialAndBaseItem:true});
  activity('configure','Definir equipamento-base do tesouro','utility',{meta:{rule:'treasureTemplate',pendingConfiguration:'Escolha e configure o equipamento-base e seus materiais com o narrador antes de usar o tesouro.'}});
  manual('Este é um molde de tesouro. Escolha o equipamento-base, os materiais, o rank e a classe com o narrador antes de definir dano, resistência, habilidade, CR ou deslocamento. As tabelas completas permanecem na descrição.');
 }else if(product.kind==='tool'){
  manual('Ferramenta ou suprimento da profissão; não concede talento, perícia, receita ou proficiência automaticamente. A fonte não define uma receita de fabricação para este objeto.');
 }
 data.manual=[...new Set([...asList(product.manual),...data.manual])];data.pending=[...new Set([...asList(product.pending),...data.pending])];return data;
}
/** Read-only pre-consumption guard. Native itemUses is the sole quantity debit. */
export function prepareProfessionProductUse(activity,{actor=activity?.actor??activity?.item?.actor,usageConfig={}}={}){
 const meta=activity?.flags?.[SCOPE]?.professionProductActivity;if(!meta)return{ok:true};
 const reject=reason=>({ok:false,reason,meta});
 if(!actor)return reject('Use este produto a partir do inventário de uma criatura.');
 if(actor.isOwner===false||activity.item?.isOwner===false)return reject('Você não tem permissão para usar este produto.');
 const stored=activity.item?.flags?.[SCOPE]?.professionProduct;if(!stored)return reject('A configuração do produto não está registrada no item.');
 if(stored.kind==='matrix'&&activity.item.flags?.[SCOPE]?.elementalMatrixDisabled)return reject('Esta matriz foi desativada pelo Vortex regional. O narrador precisa restaurar seu funcionamento antes de usá-la.');
 let product;try{product=professionProductConfiguration(stored.id,stored);}catch(error){return reject(error.message);}
 if(product.kind!==stored.kind||product.profession!==stored.profession||product.id!==meta.productId||product.level!==meta.level||product.quality!==meta.quality||(product.element??'')!==(meta.element??''))return reject('A configuração do produto e de sua atividade divergem; reconfigure o produto antes de usar.');
 const expected=Object.values(professionProductNativeData(product.id,product).activities).find(entry=>entry.flags[SCOPE].professionProductActivity.key===meta.key);
 if(!expected||expected.type!==activity.type)return reject('Atividade de produto inválida; reconfigure o item antes de usar.');
 const canonical=expected.flags[SCOPE].professionProductActivity;
 const targets=value=>Array.from(value??[],target=>[target.type,target.target??'',String(target.value??''),target.scaling?.mode??'',String(target.scaling?.formula??'')]);
 if(JSON.stringify(targets(activity.consumption?.targets))!==JSON.stringify(targets(expected.consumption.targets)))return reject('O consumo obrigatório deste produto foi alterado; reconfigure o item antes de usar.');
 const scaling=usageConfig.scaling===false?0:Number(usageConfig.scaling??0),maximum=Number(expected.consumption.scaling.max)||0;
 if(!Number.isInteger(scaling)||scaling<0||scaling>maximum)return reject('A escala excede o limite do nível deste produto.');
 if(canonical.pendingConfiguration)return reject('Configuração pendente: '+canonical.pendingConfiguration);
 if(meta.pendingCost)return reject('Custo pendente: '+meta.pendingCost);
 if(canonical.pendingResolution||meta.pendingResolution)return reject('Resolução pendente: '+(canonical.pendingResolution??meta.pendingResolution));
 if(canonical.requiresElement&&!product.element)return reject('Escolha e registre o elemento desta pílula antes de consumi-la.');
 if(canonical.consumeItem){const quantity=activity.item?.system?.quantity;if(!Number.isInteger(quantity)||quantity<1)return reject('Não há unidades disponíveis deste produto.');}
 for(const target of activity.consumption?.targets??[]){if(target.type!=='attribute'||!String(target.target).startsWith('energy.'))continue;const pool=target.target.slice(7),available=actor.system?.energy?.[pool];if(available===null||available===''||!Number.isFinite(Number(available)))return reject('A reserva de Qi necessária não existe nesta criatura.');}
 const constitution=constitutionModifiers(actor);
 if(product.kind==='pill'&&product.level<constitution.minimumPillLevel)return reject('Esta constituição só permite pílulas benéficas de nível '+constitution.minimumPillLevel+' ou superior.');
 const rawPoison=product.kind==='pill'?Number(canonical.poison??0):0;
 const poison=constitution.toxinImmune?0:constitution.pillToxinFactor===1?rawPoison:rawPoison*constitution.pillToxinFactor;
 return{ok:true,meta:canonical,product,poison};
}
