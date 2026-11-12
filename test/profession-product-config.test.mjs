import assert from "node:assert/strict";
import {test} from "node:test";
import {professionPrice} from '../module/systems/profession-crafting-rules.mjs';
import {professionProductDocument} from "../module/systems/profession-products-content.mjs";
let config;
try {config=await import("../module/applications/item/profession-product-config.mjs");}
catch(error){if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;config={};}
const use=name=>{assert.equal(typeof config[name],"function",name+" must configure owned profession products");return config[name];};
const scope="Immortals-system";
function fixture(product="pilula-de-cura",configuration={}){
 const source=professionProductDocument(product,configuration);source._id="ownedProduct0001";source.folder=null;source.system.quantity=7;
 const actor={id:"actor1",uuid:"Actor.actor1",isOwner:true,limited:false,items:new Map(),commits:[],async performBulkUpdate(updates){this.commits.push(updates);return updates;}};
 const item={...source,id:source._id,isOwner:true,isEmbedded:true,actor,pack:null,toObject(){return structuredClone({_id:this._id,name:this.name,type:this.type,folder:this.folder,img:this.img,system:this.system,flags:this.flags,effects:this.effects});}};
 actor.items.set(item.id,item);return {item,actor};
}
function activity(item){return Object.values(item.system.activities)[0];}
const activityPatch=(patch,id)=>patch["system.activities."+id];

test("configuration recomputes native formulas and metadata without replacing inventory identity or state",()=>{
 const {item}=fixture();item.name="Lote da mestra Lin";item.folder="personalFolder01";item.system.quantity=7;item.system.uses.spent=1;item.system.uses.recovery=[{period:"day",type:"recoverAll"}];
 item.flags[scope].professionCraft={author:"Lin"};item.flags.other={note:"custom"};item.effects=[{_id:"personalEffect01",name:"Personal effect"}];
 const before=item.toObject(),p=use("prepareProfessionProductConfigurationUpdate")(item,{level:4,quality:"superior"});
 assert.equal(p._id,item.id);assert.equal(p["flags."+scope+".professionProduct.level"],4);assert.equal(p["flags."+scope+".professionProduct.quality"],"superior");
 const generated=activityPatch(p,activity(item)._id);assert.equal(generated.healing.custom.formula,"4d4 + @abilities.con.mod");assert.equal(generated.flags[scope].professionProductActivity.poison,2);
 for(const path of ["name","folder","type","effects","system.quantity","system.uses","flags.other","flags."+scope+".professionCraft"])assert.equal(Object.hasOwn(p,path),false,path);
 assert.deepEqual(item.toObject(),before);
});

test("user activities and effects survive while generated activity usage and unrelated flags are retained",()=>{
 const {item}=fixture(),managed=activity(item);managed.uses.spent=3;managed.uses.recovery=[{period:"lr",type:"recoverAll"}];managed.effects=[{_id:"customEffect0001"}];managed.flags.module={note:"Keep"};managed.flags[scope].customNote="Keep too";
 item.system.activities.customActivity01={_id:"customActivity01",name:"Personal use",type:"utility",flags:{module:{mine:true}}};
 item.system.activities.retiredManaged01={_id:"retiredManaged01",type:"utility",flags:{[scope]:{professionProductActivity:{productId:"pilula-de-cura",key:"retired"}}}};
 const p=use("prepareProfessionProductConfigurationUpdate")(item,{level:2,quality:"common"}),updated=activityPatch(p,managed._id);
 assert.equal(updated.uses.spent,3);assert.deepEqual(updated.uses.recovery,managed.uses.recovery);assert.deepEqual(updated.effects,managed.effects);assert.deepEqual(updated.flags.module,managed.flags.module);assert.equal(updated.flags[scope].customNote,"Keep too");
 assert.equal(p["system.activities.-=retiredManaged01"],null);assert.equal(Object.hasOwn(p,"system.activities.customActivity01"),false);
});

