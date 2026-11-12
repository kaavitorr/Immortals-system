/**
 * jj/peq-dialog.mjs
 * Modal exibido ao Narrador quando dias passam no mundo: escolhe QUAIS fichas
 * de jogador acumulam Essência de Qi (PEQ) no período — uma checkbox por ficha
 * (com o nome ao lado) + atalho "Todos".
 *
 * Este arquivo é só a interface. Os cálculos (ganho/dia, essGoal, preview) e a
 * aplicação ficam em peq-acumulo.mjs, que injeta:
 *   options.days       {number}   dias de cultivo representados
 *   options.entries    {Array}    entradas pré-calculadas (buildEntries)
 *   options.zoneInfo   {object}   cabeçalho {label, limitLabel, mods}
 *   options.rebuild    {Function} async (days) => entries — recálculo p/ dias mesclados
 *   options.onApply    {Function} (ids, days) => void — aplica o cultivo
 */
import Dialog5e from "../../api/dialog.mjs";

export default class PeqAcumuloDialog extends Dialog5e {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["peq-acumulo-dialog"],
    window: { title: "Cultivo Passivo — Passagem de Dias" },
    position: { width: 520 },
    buttons: [
      { icon: "fa-solid fa-xmark", label: "Cancelar", action: "cancel" },
      { default: true, icon: "fa-solid fa-yin-yang", label: "Aplicar Cultivo", type: "submit" }
    ],
    form: {
      handler: PeqAcumuloDialog.#onSubmitForm,
      closeOnSubmit: true
    },
    actions: {
      cancel: PeqAcumuloDialog.#onCancel
    }
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/Immortals-system/templates/apps/peq-acumulo.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this.days = options.days ?? 1;
    this.entries = options.entries ?? [];
    this.zoneInfo = options.zoneInfo ?? {};
    this.rebuild = options.rebuild;
    this.onApply = options.onApply;
    this.selected = new Set();
    this.selectAll = false;
  }

  /**
   * Outra passagem de tempo chegou com o modal aberto: em vez de empilhar
   * outro modal, soma os dias e recalcula os ganhos em tempo real.
   * @param {number} days
   */
  async addDays(days) {
    this.days += days;
    if ( this.rebuild ) this.entries = await this.rebuild(this.days);
    this.render();
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.days = this.days;
    context.zone = this.zoneInfo;
    context.actors = this.entries.map(e => ({...e, selected: e.canGain && (this.selectAll || this.selected.has(e.id))}));
    context.selectAll = this.selectAll;
    return context;
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    const html = this.element;   // re-anexa a cada render (o HTML é recriado)
    if ( !html ) return;

    const todos = html.querySelector('input[name="peqTodos"]');
    const boxes = () => [...html.querySelectorAll('input[name="peqActor"]:not(:disabled)')];

    // "Todos" marca/desmarca todas as fichas elegíveis.
    todos?.addEventListener("change", () => {
      this.selectAll = todos.checked;
      for ( const cb of boxes() ) { cb.checked = todos.checked; if(cb.checked)this.selected.add(cb.value);else this.selected.delete(cb.value); }
    });
    // Marcar/desmarcar uma ficha individual sincroniza o estado do "Todos".
    for ( const cb of html.querySelectorAll('input[name="peqActor"]') ) {
      cb.addEventListener("change", () => {
        if(cb.checked)this.selected.add(cb.value);else this.selected.delete(cb.value);
        const list = boxes();
        todos.checked = list.length > 0 && list.every(b => b.checked);
        this.selectAll = todos.checked;
      });
    }
  }

  /**
   * Submit: lê as checkbox e repassa a seleção para peq-acumulo aplicar.
   * Seleção vazia apenas fecha (equivale a cancelar).
   * @this {PeqAcumuloDialog}
   */
  static async #onSubmitForm(event, form, formData) {
    const selection = [...form.querySelectorAll('input[name="peqActor"]:checked')].map(cb => cb.value);
    if ( selection.length ) await this.onApply?.(selection, this.days);
  }

  /** @this {PeqAcumuloDialog} */
  static #onCancel() {
    this.close();
  }
}
