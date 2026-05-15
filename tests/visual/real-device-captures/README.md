# Real-device captures

Drop iPhone / iPad / Android screenshots here when you've verified something
on physical hardware. The assistant can `Read` any PNG in this folder at
full fidelity — same as the automated Playwright snapshots.

## Folder convention

Use any of these names — no rigid scheme, just enough that I can find what
you mean:

```
real-device-captures/
  iphone17pm__dashboard-student__amber-banner-feels-off.png
  iphone17pm__learn__scroll-bounce-issue.png
  ipad__admin-cohorts__columns-cramped.png
```

Pattern: `<device>__<page>__<note>.png`. The trailing note is what you
want me to look at — make it specific.

## Cleanup

Files here are gitignored (`tests/visual/real-device-captures/*` except
this README + `.gitkeep`). Clean up manually when a finding has been
resolved.

See `CLAUDE.md` → "Real-device capture workflow" for how to take
the screenshots.
