import test from "node:test";
import assert from "node:assert/strict";
import PreserveSheetScrollMixin from "../module/applications/actor/jj/sheet-scroll.mjs";

// The renderer restores scroll before _onRender reopens disclosure sections.
// This viewport models the browser clamping scroll when that content is collapsed.
function viewport(max = 0) {
  let top = 0, left = 0;
  return {
    isConnected: true, max,
    get scrollTop() { return top; },
    set scrollTop(value) { top = Math.max(0, Math.min(this.max, value)); },
    get scrollLeft() { return left; },
    set scrollLeft(value) { left = value; },
    querySelector() { return null; }
  };
}
class NativeSheet {
  _syncPartState(_id, element, _prior, state) {
    for (const [selector, scrollTop, scrollLeft] of state.scrollPositions) {
      const target = selector === "" ? element : element.querySelector(selector);
      if (target) Object.assign(target, {scrollTop, scrollLeft});
    }
  }
  async _postRender() {}
}
const Sheet = PreserveSheetScrollMixin(NativeSheet);

test("saving a selector retains scroll after Cultivo reopens its manual", async () => {
  const sheet = new Sheet(), tab = viewport();
  sheet._syncPartState("cultivation", tab, {}, {scrollPositions: [["", 640, 0]]});
  assert.equal(tab.scrollTop, 0, "collapsed content clamps the early native restore");
  tab.max = 1100; // bindCultivationSheet reopens the manual during _onRender.
  await sheet._postRender({}, {});
  assert.equal(tab.scrollTop, 640);
  tab.scrollTop = 800;
  await sheet._postRender({}, {});
  assert.equal(tab.scrollTop, 800, "later renders must not replay an old position");
});

test("preservation is per part and per sheet, including nested scroll containers", async () => {
  const first = new Sheet(), second = new Sheet();
  const details = viewport(), inventory = viewport(), nested = viewport();
  inventory.querySelector = selector => selector === ".items" ? nested : null;
  first._syncPartState("details", details, {}, {scrollPositions: [["", 280, 0]]});
  first._syncPartState("inventory", inventory, {}, {scrollPositions: [[".items", 490, 24]]});
  details.max = nested.max = 900;
  await second._postRender({}, {});
  assert.equal(details.scrollTop, 0);
  await first._postRender({}, {});
  assert.equal(details.scrollTop, 280);
  assert.equal(nested.scrollTop, 490);
  assert.equal(nested.scrollLeft, 24);
});

test("closed or replaced parts are not restored, and shorter content clamps naturally", async () => {
  const sheet = new Sheet(), oldTab = viewport(), shortTab = viewport();
  sheet._syncPartState("cultivation", oldTab, {}, {scrollPositions: [["", 640, 0]]});
  oldTab.isConnected = false; oldTab.max = 900;
  sheet._syncPartState("skills", shortTab, {}, {scrollPositions: [["", 700, 0]]});
  shortTab.max = 120;
  await sheet._postRender({}, {});
  assert.equal(oldTab.scrollTop, 0);
  assert.equal(shortTab.scrollTop, 120);
});
