const SCOPE = "Immortals-system";

/** Normalize settings kept by older worlds; character data is never rewritten. */
export async function ensureWorldRules() {
  if ( !game.user?.isGM || (game.users?.activeGM && game.users.activeGM.id !== game.user.id) ) return false;

  let changed = false;
  for ( const [key, value] of [["rulesetVersion", "2.0"], ["regraSalvaguarda", true]] ) {
    if ( game.settings.get(SCOPE, key) === value ) continue;
    await game.settings.set(SCOPE, key, value);
    changed = true;
  }
  if ( !changed ) return false;

  // Reload only after every write succeeds so clients prepare actor data with one consistent ruleset.
  game.socket.emit("reload");
  foundry.utils.debouncedReload();
  return true;
}
