import assert from 'node:assert/strict';
import {test} from 'node:test';
import {ELEMENT_ABILITIES} from '../module/systems/elemental-abilities-data.mjs';
let content={};
try { content=await import('../module/systems/elemental-content.mjs'); }
catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND') throw error; }
const feat=(element,ability,tier=1,options={})=>{assert.equal(typeof content.elementalFeatureDocument,'function');return content.elementalFeatureDocument(element,ability,tier,options);};
const activities=item=>Object.values(item.system.activities);
const find=(item,key)=>activities(item).find(a=>a.flags['Immortals-system'].elementalActivity.key===key);
const qi=activity=>activity.consumption.targets.filter(t=>t.type==='attribute'&&t.target.startsWith('energy.'));

test('compendium contains 52 native feats under stable elemental folders',()=>{
 assert.equal(typeof content.elementalCompendiumDocuments,'function');
 const documents=content.elementalCompendiumDocuments(),items=documents.filter(d=>d.type==='feat'),folders=documents.filter(d=>d.type==='Item');
 assert.equal(items.length,52);assert.equal(folders.length,14);assert.equal(new Set(documents.map(d=>d._id)).size,documents.length);
 for(const item of items){assert.match(item._id,/^[a-zA-Z0-9]{16}$/);assert(folders.some(f=>f._id===item.folder));assert.equal(item.flags['Immortals-system'].elementalManaged,true);assert.match(item.img,/conceitos-pintados/);}
 for(const [element,abilities] of Object.entries(ELEMENT_ABILITIES)) for(const ability of abilities){const item=feat(element,ability.id);assert.equal(item.flags['Immortals-system'].elementalAbility.tier,1);assert.equal(item._id,feat(element,ability.id,ability.level10?1:3)._id);if(!ability.level10){assert.match(item.system.description.value,/Dominado/);assert.match(item.system.description.value,/Perfeição/);}assert.doesNotMatch(item.system.description.value,/[⬢★]/);}
});

test('native scalable healing pays each selected Qi once, with correct caps and touch range',()=>{
 for(const [tier,max] of [[1,5],[2,15],[3,30]]){const item=feat('luz','toqueCurativo',tier,{qiPool:'generated'}),heal=find(item,'heal');assert.equal(heal.type,'heal');assert.equal(heal.activation.value,1);assert.equal(heal.range.units,'touch');assert.equal(heal.healing.number,1);assert.equal(heal.healing.denomination,4);assert.equal(heal.healing.scaling.number,1);assert.equal(heal.consumption.scaling.max,String(max));assert.deepEqual(qi(heal).map(t=>[t.target,t.value,t.scaling.formula]),[['energy.generated','1','1']]);assert.equal(qi(find(item,'stabilize'))[0].value,'2');}
 const initial=find(feat('madeira','qiVibrante'),'heal');assert.equal(initial.healing.custom.formula,'5');assert.equal(qi(initial)[0].value,'2');
 const perfect=find(feat('madeira','qiVibrante',3),'heal');assert.equal(perfect.consumption.scaling.max,'15');assert.match(perfect.healing.custom.formula,/scaling/);
});

test('wood shield uses book dice, explicit reaction PA, and exact per-Qi tier choices',()=>{
 const initial=find(feat('madeira','vitalidadeCrescente'),'barrier');assert.equal(initial.type,'utility');assert.equal(initial.roll.formula,'5d8');assert.equal(initial.flags['Immortals-system'].elementalActivity.rule,'finiteBarrier');assert.equal(initial.activation.type,'reaction');assert.equal(initial.activation.value,1);assert.equal(qi(initial)[0].value,'3');assert.equal(initial.duration.expiry,'turnStart');
 for(const [tier,max] of [[2,6],[3,15]]){const shield=find(feat('madeira','vitalidadeCrescente',tier),'barrier');assert.equal(shield.roll.formula,'8 * @scaling');assert.equal(shield.consumption.scaling.max,String(max));assert.equal(qi(shield)[0].value,'1');}
});

