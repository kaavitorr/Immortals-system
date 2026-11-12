import {professionRuleActions} from "./profession-crafting-sheet.mjs";
import {prepareProfessionProductContext, prepareProfessionToxinContext} from "../../../systems/profession-ui-context.mjs";
import {cultivationRank, professionDifficultyReduction} from "../../../systems/cultivation-rank-benefits.mjs";
import Ruleset from "../../../systems/ruleset.mjs";
import {
  PROFESSIONS, PROFESSION_STATUSES, getProfessionDefinition, professionState,
  prepareProfessionProfileUpdate, prepareProfessionRecordUpdate, prepareProfessionRecordDelete,
  prepareProfessionStatusUpdate, professionProjectFromReference
} from "../../../systems/wuxia-professions.mjs";

const busy = new Set();
const editable = sheet => Ruleset.isV2() && !!sheet.isEditable && !!sheet.actor.isOwner && !sheet.actor.limited;
const escape = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const targetKey = target => target.dataset.profession ?? target.closest?.("[data-profession]")?.dataset.profession;

/** Serialize local writes and recheck ownership after asynchronous dialogs. */
async function write(sheet, task) {
  const key = sheet.actor.uuid ?? sheet.actor;
  if (!editable(sheet) || busy.has(key)) return;
  busy.add(key);
  try {
    return await task();
  } catch (error) {
    ui.notifications.warn(error.message);
  } finally {
    busy.delete(key);
  }
}

/** Build a private workspace per craft without changing actor data. */
export function prepareProfessionsContext(context) {
  context.rootId ??= this.id ?? "profession-sheet";
  const items = this.actor.limited ? [] : PROFESSIONS.map(profession => ({
    ...professionState(this.actor, profession.key), ...prepareProfessionProductContext(this.actor, profession.key)
  }));
  const active = items.some(profession => profession.key === this._professionTab) ? this._professionTab : items[0]?.key;
  context.professions = {
    editable: editable(this), active,
    toxins: prepareProfessionToxinContext(this.actor),
    pcAvailable: this.actor.limited ? 0 : Math.max(0, Number.isFinite(Number(this.actor.system?.cultivation?.points)) ? Number(this.actor.system.cultivation.points) : 0),
    rankDifficultyReduction:this.actor.limited ? 0 : professionDifficultyReduction(this.actor,5),
    higherDifficultyReduction:this.actor.limited ? 0 : professionDifficultyReduction(this.actor,6),
    rankName: !this.actor.limited && (cultivationRank(this.actor)??0)>=5 ? "Transformação Divina" : null,
    items: items.map(profession => ({...profession, active: profession.key === active})),
    totalProjects: items.reduce((total, profession) => total + profession.counts.projects, 0),
    totalReferences: items.reduce((total, profession) => total + profession.counts.references, 0)
  };
  return context;
}

/** Native dialog markup; all user-provided text is escaped. */
export function professionDialogContent(key, record = {}, {editable: canEdit = true} = {}) {
  const definition = getProfessionDefinition(key);
  const disabled = canEdit ? "" : " disabled";
  const fields = record.fields ?? {};
  const kind = record.kind ?? "project";
  const input = (name, value, placeholder = "", required = false) =>
    '<input type="text" name="' + name + '" value="' + escape(value)
    + '" placeholder="' + escape(placeholder) + '"' + (required ? " required" : "") + disabled + ">";
  let html = '<div class="iw-profession-editor" data-profession="' + key + '">'
    + '<p class="iw-profession-editor-lead">' + escape(definition.tagline) + "</p>"
    + '<label class="iw-profession-editor-wide"><span>Nome</span>'
    + input("profession-name", record.name, "Nome do registro", true) + "</label>";
  if (kind === "project") {
    html += '<label class="iw-profession-editor-wide"><span>Situação do projeto</span>'
      + '<select name="profession-status"' + disabled + ">"
      + PROFESSION_STATUSES.map(status => '<option value="' + status.value + '"'
        + ((record.status ?? "planned") === status.value ? " selected" : "")
        + ">" + status.label + "</option>").join("") + "</select></label>";
  }
  for (const field of definition.fields) {
    html += "<label><span>" + escape(field.label) + "</span>";
    if (field.type === "select") {
      html += '<select name="profession-field-' + field.key + '"' + disabled + ">"
        + field.options.map(option => '<option value="' + option.value + '"'
          + ((fields[field.key] ?? field.options[0].value) === option.value ? " selected" : "")
          + ">" + escape(option.label) + "</option>").join("") + "</select>";
    } else html += input("profession-field-" + field.key, fields[field.key], field.placeholder);
    html += "</label>";
  }
  return html + '<label class="iw-profession-editor-wide"><span>Anotações</span>'
    + '<textarea name="profession-notes" rows="5"' + disabled + ">" + escape(record.notes)
    + "</textarea></label></div>";
}

