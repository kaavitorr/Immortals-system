import assert from "node:assert/strict";
import {test} from "node:test";
let rules={};try{rules=await import("../module/systems/divine-manual.mjs");}catch(error){if(error.code!=="ERR_MODULE_NOT_FOUND")throw error;}
const use=name=>{assert.equal(typeof rules[name],"function");return rules[name];};
function actor(){return {type:"character",itemTypes:{class:[{system:{identifier:"cultivador"}}]},flags:{"Immortals-system":{}},getFlag(scope,key){return this.flags[scope]?.[key];}};}
function apply(a,update){for(const[key,value]of Object.entries(update)){const parts=key.split("."),last=parts.pop();let obj=a;for(const p of parts)obj=obj[p]??={};obj[last]=structuredClone(value);}}
test("the spiritual sealed divine manual begins Human Inferior and advertises one rank higher absorption without a fabricated daily number",()=>{
 const state=use("divineManualState")(actor());assert.equal(state.active,true);assert.equal(state.rank,"humano");assert.equal(state.quality,"inferior");assert.equal(state.absorptionRank,"terra");assert.equal(state.assimilations.length,0);assert.equal(state.remaining,3);
});
test("ordinary study raises classification but preserves assimilated properties and its three opportunities",()=>{
 const a=actor();a.flags["Immortals-system"].divineManual={assimilations:[{name:"Proteção",properties:"Proteção de pedra"}]};
 const patch=use("prepareDivineManualStudy")(a,{rank:"ceu",quality:"superior",name:"Manual Celeste",properties:"Não absorver",assimilate:false});apply(a,patch);
 assert.equal(a.flags["Immortals-system"].manualRarity,"ceu");assert.equal(a.flags["Immortals-system"].manualClass,"superior");assert.equal(a.flags["Immortals-system"].divineManual.assimilations.length,1);
 assert.equal(a.flags["Immortals-system"].divineManual.assimilations[0].properties,"Proteção de pedra");assert.equal(patch["flags.Immortals-system.manualEssencePerDay"],undefined);
});
test("three assimilations persist independently, a fourth is blocked, and ordinary reading remains possible",()=>{
 const a=actor(),study=use("prepareDivineManualStudy");for(const name of ["Vento","Rocha","Nuvem"])apply(a,study(a,{rank:"terra",quality:"comum",name,properties:name,assimilate:true}));
 assert.equal(use("divineManualState")(a).remaining,0);assert.throws(()=>study(a,{rank:"ceu",quality:"inferior",name:"Quarto",assimilate:true}));
 apply(a,study(a,{rank:"sagrado",quality:"inferior",name:"Leitura",assimilate:false}));assert.equal(a.flags["Immortals-system"].divineManual.assimilations.length,3);
});
test("reading a weaker manual cannot lower the inheritance's classification",()=>{
 const a=actor(),study=use("prepareDivineManualStudy");a.flags["Immortals-system"].manualRarity="ceu";a.flags["Immortals-system"].manualClass="superior";
 apply(a,study(a,{rank:"humano",quality:"inferior",name:"Básico",assimilate:false}));assert.equal(a.flags["Immortals-system"].manualRarity,"ceu");assert.equal(a.flags["Immortals-system"].manualClass,"superior");
});
