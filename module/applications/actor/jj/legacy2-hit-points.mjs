/** Native HP stays bounded; the 2.0 header edits normal plus temporary HP. */
export const HIT_POINTS_TOTAL_FIELD = "jj2HitPointsTotal";
const points = value => Math.max(0, Math.trunc(Number(value) || 0));

/** Derive independent bars without changing the actor or its effective maximum. */
export function hitPointsPresentation(hp = {}) {
  const max = points(hp.effectiveMax ?? hp.max);
  const value = Math.min(points(hp.value), max);
  const temp = points(hp.temp);
  return {
    value, max, temp, total: value + temp,
    pct: max > 0 ? 100 * value / max : 0,
    tempPct: temp > 0 ? max > 0 ? Math.min(100, 100 * temp / max) : 100 : 0,
    tempMax: Math.max(max, temp)
  };
}

/** Increases heal normal HP first; decreases consume native temporary HP first. */
export function prepareHitPointsTotalUpdate(hp, total) {
  if ((typeof total !== "number" && typeof total !== "string") || String(total).trim() === "") return {};
  const amount = Number(total);
  if (!Number.isFinite(amount)) return {};
  const current = hitPointsPresentation(hp);
  const requested = points(amount), delta = requested - current.total;
  if (delta === 0) return {};
  if (delta > 0) {
    const healing = Math.min(delta, current.max - current.value);
    return { value: current.value + healing, temp: current.temp + delta - healing };
  }
  const absorbed = Math.min(current.temp, -delta);
  return { value: Math.max(0, current.value + delta + absorbed), temp: current.temp - absorbed };
}

/** Strip the presentation field before native document validation and save only an edited total. */
export function processHitPointsTotalForm(actor, submitData, { changedField, initialTotal } = {}) {
  if (!Object.hasOwn(submitData, HIT_POINTS_TOTAL_FIELD)) return submitData;
  const total = submitData[HIT_POINTS_TOTAL_FIELD];
  delete submitData[HIT_POINTS_TOTAL_FIELD];
  if (actor.isOwner === false || !actor.system?.attributes?.hp) return submitData;
  if (changedField !== undefined && changedField !== HIT_POINTS_TOTAL_FIELD) return submitData;
  if (changedField !== HIT_POINTS_TOTAL_FIELD && initialTotal != null && Number(total) === Number(initialTotal)) return submitData;
  const update = prepareHitPointsTotalUpdate(actor.system.attributes.hp, total);
  if (!Object.keys(update).length) return submitData;
  submitData.system ??= {};
  submitData.system.attributes ??= {};
  submitData.system.attributes.hp ??= {};
  Object.assign(submitData.system.attributes.hp, update);
  return submitData;
}
