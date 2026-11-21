/** Covers crew components mounted before their avatar state is available. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import Avatar from "./Avatar";
import Bubble from "./Bubble";
import { CREW } from "./types";

it("renders no avatar or bubble when their state has not arrived", () => {
  const member = CREW.architect;
  const anchor = { x: 50, y: 50 };
  expect(renderToStaticMarkup(createElement(Avatar, { member, idPrefix: "test", scale: 1 }))).toBe("");
  expect(renderToStaticMarkup(createElement(Bubble, {
    member, anchor, box: { ...anchor, w: 60, h: 30 }, scale: 1, dismiss: () => {},
  }))).toBe("");
});
