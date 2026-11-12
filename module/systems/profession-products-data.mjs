import {REFINED_RANKS,refinedEquipmentTableHTML} from './refined-equipment.mjs';
/** Current author table supersedes the original fixed-damage draft in text and metadata. */
export function refinedTreasureText(text) {
  if(typeof text!=='string')return text;
  let result=text.replace(/(<h3>ARMADURAS<\/h3>\s*)<table>[\s\S]*?<\/table>/g,(_match,heading)=>heading+refinedEquipmentTableHTML('armor'))
    .replace(/(<h3>ARMA<\/h3>\s*)<table>[\s\S]*?<\/table>/g,(_match,heading)=>heading+refinedEquipmentTableHTML('weapon'));
  const oldDamage=[7,10,12,14,16,20],oldResistance=[2,4,6,8,10,20];
  for(const [index,row] of REFINED_RANKS.entries()){
    result=result.split(row.rank+'\t'+oldDamage[index]+' de dano').join(row.rank+'\t'+row.weapon.formula)
      .split(row.rank+'\tResistência '+oldResistance[index]+' - Todos').join(row.rank+'\tResistência '+row.armor.resistanceAll+' — Todos');
  }
  return result;
}
function updateRefinedTreasure(product) {
  if(!['tesouro-arma','tesouro-armadura'].includes(product.id))return product;
  return {...product,descriptionHTML:refinedTreasureText(product.descriptionHTML),sourceText:refinedTreasureText(product.sourceText),
    rankRules:REFINED_RANKS.map(row=>product.id==='tesouro-arma'?{rank:row.rank,baseDamage:row.weapon.formula,...row.weapon}
      :{rank:row.rank,resistance:row.armor.resistanceAll,...row.armor})};
}

/**
 * Catalogue transcribed from the author's complete professions chapter (2026-10-30).
 * Text and tables remain available alongside metadata. Undefined tool levels/CD/prices are intentional.
 * Spirit recipe checks use the current sheet skills; Divino is the canonical highest cultivation rank.
 * Ambiguous authored rules stay in pending; tactical resolutions stay in manual.
 */
const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

export const PROFESSION_AUTHOR_RULES = freeze({pillQuality: "creation", priceBasis: "materials", explosiveSave: {failure: "full", success: "half"}});

