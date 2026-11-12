/** Authored combat-manual techniques, transcribed from the supplied Player Book v2.1, section 4.2 (requested pages 46–51). */
export const COMBAT_MANUAL_CATEGORIES = [
  {
    "id": "palma",
    "name": "Palma",
    "weapon": "Desarmado (palma)",
    "img": "assets/wuxia/proficiencies/unarmed.webp"
  },
  {
    "id": "espadas",
    "name": "Espadas",
    "weapon": "Espada",
    "img": "assets/wuxia/armas-pintadas-v1/jian.webp"
  },
  {
    "id": "lanca",
    "name": "Lança",
    "weapon": "Lança",
    "img": "assets/wuxia/armas-pintadas-v1/qiang.webp"
  },
  {
    "id": "desarmados",
    "name": "Desarmados",
    "weapon": "Desarmado",
    "img": "assets/wuxia/proficiencies/unarmed.webp"
  },
  {
    "id": "citara",
    "name": "Cítara",
    "weapon": "Cítara",
    "img": "assets/wuxia/antecedentes-pintados-v1/musico.webp"
  },
  {
    "id": "leque",
    "name": "Leque",
    "weapon": "Leque",
    "img": "assets/wuxia/armas-pintadas-v1/leque-de-ferro.webp"
  },
  {
    "id": "arco",
    "name": "Arco",
    "weapon": "Arco",
    "img": "assets/wuxia/armas-pintadas-v1/arco-longo.webp"
  },
  {
    "id": "movimento",
    "name": "Movimento",
    "weapon": "Nenhum",
    "img": "assets/wuxia/talentos-qi-pintados-v1/passo-esguio.webp"
  },
  {
    "id": "bastoes",
    "name": "Bastões",
    "weapon": "Bastão",
    "img": "assets/wuxia/armas-pintadas-v1/bastao-longo.webp"
  },
  {
    "id": "wok",
    "name": "Wok",
    "weapon": "Wok",
    "img": "icons/tools/cooking/pot-camping-iron-black.webp"
  }
];

