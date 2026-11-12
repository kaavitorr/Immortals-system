import {NPC_EQUIPMENT_FOLDERS, npcGeneratorNormalize} from '../../../systems/npc-generator-catalogue.mjs';

/** Cache row metadata once; filtering never recreates controls or drops checked UUIDs. */
export function activateNpcEquipmentBrowser(root, state, {signal} = {}) {
 const picker = root.querySelector('[data-equipment-browser]');
 if (!picker) return;
 const search = picker.querySelector('[data-equipment-search]'), source = picker.querySelector('[data-equipment-source]');
 const count = picker.querySelector('[data-equipment-count]'), empty = picker.querySelector('[data-equipment-empty]'), heading = picker.querySelector('[data-equipment-heading]');
 const rows = Array.from(picker.querySelectorAll('.iw-ng-equipment-card'), element => ({element,
  input:element.querySelector('input'), name:npcGeneratorNormalize(element.dataset.equipmentName),
  source:element.dataset.equipmentSource, folder:element.dataset.equipmentFolder}));
 const buttons = Array.from(picker.querySelectorAll('button[data-equipment-folder]'));
 search.value = state.query ?? ''; source.value = state.source ?? '';
 const sync = () => {
  const query = npcGeneratorNormalize(state.query); let visible = 0, selected = 0;
  for (const row of rows) {
   const hidden = !!((state.folder !== 'all' && row.folder !== state.folder) || (state.source && row.source !== state.source) || !row.name.includes(query));
   if (row.element.hidden !== hidden) row.element.hidden = hidden;
   if (!hidden) visible++; if (row.input.checked) selected++;
  }
  count.textContent = visible + ' de ' + rows.length + ' equipamentos · ' + selected + ' selecionados';
  if (empty.hidden !== (visible !== 0)) empty.hidden = visible !== 0;
  heading.textContent = NPC_EQUIPMENT_FOLDERS.find(f => f.key === state.folder)?.label ?? 'Todos';
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.equipmentFolder === state.folder));
 };
 for (const button of buttons) button.addEventListener('click', () => {state.folder = button.dataset.equipmentFolder;sync();}, {signal});
 search.addEventListener('input', () => {state.query = search.value;sync();}, {signal});
 source.addEventListener('change', () => {state.source = source.value;sync();}, {signal});
 picker.addEventListener('change', sync, {signal});
 sync();
}