/** Foundry action clicks bypass native submit validation; keep invalid drafts open. */
function bindEditorValidation(_event, dialog) {
  const name = dialog.element.querySelector('[name="profession-name"]');
  const save = dialog.element.querySelector('[data-action="save"]');
  if (!name || !save) return;
  name.addEventListener("input", () => name.setCustomValidity(""));
  save.addEventListener("click", event => {
    name.setCustomValidity(name.value.trim() ? "" : "Informe um nome para o registro.");
    if (name.reportValidity()) return;
    event.preventDefault();
    event.stopPropagation();
  }, {capture: true});
}

async function editor(sheet, key, record) {
  const definition = getProfessionDefinition(key);
  const canEdit = editable(sheet);
  return foundry.applications.api.DialogV2.wait({
    classes: ["iw-dialog", "iw-profession-dialog"], position: {width: 540}, modal: true,
    window: {title: definition.title + " · " + (canEdit ? "Registro do ofício" : "Consultar registro")},
    content: professionDialogContent(key, record, {editable: canEdit}),
    render: bindEditorValidation,
    buttons: canEdit ? [{
      action: "save", label: "Salvar registro", default: true,
      callback: (_event, _button, dialog) => {
        const root = dialog.element;
        return {
          name: root.querySelector('[name="profession-name"]').value,
          kind: record.kind,
          status: root.querySelector('[name="profession-status"]')?.value ?? "",
          notes: root.querySelector('[name="profession-notes"]').value,
          fields: Object.fromEntries(definition.fields.map(field => [
            field.key, root.querySelector('[name="profession-field-' + field.key + '"]').value
          ]))
        };
      }
    }, {action: "cancel", label: "Cancelar", type: "button", callback: () => false}]
      : [{action: "close", label: "Fechar", type: "button", default: true, callback: () => false}],
    rejectClose: false, close: () => null
  });
}

async function addRecord(sheet, target) {
  return write(sheet, async () => {
    const key = targetKey(target);
    const kind = target.dataset.kind;
    if (!["project", "reference"].includes(kind)) throw Error("Tipo de registro inválido.");
    getProfessionDefinition(key);
    const result = await editor(sheet, key, {kind, status: "planned", fields: {}, notes: ""});
    if (!result || !editable(sheet)) return;
    await sheet.actor.update(prepareProfessionRecordUpdate(sheet.actor, key, foundry.utils.randomID(), {
      ...result, kind
    }, {create: true}));
  });
}

async function openRecord(sheet, target) {
  if (sheet.actor.limited) return;
  const key = targetKey(target);
  const id = target.dataset.record;
  const state = professionState(sheet.actor, key);
  const record = [...state.projects, ...state.references].find(record => record.id === id);
  if (!record) return;
  if (!editable(sheet)) return editor(sheet, key, record);
  return write(sheet, async () => {
    const result = await editor(sheet, key, record);
    if (!result || !editable(sheet)) return;
    await sheet.actor.update(prepareProfessionRecordUpdate(sheet.actor, key, id, {...result, kind: record.kind}));
  });
}

async function deleteRecord(sheet, target) {
  return write(sheet, async () => {
    const key = targetKey(target);
    const id = target.dataset.record;
    prepareProfessionRecordDelete(sheet.actor, key, id);
    const state = professionState(sheet.actor, key);
    const record = [...state.projects, ...state.references].find(record => record.id === id);
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      classes: ["iw-dialog", "iw-profession-dialog"], window: {title: "Remover registro"}, modal: true,
      content: "<p>Remover <strong>" + escape(record.name) + "</strong> deste ofício?</p>",
      yes: {label: "Remover", icon: ""}, no: {label: "Manter registro", icon: ""}, rejectClose: false
    });
    if (!confirmed || !editable(sheet)) return;
    await sheet.actor.update(prepareProfessionRecordDelete(sheet.actor, key, id));
  });
}