export const PROFESSION_PRODUCTS = freeze([
  {
    "id": "pilula-de-cura",
    "name": "Pílula de Cura",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 14,
      "max": 14
    },
    "descriptionHTML": "<h3>PÍLULA DE CURA</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 0,5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Uma pílula que cura 1d4 + modificador Constituição a cada pílula ingerida e mais 1d4 a cada minuto por 10 minutos. A cada nível posterior, ela cura 1d4 adicional ao ser consumida e 1d4 adicional por minuto.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>60% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>15% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DE CURA\nMultiplicador de Toxina: x 0,5\tNível: 1 a 10\tClasse de Dificuldade: 14 \nUma pílula que cura 1d4 + modificador Constituição a cada pílula ingerida e mais 1d4 a cada minuto por 10 minutos. A cada nível posterior, ela cura 1d4 adicional ao ser consumida e 1d4 adicional por minuto.\nValor Base de Criação\t60% do valor base de Receitas e Materiais.\nValor de Venda\t15% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior.",
    "creationPercent": 60,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 15,
    "toxinMultiplier": 0.5,
    "quantityRule": "A cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior."
  },
  {
    "id": "pilula-do-sangue-divino",
    "name": "Pílula do Sangue Divino",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PÍLULA DO SANGUE DIVINO</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 0,2</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula que ajuda você a refinar seu sangue, aumentando sua qualidade e potência. Ela ajuda você a refinar seu corpo. A toxina dessa pílula é arredondada para baixo após levar em conta o multiplicador.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>350% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DO SANGUE DIVINO\nMultiplicador de Toxina: x 0,2\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma pílula que ajuda você a refinar seu sangue, aumentando sua qualidade e potência. Ela ajuda você a refinar seu corpo. A toxina dessa pílula é arredondada para baixo após levar em conta o multiplicador.\nValor Base de Criação\t350% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 350,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 0.2,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "toxinRounding": "floor"
  },
  {
    "id": "pilula-de-nutricao-da-alma",
    "name": "Pílula de Nutrição da Alma",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 3,
      "max": 10
    },
    "dc": {
      "min": 17,
      "max": 17
    },
    "descriptionHTML": "<h3>PÍLULA DE NUTRIÇÃO DA ALMA</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 0,2</td><td>Nível: 3 a 10</td><td>Classe de Dificuldade: 17</td></tr></tbody></table>\n<p>Uma pílula que ajuda a nutrir a alma do usuário, permitindo que ela seja refinada com mais facilidade. A toxina dessa pílula é arredondada para baixo após levar em conta o multiplicador.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DE NUTRIÇÃO DA ALMA\nMultiplicador de Toxina: x 0,2\tNível: 3 a 10\tClasse de Dificuldade: 17\nUma pílula que ajuda a nutrir a alma do usuário, permitindo que ela seja refinada com mais facilidade. A toxina dessa pílula é arredondada para baixo após levar em conta o multiplicador.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 0.2,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "toxinRounding": "floor"
  },
  {
    "id": "pilula-de-limpeza-de-meridianos",
    "name": "Pílula de Limpeza de Meridianos",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PILULA DE LIMPEZA DE MERIDIANOS</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 1</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula que ajuda a limpar os meridianos, aumentando a taxa de absorção de Qi por um curto período de tempo. Ao consumir essa pílula, você recebe o dobro de Pontos de Essência de Qi por 3 dias ao cultivar.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>150% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>50% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>Você gera 1 Pílula; e uma adicional a cada qualidade acima de Inferior.</td></tr></tbody></table>",
    "sourceText": "PILULA DE LIMPEZA DE MERIDIANOS\nMultiplicador de Toxina: x 1\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma pílula que ajuda a limpar os meridianos, aumentando a taxa de absorção de Qi por um curto período de tempo. Ao consumir essa pílula, você recebe o dobro de Pontos de Essência de Qi por 3 dias ao cultivar.\nValor Base de Criação\t150% do valor base de Receitas e Materiais.\nValor de Venda\t50% do valor de criação / cada\nQuantidade\tVocê gera 1 Pílula; e uma adicional a cada qualidade acima de Inferior.",
    "creationPercent": 150,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 50,
    "toxinMultiplier": 1,
    "quantityRule": "Você gera 1 Pílula; e uma adicional a cada qualidade acima de Inferior."
  },
  {
    "id": "pilula-da-abertura-celestial",
    "name": "Pílula da Abertura Celestial",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 19,
      "max": 19
    },
    "descriptionHTML": "<h3>PÍLULA DA ABERTURA CELESTIAL</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 2</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 19</td></tr></tbody></table>\n<p>Uma pílula que ajuda você a obter iluminação durante um avanço, aumentando suas chances de avançar para o próximo Rank. Você diminui sua CD em 3 e Pontos de Cultivo necessários em 30%, arredondado para cima.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DA ABERTURA CELESTIAL\nMultiplicador de Toxina: x 2\tNível: 1 a 10\tClasse de Dificuldade: 19\nUma pílula que ajuda você a obter iluminação durante um avanço, aumentando suas chances de avançar para o próximo Rank. Você diminui sua CD em 3 e Pontos de Cultivo necessários em 30%, arredondado para cima.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 2,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-de-recuperacao-de-qi",
    "name": "Pílula de Recuperação de Qi",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 14,
      "max": 14
    },
    "descriptionHTML": "<h3>PÍLULA DE RECUPERAÇÃO DE QI</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 0,5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Você recebe 1 Dado de Qi e pode rolar até 2 dados de Qi, usando de seus dados como se você tivesse realizando um descanso curto.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>100% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>20% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DE RECUPERAÇÃO DE QI\nMultiplicador de Toxina: x 0,5\tNível: 1 a 10\tClasse de Dificuldade: 14\nVocê recebe 1 Dado de Qi e pode rolar até 2 dados de Qi, usando de seus dados como se você tivesse realizando um descanso curto.\nValor Base de Criação\t100% do valor base de Receitas e Materiais.\nValor de Venda\t20% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior.",
    "creationPercent": 100,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 20,
    "toxinMultiplier": 0.5,
    "quantityRule": "A cada refinamento, você consegue criar até 3 dessas pílulas, aumentando em +2 para cada qualidade acima de Inferior."
  },
  {
    "id": "pilula-do-milagre-azul",
    "name": "Pílula do Milagre Azul",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 3,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PÍLULA DO MILAGRE AZUL</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 2</td><td>Nível: 3 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula que expande sua mente temporariamente e permite que você aumente suas chances de perceber segredos do que vê ao seu redor. Você dobra a quantidade de Pontos de Iluminação que você receber da próxima vez. Esse efeito se encerra caso você suba de Rank, ganhe Pontos de Iluminação ou 10 dias se passem.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>400% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DO MILAGRE AZUL\nMultiplicador de Toxina: x 2\tNível: 3 a 10\tClasse de Dificuldade: 16\nUma pílula que expande sua mente temporariamente e permite que você aumente suas chances de perceber segredos do que vê ao seu redor. Você dobra a quantidade de Pontos de Iluminação que você receber da próxima vez. Esse efeito se encerra caso você suba de Rank, ganhe Pontos de Iluminação ou 10 dias se passem.\nValor Base de Criação\t400% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 400,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 2,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-das-9-revolucoes-da-mente",
    "name": "Pílula das 9 Revoluções da Mente",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 5,
      "max": 5
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>PÍLULA DAS 9 REVOLUÇÕES DA MENTE</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 3</td><td>Nível: 5</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Ao consumir essa pílula durante um avanço para a Transformação Divina, você triplica o alcance do seu Sentido Divino permanentemente.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>3.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DAS 9 REVOLUÇÕES DA MENTE\nMultiplicador de Toxina: x 3\tNível: 5\tClasse de Dificuldade: 20\nAo consumir essa pílula durante um avanço para a Transformação Divina, você triplica o alcance do seu Sentido Divino permanentemente.\nValor Base de Criação\t3.000% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 3000,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 3,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-do-sangue-carmesim",
    "name": "Pílula do Sangue Carmesim",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 14,
      "max": 14
    },
    "descriptionHTML": "<h3>PÍLULA DO SANGUE CARMESIM</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Uma pílula que consome sua vitalidade em troca de uma grande quantidade de poder. Ao consumi-la, você recebe +2 em todos os atributos e ganha 30% do seu Qi máximo como Pontos de Qi temporários (arredondado para cima).  Você só ganha metade dos benefícios acima se for um Rank acima que o nível da pílula.</p>\n<p>Após 10 minutos de ter consumido essa pílula, você recebe 2 níveis de exaustão e perde 1 Ponto de Constituição por 180 dias.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>200% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DO SANGUE CARMESIM\nMultiplicador de Toxina: x 5\tNível: 1 a 10\tClasse de Dificuldade: 14\nUma pílula que consome sua vitalidade em troca de uma grande quantidade de poder. Ao consumi-la, você recebe +2 em todos os atributos e ganha 30% do seu Qi máximo como Pontos de Qi temporários (arredondado para cima).  Você só ganha metade dos benefícios acima se for um Rank acima que o nível da pílula.\n\tApós 10 minutos de ter consumido essa pílula, você recebe 2 níveis de exaustão e perde 1 Ponto de Constituição por 180 dias.\nValor Base de Criação\t200% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 200,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 5,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-espiritual-terrena",
    "name": "Pílula Espiritual Terrena",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PÍLULA ESPIRITUAL TERRENA</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 1,5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula que ajuda você a estabilizar sua base, permitindo que você avance com mais facilidade. Ao consumir sua pílula, você ignora os efeitos de toxina de pílula de até 20 Pontos ao tentar realizar o próximo avanço. Se consumir uma dessas de nível acima do seu rank, você pode ignorar até 40 Pontos e assim sucessivamente.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>150% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA ESPIRITUAL TERRENA\nMultiplicador de Toxina: x 1,5\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma pílula que ajuda você a estabilizar sua base, permitindo que você avance com mais facilidade. Ao consumir sua pílula, você ignora os efeitos de toxina de pílula de até 20 Pontos ao tentar realizar o próximo avanço. Se consumir uma dessas de nível acima do seu rank, você pode ignorar até 40 Pontos e assim sucessivamente.\nValor Base de Criação\t150% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 150,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 1.5,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-da-condensacao-elemental-de-x",
    "name": "Pílula da Condensação Elemental de X",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PÍLULA DA CONDENSAÇÃO ELEMENTAL DE X (ELEMENTO ESPECÍFICO)</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 1</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula capaz de ajudar você a entender um conceito elemental com mais facilidade. A cada uma dessas que você consumir, você reduz a CD do seu treinamento elemental para o próximo nível em -1.</p>\n<p>Elas só têm efeitos no mesmo nível que seu conceito elemental se encontra. Por exemplo: Se você for conceito do fogo de nível 4, então você precisa consumir pílulas de nível 4 para diminuir a CD do nível 5.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>200% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DA CONDENSAÇÃO ELEMENTAL DE X (ELEMENTO ESPECÍFICO)\nMultiplicador de Toxina: x 1\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma pílula capaz de ajudar você a entender um conceito elemental com mais facilidade. A cada uma dessas que você consumir, você reduz a CD do seu treinamento elemental para o próximo nível em -1. \n\tElas só têm efeitos no mesmo nível que seu conceito elemental se encontra. Por exemplo: Se você for conceito do fogo de nível 4, então você precisa consumir pílulas de nível 4 para diminuir a CD do nível 5.\nValor Base de Criação\t200% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 200,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 1,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "extraRequirement": "Escolher um elemento específico; o nível da pílula deve corresponder ao nível atual do conceito elemental."
  },
  {
    "id": "pilula-do-balanceamento-de-origem",
    "name": "Pílula do Balanceamento de Origem",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 6,
      "max": 6
    },
    "dc": {
      "min": 22,
      "max": 22
    },
    "descriptionHTML": "<h3>PÍLULA DO BALANCEAMENTO DE ORIGEM</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 5</td><td>Nível: 6</td><td>Classe de Dificuldade: 22</td></tr></tbody></table>\n<p>Uma pílula que remove todas as impurezas presentes no seu corpo, permitindo que você possa cultivar na capacidade máxima permitida pelo seu talento. Ao consumi-la, você aumenta permanentemente sua capacidade de absorver Pontos de Essência de Qi em 20%.</p>\n<p>Cada criatura só pode consumir uma única dessas na vida.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>5.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DO BALANCEAMENTO DE ORIGEM\nMultiplicador de Toxina: x 5\tNível: 6\tClasse de Dificuldade: 22\nUma pílula que remove todas as impurezas presentes no seu corpo, permitindo que você possa cultivar na capacidade máxima permitida pelo seu talento. Ao consumi-la, você aumenta permanentemente sua capacidade de absorver Pontos de Essência de Qi em 20%. \n\tCada criatura só pode consumir uma única dessas na vida.\nValor Base de Criação\t5.000% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 5000,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 5,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-de-cura-de-veneno",
    "name": "Pílula de Cura de Veneno",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 14,
      "max": 20
    },
    "descriptionHTML": "<p>Pílula de Cura de Veneno</p>\n<table><tbody><tr><td>Multiplicador de Toxina: x 1</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14 a 20</td></tr></tbody></table>\n<p>Uma pílula que permite que você se cure de diversos tipos de venenos existentes. A CD aumenta em +2 e o valor base de criação aumenta em 300% para cada raridade do veneno acima de Comum.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>25% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>Você cria 3 pílulas no refinamento, aumentando em +3 a cada raridade acima de Inferior.</td></tr></tbody></table>",
    "sourceText": "Pílula de Cura de Veneno\nMultiplicador de Toxina: x 1\tNível: 1 a 10\tClasse de Dificuldade: 14 a 20\nUma pílula que permite que você se cure de diversos tipos de venenos existentes. A CD aumenta em +2 e o valor base de criação aumenta em 300% para cada raridade do veneno acima de Comum.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nValor de Venda\t25% do valor de criação / cada\nQuantidade\tVocê cria 3 pílulas no refinamento, aumentando em +3 a cada raridade acima de Inferior.",
    "creationPercent": 500,
    "pending": [
      "A quantidade usa o termo raridade acima de Inferior; confirmar se o aumento de +3 se refere à qualidade da pílula ou à raridade do veneno."
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 25,
    "toxinMultiplier": 1,
    "quantityRule": "Você cria 3 pílulas no refinamento, aumentando em +3 a cada raridade acima de Inferior.",
    "aliases": [
      "Poison Healing Pill",
      "POISON HEALING PILL"
    ]
  },
  {
    "id": "pilula-da-afinidade-elemental",
    "name": "Pílula da Afinidade Elemental",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>PÍLULA DA AFINIDADE ELEMENTAL</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 3</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Uma pílula que permite que você utilize a essência de uma criatura de crescimento nível Sagrado ou acima para criar uma pílula que te da afinidade naquele elemento até certo nível. Ao consumir uma pílula de um nível determinado, você ganha afinidade com o elemento até o mesmo nível da pílula, fazendo com que você reduza todo custo de Pontos de Cultivo, Consumo de Qi e Dias para treinar pela metade, mesmo que você já tenha reduzido ele por outras fontes.</p>\n<p>Você deve utilizar uma essência de uma criatura de um rank referente ao nível da pílula.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>10.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DA AFINIDADE ELEMENTAL\nMultiplicador de Toxina: x 3\tNível: 1 a 10\tClasse de Dificuldade: 20\nUma pílula que permite que você utilize a essência de uma criatura de crescimento nível Sagrado ou acima para criar uma pílula que te da afinidade naquele elemento até certo nível. Ao consumir uma pílula de um nível determinado, você ganha afinidade com o elemento até o mesmo nível da pílula, fazendo com que você reduza todo custo de Pontos de Cultivo, Consumo de Qi e Dias para treinar pela metade, mesmo que você já tenha reduzido ele por outras fontes.\n\tVocê deve utilizar uma essência de uma criatura de um rank referente ao nível da pílula.\nValor Base de Criação\t10.000% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 10000,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 3,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "extraRequirement": "Essência de uma criatura de crescimento Sagrado ou acima, de um rank referente ao nível da pílula."
  },
  {
    "id": "pilula-do-corpo-espiritual",
    "name": "Pílula do Corpo Espiritual",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 17,
      "max": 17
    },
    "descriptionHTML": "<h3>PÍLULA DO CORPO ESPIRITUAL</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 3</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 17</td></tr></tbody></table>\n<p>Uma pílula que permite que você regenere um membro perdido, desde que seus efeitos sejam auxiliados pelo Qi de um médico. Você recupera seu membro em até 1 hora, junto de 30 Pontos de Vida. Só funciona criaturas com Rank referente ao nível da pílula.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DO CORPO ESPIRITUAL\nMultiplicador de Toxina: x 3\tNível: 1 a 10\tClasse de Dificuldade: 17\nUma pílula que permite que você regenere um membro perdido, desde que seus efeitos sejam auxiliados pelo Qi de um médico. Você recupera seu membro em até 1 hora, junto de 30 Pontos de Vida. Só funciona criaturas com Rank referente ao nível da pílula.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 3,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "extraRequirement": "Efeitos auxiliados pelo Qi de um médico; criatura com Rank referente ao nível da pílula."
  },
  {
    "id": "pilula-da-salvaguarda",
    "name": "Pílula da Salvaguarda",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 4,
      "max": 10
    },
    "dc": {
      "min": 22,
      "max": 22
    },
    "descriptionHTML": "<h3>PÍLULA DA SALVAGUARDA</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 5</td><td>Nível: 4 a 10</td><td>Classe de Dificuldade: 22</td></tr></tbody></table>\n<p>Uma pílula extremamente difícil de ser criada, mas que pode salvar a vida de uma criatura. Ao consumir essa pílula, você está resguardado da morte ou efeitos severos de aleijamento. A próxima vez que você sofrer dano suficiente para morrer ou sofrer uma Ferida Brutal ou Ferimento Persistente, inclusive o efeito de perder Pontos de Vida máximos, essa pílula tem seu efeito resolvido ativando um dos seguintes efeitos:</p>\n<table><tbody><tr><td></td><td>Você fica com 1 Ponto de Vida ao invés de morrer;</td></tr><tr><td></td><td>Você nega a ferida brutal que você sofreria ou o ferimento persistente;</td></tr><tr><td></td><td>Você fica imune a redução de Pontos de Vida máximos pelos próximos 10 minutos.</td></tr><tr><td>Valor Base de Criação</td><td>20.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DA SALVAGUARDA\nMultiplicador de Toxina: x 5\tNível: 4 a 10\tClasse de Dificuldade: 22\nUma pílula extremamente difícil de ser criada, mas que pode salvar a vida de uma criatura. Ao consumir essa pílula, você está resguardado da morte ou efeitos severos de aleijamento. A próxima vez que você sofrer dano suficiente para morrer ou sofrer uma Ferida Brutal ou Ferimento Persistente, inclusive o efeito de perder Pontos de Vida máximos, essa pílula tem seu efeito resolvido ativando um dos seguintes efeitos:\n \tVocê fica com 1 Ponto de Vida ao invés de morrer;\n \tVocê nega a ferida brutal que você sofreria ou o ferimento persistente;\n \tVocê fica imune a redução de Pontos de Vida máximos pelos próximos 10 minutos.\nValor Base de Criação\t20.000% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 20000,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 300,
    "toxinMultiplier": 5,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-das-chamas-do-renascimento",
    "name": "Pílula das Chamas do Renascimento",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 7,
      "max": 7
    },
    "dc": {
      "min": 25,
      "max": 25
    },
    "descriptionHTML": "<h3>PÍLULA DAS CHAMAS DO RENASCIMENTO</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 20</td><td>Nível: 7</td><td>Classe de Dificuldade: 25</td></tr></tbody></table>\n<p>Uma pílula de extremamente rara por precisar utilizar as chamas de uma fênix de nível Lorde Sagrado ou acima para ser criada. Ela permite que uma criatura recupere todos os Pontos de Vida e Qi no corpo dela, fazendo com que ela levante, caso tenha caído.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>25.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>500% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DAS CHAMAS DO RENASCIMENTO\nMultiplicador de Toxina: x 20\tNível: 7\tClasse de Dificuldade: 25\nUma pílula de extremamente rara por precisar utilizar as chamas de uma fênix de nível Lorde Sagrado ou acima para ser criada. Ela permite que uma criatura recupere todos os Pontos de Vida e Qi no corpo dela, fazendo com que ela levante, caso tenha caído.\nValor Base de Criação\t25.000% do valor base de Receitas e Materiais.\nValor de Venda\t500% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 25000,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 500,
    "toxinMultiplier": 20,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "extraRequirement": "Chamas de uma fênix de nível Lorde Sagrado ou acima."
  },
  {
    "id": "pilula-da-tranquilidade",
    "name": "Pílula da Tranquilidade",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 15,
      "max": 15
    },
    "descriptionHTML": "<h3>PÍLULA DA TRANQUILIDADE</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 2</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 15</td></tr></tbody></table>\n<p>Uma pílula que ajuda a acalmar o coração e lutar contra demônios do coração no momento do avanço. Ao consumir essa pílula, você não pode ser atacado por um demônio do coração durante seu próximo avanço de Rank.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DA TRANQUILIDADE\nMultiplicador de Toxina: x 2\tNível: 1 a 10\tClasse de Dificuldade: 15\nUma pílula que ajuda a acalmar o coração e lutar contra demônios do coração no momento do avanço. Ao consumir essa pílula, você não pode ser atacado por um demônio do coração durante seu próximo avanço de Rank.\nValor Base de Criação\t300% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 300,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 2,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-do-mundo-ilimitado",
    "name": "Pílula do Mundo Ilimitado",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 4,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PÍLULA DO MUNDO ILIMITADO</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 2</td><td>Nível: 4 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula que pode ser consumida a cada avanço de rank. Ela permite que, ao avançar de Rank com sucesso, você receba 30 Pontos de Qi adicionais permanentemente.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>800% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DO MUNDO ILIMITADO\nMultiplicador de Toxina: x 2\tNível: 4 a 10\tClasse de Dificuldade: 16\nUma pílula que pode ser consumida a cada avanço de rank. Ela permite que, ao avançar de Rank com sucesso, você receba 30 Pontos de Qi adicionais permanentemente.\nValor Base de Criação\t800% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 800,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 200,
    "toxinMultiplier": 2,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "pilula-da-explosao-de-vitalidade",
    "name": "Pílula da Explosão de Vitalidade",
    "kind": "pill",
    "profession": "alchemy",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>PÍLULA DA EXPLOSÃO DE VITALIDADE</h3>\n<table><tbody><tr><td>Multiplicador de Toxina: x 5</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma pílula que permite que você exploda com uma quantidade incrível de vitalidade. Ao consumi-la, sua vitalidade começa a queimar e você pode rodar todos os dados de vida que tiver disponíveis e 3 adicionais, como se tivesse realizando um descanso curto.</p>\n<p>Após consumir essa pílula, você não recupera dados de vida e recebe 2 níveis de exaustão pelos próximos 5 dias.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>250% do valor de criação / cada</td></tr><tr><td>Quantidade</td><td>A cada refinamento, você consegue gerar uma pílula, não importa a qualidade.</td></tr></tbody></table>",
    "sourceText": "PÍLULA DA EXPLOSÃO DE VITALIDADE\nMultiplicador de Toxina: x 5\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma pílula que permite que você exploda com uma quantidade incrível de vitalidade. Ao consumi-la, sua vitalidade começa a queimar e você pode rodar todos os dados de vida que tiver disponíveis e 3 adicionais, como se tivesse realizando um descanso curto.\n\tApós consumir essa pílula, você não recupera dados de vida e recebe 2 níveis de exaustão pelos próximos 5 dias.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nValor de Venda\t250% do valor de criação / cada\nQuantidade\tA cada refinamento, você consegue gerar uma pílula, não importa a qualidade.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "Aplicar o efeito descrito no uso da pílula e conferir Rank, duração e restrições com o mestre. A posse da pílula não ativa seus efeitos."
    ],
    "salePercent": 250,
    "toxinMultiplier": 5,
    "quantityRule": "A cada refinamento, você consegue gerar uma pílula, não importa a qualidade."
  },
  {
    "id": "matriz-de-acumulo-de-qi",
    "name": "Matriz de Acúmulo de Qi",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 14,
      "max": 14
    },
    "descriptionHTML": "<h3>MATRIZ DE ACÚMULO DE QI</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Uma matriz que permite acumular o Qi da atmosfera em um raio de quilômetros e concentrar me um único lugar, aumentando a quantidade de Qi no local e consequentemente a velocidade de cultivo.</p>\n<p>Uma criatura que cultive no local, tem sua velocidade de cultivo acelerada em 20% por nível da matriz ou 10 PEQ por nível por dia, o que for menor.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Sofre 3 vezes o dano padrão se for atacada no seu núcleo.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE ACÚMULO DE QI\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 14 \nUma matriz que permite acumular o Qi da atmosfera em um raio de quilômetros e concentrar me um único lugar, aumentando a quantidade de Qi no local e consequentemente a velocidade de cultivo.\n\tUma criatura que cultive no local, tem sua velocidade de cultivo acelerada em 20% por nível da matriz ou 10 PEQ por nível por dia, o que for menor.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nPonto Fraco\tSofre 3 vezes o dano padrão se for atacada no seu núcleo.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Sofre 3 vezes o dano padrão se for atacada no seu núcleo."
  },
  {
    "id": "matriz-de-acumulo-elemental",
    "name": "Matriz de Acúmulo Elemental",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>MATRIZ DE ACÚMULO ELEMENTAL</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma matriz que pode ser utilizada em conjunto com a matriz de acúmulo de Qi para acelerar o cultivo de quem utiliza um elemento específico ou apenas encher a região de um tipo de Qi específico para tentar evoluir no conceito.</p>\n<p>Uma criatura que cultive no local reduz a CD em -2 no teste de atributo para tentar evoluir um conceito. Esse valor se torna -4 se for utilizada junto de uma Matriz de Acúmulo de Qi de mesmo nível.</p>\n<p>A menos que descrito diferente no treinamento do conceito elemental, uma matriz só pode te ajudar a chegar no nível do conceito em que ela se encontra.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>750% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Sofre 3 vezes o dano padrão se for atacada no seu núcleo.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE ACÚMULO ELEMENTAL\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma matriz que pode ser utilizada em conjunto com a matriz de acúmulo de Qi para acelerar o cultivo de quem utiliza um elemento específico ou apenas encher a região de um tipo de Qi específico para tentar evoluir no conceito.\n\tUma criatura que cultive no local reduz a CD em -2 no teste de atributo para tentar evoluir um conceito. Esse valor se torna -4 se for utilizada junto de uma Matriz de Acúmulo de Qi de mesmo nível.\n\tA menos que descrito diferente no treinamento do conceito elemental, uma matriz só pode te ajudar a chegar no nível do conceito em que ela se encontra.\nValor Base de Criação\t750% do valor base de Receitas e Materiais.\nPonto Fraco\tSofre 3 vezes o dano padrão se for atacada no seu núcleo.",
    "creationPercent": 750,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Sofre 3 vezes o dano padrão se for atacada no seu núcleo."
  },
  {
    "id": "matriz-ilusoria-de-combate",
    "name": "Matriz Ilusória de Combate",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 3,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>MATRIZ ILUSÓRIA DE COMBATE</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 3 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Uma matriz que permite que as criaturas lutem com criaturas e bestas de acordo com o rank e nível de cultivo delas, onde a dificuldade vai aumentando dentro da ilusão conforme o tempo passa.</p>\n<p>Uma criatura com acesso a uma dessas leva metade do tempo para treinar seu Manual de Cultivo e Manuais de Combate.</p>\n<p>Se uma criatura sofrer dano fatal dentro da ilusão, sua mente é expulsa da ilusão ao invés dela sofrer dano.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.500% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Sofre 3 vezes o dano padrão se for atacada no seu núcleo.</td></tr></tbody></table>",
    "sourceText": "MATRIZ ILUSÓRIA DE COMBATE\nPontos de Vida: 100 PV / nível\tNível: 3 a 10\tClasse de Dificuldade: 18\nUma matriz que permite que as criaturas lutem com criaturas e bestas de acordo com o rank e nível de cultivo delas, onde a dificuldade vai aumentando dentro da ilusão conforme o tempo passa.\n\tUma criatura com acesso a uma dessas leva metade do tempo para treinar seu Manual de Cultivo e Manuais de Combate.\n\tSe uma criatura sofrer dano fatal dentro da ilusão, sua mente é expulsa da ilusão ao invés dela sofrer dano.\nValor Base de Criação\t1.500% do valor base de Receitas e Materiais.\nPonto Fraco\tSofre 3 vezes o dano padrão se for atacada no seu núcleo.",
    "creationPercent": 1500,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Sofre 3 vezes o dano padrão se for atacada no seu núcleo."
  },
  {
    "id": "matriz-de-ocultacao",
    "name": "Matriz de Ocultação",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>MATRIZ DE OCULTAÇÃO</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Essa matriz consegue esconder todas as flutuações de Qi e aparência de um local de até 30 metros de raio. Essa matriz afeta criaturas de até 1 Rank acima do nível equivalente a ela. Todas as criaturas de Rank igual devem realizar um Teste de Percepção (SAB) CD 25 para tentar nota-la, aumentando a CD em +5 para cada Rank abaixo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Sofre 3 vezes o dano padrão se for atacada no seu núcleo.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE OCULTAÇÃO\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 18\nEssa matriz consegue esconder todas as flutuações de Qi e aparência de um local de até 30 metros de raio. Essa matriz afeta criaturas de até 1 Rank acima do nível equivalente a ela. Todas as criaturas de Rank igual devem realizar um Teste de Percepção (SAB) CD 25 para tentar nota-la, aumentando a CD em +5 para cada Rank abaixo.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nPonto Fraco\tSofre 3 vezes o dano padrão se for atacada no seu núcleo.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Sofre 3 vezes o dano padrão se for atacada no seu núcleo."
  },
  {
    "id": "matriz-de-defesa",
    "name": "Matriz de Defesa",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>MATRIZ DE DEFESA</h3>\n<table><tbody><tr><td>Pontos de Vida: 300 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma matriz que tem a única finalidade de proteger um local específico de até 30 metros de raio. Ela possui uma grande quantidade de Pontos de Vida e tem 21 de CR, aumentando +1 de CR para cada nível que ela possuir acima do 1º nível.</p>\n<p>A matriz reduz 5 de dano para cada Rank que a criatura possuir em relação ao nível equivalente dela, assim como sofre 5 de dano adicional para cada criatura de rank acima do nível equivalente dela.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>750% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la sem precisar causar dano.</td></tr><tr><td>Custo Adicional</td><td>Ao multiplicar o alcance da matriz por 5, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE DEFESA\nPontos de Vida: 300 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma matriz que tem a única finalidade de proteger um local específico de até 30 metros de raio. Ela possui uma grande quantidade de Pontos de Vida e tem 21 de CR, aumentando +1 de CR para cada nível que ela possuir acima do 1º nível.\n\tA matriz reduz 5 de dano para cada Rank que a criatura possuir em relação ao nível equivalente dela, assim como sofre 5 de dano adicional para cada criatura de rank acima do nível equivalente dela.\nValor Base de Criação\t750% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la sem precisar causar dano.\nCusto Adicional\tAo multiplicar o alcance da matriz por 5, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.",
    "creationPercent": 750,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "additionalCostRule": "Ao multiplicar o alcance da matriz por 5, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.",
    "hpPerLevel": 300,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la sem precisar causar dano."
  },
  {
    "id": "matriz-de-ataque",
    "name": "Matriz de Ataque",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>MATRIZ DE ATAQUE</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma matriz que é energizada por múltiplas pessoas para atacar invasores de um local de até 30 metros de raio. Ela possui um espaço no núcleo para até 6 criaturas, onde cada criatura pode utilizar até todo Qi gerado disponível na rodada para desferir um poderoso ataque, causando 3 de dano de Energia por Ponto de Qi.</p>\n<p>Se uma criatura for 2 Ranks acima que a matriz, ela reduz todo dano sofrido da matriz pela metade. Se ela for 3 Ranks, ela reduz todo dano a 0.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>750% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la imediatamente.</td></tr><tr><td>Custo Adicional</td><td>Ao multiplicar o alcance da matriz por 10, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE ATAQUE\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma matriz que é energizada por múltiplas pessoas para atacar invasores de um local de até 30 metros de raio. Ela possui um espaço no núcleo para até 6 criaturas, onde cada criatura pode utilizar até todo Qi gerado disponível na rodada para desferir um poderoso ataque, causando 3 de dano de Energia por Ponto de Qi. \n\tSe uma criatura for 2 Ranks acima que a matriz, ela reduz todo dano sofrido da matriz pela metade. Se ela for 3 Ranks, ela reduz todo dano a 0.\nValor Base de Criação\t750% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la imediatamente.\nCusto Adicional\tAo multiplicar o alcance da matriz por 10, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.",
    "creationPercent": 750,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "additionalCostRule": "Ao multiplicar o alcance da matriz por 10, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.",
    "hpPerLevel": 100,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la imediatamente."
  },
  {
    "id": "matriz-de-restauracao-de-terreno",
    "name": "Matriz de Restauração de Terreno",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>MATRIZ DE RESTAURAÇÃO DE TERRENO</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Uma matriz que mantém o estado perfeito dos prédios e região dentro dela, consertando qualquer dano causado em até 24 horas. O tamanho dessa matriz começa em 120 metros de raio e dobra a cada nível adicional dela.</p>\n<p>A partir do 5º nível, a duração para reparo é reduzida para 12 horas e reduzida novamente pela metade no 7º nível.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>8.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la imediatamente.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE RESTAURAÇÃO DE TERRENO\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 18\nUma matriz que mantém o estado perfeito dos prédios e região dentro dela, consertando qualquer dano causado em até 24 horas. O tamanho dessa matriz começa em 120 metros de raio e dobra a cada nível adicional dela. \n\tA partir do 5º nível, a duração para reparo é reduzida para 12 horas e reduzida novamente pela metade no 7º nível. \nValor Base de Criação\t8.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la imediatamente.",
    "creationPercent": 8000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la imediatamente."
  },
  {
    "id": "matriz-de-cofre",
    "name": "Matriz de Cofre",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>MATRIZ DE COFRE</h3>\n<table><tbody><tr><td>Pontos de Vida: 500 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Uma matriz que tem todo seu poder concentrado em um espaço de no máximo 90 metros de raio. Essa matriz tem 21 de Classe de Resistência e +1 para cada nível da matriz. Ela necessita de uma chave para abri-la.</p>\n<p>Uma criatura causa 5 Pontos de Dano adicionais para cada Rank que ela tiver acima do nível equivalente da matriz, assim como causa 5 Pontos de Dano a menos para cada Rank que ela tiver abaixo do nível equivalente da matriz.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>15.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Nenhum</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE COFRE\nPontos de Vida: 500 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 20\nUma matriz que tem todo seu poder concentrado em um espaço de no máximo 90 metros de raio. Essa matriz tem 21 de Classe de Resistência e +1 para cada nível da matriz. Ela necessita de uma chave para abri-la.\n\tUma criatura causa 5 Pontos de Dano adicionais para cada Rank que ela tiver acima do nível equivalente da matriz, assim como causa 5 Pontos de Dano a menos para cada Rank que ela tiver abaixo do nível equivalente da matriz.\nValor Base de Criação\t15.000% do valor base de Receitas e Materiais.\nPonto Fraco\tNenhum",
    "creationPercent": 15000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 500,
    "weakPoint": "Nenhum"
  },
  {
    "id": "matriz-de-ilusao-assassina",
    "name": "Matriz de Ilusão Assassina",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>MATRIZ DE ILUSÃO ASSASSINA</h3>\n<table><tbody><tr><td>Pontos de Vida: 250 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Uma matriz capaz de conjurar criaturas no seu interior para matar qualquer um preso dentro dela. Ela consome 10 PEQ de Cristais utilizados na criação para cada criatura que a matriz conjurar para enfrentar as criaturas no seu interior. Ficando limitada a 3 criaturas por inimigo preso dentro dela. Para cada criatura acima de Condensação de Qi, a matriz consome 20 PEQ adicionais por nível.</p>\n<p>Uma matriz não pode conjurar criaturas acima do rank de um nível equivalente a matriz. Por exemplo: Uma matriz de nível 1 pode conjurar criaturas na Condensação de Qi. Enquanto isso, uma matriz de nível 4 pode conjurar criaturas no Mar Divino.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível causar o triplo de dano na matriz.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE ILUSÃO ASSASSINA\nPontos de Vida: 250 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 20\nUma matriz capaz de conjurar criaturas no seu interior para matar qualquer um preso dentro dela. Ela consome 10 PEQ de Cristais utilizados na criação para cada criatura que a matriz conjurar para enfrentar as criaturas no seu interior. Ficando limitada a 3 criaturas por inimigo preso dentro dela. Para cada criatura acima de Condensação de Qi, a matriz consome 20 PEQ adicionais por nível.\n\tUma matriz não pode conjurar criaturas acima do rank de um nível equivalente a matriz. Por exemplo: Uma matriz de nível 1 pode conjurar criaturas na Condensação de Qi. Enquanto isso, uma matriz de nível 4 pode conjurar criaturas no Mar Divino.\nValor Base de Criação\t1.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível causar o triplo de dano na matriz.",
    "creationPercent": 1000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição.",
      "Selecionar e criar manualmente as criaturas conjuradas, respeitando limites de Rank e PEQ."
    ],
    "hpPerLevel": 250,
    "weakPoint": "Ao chegar ao núcleo, é possível causar o triplo de dano na matriz."
  },
  {
    "id": "matriz-de-teletransporte",
    "name": "Matriz de Teletransporte",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 4,
      "max": 10
    },
    "dc": {
      "min": 25,
      "max": 25
    },
    "descriptionHTML": "<h3>MATRIZ DE TELETRANSPORTE</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 4 a 10</td><td>Classe de Dificuldade: 25</td></tr></tbody></table>\n<p>Uma matriz que permite que um grupo de até 20 criaturas possa teletransportar para outras matrizes de teletransporte ligadas a ela. O limite de alcance da matriz é de definido pelo nível dela. Sendo um limite inicial de 5.000 km e aumentando em 15 mil km para cada nível acima do 4º nível.</p>\n<p>A matriz consome 1 PEQ por km que ela for teletransportar um grupo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>5.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível causar o triplo de dano na matriz.</td></tr><tr><td>Requisito Adicional</td><td>Conceito do Espaço do mesmo nível da matriz ou 1.000 Cristais Espaciais por nível.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE TELETRANSPORTE\nPontos de Vida: 100 PV / nível\tNível: 4 a 10\tClasse de Dificuldade: 25\nUma matriz que permite que um grupo de até 20 criaturas possa teletransportar para outras matrizes de teletransporte ligadas a ela. O limite de alcance da matriz é de definido pelo nível dela. Sendo um limite inicial de 5.000 km e aumentando em 15 mil km para cada nível acima do 4º nível.\n\tA matriz consome 1 PEQ por km que ela for teletransportar um grupo.\nValor Base de Criação\t5.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível causar o triplo de dano na matriz.\nRequisito Adicional\tConceito do Espaço do mesmo nível da matriz ou 1.000 Cristais Espaciais por nível.",
    "creationPercent": 5000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição.",
      "Definir a matriz de destino ligada à origem, validar alcance e pagar o combustível por quilômetro antes do transporte."
    ],
    "extraRequirement": "Conceito do Espaço do mesmo nível da matriz ou 1.000 Cristais Espaciais por nível.",
    "hpPerLevel": 100,
    "weakPoint": "Ao chegar ao núcleo, é possível causar o triplo de dano na matriz."
  },
  {
    "id": "matriz-de-estabilizacao",
    "name": "Matriz de Estabilização",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 22,
      "max": 22
    },
    "descriptionHTML": "<h3>MATRIZ DE ESTABILIZAÇÃO</h3>\n<table><tbody><tr><td>Pontos de Vida: 50 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 22</td></tr></tbody></table>\n<p>Uma matriz utilizada para estabilizar o Qi ou força da alma e auxiliar na criação de alguma coisa que não seja uma matriz. Você reduz a CD de refinamento de tesouros, alquimia, talismãs ou uso de técnicas de cura pelo médico em -2.</p>\n<p>O valor de redução não funciona para criações de nível superior a matriz e aumenta a redução em -1 para cada nível da criação que for abaixo da matriz.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>2.500% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível causar o triplo de dano na matriz.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE ESTABILIZAÇÃO\nPontos de Vida: 50 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 22\nUma matriz utilizada para estabilizar o Qi ou força da alma e auxiliar na criação de alguma coisa que não seja uma matriz. Você reduz a CD de refinamento de tesouros, alquimia, talismãs ou uso de técnicas de cura pelo médico em -2. \n\tO valor de redução não funciona para criações de nível superior a matriz e aumenta a redução em -1 para cada nível da criação que for abaixo da matriz. \nValor Base de Criação\t2.500% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível causar o triplo de dano na matriz.",
    "creationPercent": 2500,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 50,
    "weakPoint": "Ao chegar ao núcleo, é possível causar o triplo de dano na matriz."
  },
  {
    "id": "matriz-de-aceleracao-temporal",
    "name": "Matriz de Aceleração Temporal",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 4,
      "max": 10
    },
    "dc": {
      "min": 25,
      "max": 25
    },
    "descriptionHTML": "<h3>MATRIZ DE ACELERAÇÃO TEMPORAL</h3>\n<table><tbody><tr><td>Pontos de Vida: 50 PV / nível</td><td>Nível: 4 a 10</td><td>Classe de Dificuldade: 25</td></tr></tbody></table>\n<p>Uma matriz de 60 metros de raio que acelera o tempo no interior dela em 10 vezes, mas afeta apenas minerais, plantas, bestas e similares. A velocidade dela pode ser acelerada em 20 vezes no 5º nível e dobrando a cada nível seguinte da matriz.</p>\n<p>A partir do 8º nível, ela também afeta criaturas no interior.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>5.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível causar o triplo de dano na matriz.</td></tr><tr><td>Custo Adicional</td><td>Ao multiplicar o alcance da matriz por 10, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.</td></tr><tr><td>Requisito Adicional</td><td>Conceito do Tempo do mesmo nível da matriz ou um tesouro do tempo equivalente ao nível.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE ACELERAÇÃO TEMPORAL\nPontos de Vida: 50 PV / nível\tNível: 4 a 10\tClasse de Dificuldade: 25\nUma matriz de 60 metros de raio que acelera o tempo no interior dela em 10 vezes, mas afeta apenas minerais, plantas, bestas e similares. A velocidade dela pode ser acelerada em 20 vezes no 5º nível e dobrando a cada nível seguinte da matriz.\n\tA partir do 8º nível, ela também afeta criaturas no interior.\nValor Base de Criação\t5.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível causar o triplo de dano na matriz.\nCusto Adicional\tAo multiplicar o alcance da matriz por 10, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.\nRequisito Adicional\tConceito do Tempo do mesmo nível da matriz ou um tesouro do tempo equivalente ao nível.",
    "creationPercent": 5000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "extraRequirement": "Conceito do Tempo do mesmo nível da matriz ou um tesouro do tempo equivalente ao nível.",
    "additionalCostRule": "Ao multiplicar o alcance da matriz por 10, você dobra o valor dela. Podendo repetir isso diversas vezes até cobrir toda uma seita.",
    "hpPerLevel": 50,
    "weakPoint": "Ao chegar ao núcleo, é possível causar o triplo de dano na matriz."
  },
  {
    "id": "matriz-de-prisao",
    "name": "Matriz de Prisão",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>MATRIZ DE PRISÃO</h3>\n<table><tbody><tr><td>Pontos de Vida: 150 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Uma matriz que dispersa o Qi de toda criatura no seu interior e a mantém presa dentro dela até que a matriz seja desativada ou destruída. Ela consome 1 PEQ por dia para se manter para cada criatura sendo afetada no interior dela.</p>\n<p>Uma criatura é imune aos efeitos de dispersão de Qi se o Rank dela for superior ao nível equivalente da matriz.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.500% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE PRISÃO\nPontos de Vida: 150 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 18\nUma matriz que dispersa o Qi de toda criatura no seu interior e a mantém presa dentro dela até que a matriz seja desativada ou destruída. Ela consome 1 PEQ por dia para se manter para cada criatura sendo afetada no interior dela.\n\tUma criatura é imune aos efeitos de dispersão de Qi se o Rank dela for superior ao nível equivalente da matriz.\nValor Base de Criação\t1.500% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la sem precisar destruí-la.",
    "creationPercent": 1500,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 150,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la."
  },
  {
    "id": "matriz-de-selamento",
    "name": "Matriz de Selamento",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>MATRIZ DE SELAMENTO</h3>\n<table><tbody><tr><td>Pontos de Vida: 200 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Uma matriz que tem a única função de selar uma criatura ou entidade em seu interior. Uma criatura selada é colocada sob a condição “Inconsciente” onde ela fica adormecida. Ela ainda tem consciência do que ocorre na área imediata a volta dela, mas não consegue despertar completamente. Ela consome 5 PEQ por dia para se manter.</p>\n<p>Você consegue aprisionar uma criatura de no máximo 2 ranks acima do nível equivalente da matriz.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>10.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE SELAMENTO\nPontos de Vida: 200 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 20\nUma matriz que tem a única função de selar uma criatura ou entidade em seu interior. Uma criatura selada é colocada sob a condição “Inconsciente” onde ela fica adormecida. Ela ainda tem consciência do que ocorre na área imediata a volta dela, mas não consegue despertar completamente. Ela consome 5 PEQ por dia para se manter.\n\tVocê consegue aprisionar uma criatura de no máximo 2 ranks acima do nível equivalente da matriz.\nValor Base de Criação\t10.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la sem precisar destruí-la.",
    "creationPercent": 10000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 200,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la."
  },
  {
    "id": "matriz-de-voo",
    "name": "Matriz de Voo",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>MATRIZ DE VOO</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma matriz que pode ser colocada em um objeto, estrutura ou parte de um terreno para faze-lo flutuar ao consumir Qi. Ela pode manter até 50 toneladas de terra, que dá cerca de 9 metros de raio. Essa matriz consome 1 PEQ por nível a cada dia para se manter.</p>\n<p>A cada nível seguinte, você multiplica a área de raio anterior por 5.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>2.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE VOO\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma matriz que pode ser colocada em um objeto, estrutura ou parte de um terreno para faze-lo flutuar ao consumir Qi. Ela pode manter até 50 toneladas de terra, que dá cerca de 9 metros de raio. Essa matriz consome 1 PEQ por nível a cada dia para se manter.\n\tA cada nível seguinte, você multiplica a área de raio anterior por 5.\nValor Base de Criação\t2.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la sem precisar destruí-la.",
    "creationPercent": 2000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la."
  },
  {
    "id": "matriz-de-paralisia",
    "name": "Matriz de Paralisia",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>MATRIZ DE PARALISIA</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Uma matriz que reduz o deslocamento de todas as criaturas com rank igual ao equivalente dela pela metade e zera o deslocamento de todas as criaturas com rank abaixo do equivalente ao nível dela.</p>\n<p>Ela reduz o deslocamento de criaturas de até 1 rank acima em 3 metros e não afeta criaturas com 2 ranks acima ou mais.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la.</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE PARALISIA\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 16\nUma matriz que reduz o deslocamento de todas as criaturas com rank igual ao equivalente dela pela metade e zera o deslocamento de todas as criaturas com rank abaixo do equivalente ao nível dela.\n\tEla reduz o deslocamento de criaturas de até 1 rank acima em 3 metros e não afeta criaturas com 2 ranks acima ou mais.\nValor Base de Criação\t1.000% do valor base de Receitas e Materiais.\nPonto Fraco\tAo chegar ao núcleo, é possível desativa-la sem precisar destruí-la.",
    "creationPercent": 1000,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Ao chegar ao núcleo, é possível desativa-la sem precisar destruí-la."
  },
  {
    "id": "matriz-de-contencao",
    "name": "Matriz de Contenção",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 19,
      "max": 19
    },
    "descriptionHTML": "<h3>MATRIZ DE CONTENÇÃO</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 19</td></tr></tbody></table>\n<p>Uma matriz capaz de absorver e conter um elemento ou entidade sem consciência complexa em seu interior (como uma essência elemental). Ela utiliza a energia do próprio elemento para se manter.</p>\n<p>Ela não pode conter um elemento, substância ou essência de rank superior ao nível equivalente dela.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>750% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Nenhum</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE CONTENÇÃO\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 19\nUma matriz capaz de absorver e conter um elemento ou entidade sem consciência complexa em seu interior (como uma essência elemental). Ela utiliza a energia do próprio elemento para se manter.\n\tEla não pode conter um elemento, substância ou essência de rank superior ao nível equivalente dela.\nValor Base de Criação\t750% do valor base de Receitas e Materiais.\nPonto Fraco\tNenhum",
    "creationPercent": 750,
    "pending": [
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Nenhum"
  },
  {
    "id": "matriz-de-refinamento-corporal",
    "name": "Matriz de Refinamento Corporal",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 23,
      "max": 23
    },
    "descriptionHTML": "<h3>MATRIZ DE REFINAMENTO CORPORAL</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 23</td></tr></tbody></table>\n<p>Uma matriz extremamente poderosa que serve para refinar o corpo, causando danos constantes aos dois enquanto estimula a regeneração dos mesmos.</p>\n<p>Efeito Pendente</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>25.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Nenhum</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE REFINAMENTO CORPORAL\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 23\nUma matriz extremamente poderosa que serve para refinar o corpo, causando danos constantes aos dois enquanto estimula a regeneração dos mesmos. \nEfeito Pendente\nValor Base de Criação\t25.000% do valor base de Receitas e Materiais.\nPonto Fraco\tNenhum",
    "creationPercent": 25000,
    "pending": [
      "Efeito Pendente na fonte: o efeito de refinamento ainda não foi definido pelo autor."
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Nenhum"
  },
  {
    "id": "matriz-de-refinamento-da-alma",
    "name": "Matriz de Refinamento da Alma",
    "kind": "matrix",
    "profession": "matrices",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 25,
      "max": 25
    },
    "descriptionHTML": "<h3>MATRIZ DE REFINAMENTO DA ALMA</h3>\n<table><tbody><tr><td>Pontos de Vida: 100 PV / nível</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 25</td></tr></tbody></table>\n<p>Uma matriz extremamente poderosa que serve para refinar a alma, causando danos constantes aos dois enquanto estimula a regeneração dos mesmos.</p>\n<p>Efeito Pendente</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>25.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Ponto Fraco</td><td>Nenhum</td></tr></tbody></table>",
    "sourceText": "MATRIZ DE REFINAMENTO DA ALMA\nPontos de Vida: 100 PV / nível\tNível: 1 a 10\tClasse de Dificuldade: 25\nUma matriz extremamente poderosa que serve para refinar a alma, causando danos constantes aos dois enquanto estimula a regeneração dos mesmos. \nEfeito Pendente\nValor Base de Criação\t25.000% do valor base de Receitas e Materiais.\nPonto Fraco\tNenhum",
    "creationPercent": 25000,
    "pending": [
      "Efeito Pendente na fonte: o efeito de refinamento ainda não foi definido pelo autor."
    ],
    "manual": [
      "O mestre posiciona a área e o núcleo, acompanha o combustível de PEQ, as criaturas afetadas e o ponto fraco conforme a descrição."
    ],
    "hpPerLevel": 100,
    "weakPoint": "Nenhum"
  },
  {
    "id": "simbolo-avassalador",
    "name": "Símbolo Avassalador",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 2,
      "max": 10
    },
    "dc": {
      "min": 14,
      "max": 14
    },
    "descriptionHTML": "<h3>SÍMBOLO AVASSALADOR</h3>\n<table><tbody><tr><td>Tipo: Arma</td><td>Nível: 2 a 10</td><td>Classe de Dificuldade: 14</td></tr></tbody></table>\n<p>Um símbolo que quando colocado em uma arma, aumenta seu dano em um passo e concede uma habilidade única com as seguintes características:</p>\n<p>Violent Strike (4 Pontos de Qi): Ao usar duas ações [⬢⬢], você avança na direção 3 metros na direção de uma criatura inimiga antes de desferir um golpe devastador contra o alvo, causando 42de dano Contundente, Cortante ou Perfurante, dependendo da arma. A criatura deve realizar uma Salvaguarda de Constituição para não receber a condição “Sangramento”.</p>\n<p>Você pode gastar 1 Ponto de Qi para adicionar 6 de dano até um máximo de 54 de dano.</p>\n<p>A cada nível seguinte, você aumenta o limite de dano do “Violent Strike” em 2 Pontos de Qi.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>100% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO AVASSALADOR\nTipo: Arma\tNível: 2 a 10\tClasse de Dificuldade: 14\nUm símbolo que quando colocado em uma arma, aumenta seu dano em um passo e concede uma habilidade única com as seguintes características:\n\nViolent Strike (4 Pontos de Qi): Ao usar duas ações [⬢⬢], você avança na direção 3 metros na direção de uma criatura inimiga antes de desferir um golpe devastador contra o alvo, causando 42de dano Contundente, Cortante ou Perfurante, dependendo da arma. A criatura deve realizar uma Salvaguarda de Constituição para não receber a condição “Sangramento”.\n\tVocê pode gastar 1 Ponto de Qi para adicionar 6 de dano até um máximo de 54 de dano.\n\nA cada nível seguinte, você aumenta o limite de dano do “Violent Strike” em 2 Pontos de Qi.\nValor Base de Criação\t100% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação.",
    "creationPercent": 100,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 200,
    "supportType": "Arma"
  },
  {
    "id": "simbolo-da-alma-infundida",
    "name": "Símbolo da Alma Infundida",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 17,
      "max": 17
    },
    "descriptionHTML": "<h3>SÍMBOLO DA ALMA INFUNDIDA</h3>\n<table><tbody><tr><td>Tipo: Alma</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 17</td></tr></tbody></table>\n<p>Um símbolo que quando colocado em seu corpo, cria uma pequena proteção contra danos diretamente na sua alma. Você reduz 5 Pontos de Dano Psíquico ou Verdadeiro diretamente na sua alma contra criaturas de rank equivalente ao nível. A cada rank que a criatura estiver abaixo do nível equivalente desse símbolo, a redução aumenta em 3 Pontos de Dano psíquico.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DA ALMA INFUNDIDA\nTipo: Alma\tNível: 1 a 10\tClasse de Dificuldade: 17\nUm símbolo que quando colocado em seu corpo, cria uma pequena proteção contra danos diretamente na sua alma. Você reduz 5 Pontos de Dano Psíquico ou Verdadeiro diretamente na sua alma contra criaturas de rank equivalente ao nível. A cada rank que a criatura estiver abaixo do nível equivalente desse símbolo, a redução aumenta em 3 Pontos de Dano psíquico.\nValor Base de Criação\t300% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 300,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 300,
    "supportType": "Alma"
  },
  {
    "id": "simbolo-do-acumulo-de-qi",
    "name": "Símbolo do Acúmulo de Qi",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>SÍMBOLO DO ACÚMULO DE QI</h3>\n<table><tbody><tr><td>Tipo: Corpo</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Um símbolo que aumenta o fluxo de circulação de Qi no corpo, permitindo que você cultive com uma maior velocidade.</p>\n<p>Você aumenta seu acúmulo de PEQ por dia em 5% e gera 1 Ponto de Qi adicionais no início de cada um de seus turnos para cada nível desse símbolo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>400% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>250% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DO ACÚMULO DE QI\nTipo: Corpo\tNível: 1 a 10\tClasse de Dificuldade: 18\nUm símbolo que aumenta o fluxo de circulação de Qi no corpo, permitindo que você cultive com uma maior velocidade.\n\tVocê aumenta seu acúmulo de PEQ por dia em 5% e gera 1 Ponto de Qi adicionais no início de cada um de seus turnos para cada nível desse símbolo.\nValor Base de Criação\t400% do valor base de Receitas e Materiais.\nValor de Venda\t250% do valor de criação.",
    "creationPercent": 400,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 250,
    "supportType": "Corpo"
  },
  {
    "id": "simbolo-do-selo-de-conflito",
    "name": "Símbolo do Selo de Conflito",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 17,
      "max": 17
    },
    "descriptionHTML": "<h3>SÍMBOLO DO SELO DE CONFLITO</h3>\n<table><tbody><tr><td>Tipo: Corpo</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 17</td></tr></tbody></table>\n<p>Um símbolo que aumenta os aspectos físicos da criatura que receber o símbolo em seu corpo, mas ela deve pagar um preço por ele.</p>\n<p>Ao usar uma ação [⬢], você pode gastar 10 Pontos de Qi do seu Qi Total para receber 2 Pontos de Atributo de Força, Agilidade e Constituição por 1 rodada. Você reduz o custo de ativação em 1 PQ e aumenta o benefício em 1 rodada para cada nível acima do primeiro.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>150% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DO SELO DE CONFLITO\nTipo: Corpo\tNível: 1 a 10\tClasse de Dificuldade: 17\nUm símbolo que aumenta os aspectos físicos da criatura que receber o símbolo em seu corpo, mas ela deve pagar um preço por ele.\n\tAo usar uma ação [⬢], você pode gastar 10 Pontos de Qi do seu Qi Total para receber 2 Pontos de Atributo de Força, Agilidade e Constituição por 1 rodada. Você reduz o custo de ativação em 1 PQ e aumenta o benefício em 1 rodada para cada nível acima do primeiro.\nValor Base de Criação\t150% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação.",
    "creationPercent": 150,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 200,
    "supportType": "Corpo"
  },
  {
    "id": "simbolo-de-aprimoramento-de-pilula",
    "name": "Símbolo de Aprimoramento de Pílula",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 4,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>SÍMBOLO DE APRIMORAMENTO DE PÍLULA</h3>\n<table><tbody><tr><td>Tipo: Pílula</td><td>Nível: 4 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Um símbolo que aprimora tremendamente os efeitos de uma pílula, permitindo que seus efeitos afetem criaturas de rank superior. Ao colocar um símbolo de nível superior a uma pílula, ela passa a ser considerada uma pílula de mesmo nível do símbolo. Uma pílula não pode ser aprimorada mais de 1 nível acima do original dela.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DE APRIMORAMENTO DE PÍLULA\nTipo: Pílula\tNível: 4 a 10\tClasse de Dificuldade: 20\nUm símbolo que aprimora tremendamente os efeitos de uma pílula, permitindo que seus efeitos afetem criaturas de rank superior. Ao colocar um símbolo de nível superior a uma pílula, ela passa a ser considerada uma pílula de mesmo nível do símbolo. Uma pílula não pode ser aprimorada mais de 1 nível acima do original dela.\nValor Base de Criação\t500% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 500,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 300,
    "supportType": "Pílula"
  },
  {
    "id": "simbolo-de-preservacao",
    "name": "Símbolo de Preservação",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 15,
      "max": 15
    },
    "descriptionHTML": "<h3>SÍMBOLO DE PRESERVAÇÃO</h3>\n<table><tbody><tr><td>Tipo: Pílula</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 15</td></tr></tbody></table>\n<p>Um símbolo que prende toda essência medicinal de uma pílula em seu interior, fazendo com que ela nunca perca os efeitos dela não importa quanto tempo passe.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>400% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>250% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DE PRESERVAÇÃO\nTipo: Pílula\tNível: 1 a 10\tClasse de Dificuldade: 15\nUm símbolo que prende toda essência medicinal de uma pílula em seu interior, fazendo com que ela nunca perca os efeitos dela não importa quanto tempo passe.\nValor Base de Criação\t400% do valor base de Receitas e Materiais.\nValor de Venda\t250% do valor de criação.",
    "creationPercent": 400,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 250,
    "supportType": "Pílula"
  },
  {
    "id": "simbolo-da-mente-calma",
    "name": "Símbolo da Mente Calma",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>SÍMBOLO DA MENTE CALMA</h3>\n<table><tbody><tr><td>Tipo: Corpo</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Um símbolo que concentra grande parte do Qi em sua cabeça em um método de circulação perfeito, fazendo com que você disperse efeitos negativos mentais com mais facilidade. Você recebe +2 em Salvaguardas de Intelecto, Sabedoria e Presença.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>600% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>250% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DA MENTE CALMA\nTipo: Corpo\tNível: 1 a 10\tClasse de Dificuldade: 18\nUm símbolo que concentra grande parte do Qi em sua cabeça em um método de circulação perfeito, fazendo com que você disperse efeitos negativos mentais com mais facilidade. Você recebe +2 em Salvaguardas de Intelecto, Sabedoria e Presença.\nValor Base de Criação\t600% do valor base de Receitas e Materiais.\nValor de Venda\t250% do valor de criação.",
    "creationPercent": 600,
    "pending": [],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 250,
    "supportType": "Corpo"
  },
  {
    "id": "simbolo-do-fio-incomparavel",
    "name": "Símbolo do Fio Incomparável",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>SÍMBOLO DO FIO INCOMPARÁVEL</h3>\n<table><tbody><tr><td>Tipo: Arma</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Um símbolo que, ao colocado em uma arma, faz com que você possa causar dano sem sofrer reduções de Rank em criaturas um Rank acima ao do símbolo para baixo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>750% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DO FIO INCOMPARÁVEL\nTipo: Arma\tNível: 1 a 10\tClasse de Dificuldade: 18\nUm símbolo que, ao colocado em uma arma, faz com que você possa causar dano sem sofrer reduções de Rank em criaturas um Rank acima ao do símbolo para baixo.\nValor Base de Criação\t750% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 750,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 300,
    "supportType": "Arma"
  },
  {
    "id": "simbolo-da-dispersao-de-dano",
    "name": "Símbolo da Dispersão de Dano",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 17,
      "max": 17
    },
    "descriptionHTML": "<h3>SÍMBOLO DA DISPERSÃO DE DANO</h3>\n<table><tbody><tr><td>Tipo: Armadura</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 17</td></tr></tbody></table>\n<p>Um símbolo que reduz o dano sofrido contra criaturas de mesmo Rank que você recebe em 3 Pontos de Dano, aumentando 3 Pontos de Dano para cada Rank abaixo do nível equivalente do símbolo, desde que seja colocado em uma Armadura referente ao seu Rank.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>750% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DA DISPERSÃO DE DANO\nTipo: Armadura \tNível: 1 a 10\tClasse de Dificuldade: 17\nUm símbolo que reduz o dano sofrido contra criaturas de mesmo Rank que você recebe em 3 Pontos de Dano, aumentando 3 Pontos de Dano para cada Rank abaixo do nível equivalente do símbolo, desde que seja colocado em uma Armadura referente ao seu Rank.\nValor Base de Criação\t750% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 750,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 300,
    "supportType": "Armadura"
  },
  {
    "id": "simbolo-da-mente-sagaz",
    "name": "Símbolo da Mente Sagaz",
    "kind": "inscription",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 21,
      "max": 21
    },
    "descriptionHTML": "<h3>SÍMBOLO DA MENTE SAGAZ</h3>\n<table><tbody><tr><td>Tipo: Alma</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 21</td></tr></tbody></table>\n<p>Um símbolo que pode ser marcado em sua testa para auxiliar seu avanço de Rank, fazendo com que sua força de Vontade se torne inesgotável por um curto período de tempo. Você deve usar um símbolo de nível equivalente ao seu Rank atual e ele desaparece após seu avanço.</p>\n<p>Enquanto estiver com esse símbolo, você diminui a dificuldade do avanço em 2.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.500% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>350% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "SÍMBOLO DA MENTE SAGAZ\nTipo: Alma\tNível: 1 a 10\tClasse de Dificuldade: 21\nUm símbolo que pode ser marcado em sua testa para auxiliar seu avanço de Rank, fazendo com que sua força de Vontade se torne inesgotável por um curto período de tempo. Você deve usar um símbolo de nível equivalente ao seu Rank atual e ele desaparece após seu avanço. \n\tEnquanto estiver com esse símbolo, você diminui a dificuldade do avanço em 2.\nValor Base de Criação\t1.500% do valor base de Receitas e Materiais.\nValor de Venda\t350% do valor de criação.",
    "creationPercent": 1500,
    "pending": [
    ],
    "manual": [
      "Aplicar esta inscrição ao suporte ou criatura indicado; vincular a habilidade e suas limitações ao alvo escolhido."
    ],
    "salePercent": 350,
    "supportType": "Alma"
  },
  {
    "id": "talisma-explosivo",
    "name": "Talismã Explosivo",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>TALISMÃ EXPLOSIVO</h3>\n<table><tbody><tr><td>Tipo: Ataque</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Um talismã que pode ser atirado em uma direção a sua escolha com duas ações [⬢⬢], criando uma explosão no alcance de uma esfera de 12 metros de raio, causando 12 de dano para cada nível do símbolo. Todas as criaturas dentro do alcance devem realizar uma Salvaguarda de Agilidade. Uma falha na salvaguarda causa o dano total; um sucesso causa metade do dano. Metade do dano é Contundente e a outra metade é Fogo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ EXPLOSIVO\nTipo: Ataque\tNível: 1 a 10\tClasse de Dificuldade: 16\nUm talismã que pode ser atirado em uma direção a sua escolha com duas ações [⬢⬢], criando uma explosão no alcance de uma esfera de 12 metros de raio, causando 12 de dano para cada nível do símbolo. Todas as criaturas dentro do alcance devem realizar uma Salvaguarda de Agilidade. Sofrendo todo dano como dano do tipo Contundente ou metade se falharem. Metade do dano sofrido é convertido em dano de Fogo.\nValor Base de Criação\t300% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação.",
    "creationPercent": 300,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 200,
    "supportType": "Ataque"
  },
  {
    "id": "talisma-de-barreira",
    "name": "Talismã de Barreira",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>TALISMÃ DE BARREIRA</h3>\n<table><tbody><tr><td>Tipo: Defesa</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Ao ativar esse talismã com uma reação, você cria uma barreira ao seu redor que reduz 20 de dano para cada nível do símbolo. Esse efeito dura até o início do seu próximo turno.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE BARREIRA\nTipo: Defesa\tNível: 1 a 10\tClasse de Dificuldade: 16\nAo ativar esse talismã com uma reação, você cria uma barreira ao seu redor que reduz 20 de dano para cada nível do símbolo. Esse efeito dura até o início do seu próximo turno.\nValor Base de Criação\t300% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação.",
    "creationPercent": 300,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 200,
    "supportType": "Defesa"
  },
  {
    "id": "talisma-de-fuga",
    "name": "Talismã de Fuga",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>TALISMÃ DE FUGA</h3>\n<table><tbody><tr><td>Tipo: Defesa</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Ao ativar esse talismã com uma reação, você é teletransportado para um local aleatório a 10.000 metros vezes o nível do símbolo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr><tr><td>Requisito Adicional</td><td>Conceito do Espaço – Nível 3</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE FUGA\nTipo: Defesa\tNível: 1 a 10\tClasse de Dificuldade: 20\nAo ativar esse talismã com uma reação, você é teletransportado para um local aleatório a 10.000 metros vezes o nível do símbolo.\nValor Base de Criação\t300% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação.\nRequisito Adicional\tConceito do Espaço – Nível 3",
    "creationPercent": 300,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre.",
      "O mestre define o destino aleatório válido do teletransporte antes de mover a criatura."
    ],
    "salePercent": 200,
    "extraRequirement": "Conceito do Espaço – Nível 3",
    "supportType": "Defesa"
  },
  {
    "id": "talisma-de-selamento",
    "name": "Talismã de Selamento",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 21,
      "max": 21
    },
    "descriptionHTML": "<h3>TALISMÃ DE SELAMENTO</h3>\n<table><tbody><tr><td>Tipo: Utilitário</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 21</td></tr></tbody></table>\n<p>Um talismã que quando ativado com uma ação [⬢], cria uma barreira de 30 metros de raio ao seu redor que bloqueia a passagem de todas as criaturas de rank igual ao nível equivalente ao símbolo ou menor.</p>\n<p>A barreira possui 150 Pontos de Vida por nível e recebe dano apenas de criaturas com Rank superior ao nível do símbolo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>300% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>200% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE SELAMENTO\nTipo: Utilitário\tNível: 1 a 10\tClasse de Dificuldade: 21\nUm talismã que quando ativado com uma ação [⬢], cria uma barreira de 30 metros de raio ao seu redor que bloqueia a passagem de todas as criaturas de rank igual ao nível equivalente ao símbolo ou menor. \n\tA barreira possui 150 Pontos de Vida por nível e recebe dano apenas de criaturas com Rank superior ao nível do símbolo.\nValor Base de Criação\t300% do valor base de Receitas e Materiais.\nValor de Venda\t200% do valor de criação.",
    "creationPercent": 300,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 200,
    "supportType": "Utilitário"
  },
  {
    "id": "talisma-de-ocultacao",
    "name": "Talismã de Ocultação",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 19,
      "max": 19
    },
    "descriptionHTML": "<h3>TALISMÃ DE OCULTAÇÃO</h3>\n<table><tbody><tr><td>Tipo: Utilitário</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 19</td></tr></tbody></table>\n<p>Um talismã que quando rasgado faz com que o usuário receba a condição “Invisível” desde que não se mova mais de 3 metros por rodada. Você não pode ser detectado mesmo por “Sentido Divino”, desde que a criatura seja de um Rank igual ou menor que o nível equivalente do símbolo.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>700% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE OCULTAÇÃO\nTipo: Utilitário\tNível: 1 a 10\tClasse de Dificuldade: 19\nUm talismã que quando rasgado faz com que o usuário receba a condição “Invisível” desde que não se mova mais de 3 metros por rodada. Você não pode ser detectado mesmo por “Sentido Divino”, desde que a criatura seja de um Rank igual ou menor que o nível equivalente do símbolo.\nValor Base de Criação\t700% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 700,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 300,
    "supportType": "Utilitário"
  },
  {
    "id": "talisma-de-estagnacao",
    "name": "Talismã de Estagnação",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 16,
      "max": 16
    },
    "descriptionHTML": "<h3>TALISMÃ DE ESTAGNAÇÃO</h3>\n<table><tbody><tr><td>Tipo: Utilitário</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 16</td></tr></tbody></table>\n<p>Um talismã que quando rasgado cria uma área de densidade aumentada em uma área de 120 metros de raio. Todas as criaturas dentro da área perdem metade do deslocamento total delas. Ele afeta no máximo criaturas de 2 ranks acima do nível equivalente do Talismã.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>600% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>250% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE ESTAGNAÇÃO\nTipo: Utilitário\tNível: 1 a 10\tClasse de Dificuldade: 16\nUm talismã que quando rasgado cria uma área de densidade aumentada em uma área de 120 metros de raio. Todas as criaturas dentro da área perdem metade do deslocamento total delas. Ele afeta no máximo criaturas de 2 ranks acima do nível equivalente do Talismã.\nValor Base de Criação\t600% do valor base de Receitas e Materiais.\nValor de Venda\t250% do valor de criação.",
    "creationPercent": 600,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 250,
    "supportType": "Utilitário"
  },
  {
    "id": "talisma-de-aviso",
    "name": "Talismã de Aviso",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 5,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>TALISMÃ DE AVISO</h3>\n<table><tbody><tr><td>Tipo: Utilitário</td><td>Nível: 5 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Um talismã que é vinculado a alma da criatura e quando ela morre, o talismã é destruído, enviando uma imagem de 210 metros de raio ao redor da criatura no momento da morte dela para uma criatura marcada, fazendo ela saber todas as criaturas que estavam presentes no momento da morte.</p>\n<p>O talismã pode enviar a imagem a 100.000 metros, dobrando a cada nível posterior.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>800% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE AVISO\nTipo: Utilitário\tNível: 5 a 10\tClasse de Dificuldade: 18\nUm talismã que é vinculado a alma da criatura e quando ela morre, o talismã é destruído, enviando uma imagem de 210 metros de raio ao redor da criatura no momento da morte dela para uma criatura marcada, fazendo ela saber todas as criaturas que estavam presentes no momento da morte.\n\tO talismã pode enviar a imagem a 100.000 metros, dobrando a cada nível posterior.\nValor Base de Criação\t800% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 800,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 300,
    "supportType": "Utilitário"
  },
  {
    "id": "talisma-de-controle",
    "name": "Talismã de Controle",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 18,
      "max": 18
    },
    "descriptionHTML": "<h3>TALISMÃ DE CONTROLE</h3>\n<table><tbody><tr><td>Tipo: Utilitário</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 18</td></tr></tbody></table>\n<p>Um talismã que você pode rasgar e jogar na direção de uma criatura dentro do alcance. Se a criatura for atingida pelo talismã, ela deve realizar uma Salvaguarda de Intelecto para não receber a condição “Atordoado” por 1 minuto. A condição desaparece no fim do turno que ela sofreu dano ou foi movida.</p>\n<p>Não afeta criaturas com rank superior ao nível equivalente do talismã.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>800% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE CONTROLE\nTipo: Utilitário\tNível: 1 a 10\tClasse de Dificuldade: 18\nUm talismã que você pode rasgar e jogar na direção de uma criatura dentro do alcance. Se a criatura for atingida pelo talismã, ela deve realizar uma Salvaguarda de Intelecto para não receber a condição “Atordoado” por 1 minuto. A condição desaparece no fim do turno que ela sofreu dano ou foi movida.\n\tNão afeta criaturas com rank superior ao nível equivalente do talismã.\nValor Base de Criação\t800% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 800,
    "pending": [],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 300,
    "supportType": "Utilitário"
  },
  {
    "id": "talisma-de-defesa-suprema",
    "name": "Talismã de Defesa Suprema",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 22,
      "max": 22
    },
    "descriptionHTML": "<h3>TALISMÃ DE DEFESA SUPREMA</h3>\n<table><tbody><tr><td>Tipo: Defensivo</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 22</td></tr></tbody></table>\n<p>Um talismã que se ativa sozinho quando você sofre um ataque total de uma criatura 2 Ranks acima do seu ou superior, anulando totalmente o dano que você sofreria e te teletransportando 300 metros em uma direção a sua escolha para cada nível do talismã.</p>\n<p>Não pode defender de criaturas com Rank superior ao nível equivalente do talismã.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.000% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>400% do valor de criação.</td></tr><tr><td>Requisito Adicional</td><td>Conceito do Espaço – Nível 3</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE DEFESA SUPREMA\nTipo: Defensivo\tNível: 1 a 10\tClasse de Dificuldade: 22\nUm talismã que se ativa sozinho quando você sofre um ataque total de uma criatura 2 Ranks acima do seu ou superior, anulando totalmente o dano que você sofreria e te teletransportando 300 metros em uma direção a sua escolha para cada nível do talismã.\n\tNão pode defender de criaturas com Rank superior ao nível equivalente do talismã.\nValor Base de Criação\t1.000% do valor base de Receitas e Materiais.\nValor de Venda\t400% do valor de criação.\nRequisito Adicional\tConceito do Espaço – Nível 3",
    "creationPercent": 1000,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre.",
      "Escolher e validar o destino na direção indicada antes de mover a criatura."
    ],
    "salePercent": 400,
    "extraRequirement": "Conceito do Espaço – Nível 3",
    "supportType": "Defensivo"
  },
  {
    "id": "talisma-de-ataque-supremo",
    "name": "Talismã de Ataque Supremo",
    "kind": "talisman",
    "profession": "inscriptions",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 20,
      "max": 20
    },
    "descriptionHTML": "<h3>TALISMÃ DE ATAQUE SUPREMO</h3>\n<table><tbody><tr><td>Tipo: Ataque</td><td>Nível: 1 a 10</td><td>Classe de Dificuldade: 20</td></tr></tbody></table>\n<p>Um talismã que pode guardar o ataque de uma criatura de um Rank igual ao nível equivalente do talismã ou superior, onde a criatura consome o Qi dela para colocar o ataque dentro do talismã.</p>\n<p>A qualquer momento, uma criatura pode usar uma ação [⬢] para liberar o ataque contido dentro do talismã contra uma criatura ou área a escolha dela dentro do alcance.</p>\n<table><tbody><tr><td>Valor Base de Criação</td><td>1.200% do valor base de Receitas e Materiais.</td></tr><tr><td>Valor de Venda</td><td>300% do valor de criação.</td></tr></tbody></table>",
    "sourceText": "TALISMÃ DE ATAQUE SUPREMO\nTipo: Ataque\tNível: 1 a 10\tClasse de Dificuldade: 20\nUm talismã que pode guardar o ataque de uma criatura de um Rank igual ao nível equivalente do talismã ou superior, onde a criatura consome o Qi dela para colocar o ataque dentro do talismã.\n\tA qualquer momento, uma criatura pode usar uma ação [⬢] para liberar o ataque contido dentro do talismã contra uma criatura ou área a escolha dela dentro do alcance.\nValor Base de Criação\t1.200% do valor base de Receitas e Materiais.\nValor de Venda\t300% do valor de criação.",
    "creationPercent": 1200,
    "pending": [
    ],
    "manual": [
      "Declarar ativação, alvos, área e duração conforme a descrição; resolver os efeitos táticos com o mestre."
    ],
    "salePercent": 300,
    "supportType": "Ataque"
  },
  {
    "id": "livro-de-tecnicas-de-controle-do-fogo",
    "name": "Livro de Técnicas de Controle do Fogo",
    "kind": "tool",
    "profession": "alchemy",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.</p>",
    "sourceText": "Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "forno-de-alquimia",
    "name": "Forno de Alquimia",
    "kind": "tool",
    "profession": "alchemy",
    "toolType": "equipment",
    "descriptionHTML": "<p>Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.</p>",
    "sourceText": "Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "conjunto-de-reagentes",
    "name": "Conjunto de Reagentes",
    "kind": "tool",
    "profession": "alchemy",
    "toolType": "supply",
    "descriptionHTML": "<p>Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.</p>",
    "sourceText": "Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "enciclopedia-de-ervas",
    "name": "Enciclopédia de Ervas",
    "kind": "tool",
    "profession": "alchemy",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.</p>",
    "sourceText": "Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "lingote-de-ferro",
    "name": "Lingote de Ferro",
    "kind": "tool",
    "profession": "artisan",
    "toolType": "material",
    "descriptionHTML": "<p>Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.</p>",
    "sourceText": "Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 4 lingotes.",
    "startingQuantity": 4,
    "pending": [],
    "manual": []
  },
  {
    "id": "livro-sobre-minerais-raros",
    "name": "Livro Sobre Minerais Raros",
    "kind": "tool",
    "profession": "artisan",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.</p>",
    "sourceText": "Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "bigorna",
    "name": "Bigorna",
    "kind": "tool",
    "profession": "artisan",
    "toolType": "equipment",
    "descriptionHTML": "<p>Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.</p>",
    "sourceText": "Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "conjunto-de-ferramentas-de-forja",
    "name": "Conjunto de Ferramentas de Forja",
    "kind": "tool",
    "profession": "artisan",
    "toolType": "equipment",
    "descriptionHTML": "<p>Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.</p>",
    "sourceText": "Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "kit-de-primeiros-socorros",
    "name": "Kit de Primeiros Socorros",
    "kind": "tool",
    "profession": "beasts",
    "toolType": "supply",
    "descriptionHTML": "<p>Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.</p>",
    "sourceText": "Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 3.",
    "startingQuantity": 3,
    "pending": [],
    "manual": []
  },
  {
    "id": "livro-sobre-bestas-magicas-e-demoniacas",
    "name": "Livro Sobre Bestas Mágicas e Demoníacas",
    "kind": "tool",
    "profession": "beasts",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.</p>",
    "sourceText": "Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "racao-para-bestas",
    "name": "Ração para Bestas",
    "kind": "tool",
    "profession": "beasts",
    "toolType": "supply",
    "descriptionHTML": "<p>Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.</p>",
    "sourceText": "Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 10 pacotes.",
    "startingQuantity": 10,
    "pending": [],
    "manual": []
  },
  {
    "id": "livro-sobre-biomas",
    "name": "Livro sobre Biomas",
    "kind": "tool",
    "profession": "beasts",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.</p>",
    "sourceText": "Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "papel-de-talisma",
    "name": "Papel de Talismã",
    "kind": "tool",
    "profession": "inscriptions",
    "toolType": "supply",
    "descriptionHTML": "<p>Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.</p>",
    "sourceText": "Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 20.",
    "startingQuantity": 20,
    "pending": [],
    "manual": [],
    "price": {
      "value": 50,
      "denomination": "gp"
    }
  },
  {
    "id": "pincel-e-tinta-de-alta-qualidade",
    "name": "Pincel e Tinta de Alta Qualidade",
    "kind": "tool",
    "profession": "inscriptions",
    "toolType": "equipment",
    "descriptionHTML": "<p>Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.</p>",
    "sourceText": "Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "livro-sobre-runas-de-inscricao",
    "name": "Livro sobre Runas de Inscrição",
    "kind": "tool",
    "profession": "inscriptions",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.</p>",
    "sourceText": "Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "nucleo-de-matriz-simples",
    "name": "Núcleo de Matriz Simples",
    "kind": "tool",
    "profession": "matrices",
    "toolType": "material",
    "descriptionHTML": "<p>Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.</p>",
    "sourceText": "Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 2.",
    "startingQuantity": 2,
    "pending": [],
    "manual": []
  },
  {
    "id": "disco-de-matriz",
    "name": "Disco de Matriz",
    "kind": "tool",
    "profession": "matrices",
    "toolType": "equipment",
    "descriptionHTML": "<p>Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.</p>",
    "sourceText": "Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": [],
    "price": {
      "value": 500,
      "denomination": "gp"
    }
  },
  {
    "id": "entalhador",
    "name": "Entalhador",
    "kind": "tool",
    "profession": "matrices",
    "toolType": "equipment",
    "descriptionHTML": "<p>Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.</p>",
    "sourceText": "Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "livro-sobre-runas-e-padroes",
    "name": "Livro sobre Runas e Padrões",
    "kind": "tool",
    "profession": "matrices",
    "toolType": "book",
    "descriptionHTML": "<p>Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.</p>",
    "sourceText": "Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.",
    "quantityRule": "Quantidade exigida entre as ferramentas iniciais: 1.",
    "startingQuantity": 1,
    "pending": [],
    "manual": []
  },
  {
    "id": "livro-de-receitas-gerais-de-alquimia",
    "name": "Livro de Receitas Gerais de Alquimia",
    "kind": "tool",
    "profession": "alchemy",
    "toolType": "book",
    "descriptionHTML": "<p>Existem diversas receitas de pílulas no mundo, algumas são receitas originais enquanto outras são extremamente raras. Quando você se torna um alquimista, ou até antes disso, você pode gastar 500 pedras espirituais para comprar um livro de receitas gerais, que te dá acesso a algumas receitas básicas que vão de nível 1 a 10.</p>",
    "sourceText": "Existem diversas receitas de pílulas no mundo, algumas são receitas originais enquanto outras são extremamente raras. Quando você se torna um alquimista, ou até antes disso, você pode gastar 500 pedras espirituais para comprar um livro de receitas gerais, que te dá acesso a algumas receitas básicas que vão de nível 1 a 10.",
    "pending": [
      "Preço autoral de 500 pedras espirituais; moeda sem conversão definida para as moedas da ficha."
    ],
    "manual": [
      "A posse do livro fornece a referência descrita, mas não concede automaticamente talento nem nível profissional."
    ]
  },
  {
    "id": "livro-de-esquemas-gerais-de-matrizes",
    "name": "Livro de Esquemas Gerais de Matrizes",
    "kind": "tool",
    "profession": "matrices",
    "toolType": "book",
    "descriptionHTML": "<p>Existem diversos esquemas de matrizes no mundo, alguns são esquemas originais enquanto outros são extremamente raros. Quando você se torna um mestre de matrizes, ou até antes disso, você pode gastar 10.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.</p>",
    "sourceText": "Existem diversos esquemas de matrizes no mundo, alguns são esquemas originais enquanto outros são extremamente raros. Quando você se torna um mestre de matrizes, ou até antes disso, você pode gastar 10.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.",
    "pending": [],
    "manual": [
      "A posse do livro fornece a referência descrita, mas não concede automaticamente talento nem nível profissional."
    ],
    "price": {
      "value": 10000,
      "denomination": "gp"
    }
  },
  {
    "id": "livro-de-esquemas-gerais-de-inscricoes",
    "name": "Livro de Esquemas Gerais de Inscrições",
    "kind": "tool",
    "profession": "inscriptions",
    "toolType": "book",
    "descriptionHTML": "<p>Existem diversos tipos de inscrições e talismãs no mundo, alguns são originais enquanto outros são extremamente raros. Quando você se torna um mestre de inscrições, ou até antes disso, você pode gastar 15.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.</p>",
    "sourceText": "Existem diversos tipos de inscrições e talismãs no mundo, alguns são originais enquanto outros são extremamente raros. Quando você se torna um mestre de inscrições, ou até antes disso, você pode gastar 15.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.",
    "pending": [],
    "manual": [
      "A posse do livro fornece a referência descrita, mas não concede automaticamente talento nem nível profissional."
    ],
    "price": {
      "value": 15000,
      "denomination": "gp"
    }
  },
  {
    "id": "livro-de-forja-basica",
    "name": "Livro de Forja Básica",
    "kind": "tool",
    "profession": "artisan",
    "toolType": "book",
    "descriptionHTML": "<p>Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.</p>",
    "sourceText": "Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.",
    "pending": [],
    "manual": [
      "A posse do livro fornece a referência descrita, mas não concede automaticamente talento nem nível profissional."
    ],
    "price": {
      "value": 10000,
      "denomination": "gp"
    }
  },
  {
    "id": "tesouro-armadura",
    "name": "Tesouro — Armadura",
    "kind": "treasure",
    "profession": "artisan",
    "treasureType": "armadura",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 10,
      "max": 10
    },
    "dcRule": "CD 10, aumentando +2 para cada nível do equipamento além do equivalente da Tabela de Tesouros.",
    "creationPercent": 5000,
    "descriptionHTML": "<h3>CRIAÇÃO DE TESOUROS</h3>\n<p>Como um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.</p>\n<p>Para criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro.</p>\n<p>Existem tesouros das seguintes raridades:</p>\n<h3>TABELA DE TESOUROS</h3>\n<table><tbody><tr><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td></tr><tr><td>Humano</td><td>Inferior</td><td>1</td><td>Sagrado</td><td>Inferior</td><td>7</td></tr><tr><td></td><td>Comum</td><td>2</td><td></td><td>Comum</td><td>-</td></tr><tr><td></td><td>Superior</td><td>3</td><td></td><td>Superior</td><td>8</td></tr></tbody></table>\n<table><tbody><tr><td>Terra</td><td>Inferior</td><td>-</td><td>Divino</td><td>Única</td><td>9</td></tr><tr><td></td><td>Comum</td><td>4</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>-</td><td></td><td></td><td></td></tr></tbody></table>\n<table><tbody><tr><td>Céu</td><td>Inferior</td><td>5</td><td>Supremo</td><td>Única</td><td>10</td></tr><tr><td></td><td>Comum</td><td>-</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>6</td><td></td><td></td><td></td></tr></tbody></table>\n<h3>TIPOS DE TESOUROS</h3>\n<p>Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.</p>\n<h3>ARMADURAS</h3>\n<table><tbody><tr><td>RANK</td><td>BASE</td><td>EFEITO ADICIONAL</td></tr><tr><td>Humano</td><td>Resistência 2 - Todos</td><td>-</td></tr><tr><td>Terra</td><td>Resistência 4 - Todos</td><td>Ignora dano de Formação de Núcleo ou menor.</td></tr><tr><td>Céu</td><td>Resistência 6 - Todos</td><td>Ignora dano de Núcleo Rotativo ou menor.</td></tr><tr><td>Sagrado</td><td>Resistência 8 - Todos</td><td>Ignora dano de Transformação Divina ou menor.</td></tr><tr><td>Divino</td><td>Resistência 10 - Todos</td><td>Ignora dano de Lorde Divino ou menor.</td></tr><tr><td>Supremo</td><td>Resistência 20 - Todos</td><td>Ignora dano de Imperador Sagrado ou menor.</td></tr></tbody></table>\n<h3>ADICIONANDO EFEITOS</h3>\n<p>Quando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.</p>\n<h3>VALOR DA CRIAÇÃO</h3>\n<p>O valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.</p>",
    "sourceText": "CRIAÇÃO DE TESOUROS\nComo um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.\n\tPara criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro. \n\nExistem tesouros das seguintes raridades:\n\nTABELA DE TESOUROS\nRANKS\tCLASSES\tNÍVEL\tRANKS\tCLASSES\tNÍVEL\nHumano\tInferior\t1\tSagrado\tInferior\t7\n\tComum\t2\t\tComum\t-\n\tSuperior\t3\t\tSuperior\t8\n\nTerra\tInferior\t-\tDivino\tÚnica\t9\n\tComum\t4\t\t\t\n\tSuperior\t-\t\t\t\n\nCéu\tInferior\t5\tSupremo\tÚnica\t10\n\tComum\t-\t\t\t\n\tSuperior\t6\t\t\t\n\nTIPOS DE TESOUROS\nExistem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.\n\nARMADURAS\nRANK\tBASE\tEFEITO ADICIONAL\nHumano\tResistência 2 - Todos\t-\nTerra\tResistência 4 - Todos\tIgnora dano de Formação de Núcleo ou menor.\nCéu\tResistência 6 - Todos\tIgnora dano de Núcleo Rotativo ou menor.\nSagrado\tResistência 8 - Todos\tIgnora dano de Transformação Divina ou menor.\nDivino\tResistência 10 - Todos\tIgnora dano de Lorde Divino ou menor.\nSupremo\tResistência 20 - Todos\tIgnora dano de Imperador Sagrado ou menor.\n\nADICIONANDO EFEITOS                                                                                                                                                                                                              \nQuando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.\n\nVALOR DA CRIAÇÃO                                                                                                                                                                                                              \nO valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.",
    "pending": [
      "A criação custa cerca de 5.000% do valor padrão de mercado do nível do equipamento. Confirmar a relação dessa base com Receitas e Materiais antes de cobrar custos."
    ],
    "manual": [
      "Escolher forma, materiais, rank, classe e efeito do tesouro; o ingrediente de rank mais baixo define a habilidade, ou o núcleo de besta fornece uma habilidade natural. Os tipos genéricos não definem arma, armadura ou habilidade específica."
    ],
    "rankRules": [
      {
        "rank": "Humano",
        "resistance": 2,
        "effect": "-"
      },
      {
        "rank": "Terra",
        "resistance": 4,
        "effect": "Ignora dano de Formação de Núcleo ou menor."
      },
      {
        "rank": "Céu",
        "resistance": 6,
        "effect": "Ignora dano de Núcleo Rotativo ou menor."
      },
      {
        "rank": "Sagrado",
        "resistance": 8,
        "effect": "Ignora dano de Transformação Divina ou menor."
      },
      {
        "rank": "Divino",
        "resistance": 10,
        "effect": "Ignora dano de Lorde Divino ou menor."
      },
      {
        "rank": "Supremo",
        "resistance": 20,
        "effect": "Ignora dano de Imperador Sagrado ou menor."
      }
    ]
  },
  {
    "id": "tesouro-arma",
    "name": "Tesouro — Arma",
    "kind": "treasure",
    "profession": "artisan",
    "treasureType": "arma",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 10,
      "max": 10
    },
    "dcRule": "CD 10, aumentando +2 para cada nível do equipamento além do equivalente da Tabela de Tesouros.",
    "creationPercent": 5000,
    "descriptionHTML": "<h3>CRIAÇÃO DE TESOUROS</h3>\n<p>Como um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.</p>\n<p>Para criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro.</p>\n<p>Existem tesouros das seguintes raridades:</p>\n<h3>TABELA DE TESOUROS</h3>\n<table><tbody><tr><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td></tr><tr><td>Humano</td><td>Inferior</td><td>1</td><td>Sagrado</td><td>Inferior</td><td>7</td></tr><tr><td></td><td>Comum</td><td>2</td><td></td><td>Comum</td><td>-</td></tr><tr><td></td><td>Superior</td><td>3</td><td></td><td>Superior</td><td>8</td></tr></tbody></table>\n<table><tbody><tr><td>Terra</td><td>Inferior</td><td>-</td><td>Divino</td><td>Única</td><td>9</td></tr><tr><td></td><td>Comum</td><td>4</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>-</td><td></td><td></td><td></td></tr></tbody></table>\n<table><tbody><tr><td>Céu</td><td>Inferior</td><td>5</td><td>Supremo</td><td>Única</td><td>10</td></tr><tr><td></td><td>Comum</td><td>-</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>6</td><td></td><td></td><td></td></tr></tbody></table>\n<h3>TIPOS DE TESOUROS</h3>\n<p>Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.</p>\n<h3>ARMA</h3>\n<table><tbody><tr><td>RANK</td><td>BASE</td><td>EFEITO ADICIONAL</td></tr><tr><td>Humano</td><td>7 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 1</td></tr><tr><td>Terra</td><td>10 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 2</td></tr><tr><td>Céu</td><td>12 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 3</td></tr><tr><td>Sagrado</td><td>14 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 4</td></tr><tr><td>Divino</td><td>16 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 5</td></tr><tr><td>Supremo</td><td>20 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 6</td></tr></tbody></table>\n<h3>ADICIONANDO EFEITOS</h3>\n<p>Quando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.</p>\n<h3>VALOR DA CRIAÇÃO</h3>\n<p>O valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.</p>",
    "sourceText": "CRIAÇÃO DE TESOUROS\nComo um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.\n\tPara criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro. \n\nExistem tesouros das seguintes raridades:\n\nTABELA DE TESOUROS\nRANKS\tCLASSES\tNÍVEL\tRANKS\tCLASSES\tNÍVEL\nHumano\tInferior\t1\tSagrado\tInferior\t7\n\tComum\t2\t\tComum\t-\n\tSuperior\t3\t\tSuperior\t8\n\nTerra\tInferior\t-\tDivino\tÚnica\t9\n\tComum\t4\t\t\t\n\tSuperior\t-\t\t\t\n\nCéu\tInferior\t5\tSupremo\tÚnica\t10\n\tComum\t-\t\t\t\n\tSuperior\t6\t\t\t\n\nTIPOS DE TESOUROS\nExistem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.\n\nARMA\nRANK\tBASE\tEFEITO ADICIONAL\nHumano\t7 de dano\tSeu limite do Explosão Ofensiva aumenta em 1 \nTerra\t10 de dano\tSeu limite do Explosão Ofensiva aumenta em 2\nCéu\t12 de dano\tSeu limite do Explosão Ofensiva aumenta em 3 \nSagrado\t14 de dano\tSeu limite do Explosão Ofensiva aumenta em 4\nDivino\t16 de dano\tSeu limite do Explosão Ofensiva aumenta em 5 \nSupremo\t20 de dano\tSeu limite do Explosão Ofensiva aumenta em 6\n\nADICIONANDO EFEITOS                                                                                                                                                                                                              \nQuando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.\n\nVALOR DA CRIAÇÃO                                                                                                                                                                                                              \nO valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.",
    "pending": [
      "A criação custa cerca de 5.000% do valor padrão de mercado do nível do equipamento. Confirmar a relação dessa base com Receitas e Materiais antes de cobrar custos."
    ],
    "manual": [
      "Escolher forma, materiais, rank, classe e efeito do tesouro; o ingrediente de rank mais baixo define a habilidade, ou o núcleo de besta fornece uma habilidade natural. Os tipos genéricos não definem arma, armadura ou habilidade específica."
    ],
    "rankRules": [
      {
        "rank": "Humano",
        "baseDamage": 7,
        "offensiveBurstLimitBonus": 1
      },
      {
        "rank": "Terra",
        "baseDamage": 10,
        "offensiveBurstLimitBonus": 2
      },
      {
        "rank": "Céu",
        "baseDamage": 12,
        "offensiveBurstLimitBonus": 3
      },
      {
        "rank": "Sagrado",
        "baseDamage": 14,
        "offensiveBurstLimitBonus": 4
      },
      {
        "rank": "Divino",
        "baseDamage": 16,
        "offensiveBurstLimitBonus": 5
      },
      {
        "rank": "Supremo",
        "baseDamage": 20,
        "offensiveBurstLimitBonus": 6
      }
    ]
  },
  {
    "id": "tesouro-acessorio",
    "name": "Tesouro — Acessório",
    "kind": "treasure",
    "profession": "artisan",
    "treasureType": "acessorio",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 10,
      "max": 10
    },
    "dcRule": "CD 10, aumentando +2 para cada nível do equipamento além do equivalente da Tabela de Tesouros.",
    "creationPercent": 5000,
    "descriptionHTML": "<h3>CRIAÇÃO DE TESOUROS</h3>\n<p>Como um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.</p>\n<p>Para criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro.</p>\n<p>Existem tesouros das seguintes raridades:</p>\n<h3>TABELA DE TESOUROS</h3>\n<table><tbody><tr><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td></tr><tr><td>Humano</td><td>Inferior</td><td>1</td><td>Sagrado</td><td>Inferior</td><td>7</td></tr><tr><td></td><td>Comum</td><td>2</td><td></td><td>Comum</td><td>-</td></tr><tr><td></td><td>Superior</td><td>3</td><td></td><td>Superior</td><td>8</td></tr></tbody></table>\n<table><tbody><tr><td>Terra</td><td>Inferior</td><td>-</td><td>Divino</td><td>Única</td><td>9</td></tr><tr><td></td><td>Comum</td><td>4</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>-</td><td></td><td></td><td></td></tr></tbody></table>\n<table><tbody><tr><td>Céu</td><td>Inferior</td><td>5</td><td>Supremo</td><td>Única</td><td>10</td></tr><tr><td></td><td>Comum</td><td>-</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>6</td><td></td><td></td><td></td></tr></tbody></table>\n<h3>TIPOS DE TESOUROS</h3>\n<p>Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.</p>\n<h3>ACESSÓRIOS</h3>\n<table><tbody><tr><td>RANK</td><td>EFEITO ADICIONAL</td></tr><tr><td>Único</td><td>Possui um efeito de limite de 4 Pontos de Qi, aumentando o limite em 1 PQ por Classe e 2 por Rank, até um máximo de 27 PQ no rank Supremo.</td></tr></tbody></table>\n<h3>ADICIONANDO EFEITOS</h3>\n<p>Quando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.</p>\n<h3>VALOR DA CRIAÇÃO</h3>\n<p>O valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.</p>",
    "sourceText": "CRIAÇÃO DE TESOUROS\nComo um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.\n\tPara criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro. \n\nExistem tesouros das seguintes raridades:\n\nTABELA DE TESOUROS\nRANKS\tCLASSES\tNÍVEL\tRANKS\tCLASSES\tNÍVEL\nHumano\tInferior\t1\tSagrado\tInferior\t7\n\tComum\t2\t\tComum\t-\n\tSuperior\t3\t\tSuperior\t8\n\nTerra\tInferior\t-\tDivino\tÚnica\t9\n\tComum\t4\t\t\t\n\tSuperior\t-\t\t\t\n\nCéu\tInferior\t5\tSupremo\tÚnica\t10\n\tComum\t-\t\t\t\n\tSuperior\t6\t\t\t\n\nTIPOS DE TESOUROS\nExistem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.\n\nACESSÓRIOS\nRANK\tEFEITO ADICIONAL\nÚnico\tPossui um efeito de limite de 4 Pontos de Qi, aumentando o limite em 1 PQ por Classe e 2 por Rank, até um máximo de 27 PQ no rank Supremo.\n\nADICIONANDO EFEITOS                                                                                                                                                                                                              \nQuando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.\n\nVALOR DA CRIAÇÃO                                                                                                                                                                                                              \nO valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.",
    "pending": [
      "A criação custa cerca de 5.000% do valor padrão de mercado do nível do equipamento. Confirmar a relação dessa base com Receitas e Materiais antes de cobrar custos."
    ],
    "manual": [
      "Escolher forma, materiais, rank, classe e efeito do tesouro; o ingrediente de rank mais baixo define a habilidade, ou o núcleo de besta fornece uma habilidade natural. Os tipos genéricos não definem arma, armadura ou habilidade específica."
    ],
    "effectRule": "Limite de 4 Pontos de Qi, +1 PQ por Classe e +2 por Rank, até 27 PQ no rank Supremo."
  },
  {
    "id": "tesouro-voador",
    "name": "Tesouro Voador",
    "kind": "treasure",
    "profession": "artisan",
    "treasureType": "voador",
    "levels": {
      "min": 1,
      "max": 10
    },
    "dc": {
      "min": 10,
      "max": 10
    },
    "dcRule": "CD 10, aumentando +2 para cada nível do equipamento além do equivalente da Tabela de Tesouros.",
    "creationPercent": 5000,
    "descriptionHTML": "<h3>CRIAÇÃO DE TESOUROS</h3>\n<p>Como um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.</p>\n<p>Para criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro.</p>\n<p>Existem tesouros das seguintes raridades:</p>\n<h3>TABELA DE TESOUROS</h3>\n<table><tbody><tr><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td></tr><tr><td>Humano</td><td>Inferior</td><td>1</td><td>Sagrado</td><td>Inferior</td><td>7</td></tr><tr><td></td><td>Comum</td><td>2</td><td></td><td>Comum</td><td>-</td></tr><tr><td></td><td>Superior</td><td>3</td><td></td><td>Superior</td><td>8</td></tr></tbody></table>\n<table><tbody><tr><td>Terra</td><td>Inferior</td><td>-</td><td>Divino</td><td>Única</td><td>9</td></tr><tr><td></td><td>Comum</td><td>4</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>-</td><td></td><td></td><td></td></tr></tbody></table>\n<table><tbody><tr><td>Céu</td><td>Inferior</td><td>5</td><td>Supremo</td><td>Única</td><td>10</td></tr><tr><td></td><td>Comum</td><td>-</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>6</td><td></td><td></td><td></td></tr></tbody></table>\n<h3>TIPOS DE TESOUROS</h3>\n<p>Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.</p>\n<h3>TESOURO VOADOR</h3>\n<table><tbody><tr><td>RANK</td><td>EFEITO ADICIONAL</td></tr><tr><td>Único</td><td>Possui 18 de CR Base e 21 de deslocamento, recebendo +2 de CR por Rank e +3 de deslocamento por classe.</td></tr></tbody></table>\n<h3>ADICIONANDO EFEITOS</h3>\n<p>Quando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.</p>\n<h3>VALOR DA CRIAÇÃO</h3>\n<p>O valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.</p>",
    "sourceText": "CRIAÇÃO DE TESOUROS\nComo um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.\n\tPara criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro. \n\nExistem tesouros das seguintes raridades:\n\nTABELA DE TESOUROS\nRANKS\tCLASSES\tNÍVEL\tRANKS\tCLASSES\tNÍVEL\nHumano\tInferior\t1\tSagrado\tInferior\t7\n\tComum\t2\t\tComum\t-\n\tSuperior\t3\t\tSuperior\t8\n\nTerra\tInferior\t-\tDivino\tÚnica\t9\n\tComum\t4\t\t\t\n\tSuperior\t-\t\t\t\n\nCéu\tInferior\t5\tSupremo\tÚnica\t10\n\tComum\t-\t\t\t\n\tSuperior\t6\t\t\t\n\nTIPOS DE TESOUROS\nExistem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.\n\nTESOURO VOADOR\nRANK\tEFEITO ADICIONAL\nÚnico\tPossui 18 de CR Base e 21 de deslocamento, recebendo +2 de CR por Rank e +3 de deslocamento por classe.\n\nADICIONANDO EFEITOS                                                                                                                                                                                                              \nQuando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.\n\nVALOR DA CRIAÇÃO                                                                                                                                                                                                              \nO valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.",
    "pending": [
      "A criação custa cerca de 5.000% do valor padrão de mercado do nível do equipamento. Confirmar a relação dessa base com Receitas e Materiais antes de cobrar custos."
    ],
    "manual": [
      "Escolher forma, materiais, rank, classe e efeito do tesouro; o ingrediente de rank mais baixo define a habilidade, ou o núcleo de besta fornece uma habilidade natural. Os tipos genéricos não definem arma, armadura ou habilidade específica."
    ],
    "effectRule": "18 de CR Base e 21 de deslocamento, +2 de CR por Rank e +3 de deslocamento por classe."
  }
].map(updateRefinedTreasure).map(product => ({...product, ...(product.kind === "pill" ? {qualityCriterion: "creation", manual: [...product.manual, "A qualidade da pílula é determinada somente pela margem do teste de Criação; os testes exigidos ainda precisam passar."]} : {}), ...(Number.isFinite(product.creationPercent) ? {priceBasis: "materials"} : {})})));

