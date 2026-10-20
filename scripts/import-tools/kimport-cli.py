"""Entry point for the Karman question-import tools.

Run with: python3 -I scripts/import-tools/kimport-cli.py <command> ...
Each task adds its command by registering a subparser in build_parser().
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script dir

from kimport import writer  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="kimport-cli", description="kimport: question import tools")
    sub = parser.add_subparsers(dest="command", metavar="<command>")
    _register_writer(sub)
    return parser


def _register_writer(sub) -> None:
    lock = sub.add_parser("lock", help="writer lock: acquire or release")
    lock.set_defaults(func=lambda a: lock.print_help(sys.stderr) or 2)
    lsub = lock.add_subparsers(dest="lock_action", metavar="<action>")
    acq = lsub.add_parser("acquire")
    acq.add_argument("--path", required=True)
    acq.add_argument("--holder", required=True)
    acq.add_argument("--now", required=True)
    acq.set_defaults(func=lambda a: _guard(lambda: writer.acquire_lock(Path(a.path), a.holder, a.now)))
    rel = lsub.add_parser("release")
    rel.add_argument("--path", required=True)
    rel.add_argument("--holder", required=True)
    rel.add_argument("--force", action="store_true", help="remove an unreadable lock file")
    rel.set_defaults(func=lambda a: _guard(lambda: writer.release_lock(Path(a.path), a.holder, force=a.force)))

    intent = sub.add_parser("intent", help="intent log: open, close or list")
    intent.set_defaults(func=lambda a: intent.print_help(sys.stderr) or 2)
    isub = intent.add_subparsers(dest="intent_action", metavar="<action>")
    op = isub.add_parser("open")
    op.add_argument("--log", required=True)
    op.add_argument("--batch", required=True)
    op.add_argument("--action", required=True)
    op.add_argument("--question-ids", required=True, help="comma-separated")
    op.add_argument("--sql-sha256", required=True)
    op.add_argument("--now", required=True)
    op.set_defaults(func=lambda a: _guard(lambda: print(writer.write_intent(
        Path(a.log), a.batch, a.action, [q for q in a.question_ids.split(",") if q], a.sql_sha256, a.now))))
    cl = isub.add_parser("close")
    cl.add_argument("--log", required=True)
    cl.add_argument("--intent-id", required=True)
    cl.add_argument("--outcome", required=True, choices=writer.OUTCOMES)
    cl.add_argument("--readback-sha256", required=True)
    cl.add_argument("--now", required=True)
    cl.set_defaults(func=lambda a: _guard(lambda: writer.close_intent(
        Path(a.log), a.intent_id, a.outcome, a.readback_sha256, a.now)))
    ls = isub.add_parser("list", help="print open intents as JSON lines")
    ls.add_argument("--log", required=True)
    ls.set_defaults(func=lambda a: _guard(lambda: [print(json.dumps(i)) for i in writer.open_intents(Path(a.log))]))


def _guard(fn) -> int:
    try:
        fn()
    except (writer.LockHeld, writer.WrongHolder, writer.NoLock, writer.OpenIntent,
            writer.CorruptLock, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help(sys.stderr)
        return 2
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