test('armor and multi-step attacks carry their book rules and do not duplicate spending',()=>{
 const skin=find(feat('terra','pelePedra',3),'armor');assert.equal(skin.type,'utility');assert.equal(skin.roll.formula,'4 * @scaling');assert.equal(skin.consumption.scaling.max,'20');assert.deepEqual(skin.uses.recovery,[{period:'lr',type:'recoverAll'}]);assert.equal(skin.uses.max,'1');assert.equal(skin.consumption.targets.filter(t=>t.type==='activityUses').length,1);
 const prison=feat('terra','prisaoTerra',1,{qiPool:'generated'}),attack=find(prison,'attack'),save=find(prison,'save');assert.equal(attack.type,'attack');assert.equal(attack.activation.value,2);assert.deepEqual(qi(attack).map(t=>[t.target,t.value]),[['energy.total','100']]);assert.equal(attack.range.value,'30');assert.equal(attack.range.units,'m');assert.equal(save.type,'save');assert.deepEqual(save.save.ability,['dex']);assert.equal(qi(save).length,0);
 const absorb=feat('escuridao','absorcao',3),damage=find(absorb,'attack'),heal=find(absorb,'heal');assert.equal(damage.damage.parts[0].types[0],'void');assert.equal(damage.consumption.scaling.max,'15');assert.equal(qi(heal).length,0);assert.equal(heal.healing.denomination,4);
});

test('native teleport distances and counters follow the current book',()=>{
 const initial=find(feat('espaco','spaceStep'),'teleport');assert.equal(initial.type,'teleport');assert.equal(initial.teleport.value,'15');assert.equal(initial.teleport.units,'m');assert.equal(initial.uses.max,'1');assert.equal(initial.uses.recovery[0].period,'turnStart');
 assert.equal(find(feat('espaco','spaceStep',2),'teleport').teleport.value,'40');
 const fire=find(feat('fogo','avatarChamas'),'teleport');assert.equal(fire.teleport.value,'30');assert.equal(fire.uses.max,'3');assert.equal(fire.uses.recovery[0].period,'initiative');assert.equal(qi(fire).length,0);
 const rip=find(feat('espaco','spaceRip',3),'portal');assert.equal(rip.range.value,'500000');assert.equal(rip.activation.value,0);assert.match(rip.activation.condition,/1d4/);
});

test('light orbs use one paid creation and use-only follow-up activities',()=>{
 const item=feat('luz','lightOrbs',3);assert.equal(item.system.uses.max,'10');assert.equal(item.system.uses.spent,10);
 const creation=find(item,'create');assert.equal(creation.activation.value,1);assert.equal(qi(creation)[0].value,'15');assert.equal(creation.consumption.targets.find(t=>t.type==='itemUses').value,'-@item.uses.spent');
 for(const key of ['blast','grid','grid-contact','flash'])assert.equal(qi(find(item,key)).length,0);
 assert.equal(find(item,'grid-contact').damage.parts[0].custom.formula,'10 * @scaling');
 assert.deepEqual(find(item,'flash').save.ability,['con']);assert.equal(find(item,'flash').target.template.size,'18');assert.equal(find(item,'flash').target.template.units,'m');
});

test('passive conditional rules do not create unconditional effects or invent irreversible automation',()=>{
 for(const [element,ability] of [['madeira','qiDenso'],['fogo','qiFlamejante'],['gelo','frioCongelante'],['metal','estracalhar']])assert.deepEqual(feat(element,ability,3).effects,[]);
 for(const [element,ability] of [['madeira','coracaoMadeira'],['espaco','mysticalRealm'],['ilusao','illusionDouble']]){const item=feat(element,ability);assert(activities(item).every(a=>a.type==='utility'));assert(item.flags['Immortals-system'].elementalAutomation.manual.length>0);assert(activities(item).every(a=>a.consumption.targets.every(t=>!t.target.startsWith('abilities.'))));}
 const chamas=feat('fogo','manipulacaoChamas',3);assert.deepEqual(chamas.flags['Immortals-system'].elementalAutomation.pending,[]);assert(activities(chamas).every(a=>a.activation.value!==15));assert.equal(find(chamas,'control').consumption.scaling.max,'15');
});

test('every activity uses explicit action costs, valid meter geometry, stable keys, and one Qi target',()=>{
 for(const [element,list] of Object.entries(ELEMENT_ABILITIES))for(const ability of list)for(let tier=1;tier<=(ability.level10?1:3);tier++){
 const item=feat(element,ability.id,tier);const keys=new Set();for(const activity of activities(item)){const meta=activity.flags['Immortals-system'].elementalActivity;assert(!keys.has(meta.key));keys.add(meta.key);assert.match(activity._id,/^[a-zA-Z0-9]{16}$/);assert(qi(activity).length<=1);assert(activity.activation.value>=0);assert.notEqual(activity.range.units,'ft');assert.equal(activity.target.template.units,'m');assert.equal(activity.consumption.spellSlot,false);const next=activities(feat(element,ability.id,ability.level10?1:Math.min(3,tier+1))).find(a=>a.flags['Immortals-system'].elementalActivity.key===meta.key);if(next)assert.equal(next._id,activity._id);}
 }
 assert.throws(()=>feat('inexistente','x'),/element|habilidade/i);assert.throws(()=>feat('luz','toqueCurativo',4),/tier/i);assert.throws(()=>feat('luz','toqueCurativo',1,{qiPool:'wrong'}),/Qi|pool|reserva/i);
});


