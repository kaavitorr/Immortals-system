/** Manual classification uses the Wuxia ranks independently from the character's cultivation realm. */
export const MANUAL_RANKS = Object.freeze([
  { value: "humano", label: "Humano" }, { value: "terra", label: "Terra" },
  { value: "ceu", label: "Céu" }, { value: "sagrado", label: "Sagrado" },
  { value: "divino", label: "Divino" }, { value: "supremo", label: "Supremo" }
]);
export const MANUAL_QUALITIES = Object.freeze([
  { value: "inferior", label: "Inferior" }, { value: "comum", label: "Comum" },
  { value: "superior", label: "Superior" }
]);
const normalized = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
function selection(value, options, fallback) {
  const saved = String(value ?? "").trim() || fallback;
  const known = options.find(option => normalized(option.value) === normalized(saved) || normalized(option.label) === normalized(saved));
  const selected = known ?? { value: saved, label: saved };
  // An earlier free-text classification stays visible until its owner chooses a standard rank.
  const choices = known ? options : [...options, selected];
  return { ...selected, options: choices.map(option => ({ ...option, selected: option.value === selected.value })) };
}
export function cultivationManualClassification({ rank, quality } = {}) {
  const selectedRank = selection(rank, MANUAL_RANKS, "humano");
  const selectedQuality = selection(quality, MANUAL_QUALITIES, "comum");
  return {
    rarity: selectedRank.value, rank: selectedRank.value, rankLabel: selectedRank.label, rankOptions: selectedRank.options,
    quality: selectedQuality.value, qualityLabel: selectedQuality.label, qualityOptions: selectedQuality.options
  };
}
