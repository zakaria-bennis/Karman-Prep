// Lets a phone plugged into this computer by cable open the dev server, and nothing else.
//
// The dev server signs every visitor in as a stand-in account (DEV_IMPERSONATE_CLERK_ID), so it must
// never listen on the Wi-Fi, where anyone nearby could open it. It stays on 127.0.0.1. This bridge
// listens only on the cable's own address (a link-local 169.254.x.x address, which exists between
// the phone and this computer and nowhere else) and passes what it hears to the dev server.
//
//   node scripts/dev/phone-bridge.mjs [port]     (the port the dev server is on; 3000 if not given)
import net from "node:net";
import os from "node:os";

const port = Number(process.argv[2] ?? 3000);
const name = `${os.hostname().replace(/\.local$/, "")}.local`;
const open = new Map();

const cable = () =>
  Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === "IPv4" && a.address.startsWith("169.254."))
    .map((a) => a.address);

function listen(address) {
  const server = net.createServer((phone) => {
    const dev = net.connect(port, "127.0.0.1");
    phone.pipe(dev).pipe(phone);
    const drop = () => (phone.destroy(), dev.destroy());
    phone.on("error", drop);
    dev.on("error", drop);
  });
  server.on("error", () => open.delete(address));
  server.listen(port, address, () => {
    console.log(
      `[phone] on the phone, open  http://${name}:${port}  (or http://${address}:${port})`
    );
  });
  open.set(address, server);
}

// the cable's address changes when the phone is plugged in again, so keep looking
function look() {
  const now = cable();
  for (const address of now) if (!open.has(address)) listen(address);
  for (const [address, server] of open) {
    if (!now.includes(address)) {
      server.close();
      open.delete(address);
    }
  }
}
look();
setInterval(look, 3000);
if (cable().length === 0) console.log("[phone] no phone on a cable yet; waiting for one");
