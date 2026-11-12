import {weaponArtworkForImport} from "../module/systems/weapon-artwork.mjs";
import { createHash } from "node:crypto";

const hash = value => createHash("sha256").update(value).digest("hex").slice(0, 16);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug = value => String(value ?? "").replace(/([a-z])([A-Z])/g,"$1-$2").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const PROPERTY_LABELS = {investment:"Vinculação",stackable:"Empilhável",unique:"Único",thrown:"Arremesso",versatile:"Versátil",parrying:"Aparar",noisy:"Ruidosa",ambush:"Emboscada",intuitive:"Intuitiva",oversized:"Descomunal",engaging:"Engajamento",bulky:"Volumosa",blocking:"Bloqueio",natural:"Natural",reach:"Alcance"};
const CONDITIONS = {burning:"Em chamas",corroding:"Corrosão",poisoned:"Envenenado",silenced:"Silenciado",staggered:"Cambaleante",slowed:"Lento",restrained:"Imobilizado",paralyzed:"Paralisado",falling:"Em queda",prone:"Caído"};
const ACTION_NAMES = {alchemistsFire:"Arremessar fogo de alquimista",antitoxin:"Usar antitoxina",causticPhial:"Arremessar frasco cáustico",chokingAmpoule:"Arremessar ampola sufocante",electrochargeAmpoule:"Arremessar ampola elétrica",frostFlask:"Arremessar frasco gélido",gemOfConjuredFlame:"Conjurar elemental de fogo",healingElixir:"Beber elixir de cura",healingTonic:"Beber tônico de cura",blastFlask:"Arremessar frasco explosivo",lightLantern:"Acender lanterna",net:"Arremessar rede",omniglotDecoction:"Beber decocção omniglota",paralyticIngest:"Aplicar efeito paralisante",paralyticApply:"Aplicar paralisante",poisonIngest:"Aplicar efeito do veneno",poisonApply:"Aplicar veneno",rallyingElixir:"Beber elixir de ânimo",rallyingTonic:"Beber tônico de ânimo",readScroll:"Ler pergaminho",steelJawArm:"Armar armadilha",steelJawTrigger:"Acionar armadilha",lightTorch:"Acender tocha",affixDisguise:"Assumir disfarce",affixFocusing:"Recuperar Qi",affixLuminous:"Ativar iluminação",gliding:"Planar"};
const emptyDamage = types => ({number:null,denomination:null,bonus:"",types,custom:{enabled:false,formula:""},modifiers:[],scaling:{mode:"",number:1,formula:""}});

/** Convert display text without leaving enrichers that only Ascension understands. */
function text(value, source, options) {
  let result = String(value ?? "");
  result = result.replace(/@ref\[item\.name\](?:\{([^}]*)\})?/g, (_m,label) => label || escape(source.name));
  result = result.replace(/@Condition\[([^\]]+)\](?:\{([^}]*)\})?/g, (_m,key,label) => escape(label || CONDITIONS[key] || key));
  result = result.replace(/@Rule\[([^\]]+)\](?:\{([^}]*)\})?/g, (_m,key,label) => escape(label || ({"action.weakened":"dano reduzido"}[key] ?? key.split(".").at(-1))));
  result = result.replace(/Compendium\.(?:crucible|ascension-system)\.equipment\.(?:Item\.)?([A-Za-z0-9]+)/g, (_m,id) => "Compendium.Immortals-system.equipamentos.Item." + (options.idMap?.[id] ?? id));
  // Labels remain legible when a source-only spell or summon has no destination document.
  result = result.replace(/@UUID\[(Compendium\.(?:crucible|ascension-system)\.[^\]]+)\](?:\{([^}]*)\})?/g, (_m,_uuid,label) => escape(label || "Referência da descrição original"));
  result = result.replace(/\b(?:Energia Amaldiçoada|Cursed Energy|Focus)\b/gi,"Qi");
  return result.replace(/\b(?:feet|foot)\b/gi,"m");
}

