import {test} from 'node:test';import assert from 'node:assert/strict';
import {soulLevel,soulBenefits,soulBarrierState,soulBarrierUpdate,soulWoundsState,soulWoundsUpdate,soulRegenerationUpdate,soulRestUpdates,soulSaveBonus,soulAvatarUpdate,addSoulSpiritDamage} from '../module/systems/soul-path.mjs';
const actor=(level=0)=>({type:'character',uuid:'Actor.lin',flags:{},system:{cultivation:{rank:3,soulCultivation:level},legacy2:{wounds:{value:25,soul:12},actions:{value:6,max:6}},attributes:{hp:{value:20,max:60}},energy:{total:70,max:100}}});
const combat=a=>({id:'fight',started:true,round:1,turn:0,combatant:{id:'lin',actor:a}});
test('Alma concede PV, escolhas e benefícios nos dez níveis, sem os bônus antigos',()=>{
 assert.equal(soulBenefits(actor(0)).extraHitPoints,0);assert.equal(soulBenefits(actor(1)).extraHitPoints,1);
 assert.equal(soulBenefits(actor(3)).attributeChoices,5);assert.equal(soulBenefits(actor(9)).attributeChoices,13);
 assert.equal(soulBenefits(actor(8)).absorptionMultiplier,3);assert.equal(soulBenefits(actor(7)).absorptionMultiplier,1);
 assert.equal(soulBenefits(actor(8)).professionReduction,5);assert.equal(soulBenefits(actor(7)).professionReduction,0);
 assert.equal(soulBenefits(actor(1)).qiBaseBonus,2);assert.equal(soulBenefits(actor(10)).qiBaseBonus,2);
 assert.equal(soulBenefits(actor(7)).battleIntegrity,350);
 for(const [level,damage]of [[1,0],[2,3],[3,3],[4,6],[9,12],[10,15]])assert.equal(soulBenefits(actor(level)).spiritDamage,damage);
});
test('PV temporários da Alma têm saldo separado e crescem dez por revolução',()=>{
 const a=actor(3);assert.equal(soulBarrierState(a).max,30);assert.equal(soulBarrierState(a).value,30);
 a.system.attributes.hp.temp=17;Object.assign(a.flags,{'Immortals-system':{soulBarrierSpent:12}});
 assert.equal(soulBarrierState(a).value,18);a.system.cultivation.soulCultivation=4;assert.equal(soulBarrierState(a).value,28);
 assert.deepEqual(soulBarrierUpdate(a,5),{'flags.Immortals-system.soulBarrierSpent':35});assert.equal(a.system.attributes.hp.temp,17);
 a.system.cultivation.soulCultivation=10;assert.equal(soulBarrierState(a).max,100);assert.throws(()=>soulBarrierUpdate(a,101),/máximo/);
});
test('Feridas da Alma são uma parcela das Feridas totais e não duplicam dano',()=>{
 const a=actor(9);assert.equal(soulWoundsState(a).value,12);assert.deepEqual(soulWoundsUpdate(a,7),{'system.legacy2.wounds.soul':7});
 assert.equal(a.system.legacy2.wounds.value,25);assert.throws(()=>soulWoundsUpdate(a,26),/totais/);
 a.system.legacy2.wounds.value=5;assert.equal(soulWoundsState(a).value,5);
});
test('Oitava Revolução recupera dez Feridas da Alma, uma vez por turno e sem curar Feridas comuns',()=>{
 const a=actor(9),c=combat(a),result=soulRegenerationUpdate(a,c);assert.equal(result.recovered,10);assert.equal(result.updates['system.legacy2.wounds.value'],15);assert.equal(result.updates['system.legacy2.wounds.soul'],2);assert.equal(result.updates['system.attributes.hp.value'],undefined);
 a.flags['Immortals-system']={soulRegenerationTurn:result.updates['flags.Immortals-system.soulRegenerationTurn']};assert.equal(soulRegenerationUpdate(a,c),null);
 a.flags={};a.system.legacy2.wounds.soul=0;assert.equal(soulRegenerationUpdate(a,c).recovered,0);
 assert.equal(soulRegenerationUpdate(actor(8),combat(actor(8))),null);
});
test('descanso longo restaura somente a reserva espiritual e guarda PV e Qi sem duplicar o pool',()=>{
 const a=actor(10),updates=soulRestUpdates(a,'long',{'system.legacy2.wounds.value':5,'system.attributes.hp.value':58,'system.energy.total':100});
 assert.equal(updates['flags.Immortals-system.soulBarrierSpent'],0);assert.equal(updates['system.legacy2.wounds.soul'],5);
 assert.equal(updates['flags.Immortals-system.soulLastRest'].hp,58);assert.equal(updates['flags.Immortals-system.soulLastRest'].qi,100);assert.equal(updates['system.attributes.hp.temp'],undefined);
 const short=soulRestUpdates(a,'short',{});assert.equal(short['flags.Immortals-system.soulLastRest'],undefined);assert.equal(short['flags.Immortals-system.soulBarrierSpent'],undefined);
});
test('defesa mental concede apenas um ponto em Fortitude ou Vontade quando esse contexto é marcado',()=>{
 const a=actor(4);assert.equal(soulSaveBonus(a,'fortitude',{mindSoul:true}),1);assert.equal(soulSaveBonus(a,'vontade',{mindSoul:true}),1);
 assert.equal(soulSaveBonus(a,'reflexo',{mindSoul:true}),0);assert.equal(soulSaveBonus(a,'fortitude'),0);assert.equal(soulSaveBonus(actor(3),'vontade',{mindSoul:true}),0);
});
test('manifestar avatar custa uma ação; recolher não reembolsa a ação e não cria um segundo Qi',()=>{
 const a=actor(1),result=soulAvatarUpdate(a,true);assert.equal(result['system.legacy2.actions.value'],5);assert.equal(result['flags.Immortals-system.soulAvatar'].active,true);
 a.flags['Immortals-system']={soulAvatar:{active:true}};assert.throws(()=>soulAvatarUpdate(a,true),/manifestado/);assert.equal(soulAvatarUpdate(a,false)['system.legacy2.actions.value'],undefined);
 a.flags={};a.system.legacy2.actions.max=0;assert.throws(()=>soulAvatarUpdate(a,true),/Ação/);assert.throws(()=>soulAvatarUpdate(actor(0),true),/Avatar/);
});
test('PdNs desconhecidos não são presumidos sem cultivo; Espírito de Batalha é apenas para ataques e alvos inferiores',()=>{
 const unknown={type:'npc',system:{}};assert.equal(soulLevel(unknown),null);
 const source=actor(4),target=actor(1);target.uuid='Actor.target';const parts=[{type:'fire',value:10}];
 assert.equal(addSoulSpiritDamage(target,parts,{sourceActor:source,isAttack:true}),6);assert.equal(parts[1].type,'psychic');assert.equal(parts[1].value,6);
 assert.equal(addSoulSpiritDamage(target,parts,{sourceActor:source,isAttack:true}),0);
 assert.equal(addSoulSpiritDamage(unknown,[{value:10}],{sourceActor:source,isAttack:true}),0);
 assert.equal(addSoulSpiritDamage(target,[{value:10}],{sourceActor:source,isAttack:false}),0);
 assert.equal(addSoulSpiritDamage(target,[{type:'healing',value:10}],{sourceActor:source,isAttack:true}),0);
});

