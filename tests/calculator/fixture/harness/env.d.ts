// Vite's ?inline CSS imports return the processed stylesheet as a string; every calculator
// harness page under tests/calculator/fixture/harness/ uses them to fill its shadow root.
declare module "*.css?inline" {
  const css: string;
  export default css;
}
