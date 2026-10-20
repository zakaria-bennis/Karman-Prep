"""Entry point for the Karman question-import tools.

Run with: python3 -I scripts/import-tools/kimport-cli.py <command> ...
Each task adds its command by registering a subparser in build_parser().
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script dir

from kimport import backfill, corpus, lint, pairs_page, publish, sweep, writer  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="kimport-cli", description="kimport: question import tools")
    sub = parser.add_subparsers(dest="command", metavar="<command>")
    _register_writer(sub)
    _register_sweep(sub)
    _register_backfill(sub)
    _register_publish(sub)
    _register_lint(sub)
    _register_corpus(sub)
    _register_pairs(sub)
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


def _register_sweep(sub) -> None:
    sw = sub.add_parser("sweep", help="find live duplicates; write groups, report and un-publish SQL")
    sw.add_argument("--export", required=True, help="saved result of sql/live_export.sql")
    sw.add_argument("--out", required=True, help="output folder, e.g. pipeline/sweep/")
    sw.set_defaults(func=lambda a: _guard(lambda: print(
        "sweep: {live} live, {groups} groups, {remove} to un-publish".format(
            **sweep.run_sweep(Path(a.export), Path(a.out))))))


def _register_backfill(sub) -> None:
    bf = sub.add_parser("backfill", help="write guarded SQL that fills comparison_key from a live export")
    bf.add_argument("--export", required=True, help="saved result of sql/live_export.sql")
    bf.add_argument("--out", required=True, help="output file, e.g. pipeline/backfill.sql")
    bf.set_defaults(func=lambda a: _guard(lambda: print(
        "backfill: {in_sql} rows in SQL, {skipped} skipped".format(**backfill.run_backfill(Path(a.export), Path(a.out))))))


def _register_publish(sub) -> None:
    pb = sub.add_parser("publish", help="write guarded publish + rollback SQL for one staged batch (one module)")
    pb.add_argument("--batch", required=True, help="batch name: lowercase letters, digits and dashes")
    pb.add_argument("--readback", required=True, help="<batch>-private-readback.json")
    pb.add_argument("--sealed", required=True, help="<batch>-sealed-preview.json")
    pb.add_argument("--export", required=True, help="fresh result of sql/live_export.sql, saved after the readback")
    pb.add_argument("--intents", required=True, help="intent log, e.g. pipeline/intents.jsonl")
    pb.add_argument("--out", required=True, help="output folder, e.g. pipeline/batches/<name>/")
    pb.set_defaults(func=lambda a: _guard(lambda: print(
        "publish: {rows} rows, {keyed} keyed, {figure_no_key} figure rows without a database key".format(
            **publish.run_publish(a.batch, Path(a.readback), Path(a.sealed), Path(a.export), Path(a.intents),
                                  Path(a.out))))))


def _register_lint(sub) -> None:
    ln = sub.add_parser("lint", help="check a reviewed batch before it is frozen; pull bad rows into the problem lane")
    ln.add_argument("--reviewed", required=True, help="<batch>-reviewed-import-ready.json")
    ln.add_argument("--frozen", help="<batch>-frozen-inputs-import-ready.json (skips the binding check when absent)")
    ln.add_argument("--clusters", required=True, help="pipeline/corpus/clusters.json")
    ln.add_argument("--lane", required=True, help="pipeline/lane.json")
    ln.add_argument("--now", required=True, help="ISO-8601 time stamped on new lane entries")

    def run(a):
        res = lint.run_lint(Path(a.reviewed), Path(a.frozen) if a.frozen else None,
                            Path(a.clusters), Path(a.lane), a.now)
        for p in res["pulled"]:
            print(f"pulled {p['id']} {p['code']}: {p['detail']}")
        print("lint: {passed} passed, {pulled_rows} rows pulled".format(**res))

    ln.set_defaults(func=lambda a: _guard(lambda: run(a)))


def _register_corpus(sub) -> None:
    cp = sub.add_parser("corpus", help="cluster every captured occurrence; elect canonicals; count unique questions")
    cp.add_argument("--c-index", required=True, help="final-current-plus-partial-question-records-*.json")
    cp.add_argument("--ledger", required=True, help="current-readiness-ledger.json")
    cp.add_argument("--export", help="saved result of sql/live_export.sql (omit: live status from the ledger)")
    cp.add_argument("--out", required=True, help="output folder, e.g. pipeline/corpus/")
    cp.set_defaults(func=lambda a: _guard(lambda: print(
        "corpus: {occurrences} occurrences, {unique} unique, {unique_not_live} not yet live, "
        "{founder_pairs} founder pairs, {unparsed} unparsed".format(
            **corpus.run_corpus(Path(a.c_index), Path(a.ledger), Path(a.export) if a.export else None,
                                Path(a.out))))))


def _register_pairs(sub) -> None:
    pr = sub.add_parser("pairs", help="founder close-match page: render it, then apply his answers")
    pr.set_defaults(func=lambda a: pr.print_help(sys.stderr) or 2)
    psub = pr.add_subparsers(dest="pairs_action", metavar="<action>")
    rd = psub.add_parser("render", help="write the self-contained yes/no HTML page")
    rd.add_argument("--pairs", required=True, help="corpus/founder_pairs.json")
    rd.add_argument("--out", required=True, help="output file, e.g. pipeline/corpus/founder_pairs.html")
    rd.set_defaults(func=lambda a: _guard(lambda: print(
        "pairs: {} pairs written".format(pairs_page.render_pairs(Path(a.pairs), Path(a.out))))))
    ap = psub.add_parser("apply", help="fold his answers ({pair_id: same|different}) into clusters.json")
    ap.add_argument("--pairs", required=True, help="corpus/founder_pairs.json")
    ap.add_argument("--decisions", required=True, help="the JSON he copied from the page")
    ap.add_argument("--clusters", required=True, help="corpus/clusters.json (rewritten in place)")
    ap.set_defaults(func=lambda a: _guard(lambda: pairs_page.apply_decisions(
        Path(a.pairs), Path(a.decisions), Path(a.clusters)) or print("pairs: decisions applied")))


def _guard(fn) -> int:
    try:
        fn()
    except publish.RefuseToBuild as e:
        print(f"refused: {e.reason}", file=sys.stderr)
        return 1
    except (writer.LockHeld, writer.WrongHolder, writer.NoLock, writer.OpenIntent,
            writer.CorruptLock, ValueError, OSError) as e:
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
