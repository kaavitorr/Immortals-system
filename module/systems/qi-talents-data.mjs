/** Authored Qi talent catalog. Budgets, learning grants and runtime costs are resolved separately. */
export const QI_TALENT_CATEGORIES = ["Habilidades de Qi","Adaptação Física","Habilidades Especiais","Imortalidade"];

/** Listed in the source table without a rules description; intentionally not a learnable node. */
export const QI_TALENT_MISSING = ["Explosão de Velocidade"];

export const QI_TALENTS = [
  {
    "id": "aceleracao-marcial",
    "name": "Aceleração Marcial",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [],
    "basic": true,
    "pending": [
      "O texto não define quando os Pontos de Aceleração são recuperados."
    ],
    "description": "<h2>Aceleração Marcial</h2><p>Você aprendeu a liberar surtos de Qi para acelerar a execução de suas habilidades em troca de danos internos, contabilizados como Pontos de Aceleração. Ao escolher sofrer 4 Pontos de Dano interno, você pode escolher diminuir o custo de uma técnica em 1 Ponto de Ação [⬢], até um mínimo de 1. Você só pode utilizar 1 Ponto de Aceleração por rodada.</p><ul><li>Você tem 3 Pontos de Aceleração, recebendo 1 adicional para cada 3 Talentos de Qi adquiridos.</li></ul>"
  },
  {
    "id": "aceleracao-arriscada",
    "name": "Aceleração Arriscada",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [
      "Aceleração Marcial"
    ],
    "requirementRules": {
      "type": "node",
      "id": "aceleracao-marcial"
    },
    "basic": true,
    "description": "<h2>Aceleração Arriscada</h2><p><strong>Requisito:</strong> Aceleração Marcial</p><p>Você se torna capaz de força ainda mais o uso de suas técnicas em troca de deixar seu Qi caótico. Você pode gastar até 2 Pontos de Aceleração por rodada, podendo utiliza-los na ativação da mesma técnica para reduzir até 2 Pontos de Ação [⬢⬢].</p>"
  },
  {
    "id": "canalizacao-amplificadora",
    "name": "Canalização Amplificadora",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [],
    "basic": true,
    "description": "<h2>Canalização Amplificadora</h2><p>Você aprendeu a utilizar seu Qi para aprimorar certas ações que você pode realizar dentro e fora de combate. Você recebe acesso a seguinte habilidade.</p><h3>CANALIZAR ENERGIA</h3><p>Ao ativar essa habilidade, você pode escolher aumentar seu deslocamento ou sua velocidade de pulo de forma explosiva. Você pode escolher uma das seguintes opções:</p><ul><li>Movimento: Você aumenta seu deslocamento em 2 metros e mais 1 metros por PQ gasto.</li><li>Pulo: Você aumenta sua altura de pulo em 2 metros e mais 1 metros por PQ gasto.</li></ul><p>Você pode ativar as duas simultaneamente com mesmo custo de ativação, mas o aumento adicional de altura e deslocamento deve ser individual.</p><table><tbody><tr><th>PQ</th><td>4</td></tr><tr><td>Duração</td><td>Instantâneo</td></tr><tr><td>Alcance</td><td>Pessoal</td></tr><tr><td>Ações</td><td>⬢</td><td>Requisito</td><td>Nenhuma</td></tr></tbody></table>"
  },
  {
    "id": "canalizacao-de-combate",
    "name": "Canalização de Combate",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [],
    "basic": true,
    "pending": [
      "Defesa Sólida diz dano adicional no trecho que limita dados de redução; preservar o contexto de redução sem inventar regra."
    ],
    "description": "<h2>Canalização de Combate</h2><p>Você recebe acesso as seguintes habilidades:</p><h3>EXPLOSÃO DE ENERGIA</h3><p>Você envolve seus membros ou arma em Qi e desfere um golpe potencializado contra a criatura inimiga, causando o dano da técnica.</p><ul><li>A partir do 5º nível de Cultivo (somado entre Ranks), você pode gastar 1 PQ para aumentar 1d8 de dano adicional, mas o número de dados de dano finais não pode ser superior ao seu nível de cultivo.</li></ul><table><tbody><tr><th>PQ</th><td>4</td></tr><tr><td>Duração</td><td>Instantâneo</td></tr><tr><td>Alcance</td><td>Pessoal</td></tr><tr><td>Requisito</td><td>Nenhum</td></tr><tr><td>Ações</td><td>⬢⬢⬢</td><td>Dano</td><td>4d8 de dano Contundente, Cortante ou Perfurante</td></tr></tbody></table><h3>DEFESA SÓLIDA</h3><p>Ao ser alvo de uma jogada de ataque (Comum ou de Técnica), você pode envolver seu corpo com uma camada grossa de Qi para se proteger, reduzindo 4d8 de dano.</p><ul><li>A partir do 5º nível de Cultivo (somado entre Ranks), você pode gastar 1 PQ para aumentar 1d8 de dano adicional, mas o número de dados de redução finais, não pode ser superior ao seu nível de cultivo.</li></ul><table><tbody><tr><th>PQ</th><td>4</td></tr><tr><td>Duração</td><td>Instantâneo</td></tr><tr><td>Alcance</td><td>Pessoal</td></tr><tr><td>Ações</td><td>⬢⬢</td><td>Requisito</td><td>Reação</td></tr></tbody></table>"
  },
  {
    "id": "mensagem-de-qi",
    "name": "Mensagem de Qi",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [],
    "basic": true,
    "description": "<h2>Mensagem de Qi</h2><p>Você pode gastar 1 Ponto de Qi para enviar uma mensagem para uma criatura dentro do seu alcance de 10 metros + 5 metros por nível de Cultivo. A mensagem pode ter até 20 palavras e a criatura deve ter essa habilidade para que possa responde-lo.</p><p>Você também pode gastar 10 Pontos de Qi para falar à vontade com a criatura por 5 minutos.</p>"
  },
  {
    "id": "levitacao-de-qi",
    "name": "Levitação de Qi",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [
      "Formação de Núcleo"
    ],
    "requirementRules": {
      "type": "rank",
      "min": 2
    },
    "basic": true,
    "description": "<h2>Levitação de Qi</h2><p><strong>Requisito:</strong> Formação de Núcleo</p><p>Você pode gastar 4 Pontos de Qi para receber deslocamento de voo igual seu deslocamento padrão, consumindo 4 Pontos de Qi no início de cada um de seus turnos para manter a levitação.</p>"
  },
  {
    "id": "sentido-divino",
    "name": "Sentido Divino",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [
      "Formação de Núcleo"
    ],
    "requirementRules": {
      "type": "rank",
      "min": 2
    },
    "basic": true,
    "description": "<h2>Sentido Divino</h2><p><strong>Requisito:</strong> Formação de Núcleo</p><p>Através da expansão da sua alma, você pode enviar seus sentidos para fora do seu corpo, permitindo que você possa ver sem olhar, como se tivesse tocando o que seu sentido divino tocar. Podendo até atravessar roupas, carne, rochas, metais e similares e ver através.</p><p>Enquanto estiver com ele ativo, você recebe 2 vantagens em testes de Percepção (Sabedoria) e Investigação (Intelecto) e seu alcance é igual a 5 metros vezes o seu nível de cultivo.</p>"
  },
  {
    "id": "pressao-de-cultivo",
    "name": "Pressão de Cultivo",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [
      "Sentido Divino"
    ],
    "requirementRules": {
      "type": "node",
      "id": "sentido-divino"
    },
    "basic": true,
    "description": "<h2>Pressão de Cultivo</h2><p><strong>Requisito:</strong> Sentido Divino</p><p>Ao gastar 5 Pontos de Qi, você pode liberar todo ou parte do seu cultivo para liberar uma onda de pressão em uma área dentro do seu Sentido Divino, permitindo que você possa causar a condição “Incapacitado” em criaturas mais fracas pelas seguintes regras:</p><ul><li>Se a criatura for de mesmo cultivo ou maior, ela não sofre nenhum efeito da sua pressão;</li><li>Se a criatura for um Rank abaixo, ela pode realizar uma Salvaguarda de Vontade para resistir;</li><li>Se a criatura for 2 Ranks abaixo, ela faz a Salvaguarda com 6 desvantagens;</li><li>Se a criatura for 3 Ranks abaixo ou mais, ela recebe automaticamente a condição “Incapacitado”.</li></ul>"
  },
  {
    "id": "manipulacao-precisa",
    "name": "Manipulação Precisa",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [
      "Canalização Amplificadora",
      "Canalização de Combate"
    ],
    "requirementRules": {
      "type": "and",
      "rules": [
        {
          "type": "node",
          "id": "canalizacao-amplificadora"
        },
        {
          "type": "node",
          "id": "canalizacao-de-combate"
        }
      ]
    },
    "basic": true,
    "description": "<h2>Manipulação Precisa</h2><p><strong>Requisito:</strong> Canalização Amplificadora e Canalização de Combate</p><p>Você aprendeu a comprimir seu Qi em seus golpes, fazendo com que ela passe mais facilmente a defesa das criaturas inimigas. Você recebe +1 de acerto em suas jogadas de ataque (Comuns e de Técnica), passando para +2 no 6º nível e +3 no 10º nível de personagem.</p>"
  },
  {
    "id": "voo-estavel",
    "name": "Voo Estável",
    "category": "Habilidades de Qi",
    "path": "Habilidades Básicas",
    "requirements": [
      "Mar Divino",
      "Levitação de Qi"
    ],
    "requirementRules": {
      "type": "and",
      "rules": [
        {
          "type": "rank",
          "min": 4
        },
        {
          "type": "node",
          "id": "levitacao-de-qi"
        }
      ]
    },
    "basic": true,
    "description": "<h2>Voo Estável</h2><p><strong>Requisito:</strong> Mar Divino e Levitação de Qi</p><p>Você passa a poder voar com maestria, consumindo 1 Ponto de Qi na ativação e mais 1 Ponto de Qi por rodada para receber deslocamento de voo igual seu deslocamento padrão.</p><p>Fora de combate, você dobra seu deslocamento e consome apenas 1 Ponto de Qi a cada 5 minutos.</p>"
  },
  {
    "id": "gestos-flecha-e-linha",
    "name": "Gestos: Flecha e Linha",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [],
    "basic": false,
    "description": "<h2>Gestos: Flecha e Linha</h2><p>Você aprendeu gestos que permitem modificar livremente suas técnicas a distância, alterando sua área de efeito mediante um custo. Ao gastar 1 Ponto de Ação [⬢] e uma quantidade de PQ igual à ordem da habilidade (1º Manifestação – 1 PQ | 2º Manifestação – 2 PQ | 3º Manifestação – 3 PQ), você pode modificar o alcance de sua Técnica para uma das seguintes opções:</p><ul><li>Flecha: Você concentra a Técnica em uma única criatura dentro do alcance, realizando uma Rolagem de Ataque contra ela. O dado de dano da Técnica passa a ser d8.</li><li>Linha: Você faz com que sua Técnica atinja uma linha de 1,5 metro de largura. Todas as criaturas na área devem realizar uma Salvaguarda de Agilidade, sofrendo todo o dano em caso de falha ou metade em caso de sucesso. O dado de dano da Técnica passa a ser d8.</li></ul><h3>ESTATÍSTICAS DAS MANIFESTAÇÕES</h3><table><tbody><tr><th>Ordem</th><th>Flecha</th><th>Linha</th></tr><tr><td>1º Manifestação</td><td>15 metros</td><td>15 metros</td></tr><tr><td>2º Manifestação</td><td>25 metros</td><td>25 metros</td></tr><tr><td>3º Manifestação</td><td>35 metros</td><td>35 metros</td></tr></tbody></table><p>Caso a Técnica modificada seja “Flecha” e aplique uma Condição, você pode gastar 1 PA adicional para convertê-la ao modelo de “Linha”.</p><ul><li>Os gestos só funcionam em Técnicas que causem dano e/ou apliquem Condições negativas.</li></ul>"
  },
  {
    "id": "escudo-de-qi",
    "name": "Escudo de Qi",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [],
    "basic": false,
    "description": "<h2>Escudo de Qi</h2><p>Você aprendeu a liberar uma grande quantidade de Qi para se proteger de danos externos. Ao ativar essa característica e no início de cada um de seus turnos, você consome 1 Ponto de Ação [⬢] e 2 PQ para aumentar sua Classe de Resistência em +2 de CR e +1 para cada Ponto de Ação e 1 PQ adicional que você escolher consumir.</p>"
  },
  {
    "id": "manipulacao-eficiente",
    "name": "Manipulação Eficiente",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [
      "Gestos: Flecha e Linha"
    ],
    "requirementRules": {
      "type": "node",
      "id": "gestos-flecha-e-linha"
    },
    "basic": false,
    "description": "<h2>Manipulação Eficiente</h2><p><strong>Requisito:</strong> Gestos: Flecha e Linha</p><p>Ao executar uma técnica, você gastar um Ponto de Ação [⬢] adicional e 2 PQ para ativar um dos seguintes efeitos:</p><ul><li>Você pode impor duas desvantagens em uma Salvaguarda contra a técnica;</li><li>Você pode receber duas vantagens na rolagem de acerto da técnica.</li></ul>"
  },
  {
    "id": "foco-multiplo",
    "name": "Foco Múltiplo",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [
      "Escudo de Qi",
      "Manipulação Eficiente"
    ],
    "requirementRules": {
      "type": "and",
      "rules": [
        {
          "type": "node",
          "id": "escudo-de-qi"
        },
        {
          "type": "node",
          "id": "manipulacao-eficiente"
        }
      ]
    },
    "basic": false,
    "pending": [
      "O texto chama os Pontos de Armadura de Pontos de Energia na última frase; não criar um recurso adicional."
    ],
    "description": "<h2>Foco Múltiplo</h2><p><strong>Requisito:</strong> Escudo de Qi, Manipulação Eficiente</p><p>Seu controle sobre a Qi cresce de forma exponencial, aumentando sua capacidade de causar ou resistir a danos.</p><ul><li>Foco Ofensivo: Suas jogadas de ataque (Comuns) recebem 1d4 de dano adicional;</li><li>Foco Defensivo: Você envolve seu corpo com uma camada extra de Qi, criando 20 Pontos de Armadura. Esses pontos funcionam da mesma forma que os Pontos de Vida Temporários, com as seguintes diferenças:</li><li>Podem coexistir com PV temporários;</li><li>Sempre são consumidos antes dos PV temporários;</li><li>Duram apenas até o fim do encontro.</li></ul><p>Enquanto esses Pontos de Energia existirem, você reduz todo dano sofrido pela metade (mínimo 1). Essa redução é sempre aplicada por último.</p>"
  },
  {
    "id": "gestos-cone-e-leque",
    "name": "Gestos: Cone e Leque",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [
      "Gestos: Flecha e Linha"
    ],
    "requirementRules": {
      "type": "node",
      "id": "gestos-flecha-e-linha"
    },
    "basic": false,
    "description": "<h2>Gestos: Cone e Leque</h2><p><strong>Requisito:</strong> Gestos: Flecha e Linha.</p><p>Você aprende a utilizar os gestos de Cone e Leque na ativação de suas Técnicas a distância, modificando seu alcance. Ao gastar 1 Ponto de Ação [⬢] e uma quantidade de PQ igual à ordem da habilidade (1º Manifestação – 1 PQ | 2º Manifestação – 2 PQ | 3º Manifestação – 3 PQ), você pode modificar o alcance de sua Técnica para uma das seguintes opções:</p><ul><li>Leque: Você faz com que seu ataque atinja uma área de 180° à sua frente. Todas as criaturas na área devem realizar uma Salvaguarda de Agilidade, ou a Salvaguarda original da Técnica. Em caso de falha, sofrem todo o dano; em caso de sucesso, sofrem metade. O dado de dano da Técnica passa a ser d6.</li><li>Cone: Você faz com que seu ataque atinja uma área de 55° à sua frente. Todas as criaturas na área devem realizar uma Salvaguarda de Agilidade, ou a Salvaguarda original da Técnica. Em caso de falha, sofrem todo o dano; em caso de sucesso, sofrem metade. O dado de dano da Técnica passa a ser d6.</li></ul><h3>ESTATÍSTICAS DAS MANIFESTAÇÕES</h3><table><tbody><tr><th>Ordem</th><th>Leque</th><th>Cone</th></tr><tr><td>1º Manifestação</td><td>6 metros</td><td>10 metros</td></tr><tr><td>2º Manifestação</td><td>12 metros</td><td>20 metros</td></tr><tr><td>3º Manifestação</td><td>18 metros</td><td>30 metros</td></tr></tbody></table><p>Caso a técnica modificada seja uma “Flecha” e tenha uma condição, você paga 2 PQ adicionais para modifica-la para o modelo de Leque ou Cone.</p><ul><li>Os gestos só funcionam em técnicas que causam dano e/ou condições negativas.</li></ul>"
  },
  {
    "id": "gestos-raio-e-emanacao",
    "name": "Gestos: Raio e Emanação",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [
      "Gestos: Cone e Leque"
    ],
    "requirementRules": {
      "type": "node",
      "id": "gestos-cone-e-leque"
    },
    "basic": false,
    "pending": [
      "A última frase cita Leque ou Cone, embora este talento trate de Raio e Emanação; confirmar a referência antes de automatizar a sobretaxa de 3 PQ."
    ],
    "description": "<h2>Gestos: Raio e Emanação</h2><p><strong>Requisito:</strong> Gestos: Cone e Leque</p><p>Você aprende a utilizar os gestos de Raio e Emanação na ativação de suas Técnicas, modificando seu alcance. Ao gastar 1 Ponto de Ação [⬢] e uma quantidade de PQ igual à ordem da habilidade (1º Manifestação – 1 PQ | 2º Manifestação – 2 PQ | 3º Manifestação – 3 PQ), você pode modificar o alcance de sua Técnica para uma das seguintes opções:</p><ul><li>Raio: Você lança sua Técnica dentro do alcance de Linha, fazendo com que ela atinja uma área ao redor do ponto de impacto. Todas as criaturas na área devem realizar uma Salvaguarda de Agilidade, ou a Salvaguarda original da Técnica. Em caso de falha, sofrem todo o dano; em caso de sucesso, sofrem metade. O dado de dano da Técnica passa a ser d6.</li><li>Emanação: Você faz com que sua Técnica atinja toda a área ao seu redor. Todas as criaturas na área devem realizar uma Salvaguarda de Agilidade, ou a Salvaguarda original da Técnica. Em caso de falha, sofrem todo o dano; em caso de sucesso, sofrem metade. O dado de dano da Técnica passa a ser d6.</li></ul><h3>ESTATÍSTICAS DAS MANIFESTAÇÕES</h3><table><tbody><tr><th>Ordem</th><th>Raio (metros)</th><th>Emanação</th></tr><tr><td>1º Manifestação</td><td>15 de Linha e 5 de Raio</td><td>5 metros</td></tr><tr><td>2º Manifestação</td><td>25 de Linha e 10 de Raio</td><td>10 metros</td></tr><tr><td>3º Manifestação</td><td>35 de Linha e 15 de Raio</td><td>15 metros</td></tr></tbody></table><p>Caso a técnica modificada seja uma “Flecha” e tenha uma condição, você paga 3 PQ adicionais para modifica-la para o modelo de Leque ou Cone. Os gestos só funcionam em técnicas que causam dano e/ou condições negativas.</p>"
  },
  {
    "id": "aprimorar-alcance",
    "name": "Aprimorar Alcance",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [
      "Um gesto qualquer"
    ],
    "requirementRules": {
      "type": "anyGesture"
    },
    "basic": false,
    "description": "<h2>Aprimorar Alcance</h2><p><strong>Requisito:</strong> Um gesto qualquer</p><p>Ao executar uma Técnica, você pode gastar 1 PA para aumentar seu alcance, sem limite para a quantidade máxima de PA que pode ser utilizada dessa forma.</p><ul><li>Linha ou Flecha: Aumenta o alcance da Técnica em 3 metros adicionais.</li><li>Cone ou Leque: Aumenta o alcance da Técnica em 2 metros adicionais.</li><li>Raio ou Emanação: Aumenta o alcance da Técnica em 1 metro adicional.</li></ul>"
  },
  {
    "id": "manipulacao-rapida",
    "name": "Manipulação Rápida",
    "category": "Habilidades de Qi",
    "path": "Controle de Qi",
    "requirements": [
      "8 talentos de Qi quaisquer OU Aprimorar Alcance"
    ],
    "requirementRules": {
      "type": "or",
      "rules": [
        {
          "type": "count",
          "min": 8
        },
        {
          "type": "node",
          "id": "aprimorar-alcance"
        }
      ]
    },
    "basic": false,
    "manual": [
      "As manipulações são criadas com o Narrador; Redução de Potência é exemplo, não um talento separado."
    ],
    "pending": [
      "O exemplo exige Retaliação Rápida/Retalhação Rápida, que não é descrita neste anexo."
    ],
    "description": "<h2>Manipulação Rápida</h2><p><strong>Requisito:</strong> 8 talentos de Qi qualquer OU Aprimorar Alcance</p><p>Você dominou a manipulação das suas técnicas a tal nível, que você pode alterar quase que livremente suas técnicas para desencadearem efeitos diferentes.</p><p>Ao alterar a circulação de Qi usada pela técnica, você pode modifica-la para receber efeitos em troca de outro aspecto dela. Por exemplo, você pode reduzir o dano de uma Técnica em 2 dados para adicionar a ela uma Condição de até 2 PA.</p><p>Independentemente do efeito escolhido, você pode criar quantas manipulações desejar junto ao seu Narrador. No entanto, só pode manter dois deles preparados ao final de cada Descanso Longo, podendo alterá-los sempre que realizar um novo Descanso Longo.</p><h3>REDUÇÃO DE POTÊNCIA</h3><p>Você reduz o dano final da sua “Retaliação Rápida” em 2 dados de dano para impor a condição “Sangramento” se a criatura falhar em uma Salvaguarda de Constituição.</p><table><tbody><tr><td>Duração</td><td>Instantâneo</td></tr><tr><td>Requisito</td><td>Retalhação Rápida</td></tr></tbody></table><p>Manipulação Rápida</p><p>A cada 3 Ranks de Cultivo, você recebe um espaço de manipulação adicional, podendo manter mais delas preparadas simultaneamente.</p>"
  },
  {
    "id": "corrupcao",
    "name": "Corrupção",
    "category": "Habilidades de Qi",
    "path": "Cultivo Demoníaco",
    "requirements": [],
    "basic": false,
    "manual": [
      "Exige seguir o cultivo demoníaco e cultivar um manual demoníaco. Escolha um dos dois caminhos; não aplique ambos os bônus."
    ],
    "description": "<h2>Corrupção</h2><p>Ao cultivar um manual demoníaco, o cultivador pode escolher entre duas opções igualmente perversas:</p><ul><li>Caminho do Devorador: O cultivador demoníaco refina o corpo de inocentes e de seus inimigos para devora-los, seja através de um banquete ou transformando em pílulas. Um cultivador demoníaco nesse caminho recebe 4 Pontos de Qi Base adicional.</li><li>Caminho do Abate: O cultivador demoníaco precisa matar o maior número de pessoas possíveis para formar sua base de cultivo. Um cultivador demoníaco nesse caminho é tomado por uma sede de sangue e sempre irá matar seus inimigos. Seus Pontos de Vida Base aumentam em +2.</li></ul>"
  },
  {
    "id": "qi-demoniaco",
    "name": "Qi Demoníaco",
    "category": "Habilidades de Qi",
    "path": "Cultivo Demoníaco",
    "requirements": [
      "Corrupção"
    ],
    "requirementRules": {
      "type": "node",
      "id": "corrupcao"
    },
    "basic": false,
    "description": "<h2>Qi Demoníaco</h2><p><strong>Requisito:</strong> Corrupção</p><p>Seu Qi é muito mais poderoso que o normal devido as suas artes demoníacas. No fim de cada um de seus turnos, você recebe 1 Ponto de Ação [⬢] que deve ser usado especificamente para habilidades e técnicas com a palavra-chave “Reação”.</p>"
  },
  {
    "id": "estimulo-de-sangue",
    "name": "Estímulo de Sangue",
    "category": "Habilidades de Qi",
    "path": "Cultivo Demoníaco",
    "requirements": [
      "Qi Demoníaco"
    ],
    "requirementRules": {
      "type": "node",
      "id": "qi-demoniaco"
    },
    "basic": false,
    "aliases": [
      "Estimulo de Sangue"
    ],
    "manual": [
      "O consumo de Constituição é recuperado após um ano mantendo o caminho demoníaco indicado."
    ],
    "description": "<h2>Estímulo de Sangue</h2><p><strong>Requisito:</strong> Qi Demoníaco</p><p>Você pode queimar sua vitalidade em troca de uma grande quantidade de poder por um curto período de tempo. Ao consumir 1 Ponto de Constituição, você aumenta o dano final de suas técnicas em 50% e reduz o custo de ação de todas elas em 1 Ponto de Ação [⬢], até o mínimo de 1 pelos próximos 10 minutos.</p><ul><li>Você deve manter seu cultivo demoníaco do Caminho do Devorador ou Abate por 1 ano para recuperar o Ponto de Constituição consumido.</li></ul>"
  },
  {
    "id": "devorador-demoniaco",
    "name": "Devorador Demoníaco",
    "category": "Habilidades de Qi",
    "path": "Cultivo Demoníaco",
    "requirements": [
      "Estímulo de Sangue"
    ],
    "requirementRules": {
      "type": "node",
      "id": "estimulo-de-sangue"
    },
    "basic": false,
    "description": "<h2>Devorador Demoníaco</h2><p><strong>Requisito:</strong> Estimulo de Sangue</p><p>O caminho demoníaco é marcado pela carnificina, instigando você a consumir os ossos de seus inimigos para avançar nas artes demoníacas.</p><ul><li>Você pode utilizar Núcleos Demoníacos como Pedras de Essência, mas a essência contida neles é consumida 10 vezes mais rápido do que a de uma Pedra de Essência comum.</li><li>Cada Núcleo Demoníaco possui uma quantidade de essência equivalente àquela que o demônio havia acumulado até o momento de sua morte.</li><li>Caso o núcleo pertença a um demônio de Reino de Cultivo igual ao seu, você deve consumir 2 PEQ para obter 1 unidade de essência. Essa proporção dobra para cada Rank de diferença abaixo do seu, seguindo a progressão de 4:1, 8:1, 16:1 e assim sucessivamente.</li></ul>"
  },
  {
    "id": "refinar-constituicao",
    "name": "Refinar Constituição",
    "category": "Habilidades de Qi",
    "path": "Cultivo Demoníaco",
    "requirements": [
      "Devorador Demoníaco"
    ],
    "requirementRules": {
      "type": "node",
      "id": "devorador-demoniaco"
    },
    "basic": false,
    "manual": [
      "A Constituição descrita possui Rank próprio; confirme com o Narrador qual Constituição será refinada."
    ],
    "description": "<h2>Refinar Constituição</h2><p><strong>Requisito:</strong> Devorador Demoníaco</p><p>O caminho demoníaco é repleto de artes tentadoras. Entre elas, você possui a capacidade de refinar a constituição de outras criaturas, um processo que exige uma determinada quantidade de tempo. O tempo é definido pelo Rank da Constituição, demorando 1 ano para uma constituição de um Rank acima, multiplicando o tempo por 10 para cada Rank de diferença além disso.</p><p>Ao refinar a constituição de uma criatura cujo Rank de Constituição seja superior ao seu, você pode elevar o nível da sua própria Constituição, ignorando todos os demais requisitos normalmente necessários para sua evolução.</p>"
  },
  {
    "id": "lorde-demoniaco",
    "name": "Lorde Demoníaco",
    "category": "Habilidades de Qi",
    "path": "Cultivo Demoníaco",
    "requirements": [
      "Refinar Constituição"
    ],
    "requirementRules": {
      "type": "node",
      "id": "refinar-constituicao"
    },
    "basic": false,
    "description": "<h2>Lorde Demoníaco</h2><p><strong>Requisito:</strong> Refinar Constituição</p><p>Você é capaz de emitir uma aura demoníaca extremamente poderosa, capaz de suprimir tanto cultivadores demoníacos quanto demônios. Sua presença inspira um medo avassalador, tornando suas ordens extremamente difíceis de ignorar.</p><p>Você pode comandar cultivadores demoníacos de Rank inferior ao seu e demônios que estejam pelo menos 2 Ranks abaixo do seu, submetendo-os à sua vontade através do medo.</p>"
  },
  {
    "id": "passo-esguio",
    "name": "Passo Esguio",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [],
    "basic": false,
    "description": "<h2>Passo Esguio</h2><p>Como uma Reação a uma Ação que tenha você como alvo, você pode gastar 1 Ponto de Ação [⬢] e 2 Pontos de Qi para se mover até metade do seu Deslocamento.</p><p>Caso esse movimento faça com que você saia do alcance da Ação, ela é cancelada sem consumir nada.</p>"
  },
  {
    "id": "punho-devastador",
    "name": "Punho Devastador",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [],
    "basic": false,
    "description": "<h2>Punho Devastador</h2><p>Ao causar um Acerto Crítico, você causa dano adicional igual ao seu Atributo Principal, e a criatura deve realizar uma Salvaguarda de Vontade. Em caso de falha, ela recebe a condição “Exposto”.</p>"
  },
  {
    "id": "entrada-impactante",
    "name": "Entrada Impactante",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Punho Devastador"
    ],
    "requirementRules": {
      "type": "node",
      "id": "punho-devastador"
    },
    "basic": false,
    "description": "<h2>Entrada Impactante</h2><p><strong>Requisito:</strong> Punho Devastador</p><p>No início de cada encontro, ao chegar ao seu turno, você pode escolher uma criatura posicionada abaixo de você na ordem de Iniciativa e se mover em sua direção, desferindo um golpe devastador que aplica automaticamente a condição Atordoado ao alvo.</p><p>Além disso, você sempre possui 1 Vantagem contra criaturas posicionadas abaixo de você na Iniciativa Dinâmica.</p>"
  },
  {
    "id": "punho-de-aco",
    "name": "Punho de Aço",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Entrada Impactante"
    ],
    "requirementRules": {
      "type": "node",
      "id": "entrada-impactante"
    },
    "basic": false,
    "description": "<h2>Punho de Aço</h2><p><strong>Requisito:</strong> Entrada Impactante</p><p>Você treinou seus golpes a ponto de extrair o máximo potencial de cada ataque. O dano base de seus ataques desarmados passa a ser d8. Caso seu dano natural já seja d8 ou superior, ele aumenta em um passo de dano, até o máximo de d12.</p><p>Se seu dano natural já for d12, você recebe +1 de dano em vez de aumentar o dado.</p>"
  },
  {
    "id": "ataque-potencializado",
    "name": "Ataque Potencializado",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Entrada Impactante"
    ],
    "requirementRules": {
      "type": "node",
      "id": "entrada-impactante"
    },
    "basic": false,
    "description": "<h2>Ataque Potencializado</h2><p><strong>Requisito:</strong> Entrada Impactante</p><p>Você aprendeu a atingir os pontos fracos de seus inimigos com eficiência, aumentando o dano causado por seus ataques. Suas Rolagens de Ataque Comuns causam 1d4 de dano adicional.</p>"
  },
  {
    "id": "ira-do-berserker",
    "name": "Ira do Berserker",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Ataque Potencializado"
    ],
    "requirementRules": {
      "type": "node",
      "id": "ataque-potencializado"
    },
    "basic": false,
    "description": "<h2>Ira do Berserker</h2><p><strong>Requisito:</strong> Ataque Potencializado</p><p>A cada 25 Pontos de Vida perdidos, você recebe +1 de dano adicional em suas Rolagens de Ataque, sejam Comuns ou de Técnica, até um bônus máximo igual ao seu Atributo Principal.</p><p>Esse bônus é reduzido na mesma proporção conforme você recupera Pontos de Vida.</p>"
  },
  {
    "id": "potencializacao-extrema",
    "name": "Potencialização Extrema",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Ira do Berserker"
    ],
    "requirementRules": {
      "type": "node",
      "id": "ira-do-berserker"
    },
    "basic": false,
    "description": "<h2>Potencialização Extrema</h2><p><strong>Requisito:</strong> Ira do Berserker</p><p>Suas Rolagens de Ataque Comuns que obtenham um resultado natural entre 15 e 19 e não sejam consideradas um Acerto Crítico causam o valor máximo possível em todas as rolagens de dano.</p>"
  },
  {
    "id": "corpo-indestrutivel",
    "name": "Corpo Indestrutível",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Potencialização Extrema"
    ],
    "requirementRules": {
      "type": "node",
      "id": "potencializacao-extrema"
    },
    "basic": false,
    "description": "<h2>Corpo Indestrutível</h2><p><strong>Requisito:</strong> Potencialização Extrema</p><p>Uma vez por Descanso Longo, você pode negar o dano que sofreria, reduzindo-o a 0. Caso o dano seja superior a 160, você reduz esse dano em 160 e sofre normalmente apenas o valor excedente.</p>"
  },
  {
    "id": "ataque-cruel",
    "name": "Ataque Cruel",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Ira do Berserker"
    ],
    "requirementRules": {
      "type": "node",
      "id": "ira-do-berserker"
    },
    "basic": false,
    "description": "<h2>Ataque Cruel</h2><p><strong>Requisito:</strong> Ira do Berserker</p><p>Você reduz em 2 a margem necessária para obter um Acerto Crítico excedente com seus Ataques Comuns, passando de 10 para 8.</p>"
  },
  {
    "id": "movimento-instantaneo",
    "name": "Movimento Instantâneo",
    "category": "Adaptação Física",
    "path": "Corpo de Guerreiro",
    "requirements": [
      "Ataque Cruel ou Aceleração Súbita"
    ],
    "requirementRules": {
      "type": "or",
      "rules": [
        {
          "type": "node",
          "id": "ataque-cruel"
        },
        {
          "type": "node",
          "id": "aceleracao-subita"
        }
      ]
    },
    "basic": false,
    "paths": [
      "Corpo de Guerreiro",
      "Combate Veloz"
    ],
    "description": "<h2>Movimento Instantâneo</h2><p><strong>Requisito:</strong> Ataque Cruel ou Aceleração Súbita</p><p>Você pode utilizar seu Deslocamento para alcançar instantaneamente qualquer ponto que esteja dentro da distância que poderia percorrer normalmente, ignorando quaisquer Reações que seriam desencadeadas por esse movimento.</p><p>Caso se mova 5 metros ou mais dessa forma antes de realizar um ataque, essa rolagem de ataque recebe 2 vantagens.</p>"
  },
  {
    "id": "movimento-suave",
    "name": "Movimento Suave",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [],
    "basic": false,
    "description": "<h2>Movimento Suave</h2><p>Toda vez que você executa uma técnica, você pode se mover 5 metros em qualquer direção e 2 metros se for um ataque comum. Adicionalmente, toda vez que você usar uma reação, você impõe uma desvantagem em uma rolagem de acerto contra você.</p>"
  },
  {
    "id": "dispersar-forca",
    "name": "Dispersar Força",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Movimento Suave"
    ],
    "requirementRules": {
      "type": "node",
      "id": "movimento-suave"
    },
    "basic": false,
    "description": "<h2>Dispersar Força</h2><p><strong>Requisito:</strong> Movimento Suave</p><p>Quando você for alvo de uma jogada de ataque (Comum ou de Técnica), você pode gastar 1 Ponto de Ação [⬢] e 2 PQ balançar seus membros emitindo Qi para desviar parte do golpe, reduzindo 2d8 de dano.</p><p>Essa parte desviada pode ser enviada para uma criatura inimiga dentro do alcance do ataque do inimigo.</p>"
  },
  {
    "id": "evasao-de-contra-ataque",
    "name": "Evasão de Contra-Ataque",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Dispersar Força"
    ],
    "requirementRules": {
      "type": "node",
      "id": "dispersar-forca"
    },
    "basic": false,
    "pending": [
      "O custo de 1 PE por contra-ataque usa sigla ainda não esclarecida; não converter para Qi ou PA por suposição."
    ],
    "description": "<h2>Evasão de Contra-Ataque</h2><p><strong>Requisito:</strong> Dispersar força</p><p>Uma vez por turno de cada criatura, quando ela errar uma Rolagem de Ataque corpo a corpo, seja Comum ou de Técnica, que tenha você como alvo, você pode, como Reação, realizar uma Rolagem de Ataque Comum contra ela com seu Custo de Ação reduzido em 1 Ponto de Ação [⬢].</p><p>Cada ataque realizado dessa forma consome 1 PE.</p>"
  },
  {
    "id": "ataque-cadenciado",
    "name": "Ataque Cadenciado",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Evasão de Contra-Ataque"
    ],
    "requirementRules": {
      "type": "node",
      "id": "evasao-de-contra-ataque"
    },
    "basic": false,
    "description": "<h2>Ataque Cadenciado</h2><p><strong>Requisito:</strong> Evasão de Contra-Ataque</p><p>Quanto mais ataques você acerta, mais se entrega ao fervor da batalha. A cada ataque bem-sucedido contra uma criatura, você recebe +1 vantagem contra ela de forma cumulativa.</p><p>Esse efeito é reiniciado quando você erra uma Rolagem de Ataque ou muda de alvo.</p>"
  },
  {
    "id": "reutilizacao-de-energia",
    "name": "Reutilização de Energia",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Dispersar Força"
    ],
    "requirementRules": {
      "type": "node",
      "id": "dispersar-forca"
    },
    "basic": false,
    "description": "<h2>Reutilização de Energia</h2><p><strong>Requisito:</strong> Dispersar Força</p><p>Toda vez que você ativar o efeito do Dispersar Força com sucesso, você pode escolher receber um dos seguintes efeitos:</p><ul><li>Você impõe 2 desvantagens na próxima rolagem de acerto contra você;</li><li>Você recebe 2 vantagens na sua próxima Salvaguarda de Agilidade até o início do seu próximo turno;</li><li>Você recebe 1d4 de dano adicional na sua próxima jogada de ataque (Comum ou de Técnica).</li></ul>"
  },
  {
    "id": "recuperacao-de-foco",
    "name": "Recuperação de Foco",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Reutilização de Energia"
    ],
    "requirementRules": {
      "type": "node",
      "id": "reutilizacao-de-energia"
    },
    "basic": false,
    "description": "<h2>Recuperação de Foco</h2><p><strong>Requisito:</strong> Reutilização de Energia</p><p>Toda vez que você tiver um resultado de 20 natural em uma rolagem de ataque, você recupera 2 Pontos de Ação [⬢⬢] no fim do seu turno. Esse efeito não se soma.</p>"
  },
  {
    "id": "reflexo-aprimorado",
    "name": "Reflexo Aprimorado",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Recuperação de Foco"
    ],
    "requirementRules": {
      "type": "node",
      "id": "recuperacao-de-foco"
    },
    "basic": false,
    "pending": [
      "O texto não explicita o arredondamento da metade de Intelecto; usar a regra geral somente se ela estiver estabelecida."
    ],
    "description": "<h2>Reflexo Aprimorado</h2><p><strong>Requisito:</strong> Recuperação de Foco</p><p>Desde que você não esteja utilizando uma armadura média ou pesada, você recebe um bônus de classe de Resistência igual metade do seu atributo de Intelecto, desde que ele não seja seu atributo principal.</p>"
  },
  {
    "id": "aceleracao-subita",
    "name": "Aceleração Súbita",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Reflexo Aprimorado"
    ],
    "requirementRules": {
      "type": "node",
      "id": "reflexo-aprimorado"
    },
    "basic": false,
    "description": "<h2>Aceleração Súbita</h2><p><strong>Requisito:</strong> Reflexo Aprimorado</p><p>Sempre que ativar Reutilização de Energia, você pode gastar 1 Ponto de Ação [⬢] adicional ao realizar um ataque para se mover em alta velocidade e atingir todas as criaturas a até 5 metros do alvo inicial do ataque com o mesmo ataque.</p><p>O Ponto de Ação utilizado para ativar esta característica pode ser um dos recebidos por Recuperação de Foco.</p>"
  },
  {
    "id": "reativo",
    "name": "Reativo",
    "category": "Adaptação Física",
    "path": "Combate Veloz",
    "requirements": [
      "Aceleração Súbita"
    ],
    "requirementRules": {
      "type": "node",
      "id": "aceleracao-subita"
    },
    "basic": false,
    "description": "<h2>Reativo</h2><p><strong>Requisito:</strong> Aceleração Súbita</p><p>Uma vez por rodada, você pode ativar uma habilidade, característica ou técnica com palavra-chave de “Reação” consumindo 1 Ponto de Ação [⬢] a menos, mas apenas em reações contra ataques, condições e efeitos direcionados a você.</p>"
  },
  {
    "id": "velocidade-anormal",
    "name": "Velocidade Anormal",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "Forjando do Corpo"
    ],
    "requirementRules": {
      "type": "body",
      "min": 1
    },
    "basic": false,
    "description": "<h2>Velocidade Anormal</h2><p><strong>Requisito:</strong> Forjando do Corpo</p><p>Ao adquirir essa habilidade, seu deslocamento base se torna 15 metros.</p>"
  },
  {
    "id": "lanca-destruidora",
    "name": "Lança Destruidora",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "Temperando a Medula"
    ],
    "requirementRules": {
      "type": "body",
      "min": 2
    },
    "basic": false,
    "description": "<h2>Lança Destruidora</h2><p><strong>Requisito:</strong> Temperando a Medula</p><p>Ao término do cálculo de dano causado por uma Rolagem de Ataque ou Técnica sua, caso uma ou mais criaturas permaneçam com uma quantidade de Pontos de Vida igual ou inferior ao seu Nível de Personagem, elas sofrem o dano necessário para terem seus Pontos de Vida reduzidos a 0.</p><p>Sempre que uma criatura for derrotada por esta característica, o limite utilizado para reduzir os Pontos de Vida a 0 aumenta em +5, até um máximo de +20. Esse bônus permanece ativo até o fim do encontro.</p>"
  },
  {
    "id": "corpo-endurecido",
    "name": "Corpo Endurecido",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "1º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 3
    },
    "basic": false,
    "description": "<h2>Corpo Endurecido</h2><p><strong>Requisito:</strong> 1º Portão</p><p>Seu corpo se tornou extremamente resistente a todos os tipos de feridas debilitantes, dessa forma, você não acumula Pontos de Ferida por acertos críticos ou outros meios, os recebendo apenas ao sofrer dano com 0 Pontos de Vida.</p>"
  },
  {
    "id": "destruidor-de-exercitos",
    "name": "Destruidor de Exércitos",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "2º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 4
    },
    "basic": false,
    "description": "<h2>Destruidor de Exércitos</h2><p><strong>Requisito:</strong> 2º Portão</p><p>Sempre que realizar um Ataque Comum ou de Técnica, você pode gastar 2 Pontos de Ação [⬢⬢] adicionais e 2 PQ para transformar o ataque em uma poderosa pressão de ar, fazendo com que ele atinja todas as criaturas em um Cone de 25 metros.</p><p>Caso utilize esse efeito em uma Técnica, ela perde 1 passo de dano e causa 1 Dado de Dano a menos.</p>"
  },
  {
    "id": "velocidade-descomunal",
    "name": "Velocidade Descomunal",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "3º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 5
    },
    "basic": false,
    "description": "<h2>Velocidade Descomunal</h2><p><strong>Requisito:</strong> 3º Portão</p><p>Ao executar uma Técnica corpo a corpo ou à distância, você pode escolher aparecer instantaneamente no limite de seu alcance ao final da execução.</p><p>No caso de Técnicas de Toque, você aparece ao lado do alvo, podendo se deslocar até 10 metros no 1º Grau, com 5 metros adicionais para cada Grau acima do primeiro.</p>"
  },
  {
    "id": "defesa-absoluta",
    "name": "Defesa Absoluta",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "4º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 6
    },
    "basic": false,
    "description": "<h2>Defesa Absoluta</h2><p><strong>Requisito:</strong> 4º Portão</p><p>Você recebe imunidade a dano de criaturas com Rank de Cultivo de 2 ou mais abaixo do seu.</p>"
  },
  {
    "id": "corpo-fechado",
    "name": "Corpo Fechado",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "5º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 7
    },
    "basic": false,
    "description": "<h2>Corpo Fechado</h2><p><strong>Requisito:</strong> 5º Portão</p><p>Você recebe Pontos de Proficiência em Salvaguardas suficientes para elevar até a progressão “Especialista” todas as Salvaguardas que estiverem abaixo desse nível. Se você já tiver no Especialista em um, você pode escolher uma única Salvaguarda para virar “Mestre”.</p>"
  },
  {
    "id": "resistencia-superior",
    "name": "Resistência Superior",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "6º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 8
    },
    "basic": false,
    "description": "<h2>Resistência Superior</h2><p><strong>Requisito:</strong> 6º Portão</p><p>Você recebe 2 Pontos de Resistência a todos os tipos de dano. No início de cada um de seus turnos, você recebe 2 Pontos de Resistência adicionais até um máximo igual seu nível de personagem.</p>"
  },
  {
    "id": "regeneracao-acelerada",
    "name": "Regeneração Acelerada",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "7º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 9
    },
    "basic": false,
    "description": "<h2>Regeneração Acelerada</h2><p><strong>Requisito:</strong> 7º Portão</p><p>Enquanto estiver em combate, você recupera uma quantidade de Pontos de Vida igual ao seu valor de Constituição no início de cada um de seus Turnos. Esse efeito é encerrado caso seus Pontos de Vida sejam reduzidos a 0.</p><p>Fora de combate, você recupera 1 Ponto de Vida a cada 6 segundos.</p>"
  },
  {
    "id": "corpo-perfeito",
    "name": "Corpo Perfeito",
    "category": "Habilidades Especiais",
    "path": "Cultivo do Corpo",
    "requirements": [
      "8º Portão"
    ],
    "requirementRules": {
      "type": "body",
      "min": 10
    },
    "basic": false,
    "pending": [
      "A manutenção de Acelerado usa 2 PE por turno, sigla ainda não esclarecida."
    ],
    "description": "<h2>Corpo Perfeito</h2><p><strong>Requisito:</strong> 8º Portão</p><p>Todos os seus ataques (Comuns) passam a causar 2d8 de dano no lugar do original, independente da arma. Você também recebe as seguintes características adicionais:</p><ul><li>Você pode usar qualquer técnica ou ataque (Comum) como Reação ao consumir um Ponto de Ação [⬢] adicional;</li><li>Enquanto dentro de combate, você pode gastar 6 Pontos de Ação na ativação e 2 PE no início de cada um de seus turnos para receber a condição “Acelerado” por quanto tempo desejar.</li></ul>"
  },
  {
    "id": "protecao-da-alma",
    "name": "Proteção da Alma",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "Avatar da Alma"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 1
    },
    "basic": false,
    "description": "<h2>Proteção da Alma</h2><p><strong>Requisito:</strong> Avatar da Alma</p><p>No início de cada dia, você pode criar uma ressonância perfeita entre seu corpo e alma, protegendo os dois de forma simultânea. Você pode gastar 2 PQ para receber 5 Pontos de Vida temporários, até um máximo igual a 5 vezes o seu nível de cultivo.</p>"
  },
  {
    "id": "fonte-de-poder",
    "name": "Fonte de Poder",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "1º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 2
    },
    "basic": false,
    "pending": [
      "O texto não explicita o arredondamento da metade de Presença."
    ],
    "description": "<h2>Fonte de Poder</h2><p><strong>Requisito:</strong> 1º Revolução</p><p>Você aprende a canalizar o poder da sua alma para atacar de forma um pouco mais efetiva. Você pode adicionar metade do seu atributo de Presença em suas rolagens de dano.</p>"
  },
  {
    "id": "leitura-perfeita",
    "name": "Leitura Perfeita",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "2º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 3
    },
    "basic": false,
    "description": "<h2>Leitura Perfeita</h2><p><strong>Requisito:</strong> 2º Revolução</p><p>Você aprendeu a ler e influenciar o Qi e a Alma das criaturas inimigas por meio de sua própria intenção, transformando o combate em uma dança de pura maestria ao criar fintas tão precisas que enganam completamente o adversário.</p><p>Desde que você não esteja utilizando nenhuma armadura Média ou Pesada, você recebe um bônus em sua Classe de Resistência igual à metade do seu Atributo de Presença, arredondado para baixo. Essa característica não soma com similares (que adicionam metade do atributo a CR).</p>"
  },
  {
    "id": "clone-elemental",
    "name": "Clone Elemental",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "3º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 4
    },
    "basic": false,
    "manual": [
      "As estatísticas do clone e a quantidade de Qi transferida exigem resolução com o Narrador."
    ],
    "description": "<h2>Clone Elemental</h2><p><strong>Requisito:</strong> 3º Revolução</p><p>Você pode gastar 6 Pontos de Ação [⬢⬢⬢⬢⬢⬢] e 20 PQ para colocar seu Avatar dentro de um corpo feito de Qi Elemental. Dessa forma, você ganha um corpo elemental perfeito para lutar ao seu lado, mas ele não pode recuperar vida e tem uma quantidade de Qi igual ao que você escolher passar para ele.</p><p>O Corpo Elemental causa os tipos de dano que puderem ser causados com seu corpo elemental e todas as técnicas marciais tem seu dano alterado para o do corpo elemental.</p>"
  },
  {
    "id": "analise-constante",
    "name": "Análise Constante",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "4º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 5
    },
    "basic": false,
    "aliases": [
      "Análise Cosntante"
    ],
    "description": "<h2>Análise Constante</h2><p><strong>Requisito:</strong> 4º Revolução</p><p>Sua sensibilidade à alma e ao Qi é superior à de outras criaturas. Ao gastar 2 Pontos de Ação [⬢⬢] e 5 PQ, você pode escolher uma criatura no campo de batalha e analisá-la continuamente. Sempre que essa criatura estiver abaixo de você na ordem de Iniciativa, você recebe 2 vantagens contra ela. Esse efeito dura 1 minuto.</p>"
  },
  {
    "id": "pressao-espiritual",
    "name": "Pressão Espiritual",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "5º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 6
    },
    "basic": false,
    "pending": [
      "O custo diz 3 Pontos de Ação e 4 PA; confirmar a sigla/unidade da segunda parcela antes de automatizar."
    ],
    "description": "<h2>Pressão Espiritual</h2><p><strong>Requisito:</strong> 5º Revolução</p><p>Você aprendeu a canalizar sua Presença de forma a manifestar sua pressão espiritual de forma devastadora. Ao gastar 3 Pontos de Ação [⬢⬢⬢] e 4 PA, você pode expandir sua energia da alma em uma área de 10 metros ao seu redor, emitindo uma pressão tão intensa que todas as criaturas na área devem realizar uma Salvaguarda de Presença.</p><p>Em caso de falha, elas sofrem 3d6 + seu Atributo de Presença em Pontos de Dano Psíquico e recebem a condição “Exposto” até o fim do próximo Turno delas.</p><p>O dano aumenta em 1d6 para cada Nível que você possua acima da criatura afetada.</p>"
  },
  {
    "id": "agressao-da-alma",
    "name": "Agressão da Alma",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "6º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 7
    },
    "basic": false,
    "pending": [
      "O custo diz 3 Pontos de Ação e 4 PA; confirmar a sigla/unidade da segunda parcela antes de automatizar."
    ],
    "manual": [
      "O dano é aplicado diretamente em Feridas, exigindo a resolução específica desse recurso."
    ],
    "description": "<h2>Agressão da Alma</h2><p><strong>Requisito:</strong> 6º Revolução</p><p>Você pode comprimi toda sua força da alma em um único ponto antes de disparar contra a criatura inimiga. Ao usar 3 Pontos de Ação [⬢⬢⬢] e 4 PA, você realiza um ataque contra uma criatura a até 20 metros de distância, causando 5d8 de dano diretamente no valor de Ferida do alvo. Se a criatura estiver abaixo de você na iniciativa, você recebe 4 vantagens contra ela.</p><p>Essa característica é considerada uma técnica e pode receber todos os benefícios e ser afetada por características que afetaria uma.</p>"
  },
  {
    "id": "relacao-simbiotica",
    "name": "Relação Simbiótica",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "7º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 8
    },
    "basic": false,
    "description": "<h2>Relação Simbiótica</h2><p><strong>Requisito:</strong> 7º Revolução</p><p>Você se torna capaz de entrar no corpo de uma criatura voluntária ou muito mais fraca que você (2 ranks abaixo ou mais) e dividir o corpo dela. Você não tem nenhum controle sobre o corpo, mas consegue manter sua alma por tempo indefinido dessa forma até que consiga um novo corpo.</p>"
  },
  {
    "id": "detonacao-da-alma",
    "name": "Detonação da Alma",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "8º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 9
    },
    "basic": false,
    "pending": [
      "A expressão valor de Ferida -1 não identifica se usa Feridas atuais ou um máximo; confirmar antes de calcular automaticamente."
    ],
    "manual": [
      "A vida se torna 1 após a detonação; resolva também as consequências das Feridas com o Narrador."
    ],
    "description": "<h2>Detonação da Alma</h2><p><strong>Requisito:</strong> 8º Revolução</p><p>Sua alma se tornou tão poderosa que ela carrega uma quantidade assustadora de energia, fazendo com que a detonar desencadeie uma força catastrófica. Ao usar 4 Pontos de Ação [⬢⬢⬢⬢], você pode explodir sua alma, causando seu valor de Ferida -1 como dano de Energia em todas as criaturas a 30 metros de distância + 5 metros para cada Rank de cultivo seu. Todas elas devem realizar uma Salvaguarda de Reflexo, sofrendo todo dano se falharem ou metade se obtiverem sucesso.</p><p>Após isso, como consequência pelas suas feridas, seu valor de vida se torna 1.</p>"
  },
  {
    "id": "criacao-de-corpo-fisico",
    "name": "Criação de Corpo Físico",
    "category": "Habilidades Especiais",
    "path": "Cultivo da Alma",
    "requirements": [
      "9º Revolução"
    ],
    "requirementRules": {
      "type": "soul",
      "min": 10
    },
    "basic": false,
    "description": "<h2>Criação de Corpo Físico</h2><p><strong>Requisito:</strong> 9º Revolução</p><p>Você se torna capaz de criar um corpo físico perfeito usando sua alma como molde. Ao gastar 30 dias, você pode sacrificar 1 Ponto de Constituição para formar um novo corpo físico. Você recupera o Ponto de Constituição sacrificado após 10 anos.</p>"
  },
  {
    "id": "intencao-belica",
    "name": "Intenção Bélica",
    "category": "Imortalidade",
    "path": "Reino da Imortalidade",
    "requirements": [
      "Transformação Divina"
    ],
    "requirementRules": {
      "type": "rank",
      "min": 5
    },
    "basic": false,
    "description": "<h2>Intenção Bélica</h2><p><strong>Requisito:</strong> Transformação Divina</p><p>A intenção de uma arma é quando sua ressonância com ela se torna tão grande que seu próprio Qi recebe propriedades da arma que você utiliza. A partir desse ponto, a arma em si serve apenas para aumentar seu poder, mas se torna totalmente desnecessária, seu próprio Qi se torna tão poderoso quanto um tesouro. Você recebe as seguintes características:</p><ul><li>Seu dano é sempre igual um tesouro de qualidade referente ao seu Rank de Cultivo;</li><li>Seus ataques (Comuns) podem ser tratados como técnicas para fins de efeitos;</li><li>Você pode emitir seus ataques a até 15 metros de distância ao consumir 1 Ponto de Qi;</li><li>Usar uma arma igual da sua intenção faz com que seus ataques recebam 1 dado de dano adicional.</li></ul>"
  },
  {
    "id": "encarnacao-de-cultivo",
    "name": "Encarnação de Cultivo",
    "category": "Imortalidade",
    "path": "Reino da Imortalidade",
    "requirements": [
      "Lorde Divino"
    ],
    "requirementRules": {
      "type": "rank",
      "min": 6
    },
    "basic": false,
    "manual": [
      "Você pode manter até 3 avatares criados simultaneamente."
    ],
    "description": "<h2>Encarnação de Cultivo</h2><p><strong>Requisito:</strong> Lorde Divino</p><p>Ao sacrificar 1 nível do seu Cultivo, você pode criar um avatar que pode ser da Formação de Núcleo até 2 Ranks abaixo do seu nível de Cultivo atual. O avatar possui 25 Pontos de Vida para cada Rank de cultivo que ele possuir, a quantidade de Qi referente ao Rank e pode utilizar seus Conceitos com a mesma proficiência, mas todas as outras estatísticas é a do Rank respectivo para baixo e não pode recuperar Qi de nenhuma maneira. Se o avatar não for destruído e você absorve-lo para dentro de seu corpo novamente, você recupera o nível de cultivo gasto.</p><p>Você só pode ter 3 avatares criados por vez.</p>"
  },
  {
    "id": "forca-transcendente-divina",
    "name": "Força Transcendente Divina",
    "category": "Imortalidade",
    "path": "Reino da Imortalidade",
    "requirements": [
      "Lorde Sagrado"
    ],
    "requirementRules": {
      "type": "rank",
      "min": 7
    },
    "basic": false,
    "description": "<h2>Força Transcendente Divina</h2><p><strong>Requisito:</strong> Lorde Sagrado</p><p>A partir do Rank de Lorde Sagrado, os jogadores podem começar a desenvolver sua própria Força Transcendente Divina, um Manual de Combate exclusivo de Rank Supremo.</p><p>Inicialmente, ela se manifesta em sua forma elementar, com estatísticas equivalentes às de um Manual de Rank Céu. Ao alcançar o Rank de Imperador Sagrado, ela evolui um Rank, atingindo finalmente o Rank Supremo quando o personagem alcança o Rank Empírico, momento em que seu desenvolvimento chega ao limite.</p>"
  },
  {
    "id": "criacao-da-lei",
    "name": "Criação da Lei",
    "category": "Imortalidade",
    "path": "Reino da Imortalidade",
    "requirements": [
      "Empírico"
    ],
    "requirementRules": {
      "type": "rank",
      "min": 9
    },
    "basic": false,
    "description": "<h2>Criação da Lei</h2><p><strong>Requisito:</strong> Empírico</p><p>Sua ultima habilidade permite que você crie uma lei própria. Ela pode ser algo totalmente novo ou baseado em um dos elementos que você já atingiu o 10º nível. Uma lei funciona como uma manifestação separada do seu manual, possui 35 Pontos de Qi para criação, recebendo as mesmas estatísticas de uma terceira manifestação.</p>"
  }
];

// The content factory accepts the explicit HTML alias; both fields carry the same authored text.
for (const talent of QI_TALENTS) talent.descriptionHTML = talent.description;