async function fromReference(sheet, target) {
  return write(sheet, async () => {
    const key = targetKey(target);
    const draft = professionProjectFromReference(sheet.actor, key, target.dataset.record);
    const result = await editor(sheet, key, draft);
    if (!result || !editable(sheet)) return;
    await sheet.actor.update(prepareProfessionRecordUpdate(sheet.actor, key, foundry.utils.randomID(), {
      ...result, kind: "project"
    }, {create: true}));
  });
}

export const professionActions = {
  ...professionRuleActions,
  professionAddRecord: function(_event, target) { return addRecord(this, target); },
  professionOpenRecord: function(_event, target) { return openRecord(this, target); },
  professionDeleteRecord: function(_event, target) { return deleteRecord(this, target); },
  professionStartProject: function(_event, target) { return fromReference(this, target); }
};

/** Keep craft selection and field updates independent of the sheet-wide form. */
export function bindProfessionsSheet(sheet) {
  const root = sheet.element.querySelector(".iw-professions");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-profession-tab]")];
  const panels = [...root.querySelectorAll("[data-profession-panel]")];
  const choose = (key, focus = false) => {
    if (!PROFESSIONS.some(profession => profession.key === key)) key = PROFESSIONS[0].key;
    sheet._professionTab = key;
    for (const button of buttons) {
      const active = button.dataset.professionTab === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    }
    for (const panel of panels) {
      const active = panel.dataset.professionPanel === key;
      panel.hidden = !active;
      panel.setAttribute("aria-hidden", String(!active));
    }
  };
  choose(sheet._professionTab);
  bindProfessionCatalogSearch(sheet, root);
  for (const button of buttons) {
    if (button.dataset.professionBound) continue;
    button.dataset.professionBound = "1";
    button.addEventListener("click", () => choose(button.dataset.professionTab));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = buttons.indexOf(button);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      choose(buttons[next].dataset.professionTab, true);
    });
  }
  for (const input of root.querySelectorAll("[data-profession-field],[data-profession-status]")) {
    input.disabled = !editable(sheet);
    if (input.dataset.professionBound) continue;
    input.dataset.professionBound = "1";
    input.addEventListener("change", event => {
      event.stopPropagation();
      return write(sheet, async () => {
        const key = input.closest("[data-profession]").dataset.profession;
        const update = input.dataset.professionField
          ? prepareProfessionProfileUpdate(sheet.actor, key, input.dataset.professionField, input.value)
          : prepareProfessionStatusUpdate(sheet.actor, key, input.dataset.professionStatus, input.value);
        await sheet.actor.update(update);
      });
    });
  }
}


/** Search belongs to this sheet workspace; it never submits or changes actor data. */
function bindProfessionCatalogSearch(sheet, root) {
  sheet._professionProductSearch ??= {};
  const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
  for (const workspace of root.querySelectorAll("[data-profession-panel]")) {
    const input = workspace.querySelector("[data-profession-search]");
    if (!input) continue;
    const key = workspace.dataset.professionPanel;
    input.value = sheet._professionProductSearch[key] ?? "";
    input.disabled = false;
    const filter = () => {
      const query = normalize(input.value);
      sheet._professionProductSearch[key] = input.value;
      let count = 0;
      for (const product of workspace.querySelectorAll("[data-profession-product]")) {
        const visible = normalize(product.dataset.productSearch).includes(query);
        product.hidden = !visible;
        product.setAttribute("aria-hidden", String(!visible));
        if (visible) count++;
      }
      for (const group of workspace.querySelectorAll("[data-profession-product-group]")) {
        const visible = [...group.querySelectorAll("[data-profession-product]")].filter(product => !product.hidden).length;
        group.hidden = visible === 0;
        const groupCounter = group.querySelector("[data-profession-group-count]");
        if (groupCounter) groupCounter.textContent = String(visible);
      }
      const empty = workspace.querySelector("[data-profession-search-empty]");
      if (empty) empty.hidden = count > 0;
      const counter = workspace.querySelector("[data-profession-filter-count]");
      if (counter) counter.textContent = count + (count === 1 ? " produto" : " produtos");
    };
    filter();
    if (input.dataset.professionSearchBound) continue;
    input.dataset.professionSearchBound = "1";
    input.addEventListener("input", event => { event.stopPropagation(); filter(); });
    input.addEventListener("change", event => event.stopPropagation());
    input.addEventListener("keydown", event => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
    });
  }
}
