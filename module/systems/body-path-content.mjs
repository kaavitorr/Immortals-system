import {BODY_HIT_POINTS_PER_LEVEL} from './body-path.mjs';
import {BODY_PATH} from './caminhos-data.mjs';
const scope='Immortals-system',folder='c0171a7000000000';
export function bodyPathDocuments(){
 const general={level:0,name:'Caminho do Corpo',description:`Cada nível do Caminho do Corpo concede ${BODY_HIT_POINTS_PER_LEVEL} Pontos de Vida e +1 em Força, Agilidade ou Constituição, à sua escolha. Para avançar, treine durante 5 dias vezes seu nível atual e gaste 5 Pontos de Cultivo vezes o nível-alvo. Consuma 10 Pílulas do Sangue Divino de nível de Alquimia igual ao nível-alvo. Os descontos de Lorde Sagrado são aplicados aos PC e ao tempo; a quantidade de pílulas permanece a mesma.`};
 return [general,...BODY_PATH].map(entry=>({_id:'c0171a73'+String(entry.level).padStart(8,'0'),name:entry.name,type:'feat',folder,
  img:'systems/Immortals-system/icons/svg/items/class.svg',effects:[],
  system:{identifier:'caminho-corpo-'+entry.level,type:{value:'class'},description:{value:'<p>'+entry.description+'</p>'},activities:{}},
  flags:{[scope]:{cultivatorFeature:'body-'+entry.level,bodyPath:true,bodyPathLevel:entry.level,bodyPathVersion:1,featureSection:'jj-path'}}}));
}
