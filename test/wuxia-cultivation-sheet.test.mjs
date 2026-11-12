import {resistanceCards} from "../module/systems/legacy2-resistances.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {prepareCultivationContext,cultivationActions,bindCultivationSheet} from "../module/applications/actor/jj/cultivation-sheet.mjs";
let version="2.0";
globalThis.game={settings:{get:(_s,k)=>k==="rulesetVersion"?version:k==="qiZone"?{level:"mediano"}:false}};
globalThis.CONFIG={JUJUTSU:{trainingPoints:{criacao:10}}};
test("cultivation context includes all three paths and manual editing in current sheet",()=>{const actor={itemTypes:{},getFlag:()=>undefined,system:{details:{level:1},energy:{total:20,max:40},cultivation:{rank:1,stage:1,essence:50,points:11},legacy2:{pontos:{gastos:0}}}};const c=prepareCultivationContext.call({actor,isEditable:true},{},{});assert.equal(c.cultivation.dailyEssenceCap,15);assert.equal(c.bodyPath.length,10);assert.equal(c.soulPath.length,10);assert.equal(c.cultivation.pt,11);assert.equal(c.manual.essencePerDay,"");});
test("spectators cannot run cultivation actions",async()=>{const sheet={isEditable:false,actor:{isOwner:false,update:()=>{throw Error("unexpected update");}}};await cultivationActions.cultivationAdvanceStage.call(sheet,{},{});});
test("native and 2.0 navigation both expose cultivation",()=>{const sheet=readFileSync(new URL("../module/applications/actor/character-sheet.mjs",import.meta.url),"utf8");const l2=readFileSync(new URL("../module/applications/actor/jj/legacy2-sheet.mjs",import.meta.url),"utf8");assert.match(sheet,/case "cultivation"/);assert.match(sheet,/tab: "cultivation"/);assert.match(l2,/["cultivation", "Cultivo"]/);});

test("soul level four creates resistance in the active damage model",async()=>{const warnings=[];globalThis.ui={notifications:{warn:m=>warnings.push(m)}};globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>{}};globalThis.Roll=class {async evaluate(){this.total=20;return this;}async toMessage(){}};globalThis.foundry={applications:{api:{DialogV2:{wait:async options=>options.buttons.some(b=>b.action==="confirm")?{pi:0}:null}}}};for(const v of ["2.0","1.0"]){version=v;const effects=[];const actor={uuid:"soul-"+v,isOwner:true,name:"Cultivador",effects,itemTypes:{},system:{details:{level:1},cultivation:{rank:1,stage:1,points:100,soulCultivation:3,soulPills:{4:20}},legacy2:{pontos:{gastos:0,extra:100}},curseResources:{trainingPoints:100}},update:async data=>{for(const [key,value] of Object.entries(data)){const parts=key.split(".");let o=actor;for(const p of parts.slice(0,-1))o=o[p]??={};o[parts.at(-1)]=value;}}};globalThis.ActiveEffect={create:async data=>{effects.push({...data,update:async()=>{},delete:async()=>{}});}};await cultivationActions.cultivationAdvancePath.call({isEditable:true,actor},{},{dataset:{path:"soul"}});const changes=effects.find(e=>e.flags["Immortals-system"].soulEffect==="soulRev3")?.changes??[];if(v==="2.0"){assert.equal(resistanceCards(actor).find(type=>type.key==="psychic").value,10);assert.equal(changes.length,0);}else assert(changes.some(c=>c.key==="system.traits.dm.amount.psychic"),JSON.stringify({v,changes,warnings}));}version="2.0";});

test("a pending attribute choice grants only one bonus for its path level",async()=>{let open=0,resolveChoice,resolveCreate;const effects=[];globalThis.foundry={applications:{api:{DialogV2:{wait:()=>{open++;return new Promise(r=>resolveChoice=r);}}}}};let creates=0;const actor={uuid:"attribute-race",isOwner:true,effects,system:{cultivation:{bodyCultivation:1}},async createEmbeddedDocuments(_type,docs){creates++;await new Promise(r=>resolveCreate=r);effects.push(...docs);}};const sheet={isEditable:true,actor},target={dataset:{path:"body",level:"1"}};const first=cultivationActions.cultivationChooseAttribute.call(sheet,{},target);const second=cultivationActions.cultivationChooseAttribute.call(sheet,{},target);await new Promise(r=>setImmediate(r));assert.equal(open,1);resolveChoice("str");await new Promise(r=>setImmediate(r));await cultivationActions.cultivationChooseAttribute.call(sheet,{},target);assert.equal(open,1);resolveCreate();await first;assert.equal(creates,1);assert.equal(effects.length,1);});


