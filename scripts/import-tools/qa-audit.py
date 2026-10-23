"""Student QA audit of every live question. Read-only on the database.

  python3 -I scripts/import-tools/qa-audit.py export --out $PIPE/qa/live-full.json
  python3 -I scripts/import-tools/qa-audit.py static --export $PIPE/qa/live-full.json --out $PIPE/qa
  node scripts/import-tools/qa/render-audit.mjs --export $PIPE/qa/live-full.json --out $PIPE/qa --base http://127.0.0.1:<port>
  python3 -I scripts/import-tools/qa-audit.py summary --out $PIPE/qa

See scripts/import-tools/qa/README.md.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script dir

from kimport import qa_export, qa_static  # noqa: E402


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="qa-audit")
    sub = p.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("export", help="full read-only export of the live rows")
    e.add_argument("--out", required=True)
    e.add_argument("--env-file", default=str(Path(__file__).resolve().parents[2] / ".env.local"),
                   help="file with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (default: repo .env.local)")
    s = sub.add_parser("static", help="static checks -> static-report.json and summary.md")
    s.add_argument("--export", required=True)
    s.add_argument("--out", required=True)
    s.add_argument("--no-urls", action="store_true", help="skip the image_url reachability requests")
    m = sub.add_parser("summary", help="rewrite summary.md from static-report.json and render-report.json")
    m.add_argument("--out", required=True)
    a = p.parse_args(argv)
    if a.cmd == "export":
        print(qa_export.run_qa_export(Path(a.out), Path(a.env_file)))
    elif a.cmd == "static":
        report = qa_static.run_static(Path(a.export), Path(a.out), check_urls=not a.no_urls)
        print(report["totals"])
        qa_static.write_summary(Path(a.out))
    else:
        qa_static.write_summary(Path(a.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