const AUTHOR_RULES_HTML = "<p><strong>Percentuais de criação:</strong> aplicam-se somente ao custo dos materiais do nível do produto. O preço de compra da receita é separado.</p><p><strong>Qualidade de pílulas:</strong> usa somente a margem de sucesso do teste de Criação. Os demais testes exigidos ainda precisam ser aprovados.</p>";
const COMMON_RULES_HTML = "<p>As profissões estão intimamente ligadas umas nas outras, sendo algumas necessárias para que outras funcionem. E todas elas são importantes para os cultivadores ao redor do mundo. Para ter uma profissão, você deve ter apenas vontade e uma quantidade substancial de dinheiro para comprar todos os materiais e focar em seus estudos.</p>\n<h3>NÍVEIS</h3>\n<p>Todas as profissões são divididas por níveis que vão de 1 a 10. Onde cada nível é mais difícil de alcançar que o anterior.</p>\n<p>A forma de subir de nível nas profissões é sempre o mesmo, independentemente de ser dominando uma besta ou criando uma nova receita de pílula, a dificuldade é a mesma para alcançar um novo nível. A partir do momento que você cria uma receita naquele nível, você é considerado como um profissional daquele nível. Entretanto, você deve recriar sua façanha na frente de um instrutor da guilda ou mostrar uma prova suficiente de que você conseguiu evoluir para ser aceito publicamente como alguém daquele nível.</p>\n<p>Diferente dos métodos de cultivo, os níveis acompanham uma lógica simples, onde cada nível é referente a um método de cultivo, onde o 1º nível é referente a Condensação de Qi e o 10º nível é referente a Divino.</p>\n<h3>SE TORNANDO UM PROFISSIONAL</h3>\n<p>Ser um profissional é um trabalho árduo e não obrigatório, fazendo com que nem todos busquem esse caminho, já que você deve dividir seu tempo entre cultivo e o estudo da sua profissão. Para entrar pela primeira vez em uma profissão, você deve cumprir os 4 requisitos:</p>\n<table><tbody><tr><td></td><td>Ter um mestre, professor ou um legado de alguém;</td></tr><tr><td></td><td>Ter um talento de estudante daquela profissão;</td></tr><tr><td></td><td>Conseguir os materiais para exercer sua profissão;</td></tr><tr><td></td><td>Concluir com sucesso uma criação da sua profissão;</td></tr></tbody></table>\n<p>Os objetivos das profissões podem mudar, sendo eles: Criar uma pílula para alquimistas, refinar um equipamento, arma ou acessório para um Mestre Artesão ou inscrever um talismã para um Mestre Espiritual. Mas a forma é basicamente a mesma.</p>\n<p>Ao tentar se tornar um profissional, você deve gastar 5 Pontos de Cultivo e realizar um Teste de Controle de Qi (CON) CD 20. Em caso de sucesso, você faz sua primeira criação e consegue oficialmente sua profissão.</p>\n<h3>EVOLUINDO UMA PROFISSÃO</h3>\n<p>Evoluir uma profissão não é muito mais difícil do que ingressar em uma. Tirando a exigência dos três primeiros requisitos, é necessário apenas obter sucesso em uma criação do próximo nível. Todas as criações — sejam de talismãs, pílulas ou adestramento de bestas — possuem uma CD mínima para serem realizadas.</p>\n<p>Caso queira evoluir para o próximo nível, você deve concluir com sucesso uma criação desse nível, aumentando a CD específica em +5, por se tratar da sua primeira vez criando algo naquele nível. Além disso, a cada tentativa, você consome uma quantidade de Pontos de Cultivo igual a 5 vezes o nível da profissão que está tentando alcançar. Isso significa consumir 10 pontos para tentar atingir o 2º nível, 15 pontos para tentar atingir o 3º nível, e assim sucessivamente.</p>\n<h3>8.2 GUILDAS PROFISSIONAIS</h3>\n<p>Todas as profissões possuem uma guilda específica que possuem sedes espalhadas pelo mundo. Algumas dessas sedes são de alto nível, enquanto outras tem apenas profissionais de baixo nível como seus anciões, mas todas dão benefícios para seus membros e auxiliam a profissão de certa forma.</p>\n<h3>CERTIFICAÇÃO E ENTRANDO EM UMA GUILDA</h3>\n<p>Caso você queira ser reconhecido como um profissional qualificado, é necessário realizar um exame de admissão em uma guilda profissional. Para isso, você pode se inscrever em uma sede e comparecer para realizar o exame, que envolve utilizar o seu ofício para apresentar uma criação passável, feita no momento, se isso for possível.</p>\n<p>Após cumprir esse requisito, você recebe sua certificação e um convite para ingressar na guilda. Caso opte por fazer parte dela, você poderá obter diversos benefícios adicionais, como descontos em materiais e auxílio na busca por ingredientes. Caso escolha não ingressar — seja por já fazer parte de uma família de profissionais ou por pertencer a uma facção que não permita filiação a outros grupos, mesmo que neutros como a guilda — você ainda será reconhecido como um profissional. No entanto, poderá utilizar a guilda apenas para comprar receitas e materiais a preço de mercado, ou a valores severamente inflacionados caso a demanda esteja muito alta.</p>\n<h3>MISSÕES E CONTRIBUIÇÕES</h3>\n<p>Todas as guildas podem emitir missões para que seus profissionais cumpram e recompensa-los com Pontos de Contribuições que podem ser utilizados para comprar materiais ou equipamentos para melhorar no seu ofício. Essas missões sempre são relacionadas a profissão em si, onde elas colocam o nível de profissional necessário para tentar cumpri-las.</p>\n<h3>EMITINDO UMA MISSÃO</h3>\n<p>Caso você seja um membro de uma guilda, você pode utilizar as conexões dela para emitir missões para encontrar materiais, informações ou similares sobre algo que você procura relacionado a profissão ou não, utilizando seus serviços ou apenas dinheiro como pagamento.</p>\n<p>Caso o pagamento seja em dinheiro, você deve pagar antecipadamente, onde 98% do valor será estornado caso sua missão não seja concluída dentro do período de no mínimo 15 dias e sem limite máximo (você escolhe um tempo limite, desde que o mínimo não seja menor que 15 dias).</p>\n<h3>COMPRANDO RECEITAS E MATERIAIS</h3>\n<p>As receitas são algo extremamente importantes para os profissionais, pois elas permitem que ele siga um padrão para poder criar algo com mais facilidade. Enquanto os valores podem mudar dependendo da região e principalmente ao atingir os níveis mais altos, a tabela “Receitas e Materiais” abaixo ajuda você a entender o preço base para cada nível. Podendo utiliza-la para definir o seu próprio com maior exatidão.</p>\n<h3>RECEITAS E MATERIAIS</h3>\n<table><tbody><tr><td>TIPO</td><td>NÍVEL</td><td>PREÇO</td><td>TIPO</td><td>NÍVEL</td><td>PREÇO</td></tr><tr><td>Receita</td><td>1</td><td>3.000 PO</td><td>Materiais</td><td>1</td><td>500 PO</td></tr><tr><td>Receita</td><td>2</td><td>15.000 PO</td><td>Materiais</td><td>2</td><td>1.500 PO</td></tr><tr><td>Receita</td><td>3</td><td>100.000 PO</td><td>Materiais</td><td>3</td><td>10.000 PO</td></tr><tr><td>Receita</td><td>4</td><td>5.000 Cristais - Humano</td><td>Materiais</td><td>4</td><td>100 Cristais - Humano</td></tr><tr><td>Receita</td><td>5</td><td>5.000 Cristais - Terra</td><td>Materiais</td><td>5</td><td>100 Cristais - Terra</td></tr><tr><td>Receita</td><td>6</td><td>5.000 Cristais - Céu</td><td>Materiais</td><td>6</td><td>100 Cristais - Céu</td></tr></tbody></table>\n<p>Enquanto as receitas e materiais até o 6º nível são caros, eles ainda podem ser comprados por dinheiro. Materiais de níveis mais elevados só podem ser adquiridos a partir através do acaso ou com um valor de recursos bem discrepante. Enquanto um minério pode ser achado por 100 Cristais – Sagrados em um dia, ele pode custar 2.000 Cristais – Sagrados em um outro momento dependendo da demanda.</p>\n<h3>REGRAS DE CRIAÇÃO</h3>\n<p>Quando você estiver criando um tesouro, pílulas ou matrizes. A criatura acaba se tornando mais fácil dependendo do seu nível em relação ao que estiver criando (ou dominando no caso de bestas). Ao tentar criar algo, você reduz a CD em -2 para cada nível que você tiver acima do que você está tentando criar.</p>\n<p>Por exemplo: Se você for uma Alquimista de 6º nível e tentar criar uma pílula de 4º nível com CD 16. A Classe de Dificuldade dela se torna 12.</p>\n<h3>8.3 FERRAMENTAS DE CADA PROFISSÃO</h3>\n<p>Para exercer uma profissão, você precisa adquirir certas ferramentas, assim como recebe talentos ao se tornar um profissional com sucesso.</p>\n<h3>ALQUIMISTA</h3>\n<table><tbody><tr><td></td><td>Talentos: Botânico</td></tr><tr><td></td><td>Requisito: Conceito do Fogo – Nível 1</td></tr><tr><td></td><td>Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.</td></tr></tbody></table>\n<h3>MESTRE ARTESÃO</h3>\n<table><tbody><tr><td></td><td>Talentos: Ferreiro</td></tr><tr><td></td><td>Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.</td></tr></tbody></table>\n<h3>MESTRE DE BESTAS</h3>\n<table><tbody><tr><td></td><td>Talentos: Rastreador</td></tr><tr><td></td><td>Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.</td></tr></tbody></table>\n<h3>MESTRE DE INSCRIÇÕES</h3>\n<table><tbody><tr><td></td><td>Talentos: Mente e Corpo</td></tr><tr><td></td><td>Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.</td></tr></tbody></table>\n<h3>MESTRE DE MATRIZES</h3>\n<table><tbody><tr><td></td><td>Talentos: Destreza nas Mãos</td></tr><tr><td></td><td>Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.</td></tr></tbody></table>";
const COMMON_SOURCE_TEXT = "As profissões estão intimamente ligadas umas nas outras, sendo algumas necessárias para que outras funcionem. E todas elas são importantes para os cultivadores ao redor do mundo. Para ter uma profissão, você deve ter apenas vontade e uma quantidade substancial de dinheiro para comprar todos os materiais e focar em seus estudos.\n\nNÍVEIS\nTodas as profissões são divididas por níveis que vão de 1 a 10. Onde cada nível é mais difícil de alcançar que o anterior.\n\tA forma de subir de nível nas profissões é sempre o mesmo, independentemente de ser dominando uma besta ou criando uma nova receita de pílula, a dificuldade é a mesma para alcançar um novo nível. A partir do momento que você cria uma receita naquele nível, você é considerado como um profissional daquele nível. Entretanto, você deve recriar sua façanha na frente de um instrutor da guilda ou mostrar uma prova suficiente de que você conseguiu evoluir para ser aceito publicamente como alguém daquele nível.\n\tDiferente dos métodos de cultivo, os níveis acompanham uma lógica simples, onde cada nível é referente a um método de cultivo, onde o 1º nível é referente a Condensação de Qi e o 10º nível é referente a Divino.\n\nSE TORNANDO UM PROFISSIONAL\nSer um profissional é um trabalho árduo e não obrigatório, fazendo com que nem todos busquem esse caminho, já que você deve dividir seu tempo entre cultivo e o estudo da sua profissão. Para entrar pela primeira vez em uma profissão, você deve cumprir os 4 requisitos:\n \tTer um mestre, professor ou um legado de alguém;\n \tTer um talento de estudante daquela profissão;\n \tConseguir os materiais para exercer sua profissão;\n \tConcluir com sucesso uma criação da sua profissão;\n\nOs objetivos das profissões podem mudar, sendo eles: Criar uma pílula para alquimistas, refinar um equipamento, arma ou acessório para um Mestre Artesão ou inscrever um talismã para um Mestre Espiritual. Mas a forma é basicamente a mesma.\n\tAo tentar se tornar um profissional, você deve gastar 5 Pontos de Cultivo e realizar um Teste de Controle de Qi (CON) CD 20. Em caso de sucesso, você faz sua primeira criação e consegue oficialmente sua profissão.\n\nEVOLUINDO UMA PROFISSÃO\nEvoluir uma profissão não é muito mais difícil do que ingressar em uma. Tirando a exigência dos três primeiros requisitos, é necessário apenas obter sucesso em uma criação do próximo nível. Todas as criações — sejam de talismãs, pílulas ou adestramento de bestas — possuem uma CD mínima para serem realizadas.\n\tCaso queira evoluir para o próximo nível, você deve concluir com sucesso uma criação desse nível, aumentando a CD específica em +5, por se tratar da sua primeira vez criando algo naquele nível. Além disso, a cada tentativa, você consome uma quantidade de Pontos de Cultivo igual a 5 vezes o nível da profissão que está tentando alcançar. Isso significa consumir 10 pontos para tentar atingir o 2º nível, 15 pontos para tentar atingir o 3º nível, e assim sucessivamente.\n\n8.2 GUILDAS PROFISSIONAIS\nTodas as profissões possuem uma guilda específica que possuem sedes espalhadas pelo mundo. Algumas dessas sedes são de alto nível, enquanto outras tem apenas profissionais de baixo nível como seus anciões, mas todas dão benefícios para seus membros e auxiliam a profissão de certa forma.\n\nCERTIFICAÇÃO E ENTRANDO EM UMA GUILDA\nCaso você queira ser reconhecido como um profissional qualificado, é necessário realizar um exame de admissão em uma guilda profissional. Para isso, você pode se inscrever em uma sede e comparecer para realizar o exame, que envolve utilizar o seu ofício para apresentar uma criação passável, feita no momento, se isso for possível.\n\tApós cumprir esse requisito, você recebe sua certificação e um convite para ingressar na guilda. Caso opte por fazer parte dela, você poderá obter diversos benefícios adicionais, como descontos em materiais e auxílio na busca por ingredientes. Caso escolha não ingressar — seja por já fazer parte de uma família de profissionais ou por pertencer a uma facção que não permita filiação a outros grupos, mesmo que neutros como a guilda — você ainda será reconhecido como um profissional. No entanto, poderá utilizar a guilda apenas para comprar receitas e materiais a preço de mercado, ou a valores severamente inflacionados caso a demanda esteja muito alta.\n\nMISSÕES E CONTRIBUIÇÕES\nTodas as guildas podem emitir missões para que seus profissionais cumpram e recompensa-los com Pontos de Contribuições que podem ser utilizados para comprar materiais ou equipamentos para melhorar no seu ofício. Essas missões sempre são relacionadas a profissão em si, onde elas colocam o nível de profissional necessário para tentar cumpri-las.\n\nEMITINDO UMA MISSÃO\nCaso você seja um membro de uma guilda, você pode utilizar as conexões dela para emitir missões para encontrar materiais, informações ou similares sobre algo que você procura relacionado a profissão ou não, utilizando seus serviços ou apenas dinheiro como pagamento.\nCaso o pagamento seja em dinheiro, você deve pagar antecipadamente, onde 98% do valor será estornado caso sua missão não seja concluída dentro do período de no mínimo 15 dias e sem limite máximo (você escolhe um tempo limite, desde que o mínimo não seja menor que 15 dias).\n\nCOMPRANDO RECEITAS E MATERIAIS\nAs receitas são algo extremamente importantes para os profissionais, pois elas permitem que ele siga um padrão para poder criar algo com mais facilidade. Enquanto os valores podem mudar dependendo da região e principalmente ao atingir os níveis mais altos, a tabela “Receitas e Materiais” abaixo ajuda você a entender o preço base para cada nível. Podendo utiliza-la para definir o seu próprio com maior exatidão.\n\nRECEITAS E MATERIAIS\nTIPO\tNÍVEL\tPREÇO\tTIPO\tNÍVEL\tPREÇO\nReceita\t1\t3.000 PO\tMateriais\t1\t500 PO\nReceita\t2\t15.000 PO\tMateriais\t2\t1.500 PO\nReceita\t3\t100.000 PO\tMateriais\t3\t10.000 PO\nReceita\t4\t5.000 Cristais - Humano\tMateriais\t4\t100 Cristais - Humano\nReceita\t5\t5.000 Cristais - Terra\tMateriais\t5\t100 Cristais - Terra\nReceita\t6\t5.000 Cristais - Céu\tMateriais\t6\t100 Cristais - Céu\n\nEnquanto as receitas e materiais até o 6º nível são caros, eles ainda podem ser comprados por dinheiro. Materiais de níveis mais elevados só podem ser adquiridos a partir através do acaso ou com um valor de recursos bem discrepante. Enquanto um minério pode ser achado por 100 Cristais – Sagrados em um dia, ele pode custar 2.000 Cristais – Sagrados em um outro momento dependendo da demanda.\n\nREGRAS DE CRIAÇÃO\nQuando você estiver criando um tesouro, pílulas ou matrizes. A criatura acaba se tornando mais fácil dependendo do seu nível em relação ao que estiver criando (ou dominando no caso de bestas). Ao tentar criar algo, você reduz a CD em -2 para cada nível que você tiver acima do que você está tentando criar. \n\tPor exemplo: Se você for uma Alquimista de 6º nível e tentar criar uma pílula de 4º nível com CD 16. A Classe de Dificuldade dela se torna 12.\n\n8.3 FERRAMENTAS DE CADA PROFISSÃO\nPara exercer uma profissão, você precisa adquirir certas ferramentas, assim como recebe talentos ao se tornar um profissional com sucesso.\n\nALQUIMISTA                                                                                                                                                                                                              \n \tTalentos: Botânico\n \tRequisito: Conceito do Fogo – Nível 1\n \tFerramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.\n\nMESTRE ARTESÃO                                                                                                                                                                                                                          \n \tTalentos: Ferreiro\n \tFerramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.\n\nMESTRE DE BESTAS                                                                                                                                                                                                                    \n \tTalentos: Rastreador\n \tFerramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.\n\nMESTRE DE INSCRIÇÕES                                                                                                                                                                                                                      \n \tTalentos: Mente e Corpo\n \tFerramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.\n\nMESTRE DE MATRIZES                                                                                                                                                                                                                      \n \tTalentos: Destreza nas Mãos\n \tFerramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.";