test('condition activities use canonical 2.0 identities and configured concept level formulas',()=>{
 assert.equal(find(feat('luz','lightOrbs'),'flash').conditions[0].condition,'jj-cego');
 assert.equal(find(feat('escuridao','letargia',3),'save').flags['Immortals-system'].elementalActivity.condition,'jj-letargico');
 assert.equal(find(feat('agua','qiFluido',2),'whip').range.value,'6 + 1.5 * @conceitos.agua.level');
 assert.equal(find(feat('vento','controleVento',3),'clones').flags['Immortals-system'].elementalActivity.count,'@conceitos.vento.level');
 assert.equal(find(feat('escuridao','absorcao'),'attack').range.units,'spec');
 const clock=find(feat('tempo','slowQuickZone',2),'zone');assert.equal(clock.consumption.scaling.max,'6');assert.equal(qi(clock)[0].value,'30');assert.equal(qi(clock)[0].scaling.formula,'10');
 const perfect=find(feat('tempo','slowQuickZone',3),'zone');assert.equal(perfect.consumption.scaling.max,'19');assert.equal(qi(perfect)[0].value,'100');
});


test('Thunder Punishment remains an automatic passive rider with no duplicate damage buttons',()=>{
 for(const tier of [1,2,3]){const item=feat('relampago','punicaoTrovao',tier),rules=item.flags['Immortals-system'].elementalAutomation.rules;assert.deepEqual(activities(item),[]);const miss=rules.find(rule=>rule.type==='thunderPunishment'&&rule.trigger==='miss');assert.equal(miss.formula,tier===1?'floor(@elemental.primary / 2)':'@elemental.primary');assert.equal(rules.some(rule=>rule.type==='thunderPunishment'&&rule.trigger==='hit'&&rule.value===6),tier===3);assert.match(item.system.description.value,/6 de dano/);}
});


test('Letargia carries printed DC increases into the linked attack condition',()=>{
 for(const [tier,bonus] of [[1,0],[2,2],[3,3]]){
  const save=find(feat('escuridao','letargia',tier),'save');
  assert.equal(save.type,'utility');
  assert.equal(save.flags['Immortals-system'].elementalActivity.dcBonus,bonus);
 }
});


test('ordinary PQ uses refined Qi while Earth Prison and author-confirmed Rewind consume total Qi',()=>{
 for(const [element,list] of Object.entries(ELEMENT_ABILITIES))for(const ability of list){
  const item=feat(element,ability.id,ability.level10?1:3);
  for(const a of activities(item))for(const target of qi(a))assert.equal(target.target,['prisaoTerra','rewind'].includes(ability.id)?'energy.total':'energy.generated');
  for(const a of activities(item))if(a.constantCost?.enabled)assert.equal(a.constantCost.pool,'generated');
 }
 const chamas=feat('fogo','manipulacaoChamas',3);assert.equal(find(chamas,'attack').consumption.scaling.max,'15');assert.equal(qi(find(chamas,'attack'))[0].target,'energy.generated');
});


test('Qi Afiado keeps its explicit Fortitude save while Constitution effects stay Constitution',()=>{
 const metal=feat('metal','qiAfiado',3).flags['Immortals-system'].elementalAutomation.rules.find(rule=>rule.type==='criticalCondition');assert.equal(metal.save,'str');
 assert.equal(find(feat('escuridao','letargia'),'save').flags['Immortals-system'].elementalActivity.save,'con');
});


test('Letargia explains automatic linked Void conversion without a second Qi cost',()=>{const item=feat('escuridao','letargia',3);assert.match(item.system.description.value,/ataque preparado usa dano de Vazio/);assert.match(item.system.description.value,/sem outro custo de Qi/);});

test('Letargia arms a linked attack instead of granting an independent free condition save',()=>{const source=feat('escuridao','letargia',2),a=find(source,'save');assert.equal(a.type,'utility');assert.equal(a.flags['Immortals-system'].elementalActivity.dcBonus,2);assert.equal(a.conditions?.length??0,0);});
