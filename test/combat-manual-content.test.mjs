import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
const foundryPublic=process.env.FOUNDRY_PUBLIC_PATH??'C:/Program Files/Foundry Virtual Tabletop/resources/app/public/';
let api={};try{api=await import('../module/systems/combat-manual-content.mjs');}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const scope='Immortals-system';
const documents=()=>{assert.equal(typeof api.combatManualCompendiumDocuments,'function');return api.combatManualCompendiumDocuments();};
const item=id=>{assert.equal(typeof api.combatManualTechniqueDocument,'function');return api.combatManualTechniqueDocument(id);};
const activity=(id,key='main')=>Object.values(item(id).system.activities).find(a=>a.flags[scope].combatManualActivity.key===key);
const printedCosts={
 'golpe-interno':[1,3],'mao-do-perdao':[4,3],'palma-incapacitadora':[4,2],
 'corte-violento':[1,3],'first-wave':[4,3],'desvio-sutil':[3,2],
 'killing-circle':[1,3],'investida-do-dragao':[4,3],'accurate-thrust':[2,1],
 'punho-brutal':[1,3],'arremesso-pesado':[4,3],'rage-kick':[4,3],
 'melodia-decadente':[2,3],'choque-trovejante':[4,2],'som-inspirador':[4,2],
 'corte-de-papel':[2,3],'laminas-de-vento':[3,3],'little-twist':[2,2],
 'tiro-de-advertencia':[2,3],'marca-do-cacador':[4,3],'ataque-debilitador':[2,0],
 'avanco-rapido':[2,2],'nuvens-a-deriva':[2,1],
 'chest-blow':[2,2],'heavy-bash':[4,3],'monkey-sight':[2,1],
 'wok-bash':[2,3],'wok-shake':[4,3],'wok-throw':[2,2]};

test('the combat-manual catalog supplies 29 usable spells in ten coherent category folders',async()=>{
 const docs=documents(),folders=docs.filter(d=>d.type==='Item'),spells=docs.filter(d=>d.type==='spell');assert.equal(folders.length,11);assert.equal(spells.length,29);assert.equal(new Set(docs.map(d=>d._id)).size,40);
 const root=folders.find(d=>d.folder===null);assert.equal(root.name,'Manuais de Combate');assert.equal(folders.filter(d=>d.folder===root._id).length,10);
 for(const spell of spells){assert.match(spell._id,/^[a-f0-9]{16}$/);assert(folders.some(d=>d._id===spell.folder));assert(spell.system.description.value.length>150);assert(spell.flags[scope].combatManualTechnique);assert(!spell.flags[scope].talentoQi);assert(!spell.flags[scope].feitico);assert.equal(spell.system.level,spell.flags[scope].combatManualTechnique.grade??0);assert.equal(spell.effects.length,0);if(spell.img.startsWith('icons/')){assert.match(spell.img,/^icons\/[a-zA-Z0-9_/-]+\.(?:svg|webp|png)$/);if(existsSync(foundryPublic))await fs.access(path.join(foundryPublic,spell.img));}else await fs.access(new URL('../'+spell.img.replace('systems/Immortals-system/',''),import.meta.url));}
});

test('every primary technique keeps the printed Qi and action costs without double-debiting PA or spell slots',()=>{
 for(const[id,[qi,actions]]of Object.entries(printedCosts)){const a=activity(id);assert(a,id);assert.equal(a.activation.value,actions,id);assert.equal(a.consumption.spellSlot,false);assert.deepEqual(a.consumption.targets.map(t=>[t.type,t.target,t.value]),[['attribute','energy.generated',String(qi)]],id);assert.equal(item(id).system.activation.value,actions);}
 for(const id of ['desvio-sutil','accurate-thrust','ataque-debilitador','monkey-sight','wok-throw'])assert.equal(activity(id).activation.type,'reaction',id);
 assert.equal(activity('palma-incapacitadora').activation.type,'action');
});

