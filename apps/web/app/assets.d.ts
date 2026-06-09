declare module "*.png" {
  const src: import("next/image").StaticImageData;
  export default src;
}

declare module "*.webm" {
  const src: string;
  export default src;
}
