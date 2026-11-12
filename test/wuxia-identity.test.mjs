import {test} from "node:test";import assert from "node:assert/strict";import {readFileSync,existsSync,readdirSync} from "node:fs";
const root=new URL("../",import.meta.url);const manifest=JSON.parse(readFileSync(new URL("system.json",root),"utf8"));
test("Immortals has independent identity and no Jujutsu updater",()=>{assert.equal(manifest.id,"Immortals-system");const repository="https://github.com/kaavitorr/Immortals-system";assert.equal(manifest.manifest,repository+"/releases/latest/download/system.json");assert.equal(manifest.download,repository+"/releases/download/v"+manifest.version+"/immortals-system.zip");for(const f of [...manifest.esmodules,...manifest.styles.map(s=>typeof s==="string"?s:s.src)])assert(existsSync(new URL(f,root)),f);});
test("cultivation and calendar styles are loaded by the manifest",()=>{const styles=manifest.styles.map(s=>typeof s==="string"?s:s.src);assert(styles.includes("less/tab-cultivation.css"));assert(styles.includes("less/hud-calendar-timeline-2.css"));});

test("system directory name matches the manifest identifier",()=>{assert(readdirSync(new URL("../",root)).includes(manifest.id));});
