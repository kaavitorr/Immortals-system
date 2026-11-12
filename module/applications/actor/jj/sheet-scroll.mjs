/** Restore native scroll positions after the sheet has reopened sections and mounted its layout. */
export default function PreserveSheetScrollMixin(Base) {
  return class ScrollPreservingSheet extends Base {
    #pendingScroll = new Map();

    /** @inheritDoc */
    _syncPartState(partId, newElement, priorElement, state) {
      // The early native restore can be clamped while Cultivo's sections are still closed.
      const positions = (state.scrollPositions ?? []).map(position => [...position]);
      if (positions.length) this.#pendingScroll.set(partId, {element: newElement, positions});
      return super._syncPartState(partId, newElement, priorElement, state);
    }

    /** @inheritDoc */
    async _postRender(context, options) {
      await super._postRender(context, options);
      const pending = [...this.#pendingScroll.values()];
      this.#pendingScroll.clear();
      for (const {element, positions} of pending) {
        if (!element.isConnected) continue;
        for (const [selector, scrollTop, scrollLeft] of positions) {
          const target = selector === "" ? element : element.querySelector(selector);
          if (target) Object.assign(target, {scrollTop, scrollLeft});
        }
      }
    }
  };
}
