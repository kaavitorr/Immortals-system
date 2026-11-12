import {cultivationRank, cultivationRankBenefits} from "./cultivation-rank-benefits.mjs";
/**
 * ─── Caminhos de Cultivo: Corpo e Alma ───────────────────────────────────────
 * 10 níveis em cada caminho. O Corpo usa as regras derivadas de body-path.mjs,
 * com escolhas de atributo e recursos próprios na ficha. A Alma usa soul-path.mjs
 * para seus benefícios, reserva espiritual e Feridas de origem espiritual.
 *
 * Estrutura de cada nível: { level, name, description }.
 */

/**
 * Requisitos para avançar um nível num caminho de cultivo.
 * @param {"body"|"soul"} path
 * @param {number} currentLevel  Nível atual (0–9); tenta alcançar currentLevel+1.
 * @returns {{dias:number, pt:number, pills:number, pillName:string, pillLevel:number}}
 *   - dias: dias de treino gastos.
 *   - pt: Pontos de Cultivo gastos.
 *   - pills: nº de pílulas consumidas.
 *   - pillName: nome da pílula.
 *   - pillLevel: nível de Alquimia exigido da pílula (= nível-alvo).
 */
export function pathRequirement(path, currentLevel, actor) {
  const benefits=cultivationRankBenefits(cultivationRank(actor));
  const target = currentLevel + 1;
  if ( path === "body" ) {
    return {
      dias: 5 * currentLevel * benefits.pathTimeMultiplier,
      moneyMultiplier: benefits.pathMoneyMultiplier,
      pt: Math.max(0,5 * target-benefits.bodyPointReduction),
      pills: 10,
      pillName: "Pílulas do Sangue Divino",
      pillLevel: target
    };
  }
  // soul
  return {
    dias: 10 * currentLevel * benefits.pathTimeMultiplier,
    moneyMultiplier: benefits.pathMoneyMultiplier,
    pt: Math.max(0,10 * target-benefits.soulPointReduction),
    pills: 20,
    pillName: "Pílulas da Nutrição da Alma",
    pillLevel: target
  };
}

export const BODY_PILL_NAME = "Pílulas do Sangue Divino";
export const SOUL_PILL_NAME = "Pílulas da Nutrição da Alma";

export const BODY_PATH = [
  {
    "level": 1,
    "name": "Forjando o Corpo",
    "description": "O primeiro nível de treino do corpo permite aumentar um dos aspectos da sua força física. Ao completar este treinamento, multiplique sua capacidade de carga por 10 e aumente seu dano com armas em um passo, até o máximo de 1d12."
  },
  {
    "level": 2,
    "name": "Temperando a Medula",
    "description": "O segundo nível de treinamento é extremamente doloroso. Você é considerado usando uma armadura flexível leve de raridade correspondente ao seu reino de cultivo, mas continua sendo considerado sem armadura. Vestir outra armadura não soma os benefícios."
  },
  {
    "level": 3,
    "name": "1 – Portão da Cura",
    "description": "Uma vez em cada um de seus turnos, você pode sacrificar 1 Ponto de Ação para recuperar Pontos de Vida iguais à sua Constituição. Você pode fazer isso 5 vezes por descanso longo. Recupera 10% das Feridas no descanso curto e 20% a mais no descanso longo."
  },
  {
    "level": 4,
    "name": "2 – Portão do Limite",
    "description": "Este portão se localiza na espinha do cultivador. Receba +1 ponto adicional em Força ou Agilidade, à sua escolha, além do atributo normal deste nível. Receba também 1 ponto de proficiência em Atletismo."
  },
  {
    "level": 5,
    "name": "3 – Portão das Maravilhas",
    "description": "A abertura deste portão está nos olhos. Receba +5 metros de deslocamento. Até 3 vezes por encontro, você pode triplicar seu deslocamento e aparecer instantaneamente a 1 metro de uma criatura à sua escolha, dentro do alcance desse deslocamento. Se o fizer, receba +6 vantagens na rolagem de acerto."
  },
  {
    "level": 6,
    "name": "4 – Portão da Dor",
    "description": "Este portão libera uma erupção de força no corpo. Seus Pontos de Vida Base aumentam em +1. O limite dos atributos Força, Agilidade e Constituição passa a ser 15."
  },
  {
    "level": 7,
    "name": "5 – Portão da Abertura",
    "description": "Localizado no cérebro, este portão fortalece a percepção em vez de um aspecto físico. Reduza em 4 a CD para aprender qualquer conceito elemental."
  },
  {
    "level": 8,
    "name": "6 – Portão da Visão",
    "description": "Localizado nas costas, este portão concede uma defesa extraordinária. Você é considerado usando uma armadura flexível pesada de um rank de cultivo acima do seu. Essa proteção substitui a armadura flexível leve de Temperando a Medula."
  },
  {
    "level": 9,
    "name": "7 – Portão da Vida",
    "description": "O portão do coração libera vitalidade suficiente para recuperar a essência de sangue perdida. Receba +2 Pontos de Vida Base. Recupere Pontos de Vida iguais à sua Constituição no início de cada turno em combate. Recupere todas as Feridas no descanso longo e 20% no descanso curto."
  },
  {
    "level": 10,
    "name": "8 – Portão da Morte",
    "description": "Localizado no mar espiritual, este portão concede uma quantidade imensa de energia. O Qi Base do Cultivador aumenta em +5. Seu Refinamento aumenta em metade da Constituição, arredondada para baixo."
  }
];

