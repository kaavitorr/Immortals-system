/** Antecedentes enviados pelo autor de Immortals Legacy. Valores em PO. */
export const WUXIA_BACKGROUNDS = [
  {
    "key": "acompanhante",
    "name": "Acompanhante",
    "description": "Um acompanhante é aquele que tem como trabalho entreter as pessoas e fazer companhia a figuras poderosas e influentes. Eles necessitam de uma aparência impecável e uma capacidade de interação anormal, assim como saber coletar informações sobre quem irão interagir, sempre prontos para lidar com pessoas da mais alta sociedade e mostrando o melhor dos modos.",
    "equipment": "Kit de Falsificação de até 50 PO e uma roupa de gala.",
    "startingGold": 80,
    "img": "icons/svg/card-hand.svg",
    "feature": {
      "name": "Amigos Influentes",
      "description": "Seu trabalho como acompanhante fez com que você conhecesse muitas pessoas importantes ao longo dos anos, permitindo que você possa entrar em contato com elas para se livrar de alguns problemas importunos, quando você estiver lidando com autoridades ou uma organização no mundo, você pode entrar em contato com uma dessas figuras. Você realiza um Teste de Sorte CD 15. Em caso de sucesso, você consegue a ajuda, e ganha um passe livre para usar contra aquela organização ou autoridades locais desde que você não se torne hostil.",
      "dc": 15
    }
  },
  {
    "key": "aprendiz-marcial",
    "name": "Aprendiz Marcial",
    "description": "Um aprendiz marcial é uma pessoa que teve iniciação em estilos de luta em algum dojo e aprendeu a se defender habilmente, ele conhece um número decente de técnicas básicas que ajudam a manter sua estamina. Os aprendizes marciais são muito capazes em combate de curta distância, permitindo que eles tenham confiança quando se trata de batalhas, desde que seja entre pessoas comuns.",
    "equipment": "Uma arma marcial à sua escolha.",
    "startingGold": 30,
    "img": "icons/svg/sword.svg",
    "feature": {
      "name": "Desafiar Seita",
      "description": "Sua honra como um artista marcial faz com que você seja aceito em seu meio com facilidade, podendo até desafiar membros de outras seitas em busca de demonstrar sua força ou pedir refúgio. Você pode realizar um Teste de Sorte CD 15. Em caso de sucesso, você consegue encontrar uma seita nobre (se possível) que irá acolhê-lo e até 4 criaturas amigáveis, mas os mantém na parte externa. Caso você desafie um dos membros mais fortes e vença, eles irão te dar um local de cultivo decente dentro da seita por até 10 dias. Essa habilidade pode ser usada uma vez por mês.",
      "dc": 15,
      "manualRecovery": "month"
    }
  },
  {
    "key": "ator",
    "name": "Ator",
    "description": "Um ator é aquele que faz do seu trabalho ser um rei da mentira, interpretar um personagem parecido ou totalmente diferente de você e convencer as massas de que aquilo é sua verdadeira personalidade. Quando um ator está fazendo seu trabalho com excelência, você raramente irá saber se ele está mentindo ou falando a verdade.",
    "equipment": "Dois kits de disfarce e túnicas luxuosas.",
    "startingGold": 100,
    "img": "icons/svg/mystery-man.svg",
    "feature": {
      "name": "Atuação Estupenda",
      "description": "Sua habilidade em atuar é algo de tirar o fôlego de alguns, fazendo com que você possa até convencer um vegano a comer carne caso esteja empenhado o suficiente. Desde que sua atuação (Interpretativa) seja aceitável, você pode rolar um Teste de Sorte CD 16. Em caso de sucesso, você passa automaticamente em um teste de interação social. Essa habilidade pode ser utilizada uma vez por dia, recuperando seu uso após o fim de um descanso longo.",
      "dc": 16,
      "recovery": "lr"
    }
  },
  {
    "key": "bastardo",
    "name": "Bastardo",
    "description": "Você é o bastardo de uma família de cultivadores extremamente influente, mas sua existência e de sua mãe é como uma mancha para essa família, que a matou, e agora sempre está a sua procura. O patriarca da família será sempre de Rank de Cultivo - Lorde Divino.",
    "equipment": "Um kit de disfarce e três conjuntos de roupas simples.",
    "startingGold": 120,
    "img": "icons/svg/cowled.svg",
    "feature": {
      "name": "Herança Roubada",
      "description": "Sua mãe conseguiu levá-lo para longe logo após seu nascimento, deixando uma carta explicando sua origem, junto de um Manual de Cultivo de Rank Céu roubado de sua família.\nCaso escolha integrar esse Manual de Rank Céu ao seu Manual Divino, você corre o risco de revelar sua localização sempre que utilizar suas habilidades.\nUma vez por dia, ao utilizar qualquer habilidade desse manual, exceto seu mantra de absorção de Qi, você deixa rastros de sua presença e deve rolar 1d12. Em um resultado de 8 ou menos, sua família encontra vestígios de sua existência naquele local e começa a caçá-lo.",
      "roll": "1d12",
      "recovery": "day"
    }
  },
  {
    "key": "cacador-de-recompensas",
    "name": "Caçador de Recompensas",
    "description": "Um caçador de recompensas é um profissional que se dedica a rastrear e capturar criminosos comuns procurados em troca de recompensas financeiras. Esses caçadores são muito habilidosos em combate e possuem técnicas específicas para rastrear e capturar seus alvos. A profissão de caçador de recompensas requer coragem, habilidades físicas e mentais, além de uma vontade inabalável de cumprir a missão. Ser um caçador de recompensas é um trabalho perigoso, mas pode ser lucrativo para aqueles que estão dispostos a correr riscos.",
    "equipment": "Um livro com informações de alvos antigos, um kit de escalada, uma arma simples em que possua proficiência e um cantil.",
    "startingGold": 60,
    "img": "icons/svg/target.svg",
    "feature": {
      "name": "Lista de Procurados",
      "description": "Seu antigo trabalho como caçador de recompensas fez com que você tivesse que lidar com diversos inimigos estranhos e peculiares, mas também te deixou sabendo sobre diversos criminosos famosos com boatos estranhos os circundando. Quando você ouvir o nome de uma criatura, você pode realizar um Teste de Sorte CD 15. Em caso de sucesso, você recebe uma informação aleatória à escolha do Narrador sobre aquela criatura.",
      "dc": 15
    }
  },
  {
    "key": "comerciante",
    "name": "Comerciante",
    "description": "Um comerciante passou grande parte da sua vida lidando com negócios médios ou pequenos, lidando com logísticas e buscando preços favoráveis de fornecedores, assim como vendendo ou treinando profissionais em venda e em como tirar o máximo de lucro possível nas transações.",
    "equipment": "Um kit de avaliação.",
    "startingGold": 120,
    "img": "icons/svg/coins.svg",
    "feature": {
      "name": "Negociação",
      "description": "Você pode ter até abandonado a vida de comerciante, mas os costumes estão gravados em seus ossos, não deixando você ter prejuízo em nenhuma transação. Quando você estiver negociando um preço de venda de um item, você pode realizar um Teste de Sorte CD 15. Em caso de sucesso, você consegue um preço justo e um bônus de 3d10 x 10 PO. Se falhar, você não recebe nenhum bônus, mas o valor não pode cair mais de 10% do valor padrão. Você recupera essa característica ao fim de um descanso longo.",
      "dc": 15,
      "recovery": "lr"
    }
  },
  {
    "key": "cozinheiro",
    "name": "Cozinheiro",
    "description": "Um cozinheiro é aquele que passou um grande período da sua vida criando pratos deliciosos para seu público e aprendeu uma grande variedade de receitas nutritivas e saborosas para sempre manter a moral acima do normal. Ele é alguém que não pode faltar quando se trata de viagens longas onde conseguir algo decente para comer é um problema.",
    "equipment": "Um kit de cozinha e uma roupa de cozinheiro.",
    "startingGold": 40,
    "img": "icons/svg/chest.svg",
    "feature": {
      "name": "Obter Alimentos",
      "description": "Você é capaz o suficiente para conseguir fazer uma bela refeição com uns poucos ingredientes à disposição. Enquanto estiver em uma cidade, floresta ou algum ambiente apropriado. Você pode realizar um Teste de Sorte CD 15. Em caso de sucesso, você consegue alimentos suficientes para preparar uma refeição para até 5 pessoas. Após utilizar essa característica, você pode utiliza-la novamente apenas após realizar um descanso longo.",
      "dc": 15,
      "recovery": "lr"
    }
  },
  {
    "key": "cultivador-demoniaco",
    "name": "Cultivador Demoníaco",
    "description": "Você é um cultivador demoníaco de uma seita destruída, onde o desastre que ocorreu em sua seita fez com que você tivesse que abandonar seu cultivo para sobreviver e fez com que você andasse pelo mundo descobrindo uma forma de cultivar sem ser morto. Você era do Rank Mar Divino ou abaixo, antes de abandonar seu cultivo.",
    "equipment": "Vestes pretas e uma bugiganga de um membro da sua seita que você matou.",
    "startingGold": 100,
    "img": "icons/svg/aura.svg",
    "feature": {
      "name": "Recursos Roubados",
      "description": "Você possui um Manual de Cultivo de Rank Sagrado pertencente ao caminho demoníaco, que conseguiu roubar antes da destruição de sua seita. Entretanto, sua natureza maligna exige o sacrifício de uma vida inocente por semana para permanecer saciada.\nAo integrar esse manual ao seu Manual Divino, você libera uma poderosa onda de energia negativa que se espalha por centenas de quilômetros, alertando todos na região sobre sua localização e sua natureza como cultivador demoníaco.\nEsse fenômeno se repete sempre que você deixar de realizar o sacrifício semanal exigido pelo manual, revelando novamente sua presença e localização."
    }
  },
  {
    "key": "estudioso",
    "name": "Estudioso",
    "description": "Um estudioso é alguém que dedicou sua vida a área acadêmica. Ele pode ser um profissional da educação ou até alguém que levou a vida em institutos de pesquisas. Alguns estudiosos buscam apenas conhecimento, enquanto outros buscam a riqueza e fama que vêm de suas descobertas. Independentemente do tipo de estudioso que a pessoa seja, sua curiosidade por ruínas ainda é legítima.",
    "equipment": "Um kit de avaliação.",
    "startingGold": 60,
    "img": "icons/svg/book.svg",
    "feature": {
      "name": "Biblioteca Mental",
      "description": "Quando você entrar em um local como uma ruína, biblioteca antiga, ver símbolos de civilizações antigas, uma língua desconhecida ou uma tecnologia qualquer. Você pode realizar um Teste de Sorte com CD definida pelo narrador. Em caso de sucesso, você conhece informações sobre aquilo, seja por ter lido sobre o alvo dessa habilidade ou sobre coisas similares, recebendo uma informação relevante qualquer. Essa característica pode ser utilizada uma vez, recuperando seu uso após realizar um descanso curto ou longo.",
      "recovery": "sr"
    }
  },
  {
    "key": "iniciado-em-medicina",
    "name": "Iniciado em Medicina",
    "description": "Um iniciado em medicina é aquele que terminou seus estudos e está passando por um internato, mas não se tornou um médico ainda. Ele possui certas capacidades que o ajudam em algumas situações quando ele ou seus companheiros estão feridos. Ele possui a capacidade de agir rapidamente tanto no campo de batalha como fora dele, podendo salvar a vida das pessoas quando de outra forma elas encontrariam o seu fim.",
    "equipment": "Um kit de primeiros socorros, um kit de tratamento e um kit de remédios.",
    "startingGold": 100,
    "img": "icons/svg/holy-shield.svg",
    "feature": {
      "name": "Estabilizar",
      "description": "Com seu profundo conhecimento da medicina, você é capaz de realizar tratamentos rápidos em uma criatura para evitar males que a estejam afetando. Caso você encontre uma criatura com uma doença ou ferida que ameaça a vida dela. Você pode realizar um Teste de Sorte com CD definida pelo Narrador. Em caso de sucesso, você estabiliza a criatura e anula os efeitos negativos da doença ou para seu sangramento. Esse efeito é anulado caso ela realize qualquer ação que não seja andar com metade do seu deslocamento ou receba qualquer valor em dano."
    }
  },
  {
    "key": "jovem-mestre",
    "name": "Jovem Mestre",
    "description": "Um jovem mestre é aquele que pertence a uma família com certo nível de influência, seja marcial, de cultivadores ou apenas uma família de mercadores muito influentes.",
    "equipment": "Roupas luxuosas e uma arma comum de boa qualidade.",
    "startingGold": 200,
    "img": "icons/svg/house.svg",
    "feature": {
      "name": "Me Vingue!",
      "description": "Toda vez que você perder uma batalha, você pode expressar sua indignação para um membro da família, desde que ele seja o próximo mais forte após você. Se esse membro perder, ele mesmo ativa essa característica e vai reclamar com o próximo mais forte que ele.\nSe você ativar essa característica contra uma criatura muito forte, você pode acabar perdendo alguns membros antes que seu pai, tio ou alguém de poder venha te espancar por ser um inútil."
    }
  },
  {
    "key": "ladrao-de-rua",
    "name": "Ladrão de Rua",
    "description": "O ladrão é aquele que vive a sua vida cometendo desde pequenos furtos até grandes roubos para se manter, ele pode possuir uma grande gama de habilidades e normalmente é capaz de escapar de qualquer situação, desde que ele tenha planejado o suficiente. Um ladrão de sucesso consegue fazer milhares de moedas roubando das pessoas certas.",
    "equipment": "Um kit de abrir cadeados e um kit de disfarce.",
    "startingGold": 10,
    "img": "icons/svg/cowled.svg",
    "feature": {
      "name": "Rastro Fantasma",
      "description": "Você consegue sentir o cheiro de dinheiro, quando você detecta um objeto valioso e sabe informações suficientes sobre ele e seu dono, você é capaz de acha-lo como se existisse um rastro luminoso levando até seu alvo. Quando você invadir um lugar que contém um item específico que você busca. Você pode realizar um Teste de Sorte com CD definida pelo Narrador. Em caso de sucesso, você irá deduzir com sucesso onde o item se encontra na estrutura. Se você conseguirá rouba-lo é outra história."
    }
  },
  {
    "key": "matador-de-aluguel",
    "name": "Matador de Aluguel",
    "description": "O antecedente de matador de aluguel é geralmente associado a indivíduos que são contratados para eliminar alvos específicos. Eles são treinados em uma variedade de habilidades, incluindo técnicas de combate corpo-a-corpo, uso de armas, estratégia e disfarce. Esses indivíduos geralmente trabalham de forma independente e usam suas habilidades para obter dinheiro ou outros benefícios.",
    "equipment": "Um kit de disfarce, um conjunto de roupas escuras, uma bugiganga de seu último trabalho e cinco adagas.",
    "startingGold": 50,
    "img": "icons/svg/sword.svg",
    "feature": {
      "name": "Análise Profissional",
      "description": "Seu trabalho como matador de aluguel fez com que você criasse hábitos muito bons quando se trata de encontrar pessoas. Permitindo que você consiga analisar o perfil de uma criatura desde que você consiga informação suficiente sobre ela. Você pode realizar um Teste de Sorte CD 15. Em caso de sucesso, você descobre o local mais frequentado pela criatura nos últimos 6 meses até 1 mês atrás.",
      "dc": 15
    }
  },
  {
    "key": "membro-de-seita",
    "name": "Membro de Seita",
    "description": "Você foi aceito por uma seita, seja por um favor aos seus pais ou parentes ou porque um ancião bondoso da seita viu sua determinação em mudar seu destino. Você carrega as vestes e símbolos da seita e deve lutar para manter a honra da mesma e não importa seu nível de força, você nunca irá esquecer suas origens devido a gratidão que você sente.",
    "equipment": "Vestes da seita, símbolo da seita e um anel espacial de nível inferior.",
    "startingGold": 30,
    "img": "icons/svg/village.svg",
    "feature": {
      "name": "Membro Inferior",
      "description": "Você está ligado a uma seita de renome aceitável, mesmo não tendo força suficiente para ser um membro dela. Você recebe um manual de Rank Terra e começa a aventura, no mínimo, um nível acima do membro de nível mais baixo do grupo.\nDevido ao seu senso de gratidão a seita, você sempre deve voltar para protege-la de todas as ameaças e deve compartilhar metade de seus ganhos com o ancião que te deu a chance de mudar seu destino.\nSeu anel espacial deve ser utilizado para armazenar metade de seus ganhos que irão para o ancião."
    }
  },
  {
    "key": "mendigo",
    "name": "Mendigo",
    "description": "Você é um morador de rua que passou a vida sobrevivendo como pode, tendo nascido de uma família na miséria e passando os próximos anos nas ruas. Embora você não tenha nenhuma habilidade digna de nota ou características poderosas, você sabe reconhecer o nível das pessoas com um único olhar, sabendo com quem você pode ou não mexer.",
    "equipment": "Roupas surradas, chapéu de palha e uma arma enferrujada que causa 1d4 de dano.",
    "startingGold": 15,
    "img": "icons/svg/village.svg",
    "feature": {
      "name": "Clã dos Mendigos",
      "description": "Em algum momento da sua vida miserável, você entrou no clã dos mendigos, sendo parte dessa organização gigantesca de ajuda mútua e troca de informações. Uma vez por semana, você pode escolher entrar em contato com um mendigo e realizar um Teste de Sorte com CD definida pelo Narrador. Em caso de sucesso, você recebe o último lugar que uma criatura ou objeto foi avistado ou onde um boato se iniciou.",
      "manualRecovery": "week"
    }
  },
  {
    "key": "monge",
    "name": "Monge",
    "description": "Alguém que passou grande parte da vida em um monastério ou templo. Um monge treina seu corpo arduamente para superar seus limites e poder proteger o templo ou monastério. Ao escolher essa origem, você automaticamente fica careca.",
    "equipment": "Um kit de escalada e vestes típicas de monastério.",
    "startingGold": 60,
    "img": "icons/svg/holy-shield.svg",
    "feature": {
      "name": "Companheiro Taoista",
      "description": "Você sabe os locais dos templos mais famosos espalhados pelo mundo, assim como suas sedes, isso permite que você sempre tenha um refúgio para se esconder em um momento de dificuldades. Você pode realizar um Teste de Sorte com CD 16. Em caso de sucesso, você encontra um templo ou sede que pode abriga-lo permitindo que você encontre descanso de forma segura por 24 horas. Essa característica se estende para até 4 criaturas aliadas. Caso você não esteja fugindo de ninguém, você pode se manter no lugar por até 30 dias se possuir aliados ou por tempo indefinido se estiver sozinho, podendo cultivar em um local concedido pelos monges do templo.",
      "dc": 16
    },
    "hair": "Careca"
  },
  {
    "key": "musico",
    "name": "Músico",
    "description": "O Músico é uma das profissões mais nobres do mundo, seu trabalho traz a felicidade e entretenimento para um grande número de pessoas com suas músicas capazes de manifestar todos os tipos de emoções nos corações das pessoas. Elas possuem tanto a capacidade de ferir quanto curar.",
    "equipment": "Um kit de disfarce, um instrumento musical e uma roupa de gala.",
    "startingGold": 80,
    "img": "icons/svg/sound.svg",
    "feature": {
      "name": "Apresentação",
      "description": "Durante suas viagens, é possível entrar em lugares de nobres e pessoas de influência para realizar apresentações. Ao realizar um Teste de Sorte CD 17. Em caso de sucesso, você recebe acesso a áreas restritas ou mansões de lordes e nobres para realizar suas apresentações. Após terminar todas as suas apresentações, você pode permanecer no local por até 1 hora descobrindo informações.",
      "dc": 17
    }
  },
  {
    "key": "orfao",
    "name": "Órfão",
    "description": "Suas origens são desconhecidas, você pode até saber seu sobrenome, mas ele não te dá nenhuma pista ou qualquer informação sobre a sua família. Além de não conhecer seus pais, desde que você se lembre, nunca houve nenhuma figura que cuidou de você, sempre tendo que se virar sozinha para conseguir se alimentar e sobreviver. Isso pode ter te tornado uma pessoa amarga ou ter alimentado uma empolgação para construir do zero seus próprios sonhos.",
    "equipment": "Uma roupa simples e uma bugiganga roubada de até 10 PO.",
    "startingGold": 30,
    "img": "icons/svg/mystery-man.svg",
    "feature": {
      "name": "Malandragem",
      "description": "Dentro de centros urbanos, desde que você seja bem sucedido em um Teste de Sorte, com a CD definida pelo Narrador, você pode reconhecer os padrões e caminhos secretos típicos, conseguindo encontrar passagens em meio ao tecido urbano que os outros jamais notariam, podendo viajar entre quaisquer dois pontos da cidade, duas vezes mais rápido do que o seu deslocamento permite. \nAlém disso, o mesmo teste pode ser usado para encontrar comida e água para si mesmo e para até cinco outras pessoas uma vez por dia, desde que seja possível."
    }
  },
  {
    "key": "pescador",
    "name": "Pescador",
    "description": "Um pescador é um homem simples que passou maior parte da sua vida no mar e isso lhe deu certas vantagens em relação aos outros, principalmente em sua resistência, a vida de um pescador não é fácil devido a luta constante contra o mar. Enquanto eles não são hábeis em lutas, sua capacidade de sobrevivência no mar não é nada senão impressionante.",
    "equipment": "Uma vara de pesca profissional, um cantil e um pacote de iscas.",
    "startingGold": 100,
    "img": "icons/svg/anchor.svg",
    "feature": {
      "name": "Rei da Região",
      "description": "Pescaria com certeza é uma arte antiga e honesta, mas de vez em quando coisas sobrenaturais podem acabar saindo do mar. Toda vez que você parar para pescar em um lago grande ou mar aberto, você pode rolar um Teste de Sorte CD 16. Em caso de sucesso, você consegue fazer com que um peixe gigante morda a isca. O peixe tem 18 de força e deve ser pescado através de um teste resistido. Caso você consiga puxa-lo com sucesso, você pode rolar 1d20, em caso de 20 natural, o peixe é de uma nova espécie.",
      "dc": 16
    }
  },
  {
    "key": "servo-do-jovem-mestre",
    "name": "Servo do Jovem Mestre",
    "description": "Você serve a um jovem mestre inútil de uma família influente, seja porque seus antepassados tem uma dívida com eles ou porque sua vida foi salva por essa família. Você não necessariamente gosta do seu Mestre, mas você segue suas ordens por honra e dever.",
    "equipment": "Uma armadura flexível inferior e uma arma tesouro em que possua proficiência.",
    "startingGold": 500,
    "img": "icons/svg/shield.svg",
    "feature": {
      "name": "Rolê Errado",
      "description": "Você está sempre protegendo seu jovem mestre, fazendo com que ele seja invulnerável a dano enquanto você estiver vivo próximo a ele. O problema é que ele sempre está te chamando para umas confusões estranhas e é tão insistente que você não tem escolha senão obedece-lo. Uma vez por mês, seu jovem mestre irá aparecer com boatos sobre oportunidades de riqueza ou avanço de cultivo, mas sempre acabará sendo uma aventura de nível mortal para você, imagina para o jovem mestre inútil.\nVocê começa a aventura no 3º Nível da Condensação de Qi e seu jovem mestre compartilha 1/3 dos ganhos das confusões que ele arruma com você."
    },
    "startingCultivation": {
      "rank": 1,
      "stage": 3
    }
  },
  {
    "key": "servo-da-familia-principal",
    "name": "Servo da Família Principal",
    "description": "Você foi o servo nada importante de uma família de cultivadores e recebeu instruções e treinamentos básicos de como melhor servi-los, isso garantiu alguns poucos benefícios que ajudam você a sobreviver no mundo.",
    "equipment": "Três conjuntos de robes simples de servo.",
    "startingGold": 100,
    "img": "icons/svg/house.svg",
    "feature": {
      "name": "Benefícios de Servo",
      "description": "Você recebe um manual de cultivo de rank humano e classe comum que é dado para todos os servos da família. Além disso, quando você se deparar com um membro da família a que serviu, você pode realizar um Teste de Sorte com CD definida pelo Narrador. Em caso de sucesso, um membro ou servo da família pode te dar uma ajuda que não custe nenhum dinheiro ou ponha a própria vida ou de quem serve em risco. Essa ajuda pode ser em forma de informação, abrigo ou similar."
    }
  },
  {
    "key": "soldado",
    "name": "Soldado",
    "description": "Um soldado é aquele que serve ou serviu seu país e nação, seja em guerra ou apenas trabalhando em zonas de segurança máxima, independentemente do local onde ele operou ele possui treinamentos com vários tipos de armas marciais e de guerra como a lança.",
    "equipment": "Um kit de escalada, um kit de primeiros socorros e uma roupa camuflada.",
    "startingGold": 30,
    "img": "icons/svg/sword.svg",
    "feature": {
      "name": "Conhecimento da Guerra",
      "description": "Como um soldado, você aprendeu diversas táticas de batalha e sabe reconhecer os diversos estilos marciais dos soldados baseado apenas na forma como eles lutam. Você pode escolher realizar um Teste de Sorte CD 17. Em caso de sucesso, você reconhece todos os Manuais de Combate que a criatura utiliza até terceiro grau.",
      "dc": 17
    }
  },
  {
    "key": "vagabundo",
    "name": "Vagabundo",
    "description": "O Vagabundo é aquele que não fez nada de significativo na sua vida além de vadiar por aí, devido a sempre estar vagando sem realizar tanto esforço, ele aprendeu a se virar e enganar pessoas para sobreviver assim a como ver com quem não se meter.",
    "equipment": "Uma bugiganga de até 1 PO.",
    "startingGold": 15,
    "img": "icons/svg/wingfoot.svg",
    "feature": {
      "name": "Sem Tempo Ruim",
      "description": "Ficando zanzando por aí o tempo todo, você desenvolveu a habilidade de dormir bem em qualquer lugar, independentemente da situação. Quando você tiver em uma área muito ruim para descansar, você pode realizar um Teste de Sorte CD 16. Em caso de sucesso, você encontra um local seguro pra tirar um cochilo. Essa característica pode ser utilizada uma vez, recuperando seu uso após realizar um descanso longo.",
      "dc": 16,
      "recovery": "lr"
    }
  }
];
