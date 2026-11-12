import {openBackgroundBenefits} from '../../../systems/background-benefits.mjs';

export const backgroundBenefitsActions = {
  async backgroundReceiveBenefits(_event, target) {
    if (!this.isEditable || !this.actor.isOwner) return;
    try {
      const manager = await openBackgroundBenefits(this.actor, target.dataset.itemId);
      if (!manager) globalThis.ui?.notifications?.info?.('Os benefícios deste antecedente já foram recebidos.');
      return manager;
    } catch (error) {
      globalThis.ui?.notifications?.warn?.(error.message);
    }
  }
};
