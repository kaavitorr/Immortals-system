/** Integrated constitution catalogue from the supplied Player Book v2.1, section15.1–15.3 (requested pages124–136). */
export const CONSTITUTION_RARITIES = [
  {
    "id": "human",
    "label": "Humano",
    "qualities": [
      "inferior",
      "comum",
      "superior"
    ],
    "revealRank": 1,
    "ranges": [
      [
        1,
        4
      ],
      [
        5,
        8
      ],
      [
        9,
        12
      ]
    ]
  },
  {
    "id": "earth",
    "label": "Terra",
    "qualities": [
      "inferior",
      "comum",
      "superior"
    ],
    "revealRank": 3,
    "ranges": [
      [
        13,
        16
      ],
      [
        17,
        20
      ],
      [
        21,
        25
      ]
    ]
  },
  {
    "id": "heaven",
    "label": "Céu",
    "qualities": [
      "inferior",
      "comum",
      "superior"
    ],
    "revealRank": 4,
    "ranges": [
      [
        26,
        30
      ],
      [
        31,
        40
      ],
      [
        41,
        45
      ]
    ]
  },
  {
    "id": "sacred",
    "label": "Sagrado",
    "qualities": [
      "inferior",
      "comum",
      "superior"
    ],
    "revealRank": 6,
    "ranges": [
      [
        46,
        50
      ],
      [
        51,
        60
      ],
      [
        61,
        70
      ]
    ]
  },
  {
    "id": "divine",
    "label": "Divino",
    "qualities": [
      "unica"
    ],
    "revealRank": 7,
    "ranges": [
      [
        71,
        99
      ]
    ]
  },
  {
    "id": "supreme",
    "label": "Supremo",
    "qualities": [
      "unica"
    ],
    "revealRank": 1,
    "ranges": [
      [
        100,
        100
      ]
    ]
  }
];
export const CONSTITUTIONS = [
  {
    "id": "human-caminho-dos-ceus",
    "name": "Caminho dos Céus",
    "rarity": "human",
    "ordinal": 1,
    "sourceName": "CAMINHO DOS CÉUS",
    "description": [
      "A constituição mais comum entre cultivadores, permitindo que eles cultivem para se tornar imortais. Ele não do nenhum tipo de efeito, mas ao ser evoluído, ele pode se tornar qualquer constituição aleatória quando você atingir o Mar Divino. Caso você role e caia novamente nessa constituição, você fica presa com ela pelo resto da sua vida."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Inferior",
    "evolution": "Qualquer Um",
    "evolutionMethod": "100 Núcleos de Besta na Formação de Núcleo ou 50 no Núcleo Rotativo por classe.",
    "additionalEffects": [
      "Nenhum"
    ],
    "curse": [],
    "mechanics": {
      "family": "mortal-path",
      "tier": 0
    },
    "sourceNotes": []
  },
  {
    "id": "human-corpo-elemental",
    "name": "Corpo Elemental",
    "rarity": "human",
    "ordinal": 2,
    "sourceName": "CORPO ELEMENTAL",
    "description": [
      "Uma constituição que permite que você canalize um tipo de elemento específico em seu corpo, tendo mais facilidade na sua utilização. Você gasta metade do Tempo, Pontos de Cultivo e quantidade de Qi para aprender um elemento específico. Corpos elementais não afetam elementos avançados."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Inferior",
    "evolution": "Corpo Elemental Superior",
    "evolutionMethod": "20 Núcleos de Besta do Elemento no Rank de Núcleo Rotativo / por Classe",
    "additionalEffects": [
      "Nenhum"
    ],
    "curse": [],
    "mechanics": {
      "family": "elemental",
      "tier": 0,
      "affinityCount": 1,
      "advancedAffinities": false,
      "elementDamageBonus": 0,
      "techniqueQiDiscount": 0
    },
    "sourceNotes": [],
    "evolutionId": "earth-corpo-elemental-superior"
  },
  {
    "id": "human-alinhamento-celestial",
    "name": "Alinhamento Celestial",
    "rarity": "human",
    "ordinal": 3,
    "sourceName": "ALINHAMENTO CELESTIAL",
    "description": [
      "Uma constituição que permite que você absorva Qi da atmosfera e de Cristais de Essência com mais facilidade, permitindo que você acelere seu cultivo. Você absorve 30% mais Essência de Qi por dia (arredondado para baixo)."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Inferior",
    "evolution": "Benção Celestial",
    "evolutionMethod": "100 Cristais de Essência e 1 Núcleo de Besta do Rank de Núcleo Rotativo / por Classe",
    "additionalEffects": [
      "Nenhum"
    ],
    "curse": [],
    "mechanics": {
      "family": "celestial-absorption",
      "tier": 0,
      "absorptionMultiplier": 1.3,
      "crystalMultiplier": 1,
      "freeCultivationThroughRank": 0
    },
    "sourceNotes": [],
    "evolutionId": "earth-bencao-celestial"
  },
  {
    "id": "human-corpo-de-pilula",
    "name": "Corpo de Pílula",
    "rarity": "human",
    "ordinal": 4,
    "sourceName": "CORPO DE PIPULA",
    "description": [
      "Uma constituição que te fornece uma grande afinidade em pílulas, permitindo seu consumo sem um grande malefício ao corpo. Você pode consumir o dobro de pílulas sem que elas percam os efeitos em você e precisa consumir 2 pílulas para receber a quantidade de toxina de pílulas que uma daria para qualquer outra pessoa."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Inferior",
    "evolution": "Corpo de Pílula Superior",
    "evolutionMethod": "10 Ervas de Rank Terra – Superior / por Classe",
    "additionalEffects": [
      "Nenhum"
    ],
    "curse": [],
    "mechanics": {
      "family": "alchemy",
      "tier": 0,
      "pillRepeatMultiplier": 2,
      "toxinDivisor": 2,
      "toxinImmune": false,
      "pillEffectMultiplier": 1,
      "knownPillDCReduction": 0,
      "newPillDCReduction": 0
    },
    "sourceNotes": [],
    "evolutionId": "earth-corpo-de-pilula-superior"
  },
  {
    "id": "human-corpo-yang",
    "name": "Corpo Yang",
    "rarity": "human",
    "ordinal": 5,
    "sourceName": "CORPO YANG",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yang em seu corpo e aumente sua capacidade de utilizar os elementos de Yang que são: Fogo, Metal, Eletricidade e Luz. Você consome metade dos Pontos de Cultivo para treinar esses elementos."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yang Superior",
    "evolutionMethod": "10 núcleos de Bestas de Elementos Yang do Núcleo Rotativo / por Classe",
    "additionalEffects": [
      "Recebe 30% mais essência por dia em cultivo duplo com criaturas com Corpo Yin."
    ],
    "curse": [],
    "mechanics": {
      "family": "yang",
      "tier": 0,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 1,
      "trainingQiFactor": 1,
      "freeElementLevel": 0,
      "dualCultivationMultiplier": 1.3,
      "zoneMultiplier": 1
    },
    "sourceNotes": [],
    "evolutionId": "earth-corpo-yang-superior"
  },
  {
    "id": "human-corpo-yin",
    "name": "Corpo Yin",
    "rarity": "human",
    "ordinal": 6,
    "sourceName": "CORPO YIN",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yin em seu corpo e aumente sua capacidade de utilizar os elementos de Yin que são: Água, Gelo, Ilusão e Escuridão. Você consome metade dos Pontos de Cultivo para treinar esses elementos."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yin Superior",
    "evolutionMethod": "10 núcleos de Bestas de Elementos Yin do Núcleo Rotativo / por Classe",
    "additionalEffects": [
      "Recebe 30% mais essência por dia em cultivo duplo com criaturas com Corpo Yang."
    ],
    "curse": [],
    "mechanics": {
      "family": "yin",
      "tier": 0,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 1,
      "trainingQiFactor": 1,
      "freeElementLevel": 0,
      "dualCultivationMultiplier": 1.3,
      "zoneMultiplier": 1
    },
    "sourceNotes": [],
    "evolutionId": "earth-corpo-yin-superior"
  },
  {
    "id": "human-ira-demoniaca",
    "name": "Ira Demoníaca",
    "rarity": "human",
    "ordinal": 7,
    "sourceName": "IRA DEMONIACA",
    "description": [
      "Uma constituição que faz com que você perca sua sanidade em troca de uma grande quantidade de poder. Ao usar uma ação [⬢] para ativar essa constituição, você recebe +1 em Força, Agilidade e Constituição e perde -4 em Sabedoria. Enquanto estiver nesse estado, você consome 2 Pontos de Qi por rodada para mantê-la. Ao sair desse estado, você recebe 2 níveis de exaustão."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Inferior",
    "evolution": "Ira da Terra",
    "evolutionMethod": "1 Núcleo de Demônio da Formação de Núcleo / por Classe",
    "additionalEffects": [
      "Nenhum"
    ],
    "curse": [],
    "mechanics": {
      "family": "wrath",
      "tier": 0,
      "actions": 1,
      "upkeepQi": 2,
      "attributeBonus": 1,
      "setAttributes": null,
      "wisPenalty": 4,
      "wisMinimum": null,
      "attributeCap": null,
      "allResistance": 0,
      "hallucinated": false,
      "exitExhaustion": 2,
      "demonicAbsorptionMultiplier": 1,
      "corruptionImmune": false,
      "attributeKeys": [
        "str",
        "dex",
        "con"
      ]
    },
    "sourceNotes": [],
    "evolutionId": "earth-ira-da-terra"
  },
  {
    "id": "human-sangue-escaldante",
    "name": "Sangue Escaldante",
    "rarity": "human",
    "ordinal": 8,
    "sourceName": "SANGUE ESCALDANTE",
    "description": [
      "Uma constituição que permite que você incendeie seu sangue para conseguir um poder maior, recebendo uma enorme de poder em troca. Ao usar duas ações [⬢⬢] e 20 Pontos de Qi da sua poça de Qi total, você recebe 25 Pontos de Armadura e recebe um ADICIONAL de Resistência 5 em dano de Fogo, Frio, Contundente, Cortante e Perfurante. Esse efeito dura por 10 minutos e não pode ser utilizado novamente até o fim de um descanso longo."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Inferior",
    "evolution": "Sangue Infernal",
    "evolutionMethod": "30 núcleos de Bestas de Fogo da Formação de Núcleo / por Classe",
    "additionalEffects": [
      "Nenhum"
    ],
    "curse": [],
    "mechanics": {
      "family": "blood",
      "tier": 0,
      "actions": 2,
      "totalQi": 20,
      "shield": 25,
      "physicalResistance": 5,
      "otherResistance": 0,
      "durationSeconds": 600,
      "usesPerLongRest": 1,
      "size": null,
      "ignoresDifficultTerrain": false,
      "allConditionsImmune": false
    },
    "sourceNotes": [],
    "evolutionId": "earth-sangue-infernal"
  },
  {
    "id": "earth-imitacao-da-terra",
    "name": "Imitação da Terra",
    "rarity": "earth",
    "ordinal": 1,
    "sourceName": "IMITAÇÃO DA TERRA",
    "description": [
      "Uma constituição que permite que o usuário possa imitar a aparência de qualquer criatura, até mesmo de bestas, mas isso é uma mudança externa, fazendo com que você se veja como si mesmo, mas as criaturas te vejam como você quer que elas vejam. Você pode usar uma ação [⬢] e 5 Pontos de Qi para manter a mudança por 5 horas."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Imitação dos Céus",
    "evolutionMethod": "3 Núcleos de Besta de Ilusão do Rank Formação de Núcleo ou acima / por Classe",
    "additionalEffects": [
      "Em qualquer nível de cultivo, você pode substituir a necessidade do núcleo de uma Besta da Ilusão para compreender um conceito por uma matriz de acúmulo de Qi de Ilusão do mesmo nível do conceito, devendo cultivar dentro dela por 30 dias."
    ],
    "curse": [],
    "mechanics": {
      "family": "imitation",
      "tier": 1,
      "actions": 1,
      "qi": 5,
      "durationSeconds": 18000,
      "illusionMatrixDays": 30
    },
    "sourceNotes": [],
    "evolutionId": "heaven-imitacao-dos-ceus"
  },
  {
    "id": "earth-corpo-elemental-superior",
    "name": "Corpo Elemental Superior",
    "rarity": "earth",
    "ordinal": 2,
    "sourceName": "CORPO ELEMENTAL SUPERIOR",
    "description": [
      "Uma constituição que permite que você canalize dois tipos de elementos específicos em seu corpo, tendo mais facilidade na sua utilização. Você gasta metade do Tempo, Pontos de Cultivo e quantidade de Qi para aprender esses dois elementos específicos. Caso você o evolua do nível humano, você recebe afinidade a um elemento adicional de forma aleatória."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 3,
    "minimumClass": "Inferior",
    "evolution": "Corpo Elemental Celestial",
    "evolutionMethod": "20 Núcleos de Besta do Elemento no Rank de Núcleo Rotativo / por Classe",
    "additionalEffects": [
      "Núcleo Rotativo: Você passa a causar 3 de dano adicional em seus ataques e técnicas que causam dano desse mesmo elemento."
    ],
    "curse": [],
    "mechanics": {
      "family": "elemental",
      "tier": 1,
      "affinityCount": 2,
      "advancedAffinities": false,
      "elementDamageBonus": 3,
      "techniqueQiDiscount": 0
    },
    "sourceNotes": [],
    "evolutionId": "heaven-corpo-elemental-celestial"
  },
  {
    "id": "earth-bencao-celestial",
    "name": "Bênção Celestial",
    "rarity": "earth",
    "ordinal": 3,
    "sourceName": "BENÇÃO CELESTIAL",
    "description": [
      "Uma constituição que permite que você absorva Qi da atmosfera e de Cristais de Essência com mais facilidade, permitindo que você acelere seu cultivo. Você absorve 100% mais Essência de Qi por dia (arredondado para baixo)."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 3,
    "minimumClass": "Inferior",
    "evolution": "Filho dos Céus",
    "evolutionMethod": "1.000 Cristais de Essência e 3 Núcleos de Besta do Rank de Mar Divino / por Classe",
    "additionalEffects": [
      "Núcleo Rotativo: Você passa a dobrar a quantidade de Qi que você recebe de cristais de essência."
    ],
    "curse": [],
    "mechanics": {
      "family": "celestial-absorption",
      "tier": 1,
      "absorptionMultiplier": 2,
      "crystalMultiplier": 2,
      "freeCultivationThroughRank": 0
    },
    "sourceNotes": [],
    "evolutionId": "heaven-filho-dos-ceus"
  },
  {
    "id": "earth-corpo-de-pilula-superior",
    "name": "Corpo de Pílula Superior",
    "rarity": "earth",
    "ordinal": 4,
    "sourceName": "CORPO DE PILULA SUPERIOR",
    "description": [
      "Uma constituição que te fornece uma grande afinidade em pílulas, permitindo seu consumo sem um grande malefício ao corpo. Você pode consumir o triplo de pílulas sem que elas percam os efeitos em você e precisa consumir 3 pílulas para receber a quantidade de toxina de pílulas que uma daria para qualquer outra pessoa."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 3,
    "minimumClass": "Inferior",
    "evolution": "Corpo de Refinamento",
    "evolutionMethod": "10 Ervas de Rank Céu – Superior / por Classe",
    "additionalEffects": [
      "Núcleo Rotativo: Você reduz a CD em 3 quando estiver criando pílulas que você já tenha criado com sucesso."
    ],
    "curse": [],
    "mechanics": {
      "family": "alchemy",
      "tier": 1,
      "pillRepeatMultiplier": 3,
      "toxinDivisor": 3,
      "toxinImmune": false,
      "pillEffectMultiplier": 1,
      "knownPillDCReduction": 3,
      "newPillDCReduction": 0
    },
    "sourceNotes": [],
    "evolutionId": "heaven-corpo-de-refinamento"
  },
  {
    "id": "earth-corpo-yang-superior",
    "name": "Corpo Yang Superior",
    "rarity": "earth",
    "ordinal": 5,
    "sourceName": "CORPO YANG SUPERIOR",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yang em seu corpo e aumente sua capacidade de utilizar os elementos de Yang que são: Fogo, Metal, Eletricidade e Luz. Você consome metade dos Pontos de Cultivo e Tempo para treinar esses elementos."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yang Celestial",
    "evolutionMethod": "20 núcleos de Bestas de Elementos Yang do Mar Divino / por Classe",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 60% mais essência por dia em cultivo duplo com criaturas com Corpo Yin."
    ],
    "curse": [],
    "mechanics": {
      "family": "yang",
      "tier": 1,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 1,
      "freeElementLevel": 0,
      "dualCultivationMultiplier": 1.6,
      "zoneMultiplier": 1
    },
    "sourceNotes": [],
    "evolutionId": "heaven-corpo-yang-celestial"
  },
  {
    "id": "earth-corpo-yin-superior",
    "name": "Corpo Yin Superior",
    "rarity": "earth",
    "ordinal": 6,
    "sourceName": "CORPO YIN SUPERIOR",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yin em seu corpo e aumente sua capacidade de utilizar os elementos de Yin que são: Água, Gelo, Ilusão e Escuridão. Você consome metade dos Pontos de Cultivo e Tempo para treinar esses elementos."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yin Celestial",
    "evolutionMethod": "20 núcleos de Bestas de Elementos Yin do Mar Divino / por Classe",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 60% mais essência por dia em cultivo duplo com criaturas com Corpo Yang."
    ],
    "curse": [],
    "mechanics": {
      "family": "yin",
      "tier": 1,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 1,
      "freeElementLevel": 0,
      "dualCultivationMultiplier": 1.6,
      "zoneMultiplier": 1
    },
    "sourceNotes": [],
    "evolutionId": "heaven-corpo-yin-celestial"
  },
  {
    "id": "earth-ira-da-terra",
    "name": "Ira da Terra",
    "rarity": "earth",
    "ordinal": 7,
    "sourceName": "IRA DA TERRA",
    "description": [
      "Uma constituição que faz com que você perca sua sanidade em troca de uma grande quantidade de poder. Ao usar uma ação [⬢] para ativar essa constituição e receber as seguintes características:",
      "Você recebe +1 em todos os seus atributos, menos sabedoria;",
      "Você perde -4 em Sabedoria e recebe a condição “Alucinado”, sendo movido pela fúria.",
      "Enquanto estiver nesse estado, você consome 4 Pontos de Qi por rodada para mantê-la. Ao sair desse estado, você recebe 2 níveis de exaustão."
    ],
    "minimumRank": 2,
    "minimumCultivation": "Formação de Núcleo",
    "additionalRank": 3,
    "minimumClass": "Inferior",
    "evolution": "Ira Celestial",
    "evolutionMethod": "5 Núcleos de Demônio da Formação de Núcleo / por Classe",
    "additionalEffects": [
      "Você é imune aos efeitos de corrupção do Núcleo Demoníaco, podendo trata-lo como um núcleo de Besta de mesmo Rank de Cultivo, podendo utiliza-lo para qualquer elemento Básico ou Intermediário."
    ],
    "curse": [],
    "mechanics": {
      "family": "wrath",
      "tier": 1,
      "actions": 1,
      "upkeepQi": 4,
      "attributeBonus": 1,
      "setAttributes": null,
      "wisPenalty": 4,
      "wisMinimum": null,
      "attributeCap": null,
      "allResistance": 0,
      "hallucinated": true,
      "exitExhaustion": 2,
      "demonicAbsorptionMultiplier": 1,
      "corruptionImmune": true,
      "attributeKeys": [
        "str",
        "dex",
        "con",
        "int",
        "cha"
      ]
    },
    "sourceNotes": [],
    "evolutionId": "heaven-ira-celestial"
  },
  {
    "id": "earth-sangue-infernal",
    "name": "Sangue Infernal",
    "rarity": "earth",
    "ordinal": 8,
    "sourceName": "SANGUE INFERNAL",
    "description": [
      "Uma constituição que permite que você incendeie seu sangue para conseguir um poder maior, recebendo uma enorme de poder em troca. Ao usar duas ações [⬢⬢] e 30 Pontos de Qi da sua poça de Qi total, você recebe as seguintes características:",
      "Você recebe 50 Pontos de Armadura;",
      "Você aumenta seu tamanho em cerca de 30% e fica imune a terreno difícil;",
      "Você reduz todo dano sofrido em -10 de dano de Fogo, Frio, Contundente, Cortante e Perfurante. Esse efeito dura por 10 minutos e não pode ser utilizado novamente até o fim de um descanso longo."
    ],
    "minimumRank": 2,
    "minimumCultivation": "Formação de Núcleo",
    "additionalRank": 3,
    "minimumClass": "Inferior",
    "evolution": "Sangue do Gigante Carmesim",
    "evolutionMethod": "20 núcleos de Bestas de Fogo do Mar Divino / por Classe",
    "additionalEffects": [
      "Você é imune a condições causadas por dano de Frio."
    ],
    "curse": [],
    "mechanics": {
      "family": "blood",
      "tier": 1,
      "actions": 2,
      "totalQi": 30,
      "shield": 50,
      "physicalResistance": 10,
      "otherResistance": 0,
      "durationSeconds": 600,
      "usesPerLongRest": 1,
      "size": null,
      "ignoresDifficultTerrain": true,
      "allConditionsImmune": false
    },
    "sourceNotes": [],
    "evolutionId": "heaven-sangue-do-gigante-carmesim"
  },
  {
    "id": "heaven-imitacao-dos-ceus",
    "name": "Imitação dos Céus",
    "rarity": "heaven",
    "ordinal": 1,
    "sourceName": "IMITAÇÃO DOS CÉUS",
    "description": [
      "Uma constituição que permite que você possa mudar totalmente seu corpo para de outra criatura, permitindo uma mudança completa, alterando até mesmo seu interior e seus meridianos para o de outra criatura de mesmo Rank que você ou inferior. Você passa a adotar a ficha da criatura desde que ela não seja uma Besta Divina, mas não pode utilizar elementos, técnicas marciais ou similares que você não tenha compreendido por si mesmo."
    ],
    "minimumRank": 4,
    "minimumCultivation": "Mar Divino",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Imitação Perfeita Extrema",
    "evolutionMethod": "1 Núcleo de Besta de Ilusão do Rank Lorde Sagrado / por Classe",
    "additionalEffects": [
      "Em qualquer nível de cultivo, você pode substituir a necessidade do núcleo de uma Besta da Ilusão para compreender um conceito por uma matriz de acúmulo de Qi de Ilusão do mesmo nível do conceito, devendo cultivar dentro dela por 15 dias."
    ],
    "curse": [],
    "mechanics": {
      "family": "imitation",
      "tier": 2,
      "actions": null,
      "qi": null,
      "durationSeconds": null,
      "illusionMatrixDays": 15
    },
    "sourceNotes": [],
    "evolutionId": "divine-imitacao-perfeita-extrema"
  },
  {
    "id": "heaven-corpo-elemental-celestial",
    "name": "Corpo Elemental Celestial",
    "rarity": "heaven",
    "ordinal": 2,
    "sourceName": "CORPO ELEMENTAL CELESTIAL",
    "description": [
      "Uma constituição que permite que você canalize três tipos de elementos específicos em seu corpo, tendo mais facilidade na sua utilização. Você gasta metade do Tempo, Pontos de Cultivo e quantidade de Qi para aprender esses três elementos específicos. Caso você o evolua do nível terra, você recebe afinidade a um elemento adicional de forma aleatória.",
      "Você pode receber afinidade a um Elemento Avançado com esse efeito."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Corpo Elemental Sagrado",
    "evolutionMethod": "10 Núcleos de Besta do Elemento no Rank de Transformação Divina / por Classe",
    "additionalEffects": [
      "Mar Divino: Você passa a causar 3 de dano adicional em seus ataques e técnicas que causam dano desse mesmo elemento. Além disso, você reduz o custo dessas técnicas em 1 Ponto de Qi, até um mínimo igual a metade do custo total."
    ],
    "curse": [],
    "mechanics": {
      "family": "elemental",
      "tier": 2,
      "affinityCount": 3,
      "advancedAffinities": true,
      "elementDamageBonus": 3,
      "techniqueQiDiscount": 1
    },
    "sourceNotes": [],
    "evolutionId": "sacred-corpo-elemental-sagrado"
  },
  {
    "id": "heaven-filho-dos-ceus",
    "name": "Filho dos Céus",
    "rarity": "heaven",
    "ordinal": 3,
    "sourceName": "FILHO DOS CÉUS",
    "description": [
      "Uma constituição que permite que você absorva Qi da atmosfera e de Cristais de Essência com mais facilidade, permitindo que você acelere seu cultivo. Você absorve 500% mais Essência de Qi por dia (arredondado para baixo)."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Favorito dos Céus",
    "evolutionMethod": "100 Cristais de Essência de Rank Céu e 3 Núcleos de Besta do Rank de Transformação Divina / por Classe",
    "additionalEffects": [
      "Mar Divino: Você passa a triplicar a quantidade de Qi que você recebe de cristais de essência."
    ],
    "curse": [],
    "mechanics": {
      "family": "celestial-absorption",
      "tier": 2,
      "absorptionMultiplier": 6,
      "crystalMultiplier": 3,
      "freeCultivationThroughRank": 0
    },
    "sourceNotes": [],
    "evolutionId": "sacred-favorito-dos-ceus"
  },
  {
    "id": "heaven-corpo-de-refinamento",
    "name": "Corpo de Refinamento",
    "rarity": "heaven",
    "ordinal": 4,
    "sourceName": "CORPO DE REFINAMENTO",
    "description": [
      "Uma constituição que te fornece uma grande afinidade em pílulas, permitindo seu consumo sem um grande malefício ao corpo. Você pode consumir o quadruplo de pílulas sem que elas percam os efeitos em você e precisa consumir 5 pílulas para receber a quantidade de toxina de pílulas que uma daria para qualquer outra pessoa."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Corpo Refinador Sagrado",
    "evolutionMethod": "10 Ervas de Rank Sagrado – Superior / por Classe",
    "additionalEffects": [
      "Mar Divino: Você reduz a CD em 6 quando estiver criando pílulas que você já tenha criado com sucesso. Além disso, você reduz a CD de novas pílulas em -3."
    ],
    "curse": [],
    "mechanics": {
      "family": "alchemy",
      "tier": 2,
      "pillRepeatMultiplier": 4,
      "toxinDivisor": 5,
      "toxinImmune": false,
      "pillEffectMultiplier": 1,
      "knownPillDCReduction": 6,
      "newPillDCReduction": 3
    },
    "sourceNotes": [],
    "evolutionId": "sacred-corpo-refinador-sagrado"
  },
  {
    "id": "heaven-corpo-yang-celestial",
    "name": "Corpo Yang Celestial",
    "rarity": "heaven",
    "ordinal": 5,
    "sourceName": "CORPO YANG CELESTIAL",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yang em seu corpo e aumente sua capacidade de utilizar os elementos de Yang que são: Fogo, Metal, Eletricidade e Luz. Você consome metade dos Pontos de Cultivo, Tempo e Pontos de Qi para treinar esses elementos."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yang Sagrado",
    "evolutionMethod": "20 núcleos de Bestas de Elementos Yang do Rank de Transformação Divina / por Classe",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 120% mais essência por dia em cultivo duplo com criaturas com Corpo Yin. Além disso, você dobra sua velocidade de cultivo em zonas em saturadas com elemento Yang."
    ],
    "curse": [],
    "mechanics": {
      "family": "yang",
      "tier": 2,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 0.5,
      "freeElementLevel": 0,
      "dualCultivationMultiplier": 2.2,
      "zoneMultiplier": 2
    },
    "sourceNotes": [],
    "evolutionId": "sacred-corpo-yang-sagrado"
  },
  {
    "id": "heaven-corpo-yin-celestial",
    "name": "Corpo Yin Celestial",
    "rarity": "heaven",
    "ordinal": 6,
    "sourceName": "CORPO YIN CELESTIAL",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yin em seu corpo e aumente sua capacidade de utilizar os elementos de Yin que são: Água, Gelo, Ilusão e Escuridão. Você consome metade dos Pontos de Cultivo e Tempo para treinar esses elementos."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yin Sagrado",
    "evolutionMethod": "20 núcleos de Bestas de Elementos Yin do Rank de Transformação Divina / por Classe",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 120% mais essência por dia em cultivo duplo com criaturas com Corpo Yang. Além disso, você dobra sua velocidade de cultivo em zonas em saturadas com elemento Yin."
    ],
    "curse": [],
    "mechanics": {
      "family": "yin",
      "tier": 2,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 1,
      "freeElementLevel": 0,
      "dualCultivationMultiplier": 2.2,
      "zoneMultiplier": 2
    },
    "sourceNotes": [],
    "evolutionId": "sacred-corpo-yin-sagrado"
  },
  {
    "id": "heaven-ira-celestial",
    "name": "Ira Celestial",
    "rarity": "heaven",
    "ordinal": 7,
    "sourceName": "IRA CELESTIAL",
    "description": [
      "Uma constituição que faz com que você perca sua sanidade em troca de uma grande quantidade de poder. Ao usar uma ação [⬢] para ativar essa constituição e receber as seguintes características:",
      "Recebe -2 contra todos os tipos de dano;",
      "Você recebe +1 em todos os seus atributos, menos sabedoria, até um máximo de 15;",
      "Você perde -3 em Sabedoria e recebe a condição “Alucinado”, sendo movido pela fúria, até um mínimo de 4.",
      "Enquanto estiver nesse estado, você consome 8 Pontos de Qi por rodada para mantê-la. Ao sair desse estado, você recebe 2 níveis de exaustão."
    ],
    "minimumRank": 4,
    "minimumCultivation": "Mar Divino",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Encarnação da Ira",
    "evolutionMethod": "5 Núcleos de Demônio do Mar Divino / por Classe",
    "additionalEffects": [
      "Você é totalmente imune aos efeitos negativos de Qi demoníaco, permitindo até que você os absorva para cultivar. Enquanto estiver cultivando usando Qi demoníaco, você cultiva 50% mais rápido.",
      "Além disso, você pode utilizar Núcleo Demoníaco como um substituto de mesmo rank para cultivar um conceito que necessita de um núcleo de Besta."
    ],
    "curse": [],
    "mechanics": {
      "family": "wrath",
      "tier": 2,
      "actions": 1,
      "upkeepQi": 8,
      "attributeBonus": 1,
      "setAttributes": null,
      "wisPenalty": 3,
      "wisMinimum": 4,
      "attributeCap": 15,
      "allResistance": 2,
      "hallucinated": true,
      "exitExhaustion": 2,
      "demonicAbsorptionMultiplier": 1.5,
      "corruptionImmune": true,
      "attributeKeys": [
        "str",
        "dex",
        "con",
        "int",
        "cha"
      ]
    },
    "sourceNotes": [],
    "evolutionId": "sacred-encarnacao-da-ira"
  },
  {
    "id": "heaven-sangue-do-gigante-carmesim",
    "name": "Sangue do Gigante Carmesim",
    "rarity": "heaven",
    "ordinal": 8,
    "sourceName": "SANGUE DO GIGANTE CARMESIM",
    "description": [
      "Uma constituição que permite que você incendeie seu sangue para conseguir um poder maior, recebendo uma enorme de poder em troca. Ao usar duas ações [⬢⬢] e 50 Pontos de Qi da sua poça de Qi total, você recebe as seguintes características:",
      "Você recebe 80 Pontos de Armadura;",
      "Você dobra seu tamanho e sua categoria de tamanho se torna “Grande”, ignorando terreno difícil;",
      "Você reduz todo dano sofrido em -10 de dano de Fogo, Frio, Contundente, Cortante e Perfurante e -5 de todo o resto. Esse efeito dura por 10 minutos e não pode ser utilizado novamente até o fim de um descanso longo."
    ],
    "minimumRank": 4,
    "minimumCultivation": "Mar Divino",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Gigante Sagrado",
    "evolutionMethod": "20 núcleos de Bestas de Fogo do Rank de Lorde Divino / por Classe",
    "additionalEffects": [
      "Você é imune a condições recebidas por falhar em Salvaguarda de Constituição enquanto estiver utilizando a constituição."
    ],
    "curse": [],
    "mechanics": {
      "family": "blood",
      "tier": 2,
      "actions": 2,
      "totalQi": 50,
      "shield": 80,
      "physicalResistance": 10,
      "otherResistance": 5,
      "durationSeconds": 600,
      "usesPerLongRest": 1,
      "size": "lg",
      "ignoresDifficultTerrain": true,
      "allConditionsImmune": false
    },
    "sourceNotes": [],
    "evolutionId": "sacred-gigante-sagrado"
  },
  {
    "id": "sacred-corpo-da-tribulacao-sagrado",
    "name": "Corpo da Tribulação Sagrado",
    "rarity": "sacred",
    "ordinal": 1,
    "sourceName": "CORPO DA TRIBULAÇÃO SAGRADO",
    "description": [
      "Uma constituição extremamente poderosa que permite que você absorva a energia da tribulação para aumentar seu entendimento e cultivo, utilizando os próprios céus para evoluir. Você recebe as seguintes características:",
      "Você reduz a CD da tribulação em -5;",
      "Ao subir de Rank, você sempre começa do segundo nível;",
      "Você recebe diminui a CD, Pontos de Cultivo e Pontos de Qi nos próximos 2 conceitos que você estudar pela metade, assim como ignora os requisitos de núcleo ou matrizes para compreender os níveis desses conceitos. Esse efeito se repete a cada vez que você subir de Rank."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 6,
    "minimumClass": "Inferior",
    "evolution": "Corpo da Tribulação Divina",
    "evolutionMethod": "Passar em uma tribulação com sucesso / por Classe",
    "additionalEffects": [
      "Você recebe imunidade a dano Elétrico de criaturas de até 1 Rank acima do seu, até um máximo de “Empírico”. Caso você sofra um dano elétrico que não possa ter imunidade, você recebe resistência 20 no lugar que não pode ser negada."
    ],
    "curse": [],
    "mechanics": {
      "family": "tribulation",
      "tier": 3,
      "breakthroughCDReduction": 5,
      "breakthroughStage": 2,
      "freeCultivationThroughRank": 0,
      "tribulationFocusCount": 2
    },
    "sourceNotes": [],
    "evolutionId": "divine-corpo-da-tribulacao-divina"
  },
  {
    "id": "sacred-corpo-elemental-sagrado",
    "name": "Corpo Elemental Sagrado",
    "rarity": "sacred",
    "ordinal": 2,
    "sourceName": "CORPO ELEMENTAL SAGRADO",
    "description": [
      "Uma constituição que permite que você canalize 4 tipos de elementos específicos em seu corpo, tendo mais facilidade na sua utilização. Você gasta metade do Tempo, Pontos de Cultivo e quantidade de Qi para aprender esses 4 elementos específicos. Caso você o evolua do Rank Céu, você recebe afinidade a um elemento adicional de forma aleatória.",
      "Você pode receber afinidade a um Elemento Avançado com esse efeito."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 6,
    "minimumClass": "Inferior",
    "evolution": "Corpo Elemental Divino",
    "evolutionMethod": "10 Núcleos de Besta do Elemento no Rank de Transformação Divina / por Classe",
    "additionalEffects": [
      "Lorde Divino: Você passa a causar 6 de dano adicional em seus ataques e técnicas que causam dano desses mesmos elementos. Além disso, você reduz o custo dessas técnicas em 2 Pontos de Qi, até um mínimo igual a metade do custo total."
    ],
    "curse": [],
    "mechanics": {
      "family": "elemental",
      "tier": 3,
      "affinityCount": 4,
      "advancedAffinities": true,
      "elementDamageBonus": 6,
      "techniqueQiDiscount": 2
    },
    "sourceNotes": [],
    "evolutionId": "divine-corpo-elemental-divino"
  },
  {
    "id": "sacred-favorito-dos-ceus",
    "name": "Favorito dos Céus",
    "rarity": "sacred",
    "ordinal": 3,
    "sourceName": "FAVORITO DOS CÉUS",
    "description": [
      "Uma constituição que permite que você absorva Qi da atmosfera e de Cristais de Essência com mais facilidade, permitindo que você acelere seu cultivo. Você absorve 20 vezes mais Essência de Qi por dia (arredondado para baixo)."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Amado pelos Céus",
    "evolutionMethod": "1.000 Cristais de Essência de Rank Sagrado e 5 Núcleos de Besta do Rank de Lorde Divino / por Classe",
    "additionalEffects": [
      "Mar Divino: Você multiplica a quantidade de Qi que você recebe de Cristais de Essência em 10 vezes. Além disso, você pode gastar 10 Cristais de Essência de mesmo Rank da sua constituição para ignorar o requisito de Pontos de Cultivo para subir de nível, mas não de Rank."
    ],
    "curse": [],
    "mechanics": {
      "family": "celestial-absorption",
      "tier": 3,
      "absorptionMultiplier": 20,
      "crystalMultiplier": 10,
      "freeCultivationThroughRank": 0
    },
    "sourceNotes": [],
    "evolutionId": "divine-amado-pelos-ceus"
  },
  {
    "id": "sacred-corpo-refinador-sagrado",
    "name": "Corpo Refinador Sagrado",
    "rarity": "sacred",
    "ordinal": 4,
    "sourceName": "CORPO REFINADOR SAGRADO",
    "description": [
      "Uma constituição que te fornece uma grande afinidade em pílulas, permitindo seu consumo sem um grande malefício ao corpo. Você pode consumir o 5 vezes mais pílulas sem que elas percam os efeitos em você e precisa consumir 10 pílulas para receber a quantidade de toxina de pílulas que uma daria para qualquer outra pessoa."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 6,
    "minimumClass": "Inferior",
    "evolution": "Corpo Divino de Medicina Espiritual",
    "evolutionMethod": "10 Ervas de Rank Divino – Superior / por Classe",
    "additionalEffects": [
      "Lorde Divino: Você reduz a CD em 10 quando estiver criando pílulas que você já tenha criado com sucesso. Além disso, você reduz a CD de novas pílulas em -5."
    ],
    "curse": [],
    "mechanics": {
      "family": "alchemy",
      "tier": 3,
      "pillRepeatMultiplier": 5,
      "toxinDivisor": 10,
      "toxinImmune": false,
      "pillEffectMultiplier": 1,
      "knownPillDCReduction": 10,
      "newPillDCReduction": 5
    },
    "sourceNotes": [],
    "evolutionId": "divine-corpo-divino-de-medicina-espiritual"
  },
  {
    "id": "sacred-corpo-yang-sagrado",
    "name": "Corpo Yang Sagrado",
    "rarity": "sacred",
    "ordinal": 5,
    "sourceName": "CORPO YANG SAGRADO",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yang em seu corpo e aumente sua capacidade de utilizar os elementos de Yang que são: Fogo, Metal, Eletricidade e Luz. Você não consome Pontos de Cultivo até o 3º nível desses elementos e consome metade (arredondado para baixo) dos Pontos de Cultivo, Tempo e Pontos de Qi para treinar esses elementos."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yang Divino Extremo",
    "evolutionMethod": "20 núcleos de Bestas de Elementos Yang do Rank de Lorde Divino / por Classe",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 500% mais essência por dia em cultivo duplo com criaturas com Corpo Yin. Além disso, você triplica sua velocidade de cultivo em zonas em saturadas com elemento Yang."
    ],
    "curse": [],
    "mechanics": {
      "family": "yang",
      "tier": 3,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 0.5,
      "freeElementLevel": 3,
      "dualCultivationMultiplier": 6,
      "zoneMultiplier": 3
    },
    "sourceNotes": [],
    "evolutionId": "divine-corpo-yang-divino-extremo"
  },
  {
    "id": "sacred-corpo-yin-sagrado",
    "name": "Corpo Yin Sagrado",
    "rarity": "sacred",
    "ordinal": 6,
    "sourceName": "CORPO YIN SAGRADO",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yin em seu corpo e aumente sua capacidade de utilizar os elementos de Yin que são: Água, Gelo, Ilusão e Escuridão. Você não consome Pontos de Cultivo até o 3º nível desses elementos e consome metade (arredondado para baixo) dos Pontos de Cultivo, Tempo e Pontos de Qi para treinar esses elementos."
    ],
    "minimumRank": 3,
    "minimumCultivation": "Núcleo Rotativo",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "Corpo Yin Divino Extremo",
    "evolutionMethod": "20 núcleos de Bestas de Elementos Yin do Rank de Lorde Divino / por Classe",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 500% mais essência por dia em cultivo duplo com criaturas com Corpo Yang. Além disso, você triplica sua velocidade de cultivo em zonas em saturadas com elemento Yin."
    ],
    "curse": [],
    "mechanics": {
      "family": "yin",
      "tier": 3,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 0.5,
      "freeElementLevel": 3,
      "dualCultivationMultiplier": 6,
      "zoneMultiplier": 3
    },
    "sourceNotes": [],
    "evolutionId": "divine-corpo-yin-divino-extremo"
  },
  {
    "id": "sacred-encarnacao-da-ira",
    "name": "Encarnação da Ira",
    "rarity": "sacred",
    "ordinal": 7,
    "sourceName": "ENCARNAÇÃO DA IRA",
    "description": [
      "Uma constituição que faz com que você perca sua sanidade em troca de uma grande quantidade de poder. Ao usar uma ação [⬢] para ativar essa constituição e receber as seguintes características:",
      "Recebe -5 contra todos os tipos de dano;",
      "Você recebe +2 em todos os seus atributos, menos sabedoria, até um máximo de 15;",
      "Você perde -4 em Sabedoria e recebe a condição “Alucinado”, sendo movido pela fúria, até um mínimo de 4.",
      "Enquanto estiver nesse estado, você consome 10 Pontos de Qi por rodada para mantê-la. Ao sair desse estado, você recebe 2 níveis de exaustão."
    ],
    "minimumRank": 6,
    "minimumCultivation": "Lorde Divino",
    "additionalRank": 4,
    "minimumClass": "Inferior",
    "evolution": "Ira dos Céus",
    "evolutionMethod": "5 Núcleos de Demônio do Lorde Divino / por Classe",
    "additionalEffects": [
      "Mar Divino: Você é totalmente imune aos efeitos negativos de Qi demoníaco, permitindo até que você os absorva para cultivar. Enquanto estiver cultivando usando Qi demoníaco, você cultiva 500% mais rápido.",
      "Além disso, você pode utilizar Núcleo Demoníaco como um substituto de mesmo rank para cultivar um conceito que necessita de um núcleo de Besta."
    ],
    "curse": [],
    "mechanics": {
      "family": "wrath",
      "tier": 3,
      "actions": 1,
      "upkeepQi": 10,
      "attributeBonus": 2,
      "setAttributes": null,
      "wisPenalty": 4,
      "wisMinimum": 4,
      "attributeCap": 15,
      "allResistance": 5,
      "hallucinated": true,
      "exitExhaustion": 2,
      "demonicAbsorptionMultiplier": 6,
      "corruptionImmune": true,
      "attributeKeys": [
        "str",
        "dex",
        "con",
        "int",
        "cha"
      ]
    },
    "sourceNotes": [],
    "evolutionId": "divine-ira-dos-ceus"
  },
  {
    "id": "sacred-gigante-sagrado",
    "name": "Gigante Sagrado",
    "rarity": "sacred",
    "ordinal": 8,
    "sourceName": "GIGANTE SAGRADO",
    "description": [
      "Uma constituição que permite que você incendeie seu sangue para conseguir um poder maior, recebendo uma enorme de poder em troca. Ao usar duas ações [⬢⬢] e 80 Pontos de Qi da sua poça de Qi total, você recebe as seguintes características:",
      "Você recebe 120 Pontos de Armadura;",
      "Sua categoria de tamanho se torna “Enorme” e você recebe imunidade a efeitos de redução de deslocamento.",
      "Você reduz todo dano sofrido em -15 de dano de Fogo, Frio, Contundente, Cortante e Perfurante e -10 de todo o resto. Esse efeito dura por 10 minutos e não pode ser utilizado novamente até o fim de um descanso longo."
    ],
    "minimumRank": 6,
    "minimumCultivation": "Lorde Divino",
    "additionalRank": 6,
    "minimumClass": "Inferior",
    "evolution": "Deus Gigante",
    "evolutionMethod": "20 núcleos de Bestas de Fogo do Rank de Lorde Divino / por Classe",
    "additionalEffects": [
      "Você recebe imunidade a todos os tipos de condições enquanto estiver utilizando a constituição."
    ],
    "curse": [],
    "mechanics": {
      "family": "blood",
      "tier": 3,
      "actions": 2,
      "totalQi": 80,
      "shield": 120,
      "physicalResistance": 15,
      "otherResistance": 10,
      "durationSeconds": 600,
      "usesPerLongRest": 1,
      "size": "huge",
      "ignoresDifficultTerrain": true,
      "allConditionsImmune": true
    },
    "sourceNotes": [],
    "evolutionId": "divine-deus-gigante"
  },
  {
    "id": "divine-corpo-da-tribulacao-divina",
    "name": "Corpo da Tribulação Divina",
    "rarity": "divine",
    "ordinal": 1,
    "sourceName": "CORPO DA TRIBULAÇÃO DIVINA",
    "description": [
      "Uma constituição extremamente poderosa que permite que você absorva a energia da tribulação para aumentar seu entendimento e cultivo, utilizando os próprios céus para evoluir. Você recebe as seguintes características:",
      "Você reduz a CD da tribulação em -8;",
      "Ao subir de Rank, você sempre começa do segundo nível;",
      "Você pode subir até o pico do Rank de Transformação Divina sem consumir Pontos de Cultivo;",
      "Você recebe diminui a CD, Pontos de Cultivo e Pontos de Qi nos próximos 2 conceitos que você estudar pela metade, assim como ignora os requisitos de núcleo ou matrizes para compreender os níveis desses conceitos. Esse efeito se repete a cada vez que você subir de Rank."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 7,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Você recebe imunidade a dano de Fogo e Elétrico de criaturas de até 1 Rank acima do seu, até um máximo de “Empírico”. Caso você sofra um dano elétrico que não possa ter imunidade, você recebe resistência 20 no lugar que não pode ser negada."
    ],
    "curse": [],
    "mechanics": {
      "family": "tribulation",
      "tier": 4,
      "breakthroughCDReduction": 8,
      "breakthroughStage": 2,
      "freeCultivationThroughRank": 5,
      "tribulationFocusCount": 2
    },
    "sourceNotes": []
  },
  {
    "id": "divine-corpo-elemental-divino",
    "name": "Corpo Elemental Divino",
    "rarity": "divine",
    "ordinal": 2,
    "sourceName": "CORPO ELEMENTAL DIVINO",
    "description": [
      "Uma constituição que permite que você canalize 5 tipos de elementos específicos em seu corpo, tendo mais facilidade na sua utilização. Você gasta metade do Tempo, Pontos de Cultivo e quantidade de Qi para aprender esses 5 elementos específicos. Caso você o evolua do Rank Sagrado, você recebe afinidade a um elemento adicional de forma aleatória.",
      "Você pode receber afinidade a um Elemento Avançado com esse efeito."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 7,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Lorde Sagrado: Você passa a causar 9 de dano adicional em seus ataques e técnicas que causam dano desses mesmos elementos. Além disso, você reduz o custo dessas técnicas em 3 Pontos de Qi, até um mínimo igual a metade do custo total."
    ],
    "curse": [],
    "mechanics": {
      "family": "elemental",
      "tier": 4,
      "affinityCount": 5,
      "advancedAffinities": true,
      "elementDamageBonus": 9,
      "techniqueQiDiscount": 3
    },
    "sourceNotes": []
  },
  {
    "id": "divine-amado-pelos-ceus",
    "name": "Amado Pelos Céus",
    "rarity": "divine",
    "ordinal": 3,
    "sourceName": "AMADO PELOS CÉUS",
    "description": [
      "Uma constituição que permite que você absorva Qi da atmosfera e de Cristais de Essência com mais facilidade, permitindo que você acelere seu cultivo. Você absorve 100 vezes mais Essência de Qi por dia (arredondado para baixo) e pode evoluir até o Rank de Mar divino sem consumir Pontos de Cultivo."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 4,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Mar Divino: Você multiplica a quantidade de Qi que você recebe de Cristais de Essência em 20 vezes. Além disso, você pode gastar 20 Cristais de Essência de mesmo Rank da sua constituição para ignorar o requisito de Pontos de Cultivo para subir de nível, mas não de Rank."
    ],
    "curse": [],
    "mechanics": {
      "family": "celestial-absorption",
      "tier": 4,
      "absorptionMultiplier": 100,
      "crystalMultiplier": 20,
      "freeCultivationThroughRank": 4
    },
    "sourceNotes": []
  },
  {
    "id": "divine-corpo-divino-de-medicina-espiritual",
    "name": "Corpo Divino de Medicina Espiritual",
    "rarity": "divine",
    "ordinal": 4,
    "sourceName": "CORPO DIVINO DE MEDICINA ESPRITUAL",
    "description": [
      "Uma constituição que te fornece uma grande afinidade em pílulas, permitindo seu consumo sem um grande malefício ao corpo. Você pode consumir o 10 vezes mais pílulas sem que elas percam os efeitos em você. Além disso, você é totalmente imune aos efeitos de toxinas causadas por pílulas. Além disso, as pílulas tem efeitos dobrados quando consumidas por você."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": 7,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Lorde Sagrado: Você reduz a CD em 10 quando estiver criando pílulas que você já tenha criado com sucesso. Além disso, você reduz a CD de novas pílulas em -5."
    ],
    "curse": [],
    "mechanics": {
      "family": "alchemy",
      "tier": 4,
      "pillRepeatMultiplier": 10,
      "toxinDivisor": null,
      "toxinImmune": true,
      "pillEffectMultiplier": 2,
      "knownPillDCReduction": 10,
      "newPillDCReduction": 5
    },
    "sourceNotes": []
  },
  {
    "id": "divine-corpo-yang-divino-extremo",
    "name": "Corpo Yang Divino Extremo",
    "rarity": "divine",
    "ordinal": 5,
    "sourceName": "CORPO YANG DIVINO EXTREMO",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yang em seu corpo e aumente sua capacidade de utilizar os elementos de Yang que são: Fogo, Metal, Eletricidade e Luz. Você não consome Pontos de Cultivo até o 5º nível desses elementos e consome metade (arredondado para baixo) dos Pontos de Cultivo, Tempo e Pontos de Qi para treinar esses elementos."
    ],
    "minimumRank": 4,
    "minimumCultivation": "Mar Divino",
    "additionalRank": 1,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 10 vezes mais essência por dia em cultivo duplo com criaturas com Corpo Yin. Além disso, você quadriplica sua velocidade de cultivo em zonas em saturadas com elemento Yang."
    ],
    "curse": [],
    "mechanics": {
      "family": "yang",
      "tier": 4,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 0.5,
      "freeElementLevel": 5,
      "dualCultivationMultiplier": 10,
      "zoneMultiplier": 4
    },
    "sourceNotes": []
  },
  {
    "id": "divine-corpo-yin-divino-extremo",
    "name": "Corpo Yin Divino Extremo",
    "rarity": "divine",
    "ordinal": 6,
    "sourceName": "CORPO YIN SAGRADO",
    "description": [
      "Uma constituição que faz com que você possua uma enorme quantidade de Yin em seu corpo e aumente sua capacidade de utilizar os elementos de Yin que são: Água, Gelo, Ilusão e Escuridão. Você não consome Pontos de Cultivo até o 5º nível desses elementos e consome metade (arredondado para baixo) dos Pontos de Cultivo, Tempo e Pontos de Qi para treinar esses elementos."
    ],
    "minimumRank": 4,
    "minimumCultivation": "Mar Divino",
    "additionalRank": 1,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Em qualquer Rank de Cultivo, você recebe 10 vezes mais essência por dia em cultivo duplo com criaturas com Corpo Yang. Além disso, você quadruplica sua velocidade de cultivo em zonas em saturadas com elemento Yin."
    ],
    "curse": [],
    "mechanics": {
      "family": "yin",
      "tier": 4,
      "trainingPCFactor": 0.5,
      "trainingTimeFactor": 0.5,
      "trainingQiFactor": 0.5,
      "freeElementLevel": 5,
      "dualCultivationMultiplier": 10,
      "zoneMultiplier": 4
    },
    "sourceNotes": [
      "O título repete Corpo Yin Sagrado no grupo Divino; adotado Corpo Yin Divino Extremo, conforme a evolução do modelo Sagrado."
    ]
  },
  {
    "id": "divine-ira-dos-ceus",
    "name": "Ira dos Céus",
    "rarity": "divine",
    "ordinal": 7,
    "sourceName": "IRA DOS CÉUS",
    "description": [
      "Uma constituição que faz com que você perca sua sanidade em troca de uma grande quantidade de poder. Ao usar uma ação [⬢] para ativar essa constituição e receber as seguintes características:",
      "Recebe -10 contra todos os tipos de dano;",
      "Todos os seus atributos, com exceção de Sabedoria, se tornam 12 ou mantêm o valor atual, caso ele seja maior;",
      "Você perde -5 em Sabedoria e recebe a condição “Alucinado”, sendo movido pela fúria, até um mínimo de 1.",
      "Enquanto estiver nesse estado, você consome 20 Pontos de Qi por rodada para mantê-lo. Ao sair desse estado, você recebe 3 níveis de exaustão."
    ],
    "minimumRank": 7,
    "minimumCultivation": "Lorde Sagrado",
    "additionalRank": 4,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Mar Divino: Você é totalmente imune aos efeitos negativos de Qi demoníaco, permitindo até que você os absorva para cultivar. Enquanto estiver cultivando usando Qi demoníaco, você cultiva 500% mais rápido.",
      "Além disso, você pode utilizar Núcleo Demoníaco como um substituto de mesmo rank para cultivar um conceito que necessita de um núcleo de Besta."
    ],
    "curse": [],
    "mechanics": {
      "family": "wrath",
      "tier": 4,
      "actions": 1,
      "upkeepQi": 20,
      "attributeBonus": 0,
      "setAttributes": 12,
      "preserveHigherAttributes": true,
      "wisPenalty": 5,
      "wisMinimum": 1,
      "attributeCap": null,
      "allResistance": 10,
      "hallucinated": true,
      "exitExhaustion": 3,
      "demonicAbsorptionMultiplier": 6,
      "corruptionImmune": true,
      "attributeKeys": [
        "str",
        "dex",
        "con",
        "int",
        "cha"
      ]
    },
    "sourceNotes": []
  },
  {
    "id": "divine-deus-gigante",
    "name": "Deus Gigante",
    "rarity": "divine",
    "ordinal": 8,
    "sourceName": "DEUS GIGANTE",
    "description": [
      "Uma constituição que permite que você incendeie seu sangue para conseguir um poder maior, recebendo uma enorme de poder em troca. Ao usar duas ações [⬢⬢] e 100 Pontos de Qi da sua poça de Qi total, você recebe as seguintes características:",
      "Você recebe 180 Pontos de Armadura;",
      "Sua categoria de tamanho se torna “Imenso” e a efeitos que reduzam seu deslocamento;",
      "Você reduz todo dano sofrido em -20 de dano de Fogo, Frio, Contundente, Cortante e Perfurante e -10 de todo o resto.",
      "Você tem direito a 10 minutos transformado. Cada vez que você entrar na transformação, ela dura 1 minuto mesmo que você entre e saia dela no mesmo turno. Se você sair da transformação antes de se passar 1 minuto, você recupera 10 Pontos de Qi para cada rodada que falta para completar 10 rodadas."
    ],
    "minimumRank": 7,
    "minimumCultivation": "Lorde Sagrado",
    "additionalRank": 7,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Você recebe imunidade a todos os tipos de condições enquanto estiver utilizando a constituição."
    ],
    "curse": [],
    "mechanics": {
      "family": "blood",
      "tier": 4,
      "actions": 2,
      "totalQi": 100,
      "shield": 180,
      "physicalResistance": 20,
      "otherResistance": 10,
      "durationSeconds": 600,
      "usesPerLongRest": 10,
      "size": "grg",
      "ignoresDifficultTerrain": true,
      "allConditionsImmune": true
    },
    "sourceNotes": []
  },
  {
    "id": "divine-imitacao-perfeita-extrema",
    "name": "Imitação Perfeita Extrema",
    "rarity": "divine",
    "ordinal": 9,
    "sourceName": "IMITAÇÃO PERFEITA EXTREMA",
    "description": [
      "Uma constituição que permite que você mude totalmente seu corpo para o de outra criatura, podendo adotar a ficha da mesma e utiliza-la como se você fosse ela, podendo utilizar até mesmo suas técnicas marciais, podendo utilizar todos os conceitos que ela utiliza a 2 níveis abaixo.",
      "Você tem 6 espaços de transformação e demora 1 dia para analisar uma criatura e poder se transformar nela, desde que você a mantenha dentro do alcance do seu Sentido Divino e fique analisando-a com o mesmo."
    ],
    "minimumRank": 7,
    "minimumCultivation": "Lorde Sagrado",
    "additionalRank": 1,
    "minimumClass": "Inferior",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [
      "Em qualquer nível de cultivo, você pode substituir a necessidade do núcleo de uma Besta da Ilusão para compreender um conceito por uma matriz de acúmulo de Qi de Ilusão do mesmo nível do conceito, devendo cultivar dentro dela por 15 dias."
    ],
    "curse": [],
    "mechanics": {
      "family": "imitation",
      "tier": 4,
      "actions": null,
      "qi": null,
      "durationSeconds": null,
      "illusionMatrixDays": 15
    },
    "sourceNotes": [
      "O quadro indica classe Inferior, mas a tabela de raridades define Divino como classe Única."
    ]
  },
  {
    "id": "supreme-corpo-refinador-de-ceu",
    "name": "Corpo Refinador de Céu",
    "rarity": "supreme",
    "ordinal": 1,
    "sourceName": "CORPO REFINADOR DE CÉU",
    "description": [
      "Uma constituição suprema capaz de refinar qualquer tipo de material que contenha Qi e transformar em essência para o usuário. A cada vez que você engolir o núcleo de uma besta ou um cristal de essência, você recebe o equivalente à metade da essência equivalente ao Rank atual dele na tabela de evolução. Por exemplo: Ao engolir o núcleo de uma criatura na Condensação de Qi, você recebe 125 Pontos de Essência, e recebendo 500 Pontos de Essência ao consumir o núcleo de uma criatura no Núcleo Rotativo. Porém, você não recebe nada de criaturas 2 Ranks abaixo de você ou mais e seu corpo explode se você engolir o núcleo de algo 3 ranks acima ou maior.",
      "Além disso, você consome metade dos Pontos de Cultivo para evoluir de Nível e Rank."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [],
    "curse": [
      "Você consome o dobro de Pontos de Cultivo para treinar qualquer conceito."
    ],
    "mechanics": {
      "family": "heaven-refiner",
      "tier": 5
    },
    "sourceNotes": []
  },
  {
    "id": "supreme-corpo-omni-elemental",
    "name": "Corpo Omni Elemental",
    "rarity": "supreme",
    "ordinal": 2,
    "sourceName": "CORPO OMNI ELEMENTAL",
    "description": [
      "Uma constituição que permite que você canalize TODOS os elementos em seu corpo, tendo mais facilidade na sua utilização. Você gasta metade do Tempo, Pontos de Cultivo e quantidade de Qi para aprender os elementos. Além disso, você trata todos os elementos como se fossem elementos básicos para dificuldade, quantidade de Qi e Pontos de Cultivo."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [],
    "curse": [
      "Você precisa do dobro de pontos de essência para subir de Rank de Cultivo."
    ],
    "mechanics": {
      "family": "omni",
      "tier": 5
    },
    "sourceNotes": []
  },
  {
    "id": "supreme-corpo-devorador-de-constituicoes",
    "name": "Corpo Devorador de Constituições",
    "rarity": "supreme",
    "ordinal": 3,
    "sourceName": "CORPO DEVORADOR DE CONSTITUIÇÕES",
    "description": [
      "Uma constituição que permite que você absorva constituições de outras criaturas, recebendo os efeitos em seu corpo. Você pode manter até 3 constituições em adicional a essa dentro de seu corpo, ganhando todos os seus benefícios.",
      "Você não pode absorver uma Constituição Suprema usando essa constituição."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [],
    "curse": [
      "Você não pode praticar nenhuma profissão que não seja relacionada com uma constituição sua e a cada constituição em seu corpo dobra a quantidade de Essência Necessária para subir para o próximo nível/rank."
    ],
    "mechanics": {
      "family": "devourer",
      "tier": 5
    },
    "sourceNotes": []
  },
  {
    "id": "supreme-corpo-do-deus-celestial",
    "name": "Corpo do Deus Celestial",
    "rarity": "supreme",
    "ordinal": 4,
    "sourceName": "CORPO DO DEUS CELESTIAL",
    "description": [
      "Uma constituição que permite que você se torne imune a todos os efeitos negativos de tesouros, pílulas, ervas e qualquer consumível encontrado no mundo, ignorando qualquer penalidade que venha junto de seus benefícios. Você também se torna imune ao Sentido Divino das criaturas, assim como elas não podem ver seu cultivo.",
      "Adicionalmente, você não pode ser visto pelos céus durante seu avanço, permitindo que você ignore tribulações, gastando apenas os Pontos de Cultivo para avançar."
    ],
    "minimumRank": 1,
    "minimumCultivation": "Condensação de Qi",
    "additionalRank": null,
    "minimumClass": "Única",
    "evolution": "-",
    "evolutionMethod": "-",
    "additionalEffects": [],
    "curse": [
      "Você é imune a efeitos de pílulas e matrizes de nível 4 ou inferior, assim como não pode utilizar tesouros de Rank Céu ou inferior, fazendo com que eles se tornem cinzas quando você os equipar."
    ],
    "mechanics": {
      "family": "celestial-god",
      "tier": 5
    },
    "sourceNotes": []
  }
];