test("partial product flags are repaired using the existing catalog identity without accepting a new id",()=>{
 const {item}=fixture();item.flags[scope].professionProduct={id:"pilula-de-cura",personalNote:"Keep"};
 const p=use("prepareProfessionProductConfigurationUpdate")(item,{level:2,quality:"common"});
 assert.equal(p["flags."+scope+".professionProduct.id"],"pilula-de-cura");assert.equal(p["flags."+scope+".professionProduct.kind"],"pill");assert.equal(p["flags."+scope+".professionProduct.profession"],"alchemy");
 assert.equal(Object.hasOwn(p,"flags."+scope+".professionProduct.personalNote"),false);
 assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(item,{id:"pilula-do-sangue-divino",level:2,quality:"common"}),/identidade|produto/i);
 item.id="";item._id="";assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(item,{level:2,quality:"common"}));
});

test("level limits include fixed level recipes and canonical quality validation",()=>{
 const {item}=fixture("pilula-das-9-revolucoes-da-mente");
 assert.equal(use("prepareProfessionProductConfigurationUpdate")(item,{level:5,quality:"perfect"})["flags."+scope+".professionProduct.level"],5);
 for(const level of [4,6,0,11,true,NaN])assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(item,{level,quality:"common"}));
 for(const quality of ["comum","legendary",null,""])assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(item,{level:5,quality}));
 const matrix=fixture("matriz-de-defesa").item;assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(matrix,{level:2,quality:"superior"}));
 assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(fixture("forno-de-alquimia").item,{level:1}));
});

test("the two elemental pills require one of the existing thirteen concepts",()=>{
 for(const id of ["pilula-da-condensacao-elemental-de-x","pilula-da-afinidade-elemental"]){
  const {item}=fixture(id);assert.throws(()=>use("prepareProfessionProductConfigurationUpdate")(item,{level:2,quality:"common"}),/elemento/i);
  const p=config.prepareProfessionProductConfigurationUpdate(item,{level:2,quality:"common",element:"fogo"});
  assert.equal(p["flags."+scope+".professionProduct.element"],"Fogo");
  assert.equal(activityPatch(p,activity(item)._id).flags[scope].professionProductActivity.element,"Fogo");
  assert.throws(()=>config.prepareProfessionProductConfigurationUpdate(item,{level:2,quality:"common",element:"Fake concept"}));
 }
});

test("matrix level adjustment retains existing damage while recalculating authored maximum HP and CR",()=>{
 const {item}=fixture("matriz-de-defesa",{level:1});item.system.hp.value=250;item.system.hp.max=300;
 const p=use("prepareProfessionProductConfigurationUpdate")(item,{level:2});
 assert.equal(p["system.hp.max"],600);assert.equal(p["system.hp.value"],550);assert.equal(p["system.armor.value"],22);
 assert.equal(Object.hasOwn(p,"system.hp.dt"),false);
});

test("configuration refuses world sources, read-only owners, limited actors and empty stacks",()=>{
 const {item,actor}=fixture(),prepare=use("prepareProfessionProductConfigurationUpdate");
 for(const mutate of [()=>item.isOwner=false,()=>actor.isOwner=false,()=>actor.limited=true,()=>item.pack="Immortals-system.equipamentos",()=>item.system.quantity=0]){
  item.isOwner=true;actor.isOwner=true;actor.limited=false;item.pack=null;item.system.quantity=7;mutate();assert.throws(()=>prepare(item,{level:2,quality:"common"}));
 }
 const unattached=fixture().item;unattached.actor=null;assert.throws(()=>prepare(unattached,{level:2,quality:"common"}));
});

test("applying a configuration performs one native item batch and never writes the public source",async()=>{
 const {item,actor}=fixture(),before=item.toObject();
 const p=await use("configureProfessionProduct")(item,{level:3,quality:"perfect"});
 assert.equal(actor.commits.length,1);assert.equal(actor.commits[0].item.length,1);assert.equal(actor.commits[0].item[0]._id,item.id);
 assert.equal(actor.commits[0].item[0]["flags."+scope+".professionProduct.level"],3);assert.equal(p._id,item.id);assert.deepEqual(item.toObject(),before);
});

