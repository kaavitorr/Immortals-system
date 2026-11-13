import {beastEssenceDefinition} from "../../systems/beast-essence-rules.mjs";
import {beastEssenceGrowthChoices,beastEssenceGrowthItemUpdate} from "../../systems/beast-essence-growth.mjs";
import {setBeastEssenceGrowth} from "../../systems/beast-essence-runtime.mjs";
const escape=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
export async function requestBeastEssenceGrowth(definition) {
  if(globalThis.game?.user?.isGM!==true)throw Error("Somente o Narrador pode alterar o Rank de uma essência.");
  const options=beastEssenceGrowthChoices().map(option=>'<option value="'+option.id+'"'+(option.id===definition.growth?' selected':'')+'>'+escape(option.label)+' · Até '+escape(option.limit)+'</option>').join('');
  return foundry.applications.api.DialogV2.wait({classes:["iw-dialog"],window:{title:"Alterar Rank da essência"},position:{width:460},modal:true,
    content:'<p>'+escape(definition.name)+'</p><div class="form-group"><label>Rank de crescimento</label><div class="form-fields"><select name="essence-growth">'+options+'</select></div></div><p>O limite de crescimento e os benefícios acompanharão o novo Rank.</p>',
    buttons:[{action:"save",label:"Salvar Rank",default:true,callback:(_event,_button,dialog)=>dialog.element.querySelector('[name="essence-growth"]').value},
      {action:"cancel",label:"Cancelar",type:"button",callback:()=>null}],rejectClose:false,close:()=>null});
}
function requireItem(item,sheet) {
  if(globalThis.game?.user?.isGM!==true)throw Error("Somente o Narrador pode alterar o Rank de uma essência.");
  if(item?.isOwner!==true||item.limited||sheet?.isEditable===false)throw Error("Esta essência não está disponível para edição.");
  if(item.pack&&globalThis.game?.packs?.get?.(item.pack)?.locked)throw Error("O compêndio desta essência está bloqueado.");
  const definition=beastEssenceDefinition(item);if(!definition)throw Error("Escolha um item de essência válido.");return definition;
}
export async function editBeastEssenceItemGrowth(item,{sheet,requestGrowth=requestBeastEssenceGrowth}={}) {
  const previous=requireItem(item,sheet),id=previous.id;
  const growth=await requestGrowth(previous);if(growth===null||growth===undefined||growth===false)return false;
  const current=requireItem(item,sheet);if(current.id!==id)throw Error("A essência mudou; reabra a edição do Rank.");
  if(current.growth===growth)return false;
  if(item.actor?.type==="character")return setBeastEssenceGrowth(item.actor,growth,item.id,id);
  return item.update(beastEssenceGrowthItemUpdate(item,growth));
}