function activity(action, source, options) {
  const id = hash(source._id + ":" + action.id);
  const targets = [];
  if (action.cost?.action > 0) targets.push({type:"attribute",target:"energy.generated",value:String(action.cost.action)});
  if (action.cost?.focus > 0) targets.push({type:"attribute",target:"energy.total",value:String(action.cost.focus)});
  if ((action.tags ?? []).includes("consume")) targets.push({type:"itemUses",target:"",value:"1"});
  const self = action.target?.type === "self" || (action.target?.scope === 1 && !action.range?.maximum);
  const blast = action.target?.type === "blast";
  const special = action.cost?.heroism > 0 ? "Custo especial da origem: " + action.cost.heroism + " de Heroísmo; o mestre define o recurso equivalente." : "";
  const description = text(action.description, source, options);
  return {_id:id,type:"utility",name:ACTION_NAMES[action.id] ?? action.name ?? "Usar item",img:options.assetMap?.[action.img] ?? action.img ?? source.img,sort:0,
    activation:{type:(action.tags ?? []).includes("reaction")?"reaction":"action",value:action.cost?.action ?? 0,condition:special,override:true},
    consumption:{targets,scaling:{allowed:false,max:""},spellSlot:false},
    description:{value:description,chatFlavor:""},
    duration:{units:"inst",concentration:false,override:false},effects:[],
    range:{override:true,units:self?"self":"m",value:action.range?.maximum ?? null,special:""},
    target:{override:true,prompt:true,template:{type:blast?"circle":"",size:blast?String(action.target.size ?? 0):"",units:"m",contiguous:false,stationary:false},affects:{type:self?"self":action.target?.type==="none"?"":"creature",count:self?"":String(action.target?.number ?? 1),choice:false,special:""}},
    uses:{max:"",spent:0,recovery:[]},roll:{prompt:false,visible:false,name:"",formula:""}};
}

