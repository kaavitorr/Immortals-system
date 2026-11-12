import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {IMMORTALS_CURRENCIES,currencyExchangeEntries,convertCurrencyBalances} from "../module/systems/wuxia-currency.mjs";
const currencies={yen:{conversion:1,exchangeGroup:"yen"},gp:{conversion:1,exchangeGroup:"coins"},sp:{conversion:10,exchangeGroup:"coins"},cp:{conversion:100,exchangeGroup:"coins"}};
test("gold, silver and copper are native denominations with the approved 1:10:100 rate",()=>{
  assert.equal(IMMORTALS_CURRENCIES.gp.abbreviation,"PO");
  assert.equal(IMMORTALS_CURRENCIES.sp.abbreviation,"PS");
  assert.equal(IMMORTALS_CURRENCIES.cp.abbreviation,"PC");
  assert.equal(IMMORTALS_CURRENCIES.gp.conversion,1);
  assert.equal(IMMORTALS_CURRENCIES.sp.conversion,10);
  assert.equal(IMMORTALS_CURRENCIES.cp.conversion,100);
  assert.equal(IMMORTALS_CURRENCIES.yen.abbreviation,"¥");
});
test("conversion normalizes new coins without exchanging or mutating existing Yen",()=>{
  for(const [input,want]of [
    [{yen:900,gp:0,sp:0,cp:100},{yen:900,gp:1,sp:0,cp:0}],
    [{yen:900,gp:2,sp:12,cp:145},{yen:900,gp:4,sp:6,cp:5}],
    [{yen:30},{yen:30,gp:0,sp:0,cp:0}],
    [{yen:2,gp:3,sp:9,cp:9},{yen:2,gp:3,sp:9,cp:9}]
  ]){const before=structuredClone(input);assert.deepEqual(convertCurrencyBalances(input,currencies),want);assert.deepEqual(input,before);}
});
test("payment denominations stay within the requested coin group",()=>{
  assert.deepEqual(currencyExchangeEntries(currencies,"gp").map(([key])=>key),["gp","sp","cp"]);
  assert.deepEqual(currencyExchangeEntries(currencies,"yen").map(([key])=>key),["yen"]);
  assert.deepEqual(currencyExchangeEntries({gp:{conversion:1},sp:{conversion:10}},"gp").map(([key])=>key),["gp","sp"]);
});
function nativeManager() {
  const source=readFileSync(new URL("../module/applications/currency-manager.mjs",import.meta.url),"utf8");
  const methods=["convertCurrency","getActorCurrencyUpdates"].map(name=>{
    const start=source.indexOf("  static "+name+"(");
    return source.slice(start,source.indexOf("\n  }",start)+5);
  }).join("\n");
  Number.prototype.almostEqual??=function(n){return Math.abs(Number(this)-n)<1e-8;};
  return new Function("CONFIG","foundry","roundCurrency","convertCurrencyBalances","currencyExchangeEntries","return class {"+methods+"}")( {DND5E:{currencies}}, {utils:{deepClone:structuredClone}},v=>Math.floor(v),convertCurrencyBalances,currencyExchangeEntries);
}
test("native conversion preserves Yen and makes one currency update",async()=>{
  const Manager=nativeManager(),ledger={yen:500,gp:0,sp:12,cp:145};let write;
  await Manager.convertCurrency({system:{currency:ledger},update:async data=>write=data});
  assert.deepEqual(write,{"system.currency":{yen:500,gp:2,sp:6,cp:5}});
  assert.deepEqual(ledger,{yen:500,gp:0,sp:12,cp:145});
});
test("native purchases cannot spend Yen on gold-priced items, including explicit priorities",()=>{
  const Manager=nativeManager(),actor={system:{currency:{yen:500,gp:0,sp:0,cp:0}}};
  for(const options of [{},{priority:["yen","gp","sp","cp"]}]){
    const result=Manager.getActorCurrencyUpdates(actor,1,"gp",options);
    assert.equal(result.remainder,1);
    assert.equal(result.system.currency.yen,500);
  }
  const legacy=Manager.getActorCurrencyUpdates({system:{currency:{yen:40}}},5,"yen");
  assert.equal(legacy.remainder,0);
  assert.deepEqual(legacy.system.currency,{yen:35,gp:0,sp:0,cp:0});
  const noCoins=Manager.getActorCurrencyUpdates({system:{currency:{yen:40}}},1,"gp");
  assert.equal(noCoins.remainder,1);
  assert(Object.values(noCoins.system.currency).every(Number.isFinite));
  const change=Manager.getActorCurrencyUpdates({system:{currency:{yen:40,gp:1,sp:5,cp:25}}},7,"sp");
  assert.equal(change.remainder,0);
  assert.deepEqual(change.system.currency,{yen:40,gp:1,sp:0,cp:5});
});

test('a price-only crystal quote cannot debit or convert the coin wallet',()=>{const Manager=nativeManager(),actor={system:{currency:{gp:1000000,sp:0,cp:0,yen:0}}};const result=Manager.getActorCurrencyUpdates(actor,5,'essence-human');assert.equal(result.remainder,5);assert.equal(result.system.currency.gp,1000000);assert(Object.values(result.system.currency).every(Number.isFinite));});
