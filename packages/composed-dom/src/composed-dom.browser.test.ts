import { describe, expect, it } from "vitest";
import { lightDomTree } from "./light-dom";
import { openComposedDomTree } from "./open-composed-dom";

const ELEMENT_NODE = Node.ELEMENT_NODE;
const LIGHT_CHILD_NODE_TYPES = [
  Node.TEXT_NODE,
  Node.COMMENT_NODE,
  Node.ELEMENT_NODE,
];

describe("DOM tree strategies", () => {
  it("keeps light DOM childNodes and composed parents", () => {
    document.body.innerHTML =
      "<div id=target>one<!--comment--><span>two</span></div>";
    const target = document.querySelector("#target");
    if (!target) {
      throw new Error("target not found");
    }

    const children = lightDomTree.children(target);
    expect(children.map(({ node }) => node.nodeType)).toEqual(
      LIGHT_CHILD_NODE_TYPES
    );
    expect(
      children.every(({ composedParent }) => composedParent === target)
    ).toBe(true);
  });

  it("projects named, default, fallback, and nested slots once", () => {
    const host = document.createElement("article");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <section>
        <slot name="title"></slot>
        <slot name="outer"></slot>
        <slot><span id="default-fallback">fallback</span></slot>
        <slot name="empty"><span id="fallback">fallback</span></slot>
      </section>`;
    const title = document.createElement("h1");
    title.slot = "title";
    title.textContent = "title";
    const nestedHost = document.createElement("div");
    nestedHost.id = "nested-host";
    nestedHost.slot = "outer";
    const nestedShadow = nestedHost.attachShadow({ mode: "open" });
    nestedShadow.innerHTML =
      '<span id="nested-wrapper"><slot name="inner"></slot></span>';
    const nestedContent = document.createElement("em");
    nestedContent.id = "nested-content";
    nestedContent.slot = "inner";
    nestedContent.textContent = "nested";
    nestedHost.append(nestedContent);
    const nested = document.createElement("span");
    nested.textContent = "default";
    host.append(title, nestedHost, nested);
    document.body.append(host);

    const visits = [...openComposedDomTree.walk(host)];
    const elements = visits
      .filter(({ node }) => node.nodeType === ELEMENT_NODE)
      .map(({ node }) => (node as Element).id || (node as Element).localName);
    expect(elements).toEqual([
      "section",
      "h1",
      "nested-host",
      "nested-wrapper",
      "nested-content",
      "span",
      "fallback",
    ]);
    expect(visits.filter(({ node }) => node === title)).toHaveLength(1);
    expect(visits.find(({ node }) => node === title)?.composedParent).toBe(
      shadow.querySelector("section")
    );
  });

  it("walks an iframe realm without main-window constructors", () => {
    const iframe = document.createElement("iframe");
    document.body.append(iframe);
    const frameDocument = iframe.contentDocument;
    if (!frameDocument) {
      throw new Error("iframe document not available");
    }
    const host = frameDocument.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<span>inside</span>";
    frameDocument.body.append(host);

    const visits = [...openComposedDomTree.walk(host)];
    expect(
      visits
        .filter(({ node }) => node.nodeType === ELEMENT_NODE)
        .map(({ node }) => node.textContent)
    ).toEqual(["inside"]);
    expect(visits[0]?.composedParent).toBe(host);
  });
});
