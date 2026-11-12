import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
globalThis.foundry={data:{CalendarData:class{}},utils:{setProperty:(o,_k,v)=>{o.dnd5e={deltas:v};}}};
const source=readFileSync(new URL("../module/data/calendar/calendar-data.mjs",import.meta.url),"utf8").replace(/^import .*;\r?\n/gm,"");
const {default:Calendar}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
test("calendar retains existing time passage recovery API",()=>assert.equal(typeof Calendar.onTimePassage,"function"));
test("day difference accounts for intermediate leap years in long advances",()=>{globalThis.game={time:{calendar:{isLeapYear:y=>y===2,days:{daysPerYear:365,daysPerLeapYear:366}}}};assert.equal(Calendar.dayDifference({year:1,day:0},{year:3,day:0}),731);assert.equal(Calendar.dayDifference({year:3,day:0},{year:1,day:0}),-731);});
test("crossing midnight in a custom 30-hour day counts a cultivation day",()=>{const now={year:1,day:1,hour:0,minute:0,second:0},prev={year:1,day:0,hour:29,minute:0,second:0};globalThis.game={time:{worldTime:108000,components:now,calendar:{days:{hoursPerDay:30,minutesPerHour:60,secondsPerMinute:60},timeToComponents:()=>prev}}};const opts={};Calendar.onUpdateWorldTime(108000,3600,opts,"gm");assert.equal(opts.dnd5e.deltas.midnights,1);});
