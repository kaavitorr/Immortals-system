import {configureCompendium} from "./compendium-configuration.mjs";
import {withElementalActorLock} from "./elemental-runtime.mjs";
import {NPC_FEATURE_ARTWORK} from "./npc-feature-artwork-data.mjs";

/** Original portraits for every canonical taxonomy and archetype in the NPC compendium. */
export const NPC_PROFILE_ARTWORK = Object.freeze([
  {
    "id": "0be19be04127a415",
    "type": "archetype",
    "name": "Artilheiro Selvagem",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/artilheiro-selvagem.webp",
    "previous": "icons/magic/symbols/elements-air-earth-fire-water.webp"
  },
  {
    "id": "0r6DpcPVxac4KcDN",
    "type": "taxonomy",
    "name": "Espectros",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/espectros.webp",
    "previous": "icons/creatures/magical/spirit-undead-ghost-blue.webp"
  },
  {
    "id": "0V8lnAJ0gwgvZwBN",
    "type": "taxonomy",
    "name": "Fossórios",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/fossorios.webp",
    "previous": "icons/environment/creatures/bug-earthworm.webp"
  },
  {
    "id": "17A6o29ictUUYNBl",
    "type": "archetype",
    "name": "Frenético (berserker)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/frenetico-berserker.webp",
    "previous": "icons/magic/control/buff-strength-muscle-damage-red.webp"
  },
  {
    "id": "1kS7aFwuQ8Xn6CYb",
    "type": "taxonomy",
    "name": "Entidades Conceituais",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/entidades-conceituais.webp",
    "previous": "icons/magic/perception/eye-tendrils-web-purple.webp"
  },
  {
    "id": "1mRVefCGEvI5LTpl",
    "type": "archetype",
    "name": "Adormecedor",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/adormecedor.webp",
    "previous": "icons/magic/control/sleep-bubble-purple.webp"
  },
  {
    "id": "1RXe1M1ddPIB3LQZ",
    "type": "archetype",
    "name": "Fugaz",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/fugaz.webp",
    "previous": "icons/creatures/mammals/rabbit-movement-glowing-green.webp"
  },
  {
    "id": "1x621zgHWqjdHDQE",
    "type": "taxonomy",
    "name": "Corvídeos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/corvideos.webp",
    "previous": "icons/creatures/birds/corvid-watchful-glowing-green.webp"
  },
  {
    "id": "3MrF1S9XkJMJZvSQ",
    "type": "archetype",
    "name": "Vociferador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/vociferador.webp",
    "previous": "icons/magic/sonic/scream-wail-shout-teal.webp"
  },
  {
    "id": "3wpzArn3CSl8Vq98",
    "type": "archetype",
    "name": "Multimembro",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/multimembro.webp",
    "previous": "icons/creatures/tentacles/tentacle-eyes-yellow-pink.webp"
  },
  {
    "id": "3Yh2o94vjKk1P6mW",
    "type": "archetype",
    "name": "Atropelador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/atropelador.webp",
    "previous": "icons/creatures/mammals/bull-horned-blue.webp"
  },
  {
    "id": "4HvqBgFEq76PN7Ei",
    "type": "taxonomy",
    "name": "Quirópteros",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/quiropteros.webp",
    "previous": "icons/creatures/mammals/bat-giant-tattered-purple.webp"
  },
  {
    "id": "4i1Yxbhb8lNTG1iO",
    "type": "taxonomy",
    "name": "Fadas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/fadas.webp",
    "previous": "icons/creatures/magical/fae-fairy-winged-glowing-green.webp"
  },
  {
    "id": "4ZbOLWS5MBLq4XMP",
    "type": "archetype",
    "name": "Constritor",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/constritor.webp",
    "previous": "icons/creatures/reptiles/serpent-horned-green.webp"
  },
  {
    "id": "56FBPKINZEcvD9T8",
    "type": "taxonomy",
    "name": "Aracnídeos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/aracnideos.webp",
    "previous": "icons/creatures/invertebrates/spider-mandibles-brown.webp"
  },
  {
    "id": "6eMY9zNNNuQ2CuMJ",
    "type": "archetype",
    "name": "Discórdia",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/discordia.webp",
    "previous": "icons/creatures/abilities/mouth-teeth-rows-needles-purple.webp"
  },
  {
    "id": "6Jbte77FdNsDU5ES",
    "type": "archetype",
    "name": "Atirador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/atirador.webp",
    "previous": "icons/skills/ranged/person-archery-bow-attack-gray.webp"
  },
  {
    "id": "6pl2OWQ6YlpVrI7a",
    "type": "archetype",
    "name": "Metamorfo",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/metamorfo.webp",
    "previous": "icons/magic/control/silhouette-hold-change-blue.webp"
  },
  {
    "id": "75IhyjQa4AlaTsvf",
    "type": "archetype",
    "name": "Espreitador Noturno",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/espreitador-noturno.webp",
    "previous": "icons/magic/nature/stealth-hide-beast-eyes-green.webp"
  },
  {
    "id": "7k9ZQRZLVuL3Nb6n",
    "type": "archetype",
    "name": "Berserker",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/berserker.webp",
    "previous": "icons/skills/melee/unarmed-punch-fist-yellow-red.webp"
  },
  {
    "id": "7QqzvZU31BjUdZNp",
    "type": "taxonomy",
    "name": "Primatas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/primatas.webp",
    "previous": "icons/creatures/magical/humanoid-giant-forest-blue.webp"
  },
  {
    "id": "84uBvapi8f840wyt",
    "type": "archetype",
    "name": "Bastião",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/bastiao.webp",
    "previous": "icons/magic/defensive/armor-shield-barrier-steel.webp"
  },
  {
    "id": "8f0Fa3qhfmnCvv7z",
    "type": "archetype",
    "name": "Justiceiro",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/justiceiro.webp",
    "previous": "icons/skills/social/trading-justice-scale-gold.webp"
  },
  {
    "id": "8glwHU8DGOgx90t4",
    "type": "archetype",
    "name": "Comandante",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/comandante.webp",
    "previous": "icons/magic/control/control-influence-rally-purple.webp"
  },
  {
    "id": "8NisUe7RBpqgEzOj",
    "type": "taxonomy",
    "name": "Suínos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/suinos.webp",
    "previous": "icons/creatures/mammals/livestock-pig-green.webp"
  },
  {
    "id": "8OpIDEnVX5tmdK1a",
    "type": "archetype",
    "name": "Pactuante",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/pactuante.webp",
    "previous": "icons/skills/social/diplomacy-handshake-blue.webp"
  },
  {
    "id": "8Xo7bBm1KZbW3VDx",
    "type": "archetype",
    "name": "Escavador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/escavador.webp",
    "previous": "icons/skills/melee/drill-heavy-earth.webp"
  },
  {
    "id": "91HA4Mar1QSwS7NJ",
    "type": "archetype",
    "name": "Mergulhador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/mergulhador.webp",
    "previous": "icons/creatures/magical/construct-gargoyle-stone-gray.webp"
  },
  {
    "id": "9DYDHszICCqd8rn7",
    "type": "taxonomy",
    "name": "Anfíbios",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/anfibios.webp",
    "previous": "icons/creatures/amphibians/bullfrog-glass-teal.webp"
  },
  {
    "id": "9jEANwZSWj548S4q",
    "type": "archetype",
    "name": "Velocista",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/velocista.webp",
    "previous": "icons/magic/movement/acceleration-speed-tech-blue.webp"
  },
  {
    "id": "9ukKN32RXOi0UM25",
    "type": "archetype",
    "name": "Espadachim",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/espadachim.webp",
    "previous": "icons/skills/melee/maneuver-sword-katana-yellow.webp"
  },
  {
    "id": "aBl3UBzscVoIUODB",
    "type": "taxonomy",
    "name": "Elementais da Terra e das Plantas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/elementais-da-terra-e-das-plantas.webp",
    "previous": "icons/magic/nature/elemental-plant-humanoid.webp"
  },
  {
    "id": "AbwrrKtLBryc6x2u",
    "type": "taxonomy",
    "name": "Felinos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/felinos.webp",
    "previous": "icons/creatures/mammals/cat-hunched-glowing-red.webp"
  },
  {
    "id": "B2qhPseeVdjEtP7v",
    "type": "archetype",
    "name": "Devorador de Luz",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/devorador-de-luz.webp",
    "previous": "icons/magic/perception/shadow-stealth-eyes-purple.webp"
  },
  {
    "id": "BBO3mH8wPXvvJlMl",
    "type": "taxonomy",
    "name": "Elementais do Ar e da Tempestade",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/elementais-do-ar-e-da-tempestade.webp",
    "previous": "icons/magic/air/wind-tornado-cyclone-purple-blue.webp"
  },
  {
    "id": "Be0tylQZWmAfprzK",
    "type": "archetype",
    "name": "Assassino (não Humanoide)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/assassino-nao-humanoide.webp",
    "previous": "icons/creatures/claws/claw-curved-jagged-gray.webp"
  },
  {
    "id": "C4pQ9lwVvNeGSNJI",
    "type": "taxonomy",
    "name": "Autômatos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/automatos.webp",
    "previous": "icons/creatures/magical/construct-golem-robot-blue.webp"
  },
  {
    "id": "cmjemQr63OxjfiFA",
    "type": "archetype",
    "name": "Atirador (cuspidor)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/atirador-cuspidor.webp",
    "previous": "icons/magic/acid/projectile-stream-bubbles.webp"
  },
  {
    "id": "cQtfHjOTO9DWVHPX",
    "type": "taxonomy",
    "name": "Crustáceos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/crustaceos.webp",
    "previous": "icons/creatures/fish/crab-blue-purple.webp"
  },
  {
    "id": "cvLttZjGW6IoOcfx",
    "type": "taxonomy",
    "name": "Ocos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/ocos.webp",
    "previous": "icons/creatures/magical/humanoid-silhoette-alien-gray.webp"
  },
  {
    "id": "CWo9PRmlBoFJ4bMB",
    "type": "taxonomy",
    "name": "Mutantes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/mutantes.webp",
    "previous": "icons/creatures/slimes/slime-face-melting-green.webp"
  },
  {
    "id": "dbFQ9bLw4lkTaruW",
    "type": "archetype",
    "name": "Bombardeiro",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/bombardeiro.webp",
    "previous": "icons/skills/ranged/projectile-grenade-fire-orange.webp"
  },
  {
    "id": "dczoqeBXEZemJzFT",
    "type": "taxonomy",
    "name": "Cefalópodes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/cefalopodes.webp",
    "previous": "icons/creatures/fish/octopus-pink.webp"
  },
  {
    "id": "E2DW8iJbsBLLXEwe",
    "type": "archetype",
    "name": "Ilusionista",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/ilusionista.webp",
    "previous": "icons/magic/defensive/illusion-evasion-echo-purple.webp"
  },
  {
    "id": "EFQL9dIHloeb346j",
    "type": "archetype",
    "name": "Infiltrador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/infiltrador.webp",
    "previous": "icons/magic/perception/silhouette-stealth-shadow.webp"
  },
  {
    "id": "EnuXscrRHcOpLW6B",
    "type": "archetype",
    "name": "Fragmentador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/fragmentador.webp",
    "previous": "icons/creatures/slimes/slime-movement-splashing-red.webp"
  },
  {
    "id": "eyQFUP4p9FSfAVZn",
    "type": "archetype",
    "name": "Cabeça-de-leão",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/cabeca-de-leao.webp",
    "previous": "icons/creatures/abilities/lion-roar-yellow.webp"
  },
  {
    "id": "eZ3uLFBYAQQuH7zf",
    "type": "archetype",
    "name": "Colosso",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/colosso.webp",
    "previous": "icons/creatures/magical/construct-iron-stomping-yellow.webp"
  },
  {
    "id": "FapD6tOu3l7Dts92",
    "type": "taxonomy",
    "name": "Mortos-vivos Superiores",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/mortos-vivos-superiores.webp",
    "previous": "icons/magic/death/undead-skeleton-lich-armor.webp"
  },
  {
    "id": "FGeMUe8EpfN9bEqd",
    "type": "archetype",
    "name": "Enxame",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/enxame.webp",
    "previous": "icons/creatures/invertebrates/wasp-swarm-attack.webp"
  },
  {
    "id": "FJVZvFE0R7ej6hFh",
    "type": "archetype",
    "name": "Cauda-de-serpente",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/cauda-de-serpente.webp",
    "previous": "icons/creatures/reptiles/snake-fangs-bite-green-yellow.webp"
  },
  {
    "id": "FPIToxXIB2Q40xcc",
    "type": "taxonomy",
    "name": "Equídeos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/equideos.webp",
    "previous": "icons/environment/creatures/horse-white.webp"
  },
  {
    "id": "fsfSpfA0mo89alOV",
    "type": "archetype",
    "name": "Lutador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/lutador.webp",
    "previous": "icons/skills/melee/unarmed-punch-fist-blue.webp"
  },
  {
    "id": "g0KukGcYmQsHsjGT",
    "type": "taxonomy",
    "name": "Mortos-vivos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/mortos-vivos.webp",
    "previous": "icons/magic/death/undead-zombie-grave-green.webp"
  },
  {
    "id": "gIU1KivYc1AlaHVo",
    "type": "taxonomy",
    "name": "Serpentes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/serpentes.webp",
    "previous": "icons/creatures/reptiles/snake-poised-white.webp"
  },
  {
    "id": "GTLv2cSJ4n6RUgCJ",
    "type": "taxonomy",
    "name": "Elementais do Gelo",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/elementais-do-gelo.webp",
    "previous": "icons/creatures/magical/spirit-mischief-fire-ice-blue.webp"
  },
  {
    "id": "hnrLT4Vcsbckvr4D",
    "type": "archetype",
    "name": "Necrófago",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/necrofago.webp",
    "previous": "icons/creatures/abilities/mouth-teeth-rows-red.webp"
  },
  {
    "id": "i7QHRibb2pOcJn29",
    "type": "taxonomy",
    "name": "Sáurios",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/saurios.webp",
    "previous": "icons/creatures/reptiles/lizard-iguana-green.webp"
  },
  {
    "id": "iAwtGlCM5YaDc5SE",
    "type": "archetype",
    "name": "Perseguidor",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/perseguidor.webp",
    "previous": "icons/creatures/mammals/wolf-shadow-black.webp"
  },
  {
    "id": "IMWkApSPaJ6GhgpH",
    "type": "archetype",
    "name": "Tirano (alfa)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/tirano-alfa.webp",
    "previous": "icons/magic/control/control-influence-crown-gold.webp"
  },
  {
    "id": "INyoq334qjFFQTFm",
    "type": "archetype",
    "name": "Estridente",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/estridente.webp",
    "previous": "icons/creatures/birds/corvid-call-sound-glowing.webp"
  },
  {
    "id": "JDCcfIWK71xLhJ0e",
    "type": "archetype",
    "name": "Batedor (alcateia)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/batedor-alcateia.webp",
    "previous": "icons/creatures/mammals/wolf-howl-moon-forest-blue.webp"
  },
  {
    "id": "jt73OyhSMna11UWx",
    "type": "archetype",
    "name": "Hidra",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/hidra.webp",
    "previous": "icons/creatures/abilities/wolf-heads-swirl-purple.webp"
  },
  {
    "id": "K7hZVQH2MLbrfcPY",
    "type": "archetype",
    "name": "Guerreiro",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/guerreiro.webp",
    "previous": "icons/skills/melee/weapons-crossed-swords-white-blue.webp"
  },
  {
    "id": "KJe4yXBRrR3wcxLk",
    "type": "taxonomy",
    "name": "Equinodermos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/equinodermos.webp",
    "previous": "icons/environment/creatures/starfish-blue.webp"
  },
  {
    "id": "kKrV7Fii0ykUcxgt",
    "type": "taxonomy",
    "name": "Plantas Carnívoras",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/plantas-carnivoras.webp",
    "previous": "icons/magic/nature/plant-venus-flytrap-blood.webp"
  },
  {
    "id": "KN53ndcGwr8otReA",
    "type": "archetype",
    "name": "Defensor",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/defensor.webp",
    "previous": "icons/skills/melee/sword-shield-stylized-white.webp"
  },
  {
    "id": "koGyKCGwbaRxmqeZ",
    "type": "archetype",
    "name": "Cuspidora (naja)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/cuspidora-naja.webp",
    "previous": "icons/creatures/abilities/fang-tooth-venomous.webp"
  },
  {
    "id": "Krh5eruXfpVYDfxf",
    "type": "archetype",
    "name": "Peçonhento (artrópode)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/peconhento-artropode.webp",
    "previous": "icons/creatures/abilities/stinger-poison-scorpion-brown.webp"
  },
  {
    "id": "L8JNCuXNgSFOevzU",
    "type": "archetype",
    "name": "Mímico (camaleão)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/mimico-camaleao.webp",
    "previous": "icons/creatures/reptiles/chameleon-camouflage-green-brown.webp"
  },
  {
    "id": "laUyFhbXBNvp2wzB",
    "type": "archetype",
    "name": "Corpo-de-cabra",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/corpo-de-cabra.webp",
    "previous": "icons/creatures/mammals/goat-horned-blue.webp"
  },
  {
    "id": "LBL3HmRR0mijch5k",
    "type": "archetype",
    "name": "Drenador (vampírico)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/drenador-vampirico.webp",
    "previous": "icons/magic/death/mouth-bite-fangs-vampire.webp"
  },
  {
    "id": "LD4LIdGoUeWqmuvq",
    "type": "archetype",
    "name": "Montaria de Guerra",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/montaria-de-guerra.webp",
    "previous": "icons/environment/creatures/horse-brown.webp"
  },
  {
    "id": "LULUUYe2mpcWWBoO",
    "type": "archetype",
    "name": "Agourento",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/agourento.webp",
    "previous": "icons/creatures/birds/corvid-call-sound-blue.webp"
  },
  {
    "id": "LXqpgXAS91L05pRc",
    "type": "archetype",
    "name": "Encantador (sereia)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/encantador-sereia.webp",
    "previous": "icons/skills/trades/music-singing-voice-blue.webp"
  },
  {
    "id": "lYbyax2wvQxBSMWJ",
    "type": "archetype",
    "name": "Ladrão de Nomes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/ladrao-de-nomes.webp",
    "previous": "icons/skills/social/theft-pickpocket-bribery-brown.webp"
  },
  {
    "id": "lYLihsHcUDsGd5LL",
    "type": "archetype",
    "name": "Trapaceiro",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/trapaceiro.webp",
    "previous": "icons/magic/control/mouth-smile-deception-purple.webp"
  },
  {
    "id": "MfW75hcuSNAl6MBL",
    "type": "taxonomy",
    "name": "Quimeras",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/quimeras.webp",
    "previous": "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp"
  },
  {
    "id": "mtDW7ry24VlgX8ll",
    "type": "archetype",
    "name": "Samurai",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/samurai.webp",
    "previous": "icons/skills/melee/maneuver-sword-katana-yellow.webp"
  },
  {
    "id": "MyoVyASL9pCKLMOx",
    "type": "taxonomy",
    "name": "Cristalinos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/cristalinos.webp",
    "previous": "icons/magic/water/ice-crystal-white.webp"
  },
  {
    "id": "nEcFvGqH0mHwItrU",
    "type": "archetype",
    "name": "Duelista",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/duelista.webp",
    "previous": "icons/skills/melee/swords-parry-block-blue.webp"
  },
  {
    "id": "nfB3AhTdHPvUBaFM",
    "type": "taxonomy",
    "name": "Umbranos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/umbranos.webp",
    "previous": "icons/creatures/magical/spirit-fear-energy-pink.webp"
  },
  {
    "id": "Nggs8MRDGKLwa4zd",
    "type": "archetype",
    "name": "Colônia",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/colonia.webp",
    "previous": "icons/creatures/slimes/slime-giant-face-eyes.webp"
  },
  {
    "id": "niyZmOCJtiZjOrUi",
    "type": "archetype",
    "name": "Assassino",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/assassino.webp",
    "previous": "icons/skills/melee/strike-dagger-skull-white.webp"
  },
  {
    "id": "NmkSu5Y8iKTd1plF",
    "type": "archetype",
    "name": "Ceifador Abissal",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/ceifador-abissal.webp",
    "previous": "icons/creatures/fish/fish-marlin-swordfight-blue.webp"
  },
  {
    "id": "NSIotGe2HW5LuIvM",
    "type": "taxonomy",
    "name": "Policéfalos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/policefalos.webp",
    "previous": "icons/creatures/abilities/wolf-heads-swirl-purple.webp"
  },
  {
    "id": "nUwlNsEsvFSLxhNX",
    "type": "taxonomy",
    "name": "Dragões",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/dragoes.webp",
    "previous": "icons/creatures/reptiles/dragon-winged-blue.webp"
  },
  {
    "id": "NvN9C7h1FDFvxRLo",
    "type": "taxonomy",
    "name": "Parasitas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/parasitas.webp",
    "previous": "icons/creatures/invertebrates/leech-attack-green.webp"
  },
  {
    "id": "oJ4vujTsfkPOd64L",
    "type": "archetype",
    "name": "Muralha (tanque)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/muralha-tanque.webp",
    "previous": "icons/magic/earth/barrier-stone-brown-green.webp"
  },
  {
    "id": "OMWj4u9MDgF2QjSL",
    "type": "taxonomy",
    "name": "Aves de Rapina",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/aves-de-rapina.webp",
    "previous": "icons/creatures/birds/raptor-hawk-flying.webp"
  },
  {
    "id": "OOVNw8bMbcwwwpSY",
    "type": "archetype",
    "name": "Soterrador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/soterrador.webp",
    "previous": "icons/magic/earth/barrier-stone-explosion-debris.webp"
  },
  {
    "id": "oyhRMyP85W7UFf1B",
    "type": "taxonomy",
    "name": "Leporídeos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/leporideos.webp",
    "previous": "icons/creatures/mammals/rabbit-movement-glowing-green.webp"
  },
  {
    "id": "PbChzA5Fzd8ZwfCG",
    "type": "archetype",
    "name": "Usurpador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/usurpador.webp",
    "previous": "icons/creatures/invertebrates/leech-attack-green.webp"
  },
  {
    "id": "psc7kziyH6GeuSRW",
    "type": "taxonomy",
    "name": "Roedores",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/roedores.webp",
    "previous": "icons/creatures/mammals/rodent-rat-green.webp"
  },
  {
    "id": "PSYqBGtTMTcN38Co",
    "type": "archetype",
    "name": "Tecelão (armeiro)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/tecelao-armeiro.webp",
    "previous": "icons/creatures/webs/web-spider-casting-caught-purple.webp"
  },
  {
    "id": "PtMBxainmtwiROnE",
    "type": "archetype",
    "name": "Oitobraço",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/oitobraco.webp",
    "previous": "icons/creatures/tentacles/tentacles-octopus-black-pink.webp"
  },
  {
    "id": "QDurxwa3Gqnq7T39",
    "type": "taxonomy",
    "name": "Gelatinosas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/gelatinosas.webp",
    "previous": "icons/creatures/slimes/slime-blob-pseudopods-green.webp"
  },
  {
    "id": "QGeoQckhorZcS4RT",
    "type": "taxonomy",
    "name": "Insetoides",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/insetoides.webp",
    "previous": "icons/creatures/invertebrates/beetle-stag-tan-brown.webp"
  },
  {
    "id": "qTJwBVxKNB8jfKUI",
    "type": "taxonomy",
    "name": "Lobisomens",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/lobisomens.webp",
    "previous": "icons/creatures/mammals/humanoid-wolf-dog-blue.webp"
  },
  {
    "id": "QVgXUJwtxjIp2Ipq",
    "type": "taxonomy",
    "name": "Gárgulas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/gargulas.webp",
    "previous": "icons/creatures/magical/construct-gargoyle-stone-gray.webp"
  },
  {
    "id": "R7bUjwpb2LRpf1Ir",
    "type": "taxonomy",
    "name": "Pesadelos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/pesadelos.webp",
    "previous": "icons/magic/control/fear-fright-shadow-monster-purple.webp"
  },
  {
    "id": "RAwuCxRJVFsXmoIg",
    "type": "taxonomy",
    "name": "Predadores",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/predadores.webp",
    "previous": "icons/creatures/mammals/wolf-shadow-black.webp"
  },
  {
    "id": "REQEaB1YpEgEfmip",
    "type": "archetype",
    "name": "Behemoth das Profundezas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/behemoth-das-profundezas.webp",
    "previous": "icons/creatures/fish/squid-kraken-teal.webp"
  },
  {
    "id": "RuRxD3ObgImqFpUb",
    "type": "archetype",
    "name": "Semeador (invocador)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/semeador-invocador.webp",
    "previous": "icons/magic/nature/plant-seed-hands-glow-yellow.webp"
  },
  {
    "id": "RwL5kj80zMvR4XeV",
    "type": "archetype",
    "name": "Peçonhento (serpente)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/peconhento-serpente.webp",
    "previous": "icons/creatures/reptiles/snake-fangs-bite-green.webp"
  },
  {
    "id": "RZyRwWra9t6atMU5",
    "type": "archetype",
    "name": "Protetor (guarda-costas)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/protetor-guarda-costas.webp",
    "previous": "icons/skills/melee/shield-block-bash-blue.webp"
  },
  {
    "id": "s2BT9E8xjJxdz1nV",
    "type": "taxonomy",
    "name": "Homens-fera",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/homens-fera.webp",
    "previous": "icons/creatures/mammals/humanoid-cat-skulking-teal.webp"
  },
  {
    "id": "s8b50wOHwedbthYZ",
    "type": "archetype",
    "name": "Porta-voz",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/porta-voz.webp",
    "previous": "icons/skills/trades/music-singing-voice-blue.webp"
  },
  {
    "id": "S9wtT21sdT7r3KRB",
    "type": "archetype",
    "name": "Ceifador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/ceifador.webp",
    "previous": "icons/magic/death/weapon-scythe-rune-green.webp"
  },
  {
    "id": "Sgv7I81nv4aUYObI",
    "type": "taxonomy",
    "name": "Miriápodes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/miriapodes.webp",
    "previous": "icons/creatures/invertebrates/centipede-brown.webp"
  },
  {
    "id": "SiJCwHnL4HiogZtJ",
    "type": "archetype",
    "name": "Ressonador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/ressonador.webp",
    "previous": "icons/magic/sonic/projectile-sound-rings-wave.webp"
  },
  {
    "id": "SJvo3Iom3pjmyVtv",
    "type": "archetype",
    "name": "Torturador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/torturador.webp",
    "previous": "icons/magic/control/voodoo-doll-pain-damage-red.webp"
  },
  {
    "id": "sL2CVjgvza6GTkV3",
    "type": "archetype",
    "name": "Rastreador Ancestral",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/rastreador-ancestral.webp",
    "previous": "icons/creatures/abilities/paw-print-pair-purple.webp"
  },
  {
    "id": "T12CdxB19OSaSGW9",
    "type": "taxonomy",
    "name": "Gigantes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/gigantes.webp",
    "previous": "icons/magic/unholy/silhouette-evil-horned-giant.webp"
  },
  {
    "id": "Tgijhao6Um64zzwZ",
    "type": "archetype",
    "name": "Hipnotizador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/hipnotizador.webp",
    "previous": "icons/magic/control/hypnosis-mesmerism-eye.webp"
  },
  {
    "id": "TuUIq8m0hRp1Kx63",
    "type": "taxonomy",
    "name": "Hienas",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/hienas.webp",
    "previous": "icons/creatures/abilities/mouth-teeth-rows-white.webp"
  },
  {
    "id": "UgWeu1cPg9GQBrQ3",
    "type": "taxonomy",
    "name": "Aberrações",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/aberracoes.webp",
    "previous": "icons/environment/creatures/monster-tentacles-eye-purple.webp"
  },
  {
    "id": "Uo8dPtCjmT9JtNOG",
    "type": "archetype",
    "name": "Regenerador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/regenerador.webp",
    "previous": "icons/magic/life/heart-cross-strong-green.webp"
  },
  {
    "id": "uZmI7jozzzFZZX8M",
    "type": "archetype",
    "name": "Esmagador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/esmagador.webp",
    "previous": "icons/creatures/claws/pincer-crab-red.webp"
  },
  {
    "id": "v3uD80RZA7c3wCn8",
    "type": "archetype",
    "name": "Agarrador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/agarrador.webp",
    "previous": "icons/creatures/tentacles/tentacles-suctioncups-pink.webp"
  },
  {
    "id": "vKZTEuYt7E3WJAta",
    "type": "archetype",
    "name": "Besta de Rebanho",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/besta-de-rebanho.webp",
    "previous": "icons/creatures/mammals/ox-buffalo-horned-green.webp"
  },
  {
    "id": "VsltcmIF1szlYsB0",
    "type": "archetype",
    "name": "Brinquedo Traiçoeiro",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/brinquedo-traicoeiro.webp",
    "previous": "icons/magic/control/voodoo-doll-pain-damage-purple.webp"
  },
  {
    "id": "Vxv94rHgm8fzcG4g",
    "type": "taxonomy",
    "name": "Objetos Animados",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/objetos-animados.webp",
    "previous": "icons/magic/control/control-influence-puppet.webp"
  },
  {
    "id": "X7WxN4lGeT0v3JyB",
    "type": "archetype",
    "name": "Besta de Investida",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/besta-de-investida.webp",
    "previous": "icons/creatures/mammals/bull-horns-eyes-glowin-orange.webp"
  },
  {
    "id": "xbrwGfGodzaDJ8bW",
    "type": "taxonomy",
    "name": "Homens-peixe",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/homens-peixe.webp",
    "previous": "icons/creatures/fish/fish-man-eye-green.webp"
  },
  {
    "id": "XE4JqbjyjusncHts",
    "type": "archetype",
    "name": "Íncubo",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/incubo.webp",
    "previous": "icons/creatures/unholy/demon-female-succubus-orange.webp"
  },
  {
    "id": "xfO83dKPV1UIwk3C",
    "type": "archetype",
    "name": "Emboscador (assaltante)",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/emboscador-assaltante.webp",
    "previous": "icons/magic/nature/stealth-hide-eyes-green.webp"
  },
  {
    "id": "xGNyUOfYz4MjxuxB",
    "type": "taxonomy",
    "name": "Elementais do Fogo",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/elementais-do-fogo.webp",
    "previous": "icons/magic/fire/elemental-fire-humanoid.webp"
  },
  {
    "id": "xk21eUa1FAA4qopc",
    "type": "taxonomy",
    "name": "Dracos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/dracos.webp",
    "previous": "icons/creatures/reptiles/dragon-horned-blue.webp"
  },
  {
    "id": "XQtPz4Wd5l9lQhnO",
    "type": "taxonomy",
    "name": "Fungoides",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/fungoides.webp",
    "previous": "icons/magic/nature/mushroom-glow-red.webp"
  },
  {
    "id": "xzyEBFKClkkczZpV",
    "type": "archetype",
    "name": "Operária",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/operaria.webp",
    "previous": "icons/creatures/invertebrates/ant-strength-green.webp"
  },
  {
    "id": "Ykme0NIAQtuO1hwK",
    "type": "archetype",
    "name": "Devorador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/devorador.webp",
    "previous": "icons/creatures/abilities/mouth-teeth-sharp.webp"
  },
  {
    "id": "yqd1M6yTOJm2MzX9",
    "type": "archetype",
    "name": "Brutamontes",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/brutamontes.webp",
    "previous": "icons/magic/earth/strike-fist-stone-gray.webp"
  },
  {
    "id": "z3B48gIhkywDjPy1",
    "type": "archetype",
    "name": "Besta Guardiã",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/besta-guardia.webp",
    "previous": "icons/creatures/mammals/spirit-deer-herd-blue.webp"
  },
  {
    "id": "zAYH3ZrL58Kd0NSp",
    "type": "taxonomy",
    "name": "Humanos",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/taxonomias/humanos.webp",
    "previous": "icons/environment/people/commoner.webp"
  },
  {
    "id": "ZepOQgN8lz6ft5Gm",
    "type": "archetype",
    "name": "Multiplicador",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/multiplicador.webp",
    "previous": "icons/consumables/eggs/egg-nest-pink.webp"
  },
  {
    "id": "zfQiDAHXbvMELeoX",
    "type": "archetype",
    "name": "Saqueador Ardiloso",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/saqueador-ardiloso.webp",
    "previous": "icons/creatures/mammals/humanoid-fox-cat-archer.webp"
  },
  {
    "id": "ZIFYMHmqw0xt4EWj",
    "type": "archetype",
    "name": "Lanceiro de Maré",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/lanceiro-de-mare.webp",
    "previous": "icons/skills/melee/strike-weapon-polearm-ice-blue.webp"
  },
  {
    "id": "zxcHwVsbraXOHr09",
    "type": "archetype",
    "name": "Espreitador Vertical",
    "img": "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/arquetipos/espreitador-vertical.webp",
    "previous": "icons/creatures/invertebrates/spider-striped-web-red.webp"
  }
].map(entry => Object.freeze(entry)));