const GUIDE_DATA = {
  "alchemy": {
    "profession": "alchemy",
    "title": "Alquimista",
    "requiredTalent": "Botânico",
    "extraRequirements": [
      "Conceito do Fogo — Nível 1"
    ],
    "summary": "Uma das profissões mais importantes para cultivadores, sendo aqueles que criam pílulas para ajudar no cultivo e a sobreviver batalhas, ou até mesmo se curar.",
    "specificRulesHTML": "<h3>ALQUIMISTA</h3>\n<p>Uma das profissões mais importantes para cultivadores, sendo aqueles que criam pílulas para ajudar no cultivo e a sobreviver batalhas, ou até mesmo se curar.</p>\n<h3>CRIAÇÃO ALQUÍMICA</h3>\n<p>Como um alquimista, seu trabalho é criar pílulas para serem utilizadas por cultivadores, seja os que vivem por conta própria ou membros de Seitas. Quando você quiser criar uma pílula, você deve gastar pelo menos 1 hora para cada nível da pílula que você está tentando criar, multiplicando esse tempo por 10 caso você nunca tenha feito a pílula em questão anteriormente.</p>\n<p>Para criar uma pílula com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD. Ao passar com sucesso, você consegue criar a pílula, podendo sair em 4 qualidades distintas:</p>\n<h3>QUALIDADE DA PÍLULA</h3>\n<table><tbody><tr><td>QUALIDADE</td><td>CRITÉRIO</td><td>TOXINAS DE PÍLULA</td></tr><tr><td>Inferior</td><td>Você passou no teste de criação.</td><td>20 Pontos de Toxina</td></tr><tr><td>Comum</td><td>Você passou no teste com 3 ou mais acima da CD.</td><td>8 Pontos de Toxina</td></tr><tr><td>Superior</td><td>Você passou no teste com 8 ou mais acima da CD.</td><td>4 Pontos de Toxina</td></tr><tr><td>Perfeita</td><td>Você passou no teste com 12 ou mais acima da CD.</td><td>2 Pontos de Toxina</td></tr></tbody></table>\n<p>A qualidade é importante para definir o grau de toxina que uma pílula irá possuir. Uma pílula de baixa qualidade possui um grande número de toxinas e irá afetar negativamente um cultivador que consumir uma grande quantidade dela.</p>\n<p>Cada cultivador pode acumular até 100 Pontos de Toxina em seu corpo, onde cada ponto se traduz em 1% de toxicidade no sangue, Qi, Dantian e meridianos. Enquanto um cultivador possuir Pontos de Toxina no corpo, ele recebe +1 na CD e Pontos de Cultivo para avançar para o próximo Rank para cada 10 Pontos de Toxina, assim como gasta 1 PC a mais para avançar cada nível para cada 5 Pontos de Toxina.</p>\n<p>Se uma criatura ultrapassar 100 Pontos de Toxina, ela não consegue cultivar, precisando gastar todo seu tempo removendo as toxinas até que elas cheguem a 0.</p>\n<h3>REMOVENDO TOXINAS DE PÍLULA</h3>\n<p>Após acumular toxinas em seu corpo, um cultivador precisa tentar eliminar elas de seu corpo pouco a pouco através do cultivo. Quanto mais toxinas de pílula seu corpo conter, mais difícil é remover cada Ponto de Toxina, de acordo com a informação abaixo:</p>\n<table><tbody><tr><td></td><td>20 Pontos ou menos: Você demora cerca de 5 dias de cultivo para remover 1 Ponto de Toxina de Pílula.</td></tr><tr><td></td><td>50 Pontos ou menos: Você demora cerca de 10 dias de cultivo para remover 1 Ponto de Toxina de Pílula.</td></tr><tr><td></td><td>90 Pontos ou menos: Você demora cerca de 1 mês de cultivo para remover 1 Ponto de Toxina de Pílula.</td></tr></tbody></table>\n<p>Após superar certo nível de toxicidade no corpo, você deve gastar o número de dias descritos para cada ponto mesmo que você caia abaixo do número</p>\n<h3>RECEITAS GERAIS</h3>\n<p>Existem diversas receitas de pílulas no mundo, algumas são receitas originais enquanto outras são extremamente raras. Quando você se torna um alquimista, ou até antes disso, você pode gastar 500 pedras espirituais para comprar um livro de receitas gerais, que te dá acesso a algumas receitas básicas que vão de nível 1 a 10.</p>",
    "specificSourceText": "ALQUIMISTA\n\nUma das profissões mais importantes para cultivadores, sendo aqueles que criam pílulas para ajudar no cultivo e a sobreviver batalhas, ou até mesmo se curar. \n\nCRIAÇÃO ALQUÍMICA\nComo um alquimista, seu trabalho é criar pílulas para serem utilizadas por cultivadores, seja os que vivem por conta própria ou membros de Seitas. Quando você quiser criar uma pílula, você deve gastar pelo menos 1 hora para cada nível da pílula que você está tentando criar, multiplicando esse tempo por 10 caso você nunca tenha feito a pílula em questão anteriormente.\n\tPara criar uma pílula com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD. Ao passar com sucesso, você consegue criar a pílula, podendo sair em 4 qualidades distintas:\n\nQUALIDADE DA PÍLULA\nQUALIDADE\tCRITÉRIO\tTOXINAS DE PÍLULA\nInferior\tVocê passou no teste de criação.\t20 Pontos de Toxina\nComum\tVocê passou no teste com 3 ou mais acima da CD.\t8 Pontos de Toxina\nSuperior\tVocê passou no teste com 8 ou mais acima da CD.\t4 Pontos de Toxina\nPerfeita\tVocê passou no teste com 12 ou mais acima da CD.\t2 Pontos de Toxina\n\nA qualidade é importante para definir o grau de toxina que uma pílula irá possuir. Uma pílula de baixa qualidade possui um grande número de toxinas e irá afetar negativamente um cultivador que consumir uma grande quantidade dela. \n\tCada cultivador pode acumular até 100 Pontos de Toxina em seu corpo, onde cada ponto se traduz em 1% de toxicidade no sangue, Qi, Dantian e meridianos. Enquanto um cultivador possuir Pontos de Toxina no corpo, ele recebe +1 na CD e Pontos de Cultivo para avançar para o próximo Rank para cada 10 Pontos de Toxina, assim como gasta 1 PC a mais para avançar cada nível para cada 5 Pontos de Toxina.\n\tSe uma criatura ultrapassar 100 Pontos de Toxina, ela não consegue cultivar, precisando gastar todo seu tempo removendo as toxinas até que elas cheguem a 0.\n\nREMOVENDO TOXINAS DE PÍLULA\nApós acumular toxinas em seu corpo, um cultivador precisa tentar eliminar elas de seu corpo pouco a pouco através do cultivo. Quanto mais toxinas de pílula seu corpo conter, mais difícil é remover cada Ponto de Toxina, de acordo com a informação abaixo:\n \t20 Pontos ou menos: Você demora cerca de 5 dias de cultivo para remover 1 Ponto de Toxina de Pílula.\n \t50 Pontos ou menos: Você demora cerca de 10 dias de cultivo para remover 1 Ponto de Toxina de Pílula.\n \t90 Pontos ou menos: Você demora cerca de 1 mês de cultivo para remover 1 Ponto de Toxina de Pílula.\n\nApós superar certo nível de toxicidade no corpo, você deve gastar o número de dias descritos para cada ponto mesmo que você caia abaixo do número\n\nRECEITAS GERAIS\nExistem diversas receitas de pílulas no mundo, algumas são receitas originais enquanto outras são extremamente raras. Quando você se torna um alquimista, ou até antes disso, você pode gastar 500 pedras espirituais para comprar um livro de receitas gerais, que te dá acesso a algumas receitas básicas que vão de nível 1 a 10.",
    "tools": [
      "livro-de-tecnicas-de-controle-do-fogo",
      "forno-de-alquimia",
      "conjunto-de-reagentes",
      "enciclopedia-de-ervas",
      "livro-de-receitas-gerais-de-alquimia"
    ],
    "startingTools": [
      {
        "id": "livro-de-tecnicas-de-controle-do-fogo",
        "quantity": 1
      },
      {
        "id": "forno-de-alquimia",
        "quantity": 1
      },
      {
        "id": "conjunto-de-reagentes",
        "quantity": 1
      },
      {
        "id": "enciclopedia-de-ervas",
        "quantity": 1
      }
    ],
    "toolRequirements": "Ferramentas de Alquimista: 1 Livro de Técnicas de Controle do Fogo, 1 Forno de Alquimia, 1 Conjunto de Reagentes, 1 Enciclopédia de Ervas.",
    "requirements": [
      "Ter um mestre, professor ou legado.",
      "Ter o talento de estudante da profissão.",
      "Conseguir os materiais para exercer a profissão.",
      "Concluir com sucesso uma criação da profissão."
    ],
    "creationChecks": [
      {
        "skill": "slt",
        "ability": "dex",
        "label": "Prestidigitação (AGI)"
      },
      {
        "skill": "ani",
        "ability": "wis",
        "label": "Criação (SAB)"
      },
      {
        "skill": "arc",
        "ability": "con",
        "label": "Controle de Qi (CON)"
      }
    ],
    "entryCheck": {
      "skill": "arc",
      "ability": "con",
      "label": "Controle de Qi (CON)",
      "dc": 20,
      "cultivationCost": 5
    },
    "progression": {
      "firstLevel": 1,
      "maxLevel": 10,
      "cultivationCostPerTargetLevel": 5,
      "firstCreationDCBonus": 5,
      "dcReductionPerHigherProfessionLevel": 2
    },
    "pending": [
      "A remoção de toxinas só lista faixas até 20, 50 e 90 Pontos; confirmar o tempo para 91 Pontos ou mais. A frase final sobre cruzar faixas está incompleta na fonte."
    ],
    "manual": [
      "Confirmar mestre ou legado, talento, ferramentas e materiais externamente; o sistema não concede talentos por conta própria.",
      "Recriar a façanha diante de um instrutor da guilda ou apresentar prova suficiente para obter reconhecimento público."
    ],
    "craftingTime": {
      "hoursPerLevel": 1,
      "firstRecipeMultiplier": 10
    },
    "qualities": [
      {
        "key": "inferior",
        "label": "Inferior",
        "margin": 0,
        "toxins": 20
      },
      {
        "key": "common",
        "label": "Comum",
        "margin": 3,
        "toxins": 8
      },
      {
        "key": "superior",
        "label": "Superior",
        "margin": 8,
        "toxins": 4
      },
      {
        "key": "perfect",
        "label": "Perfeita",
        "margin": 12,
        "toxins": 2
      }
    ],
    "toxinRules": {
      "threshold": 100,
      "rankAdvanceDifficultyPerTen": 1,
      "rankAdvanceCultivationPerTen": 1,
      "levelAdvanceCultivationPerFive": 1,
      "removal": [
        {
          "maximum": 20,
          "daysPerPoint": 5
        },
        {
          "maximum": 50,
          "daysPerPoint": 10
        },
        {
          "maximum": 90,
          "durationPerPoint": "1 mês de cultivo"
        }
      ]
    }
  },
  "matrices": {
    "profession": "matrices",
    "title": "Mestre de Matrizes",
    "requiredTalent": "Destreza nas Mãos",
    "extraRequirements": [],
    "summary": "Enquanto alquimistas são importantes para cultivadores no geral. Os mestres de matrizes são de extrema importância para seitas ou para criar medidas defensivas / ofensivas.",
    "specificRulesHTML": "<h3>MESTRE DE MATRIZES</h3>\n<p>Enquanto alquimistas são importantes para cultivadores no geral. Os mestres de matrizes são de extrema importância para seitas ou para criar medidas defensivas / ofensivas.</p>\n<h3>OLHO DE MESTRE</h3>\n<p>Como um mestre de matrizes, você sabe reconhecer outras matrizes e seus pontos fortes e fracos, mesmo que você não seja inteiramente capaz de replica-la. Quando você se der de cara com uma matriz, você pode realizar um Teste de Intuição (SAB) CD 15. Em caso de sucesso, você descobre como quebra-la ou tomar controle dela, caso seja possível.</p>\n<p>A CD do teste aumenta em +2 para cada nível que a matriz tiver acima do seu, ou -2 para cada nível abaixo. Se você falhar em analisar uma matriz, você deve esperar 12 horas para tentar na mesma novamente.</p>\n<h3>CRIAÇÃO DE MATRIZ</h3>\n<p>Como um mestre de matriz, você é capaz de criar diversos tipos de matrizes desde que saiba como cria-las, seja por descobrimento próprio ou através de esquemas adquiridos ou comprados. Para cada matriz que quiser criar, você demora 1 hora para cada nível que ela possuir, aumentando a duração em 10 vezes caso nunca a tenha criado antes.</p>\n<p>Para criar uma matriz com sucesso, você deve realizar 2 testes de atributo distintos, sendo eles um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD. Ao passar com sucesso, você consegue criar a matriz.</p>\n<h3>ESQUEMAS GERAIS</h3>\n<p>Existem diversos esquemas de matrizes no mundo, alguns são esquemas originais enquanto outros são extremamente raros. Quando você se torna um mestre de matrizes, ou até antes disso, você pode gastar 10.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.</p>",
    "specificSourceText": "MESTRE DE MATRIZES\n\nEnquanto alquimistas são importantes para cultivadores no geral. Os mestres de matrizes são de extrema importância para seitas ou para criar medidas defensivas / ofensivas.\n\nOLHO DE MESTRE\nComo um mestre de matrizes, você sabe reconhecer outras matrizes e seus pontos fortes e fracos, mesmo que você não seja inteiramente capaz de replica-la. Quando você se der de cara com uma matriz, você pode realizar um Teste de Intuição (SAB) CD 15. Em caso de sucesso, você descobre como quebra-la ou tomar controle dela, caso seja possível.\n\tA CD do teste aumenta em +2 para cada nível que a matriz tiver acima do seu, ou -2 para cada nível abaixo. Se você falhar em analisar uma matriz, você deve esperar 12 horas para tentar na mesma novamente.\n\nCRIAÇÃO DE MATRIZ\nComo um mestre de matriz, você é capaz de criar diversos tipos de matrizes desde que saiba como cria-las, seja por descobrimento próprio ou através de esquemas adquiridos ou comprados. Para cada matriz que quiser criar, você demora 1 hora para cada nível que ela possuir, aumentando a duração em 10 vezes caso nunca a tenha criado antes.\n\tPara criar uma matriz com sucesso, você deve realizar 2 testes de atributo distintos, sendo eles um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD. Ao passar com sucesso, você consegue criar a matriz.\n\nESQUEMAS GERAIS\nExistem diversos esquemas de matrizes no mundo, alguns são esquemas originais enquanto outros são extremamente raros. Quando você se torna um mestre de matrizes, ou até antes disso, você pode gastar 10.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.",
    "tools": [
      "nucleo-de-matriz-simples",
      "disco-de-matriz",
      "entalhador",
      "livro-sobre-runas-e-padroes",
      "livro-de-esquemas-gerais-de-matrizes"
    ],
    "startingTools": [
      {
        "id": "nucleo-de-matriz-simples",
        "quantity": 2
      },
      {
        "id": "disco-de-matriz",
        "quantity": 1
      },
      {
        "id": "entalhador",
        "quantity": 1
      },
      {
        "id": "livro-sobre-runas-e-padroes",
        "quantity": 1
      }
    ],
    "toolRequirements": "Ferramentas de Mestre de Matrizes: 2 Núcleos de Matrizes simples, 1 Disco de Matriz de 500 PO, 1 Entalhador, 1 Livro sobre Runas e Padrões.",
    "requirements": [
      "Ter um mestre, professor ou legado.",
      "Ter o talento de estudante da profissão.",
      "Conseguir os materiais para exercer a profissão.",
      "Concluir com sucesso uma criação da profissão."
    ],
    "creationChecks": [
      {
        "skill": "ani",
        "ability": "wis",
        "label": "Criação (SAB)"
      },
      {
        "skill": "arc",
        "ability": "con",
        "label": "Controle de Qi (CON)"
      }
    ],
    "entryCheck": {
      "skill": "arc",
      "ability": "con",
      "label": "Controle de Qi (CON)",
      "dc": 20,
      "cultivationCost": 5
    },
    "progression": {
      "firstLevel": 1,
      "maxLevel": 10,
      "cultivationCostPerTargetLevel": 5,
      "firstCreationDCBonus": 5,
      "dcReductionPerHigherProfessionLevel": 2
    },
    "pending": [
    ],
    "manual": [
      "Confirmar mestre ou legado, talento, ferramentas e materiais externamente; o sistema não concede talentos por conta própria.",
      "Recriar a façanha diante de um instrutor da guilda ou apresentar prova suficiente para obter reconhecimento público."
    ],
    "craftingTime": {
      "hoursPerLevel": 1,
      "firstRecipeMultiplier": 10
    },
    "analysisCheck": {
      "skill": "ins",
      "ability": "wis",
      "label": "Intuição (SAB)",
      "baseDC": 15,
      "dcPerLevelDifference": 2,
      "retryHours": 12
    }
  },
  "inscriptions": {
    "profession": "inscriptions",
    "title": "Mestre de Inscrições",
    "requiredTalent": "Mente e Corpo",
    "extraRequirements": [],
    "summary": "Os mestres de inscrições enquanto não tão proeminentes quanto alquimistas e mestre de matrizes, tem um papel crucial em aprimorar equipamentos com efeitos diferentes assim como criar talismãs que oferecem proteções ou desferem ataques poderosos.",
    "specificRulesHTML": "<h3>MESTRE DE INSCRIÇÕES</h3>\n<p>Os mestres de inscrições enquanto não tão proeminentes quanto alquimistas e mestre de matrizes, tem um papel crucial em aprimorar equipamentos com efeitos diferentes assim como criar talismãs que oferecem proteções ou desferem ataques poderosos.</p>\n<h3>OLHAR RÚNICO</h3>\n<p>Como um mestre de inscrições, você tem a capacidade de analisar runas e equipamento, descobrindo sua natureza. Podendo replicar seus efeitos, podendo criar seus próprios talismãs através do que aprendeu com essas runas. Quando você se deparar com qualquer coisa que utiliza runas para sua criação ou aprimoramento, você pode realizar um Teste de Percepção (SAB) CD 15. Em caso de sucesso, você aprende sobre sua funcionalidade exata. Se você passar a CD por 10 ou mais, você aprende a como recriar o efeito.</p>\n<p>A CD aumenta em +2 para cada nível que a criação tiver acima do seu nível de mestre de inscrições e -2 para cada nível abaixo.</p>\n<p>Você só pode tentar analisar cada criação uma única vez, precisando subir seu nível de mestre de inscrições para tentar novamente.</p>\n<h3>CRIAÇÃO DE INSCRIÇÕES E TALISMÃS</h3>\n<p>Como um mestre de inscrições, você tem a capacidade de criar inscrições de diversos tipos, assim como criar talismãs que servem tanto para ataque quanto defesa.</p>\n<p>Para criar uma inscrição com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD. Ao passar com sucesso, você consegue criar a inscrição.</p>\n<h3>INSCRIÇÕES</h3>\n<p>Existem diversos tipos de inscrições e talismãs no mundo, alguns são originais enquanto outros são extremamente raros. Quando você se torna um mestre de inscrições, ou até antes disso, você pode gastar 15.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.</p>",
    "specificSourceText": "MESTRE DE INSCRIÇÕES\n\nOs mestres de inscrições enquanto não tão proeminentes quanto alquimistas e mestre de matrizes, tem um papel crucial em aprimorar equipamentos com efeitos diferentes assim como criar talismãs que oferecem proteções ou desferem ataques poderosos.\n\nOLHAR RÚNICO\nComo um mestre de inscrições, você tem a capacidade de analisar runas e equipamento, descobrindo sua natureza. Podendo replicar seus efeitos, podendo criar seus próprios talismãs através do que aprendeu com essas runas. Quando você se deparar com qualquer coisa que utiliza runas para sua criação ou aprimoramento, você pode realizar um Teste de Percepção (SAB) CD 15. Em caso de sucesso, você aprende sobre sua funcionalidade exata. Se você passar a CD por 10 ou mais, você aprende a como recriar o efeito.\n\tA CD aumenta em +2 para cada nível que a criação tiver acima do seu nível de mestre de inscrições e -2 para cada nível abaixo.\n\tVocê só pode tentar analisar cada criação uma única vez, precisando subir seu nível de mestre de inscrições para tentar novamente.\n\nCRIAÇÃO DE INSCRIÇÕES E TALISMÃS \nComo um mestre de inscrições, você tem a capacidade de criar inscrições de diversos tipos, assim como criar talismãs que servem tanto para ataque quanto defesa. \n\tPara criar uma inscrição com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD. Ao passar com sucesso, você consegue criar a inscrição.\n\nINSCRIÇÕES\nExistem diversos tipos de inscrições e talismãs no mundo, alguns são originais enquanto outros são extremamente raros. Quando você se torna um mestre de inscrições, ou até antes disso, você pode gastar 15.000 PO para comprar um livro de esquemas gerais, que te dá acesso a alguns esquemas básicos que vão de nível 1 a 10.",
    "tools": [
      "papel-de-talisma",
      "pincel-e-tinta-de-alta-qualidade",
      "livro-sobre-runas-de-inscricao",
      "livro-de-esquemas-gerais-de-inscricoes"
    ],
    "startingTools": [
      {
        "id": "papel-de-talisma",
        "quantity": 20
      },
      {
        "id": "pincel-e-tinta-de-alta-qualidade",
        "quantity": 1
      },
      {
        "id": "livro-sobre-runas-de-inscricao",
        "quantity": 1
      }
    ],
    "toolRequirements": "Ferramentas de Mestre de Inscrições: 20 papeis de talismã de 50 PO cada, 1 Pincel e Tinta de alta qualidade, 1 Livro sobre runas de inscrição.",
    "requirements": [
      "Ter um mestre, professor ou legado.",
      "Ter o talento de estudante da profissão.",
      "Conseguir os materiais para exercer a profissão.",
      "Concluir com sucesso uma criação da profissão."
    ],
    "creationChecks": [
      {
        "skill": "slt",
        "ability": "dex",
        "label": "Prestidigitação (AGI)"
      },
      {
        "skill": "ani",
        "ability": "wis",
        "label": "Criação (SAB)"
      },
      {
        "skill": "arc",
        "ability": "con",
        "label": "Controle de Qi (CON)"
      }
    ],
    "entryCheck": {
      "skill": "arc",
      "ability": "con",
      "label": "Controle de Qi (CON)",
      "dc": 20,
      "cultivationCost": 5
    },
    "progression": {
      "firstLevel": 1,
      "maxLevel": 10,
      "cultivationCostPerTargetLevel": 5,
      "firstCreationDCBonus": 5,
      "dcReductionPerHigherProfessionLevel": 2
    },
    "pending": [
      "A fonte não define o tempo de criação de inscrições e talismãs."
    ],
    "manual": [
      "Confirmar mestre ou legado, talento, ferramentas e materiais externamente; o sistema não concede talentos por conta própria.",
      "Recriar a façanha diante de um instrutor da guilda ou apresentar prova suficiente para obter reconhecimento público."
    ],
    "analysisCheck": {
      "skill": "prc",
      "ability": "wis",
      "label": "Percepção (SAB)",
      "baseDC": 15,
      "dcPerLevelDifference": 2,
      "recreateMargin": 10,
      "retry": "Somente após subir o nível de mestre de inscrições."
    }
  },
  "artisan": {
    "profession": "artisan",
    "title": "Mestre Artesão",
    "requiredTalent": "Ferreiro",
    "extraRequirements": [],
    "summary": "Os mestres artesões são um dos principais responsáveis pelo poder de luta de um cultivador. Seja através de armas poderosas, armaduras imponentes ou acessórios especiais. Eles são aqueles que permitem que um cultivador exerça todo seu poder através do uso de tesouros.",
    "specificRulesHTML": "<h3>MESTRE ARTESÃO</h3>\n<p>Os mestres artesões são um dos principais responsáveis pelo poder de luta de um cultivador. Seja através de armas poderosas, armaduras imponentes ou acessórios especiais. Eles são aqueles que permitem que um cultivador exerça todo seu poder através do uso de tesouros.</p>\n<h3>CRIAÇÃO DE TESOUROS</h3>\n<p>Como um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.</p>\n<p>Para criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro.</p>\n<p>Existem tesouros das seguintes raridades:</p>\n<h3>TABELA DE TESOUROS</h3>\n<table><tbody><tr><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td><td>RANKS</td><td>CLASSES</td><td>NÍVEL</td></tr><tr><td>Humano</td><td>Inferior</td><td>1</td><td>Sagrado</td><td>Inferior</td><td>7</td></tr><tr><td></td><td>Comum</td><td>2</td><td></td><td>Comum</td><td>-</td></tr><tr><td></td><td>Superior</td><td>3</td><td></td><td>Superior</td><td>8</td></tr></tbody></table>\n<table><tbody><tr><td>Terra</td><td>Inferior</td><td>-</td><td>Divino</td><td>Única</td><td>9</td></tr><tr><td></td><td>Comum</td><td>4</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>-</td><td></td><td></td><td></td></tr></tbody></table>\n<table><tbody><tr><td>Céu</td><td>Inferior</td><td>5</td><td>Supremo</td><td>Única</td><td>10</td></tr><tr><td></td><td>Comum</td><td>-</td><td></td><td></td><td></td></tr><tr><td></td><td>Superior</td><td>6</td><td></td><td></td><td></td></tr></tbody></table>\n<h3>TIPOS DE TESOUROS</h3>\n<p>Existem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.</p>\n<h3>TIPO DE TESOUROS</h3>\n<h3>ARMADURAS</h3>\n<table><tbody><tr><td>RANK</td><td>BASE</td><td>EFEITO ADICIONAL</td></tr><tr><td>Humano</td><td>Resistência 2 - Todos</td><td>-</td></tr><tr><td>Terra</td><td>Resistência 4 - Todos</td><td>Ignora dano de Formação de Núcleo ou menor.</td></tr><tr><td>Céu</td><td>Resistência 6 - Todos</td><td>Ignora dano de Núcleo Rotativo ou menor.</td></tr><tr><td>Sagrado</td><td>Resistência 8 - Todos</td><td>Ignora dano de Transformação Divina ou menor.</td></tr><tr><td>Divino</td><td>Resistência 10 - Todos</td><td>Ignora dano de Lorde Divino ou menor.</td></tr><tr><td>Supremo</td><td>Resistência 20 - Todos</td><td>Ignora dano de Imperador Sagrado ou menor.</td></tr></tbody></table>\n<h3>ARMA</h3>\n<table><tbody><tr><td>RANK</td><td>BASE</td><td>EFEITO ADICIONAL</td></tr><tr><td>Humano</td><td>7 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 1</td></tr><tr><td>Terra</td><td>10 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 2</td></tr><tr><td>Céu</td><td>12 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 3</td></tr><tr><td>Sagrado</td><td>14 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 4</td></tr><tr><td>Divino</td><td>16 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 5</td></tr><tr><td>Supremo</td><td>20 de dano</td><td>Seu limite do Explosão Ofensiva aumenta em 6</td></tr></tbody></table>\n<h3>ACESSÓRIOS</h3>\n<table><tbody><tr><td>RANK</td><td>EFEITO ADICIONAL</td></tr><tr><td>Único</td><td>Possui um efeito de limite de 4 Pontos de Qi, aumentando o limite em 1 PQ por Classe e 2 por Rank, até um máximo de 27 PQ no rank Supremo.</td></tr></tbody></table>\n<h3>TESOURO VOADOR</h3>\n<table><tbody><tr><td>RANK</td><td>EFEITO ADICIONAL</td></tr><tr><td>Único</td><td>Possui 18 de CR Base e 21 de deslocamento, recebendo +2 de CR por Rank e +3 de deslocamento por classe.</td></tr></tbody></table>\n<h3>ADICIONANDO EFEITOS</h3>\n<p>Quando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.</p>\n<h3>VALOR DA CRIAÇÃO</h3>\n<p>O valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.</p>",
    "specificSourceText": "MESTRE ARTESÃO\n\nOs mestres artesões são um dos principais responsáveis pelo poder de luta de um cultivador. Seja através de armas poderosas, armaduras imponentes ou acessórios especiais. Eles são aqueles que permitem que um cultivador exerça todo seu poder através do uso de tesouros.\n\nCRIAÇÃO DE TESOUROS\nComo um mestre artesão, você tem a capacidade de criar diversos tipos de tesouros, desde armas até armaduras, assim como acessórios que contém certos tipos de habilidades em seu interior.\n\tPara criar um tesouro com sucesso, você deve realizar 3 testes de atributo distintos, sendo eles um Teste de Prestidigitação (AGI), um Teste de Criação (SAB) e um Teste de Controle de Qi (CON), onde todos possuem a mesma CD, que começa em 10 e aumenta +2 para cada nível do equipamento além do equivalente da tabela de tesouros. Ao passar com sucesso, você consegue criar o tesouro. \n\nExistem tesouros das seguintes raridades:\n\nTABELA DE TESOUROS\nRANKS\tCLASSES\tNÍVEL\tRANKS\tCLASSES\tNÍVEL\nHumano\tInferior\t1\tSagrado\tInferior\t7\n\tComum\t2\t\tComum\t-\n\tSuperior\t3\t\tSuperior\t8\n\nTerra\tInferior\t-\tDivino\tÚnica\t9\n\tComum\t4\t\t\t\n\tSuperior\t-\t\t\t\n\nCéu\tInferior\t5\tSupremo\tÚnica\t10\n\tComum\t-\t\t\t\n\tSuperior\t6\t\t\t\n\nTIPOS DE TESOUROS\nExistem diversos tipos de tesouros no mundo, mas eles não são criados a partir de um molde fixo e sim a partir dos materiais adquiridos e utilizados na sua criação. Você pode comprar um livro de forja básica que irá ajudar a criar seus primeiros tesouros por 10.000 PO.\n\nTIPO DE TESOUROS\nARMADURAS\nRANK\tBASE\tEFEITO ADICIONAL\nHumano\tResistência 2 - Todos\t-\nTerra\tResistência 4 - Todos\tIgnora dano de Formação de Núcleo ou menor.\nCéu\tResistência 6 - Todos\tIgnora dano de Núcleo Rotativo ou menor.\nSagrado\tResistência 8 - Todos\tIgnora dano de Transformação Divina ou menor.\nDivino\tResistência 10 - Todos\tIgnora dano de Lorde Divino ou menor.\nSupremo\tResistência 20 - Todos\tIgnora dano de Imperador Sagrado ou menor.\nARMA\nRANK\tBASE\tEFEITO ADICIONAL\nHumano\t7 de dano\tSeu limite do Explosão Ofensiva aumenta em 1 \nTerra\t10 de dano\tSeu limite do Explosão Ofensiva aumenta em 2\nCéu\t12 de dano\tSeu limite do Explosão Ofensiva aumenta em 3 \nSagrado\t14 de dano\tSeu limite do Explosão Ofensiva aumenta em 4\nDivino\t16 de dano\tSeu limite do Explosão Ofensiva aumenta em 5 \nSupremo\t20 de dano\tSeu limite do Explosão Ofensiva aumenta em 6 \nACESSÓRIOS\nRANK\tEFEITO ADICIONAL\nÚnico\tPossui um efeito de limite de 4 Pontos de Qi, aumentando o limite em 1 PQ por Classe e 2 por Rank, até um máximo de 27 PQ no rank Supremo.\nTESOURO VOADOR\nRANK\tEFEITO ADICIONAL\nÚnico\tPossui 18 de CR Base e 21 de deslocamento, recebendo +2 de CR por Rank e +3 de deslocamento por classe.\n\n\nADICIONANDO EFEITOS                                                                                                                                                                                                              \nQuando você criar um tesouro qualquer, ele recebe um efeito baseado na raridade da arma e do ingrediente / minério usado na confecção dele. O efeito / habilidade que ele contém segue as regras iguais a do acessório, usando o ingrediente de rank mais baixo utilizado na criação como base. Caso a arma seja usando um núcleo de besta, ela irá receber uma habilidade natural da besta no lugar.\n\nVALOR DA CRIAÇÃO                                                                                                                                                                                                              \nO valor de um tesouro varia bastante dependendo da raridade dos materiais utilizados, mas todos são cerca de 5.000% do valor padrão de mercado de acordo com o nível do equipamento.",
    "tools": [
      "lingote-de-ferro",
      "livro-sobre-minerais-raros",
      "bigorna",
      "conjunto-de-ferramentas-de-forja",
      "livro-de-forja-basica"
    ],
    "startingTools": [
      {
        "id": "lingote-de-ferro",
        "quantity": 4
      },
      {
        "id": "livro-sobre-minerais-raros",
        "quantity": 1
      },
      {
        "id": "bigorna",
        "quantity": 1
      },
      {
        "id": "conjunto-de-ferramentas-de-forja",
        "quantity": 1
      }
    ],
    "toolRequirements": "Ferramentas de Mestre Artesão: 4 Lingotes de Ferro, 1 Livro Sobre Minerais Raros, 1 Bigorna, 1 Conjunto de Ferramentas de Forja.",
    "requirements": [
      "Ter um mestre, professor ou legado.",
      "Ter o talento de estudante da profissão.",
      "Conseguir os materiais para exercer a profissão.",
      "Concluir com sucesso uma criação da profissão."
    ],
    "creationChecks": [
      {
        "skill": "slt",
        "ability": "dex",
        "label": "Prestidigitação (AGI)"
      },
      {
        "skill": "ani",
        "ability": "wis",
        "label": "Criação (SAB)"
      },
      {
        "skill": "arc",
        "ability": "con",
        "label": "Controle de Qi (CON)"
      }
    ],
    "entryCheck": {
      "skill": "arc",
      "ability": "con",
      "label": "Controle de Qi (CON)",
      "dc": 20,
      "cultivationCost": 5
    },
    "progression": {
      "firstLevel": 1,
      "maxLevel": 10,
      "cultivationCostPerTargetLevel": 5,
      "firstCreationDCBonus": 5,
      "dcReductionPerHigherProfessionLevel": 2
    },
    "pending": [
      "A fonte não define o tempo de criação de tesouros.",
      "Confirmar a base de mercado de 5.000% e sua relação com Receitas e Materiais antes de cobrar custos."
    ],
    "manual": [
      "Confirmar mestre ou legado, talento, ferramentas e materiais externamente; o sistema não concede talentos por conta própria.",
      "Recriar a façanha diante de um instrutor da guilda ou apresentar prova suficiente para obter reconhecimento público."
    ],
    "baseDC": 10,
    "treasureEquivalences": [
      {
        "rank": "Humano",
        "tier": "Inferior",
        "level": 1
      },
      {
        "rank": "Humano",
        "tier": "Comum",
        "level": 2
      },
      {
        "rank": "Humano",
        "tier": "Superior",
        "level": 3
      },
      {
        "rank": "Terra",
        "tier": "Inferior",
        "level": null
      },
      {
        "rank": "Terra",
        "tier": "Comum",
        "level": 4
      },
      {
        "rank": "Terra",
        "tier": "Superior",
        "level": null
      },
      {
        "rank": "Céu",
        "tier": "Inferior",
        "level": 5
      },
      {
        "rank": "Céu",
        "tier": "Comum",
        "level": null
      },
      {
        "rank": "Céu",
        "tier": "Superior",
        "level": 6
      },
      {
        "rank": "Sagrado",
        "tier": "Inferior",
        "level": 7
      },
      {
        "rank": "Sagrado",
        "tier": "Comum",
        "level": null
      },
      {
        "rank": "Sagrado",
        "tier": "Superior",
        "level": 8
      },
      {
        "rank": "Divino",
        "tier": "Única",
        "level": 9
      },
      {
        "rank": "Supremo",
        "tier": "Única",
        "level": 10
      }
    ]
  },
  "beasts": {
    "profession": "beasts",
    "title": "Criador de Bestas",
    "requiredTalent": "Rastreador",
    "extraRequirements": [],
    "summary": "Os criadores de bestas são uma profissão focada em domar criaturas mágicas e bestas demoníacas, seja para uso doméstico ou para proteger certos lugares. Eles são extremamente versados na arte de domar criaturas assim como conhecem o corpo da maioria das bestas de forma detalhada.",
    "specificRulesHTML": "<h3>CRIADOR DE BESTAS</h3>\n<p>Os criadores de bestas são uma profissão focada em domar criaturas mágicas e bestas demoníacas, seja para uso doméstico ou para proteger certos lugares. Eles são extremamente versados na arte de domar criaturas assim como conhecem o corpo da maioria das bestas de forma detalhada.</p>\n<h3>ANÁLISE BESTIAL</h3>\n<p>Como um criador de bestas, você sabe analisar e identificar quase todos os tipos de bestas existências de até um Rank acima do seu nível equivalente ou inferior, podendo até mesmo identificar o Rank inicial dela, quantos anos ela possui e em quantos anos ela irá amadurecer, bem como o rank final que ela irá atingir.</p>\n<p>Quando você se deparar com uma besta, você pode realizar um Teste de Intuição (SAB) com CD igual a 12, aumentando em +2 para cada Rank da besta acima de Condensação de Qi. Em caso de sucesso, você recebe todas as informações da besta, incluindo seus pontos fortes e fracos.</p>\n<p>A CD diminui em CD para cada nível de Criador de Bestas que você tiver em relação ao Rank equivalente dela.</p>\n<h3>DOMANDO UMA BESTA</h3>\n<p>Tentar domar uma besta é um processo difícil e árduo, mas recompensador, pois o sucesso te garante um poderoso companheiro para te ajudar em diversas tarefas, podendo até te auxiliar em combate. Para domar uma besta, ela não pode ter atingido a fase adulta ainda e deve possuir um Rank igual ou inferior ao seu nível equivalente de Criador de Bestas. Onde você deve realizar um Teste de Criação (SAB) durante um número de dias igual a 2 vezes nível dela equivalente ao Rank. Se você falhar três vezes durante o processo, você falha permanentemente com aquela besta.</p>\n<p>Por exemplo: Uma besta no nível Mar Divino (Equivalente a nível 4) demoraria 8 dias para ser domada.</p>\n<h3>BESTAS E DIFICULDADE</h3>\n<table><tbody><tr><td>RANK MÁXIMO</td><td>CD</td><td>RANK MÁXIMO</td><td>CD</td></tr><tr><td>Condensação de Qi</td><td>12</td><td>Lorde Divino</td><td>23</td></tr><tr><td>Formação de Núcleo</td><td>13</td><td>Lorde Sagrado</td><td>25</td></tr><tr><td>Núcleo Rotativo</td><td>15</td><td>Imperador Sagrado</td><td>28</td></tr><tr><td>Mar Divino</td><td>17</td><td>Empírico</td><td>32</td></tr><tr><td>Transformação Divina</td><td>20</td><td>Divino</td><td>35</td></tr></tbody></table>\n<p>A dificuldade da besta se refere ao rank de cultivo máximo que ela pode alcançar quando estiver na forma adulta, ignorando totalmente o rank atual dela. Porém, o rank atual da besta define sua capacidade de doma-la com sucesso.</p>\n<h3>CRIANDO UMA BESTA</h3>\n<p>Uma outra habilidade do Criador de Bestas é a de acelerar o crescimento da besta baseado no seu nível atual. Você pode dobrar a velocidade de crescimento da besta por 5 para cada nível de criador de besta que você possuir acima do Rank atual dela. Se você for dois ranks acima, você multiplica o resultado anterior por 5 novamente.</p>\n<p>Por exemplo: Se você for um Criador de Bestas de 6º nível e a besta tiver no rank de Mar Divino, você pode acelerar a absorção de Qi da besta em 25 vezes.</p>\n<p>Embora bestas não possuem métodos de cultivo, elas absorvem PEQ como se tivessem cultivando um manual de nível superior. Aumentando o rank do manual a cada 2 ranks máximos que a besta tiver de crescimento.</p>\n<p>Por exemplo: Uma besta de crescimento máximo de Divino, irá absorver o equivalente a um manual Superior de Rank Divino.</p>",
    "specificSourceText": "CRIADOR DE BESTAS\n\nOs criadores de bestas são uma profissão focada em domar criaturas mágicas e bestas demoníacas, seja para uso doméstico ou para proteger certos lugares. Eles são extremamente versados na arte de domar criaturas assim como conhecem o corpo da maioria das bestas de forma detalhada.\n\nANÁLISE BESTIAL\nComo um criador de bestas, você sabe analisar e identificar quase todos os tipos de bestas existências de até um Rank acima do seu nível equivalente ou inferior, podendo até mesmo identificar o Rank inicial dela, quantos anos ela possui e em quantos anos ela irá amadurecer, bem como o rank final que ela irá atingir.\n\tQuando você se deparar com uma besta, você pode realizar um Teste de Intuição (SAB) com CD igual a 12, aumentando em +2 para cada Rank da besta acima de Condensação de Qi. Em caso de sucesso, você recebe todas as informações da besta, incluindo seus pontos fortes e fracos.\n\tA CD diminui em CD para cada nível de Criador de Bestas que você tiver em relação ao Rank equivalente dela.\n\n\nDOMANDO UMA BESTA\nTentar domar uma besta é um processo difícil e árduo, mas recompensador, pois o sucesso te garante um poderoso companheiro para te ajudar em diversas tarefas, podendo até te auxiliar em combate. Para domar uma besta, ela não pode ter atingido a fase adulta ainda e deve possuir um Rank igual ou inferior ao seu nível equivalente de Criador de Bestas. Onde você deve realizar um Teste de Criação (SAB) durante um número de dias igual a 2 vezes nível dela equivalente ao Rank. Se você falhar três vezes durante o processo, você falha permanentemente com aquela besta.\n\tPor exemplo: Uma besta no nível Mar Divino (Equivalente a nível 4) demoraria 8 dias para ser domada.\n\nBESTAS E DIFICULDADE\nRANK MÁXIMO\tCD\tRANK MÁXIMO\tCD\nCondensação de Qi\t12\tLorde Divino\t23\nFormação de Núcleo\t13\tLorde Sagrado\t25\nNúcleo Rotativo\t15\tImperador Sagrado\t28\nMar Divino\t17\tEmpírico\t32\nTransformação Divina\t20\tDivino\t35\n\nA dificuldade da besta se refere ao rank de cultivo máximo que ela pode alcançar quando estiver na forma adulta, ignorando totalmente o rank atual dela. Porém, o rank atual da besta define sua capacidade de doma-la com sucesso.\n\n\nCRIANDO UMA BESTA\nUma outra habilidade do Criador de Bestas é a de acelerar o crescimento da besta baseado no seu nível atual. Você pode dobrar a velocidade de crescimento da besta por 5 para cada nível de criador de besta que você possuir acima do Rank atual dela. Se você for dois ranks acima, você multiplica o resultado anterior por 5 novamente. \nPor exemplo: Se você for um Criador de Bestas de 6º nível e a besta tiver no rank de Mar Divino, você pode acelerar a absorção de Qi da besta em 25 vezes.\n\nEmbora bestas não possuem métodos de cultivo, elas absorvem PEQ como se tivessem cultivando um manual de nível superior. Aumentando o rank do manual a cada 2 ranks máximos que a besta tiver de crescimento. \nPor exemplo: Uma besta de crescimento máximo de Divino, irá absorver o equivalente a um manual Superior de Rank Divino.",
    "tools": [
      "kit-de-primeiros-socorros",
      "livro-sobre-bestas-magicas-e-demoniacas",
      "racao-para-bestas",
      "livro-sobre-biomas"
    ],
    "startingTools": [
      {
        "id": "kit-de-primeiros-socorros",
        "quantity": 3
      },
      {
        "id": "livro-sobre-bestas-magicas-e-demoniacas",
        "quantity": 1
      },
      {
        "id": "racao-para-bestas",
        "quantity": 10
      },
      {
        "id": "livro-sobre-biomas",
        "quantity": 1
      }
    ],
    "toolRequirements": "Ferramentas de Mestre de Bestas: 3 Kits de Primeiros Socorros, 1 Livro Sobre Bestas Mágicas e Demoníacas, 10 pacotes de ração para bestas e 1 Livro sobre Biomas.",
    "requirements": [
      "Ter um mestre, professor ou legado.",
      "Ter o talento de estudante da profissão.",
      "Conseguir os materiais para exercer a profissão.",
      "Concluir com sucesso uma criação da profissão."
    ],
    "creationChecks": [
      {
        "skill": "ani",
        "ability": "wis",
        "label": "Criação (SAB)"
      }
    ],
    "entryCheck": {
      "skill": "arc",
      "ability": "con",
      "label": "Controle de Qi (CON)",
      "dc": 20,
      "cultivationCost": 5
    },
    "progression": {
      "firstLevel": 1,
      "maxLevel": 10,
      "cultivationCostPerTargetLevel": 5,
      "firstCreationDCBonus": 5,
      "dcReductionPerHigherProfessionLevel": 2
    },
    "pending": [
      "A fonte diz “A CD diminui em CD” na Análise Bestial sem informar o valor da redução; confirmar antes de aplicar a diferença de níveis.",
      "A fonte usa “dobrar ... por 5” para crescimento; o exemplo confirma multiplicar por 5 a cada nível acima, mas confirmar a redação."
    ],
    "manual": [
      "Confirmar mestre ou legado, talento, ferramentas e materiais externamente; o sistema não concede talentos por conta própria.",
      "Recriar a façanha diante de um instrutor da guilda ou apresentar prova suficiente para obter reconhecimento público."
    ],
    "analysisCheck": {
      "skill": "ins",
      "ability": "wis",
      "label": "Intuição (SAB)",
      "baseDC": 12,
      "dcPerRankAboveQiCondensation": 2,
      "maximumRankDifference": 1
    },
    "tamingRules": {
      "daysPerCurrentRankLevel": 2,
      "permanentFailureCount": 3,
      "adultAllowed": false,
      "maximumCurrentRank": "Igual ou inferior ao nível profissional equivalente.",
      "difficultyUses": "Rank máximo adulto, ignorando o Rank atual.",
      "difficultyByMaximumRank": [
        {
          "rank": "Condensação de Qi",
          "level": 1,
          "dc": 12
        },
        {
          "rank": "Formação de Núcleo",
          "level": 2,
          "dc": 13
        },
        {
          "rank": "Núcleo Rotativo",
          "level": 3,
          "dc": 15
        },
        {
          "rank": "Mar Divino",
          "level": 4,
          "dc": 17
        },
        {
          "rank": "Transformação Divina",
          "level": 5,
          "dc": 20
        },
        {
          "rank": "Lorde Divino",
          "level": 6,
          "dc": 23
        },
        {
          "rank": "Lorde Sagrado",
          "level": 7,
          "dc": 25
        },
        {
          "rank": "Imperador Sagrado",
          "level": 8,
          "dc": 28
        },
        {
          "rank": "Empírico",
          "level": 9,
          "dc": 32
        },
        {
          "rank": "Divino",
          "level": 10,
          "dc": 35
        }
      ]
    },
    "growthRules": {
      "multiplierPerHigherProfessionLevel": 5,
      "example": {
        "professionLevel": 6,
        "beastLevel": 4,
        "multiplier": 25
      },
      "manualQuality": "Superior",
      "manualRankStepInMaximumRanks": 2
    }
  }
};

for(const key of ['specificRulesHTML','specificSourceText'])GUIDE_DATA.artisan[key]=refinedTreasureText(GUIDE_DATA.artisan[key]);

export const PROFESSION_GUIDES = freeze(Object.fromEntries(Object.entries(GUIDE_DATA).map(([key, guide]) => [key, {
  ...guide,
  commonRulesHTML: COMMON_RULES_HTML + "\n" + AUTHOR_RULES_HTML,
  descriptionHTML: `${COMMON_RULES_HTML}\n${AUTHOR_RULES_HTML}\n${guide.specificRulesHTML}`,
  rulesHTML: `${COMMON_RULES_HTML}\n${AUTHOR_RULES_HTML}\n${guide.specificRulesHTML}`,
  sourceText: `${COMMON_SOURCE_TEXT}\n\n${guide.specificSourceText}`
}])));
