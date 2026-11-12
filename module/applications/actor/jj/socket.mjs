import {registerPracticeEvolutionHooks} from '../../../systems/practice-evolution-execution.mjs';
import {registerElementalGridMovementHooks} from '../../../systems/elemental-light-grid.mjs';
import {registerElementalOrbHooks} from '../../../systems/elemental-orbs.mjs';
import {registerElementalMovementReactionHooks} from '../../../systems/elemental-movement-reactions.mjs';
import {registerElementalMovementHooks} from '../../../systems/elemental-movement.mjs';
import {registerElementalTransitHooks} from '../../../systems/elemental-travel.mjs';
import {registerElementalProjectionHooks} from '../../../systems/elemental-projections.mjs';
import {registerElementalWoodHeartHooks} from '../../../systems/elemental-wood-heart.mjs';
import {registerElementalIllusionVisionHooks} from '../../../systems/elemental-illusion-vision.mjs';
import {registerElementalAreaHooks} from '../../../systems/elemental-areas.mjs';
import {registerElementalConstructLifecycleHooks} from '../../../systems/elemental-constructs.mjs';
import {registerElementalVortexHooks} from '../../../systems/elemental-vortex.mjs';
import {registerElementalCombatCleanup} from '../../../systems/elemental-combat-state.mjs';
import {registerElementalHistoryHooks} from '../../../systems/elemental-history.mjs';
import {registerElementalExecutionHooks} from "../../../systems/elemental-execution.mjs";
/**
 * jj/socket.mjs
 * Handler do socket para geração de energia (personagem e NPC).
 */

import EnergyGenerationDialog from "../energy-generation-dialog.mjs";
import { EnergySystem } from "../../../systems/energy.mjs";

Hooks.on("ready", () => {
  registerElementalExecutionHooks();
  registerPracticeEvolutionHooks();
  registerElementalVortexHooks();
  registerElementalConstructLifecycleHooks();
  registerElementalAreaHooks();
  registerElementalProjectionHooks();
  registerElementalIllusionVisionHooks();
  registerElementalWoodHeartHooks();
  registerElementalTransitHooks();
  registerElementalMovementHooks();
  registerElementalMovementReactionHooks();
  registerElementalOrbHooks();
  registerElementalGridMovementHooks();
  registerElementalHistoryHooks();
  registerElementalCombatCleanup();
  game.socket.on("system.Immortals-system", async (data) => {

    // Personagem: jogador recebe pedido do GM para abrir dialog
    if ( data.action === "energyGenerationDialog" && data.userId === game.user.id ) {
      const actor = game.actors.get(data.actorId);
      if ( !actor ) return;
      setTimeout(async () => {
        const choices = await EnergyGenerationDialog.configure(actor);
        if ( choices ) {
          game.socket.emit("system.Immortals-system", {
            action: "energyChoicesResult",
            actorId: data.actorId,
            choices
          });
        }
      }, 100);
    }

    // Personagem: GM recebe escolhas e processa
    if ( data.action === "energyChoicesResult" && game.user.isGM ) {
      const actor = game.actors.get(data.actorId);
      if ( !actor ) return;
      await EnergySystem.processTurnStartWithChoices(actor, data.choices);
    }
  });
});