export const SOUL_PATH = [
  {
    "level": 1,
    "name": "Avatar da Alma",
    "description": "Você pode manifestar seu avatar usando 1 Ponto de Ação. Ele só é visível a cultivadores de rank superior ao seu ou a outros cultivadores da alma. Com o avatar manifestado, pode canalizar técnicas de dano direto sem se mover, dentro do alcance do grau da técnica, mudando o dano para Psíquico. Criaturas sem cultivo da alma perdem PV máximos e atuais ao sofrer dano Psíquico causado dessa forma, recuperando-os ao fim de um descanso longo."
  },
  {
    "level": 2,
    "name": "Primeira Revolução da Alma",
    "description": "Você pode manifestar um espírito de batalha na forma de sua arma favorita. Ao realizar uma jogada de ataque comum ou de técnica contra uma criatura com cultivo da alma inferior ao seu, causa 3 de dano Psíquico adicional. Esse dano aumenta em 3 a cada dois níveis de cultivo da alma."
  },
  {
    "level": 3,
    "name": "Segunda Revolução da Alma",
    "description": "Receba +1 em Intelecto e Sabedoria. Receba 30 PV temporários exclusivos da Alma, que só podem ser reduzidos por dano sofrido na alma. Cada nova revolução concede 10 PV temporários adicionais. Essa reserva é restaurada ao fim de um descanso longo."
  },
  {
    "level": 4,
    "name": "Terceira Revolução da Alma",
    "description": "Receba resistência 10 a dano Psíquico e de Alma. Receba +1 em Vontade e Fortitude contra ataques à mente e à alma. Esse bônus é condicional e não altera outras salvaguardas."
  },
  {
    "level": 5,
    "name": "Quarta Revolução da Alma",
    "description": "Você passa a poder causar dano de Alma, atingindo a existência da criatura, e recebe Penetração 5 nesse tipo de dano. Dano de Alma é aplicado diretamente como Feridas. Para personagens, os PV temporários da Alma absorvem primeiro; o restante vira Feridas, sem consumir Escudo ou PV temporários comuns. A Penetração ignora 5 pontos de resistência numérica a dano de Alma."
  },
  {
    "level": 6,
    "name": "Quinta Revolução da Alma",
    "description": "Pode criar um avatar adicional para controlar um clone ou colocá-lo no mar espiritual de uma criatura voluntária, ou pelo menos dois ranks abaixo de seu nível da alma. Enquanto o avatar existir, pode sobreviver à morte do corpo, mas não pode cultivar até obter um novo corpo. Só pode criar um avatar se tiver corpo e alma intacta, uma vez a cada dez anos."
  },
  {
    "level": 7,
    "name": "Sexta Revolução da Alma",
    "description": "Pode enviar seu avatar à alma de uma criatura para uma batalha da alma. Cada participante tem Integridade da Alma igual a 50 PV por nível de cultivo da alma. O Qi é compartilhado com seu corpo original, sem criar uma segunda reserva. Os participantes podem usar suas habilidades normalmente. Todo dano dessa batalha é convertido em dano de Alma."
  },
  {
    "level": 8,
    "name": "Sétima Revolução da Alma",
    "description": "Multiplique sua velocidade de absorção de PEQ por 3. Reduza em 5 a CD de criações e similares de todas as profissões."
  },
  {
    "level": 9,
    "name": "Oitava Revolução da Alma",
    "description": "No início de cada turno, recupere até 10 Feridas provenientes de dano de Alma. Receba 2 pontos de atributo adicionais para distribuir entre Intelecto, Sabedoria e Presença, como preferir, até o limite de 15."
  },
  {
    "level": 10,
    "name": "Nona Revolução da Alma — Alma Imortal",
    "description": "Sua alma pode existir independentemente e preserva seu Qi e sua vitalidade. Quando o corpo morrer, a alma sobrevive com todos os PV e Qi que possuía ao fim do último descanso longo. Pode realizar descansos longos e funcionar normalmente como se tivesse um corpo até criar um novo."
  }
];
