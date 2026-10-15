import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tabPath, readRoute, routeURL } from "../js/routes.js";

test("tabs use clean paths and Home uses the root", () => {
  for (const tab of ["home", "chat", "profile", "settings", "performances"]) {
    const path = tabPath(tab);
    assert.equal(path, tab === "home" ? "/" : "/" + tab);
    assert.deepEqual(readRoute({ pathname: path }), { tab, id: "" });
    assert.deepEqual(readRoute({ pathname: path + (tab === "home" ? "" : "/") }), { tab, id: "" });
  }
});

test("old hash links migrate and performance deep links retain their selection", () => {
  for (const tab of ["home", "chat", "profile", "settings", "performances"])
    assert.deepEqual(readRoute({ pathname: "/", hash: "#" + tab }), { tab, id: "" });
  assert.deepEqual(readRoute({ pathname: "/", hash: "#performance/abc-123" }), { tab: "performances", id: "abc-123" });
  assert.deepEqual(readRoute({ pathname: "/performances/", hash: "#abc-123" }), { tab: "performances", id: "abc-123" });
  assert.equal(routeURL("chat", "?demo=1"), "/chat?demo=1");
  assert.equal(routeURL("home"), "/");
  assert.equal(routeURL("performances", "", "abc-123"), "/performances#abc-123");
  assert.equal(readRoute({ pathname: "/unknown" }), null);
  assert.equal(readRoute({ pathname: "/performances", hash: "#%zz" }), null);
});

test("each shared route has a static shell with root-relative asset resolution", async () => {
  const root = new URL("../", import.meta.url);
  const shell = await readFile(new URL("index.html", root), "utf8");
  assert.match(shell, /<base href="\/"\s*\/>/);
  for (const tab of ["chat", "profile", "settings", "performances"])
    assert.equal(await readFile(new URL(tab + "/index.html", root), "utf8"), shell);
});
