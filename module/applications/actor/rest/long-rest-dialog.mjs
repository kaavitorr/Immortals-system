import BaseRestDialog from "./base-rest-dialog.mjs";
import Ruleset from "../../../systems/ruleset.mjs";
import {longRestPreview,patchLongRestPreview} from "./long-rest-preview.mjs";

const { BooleanField } = foundry.data.fields;

/**
 * Dialog for configuring a long rest.
 */
export default class LongRestDialog extends BaseRestDialog {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["long-rest"],
    window: {
      title: "DND5E.REST.Long.Label"
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  static PARTS = {
    ...super.PARTS,
    content: {
      template: "systems/Immortals-system/templates/actors/rest/long-rest.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.immortalsRest = Ruleset.isV2();
    if (context.immortalsRest && !context.isGroup && !this.actor.limited) {
      context.recovery = longRestPreview(this.actor, this.config);
    }
    return context;
  }

  /** Recalculate the summary without replacing the form or resetting its scroll. */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    if (!Ruleset.isV2() || this.isPartyGroup || this.actor.limited) return;
    const data = new foundry.applications.ux.FormDataExtended(this.form);
    foundry.utils.mergeObject(this.config, this._processFormData(event, this.form, data));
    patchLongRestPreview(this.element, longRestPreview(this.actor, this.config));
  }

  /** @inheritDoc */
  async _prepareFields(context, options) {
    await super._prepareFields(context, options);
    if(Ruleset.isV2())for(const entry of context.hitPoints){
      if(entry.name==="recoverTemp")entry.field=new BooleanField({label:"Encerrar PV temporários",hint:"Remove os Pontos de Vida temporários comuns ao concluir o descanso."});
      if(entry.name==="recoverTempMax")entry.field=new BooleanField({label:"Encerrar ajustes temporários de Vida",hint:"Encerra alterações temporárias do limite de Vida. As Feridas restantes continuam sendo consideradas."});
    }

    const { enabled, reminder } = dnd5e.settings.bastionConfiguration;
    const { enabled: calendarEnabled } = dnd5e.settings.calendarConfig;
    if ( game.user.isGM && context.isGroup && enabled && (!calendarEnabled || !reminder) ) context.fields.unshift({
      field: new BooleanField({ label: _loc(`DND5E.Bastion.Action.${calendarEnabled ? "Maintain" : "Advance"}`) }),
      input: context.inputs.createCheckboxInput,
      name: "advanceBastionTurn",
      value: context.config.advanceBastionTurn
    });
  }
}
