const scope="Immortals-system";
const base="systems/Immortals-system/assets/wuxia/equipamentos-antecedentes-pintados-v1/";
const legacy=Object.freeze({
 avaliacao:{type:"tool",img:"icons/tools/hand/magnifying-glass.webp"},
 alvos:{type:"loot",img:"icons/sundries/books/book-leather-brown.webp"},
 cantil:{type:"loot",img:"icons/containers/bags/waterskin-leather-brown.webp"},
 "vestes-pretas":{type:"equipment",img:"icons/equipment/chest/robe-layered-black.webp"},
 "bugiganga-orfa":{type:"loot",img:"icons/commodities/treasure/trinket-totem-wood-carved.webp"},
 isca:{type:"loot",img:"icons/consumables/meat/fish-salmon-cut-pink.webp"},
 "bugiganga-vagabundo":{type:"loot",img:"icons/commodities/treasure/trinket-totem-wood-carved.webp"},
 "manual-ceu":{type:"loot",img:"icons/sundries/books/book-embossed-gold.webp"},
 "manual-sagrado":{type:"loot",img:"icons/sundries/books/book-embossed-gold.webp"},
 "manual-terra":{type:"loot",img:"icons/sundries/books/book-embossed-gold.webp"},
 "manual-humano-comum":{type:"loot",img:"icons/sundries/books/book-embossed-gold.webp"}
});

/** Keep the unaffected catalogue artwork and use local assets for repaired entries. */
export function backgroundEquipmentImage(key,fallback){
 return Object.hasOwn(legacy,key)?base+key+".webp":fallback;
}

/** A renamed imported copy retains its rules and personal image; only stock broken paths change. */
export function prepareBackgroundEquipmentArtUpdate(source){
 const key=source?.flags?.[scope]?.backgroundEquipment;
 if(!Object.hasOwn(legacy,key))return null;
 const rule=legacy[key],id=source._id??source.id;
 if(!id||source.type!==rule.type||source.img!==rule.img)return null;
 return {_id:id,img:backgroundEquipmentImage(key)};
}
