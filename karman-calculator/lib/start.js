window.KarmanGraphingEngine = KarmanGraphingEngine;
const start = () => {
  if (!document.getElementById("karman-graph-canvas")) return;
  window.KarmanEngineInstance = new KarmanGraphingEngine(
    document.getElementById("karman-graph-canvas")
  );
};
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
