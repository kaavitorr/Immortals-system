import {CULTIVATION_DESTINIES} from './cultivation-destiny.mjs';
import {combatManualCompendiumDocuments} from "./combat-manual-content.mjs";
import {qiTalentCompendiumDocuments} from "./qi-talents-content.mjs";
import {elementalTrainingGuideDocument} from "./elemental-training-content.mjs";
import {elementalCompendiumDocuments} from "./elemental-content.mjs";
import {speciesDocuments} from "./wuxia-species.mjs";
import {backgroundDocuments} from "./wuxia-backgrounds.mjs";
import {soulPathDocuments} from "./soul-path-content.mjs";
import {bodyPathDocuments} from "./body-path-content.mjs";
import {cultivationRankDocuments} from "./cultivation-rank-content.mjs";
import { CULTIVATOR_PRIMARY_ABILITIES } from "./cultivator-rules.mjs";
export const CULTIVATOR_FOLDER_ID="c0171a7000000000";
export const CULTIVATOR_CLASS_ID="c0171a7000000001";
export const CULTIVATOR_LEGACY_GRANT_ID="c0171a7a00000001";
const scope="Immortals-system";
const FEATURES=[
  {
    "key": "life",
    "name": "Pontos de Vida",
    "img": "icons/svg/heart.svg",
    "grant": true,
    "html": "<p>Pontos de Vida representam a vitalidade e a saúde física do personagem. O Cultivador começa com <strong>5 PV + 5 por ponto de Constituição</strong>.</p><p>Cada avanço de estágio no mesmo reino acrescenta <strong>5 PV</strong>. Na passagem para o próximo reino, o ganho é de <strong>10 PV</strong>, substituindo o ganho normal de estágio. Cada novo ponto de Constituição acrescenta 5 PV.</p>"
  },
  {
    "key": "qi",
    "name": "Pontos de Qi",
    "img": "systems/Immortals-system/icons/svg/conceitos/agua.svg",
    "grant": true,
    "html": "<p>O Cultivador começa com <strong>40 Pontos de Qi</strong>. Cada avanço de estágio no mesmo reino acrescenta <strong>10 Qi</strong>. Ao passar para o próximo reino, recebe <strong>20 Qi</strong>, substituindo o ganho normal de estágio.</p><p>Qi Refinado e Pontos de Ação são recursos diferentes.</p>"
  },
  {
    "key": "proficiency",
    "name": "Pontos de Proficiência",
    "img": "icons/svg/upgrade.svg",
    "grant": true,
    "html": "<p>Você recebe <strong>5 Pontos de Proficiência</strong> na criação e <strong>1</strong> por nível de cultivo adicional.</p><p>Cada ponto pode aumentar a proficiência em um conjunto de armas, uma Salvaguarda ou uma perícia. A distribuição é livre entre os três grupos.</p><p>Esses pontos são independentes dos Pontos de Cultivo.</p>"
  },
  {
    "key": "talents",
    "name": "Talentos de Qi",
    "img": "systems/Immortals-system/icons/svg/items/feature.svg",
    "grant": true,
    "html": "<p>Você recebe <strong>1 Talento de Qi</strong> na criação e <strong>1</strong> a cada nível de cultivo adicional. A progressão dos dez reinos e seus três estágios concede até <strong>30 escolhas</strong>.</p><p>As escolhas seguem os requisitos e as progressões de cada talento. Você pode guardar escolhas para selecionar talentos posteriormente.</p>"
  },
  {
    "key": "spear-shield",
    "name": "Lança e Escudo",
    "img": "icons/svg/shield.svg",
    "grant": true,
    "html": "<p>Você aprendeu a utilizar seu Qi para fortalecer seus ataques e se proteger de golpes inimigos.</p><h3>Explosão Ofensiva</h3><p>Ao realizar um ataque comum, um ataque de técnica ou uma técnica em área, você pode gastar <strong>1 PQ de Qi Refinado</strong> para acrescentar <strong>1d4</strong> de dano. O máximo de PQ gastos dessa forma é igual à <strong>metade do nível de cultivo, arredondada para cima</strong>.</p><h3>Explosão Defensiva</h3><p>Ao sofrer dano, você pode gastar <strong>1 PQ de Qi Refinado</strong> para reduzi-lo em <strong>1d4</strong>. O máximo de PQ gastos é igual à <strong>metade do nível de cultivo, arredondada para cima</strong>.</p>"
  },
  {
    "key": "resistance-class",
    "name": "Atributo Principal e Classe de Resistência",
    "img": "icons/svg/shield.svg",
    "grant": true,
    "html": "<p>Escolha um Atributo Principal que <strong>não seja Constituição</strong>.</p><p>Sem armadura ou proteção, sua Classe de Resistência é <strong>10 + piso((Atributo Principal + Agilidade + Constituição) ÷ 3)</strong>. Frações são arredondadas para baixo.</p>"
  },
  {
    "key": "standard-damage",
    "name": "Dano Padrão",
    "img": "systems/Immortals-system/assets/wuxia/proficiencies/unarmed.webp",
    "grant": true,
    "html": "<p>Seu dano padrão é <strong>1d4</strong>, a menos que uma habilidade altere o dado base. A cada reino de cultivo, ele aumenta um passo, até <strong>1d12</strong>.</p><p><strong>Passos:</strong> 1 → 1d4 → 1d6 → 1d8 → 1d10 → 1d12.</p><p>O dado principal só pode superar d12 quando uma habilidade permitir. O dado de cultivo não altera automaticamente o dano configurado de uma arma.</p>"
  },
  {
    "key": "combat-method",
    "name": "Método de Combate",
    "img": "systems/Immortals-system/icons/svg/items/class.svg",
    "grant": true,
    "html": "<p>Você recebe um <strong>Manual de Combate</strong> à sua escolha. Registre sua escolha e as características do manual com o mestre.</p>"
  },
  {
    "key": "immortality",
    "name": "Caminho para a Imortalidade",
    "img": "systems/Immortals-system/icons/svg/conceitos/tempo.svg",
    "grant": false,
    "html": "<p>Cultivadores lutam constantemente contra a vontade dos céus em busca da vida eterna através do cultivo de Qi. Seu caminho é sangrento e brutal, e exige poder, talento e perseverança.</p><p>A evolução ocorre ao saturar a capacidade de Qi e expandir as barreiras do Dantian, situado no abdômen inferior. Isso permite armazenar mais Qi ou convertê-lo em energia de qualidade superior.</p><p>Existem <strong>10 reinos</strong>, cada um com <strong>3 estágios</strong>. O nível geral de cultivo vai de 1 a 30 e é acompanhado na aba Cultivo.</p>"
  },
  {
    "key": "advancement",
    "name": "Avanço e Tribulação",
    "img": "icons/svg/upgrade.svg",
    "grant": false,
    "html": "<h3>Avançando um estágio</h3><p>Sature seu núcleo e alcance o limite de Essência. Durante um descanso longo, consuma <strong>5 Pontos de Cultivo</strong> para avançar ao próximo estágio do mesmo reino.</p><h3>Avanço em combate</h3><p>Em situações raras, o Narrador pode autorizar um avanço espontâneo. Ele não consome PC e recupera <strong>um terço do Qi máximo, arredondado para cima</strong>.</p><h3>Avançando um reino</h3><p>No terceiro estágio, entre em reclusão. Gaste <strong>5 PC por reino acima da Condensação de Qi</strong>, até 30 PC, e role <strong>1d20 contra CD 11</strong>. Sucesso avança; falha perde os PC e causa um Ferimento Persistente.</p><h3>Tribulação</h3><p>Ao tentar avançar a partir do Mar Divino, uma falha provoca <strong>20d10</strong> de dano, mais <strong>6d10 por reino acima do Mar Divino</strong>. Esse dano ignora qualquer redução ou impedimento e é aplicado diretamente como <strong>Feridas</strong>.</p>"
  },
  {
    "key": "foundation",
    "name": "Solidificando sua Base de Cultivo",
    "img": "systems/Immortals-system/icons/svg/conceitos/terra.svg",
    "grant": false,
    "html": "<p>Seu corpo, sua mente e sua alma precisam ser temperados para alcançar a imortalidade.</p><p>A partir do <strong>quarto encontro ou batalha</strong> no mesmo reino, cada participação reduz a CD do avanço de reino em <strong>1</strong>.</p><p>Alternativamente, cada período de reclusão com um número de anos igual ao seu reino reduz a CD em 1. O Narrador acompanha os encontros e o tempo. A consolidação recomeça no novo reino.</p>"
  },
  {
    "key": "illumination",
    "name": "Pontos de Iluminação",
    "img": "systems/Immortals-system/icons/svg/conceitos/luz.svg",
    "grant": false,
    "html": "<p>Iluminação surge de acontecimentos que ampliam seu entendimento.</p><ul><li><strong>Reduzir Dificuldade — 1 PI:</strong> reduz a CD de um avanço em 3.</li><li><strong>Iluminação Profunda — 3 PI:</strong> avança automaticamente ao próximo reino. Mantém os requisitos de Essência e PC do avanço.</li><li><strong>Entendimento — 1 PI:</strong> reduz em 3 a CD de treino de profissão ou elemento e também seu custo em PC.</li></ul><h3>Recebendo Iluminação</h3><p>O Narrador pode concedê-la por entender uma luta de alguém dois reinos acima; vencer um oponente mortal com menos de um terço do Qi; consumir um tesouro relacionado à mente, alma ou entendimento; ou superar uma tribulação.</p>"
  },
  {
    "key": "divine-manual",
    "name": "Talento que Desafia os Céus",
    "img": "systems/Immortals-system/icons/svg/items/class.svg",
    "grant": true,
    "html": "<p>Cada personagem recebe um <strong>Manual de Cultivo de Rank Supremo Selado</strong> como herança espiritual, sem forma física. Começa em <strong>Humano Inferior</strong>.</p><h3>Crescimento</h3><p>Estudar um manual eleva a classificação sem apagar propriedades. Assimilar suas características consome uma das três oportunidades da campanha; Gênio Incomparável não possui esse limite e mantém até dois manuais ativos, com um único mantra em uso.</p><h3>Mudança de Destino</h3>"+CULTIVATION_DESTINIES.map(d=>'<h4>'+d.name+'</h4><p>'+d.narrative+'</p><p><strong>Característica:</strong> '+d.benefit+'</p><p><strong>Penalidade:</strong> '+d.penalty+'</p>').join('')
  }
];

