// Asset imports resolve to URLs (inlined as data: URIs by the single-file build).
declare module '*.svg' {
  const url: string;
  export default url;
}
