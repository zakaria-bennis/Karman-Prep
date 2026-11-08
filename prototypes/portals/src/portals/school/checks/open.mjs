// Opens a gallery URL and waits for the network to go quiet, retrying when the
// dev server is slow under a long run (a single 30 s networkidle timeout used
// to end a whole shots or contrast run). After three slow tries it settles for
// the load event and says so, so the run carries on and the log shows it.
export async function open(page, url) {
  for (let k = 0; k < 3; k++) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      return true;
    } catch {
      console.log(`  slow, retrying: ${url}`);
    }
  }
  await page.goto(url, { waitUntil: "load" });
  console.log(`  LOADED WITHOUT NETWORK IDLE: ${url}`);
  return false;
}
