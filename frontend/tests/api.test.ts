import assert from "node:assert/strict";
import test from "node:test";

import { apiFetch, BACKEND_ONLINE_EVENT } from "../lib/api.ts";

test("apiFetch đồng bộ trạng thái online sau mọi request thành công", async (context) => {
  const originalFetch = globalThis.fetch;
  const browserWindow = new EventTarget();
  let notified = false;
  browserWindow.addEventListener(BACKEND_ONLINE_EVENT, () => { notified = true; });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browserWindow });
  globalThis.fetch = async () => new Response('{"status":"ok"}');
  context.after(() => {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, "window");
  });

  await apiFetch<{ status: string }>("/health");

  assert.equal(notified, true);
});