test("path presentation exposes the real next requirements and complete shared layouts without mutating actor data",()=>{
  for(const [body,soul] of [[0,0],[3,4],[10,10]]){
    const actor={itemTypes:{},getFlag:()=>undefined,effects:[],system:{details:{level:1},energy:{total:20,max:40},cultivation:{rank:2,stage:2,essence:50,bodyCultivation:body,soulCultivation:soul,bodyPills:{1:10},soulPills:{1:20}},legacy2:{pontos:{gastos:0}}}};
    const original=structuredClone(actor.system);
    const c=prepareCultivationContext.call({actor,isEditable:true},{},{});
    assert.equal(c.cultivationPaths.length,2);
    for(const [index,key,level]of [[0,'body',body],[1,'soul',soul]]){
      const path=c.cultivationPaths[index];
      assert.equal(path.key,key);assert.equal(path.level,level);
      assert.equal(path.nodes.length,10);assert.equal(path.pills.length,10);
      if(level===10)assert.equal(path.next,null);
      else {
        assert.equal(path.next.level,level+1);
        assert.equal(path.next.req.pt,(key==='body'?5:10)*(level+1));
        assert.equal(path.next.req.dias,(key==='body'?5:10)*level);
        assert.equal(path.next.req.pillLevel,level+1);
      }
    }
    assert.deepEqual(actor.system,original);
  }
});


test("cultivation navigation keeps the chosen path, accessible state and open sections after rerender",()=>{
  const element=dataset=>({dataset,attributes:{},listeners:{},disabled:false,open:false,
    classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=String(value)},
    addEventListener(key,fn){this.listeners[key]=fn;}});
  const tree=()=>{
    const buttons=['cultivo','corpo','alma'].map(subtab=>element({subtab}));
    const panels=['cultivo','corpo','alma'].map(subtabContent=>element({subtabContent}));
    const details=[element({cultSection:'manual'})],fields=[element({})];
    const tab={querySelector:()=>null,querySelectorAll:selector=>selector==='.cult-subtab-btn'?buttons:selector==='.cult-subtab'?panels:selector==='details[data-cult-section]'?details:selector==='input,select,textarea,button:not(.cult-subtab-btn)'?fields:[]};
    return {buttons,panels,details,fields,root:{querySelector:()=>tab}};
  };
  const first=tree(),sheet={isEditable:false,actor:{isOwner:false},_cultSubtab:'corpo',element:first.root};
  bindCultivationSheet(sheet);
  assert.equal(first.buttons[1].attributes['aria-pressed'],'true');
  assert.equal(first.panels[1].attributes['aria-hidden'],'false');
  assert.equal(first.panels[0].attributes['aria-hidden'],'true');
  assert.equal(first.fields[0].disabled,true);
  assert.equal(first.buttons[1].disabled,false);
  first.details[0].open=true;first.details[0].listeners.toggle();
  const second=tree();sheet.element=second.root;bindCultivationSheet(sheet);
  assert.equal(second.details[0].open,true);
  assert.equal(sheet._cultSubtab,'corpo');
});


test('cultivation manuals expose separate rank and quality selectors and recognize saved labels',()=>{
 const make=flags=>{const actor={itemTypes:{},effects:[],getFlag:(_s,k)=>flags[k],system:{details:{level:1},energy:{total:10,max:10},cultivation:{rank:1,stage:1,essence:0},legacy2:{pontos:{gastos:0}}}};return prepareCultivationContext.call({actor,isEditable:true},{},{}).manual;};
 const defaults=make({});assert.equal(defaults.rank,'humano');assert.equal(defaults.quality,'comum');
 assert.deepEqual(defaults.rankOptions.map(o=>o.label),['Humano','Terra','Céu','Sagrado','Divino','Supremo']);assert.deepEqual(defaults.qualityOptions.map(o=>o.label),['Inferior','Comum','Superior']);
 const existing=make({manualRarity:'Céu',manualClass:'SUPERIOR',manualEssencePerDay:0,mantraText:'Meu mantra'});assert.equal(existing.rank,'ceu');assert.equal(existing.rankLabel,'Céu');assert.equal(existing.quality,'superior');assert.equal(existing.essencePerDay,0);assert.equal(existing.mantra,'Meu mantra');assert.equal(existing.rankOptions.filter(o=>o.selected).length,1);
 const custom=make({manualRarity:'Ancestral'});assert.equal(custom.rank,'Ancestral');assert(custom.rankOptions.some(o=>o.selected&&o.label==='Ancestral'));
});

test('manual rank and quality selections save independent flags and read-only sheets disable selects',async()=>{
 const field=value=>({value,dataset:{},disabled:false,listeners:{},addEventListener(k,fn){this.listeners[k]=fn;}});
 const rank=field('terra'),quality=field('superior'),writes=[];
 const tab={querySelector:()=>null,querySelectorAll:selector=>selector==='[data-manual-rarity]'?[rank]:selector==='[data-manual-class]'?[quality]:selector==='input,select,textarea,button:not(.cult-subtab-btn)'?[rank,quality]:[]};
 const sheet={element:{querySelector:()=>tab},isEditable:true,actor:{isOwner:true,getFlag:()=>undefined,setFlag:async(...args)=>writes.push(args)}};bindCultivationSheet(sheet);
 assert.equal(typeof quality.listeners.change,'function');await rank.listeners.change();await quality.listeners.change();assert.deepEqual(writes,[['Immortals-system','manualRarity','terra'],['Immortals-system','manualClass','superior']]);
 quality.value='invalida';await quality.listeners.change();assert.equal(writes.length,2);
 sheet.isEditable=false;bindCultivationSheet(sheet);assert.equal(rank.disabled,true);assert.equal(quality.disabled,true);quality.value='inferior';await quality.listeners.change();assert.equal(writes.length,2);
});
