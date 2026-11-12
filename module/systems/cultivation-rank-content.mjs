/** Authored realm references; IDs remain stable when descriptions change. */
const REALMS=[
  [
    "Condensação de Qi",
    "<p>A partir deste rank, você utiliza Qi para fortalecer o corpo e potencializar seus ataques.</p><ul><li>Acesso aos Pontos de Qi e à progressão de Qi do Cultivador.</li><li>Pode aprender <strong>Manuais de Combate</strong>, conforme o Capítulo 4.</li><li>Pode estudar um único <strong>Manual de Cultivo</strong>, obtido por um meio definido com o Narrador.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li></ul><p>A progressão confirmada do Cultivador começa com 40 Qi, acrescenta 10 por estágio e 20 na troca de reino. A referência a 10 Qi por nível não é somada uma segunda vez.</p>"
  ],
  [
    "Formação de Núcleo",
    "<p>Seu Qi pode ser utilizado fora do corpo, inclusive mudando sua natureza através de canalizações elementais.</p><p>Você passa a poder compreender e treinar <strong>Conceitos Elementais</strong>, conforme o Capítulo 6.</p>"
  ],
  [
    "Núcleo Rotativo",
    "<p>Você absorve o Qi da atmosfera com facilidade, sustentando características antes impossíveis.</p><ul><li>Recupera <strong>5 Pontos de Qi a cada 10 minutos de meditação</strong>, sem precisar de descanso, até seu Qi máximo.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li></ul>"
  ],
  [
    "Mar Divino",
    "<p>Seu controle refinado de Qi permite acessar uma reserva ainda mais vasta de poder.</p><p>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</p>"
  ],
  [
    "Transformação Divina",
    "<p>Sua mente se expande e compreende com mais facilidade as leis do mundo.</p><ul><li>Reduz em <strong>4 a CD</strong> das criações de profissões e dos treinamentos elementais de <strong>5º nível ou abaixo</strong>.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li><li>Causa <strong>3 de dano adicional por rank de cultivo</strong> que o alvo estiver abaixo de você.</li></ul>"
  ],
  [
    "Lorde Divino",
    "<p>Você deixou a mortalidade para trás e é reconhecido como um imortal.</p><ul><li>Treina <strong>elementos intermediários com o mesmo custo de elementos básicos</strong>.</li><li>Para cada <strong>Ponto de Iluminação recebido</strong> a partir deste rank, recebe <strong>1 PI adicional</strong>. O benefício não altera retroativamente o saldo já acumulado.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li></ul>"
  ],
  [
    "Lorde Sagrado",
    "<p>Seu corpo e sua alma estão em profunda sintonia, facilitando os dois caminhos de treinamento.</p><ul><li>Treinar a <strong>Alma</strong> exige <strong>metade do tempo e do dinheiro</strong> e custa <strong>2 Pontos de Cultivo a menos</strong>.</li><li>Treinar o <strong>Corpo</strong> exige <strong>metade do tempo e do dinheiro</strong> e custa <strong>1 Ponto de Cultivo a menos</strong>.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li></ul><p>O desconto de dinheiro não altera a quantidade de pílulas exigidas pelo treinamento.</p>"
  ],
  [
    "Imperador Sagrado",
    "<p>Estrelas e planetas se projetam no mar de Qi de seu Dantian. Suas reações geram energia constante e expressam seu elemento de maior nível.</p><ul><li>Recebe <strong>100 Pontos de Qi máximos adicionais</strong>.</li><li>Recebe <strong>imunidade a dano</strong> de criaturas <strong>4 ou mais ranks de cultivo abaixo</strong> de você.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li></ul>"
  ],
  [
    "Empírico",
    "<p>Sua projeção interior se tornou imensa e sua lei alcançou o ápice. Tornar-se um empírico é transcender milhões de existências.</p><ul><li>Pode criar <strong>2 Manuais de Combate de Grau 9</strong> para seu personagem, sem gastar <strong>Pontos de Cultivo</strong> para aprendê-los.</li><li>Recebe <strong>1 Habilidade de Qi Básica</strong> à sua escolha, respeitando os requisitos.</li></ul>"
  ],
  [
    "Divindade",
    "<p>Você alcançou o pico do mundo do cultivo, tornando-se imortal e perpétuo, a menos que seja derrotado em combate.</p><p><strong>Todos os bônus quantificáveis de Imperador Sagrado para baixo são dobrados</strong>, exceto <strong>Pontos de Atributo</strong>.</p><p>Os benefícios de Empírico ficam fora desse intervalo.</p>"
  ]
];
export function cultivationRankDocuments(){
 return REALMS.map(([name,html],index)=>({_id:'c0171a72'+String(index+1).padStart(8,'0'),name,type:'feat',
  img:'systems/Immortals-system/icons/svg/items/class.svg',folder:'c0171a7000000000',
  system:{identifier:'reino-cultivo-'+(index+1),type:{value:'class'},description:{value:html},activities:{}},effects:[],
  flags:{'Immortals-system':{cultivatorFeature:'rank-'+(index+1),cultivatorRank:index+1,cultivatorRuleVersion:1,featureSection:'jj-combat'}}}));
}