/** Native Immortals item data; source formulas never become weapon damage dice. */
export function convertAscensionEquipment(source, options = {}) {
  if (!["weapon","armor","accessory","tool","consumable","loot"].includes(source.type)) throw new Error("Tipo de equipamento sem conversão: " + source.type);
  const s = source.system ?? {}, id = options.id ?? source._id;
  const image = options.assetMap?.[source.img] ?? weaponArtworkForImport(source) ?? source.img;
  const category = options.config?.weapons?.[s.category];
  if (source.type === "weapon" && !category) throw new Error("Categoria de arma ausente: " + s.category);
  const shield = source.type === "weapon" && s.category.startsWith("shield");
  const type = shield || ["armor","accessory"].includes(source.type) ? "equipment" : source.type;
  const props = new Set(), sourceProps = s.properties ?? [];
  if (sourceProps.includes("thrown")) props.add("thr");
  if (sourceProps.includes("versatile")) props.add("ver");
  if (sourceProps.includes("reach")) props.add("rch");
  if (sourceProps.includes("noisy")) props.add("stealthDisadvantage");
  if (sourceProps.includes("investment")) props.add("mgc");
  let description = text(s.description?.public, source, options);
  if (sourceProps.length) description += "<p><strong>Propriedades:</strong> " + sourceProps.map(p=>escape(PROPERTY_LABELS[p] ?? p)).join(", ") + ".</p>";
  for (const effect of source.effects ?? []) {
    description += "<h3>" + escape(effect.name) + "</h3>" + text(effect.description, source, options);
  }
  const acts = [...(s.actions ?? []), ...(source.effects ?? []).flatMap(e=>e.system?.actions ?? [])];
  const usesMax = Number(s.uses?.max ?? (type === "consumable" ? 1 : 0));
  const system = {identifier:slug(s.identifier || source.name),description:{value:description,chat:""},source:{custom:"Ascension Legacy",rules:"2024",revision:1},
    quantity:s.quantity ?? 1,weight:{value:s.weight ?? 0,units:"kg"},price:{value:s.price ?? 0,denomination:"yen"},
    identified:true,unidentified:{description:""},rarities:[],container:null,properties:[],equipped:!!s.equipped,
    attunement:sourceProps.includes("investment")?"required":"",attuned:!!s.invested,
    uses:{max:usesMax?String(usesMax):"",spent:Math.max(0,usesMax-Number(s.uses?.value ?? usesMax)),recovery:[]},
    activities:Object.fromEntries(acts.map(a=>{const converted=activity(a,source,options);return [converted._id,converted];}))};
  if (type === "weapon") {
    const ranged = !!category.ranged;
    system.type = {value:s.category === "unarmed" ? "natural" : /^(simple|light)/.test(s.category) ? "simpleM" : ranged ? "martialR" : "martialM",baseItem:""};
    if (category.hands === 2) props.add("two");
    if (/^heavy/.test(s.category) || sourceProps.includes("oversized")) props.add("hvy");
    if (s.category === "light1") props.add("lgt");
    if (s.category === "light1" || /^balanced/.test(s.category)) props.add("fin");
    if (ranged) props.add("amm");
    if (category.reload) props.add("lod");
    const ammunition = /crossbow/i.test(s.identifier) ? "crossbowBolt" : /blowgun/i.test(s.identifier) ? "blowgunNeedle" : /pistol/i.test(s.identifier) ? "firearmBullet" : /sling/i.test(s.identifier) ? "slingBullet" : "arrow";
    system.ammunition = {type:ranged?ammunition:""};
    system.range = {units:"m",value:ranged?category.range:sourceProps.includes("thrown")?30:null,long:null,reach:ranged?null:category.range};
    system.damage = {base:emptyDamage(s.damageType?[s.damageType]:[]),versatile:emptyDamage(s.damageType?[s.damageType]:[])};
    const aid=hash(id+":attack"),cost=category.actionCost ?? 2;
    system.activities[aid]={_id:aid,type:"attack",name:"Ataque",img:image,sort:0,
      activation:{type:"action",value:cost,condition:"",override:true},consumption:{targets:[{type:"attribute",target:"energy.generated",value:String(cost)}],scaling:{allowed:false,max:""},spellSlot:false},
      attack:{ability:"",bonus:"",flat:false,type:{value:ranged?"ranged":"melee",classification:s.category==="unarmed"?"unarmed":"weapon"},critical:{threshold:null}},
      damage:{includeBase:true,parts:[],critical:{bonus:""}},description:{value:"",chatFlavor:""},duration:{units:"inst",concentration:false,override:false},effects:[],
      range:{units:"m",value:ranged?system.range.value:system.range.reach,override:true,special:""},target:{override:false,prompt:true,template:{type:"",units:"m",contiguous:false,stationary:false},affects:{type:"creature",count:"1",choice:false}},uses:{max:"",spent:0,recovery:[]}};
  } else if (type === "equipment") {
    const ring = /^Anel\b/i.test(source.name);
    const armorType = shield ? "shield" : source.type === "armor" ? s.category === "unarmored" ? "clothing" : s.category : s.category === "clothing" ? "clothing" : ring ? "ring" : "wondrous";
    system.type = {value:armorType,baseItem:""};
    let base = 0;
    if (shield) base=category.defense?.block ?? 0;
    else if(source.type === "armor") {const bounds=options.config?.armor?.[s.category]?.armor;if(!bounds)throw new Error("Categoria de armadura ausente: "+s.category);base=Math.min(bounds.max,Math.max(bounds.min,s.armor?.base??0));}
    system.armor = {value:base,dex:null,ability:["heavy","shield"].includes(armorType)?"":armorType === "light" || armorType === "medium"?"dex":"",magicalBonus:""};
    system.strength=null;system.proficient=null;
  } else if (type === "tool") {
    system.type={value:"art",baseItem:""};system.ability=(s.skills??[]).some(k=>["alchemy","cooking","enchanting","fletching","glyphweaving","smithing","jewelcraft","tailoring"].includes(k))?"wis":"";system.bonus="";system.proficient=null;system.chatFlavor="";
    if(s.skills?.length)system.description.value+="<p><strong>Profissões e conhecimentos:</strong> "+s.skills.map(k=>escape(options.skillLabels?.[k]??k)).join(", ")+".</p>";
  } else if (type === "consumable") {
    const ammo=/muni[cç][aã]o/i.test(options.folderPath??"");
    system.type={value:ammo?"ammo":s.category==="scroll"?"scroll":s.category==="flask"?/veneno|paralis/i.test(source.name)?"poison":"potion":"trinket",subtype:""};
    if(ammo)system.type.subtype=/flecha/i.test(source.name)?"arrow":/virote/i.test(source.name)?"crossbowBolt":/bala/i.test(source.name)?"firearmBullet":"";
    system.uses.autoDestroy=true;system.damage={base:emptyDamage([]),replace:false};
  } else system.type={value:s.category==="ingredient"?"material":s.category==="treasure"?"treasure":"gear"};
  system.properties=[...props].filter(p=>type==="weapon" || ["mgc","stealthDisadvantage"].includes(p));
  return {_id:id,_key:"!items!"+id,name:source.name,type,img:image,system,effects:[],folder:options.folder ?? source.folder ?? null,sort:source.sort ?? 0,ownership:{default:0},
    flags:{"Immortals-system":{ascensionImport:{system:"ascension-system",pack:"equipment",documentId:source._id,sourceType:source.type,category:s.category??"",quality:s.quality??"",enchantment:s.enchantment??"",properties:structuredClone(sourceProps),weaponDamagePending:type==="weapon",manualEffects:(source.effects??[]).map(e=>e.name)}}}};
}
