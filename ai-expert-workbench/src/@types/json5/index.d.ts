declare module "json5" {
  export function parse(text: string): unknown;
  export function stringify(value: unknown): string;
}
