import {professionProductDocument} from './profession-products-content.mjs';
import {backgroundEquipmentImage} from './background-equipment-art.mjs';
const scope='Immortals-system',pack='Compendium.Immortals-system.geral.Item.',equip='Compendium.Immortals-system.equipamentos.Item.';
export const BACKGROUND_EQUIPMENT_FOLDER_ID='bacc000000000003';
const hash=value=>{let n=2166136261;for(const c of value){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');};
export const backgroundEquipmentId=key=>'bacc6000'+hash(key);
const extra=[
 ['falsificacao','Kit de Falsificação','tool','icons/tools/scribal/pen-steel-grey-brown.webp','Kit de falsificação de valor máximo de 50 PO.'],
 ['escalada','Kit de Escalada','tool','icons/sundries/survival/rope-wrapped-brown.webp','Cordas, ganchos e apoio para escalada.'],
 ['avaliacao','Kit de Avaliação','tool','icons/tools/hand/magnifying-glass.webp','Instrumentos para examinar mercadorias e avaliar tesouros.'],
 ['tratamento','Kit de Tratamento','tool','icons/containers/bags/pouch-leather-brown-green.webp','Ferramentas de tratamento do iniciado em medicina.'],
 ['remedios','Kit de Remédios','tool','icons/consumables/potions/bottle-round-corked-green.webp','Remédios iniciais do antecedente.'],
 ['arrombar','Kit para Arrombar Fechaduras','tool','icons/tools/hand/lockpicks-steel-grey.webp','Ferramentas para abrir fechaduras.'],
 ['alvos','Livro de Informações de Antigos Alvos','loot','icons/sundries/books/book-leather-brown.webp','Registros dos antigos alvos do caçador de recompensas.'],
 ['cantil','Cantil','loot','icons/containers/bags/waterskin-leather-brown.webp','Recipiente de água para viagem.'],
 ['vestes-pretas','Vestes Pretas','equipment','icons/equipment/chest/robe-layered-black.webp','Vestes escuras do cultivador demoníaco.'],
 ['lembranca-seita','Lembrança de um Membro de Seita','loot','icons/equipment/neck/amulet-carved-stone-hammer.webp','Bugiganga de um membro de seita morto pelo personagem; defina a aparência com o Narrador.'],
 ['lembranca-trabalho','Lembrança do Último Trabalho','loot','icons/equipment/neck/amulet-carved-stone-hammer.webp','Bugiganga recebida no último trabalho como matador de aluguel.'],
 ['vestes-seita','Vestes da Seita','equipment','icons/equipment/chest/robe-layered-red.webp','Vestes da seita à qual o personagem pertence.'],
 ['simbolo-seita','Símbolo da Seita','loot','icons/equipment/neck/amulet-carved-stone-hammer.webp','Identificação da seita; personalize com o Narrador.'],
 ['anel-espacial','Anel Espacial Inferior','equipment','icons/equipment/finger/ring-band-engraved-scrolls-silver.webp','Anel espacial inferior recebido pelo antecedente. A capacidade segue a regra de anéis da campanha.'],
 ['roupas-gastas','Roupas Gastas','equipment','icons/equipment/chest/shirt-collared-brown.webp','Roupas antigas e desgastadas.'],
 ['chapeu-palha','Chapéu de Palha','equipment','icons/equipment/head/hat-pointed-leather-brown.webp','Chapéu simples de palha.'],
 ['arma-enferrujada','Arma Enferrujada','weapon','icons/weapons/swords/sword-guard-brown.webp','Arma enferrujada do mendigo; dano base 1d4.'],
 ['vestes-mosteiro','Vestes do Monastério','equipment','icons/equipment/chest/robe-layered-red.webp','Vestes do monastério do personagem.'],
 ['bugiganga-orfa','Bugiganga Roubada','loot','icons/commodities/treasure/trinket-totem-wood-carved.webp','Bugiganga roubada de valor máximo de 10 PO. Defina sua aparência com o Narrador.'],
 ['isca','Pacote de Iscas','loot','icons/consumables/meat/fish-salmon-cut-pink.webp','Iscas para pesca.'],
 ['vestes-servo','Túnica Simples de Servo','equipment','icons/equipment/chest/shirt-collared-brown.webp','Vestes simples de servo da família principal.'],
 ['camuflagem','Roupas de Camuflagem','equipment','icons/equipment/back/cloak-heavy-fur-blue.webp','Roupas de camuflagem do soldado.'],
 ['bugiganga-vagabundo','Bugiganga de Viagem','loot','icons/commodities/treasure/trinket-totem-wood-carved.webp','Bugiganga de valor máximo de 1 PO; defina com o Narrador.'],
 ['carta-mae','Carta da Mãe','loot','icons/sundries/scrolls/scroll-bound-sealed-red-green.webp','Carta que acompanha o manual do bastardo.'],
 ['manual-ceu','Manual de Cultivo — Céu','loot','icons/sundries/books/book-embossed-gold.webp','Manual roubado recebido por Direito de Nascimento. Qualidade e propriedades são definidas pelo Narrador.'],
 ['manual-sagrado','Manual de Cultivo Demoníaco — Sagrado','loot','icons/sundries/books/book-embossed-gold.webp','Manual de cultivo demoníaco recebido pelo antecedente. Exige uma vida inocente por semana, conforme sua característica.'],
 ['manual-terra','Manual de Cultivo — Terra','loot','icons/sundries/books/book-embossed-gold.webp','Manual recebido da seita; propriedades são definidas pelo Narrador.'],
 ['manual-humano-comum','Manual de Cultivo — Humano Comum','loot','icons/sundries/books/book-embossed-gold.webp','Manual recebido pelo servo da família principal.'],
 ['guqin','Guqin','tool','icons/tools/instruments/lute-gold-brown.webp','Instrumento musical de cordas.'],
 ['pipa','Pipa','tool','icons/tools/instruments/lute-gold-brown.webp','Instrumento musical chinês de cordas.'],
 ['dizi','Dizi','tool','icons/tools/instruments/flute-simple-wood.webp','Flauta chinesa de bambu.'],
 ['erhu','Erhu','tool','icons/tools/instruments/lute-gold-brown.webp','Instrumento musical chinês de duas cordas.']
];
export const BACKGROUND_WEAPONS=[
 {
  "id": "287cfd274553dbb4",
  "name": "Espadas de Gancho (Shuang Gou)",
  "type": "simpleM"
 },
 {
  "id": "30f554ce1bf92d40",
  "name": "Dao",
  "type": "simpleM"
 },
 {
  "id": "65f2e842ded9ca8b",
  "name": "Lâminas Borboleta (Hudiedao)",
  "type": "simpleM"
 },
 {
  "id": "73becd0c57f0787a",
  "name": "Zhanmadao",
  "type": "martialM"
 },
 {
  "id": "794a52cd148cbccb",
  "name": "Martelo Meteoro (Liuxingchui)",
  "type": "martialM"
 },
 {
  "id": "8aec730c7777981f",
  "name": "Guandao",
  "type": "martialM"
 },
 {
  "id": "97bf7c2bd49b47c2",
  "name": "Jian",
  "type": "simpleM"
 },
 {
  "id": "bastardSword0000",
  "name": "Espada Bastarda",
  "type": "martialM"
 },
 {
  "id": "battleAxe0000000",
  "name": "Machado de Batalha",
  "type": "martialM"
 },
 {
  "id": "beedd8a495bcc6fe",
  "name": "Qiang",
  "type": "martialM"
 },
 {
  "id": "boStaff000000000",
  "name": "Bastão Longo",
  "type": "martialM"
 },
 {
  "id": "chainHook0000000",
  "name": "Gancho de Corrente",
  "type": "martialM"
 },
 {
  "id": "clawHammer000000",
  "name": "Martelo de Garra",
  "type": "simpleM"
 },
 {
  "id": "dagger0000000000",
  "name": "Adaga",
  "type": "simpleM"
 },
 {
  "id": "dartGun000000000",
  "name": "Zarabatana",
  "type": "martialR"
 },
 {
  "id": "eb574f8c2097f5b9",
  "name": "Leque de Ferro (Tie Shan)",
  "type": "simpleM"
 },
 {
  "id": "f85714e20057dc2e",
  "name": "Bastão de Três Seções (Sanjiegun)",
  "type": "simpleM"
 },
 {
  "id": "glaive0000000000",
  "name": "Glaive",
  "type": "martialM"
 },
 {
  "id": "greatclub0000000",
  "name": "Clava Grande",
  "type": "simpleM"
 },
 {
  "id": "greatHammer00000",
  "name": "Martelo Gigante",
  "type": "martialM"
 },
 {
  "id": "greatsword000000",
  "name": "Espada Grande",
  "type": "martialM"
 },
 {
  "id": "halberd000000000",
  "name": "Alabarda",
  "type": "martialM"
 },
 {
  "id": "handAxe000000000",
  "name": "Machadinha",
  "type": "martialM"
 },
 {
  "id": "handCrossbow0000",
  "name": "Besta de Mão",
  "type": "martialR"
 },
 {
  "id": "heavyCrossbow000",
  "name": "Besta Pesada",
  "type": "martialR"
 },
 {
  "id": "javelin000000000",
  "name": "Dardo",
  "type": "simpleM"
 },
 {
  "id": "jjarm00000000001",
  "name": "Machado Grande",
  "type": "martialM"
 },
 {
  "id": "jjarm00000000005",
  "name": "Lança",
  "type": "martialM"
 },
 {
  "id": "jjarm00000000007",
  "name": "Martelo de Guerra",
  "type": "martialM"
 },
 {
  "id": "jjarm00000000014",
  "name": "Katana",
  "type": "martialM"
 },
 {
  "id": "jjarm00000000025",
  "name": "Bastão",
  "type": "simpleM"
 },
 {
  "id": "longbow000000000",
  "name": "Arco Longo",
  "type": "martialR"
 },
 {
  "id": "longsword0000000",
  "name": "Espada Longa",
  "type": "martialM"
 },
 {
  "id": "mace000000000000",
  "name": "Maça",
  "type": "simpleM"
 },
 {
  "id": "pickaxe000000000",
  "name": "Picareta",
  "type": "simpleM"
 },
 {
  "id": "pistol0000000000",
  "name": "Pistola",
  "type": "martialR"
 },
 {
  "id": "quarterstaff0000",
  "name": "Bastão de Combate",
  "type": "martialM"
 },
 {
  "id": "rapier0000000000",
  "name": "Florete",
  "type": "simpleM"
 },
 {
  "id": "sai0000000000000",
  "name": "Sai",
  "type": "simpleM"
 },
 {
  "id": "scimitar00000000",
  "name": "Cimitarra",
  "type": "martialM"
 },
 {
  "id": "shortbow00000000",
  "name": "Arco Curto",
  "type": "martialR"
 },
 {
  "id": "shortsword000000",
  "name": "Espada Curta",
  "type": "martialM"
 },
 {
  "id": "sling00000000000",
  "name": "Estilingue",
  "type": "martialR"
 },
 {
  "id": "spikedGreatclub0",
  "name": "Clava Cravada",
  "type": "simpleM"
 },
 {
  "id": "stiletto00000000",
  "name": "Estilete",
  "type": "simpleM"
 },
 {
  "id": "warLance00000000",
  "name": "Lança de Guerra",
  "type": "martialM"
 }
];
export function backgroundEquipmentDocuments(){
 return [{_id:BACKGROUND_EQUIPMENT_FOLDER_ID,name:'Equipamentos de Antecedente',type:'Item',folder:'bacc000000000001',sorting:'a',color:'#7b8d99'},...extra.map(([key,name,type,img,description])=>({_id:backgroundEquipmentId(key),name,type,img:backgroundEquipmentImage(key,img),folder:BACKGROUND_EQUIPMENT_FOLDER_ID,system:{identifier:'antecedente-equipamento-'+key,description:{value:'<p>'+description+'</p>'},quantity:1,price:{value:0,denomination:'gp'},type:{value:type==='equipment'?'clothing':type==='weapon'?'simpleM':type==='tool'?'art':'gear'},...(key==='arma-enferrujada'?{damage:{base:{number:1,denomination:4,bonus:'',types:[]}}}:{})},effects:[],flags:{[scope]:{backgroundEquipment:key}}}))];
}
const fixed=(id,quantity=1)=>({uuid:equip+id,quantity,optional:false});
const custom=(id,quantity=1)=>({uuid:pack+backgroundEquipmentId(id),quantity,optional:false});
const aid=()=>({uuid:equip+professionProductDocument('kit-de-primeiros-socorros')._id,quantity:1,optional:false});
const manifests={
 'acompanhante':[custom('falsificacao'),fixed('dressClothing000')],
 'aprendiz-marcial':[],
 'ator':[fixed('disguiseToolkit0',2),fixed('dressClothing000')],
 'bastardo':[fixed('disguiseToolkit0'),fixed('commonClothing00',3),custom('manual-ceu'),custom('carta-mae')],
 'cacador-de-recompensas':[custom('alvos'),custom('escalada'),custom('cantil')],
 'comerciante':[custom('avaliacao')],
 'cozinheiro':[fixed('cooksToolkit0000'),fixed('commonClothing00')],
 'cultivador-demoniaco':[custom('vestes-pretas'),custom('lembranca-seita'),custom('manual-sagrado')],
 'estudioso':[custom('avaliacao')],
 'iniciado-em-medicina':[aid(),custom('tratamento'),custom('remedios')],
 'jovem-mestre':[fixed('dressClothing000')],
 'ladrao-de-rua':[custom('arrombar'),fixed('disguiseToolkit0')],
 'matador-de-aluguel':[fixed('disguiseToolkit0'),custom('vestes-pretas'),custom('lembranca-trabalho'),fixed('dagger0000000000',5)],
 'membro-de-seita':[custom('vestes-seita'),custom('simbolo-seita'),custom('anel-espacial'),custom('manual-terra')],
 'mendigo':[custom('roupas-gastas'),custom('chapeu-palha'),custom('arma-enferrujada')],
 'monge':[custom('escalada'),custom('vestes-mosteiro')],
 'musico':[fixed('disguiseToolkit0'),fixed('dressClothing000')],
 'orfao':[fixed('commonClothing00'),custom('bugiganga-orfa')],
 'pescador':[fixed('fishingPole00000'),custom('cantil'),custom('isca')],
 'servo-do-jovem-mestre':[],
 'servo-da-familia-principal':[custom('vestes-servo',3),custom('manual-humano-comum')],
 'soldado':[custom('escalada'),aid(),custom('camuflagem')],
 'vagabundo':[custom('bugiganga-vagabundo')]
};
export function backgroundEquipmentAdvancements(entry){
 const fixedId='bacc7000'+hash(entry.key),items=manifests[entry.key];
 if(!items)throw new Error('Equipamento de antecedente não definido: '+entry.key);
 const advances={[fixedId]:{_id:fixedId,type:'ItemGrant',level:0,title:'Equipamentos e moedas',configuration:{items,currency:{gp:entry.startingGold},optional:false},value:{}}};
 const choice=(key,title,pool,hint='')=>{const id='bacc8000'+hash(entry.key+key);advances[id]={_id:id,type:'ItemChoice',title,hint,configuration:{choices:{0:{count:1,replacement:false}},allowDrops:false,type:null,pool:pool.map(uuid=>({uuid})),restriction:{}},value:{}};};
 const weapons=filter=>BACKGROUND_WEAPONS.filter(filter).map(w=>equip+w.id);
 if(entry.key==='aprendiz-marcial')choice('weapon','Arma marcial',weapons(w=>w.type.startsWith('martial')));
 if(entry.key==='cacador-de-recompensas')choice('weapon','Arma simples com proficiência',weapons(w=>w.type.startsWith('simple')),'Escolha uma arma na qual o personagem possua proficiência.');
 if(entry.key==='jovem-mestre')choice('weapon','Arma comum de boa qualidade',weapons(()=>true),'Escolha a arma comum recebida pela família.');
 if(entry.key==='servo-do-jovem-mestre'){
  choice('armor','Armadura flexível inferior',['leatherArmor0000','brigandine000000','chainMail0000000'].map(id=>equip+id));
  choice('weapon','Arma tesouro com proficiência',BACKGROUND_WEAPONS.map(w=>equip+w.id),'Escolha uma arma com a qual possua proficiência. O tesouro começa no nível Humano Inferior; ajuste com o Narrador se a família conceder outro rank.');
 }
 if(entry.key==='servo-do-jovem-mestre')for(const a of Object.values(advances))if(a.type==='ItemChoice')a.configuration.grantRarity=1;
 if(['cacador-de-recompensas','servo-do-jovem-mestre'].includes(entry.key))for(const a of Object.values(advances))if(a.type==='ItemChoice'&&a.title.includes('Arma'))a.configuration.requiresProficiency=true;
 if(entry.key==='musico')choice('instrument','Instrumento musical',['guqin','pipa','dizi','erhu'].map(id=>pack+backgroundEquipmentId(id)),'Escolha um instrumento. O Narrador pode ampliar o conjunto na Progressão do antecedente.');
 return advances;
}
