/** Pure resource debt helpers shared by the derived rules and the heart lifecycle. */
export function elementalWoodHeartQiDebt(actor){
 const debt=Number(actor?.flags?.['Immortals-system']?.elementalLongTerm?.woodHeart?.qiDebt);
 return Number.isFinite(debt)?Math.max(0,Math.min(100,debt)):0;
}
export function elementalWoodHeartQiMaximum(actor,maximum){
 return Math.max(0,(Number.isFinite(Number(maximum))?Number(maximum):0)-elementalWoodHeartQiDebt(actor));
}
