import {SOUL_PATH} from './caminhos-data.mjs';
export function soulPathDocuments(){
 const general={level:0,name:'Caminho da Alma',description:'Cada nível concede 1 Ponto de Vida e +1 em Intelecto, Sabedoria ou Presença, à escolha do cultivador. O caminho concede +2 ao Qi Base. Para avançar, treine por 10 dias vezes seu nível atual, gaste 10 Pontos de Cultivo vezes o nível-alvo e consuma 20 Pílulas da Nutrição da Alma de nível de Alquimia igual ao nível-alvo. A partir da tentativa de alcançar o terceiro nível, teste a tribulação como no avanço do reino de cultivo. Uma falha consome os recursos, perde um nível de cultivo normal e causa o dano de tribulação do reino atual, quando aplicável. Os descontos de Lorde Sagrado continuam válidos.'};
 return [general,...SOUL_PATH].map(entry=>({_id:'c0171a74'+String(entry.level).padStart(8,'0'),name:entry.name,type:'feat',folder:'c0171a7000000000',img:'systems/Immortals-system/icons/svg/damage/soul.svg',effects:[],
 system:{identifier:'caminho-alma-'+entry.level,type:{value:'class'},description:{value:'<p>'+entry.description+'</p>'},activities:{}},
 flags:{'Immortals-system':{cultivatorFeature:'soul-'+entry.level,soulPath:true,soulPathLevel:entry.level,soulPathVersion:1,featureSection:'jj-path'}}}));
}
