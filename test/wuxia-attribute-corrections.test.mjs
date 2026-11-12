import assert from 'node:assert/strict';
import {test} from 'node:test';
import {combatManualTechniqueDocument} from '../module/systems/combat-manual-content.mjs';
import {professionProductDocument} from '../module/systems/profession-products-content.mjs';
import {alternativeSaveDefinition} from '../module/systems/legacy2-alternative-saves.mjs';
let api={};try{api=await import('../module/systems/wuxia-attribute-corrections.mjs');}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const S='Immortals-system';
const oldNote='A fonte exige Salvaguarda de Espírito, atributo que não existe na ficha atual. Confirmar qual salvaguarda deve substituí-la antes de automatizar o efeito.';
function source(){return{_id:'feature',type:'feat',name:'Nome personalizado',img:'custom.webp',flags:{[S]:{soulPath:true}},system:{description:{value:'Receba +1 em Espírito e Sabedoria. Espírito de Batalha continua igual.'},quantity:2,uses:{spent:1},activities:{}}};}
function apply(doc,patch){for(const[path,value]of Object.entries(patch)){if(path==='_id')continue;const keys=path.split('.'),key=keys.pop();let out=doc;for(const part of keys)out=out[part]??={};out[key]=structuredClone(value);}}
test('legacy attribute correction preserves spirit creatures and battle-spirit flavor while updating mechanical attribute names',()=>{
 assert.equal(typeof api.correctWuxiaAttributeText,'function');
 assert.equal(api.correctWuxiaAttributeText('Espírito de Batalha; espírito de batalha; Espírito Amaldiçoado; arma espiritual.'),'Espírito de Batalha; espírito de batalha; Espírito Amaldiçoado; arma espiritual.');
 assert.equal(api.correctWuxiaAttributeText('Seu mestre acredita em Espírito Guardião. A conexão entre Espírito e Matéria desperta um poder em Espírito Ancestral.'),'Seu mestre acredita em Espírito Guardião. A conexão entre Espírito e Matéria desperta um poder em Espírito Ancestral.');
 assert.equal(api.correctWuxiaAttributeText('Receba +1 em Espírito e Sabedoria.'),'Receba +1 em Intelecto e Sabedoria.');
 assert.equal(api.correctWuxiaAttributeText('Distribua entre Espírito, Sabedoria e Presença.'),'Distribua entre Intelecto, Sabedoria e Presença.');
 assert.equal(api.correctWuxiaAttributeText('Teste de Atributo de Percepção.'),'Teste de Atributo de Sabedoria.');
 assert.equal(api.correctWuxiaAttributeText('Teste de Atributo de Controle de Qi.'),'Teste de Atributo de Constituição.');
 assert.equal(api.correctWuxiaAttributeText('Testes de Espírito (Percepção) e Testes de Espírito (Controle de Qi).'),'Testes de Sabedoria (Percepção) e Testes de Constituição (Controle de Qi).');
});
test('Tiro de Advertência uses Intelecto and therefore Reflexo without charging a second technique use',()=>{
 const item=combatManualTechniqueDocument('tiro-de-advertencia'),save=Object.values(item.system.activities).find(a=>a.flags[S].combatManualActivity.key==='reaction-save');
 assert.deepEqual(save.save.ability,['int']);assert.equal(alternativeSaveDefinition(save.save.ability[0]).key,'reflexo');
 assert.equal(save.activation.value,0);assert.deepEqual(save.consumption.targets,[]);
});
test('an old official item is patched by fields without replacing personal stats, quantities or flavor',()=>{
 assert.equal(typeof api.prepareWuxiaAttributeCorrection,'function');const item=source(),before=structuredClone(item),patch=api.prepareWuxiaAttributeCorrection(item);
 assert.deepEqual(item,before);assert.equal(patch['system.description.value'],'Receba +1 em Intelecto e Sabedoria. Espírito de Batalha continua igual.');
 for(const path of ['name','img','system.quantity','system.uses','system.activities','effects'])assert.equal(patch[path],undefined);
 apply(item,patch);assert.equal(api.prepareWuxiaAttributeCorrection(item),null);
 const personal={...before,flags:{}};assert.equal(api.prepareWuxiaAttributeCorrection(personal),null);
});
test('personal narrative inside an official item survives both description and activity migrations',()=>{
 const item=source();item.system.description.value='Seu mestre acredita em Espírito Guardião. Receba +1 em Espírito e Sabedoria.';
 item.system.activities.personal={description:{value:'A conexão entre Espírito e Matéria desperta um poder em Espírito Ancestral.'}};
 const patch=api.prepareWuxiaAttributeCorrection(item);apply(item,patch);
 assert.equal(item.system.description.value,'Seu mestre acredita em Espírito Guardião. Receba +1 em Intelecto e Sabedoria.');
 assert.equal(item.system.activities.personal.description.value,'A conexão entre Espírito e Matéria desperta um poder em Espírito Ancestral.');
});
test('legacy Tiro save is corrected only in its official follow-up and manual save overrides are preserved',()=>{
 assert.equal(typeof api.prepareWuxiaAttributeCorrection,'function');const item=combatManualTechniqueDocument('tiro-de-advertencia');
 const entry=Object.entries(item.system.activities).find(([,a])=>a.flags[S].combatManualActivity.key==='reaction-save');entry[1].save.ability=['con'];
 const patch=api.prepareWuxiaAttributeCorrection(item);assert.deepEqual(patch['system.activities.'+entry[0]+'.save.ability'],['int']);
 entry[1].save.ability=['dex'];assert.equal(api.prepareWuxiaAttributeCorrection(item)?.['system.activities.'+entry[0]+'.save.ability'],undefined);
});
test('profession corrections remove only the resolved Spirit uncertainty and retain independent missing-DC notes',()=>{
 assert.equal(typeof api.prepareWuxiaAttributeCorrection,'function');const item=professionProductDocument('talisma-de-controle',{level:2}),activity=Object.entries(item.system.activities)[0];
 item.flags[S].professionProductAutomation.pending=[oldNote,'A CD ainda deve ser definida pelo narrador.'];
 activity[1].flags[S].professionProductActivity.manualSave='Espírito — confirme a salvaguarda atual com o narrador.';
 const patch=api.prepareWuxiaAttributeCorrection(item);
 assert.deepEqual(patch['flags.'+S+'.professionProductAutomation.pending'],['A CD ainda deve ser definida pelo narrador.']);
 assert.equal(patch['system.activities.'+activity[0]+'.flags.'+S+'.professionProductActivity.manualSave'],'Intelecto (Reflexo); CD definida pelo narrador.');
 assert.equal(patch['system.uses'],undefined);assert.equal(patch['system.activities.'+activity[0]+'.consumption'],undefined);
});
test('an existing author migration patch keeps its additions when terminology is corrected',()=>{
 const item=source(),previous={'system.description.value':'Receba +1 em Espírito e Sabedoria. Regra personalizada adicional.'};
 const patch=api.prepareWuxiaAttributeCorrection(item,previous);assert.equal(patch['system.description.value'],'Receba +1 em Intelecto e Sabedoria. Regra personalizada adicional.');
});
test('actor correction uses the owning active master, preserves item uses, and becomes a no-op on retry',async()=>{
 assert.equal(typeof api.migrateWuxiaAttributeItems,'function');const item=source(),gm={id:'gm',isGM:true},game={user:gm,users:{activeGM:gm}},batches=[];
 const actor={uuid:'Actor.hero',type:'character',isOwner:true,items:[item],performBulkUpdate:async batch=>{batches.push(batch);for(const patch of batch.item)apply(item,patch);}};
 assert.equal(await api.migrateWuxiaAttributeItems(actor,{game:{...game,user:{id:'other',isGM:true}}}),0);
 assert.equal(await api.migrateWuxiaAttributeItems(actor,{game}),1);assert.equal(await api.migrateWuxiaAttributeItems(actor,{game}),0);
 assert.equal(batches.length,1);assert.equal(item.system.uses.spent,1);assert.equal(item.img,'custom.webp');assert.equal(item.name,'Nome personalizado');
});