test("dialog cancellation and late ownership loss cannot configure inventory",async()=>{
 const {item,actor}=fixture(),run=use("configureProfessionProduct");
 assert.equal(await run(item,undefined,{requestConfiguration:async()=>null}),null);assert.equal(actor.commits.length,0);
 await assert.rejects(run(item,undefined,{requestConfiguration:async()=>{actor.isOwner=false;return{level:2,quality:"common"};}}));assert.equal(actor.commits.length,0);
});

test("a deleted inventory product is never resurrected after its dialog",async()=>{
 const {item,actor}=fixture();await assert.rejects(use("configureProfessionProduct")(item,undefined,{requestConfiguration:async()=>{actor.items.delete(item.id);return{level:2,quality:"common"};}}),/existe|removido/i);assert.equal(actor.commits.length,0);
});

test("changed stock and changed product configuration require a fresh dialog",async()=>{
 for(const change of [item=>item.system.quantity--,item=>item.flags[scope].professionProduct.quality="perfect",item=>item.system.uses.spent++]){
  const {item,actor}=fixture();await assert.rejects(use("configureProfessionProduct")(item,undefined,{requestConfiguration:async()=>{change(item);return{level:2,quality:"common"};}}),/mud|reabra|alter/i);assert.equal(actor.commits.length,0);
 }
});

test("read-only sheet changes while the dialog is open prevent saving",async()=>{
 const {item,actor}=fixture(),sheet={isEditable:true};await assert.rejects(use("configureProfessionProduct")(item,undefined,{sheet,requestConfiguration:async()=>{sheet.isEditable=false;return{level:2,quality:"common"};}}));assert.equal(actor.commits.length,0);
});

test("identical simultaneous configuration writes share the actor transaction queue",async()=>{
 const {item,actor}=fixture();let release;const gate=new Promise(resolve=>release=resolve);let started;const reached=new Promise(resolve=>started=resolve);
 actor.performBulkUpdate=async updates=>{actor.commits.push(updates);started();await gate;};
 const first=use("configureProfessionProduct")(item,{level:2,quality:"common"});await reached;
 const second=await config.configureProfessionProduct(item,{level:3,quality:"perfect"});assert.equal(second,false);release();await first;assert.equal(actor.commits.length,1);
});

test("native render registration is idempotent and ignores read-only and non-inventory sheets",()=>{
 const callbacks=[],Hooks={on(name,callback){callbacks.push({name,callback});}};
 use("registerProfessionProductConfiguration")(Hooks);config.registerProfessionProductConfiguration(Hooks);
 assert.equal(callbacks.length,1);assert.equal(callbacks[0].name,"renderItemSheet5e");
 assert.equal(callbacks[0].callback({isEditable:false,document:fixture().item}),false);
 assert.equal(callbacks[0].callback({isEditable:true,document:{isOwner:true,flags:{}}}),false);
});

test("configuration dialog exposes recipe limits, four pill qualities and thirteen concept choices",()=>{
 const {item}=fixture("pilula-da-afinidade-elemental");item.name='<img src=x onerror="bad">';
 const html=use("professionProductConfigurationDialogContent")(item);
 assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;img'));assert.match(html,/atividades geradas/i);
 const qualities=html.match(/<select name="product-quality">([\s\S]*?)<\/select>/)[1];assert.equal((qualities.match(/<option /g)||[]).length,4);
 const elements=html.match(/<select name="product-element"[^>]*>([\s\S]*?)<\/select>/)[1];assert.equal((elements.match(/<option /g)||[]).length,14);assert.ok(elements.includes('Fogo'));
 const fixed=config.professionProductConfigurationDialogContent(fixture("pilula-das-9-revolucoes-da-mente").item);
 const levels=fixed.match(/<select name="product-level">([\s\S]*?)<\/select>/)[1];assert.equal((levels.match(/<option /g)||[]).length,1);assert.ok(levels.includes('value="5"'));
 assert.ok(!/\p{Extended_Pictographic}/u.test(html));
});


