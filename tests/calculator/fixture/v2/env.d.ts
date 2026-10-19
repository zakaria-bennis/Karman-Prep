// Vite's ?inline CSS imports return the processed stylesheet as a string; every calculator v2
// harness page under tests/calculator/fixture/v2/ uses them to fill its shadow root.
declare module "*.css?inline" {
  const css: string;
  export default css;
}