test('fixed damage and alternate attacks are fully paid choices with distinct native damage, not extra riders',()=>{
 const shock=activity('choque-trovejante');assert.equal(shock.type,'save');assert.equal(shock.damage.parts[0].custom.formula,'16');assert.deepEqual(shock.damage.parts[0].types,['thunder']);assert.equal(shock.damage.onSave,'half');
 const charge=activity('investida-do-dragao'),touch=activity('investida-do-dragao','touch');assert.equal(charge.type,'save');assert.equal(charge.damage.parts[0].number,4);assert.equal(charge.damage.parts[0].denomination,6);assert.equal(charge.target.template.size,'10');assert.equal(touch.range.units,'touch');assert.equal(touch.damage.parts[0].custom.formula,'24');assert.equal(touch.activation.value,3);assert.equal(touch.consumption.targets[0].value,'4');
 const heavy=activity('heavy-bash','piercing');assert.equal(heavy.damage.parts[0].number,4);assert.equal(heavy.damage.parts[0].denomination,8);assert.deepEqual(heavy.damage.parts[0].types,['piercing']);
 for(const id of ['first-wave','corte-de-papel'])assert.equal(activity(id).attack.critical.threshold,19);
});

test('attack riders use the separate native condition save while Wok Shake uses only its single printed damage save',()=>{
 const palm=activity('mao-do-perdao');assert.equal(palm.type,'attack');assert.deepEqual(palm.conditions.map(c=>[c.condition,c.save]),[['jj-estremecido','con']]);
 assert.deepEqual(activity('arremesso-pesado').conditions.map(c=>[c.condition,c.save]),[['jj-caido','str']]);
 const shake=activity('wok-shake');assert.equal(shake.type,'save');assert.deepEqual(shake.save.ability,['dex']);assert.equal(shake.damage.onSave,'half');assert.deepEqual(shake.conditions,[]);assert.match(shake.description.value,/mesma salvaguarda/i);
 assert.equal(activity('wok-bash').type,'save');assert.equal(activity('wok-bash').damage.parts.length,0);
});

test('auxiliary movement, protection of allies and conditional counters do not grant persistent ownership effects',()=>{
 const thrown=activity('wok-throw');assert.equal(thrown.type,'utility');assert.equal(thrown.roll.formula,'3d8');assert.equal(thrown.target.affects.type,'creature');assert.match(thrown.description.value,/aliad/i);assert.equal(thrown.reduction,undefined);
 for(const id of ['desvio-sutil','accurate-thrust','avanco-rapido','nuvens-a-deriva','monkey-sight']){const a=activity(id);assert.equal(a.type,'utility');assert(item(id).flags[scope].combatManualTechnique.manualResolution.length>0);}
 const transfer=activity('marca-do-cacador','transfer');assert.equal(transfer.activation.value,1);assert.equal(transfer.range.value,'21');assert.deepEqual(transfer.consumption.targets,[]);assert.equal(transfer.duration.concentration,false);
 assert.equal(activity('marca-do-cacador').duration.concentration,true);
});

test('the catalog preserves source descriptions and flags corrections without creating manual or talent assignments',()=>{
 const fan=item('corte-de-papel');assert.match(fan.system.description.value,/leque/i);assert.match(fan.system.description.value,/Cítara.*Leque|Citara.*Leque/i);assert.equal(fan.flags[scope].combatManualTechnique.weapon,'Leque');
 assert.match(item('rage-kick').system.description.value,/1,5 metros/);assert.match(item('rage-kick').system.description.value,/10 de dano extra/);
 const first=item('golpe-interno');first.system.activities={};first.flags[scope].combatManualTechnique.manualResolution.push('test mutation');assert(Object.keys(item('golpe-interno').system.activities).length>0);assert(!item('golpe-interno').flags[scope].combatManualTechnique.manualResolution.includes('test mutation'));
 assert.throws(()=>item('missing'),RangeError);
});
