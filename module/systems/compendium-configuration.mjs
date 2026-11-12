let configurationQueue = Promise.resolve();

/** Foundry saves the entire global compendium configuration; serialize snapshots across packs. */
export function configureCompendium(pack, changes) {
  const operation = configurationQueue.then(() => pack.configure(changes));
  configurationQueue = operation.catch(() => {});
  return operation;
}

const packWrites = new WeakMap();

/** Keep a pack unlocked for its complete native update before another publisher begins. */
export function withCompendiumWrite(pack, operation) {
  const previous = packWrites.get(pack) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  packWrites.set(pack, current);
  return current.finally(() => {
    if (packWrites.get(pack) === current) packWrites.delete(pack);
  });
}
