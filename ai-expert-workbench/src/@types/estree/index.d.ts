declare module "estree" {
  export interface BaseNode {
    type: string;
    [key: string]: unknown;
  }
}

declare namespace ESTree {
  interface BaseNode {
    type: string;
    [key: string]: unknown;
  }
}
