import {beastEssenceDefinition} from "../../systems/beast-essence-rules.mjs";
import {ESSENCE_SELECTION_FIELDS,prepareBeastEssenceSelectionContext,withBeastEssenceSelections} from "../../systems/beast-essence-selections.mjs";
import {setBeastEssenceSelections} from "../../systems/beast-essence-runtime.mjs";
const SCOPE="Immortals-system";
const requireNarrator=()=>{if(globalThis.game?.user?.isGM!==true)throw Error("Somente o Narrador pode escolher as habilidades da essência.");};
export async function requestBeastEssenceSelections(definition) {
  let selection=definition,error="";
  while(true) {
    requireNarrator();
    const content=await foundry.applications.handlebars.renderTemplate("systems/Immortals-system/templates/apps/beast-essence-selections.hbs",prepareBeastEssenceSelectionContext(definition,selection,error));
    const chosen=await foundry.applications.api.DialogV2.wait({classes:["iw-dialog","iw-beast-essence-capture-dialog"],window:{title:"Escolher habilidades da essência"},position:{width:820},modal:true,content,
      buttons:[{action:"save",label:"Salvar escolhas",default:true,callback:(_event,_button,dialog)=>Object.fromEntries(Object.keys(ESSENCE_SELECTION_FIELDS).map(name=>[name,Array.from(dialog.element.querySelectorAll('[name="'+name+'"]:checked')).map(input=>input.value)]))},
        {action:"cancel",label:"Cancelar",type:"button",callback:()=>null}],rejectClose:false,close:()=>null});
    if(!chosen||typeof chosen!=="object")return null;
    requireNarrator();
    try{const updated=withBeastEssenceSelections(definition,chosen);return Object.fromEntries(Object.keys(ESSENCE_SELECTION_FIELDS).map(name=>[name,updated[name]]));}
    catch(failure){selection=chosen;error=failure.message;}
  }
}
function editableItem(item,sheet) {
  requireNarrator();
  if(item?.isOwner!==true||item.limited||sheet?.isEditable===false)throw Error("Esta essência não está disponível para edição.");
  if(item.pack&&game.packs?.get?.(item.pack)?.locked)throw Error("O compêndio desta essência está bloqueado.");
  const definition=beastEssenceDefinition(item);if(!definition)throw Error("Escolha um item de essência válido.");return definition;
}
export async function editBeastEssenceItemSelections(item,{sheet,requestSelections=requestBeastEssenceSelections}={}) {
  const id=editableItem(item,sheet).id,selection=await requestSelections(beastEssenceDefinition(item));
  if(selection===null||selection===undefined||selection===false)return false;
  const current=editableItem(item,sheet);if(current.id!==id)throw Error("A essência mudou; reabra a seleção de habilidades.");
  if(item.actor?.type==="character")return setBeastEssenceSelections(item.actor,selection,item.id,id);
  return item.update({["flags."+SCOPE+".beastEssenceItem.definition"]:withBeastEssenceSelections(current,selection)});
}
