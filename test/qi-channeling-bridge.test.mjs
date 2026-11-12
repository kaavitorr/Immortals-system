import assert from 'node:assert/strict';
import {test} from 'node:test';
globalThis.game={user:{id:'gm',isGM:true},settings:{get:()=> '2.0'},users:{}};
const {channelingTechniqueGrants,syncChannelingTechniques}=await import('../module/systems/legacy2-channeling-techniques.mjs');
const {qiTalentDocument}=await import('../module/systems/qi-talents-content.mjs');
const scope='Immortals-system';
const oldFeat=name=>({type:'feat',name,system:{}});
const qiFeat=id=>({...qiTalentDocument(id),id:'qi-'+id});
const amplify=()=>qiFeat('canalizacao-amplificadora'),combat=()=>qiFeat('canalizacao-de-combate');
const legacyItems=()=>channelingTechniqueGrants([oldFeat('Canalização Amplificadora'),oldFeat('Canalização de Combate')],7).map((item,i)=>({...item,id:'old-'+i}));
const activity=(item,key)=>Object.values(item.system.activities).find(a=>a.flags?.[scope]?.qiTalentActivity?.key===key);
const remove=(item,key)=>{const a=activity(item,key);delete item.system.activities[a._id];};
function makeActor(items){return {type:'character',isOwner:true,items,system:{details:{level:7},legacy2:{}},writes:[],
 async createEmbeddedDocuments(kind,data){this.writes.push({kind:'create',data:structuredClone(data)});this.items.push(...data.map((item,i)=>({...item,id:'created-'+i})));},
 async deleteEmbeddedDocuments(kind,ids){this.writes.push({kind:'delete',ids:[...ids]});this.items=this.items.filter(item=>!ids.includes(item.id));},
 async updateEmbeddedDocuments(kind,updates){this.writes.push({kind:'update',updates});for(const update of updates){const item=this.items.find(i=>i.id===update._id);for(const[path,value]of Object.entries(update)){if(path==='_id')continue;const keys=path.split('.'),last=keys.pop();let object=item;for(const key of keys)object=object[key]??={};object[last]=value;}}}
};}

test('new Qi feats use embedded channeling activities and never generate duplicate legacy spells',()=>{
 assert.deepEqual(channelingTechniqueGrants([amplify(),combat()],7),[]);
});

test('stable Qi source and activity metadata still prevent duplicate spells after names are edited',()=>{
 const a=amplify(),c=combat();a.name='Minha amplificação';c.name='Meu combate';for(const item of [a,c])for(const act of Object.values(item.system.activities))act.name='Nome editado';
 assert.deepEqual(channelingTechniqueGrants([a,c],7),[]);remove(c,'solid-defense');assert.deepEqual(channelingTechniqueGrants([a,c],7).map(i=>i.name),['Defesa Sólida']);
});

test('missing or invalid internal equivalents retain only the necessary legacy fallback',()=>{
 const c=combat();remove(c,'burst');assert.deepEqual(channelingTechniqueGrants([amplify(),c],7).map(i=>i.name),['Explosão de Energia']);
 const invalid=combat();activity(invalid,'solid-defense').flags[scope].qiTalentActivity.talentId='wrong-source';
 assert.deepEqual(channelingTechniqueGrants([amplify(),invalid],7).map(i=>i.name),['Defesa Sólida']);
});

test('legacy feats still receive their original formulas without requiring new Qi metadata',()=>{
 const grants=channelingTechniqueGrants([oldFeat('Canalização Amplificadora'),oldFeat('Canalização de Combate')],7);
 assert.equal(grants.length,3);const utility=Object.values(grants[0].system.activities)[0];assert.equal(utility.jjScale.formula,'2');
 assert.match(grants[0].system.description.value,/4 metros/);assert.equal(Object.values(grants[1].system.activities)[0].damage.parts[0].number,4);
});

test('sync migrates only verified legacy grants replaced by internal activities and is idempotent',async()=>{
 const a=makeActor([amplify(),combat(),...legacyItems()]);await syncChannelingTechniques(a);
 assert.deepEqual(a.items.map(i=>i.type),['feat','feat']);assert.deepEqual(a.writes,[{kind:'delete',ids:['old-0','old-1','old-2']}]);
 await syncChannelingTechniques(a);assert.equal(a.writes.length,1);
});