export function cultivatorFeatureDocuments() {
 return FEATURES.map((feature,index)=>({_id:"c0171a71"+String(index+1).padStart(8,"0"),name:feature.name,type:"feat",img:feature.img,folder:CULTIVATOR_FOLDER_ID,
  system:{identifier:"cultivador-"+feature.key,type:{value:"class"},description:{value:feature.html},activities:{}},
  effects:[],flags:{[scope]:{cultivatorFeature:feature.key,cultivatorRuleVersion:1,featureSection:"jj-basic"}},_grant:feature.grant}));
}
export function cultivatorClassDocument(level=1) {
 const features=[...cultivatorFeatureDocuments(),{...cultivationRankDocuments()[0],_grant:true}];
 return {_id:CULTIVATOR_CLASS_ID,name:"Cultivador",type:"class",img:"systems/Immortals-system/icons/svg/items/class.svg",folder:CULTIVATOR_FOLDER_ID,
  system:{identifier:"cultivador",levels:Math.max(1,Math.min(20,Math.trunc(Number(level)||1))),description:{value:"<h2>Cultivador</h2><p>O caminho para a imortalidade é acompanhado pelos dez reinos e seus três estágios na aba Cultivo.</p><dl><dt>Vida inicial</dt><dd>5 + 5 por Constituição.</dd><dt>Vida por estágio / novo reino</dt><dd>5 / 10.</dd><dt>Qi inicial</dt><dd>40.</dd><dt>Qi por estágio / novo reino</dt><dd>10 / 20.</dd><dt>Atributo Principal</dt><dd>Qualquer um, exceto Constituição.</dd><dt>Proficiências</dt><dd>5 na criação, +1 por nível adicional.</dd><dt>Talentos de Qi</dt><dd>1 na criação, +1 por nível adicional.</dd></dl>"+features.filter(f=>f._grant).map(f=>"<h3>"+f.name+"</h3>"+f.system.description.value).join("")},
   advancement:{}},
  flags:{[scope]:{cultivator:true,cultivatorVersion:3,legacy2:{vidaBase:5,energiaBase:10,energiaInicial:40,vidaPorRank:10,energiaPorRank:20,atributoPrincipal:[...CULTIVATOR_PRIMARY_ABILITIES],pontosProficiencia:5,espIniciais:1,talentosQi:true}}},effects:[]};
}
/** Historical authored identities retained only for migration and internal sheet rules. */
export function cultivatorInternalDocuments() {
 return [{_id:CULTIVATOR_FOLDER_ID,name:"Cultivador e Progressão",type:"Item",folder:null,sorting:"a",color:"#b79a71"},cultivatorClassDocument(),...cultivatorFeatureDocuments().map(({_grant,...doc})=>doc),...cultivationRankDocuments(),...bodyPathDocuments(),...soulPathDocuments(),...elementalCompendiumDocuments(),elementalTrainingGuideDocument()];
}
/** Public content: backgrounds, Qi talents and combat-manual techniques; cultivation rules stay integrated. */
export function cultivatorCompendiumDocuments(){return [...backgroundDocuments(),...speciesDocuments(),...qiTalentCompendiumDocuments(),...combatManualCompendiumDocuments()];}
let integratedIdentities;
/** Only deterministic authored IDs retire public documents; custom copies remain user content. */
export function isInternalCultivatorDocument(document){
 integratedIdentities??=new Set(cultivatorInternalDocuments().map(doc=>doc._id));
 return integratedIdentities.has(document?._id??document?.id);
}
export function resolveCultivatorDocument(uuid) {
 if(!uuid?.startsWith("Compendium.Immortals-system.geral.Item."))return null;
 const id=uuid.split(".").at(-1),doc=cultivatorCompendiumDocuments().find(doc=>doc._id===id&&doc.type!=="Item");
 return doc?{...doc,uuid}:null;
}
