import {treasureRarityLevel} from '../../systems/refined-equipment.mjs';
/** Reject invalid levels before NumberField can round or clamp them into a treasure bonus. */
export default class TreasureRarityField extends foundry.data.fields.NumberField {
  _cast(value) {return treasureRarityLevel(value);}
}
