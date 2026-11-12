/** Current source citation for the imported NPC encyclopedia. */
export const NPC_ENCYCLOPEDIA_SOURCE = "Immortals Legacy - Enciclopédia das Bestas v2.1";
const legacySources = new Set([
  "Jujutsu Legacy — Enciclopédia das Maldições v2.0",
  "Jujutsu Legacy - Enciclopédia das Maldições v2.0"
]);

/** Normalize only the known imported citation; preserve all other source metadata. */
export function migrateNpcEncyclopediaSource(source) {
  if (source && typeof source === "object" && legacySources.has(source.custom?.trim?.())) {
    source.custom = NPC_ENCYCLOPEDIA_SOURCE;
  }
  return source;
}
