import {WEAPON_ARTWORK} from './weapon-artwork.mjs';
import {CHINESE_WEAPONS} from './chinese-weapons.mjs';
import {treasureRarityLevel} from './refined-equipment.mjs';
const SCOPE='Immortals-system',BASE='systems/Immortals-system/assets/wuxia/armas-raridades-v1/';
export const WEAPON_RARITY_ART_CATALOG=Object.freeze([
 ...WEAPON_ARTWORK.map(entry=>({...entry,slug:entry.image.split('/').at(-1).replace('.webp','')})),
 ...CHINESE_WEAPONS.map(entry=>({id:entry.id,slug:entry.slug,type:entry.weaponType,image:'systems/Immortals-system/assets/wuxia/armas-pintadas-v1/'+entry.slug+'.webp'}))
].map(Object.freeze));
const byId=new Map(WEAPON_RARITY_ART_CATALOG.map(entry=>[entry.id,entry])),bySlug=new Map(WEAPON_RARITY_ART_CATALOG.map(entry=>[entry.slug,entry]));
const imageFor=(entry,level)=>level<=1?entry.image:BASE+entry.slug+'-'+String(level).padStart(2,'0')+'.webp';
const knownImages=entry=>new Set([entry.image,entry.previous,...Array.from({length:9},(_,i)=>imageFor(entry,i+2))].filter(Boolean));
const byManagedImage=new Map(WEAPON_RARITY_ART_CATALOG.flatMap(entry=>Array.from({length:10},(_,i)=>[imageFor(entry,i+1),entry])));
const MISSING=Symbol('missing');
function valueAt(data,path){
 if(!data||typeof data!=='object')return MISSING;
 if(Object.hasOwn(data,path))return data[path];
 const parts=path.split('.');
 for(let count=parts.length-1;count>0;count--){const prefix=parts.slice(0,count).join('.');if(Object.hasOwn(data,prefix))return valueAt(data[prefix],parts.slice(count).join('.'));}
 return MISSING;
}
function prospectiveActivityKeys(source,changes){
 const keys=new Set(Object.keys(source.system?.activities??{})),nested=valueAt(changes,'system.activities');
 if(nested&&typeof nested==='object')for(const key of Object.keys(nested))if(!key.startsWith('-='))keys.add(key);
 for(const path of Object.keys(changes)){const match=path.match(/^system[.]activities[.]([A-Za-z0-9]{1,64})(?:[.]|$)/);if(match)keys.add(match[1]);}
 return keys;
}
function familyFor(item,source){
 if(source?.type!=='weapon')return null;
 const flags=source.flags?.[SCOPE],imported=flags?.ascensionImport;
 if(imported&&(imported.system!=='ascension-system'||imported.pack!=='equipment'||imported.sourceType!=='weapon'))return null;
 const chinese=bySlug.get(flags?.chineseWeapon);
 if(chinese)return chinese;
 if(imported)return WEAPON_RARITY_ART_CATALOG.find(entry=>entry.origin===imported.documentId)??null;
 const canonical=byId.get(source._id??item?.id);if(canonical)return canonical;
 const origin=source._stats?.compendiumSource??item?._stats?.compendiumSource;
 const match=typeof origin==='string'?origin.match(/^Compendium[.]Immortals-system[.]equipamentos[.]Item[.]([A-Za-z0-9]+)$/):null;
 if(match&&byId.has(match[1]))return byId.get(match[1]);
 return byManagedImage.get(source.img)??null;
}
/** All artwork uses the same catalogue identity, even for renamed inventory copies. */
export function weaponRarityImageFor(item,level){
 const source=item?.toObject?.()??item,entry=familyFor(item,source);
 return entry?imageFor(entry,treasureRarityLevel(level)):null;
}
/** Art only. Preserve personal portraits and independently configured activity icons. */
export function prepareWeaponRarityArtworkUpdate(item,changes={}, {allowMissingId=false}={}){
 if(!item||item.isOwner===false||item.limited===true)return null;
 const owner=item.actor??(['character','npc'].includes(item.parent?.type)?item.parent:null);
 if(owner&&(owner.isOwner!==true||owner.limited===true))return null;
 const source=item.toObject?.()??item,id=source?._id??item.id;
 const changedImage=valueAt(changes,'img'),current=changedImage===MISSING?source?.img:changedImage;
 const entry=familyFor(item,source)??familyFor(item,{...source,img:current});if(!entry||!id&&!allowMissingId)return null;
 const images=knownImages(entry);
 const managedPortrait=images.has(current);
 const changedLevel=valueAt(changes,'system.refinement.rarityLevel'),level=treasureRarityLevel(changedLevel===MISSING?source.system?.refinement?.rarityLevel:changedLevel);
 if(!managedPortrait&&!level&&changedLevel===MISSING)return null;
 // Leave old ordinary portraits to the existing import migration.
 if(!level&&current===entry.previous&&changedLevel===MISSING)return null;
 const desired=imageFor(entry,level),patch=id?{_id:id}:{};
 if(managedPortrait&&current!==desired)patch.img=desired;
 for(const key of prospectiveActivityKeys(source,changes)){
  if(!/^[A-Za-z0-9]{1,64}$/.test(key)||['constructor','prototype','__proto__'].includes(key))continue;
  if(valueAt(changes,'system.activities.-='+key)!==MISSING||valueAt(changes,'system.activities.'+key)===null)continue;
  const path='system.activities.'+key+'.img',edited=valueAt(changes,path),image=edited===MISSING?source.system?.activities?.[key]?.img:edited;
  if(images.has(image)&&image!==desired)patch[path]=desired;
 }
 return Object.keys(patch).some(key=>key!=='_id')?patch:null;
}
const registrations=new WeakSet();
/** Patch the native operation once; no follow-up update, render loop or extra resource change. */
export function registerWeaponRarityArtworkHooks(hooks=globalThis.Hooks){
 if(typeof hooks?.on!=='function'||registrations.has(hooks))return;
 registrations.add(hooks);
 hooks.on('preUpdateItem',(item,changes)=>{
  if(valueAt(changes,'system.refinement.rarityLevel')===MISSING&&valueAt(changes,'img')===MISSING)return;
  const patch=prepareWeaponRarityArtworkUpdate(item,changes);if(!patch)return;
  const {_id,...art}=patch;Object.assign(changes,art);
 });
 hooks.on('preCreateItem',(item,data)=>{
  const patch=prepareWeaponRarityArtworkUpdate(item,data,{allowMissingId:true});if(!patch||typeof item.updateSource!=='function')return;
  const {_id,...art}=patch;item.updateSource(art);
 });
}