test('canalização exige avatar para Psíquico e Quarta Revolução para Alma, preservando cura',async()=>{
 const {soulChannel,soulChannelUpdate}=await import('../module/systems/soul-path.mjs');const a=actor(1);a.flags['Immortals-system']={soulAvatar:{active:true}};
 Object.assign(a.flags['Immortals-system'],{soulChannel:'psychic'});assert.equal(soulChannel(a,{itemType:'spell'}),'psychic');assert.equal(soulChannel(a,{itemType:'weapon'}),'');assert.equal(soulChannel(a,{itemType:'spell',area:true}),'');
 assert.throws(()=>soulChannelUpdate(a,'soul'));a.system.cultivation.soulCultivation=5;Object.assign(a.flags['Immortals-system'],{soulChannel:'soul'});assert.equal(soulChannel(a,{itemType:'weapon'}),'soul');assert.equal(soulChannel(a,{healing:true}),'');
});
test('perda de máximo pelo Avatar restaura apenas sua própria parcela ao descansar',async()=>{
 const {avatarMaxLossUpdates,restoreAvatarMaximum}=await import('../module/systems/soul-path.mjs');const a=actor(0);a.system.attributes.hp.tempmax=-4;
 const updates=avatarMaxLossUpdates(a,7);assert.equal(updates['system.attributes.hp.tempmax'],-11);a.flags['Immortals-system']={soulAvatarHpLoss:7};a.system.attributes.hp.tempmax=-11;
 const rest={};assert.equal(restoreAvatarMaximum(a,'long',rest),-4);assert.equal(rest['system.attributes.hp.tempmax'],-4);assert.equal(restoreAvatarMaximum(a,'short',{}),-11);assert.deepEqual(avatarMaxLossUpdates(actor(1),7),{});
});
