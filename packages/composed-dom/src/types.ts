export type DomTreeChild = {
  readonly node: Node;
  readonly composedParent: Element;
};

export type DomTreeVisit = DomTreeChild & {
  readonly depth: number;
};

export type DomTreeStrategy = {
  readonly children: (parent: Element) => ReadonlyArray<DomTreeChild>;
  readonly walk: (root: Element) => Iterable<DomTreeVisit>;
};