const PACK_ID = "Immortals-system.pdns-immortals";
const ART_BASE = "systems/Immortals-system/assets/wuxia/perfis-pdn-pintados-v1/";
const allArtwork = [...NPC_PROFILE_ARTWORK, ...NPC_FEATURE_ARTWORK];
const byId = new Map(allArtwork.map(entry => [entry.id, entry]));
const key = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
  .toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
function uniqueIndex(selector) {
  const index = new Map(), ambiguous = new Set();
  for (const entry of allArtwork) {
    const value = selector(entry);
    if (!value || ambiguous.has(value)) continue;
    if (index.has(value)) {index.delete(value); ambiguous.add(value);}
    else index.set(value, entry);
  }
  return index;
}
const byName = uniqueIndex(entry => entry.type + ":" + key(entry.name));
const byEncyclopediaKey = uniqueIndex(entry => entry.encyclopediaKey ? entry.type + ":" + entry.encyclopediaKey : null);
const byImage = new Map(allArtwork.map(entry => [entry.img, entry]));
const list = collection => Array.from(collection?.contents ?? collection?.values?.() ?? collection ?? []);
const idOf = document => document?._id ?? document?.id;
const imagePath = value => typeof value === "string" ? value.trim().replace(/\\/gu, "/").replace(/^[./]+/u, "").split(/[?#]/u)[0] : "";
const activeGM = game => game?.user?.isGM === true
  && (!game.users?.activeGM || game.users.activeGM.id === game.user.id);
const canEdit = (document, game) => document?.isOwner === true && document.limited !== true
  && (!document.canUserModify || document.canUserModify(game.user, "update"));
const pendingPacks = new WeakMap();
const pendingWorld = new WeakMap();
const registrations = new WeakSet();

function fromReference(reference) {
  if (typeof reference !== "string") return null;
  const prefix = "Compendium." + PACK_ID + ".";
  if (!reference.startsWith(prefix)) return null;
  const suffix = reference.slice(prefix.length).replace(/^Item\./u, "");
  return byId.get(suffix) ?? null;
}

/** Resolve catalogue identities without changing names or requiring a live Foundry environment. */
export function resolveNpcProfileArtwork(item) {
  if (!item) return null;
  const source = item.toObject?.() ?? item;
  if (!["taxonomy", "archetype", "feat"].includes(source.type)) return null;
  const flags = source.flags?.["Immortals-system"];
  const references = [source._stats?.compendiumSource, source.flags?.core?.sourceId, source._stats?.duplicateSource,
    flags?.npcProfileFeature?.source];
  for (const reference of references) {
    const entry = fromReference(reference);
    if (entry) return entry.type === source.type ? entry : null;
  }
  const direct = byId.get(idOf(source) ?? item.id);
  if (direct) return direct.type === source.type ? direct : null;
  const imported = byId.get(flags?.jujutsuImport?.documentId);
  if (imported) return imported.type === source.type ? imported : null;
  const canonical = byEncyclopediaKey.get(source.type + ":" + flags?.encyclopedia?.key);
  if (canonical) return canonical;
  const named = byName.get(source.type + ":" + key(source.name));
  // An unmarked feat needs its original icon as well as its title to establish catalogue identity.
  const legacyImage = named && imagePath(source.img) && imagePath(source.img) === imagePath(named.previous);
  if (named && (source.type !== "feat" || legacyImage)) return named;
  const pictured = byImage.get(imagePath(source.img));
  return pictured?.type === source.type ? pictured : null;
}

function stockImage(image, entry) {
  const path = imagePath(image);
  if (!path || path === imagePath(entry.previous)) return true;
  if (["icons/svg/item-bag.svg", "systems/Immortals-system/icons/svg/documents/item.svg",
    "systems/Immortals-system/icons/svg/items/" + entry.type + ".svg"].includes(path)) return true;
  // Preserve personal feature icons chosen from other catalogue entries.
  if (entry.type === "feat") return false;
  return path.startsWith(ART_BASE) && /^(?:taxonomias|arquetipos)\/[a-z0-9-]+\.webp$/u.test(path.slice(ART_BASE.length));
}

/** An image-only patch leaves IDs, names, uses, mechanics and personal portraits untouched. */
export function prepareNpcProfileArtworkUpdate(item) {
  if (!item || item.isOwner === false || item.limited === true) return null;
  const owner = item.actor ?? (["character", "npc"].includes(item.parent?.type) ? item.parent : null);
  if (owner && (owner.isOwner !== true || owner.limited === true)) return null;
  const source = item.toObject?.() ?? item;
  const entry = resolveNpcProfileArtwork(source), id = idOf(source) ?? item.id;
  if (!entry || !id || source.img === entry.img || !stockImage(source.img, entry)) return null;
  return {_id: id, img: entry.img};
}

/** Update existing profile and feature Items through Foundry; never create, rebuild or delete a document. */
export async function migrateNpcProfileCompendiumArt({game = globalThis.game, Item = globalThis.Item} = {}) {
  if (!activeGM(game)) return 0;
  const pack = game.packs?.get?.(PACK_ID), api = Item?.implementation ?? Item;
  if (!pack || pack.documentName !== "Item" || typeof pack.getDocuments !== "function"
    || typeof api?.updateDocuments !== "function") return 0;
  if (pendingPacks.has(pack)) return pendingPacks.get(pack);
  const work = (async () => {
    const documents = list(await pack.getDocuments({_id__in: [...byId.keys()]}));
    if (!activeGM(game)) return 0;
    // Locked packs can expose read-only documents: the active GM writes their source data.
    const patches = documents.map(document => document.toObject?.() ?? document)
      .filter(source => byId.get(idOf(source))?.type === source.type)
      .map(prepareNpcProfileArtworkUpdate).filter(Boolean);
    if (!patches.length || !activeGM(game)) return 0;
    const locked = pack.locked;
    try {
      if (locked) await configureCompendium(pack, {locked: false});
      if (!activeGM(game)) return 0;
      await api.updateDocuments(patches, {pack: pack.collection});
      return patches.length;
    } finally {
      if (locked) await configureCompendium(pack, {locked: true});
    }
  })();
  pendingPacks.set(pack, work);
  try { return await work; }
  finally { if (pendingPacks.get(pack) === work) pendingPacks.delete(pack); }
}

/** Share native actor transactions with item uses and re-read current portraits inside the queue. */
export async function migrateNpcProfileActorArt(actor, {game = globalThis.game} = {}) {
  const allowed = () => activeGM(game) && ["character", "npc"].includes(actor?.type)
    && canEdit(actor, game) && typeof actor.performBulkUpdate === "function";
  if (!allowed()) return 0;
  return await withElementalActorLock(actor, "npc-profile-artwork-v1", async () => {
    if (!allowed()) return 0;
    const patches = list(actor.items).filter(item => item.isOwner !== false && item.limited !== true
      && (!item.canUserModify || item.canUserModify(game.user, "update")))
      .map(prepareNpcProfileArtworkUpdate).filter(Boolean);
    if (!patches.length || !allowed()) return 0;
    await actor.performBulkUpdate({item: patches});
    return patches.length;
  }) || 0;
}

/** Refresh only loose world Items; packed and actor-owned copies use their own native paths. */
export async function migrateWorldNpcProfileArt({game = globalThis.game, Item = globalThis.Item} = {}) {
  const api = Item?.implementation ?? Item;
  if (!activeGM(game) || typeof api?.updateDocuments !== "function") return 0;
  if (pendingWorld.has(game)) return pendingWorld.get(game);
  const work = (async () => {
    const patches = list(game.items).filter(item => !item.actor && !item.parent && !item.pack && canEdit(item, game))
      .map(prepareNpcProfileArtworkUpdate).filter(Boolean);
    if (!patches.length || !activeGM(game)) return 0;
    await api.updateDocuments(patches);
    return patches.length;
  })();
  pendingWorld.set(game, work);
  try { return await work; }
  finally { if (pendingWorld.get(game) === work) pendingWorld.delete(game); }
}


/** Include native unlinked token copies while leaving linked tokens on their base Actor. */
function artworkActors(game) {
  const actors = new Map();
  const remember = actor => {
    if (!["character", "npc"].includes(actor?.type)) return;
    const identity = actor.uuid ?? actor;
    if (!actors.has(identity)) actors.set(identity, actor);
  };
  for (const actor of list(game?.actors)) remember(actor);
  for (const scene of list(game?.scenes)) {
    for (const token of list(scene.tokens)) {
      if (token.actorLink === false) remember(token.actor);
    }
  }
  return [...actors.values()];
}

/** Register only after the complete painted asset set has been installed. */
export function registerNpcProfileArtworkMigrations(hooks = globalThis.Hooks) {
  if (typeof hooks?.once !== "function" || registrations.has(hooks)) return;
  registrations.add(hooks);
  const safely = async operation => {
    try { return await operation(); }
    catch (error) {
      console.error("Immortals Legacy | Ícones do compêndio de PdNs", error);
      globalThis.ui?.notifications?.warn?.("Não foi possível atualizar um ícone do compêndio de PdNs: "
        + (error?.message ?? String(error)));
      return 0;
    }
  };
  hooks.once("ready", async () => {
    if (!activeGM(globalThis.game)) return;
    await safely(() => migrateNpcProfileCompendiumArt());
    await safely(() => migrateWorldNpcProfileArt());
    for (const actor of artworkActors(globalThis.game)) await safely(() => migrateNpcProfileActorArt(actor));
  });
  hooks.on?.("createActor", actor => safely(() => migrateNpcProfileActorArt(actor)));
  hooks.on?.("createItem", item => {
    const actor = item?.actor ?? item?.parent;
    if (["character", "npc"].includes(actor?.type)) return safely(() => migrateNpcProfileActorArt(actor));
    if (!actor && !item?.pack) return safely(() => migrateWorldNpcProfileArt());
  });
}
