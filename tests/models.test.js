import { test } from "node:test";
import assert from "node:assert/strict";
import {
  zoned,
  visiblePractice,
  upcoming,
  dmId,
  participants,
  threadTitle,
} from "../js/models.js";
test("Pacific practice windows use calendar dates and exact boundaries", () => {
  assert.equal(visiblePractice(new Date("2026-10-08T20:59:59Z")), null);
  assert.equal(
    visiblePractice(new Date("2026-10-08T21:00:00Z")).date,
    "2026-10-10",
  );
  assert.equal(
    visiblePractice(new Date("2026-10-10T22:29:59Z")).date,
    "2026-10-10",
  );
  assert.equal(
    visiblePractice(new Date("2026-10-10T22:30:00Z")).date,
    "2026-10-11",
  );
  assert.equal(visiblePractice(new Date("2026-10-11T22:30:00Z")), null);
});
test("Pacific dates honor DST rather than fixed offsets", () => {
  assert.equal(
    zoned("2026-10-10", "14:00").toISOString(),
    "2026-10-10T21:00:00.000Z",
  );
  assert.equal(
    zoned("2026-11-07", "14:00").toISOString(),
    "2026-11-07T22:00:00.000Z",
  );
});
test("TBD performance stays upcoming for its local date", () => {
  assert.equal(
    upcoming(
      { date: "2026-10-10", timeTbd: true },
      new Date("2026-10-11T06:59:00Z"),
    ),
    true,
  );
  assert.equal(
    upcoming(
      { date: "2026-10-10", timeTbd: true },
      new Date("2026-10-11T07:01:00Z"),
    ),
    false,
  );
});
test("DM IDs match the Flutter encoding and order", () => {
  assert.equal(dmId("19kimj", "21kiml"), dmId("21kiml", "19kimj"));
  assert.equal(dmId("19kimj", "21kiml"), "dm_WyIxOWtpbWoiLCIyMWtpbWwiXQ");
  assert.throws(() => dmId("19kimj", "19kimj"));
});
test("group participants stay unique, valid, and include creator", () => {
  assert.deepEqual(participants("19kimj", ["21kiml", "22kangp", "21kiml"]), [
    "19kimj",
    "21kiml",
    "22kangp",
  ]);
  assert.throws(() => participants("19kimj", ["21kiml"]));
  assert.throws(() => participants("19kimj", ["21kiml", "invalid / id"]));
});
test("thread titles use names without exposing IDs", () => {
  const people = [
    { id: "21kiml", name: "Lena" },
    { id: "22kangp", name: "Phillip" },
  ];
  assert.equal(
    threadTitle(
      {
        type: "group",
        title: "Weekend crew",
        participants: ["19kimj", "21kiml", "22kangp"],
      },
      "19kimj",
      people,
    ),
    "Weekend crew",
  );
  assert.equal(
    threadTitle(
      {
        type: "group",
        title: "",
        participants: ["19kimj", "21kiml", "22kangp"],
      },
      "19kimj",
      people,
    ),
    "Lena, Phillip",
  );
});