export const COMBAT_MANUAL_TECHNIQUES = [
  {
    "id": "golpe-interno",
    "name": "Golpe Interno",
    "grade": 1,
    "category": "palma",
    "weapon": "Desarmado (palma)",
    "auxiliary": false,
    "qi": 1,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você avança e desfere um golpe de palma contra o peito de uma criatura inimiga, liberando seu Qi no ponto de impacto."
    ],
    "sourceCard": {
      "duration": "Até o início do seu próximo turno.",
      "range": "Toque",
      "requirements": "-",
      "damage": "2d8 de dano Contundente",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack"
    }
  },
  {
    "id": "mao-do-perdao",
    "name": "Mão do Perdão",
    "grade": 2,
    "category": "palma",
    "weapon": "Desarmado (palma)",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você desfere um golpe de palma contra uma criatura dentro do alcance, enviando uma onda de Qi que atravessa seu corpo ultrapassando a maior parte das defesas do alvo. A criatura deve realizar uma Salvaguarda de Constituição para não receber a condição “Estremecido” até o fim do próximo turno dela."
    ],
    "sourceCard": {
      "duration": "Até o início do seu próximo turno.",
      "range": "Até 5 metros, Linha",
      "requirements": "-",
      "damage": "2d8 de dano Trovejante",
      "combinedAttack": false
    },
    "mechanics": {
      "type": "attack",
      "attackMode": "ranged",
      "condition": {
        "id": "jj-estremecido",
        "save": "con"
      },
      "manual": [
        "Estremecido dura até o fim do próximo turno do alvo. A duração geral do quadro termina no início do seu próximo turno; acompanhe os dois tempos separadamente."
      ]
    }
  },
  {
    "id": "palma-incapacitadora",
    "name": "Palma Incapacitadora",
    "grade": null,
    "category": "palma",
    "weapon": "Desarmado (palma)",
    "auxiliary": true,
    "qi": 4,
    "actions": 2,
    "reaction": false,
    "description": [
      "Você avança na direção de uma criatura e desfere um golpe de palma contra seu corpo, enviando uma onda de choque que afeta seus movimentos. A criatura deve realizar uma Salvaguarda de Constituição para não receber a condição “Incapacitado” até o fim do próximo turno dela."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Pessoal",
      "requirements": "-",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "save",
      "save": "con",
      "condition": {
        "id": "jj-incapacitado",
        "save": "con"
      },
      "manual": [
        "Avance e escolha a criatura atingida pela palma. Incapacitado termina no fim do próximo turno dela. O alcance Pessoal do quadro não move o token automaticamente."
      ]
    }
  },
  {
    "id": "corte-violento",
    "name": "Corte Violento",
    "grade": 1,
    "category": "espadas",
    "weapon": "Espada",
    "auxiliary": false,
    "qi": 1,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você desfere um poderoso golpe com sua espada potencializado pelo seu Qi nos músculos onde você exerce sua força para o corte."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "-",
      "damage": "2d8 de dano Cortante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack"
    }
  },
  {
    "id": "first-wave",
    "name": "First Wave",
    "grade": 2,
    "category": "espadas",
    "weapon": "Espada",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você realiza uma jogada de ataque que libera uma onda cortante de Qi da sua lâmina que tenta atingir um alvo dentro do alcance da técnica. Essa habilidade tem margem de acerto crítico 19-20."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 10 metros, Linha",
      "requirements": "-",
      "damage": "4d8 de dano Cortante",
      "combinedAttack": false
    },
    "mechanics": {
      "type": "attack",
      "attackMode": "ranged",
      "critical": 19
    }
  },
  {
    "id": "desvio-sutil",
    "name": "Desvio Sutil",
    "grade": null,
    "category": "espadas",
    "weapon": "Espada",
    "auxiliary": true,
    "qi": 3,
    "actions": 2,
    "reaction": true,
    "description": [
      "Quando você for alvo de uma jogada de ataque normal a distância ou de uma técnica de até 2º grau a distância ou em área, você pode usar sua reação para cortar através do ataque ou desvia-lo para o terreno a sua volta e anulando o dano sobre si mesmo."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Pessoal",
      "requirements": "Arma Cortante, Reação",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "manual": [
        "Use somente contra um ataque comum à distância ou técnica à distância/em área de até 2º grau. Depois do pagamento, o narrador anula o dano sobre você; a técnica não concede imunidade duradoura."
      ]
    }
  },
  {
    "id": "killing-circle",
    "name": "Killing Circle",
    "grade": 1,
    "category": "lanca",
    "weapon": "Lança",
    "auxiliary": false,
    "qi": 1,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você balança sua lança na horizontal cortando todas as criaturas na área a sua frente enquanto avança. Todas as criaturas dentro da área da técnica devem realizar uma Salvaguarda de Agilidade. Sofrendo todo dano se falharem ou metade se obtiverem sucesso."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 6 metros, Cone",
      "requirements": "-",
      "damage": "1d8 de dano Cortante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "save",
      "save": "dex",
      "onSave": "half",
      "allTargets": true
    }
  },
  {
    "id": "investida-do-dragao",
    "name": "Investida do Dragão",
    "grade": 2,
    "category": "lanca",
    "weapon": "Lança",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Uma estocada que é feita com tanta força que envia uma onda perfurante em linha reta. Todas as criaturas na linha da técnica devem realizar um Salvaguarda de Agilidade. Sofrendo todo dano se falharem ou metade se obtiverem sucesso.",
      "O alcance dessa técnica não pode ser aumentado de nenhuma forma.",
      "<Alternativamente> Você pode utilizar essa técnica em uma única criatura no seu alcance de “Toque” causando 24 de dano Perfurante."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 10 metros, Linha",
      "requirements": "Lança",
      "damage": "4d6 de dano Perfurante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "save",
      "save": "dex",
      "onSave": "half",
      "allTargets": true,
      "rangeLocked": true,
      "alternatives": [
        {
          "key": "touch",
          "name": "Estocada a toque — 24 de dano",
          "type": "attack",
          "range": {
            "units": "touch"
          },
          "damage": {
            "formula": "24",
            "type": "piercing"
          }
        }
      ],
      "manual": [
        "Escolha a linha de 10 metros ou a estocada a toque; cada atividade representa uma ativação completa, não um dano adicional. O alcance desta técnica não pode ser ampliado."
      ]
    }
  },
  {
    "id": "accurate-thrust",
    "name": "Accurate Thrust",
    "grade": null,
    "category": "lanca",
    "weapon": "Lança",
    "auxiliary": true,
    "qi": 2,
    "actions": 1,
    "reaction": true,
    "description": [
      "Quando uma criatura realizar uma jogada de ataque (Comum) corpo-a-corpo, você pode usar sua reação para realizar um ataque contra ela, anulando o dano se a criatura for de mesmo rank que você ou reduzindo 30 de dano do ataque."
    ],
    "sourceCard": {
      "duration": "Até o fim do turno atual",
      "range": "Pessoal",
      "requirements": "Lança, Reação",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "manual": [
        "Resolva o contra-ataque comum com a lança contra o ataque corpo a corpo desencadeador, sem cobrar novamente esta ativação. Se a criatura tiver o mesmo reino, anule o dano; nos demais casos reduza 30 apenas desse golpe."
      ]
    }
  },
  {
    "id": "punho-brutal",
    "name": "Punho Brutal",
    "grade": 1,
    "category": "desarmados",
    "weapon": "Desarmado",
    "auxiliary": false,
    "qi": 1,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você concentra uma grande quantidade de Qi em seu punho, ombros e quadris antes de desferir um poderoso golpe contra o alvo."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "-",
      "damage": "2d8 de dano Contundente",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack"
    }
  },
  {
    "id": "arremesso-pesado",
    "name": "Arremesso Pesado",
    "grade": 2,
    "category": "desarmados",
    "weapon": "Desarmado",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você concentra uma grande quantidade de força nas suas mãos antes de desferir um poderoso golpe contra o corpo da criatura para tentar atirar ela violentamente contra o chão. O alvo deve ser bem-sucedido em uma Salvaguarda de Força para não receber a condição “Caído”."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "-",
      "damage": "4d8 de dano Contundente",
      "combinedAttack": false
    },
    "mechanics": {
      "type": "attack",
      "condition": {
        "id": "jj-caido",
        "save": "str"
      }
    }
  },
  {
    "id": "rage-kick",
    "name": "Rage Kick",
    "grade": 2,
    "category": "desarmados",
    "weapon": "Desarmado",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você desfere um poderoso chute contra o corpo de uma criatura com força suficiente para enviá-la voando. Um alvo atingido deve realizar uma Salvaguarda de Força. Sendo empurrado por 6 metros em caso de falha.",
      "Se, durante o empurrão, a criatura atingir um objeto ou estrutura de 1,5 metros de raio ou maior, ela recebe 10 de dano extra."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "-",
      "damage": "3d8 de dano Contundente",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack",
      "extraSaves": [
        {
          "key": "push-save",
          "name": "Resistir ao empurrão após o acerto",
          "save": "str"
        }
      ],
      "manual": [
        "Após acertar, resolva a salvaguarda de Força sem pagar outra ativação. Na falha, empurre 6 metros; a colisão com objeto ou estrutura de 1,5 metro ou maior causa 10 de dano extra. O narrador posiciona o alvo e confirma a colisão."
      ]
    }
  },
  {
    "id": "melodia-decadente",
    "name": "Melodia Decadente",
    "grade": 1,
    "category": "citara",
    "weapon": "Cítara",
    "auxiliary": false,
    "qi": 2,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você libera uma nota da sua citara que envia uma onda sonora carregada de Qi na direção da criatura inimiga, explodindo em seu corpo ao atingir. A criatura deve realizar uma Salvaguarda de Constituição. Sofrendo todo dano se falhar ou metade se obtiver sucesso."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 15 metros, Linha",
      "requirements": "Citara",
      "damage": "1d8 de dano Trovejante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "save",
      "save": "con",
      "onSave": "half"
    }
  },
  {
    "id": "choque-trovejante",
    "name": "Choque Trovejante",
    "grade": 2,
    "category": "citara",
    "weapon": "Cítara",
    "auxiliary": false,
    "qi": 4,
    "actions": 2,
    "reaction": false,
    "description": [
      "Você libera uma nota concentrada na área a sua frente que envia uma onda de choque poderosa. Todas as criaturas dentro da área devem realizar uma Salvaguarda de Constituição. Sofrendo todo dano se falharem ou metade se obtiverem sucesso."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 15 metros, Cone",
      "requirements": "Citara",
      "damage": "16 de dano Trovejante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "save",
      "save": "con",
      "onSave": "half",
      "allTargets": true
    }
  },
  {
    "id": "som-inspirador",
    "name": "Som Inspirador",
    "grade": null,
    "category": "citara",
    "weapon": "Cítara",
    "auxiliary": true,
    "qi": 4,
    "actions": 2,
    "reaction": false,
    "description": [
      "Você toca uma única nota que se espalha como uma ondulação pelo local. Todas as criaturas (à sua escolha) a até 30 metros recebem 1d6 para utilizar em uma rolagem no d20."
    ],
    "sourceCard": {
      "duration": "Até o fim do turno atual",
      "range": "Até 30 metros, Emanação",
      "requirements": "Citara",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "roll": "1d6",
      "allTargets": true,
      "choice": true,
      "manual": [
        "Escolha as criaturas na emanação de 30 metros. Cada uma pode usar 1d6 em uma rolagem no d20 até o fim do turno atual; aplique esse dado somente à rolagem escolhida."
      ]
    }
  },
  {
    "id": "corte-de-papel",
    "name": "Corte de Papel",
    "grade": 1,
    "category": "leque",
    "weapon": "Leque",
    "auxiliary": false,
    "qi": 2,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você balança seu leque com velocidade e precisão em um ângulo perfeito, permitindo que você possa cortar através de materiais bem resistentes. Você tem margem de acerto crítico 19-20 com essa técnica."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "Citara",
      "damage": "12 de dano Cortante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack",
      "critical": 19,
      "corrections": [
        "O quadro traz Citara como requisito; foi corrigido para Leque, conforme a categoria e a descrição."
      ]
    }
  },
  {
    "id": "laminas-de-vento",
    "name": "Lâminas de Vento",
    "grade": 2,
    "category": "leque",
    "weapon": "Leque",
    "auxiliary": false,
    "qi": 3,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você carrega seu Qi em seu leque antes de balançar ele com força liberando lâminas de vento que avançam na direção do seu alvo."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 18 metros, Linha",
      "requirements": "Citara",
      "damage": "24 de dano Cortante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack",
      "attackMode": "ranged",
      "corrections": [
        "O quadro traz Citara como requisito; foi corrigido para Leque, conforme a categoria e a descrição."
      ]
    }
  },
  {
    "id": "little-twist",
    "name": "Little Twist",
    "grade": null,
    "category": "leque",
    "weapon": "Leque",
    "auxiliary": true,
    "qi": 2,
    "actions": 2,
    "reaction": false,
    "description": [
      "Você balança seu leque formando um pequeno tornado a sua frente potencializado pelo seu Qi. Todas as criaturas, com exceção de você, a até 9 metros de raio do tornado devem realizar uma Salvaguarda de Força para não serem puxadas por 12 metros na direção do tornado."
    ],
    "sourceCard": {
      "duration": "Até o início do seu próximo turno.",
      "range": "Até 15 metros, Linha",
      "requirements": "Leque",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "save",
      "save": "str",
      "allTargets": true,
      "range": {
        "value": 15,
        "units": "m"
      },
      "template": {
        "type": "circle",
        "size": 9
      },
      "manual": [
        "Posicione o tornado a até 15 metros. Exclua o usuário e resolva uma salvaguarda de Força de cada criatura no raio de 9 metros; na falha, puxe-a 12 metros em direção ao tornado. O narrador move os tokens."
      ]
    }
  },
  {
    "id": "tiro-de-advertencia",
    "name": "Tiro de Advertência",
    "grade": 1,
    "category": "arco",
    "weapon": "Arco",
    "auxiliary": false,
    "qi": 2,
    "actions": 3,
    "reaction": false,
    "description": [
      "Ao realizar um disparo incrivelmente rápido e quase raspando no seu inimigo, com uma jogada de ataque à distância, você consegue assustá-lo e lhe causar dano psíquico.",
      "A criatura alvo desta técnica deve fazer uma Salvaguarda de Intelecto, se falhar ela não pode utilizar a reação até o fim do próximo turno dela."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "Arco",
      "damage": "2d8 de dano Cortante",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack",
      "attackMode": "ranged",
      "damage": {
        "dice": 2,
        "die": 8,
        "type": "psychic"
      },
      "range": {
        "units": "spec",
        "special": "Alcance do arco utilizado."
      },
      "extraSaves": [
        {
          "key": "reaction-save",
          "name": "Resistir à perda da reação após o acerto",
          "save": "int"
        }
      ],
      "corrections": [
        "A descrição indica dano psíquico e disparo à distância, mas o quadro traz Cortante e Toque. Configurado como 2d8 psíquico, alcance do arco e Reflexo (Intelecto); confirme com o narrador."
      ],
      "manual": [
        "Depois do acerto, resolva Reflexo (Intelecto) sem outro gasto da técnica. Na falha, o alvo não pode usar reações até o fim do próximo turno dele. Use o alcance do arco escolhido."
      ]
    }
  },
  {
    "id": "marca-do-cacador",
    "name": "Marca do Caçador",
    "grade": 2,
    "category": "arco",
    "weapon": "Arco",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você pode marcar uma criatura a até 12 metros de distância para ser o alvo de seus ataques enquanto você foca grande parte da sua atenção nessa criatura. Enquanto essa habilidade estiver ativa, você recebe 3 de dano adicional em todas as jogadas de ataque a distância contra o alvo marcado.",
      "Caso a criatura seja morta ou caia inconsciente com 0 Pontos de Vida e a habilidade ainda possua tempo restante, você pode usar uma ação [⬢] para mover a marca para uma outra criatura dentro de um alcance de 21 metros."
    ],
    "sourceCard": {
      "duration": "Até 1 minuto, Concentração",
      "range": "Até 15 metros, Linha",
      "requirements": "Arco",
      "damage": "Nenhum",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "utility",
      "range": {
        "value": 12,
        "units": "m"
      },
      "template": {
        "type": "",
        "size": ""
      },
      "alternatives": [
        {
          "key": "transfer",
          "name": "Transferir marca já ativa",
          "type": "utility",
          "qi": 0,
          "actions": 1,
          "range": {
            "value": 21,
            "units": "m"
          },
          "duration": {
            "value": "",
            "units": "inst",
            "concentration": false
          },
          "condition": "Somente se o alvo anterior morrer ou ficar inconsciente com 0 PV e a marca ainda estiver ativa."
        }
      ],
      "corrections": [
        "A descrição limita a marca inicial a 12 metros e o quadro indica 15. Foi usado o alcance de 12 metros da descrição; a transferência conserva os 21 metros explícitos."
      ],
      "manual": [
        "Registre uma única criatura marcada e acrescente 3 de dano somente aos seus ataques à distância contra ela. A transferência conserva a duração restante da marca; não paga Qi novamente e não inicia um novo minuto. A concentração e o alvo são acompanhados pela mesa."
      ]
    }
  },
  {
    "id": "ataque-debilitador",
    "name": "Ataque Debilitador",
    "grade": null,
    "category": "arco",
    "weapon": "Arco",
    "auxiliary": true,
    "qi": 2,
    "actions": 0,
    "reaction": true,
    "description": [
      "Quando uma criatura tentar se mover em qualquer direção, você pode realizar um disparo contra sua perna. O alvo deve realizar uma Salvaguarda de Constituição para não ter seu deslocamento reduzido a 0."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Arma",
      "requirements": "Arco, Reação",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "save",
      "save": "con",
      "manual": [
        "Quando a criatura tentar se mover, resolva Constituição. Na falha, o deslocamento dela fica em 0 conforme o texto. O quadro não define por quanto tempo esse impedimento permanece; confirme a duração com o narrador. Não foi acrescentado dano ao disparo."
      ]
    }
  },
  {
    "id": "avanco-rapido",
    "name": "Avanço Rápido",
    "grade": null,
    "category": "movimento",
    "weapon": "Nenhum",
    "auxiliary": true,
    "qi": 2,
    "actions": 2,
    "reaction": false,
    "description": [
      "Ao ativar essa técnica, você recebe +5 metros de deslocamento e recebe duas vantagens na sua próxima rolagem de acerto."
    ],
    "sourceCard": {
      "duration": "Até o início do seu próximo turno.",
      "range": "Pessoal",
      "requirements": "Nenhum",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "manual": [
        "Depois de ativar, acrescente 5 metros ao deslocamento até o início do próximo turno e aplique duas vantagens somente à próxima rolagem de acerto. Acompanhe o movimento e o consumo das vantagens na mesa."
      ]
    }
  },
  {
    "id": "nuvens-a-deriva",
    "name": "Nuvens à Deriva",
    "grade": null,
    "category": "movimento",
    "weapon": "Nenhum",
    "auxiliary": true,
    "qi": 2,
    "actions": 1,
    "reaction": false,
    "description": [
      "Você desaparece do local que se encontra e aparece em um local a 5 metros de distância, enquanto uma forma similar a sua aparece em outro lugar a 5 metros, a cópia se move em uma direção a sua escolha, mas desaparece em fumaça ao fim do deslocamento."
    ],
    "sourceCard": {
      "duration": "Até o fim do turno atual.",
      "range": "Pessoal",
      "requirements": "Nenhum",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "manual": [
        "Escolha um destino a 5 metros, mova o token e indique outro ponto a 5 metros para a cópia. Resolva o movimento da cópia e seu desaparecimento em fumaça; nenhum segundo ator é criado."
      ]
    }
  },
  {
    "id": "chest-blow",
    "name": "Chest Blow",
    "grade": 1,
    "category": "bastoes",
    "weapon": "Bastão",
    "auxiliary": false,
    "qi": 2,
    "actions": 2,
    "reaction": false,
    "description": [
      "Você desfere um golpe com a ponta do cajado contra o peito do alvo com grande força. A criatura deve realizar uma Salvaguarda de Força para não ser empurrada por 6 metros.",
      "Se a criatura colidir com um objeto ou estrutura de 1,5 metros ou maior, ela recebe 10 de dano Contundente adicional."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "Bastão",
      "damage": "1d8 de dano Contundente",
      "combinedAttack": true
    },
    "mechanics": {
      "type": "attack",
      "extraSaves": [
        {
          "key": "push-save",
          "name": "Resistir ao empurrão após o acerto",
          "save": "str"
        }
      ],
      "manual": [
        "Depois de acertar, resolva Força sem nova ativação. Na falha, mova a criatura 6 metros. A colisão descrita causa 10 de dano Contundente extra, aplicado após confirmação do narrador."
      ]
    }
  },
  {
    "id": "heavy-bash",
    "name": "Heavy Bash",
    "grade": 2,
    "category": "bastoes",
    "weapon": "Bastão",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você dá um giro no seu bastão antes de pular e desferir um golpe contra a cabeça do oponente. A criatura deve realizar uma Salvaguarda de Constituição para não receber a condição “Incapacitado” até o fim do próximo turno dela.",
      "<Alternativamente> Você pode utilizar essa técnica em uma única criatura no seu alcance de “Toque” causando 4d8 de dano Perfurante."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "Bastão",
      "damage": "1d8 de dano Contundente",
      "combinedAttack": false
    },
    "mechanics": {
      "type": "attack",
      "condition": {
        "id": "jj-incapacitado",
        "save": "con"
      },
      "alternatives": [
        {
          "key": "piercing",
          "name": "Golpe alternativo — 4d8 Perfurante",
          "type": "attack",
          "damage": {
            "dice": 4,
            "die": 8,
            "type": "piercing"
          }
        }
      ],
      "manual": [
        "Escolha somente uma versão do dano por ativação: 1d8 Contundente ou 4d8 Perfurante. Incapacitado dura até o fim do próximo turno do alvo se ele falhar em Constituição."
      ]
    }
  },
  {
    "id": "monkey-sight",
    "name": "Monkey Sight",
    "grade": null,
    "category": "bastoes",
    "weapon": "Bastão",
    "auxiliary": true,
    "qi": 2,
    "actions": 1,
    "reaction": true,
    "description": [
      "Quando você for alvo de uma jogada de acerto ou tiver que realizar uma Salvaguarda de Força ou Agilidade. Você pode desencadear um dos seguintes efeitos:",
      "Ataque Comum: Você sobe no topo do bastão e faz o ataque te errar automaticamente;",
      "Ataque em Área: Você sobe no bastão e recebe vantagem e +1 na Salvaguarda."
    ],
    "sourceCard": {
      "duration": "Instantâneo.",
      "range": "Pessoal",
      "requirements": "Reação, Bastão",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "manual": [
        "Escolha o efeito correspondente ao gatilho: faça o ataque comum errar automaticamente ou aplique vantagem e +1 à salvaguarda de Força/Agilidade contra o ataque em área. A proteção vale somente para esse gatilho."
      ]
    }
  },
  {
    "id": "wok-bash",
    "name": "Wok Bash",
    "grade": 1,
    "category": "wok",
    "weapon": "Wok",
    "auxiliary": false,
    "qi": 2,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você dá um pulo e desfere um golpe com o Wok na cabeça da criatura inimiga após infundi-lo com seu Qi. A criatura deve realizar uma Salvaguarda de Constituição para não receber a condição “Estremecido” até o fim do próximo turno dela."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Toque",
      "requirements": "Wok",
      "damage": "Nenhum",
      "combinedAttack": false
    },
    "mechanics": {
      "type": "save",
      "save": "con",
      "condition": {
        "id": "jj-estremecido",
        "save": "con"
      },
      "manual": [
        "A técnica não causa dano. Aplique Estremecido somente se a criatura falhar em Constituição; a condição termina no fim do próximo turno dela."
      ]
    }
  },
  {
    "id": "wok-shake",
    "name": "Wok Shake",
    "grade": 2,
    "category": "wok",
    "weapon": "Wok",
    "auxiliary": false,
    "qi": 4,
    "actions": 3,
    "reaction": false,
    "description": [
      "Você dá um pulo antes de cair no chão acertando seu Wok com toda força. Todas as criaturas dentro da área da técnica devem realizar uma Salvaguarda de Agilidade para não sofrerem todo dano e receberem a condição “Caído” ou metade do dano sem receber nenhuma condição."
    ],
    "sourceCard": {
      "duration": "Instantâneo",
      "range": "Até 5 metros de raio, Esfera",
      "requirements": "Wok",
      "damage": "2d6 de dano Contundente",
      "combinedAttack": false
    },
    "mechanics": {
      "type": "save",
      "save": "dex",
      "onSave": "half",
      "allTargets": true,
      "manual": [
        "Use a mesma salvaguarda de Agilidade para o dano e Caído: falha sofre o dano total e fica Caído; sucesso sofre metade e não cai. Não faça uma segunda salvaguarda para a condição."
      ]
    }
  },
  {
    "id": "wok-throw",
    "name": "Wok Throw",
    "grade": null,
    "category": "wok",
    "weapon": "Wok",
    "auxiliary": true,
    "qi": 2,
    "actions": 2,
    "reaction": true,
    "description": [
      "Quando você ou uma criatura aliada for alvo de uma jogada de ataque (Comum ou de Técnica) ou tiver que realizar uma Salvaguarda de Força ou Agilidade para sofrer todo ou metade do dano, você pode atirar seu Wok como um frisbee que para na frente da criatura aliada girando com uma grande quantidade de Qi e reduzindo 3d8 de dano.",
      "A criatura aliada protegida é atirada para trás 3 metros para cada 6 de dano que o ataque causaria ou causou nela, mínimo de 3 metros."
    ],
    "sourceCard": {
      "duration": "Instantâneo.",
      "range": "Até 15 metros, Linha",
      "requirements": "Wok, Reação",
      "damage": "Nenhum",
      "combinedAttack": null
    },
    "mechanics": {
      "type": "utility",
      "roll": "3d8",
      "target": "creature",
      "manual": [
        "Escolha você ou o aliado protegido e use o resultado de 3d8 para reduzir somente o dano desencadeador. O narrador aplica a redução na criatura escolhida, sem conceder um escudo ao usuário por engano. Resolva o recuo do aliado: 3 metros por 6 de dano do ataque, mínimo de 3 metros."
      ]
    }
  }
];