test("reconfiguration removes obsolete blocking metadata from regenerated activities",()=>{
 const {item}=fixture(),old=activity(item);old.flags[scope].professionProductActivity.pendingCost="Obsolete custom block";
 const patch=use("prepareProfessionProductConfigurationUpdate")(item,{level:2,quality:"common"});
 assert.equal(patch["system.activities."+old._id+".flags."+scope+".professionProductActivity.-=pendingCost"],null);
});

test("a custom activity cannot be silently replaced through a generated id collision",()=>{
 const {item}=fixture();delete activity(item).flags[scope].professionProductActivity;
 assert.throws(()=>use("prepareProfessionProductConfigurationUpdate")(item,{level:2,quality:"common"}),/personalizada|identificador/i);
});


test("level changes update material quotes and canonical gold prices while preserving custom costs",()=>{
 const first=fixture().item;first.flags[scope].professionProductPricing=professionPrice(1,{creationPercent:60,salePercent:15});first.system.price={value:45,denomination:'gp'};const patch=use('prepareProfessionProductConfigurationUpdate')(first,{level:2,quality:'common'});assert(patch['flags.'+scope+'.professionProductPricing']);assert.equal(patch['flags.'+scope+'.professionProductPricing'].creation.amount,1350);assert.equal(patch['flags.'+scope+'.professionProductPricing'].sale.amount,202.5);assert.deepEqual(patch['system.price'],{value:202.5,denomination:'gp'});
 const zero=fixture().item;zero.system.price={value:0,denomination:'gp'};assert.deepEqual(use('prepareProfessionProductConfigurationUpdate')(zero,{level:2,quality:'common'})['system.price'],{value:202.5,denomination:'gp'});
 const custom=fixture().item;custom.system.price={value:999,denomination:'gp'};const customPatch=use('prepareProfessionProductConfigurationUpdate')(custom,{level:2,quality:'common'});assert.equal(customPatch['system.price'],undefined);assert.equal(customPatch['flags.'+scope+'.professionProductPricing'].sale.amount,202.5);
 const yen=fixture().item;yen.system.price={value:45,denomination:'yen'};assert.equal(use('prepareProfessionProductConfigurationUpdate')(yen,{level:2,quality:'common'})['system.price'],undefined);
});

test("changing to crystal pricing replaces only an old canonical gold quote with its explicit crystal denomination",()=>{
 const item=fixture('pilula-de-cura',{level:3}).item;item.flags[scope].professionProductPricing=professionPrice(3,{creationPercent:60,salePercent:15});item.system.price={value:900,denomination:'gp'};const patch=use('prepareProfessionProductConfigurationUpdate')(item,{level:4,quality:'common'});assert.deepEqual(patch['system.price'],{value:13.5,denomination:'essence-human'});assert.deepEqual(patch['flags.'+scope+'.professionProductPricing'].sale,{amount:13.5,currency:'spiritualCrystals',rank:'human'});
 item.system.price={value:777,denomination:'gp'};assert.equal(use('prepareProfessionProductConfigurationUpdate')(item,{level:4,quality:'common'})['system.price'],undefined);
});


test("a corrupt old level can be repaired without blocking a zero-price product",()=>{
 const item=fixture().item;item.flags[scope].professionProduct.level=999;item.system.price={value:0,denomination:'gp'};const patch=use('prepareProfessionProductConfigurationUpdate')(item,{level:2,quality:'common'});assert.equal(patch['flags.'+scope+'.professionProduct.level'],2);assert.deepEqual(patch['system.price'],{value:202.5,denomination:'gp'});
});