test('a partial internal migration keeps the corresponding unmatched legacy activity',async()=>{
 const c=combat();remove(c,'burst');const old=legacyItems().filter(i=>i.flags[scope].channelingGrant.source==='canalizacao-de-combate');
 const a=makeActor([c,...old]);await syncChannelingTechniques(a);
 assert(a.items.some(i=>i.id==='old-1'));assert(!a.items.some(i=>i.id==='old-2'));assert.deepEqual(a.writes,[{kind:'delete',ids:['old-2']}]);
});

test('manual spells, copied grants and unrecognized provenance remain untouched',async()=>{
 const canonical=legacyItems();const manual=structuredClone(canonical[0]);manual.id='manual';delete manual.flags[scope].channelingGrant;
 const copy=structuredClone(canonical[1]);copy.id='copy';copy._stats={duplicateSource:'Actor.other.Item.previous'};
 const future=structuredClone(canonical[2]);future.id='future';future.flags[scope].channelingGrant.version=2;
 const unknown=structuredClone(canonical[2]);unknown.id='unknown';unknown.flags[scope].channelingGrant.source='custom-source';
 const a=makeActor([amplify(),combat(),manual,copy,future,unknown]),before=structuredClone(a.items);await syncChannelingTechniques(a);
 assert.deepEqual(a.items,before);assert.deepEqual(a.writes,[]);
});

test('customized old grant formulas, costs, extra activities and effects are preserved',async()=>{
 const [move,attack,defense]=legacyItems();move.system.description.value+='Manual note';attack.system.activities.jj2channelact001.damage.parts[0].number=9;
 defense.system.activities.jj2channelact001.consumption.targets[0].value='3';
 const extra=structuredClone(legacyItems()[1]);extra.id='extra';extra.system.activities.custom={_id:'custom',type:'utility'};
 const effect=structuredClone(legacyItems()[1]);effect.id='effect';effect.effects=[{name:'Custom effect'}];
 const bonus=structuredClone(legacyItems()[1]);bonus.id='bonus';bonus.system.activities.jj2channelact001.damage.parts[0].bonus='3';
 const a=makeActor([amplify(),combat(),move,attack,defense,extra,effect,bonus]),before=structuredClone(a.items);await syncChannelingTechniques(a);
 assert.deepEqual(a.items,before);assert.deepEqual(a.writes,[]);
});

test('new Qi metadata alone without its embedded usable activity does not delete old spells',async()=>{
 const aFeat=amplify();aFeat.system.activities={};const a=makeActor([aFeat,legacyItems()[0]]);await syncChannelingTechniques(a);
 assert.equal(a.items.length,2);assert.deepEqual(a.writes,[]);
});

test('removing legacy sources still cleans only safely managed grants, preserving unmarked techniques',async()=>{
 const managed=legacyItems(),manual={...structuredClone(managed[0]),id:'manual',flags:{}};const a=makeActor([...managed,manual]);
 await syncChannelingTechniques(a);assert.deepEqual(a.items.map(i=>i.id),['manual']);
});

test('an empty internal attack is not a usable replacement for the legacy spell',()=>{
 const c=combat();activity(c,'burst').damage.parts=[];assert.deepEqual(channelingTechniqueGrants([c],7).map(i=>i.name),['Explosão de Energia']);
});

test('unchanged legacy grants keep their level caps while customized spells retain their own formulas',async()=>{
 const old=legacyItems(),custom=structuredClone(old[1]);custom.id='custom';custom.system.activities.jj2channelact001.damage.parts[0].number=9;
 const a=makeActor([oldFeat('Canalização Amplificadora'),oldFeat('Canalização de Combate'),...old,custom]);a.system.details.level=10;
 await syncChannelingTechniques(a);assert.equal(old[1].system.activities.jj2channelact001.jjScale.maxPA,10);
 assert.equal(old[2].system.activities.jj2channelact001.jjScale.maxPA,10);assert.equal(custom.system.activities.jj2channelact001.jjScale.maxPA,7);
 assert.equal(custom.system.activities.jj2channelact001.damage.parts[0].number,9);assert.equal(old[0].system.activities.jj2channelact001.jjScale.formula,'2');
});

test('serialized native defaults do not prevent safe migration of an unchanged generated spell',async()=>{
 const old=legacyItems()[1],act=old.system.activities.jj2channelact001;act.attack.critical={threshold:null};act.attack.bonus='';act.damage.critical={bonus:''};
 act.damage.parts[0].bonus='';act.damage.parts[0].custom={enabled:false,formula:''};act.damage.parts[0].scaling={mode:'',number:0,formula:''};act.effects=[];
 const a=makeActor([combat(),old]);await syncChannelingTechniques(a);assert.deepEqual(a.items.map(i=>i.type),['feat']);
});
