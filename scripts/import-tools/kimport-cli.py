"""Entry point for the Karman question-import tools.

Run with: python3 -I scripts/import-tools/kimport-cli.py <command> ...
Each task adds its command by registering a subparser in build_parser().
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script dir

from kimport import autopairs, autopilot, autopilot_live, autopilot_state, backfill, bulk, corpus, fetch, figures, lane, lint, pairs_page, publish, qa_certify, qa_correct, qa_run, stage, sweep, writer  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="kimport-cli", description="kimport: question import tools")
    sub = parser.add_subparsers(dest="command", metavar="<command>")
    _register_writer(sub)
    _register_export(sub)
    _register_sweep(sub)
    _register_backfill(sub)
    _register_stage(sub)
    _register_publish(sub)
    _register_lint(sub)
    _register_corpus(sub)
    _register_pairs(sub)
    _register_lane(sub)
    _register_autopilot(sub)
    _register_figures(sub)
    _register_qa(sub)
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


def _register_export(sub) -> None:
    ex = sub.add_parser("export", help="fetch the live export in pages (read-only) and save it")
    ex.add_argument("--out", required=True, help="file to write, e.g. pipeline/live-latest.json")
    ex.add_argument("--page-size", type=int, default=fetch.PAGE)
    ex.add_argument("--fallback-size", type=int, default=fetch.FALLBACK)
    ex.set_defaults(func=lambda a: _guard(lambda: print(
        "export: {rows} rows, fingerprint {fingerprint}, exported_at {exported_at} -> {out}".format(
            **fetch.run_export(Path(a.out), page=a.page_size, fallback=a.fallback_size,
                               log=lambda m: print(m, file=sys.stderr, flush=True))))))


def _register_sweep(sub) -> None:
    sw = sub.add_parser("sweep", help="find live duplicates; write groups, report and un-publish SQL")
    sw.add_argument("--export", help="saved result of sql/live_export.sql")
    sw.add_argument("--out", help="output folder, e.g. pipeline/sweep/")

    def run(a):
        if not (a.export and a.out):
            raise ValueError("sweep needs --export and --out")
        print("sweep: {live} live, {groups} groups, {remove} to un-publish".format(
            **sweep.run_sweep(Path(a.export), Path(a.out))))

    sw.set_defaults(func=lambda a: _guard(lambda: run(a)))
    ssub = sw.add_subparsers(dest="sweep_action", metavar="[resolve]")
    rs = ssub.add_parser("resolve", help="after a person looks: un-publish SQL for a figure_review or typo_review group")
    rs.add_argument("--groups", required=True, help="groups.json from the sweep")
    rs.add_argument("--export", required=True, help="fresh result of sql/live_export.sql")
    rs.add_argument("--group", required=True, help="the group's 1-based position in groups.json, or any copy id in it")
    rs.add_argument("--keep", required=True, help="the copy that stays live")
    rs.add_argument("--remove", help="comma-separated copies to un-publish (default: every other copy in the group)")
    rs.add_argument("--out", required=True, help="output folder, e.g. pipeline/sweep/resolve-<n>/")
    rs.set_defaults(func=lambda a: _guard(lambda: print(
        "sweep resolve: keep {keep}, {remove} to un-publish ({relation})".format(**sweep.run_resolve(
            Path(a.groups), Path(a.export), a.group, a.keep,
            [x for x in a.remove.split(",") if x] if a.remove else None, Path(a.out))))))


def _register_backfill(sub) -> None:
    bf = sub.add_parser("backfill", help="write guarded SQL that fills comparison_key from a live export")
    bf.add_argument("--export", required=True, help="saved result of sql/live_export.sql")
    bf.add_argument("--out", required=True, help="output file, e.g. pipeline/backfill.sql")
    bf.set_defaults(func=lambda a: _guard(lambda: print(
        "backfill: {in_sql} rows in SQL, {skipped} skipped ({skipped_live} of them live)".format(**backfill.run_backfill(Path(a.export), Path(a.out))))))


def _register_stage(sub) -> None:
    st = sub.add_parser("stage", help="write guarded stage SQL (private drafts) + readback SQL for reviewed batches")
    st.add_argument("--batch", help="one batch folder with READY, e.g. pipeline/batches/<name>/")
    st.add_argument("--batches", nargs="+", help="bulk: many batch folders (folders without READY are skipped)")
    st.add_argument("--name", help="bulk: run name, e.g. bulk-1")
    st.add_argument("--exams-dir", default=str(bulk.EXAMS),
                    help="bulk: folder of <exam>/original_exam.pdf; each batch's exam comes from its reviewed rows "
                         "(new-exam forms are found first in <pipeline>/new-exams/<exam>/source/)")
    st.add_argument("--chunk-size", type=int, default=0, help="bulk: rows per stage file (0: one file)")
    st.add_argument("--export", required=True, help="fresh live export (k export)")
    st.add_argument("--pdf", help="single batch: the source exam PDF the frozen manifest pins")
    st.add_argument("--out", required=True, help="output folder, e.g. pipeline/batches/<name>/stage/")
    st.add_argument("--intents", help="intent log, e.g. pipeline/intents.jsonl (refuses while an intent is open)")
    st.add_argument("--skip-refused", action="store_true",
                    help="stage the rows that pass and leave refused rows out (listed in precheck.json)")

    def run(a):
        intents = Path(a.intents) if a.intents else None
        if bool(a.batch) == bool(a.batches):
            raise ValueError("stage needs exactly one of --batch or --batches")
        if a.batches:
            if not a.name:
                raise ValueError("--batches needs --name")
            print("stage {batch}: {staged} rows staged ({keyed} keyed) in {chunks} file(s), {refused} rows and "
                  "{refused_batches} batches refused".format(**bulk.run_bulk_stage(
                      [Path(b) for b in a.batches], Path(a.export), a.name, Path(a.out), Path(a.exams_dir),
                      a.skip_refused, intents, a.chunk_size)))
            return
        if not a.pdf:
            raise ValueError("--batch needs --pdf")
        print("stage {batch}: {staged} rows staged ({keyed} keyed), {refused} refused".format(**stage.run_stage(
            Path(a.batch), Path(a.export), Path(a.pdf), Path(a.out), a.skip_refused, intents)))

    st.set_defaults(func=lambda a: _guard(lambda: run(a)))

    se = sub.add_parser("seal", help="check a saved stage readback and write sealed-preview.json for publish")
    se.add_argument("--readback", required=True, nargs="+", help="saved result(s) of the stage readback SQL")
    se.add_argument("--batch", help="batch folder with READY and stage/stage-preview.json")
    se.add_argument("--preview", help="bulk: the run's stage-preview.json (instead of --batch)")
    se.add_argument("--out", required=True, help="sealed preview to write, e.g. <batch>/stage/sealed-preview.json")
    se.add_argument("--hold-failing", action="store_true",
                    help="hold rows the catalog scope check rejects (held.json, lane classification_review); "
                         "seal the rest")
    se.add_argument("--lane", help="with --hold-failing: pipeline/lane.json to add held rows to")
    se.add_argument("--now", help="with --lane: ISO-8601 time stamped on new lane entries")

    def seal(a):
        if bool(a.batch) == bool(a.preview):
            raise ValueError("seal needs exactly one of --batch or --preview")
        if (a.lane or a.now) and not a.hold_failing:
            raise ValueError("--lane and --now go with --hold-failing")
        res = stage.run_seal([Path(r) for r in a.readback], Path(a.batch) if a.batch else None, Path(a.out),
                             Path(a.preview) if a.preview else None, hold_failing=a.hold_failing,
                             lane_path=Path(a.lane) if a.lane else None, now=a.now)
        print("seal {batch}: {rows} rows sealed, {held} held; wrote {readback} and {sealed}".format(**res))

    se.set_defaults(func=lambda a: _guard(lambda: seal(a)))


def _register_publish(sub) -> None:
    pb = sub.add_parser("publish", help="write guarded publish + rollback SQL for a staged batch or bulk run")
    pb.add_argument("--batch", required=True, help="batch or run name: lowercase letters, digits and dashes")
    pb.add_argument("--readback", required=True, help="private-readback.json from k seal")
    pb.add_argument("--sealed", required=True, help="sealed-preview.json from k seal")
    pb.add_argument("--export", required=True, help="fresh live export (k export), saved after the readback")
    pb.add_argument("--intents", required=True, help="intent log, e.g. pipeline/intents.jsonl")
    pb.add_argument("--out", required=True, help="output folder, e.g. pipeline/batches/<name>/")
    pb.add_argument("--bulk", action="store_true", help="a bulk run: no 27-row / one-module limit")
    pb.add_argument("--chunk-size", type=int, default=0, help="bulk: rows per publish file (0: one file)")

    def run(a):
        if a.bulk:
            print("publish: {rows} rows, {keyed} keyed, {figure_no_key} figure rows without a database key, "
                  "{chunks} file(s)".format(**bulk.run_bulk_publish(
                      a.batch, Path(a.readback), Path(a.sealed), Path(a.export), Path(a.intents), Path(a.out),
                      a.chunk_size)))
            return
        if a.chunk_size:
            raise ValueError("--chunk-size needs --bulk")
        print("publish: {rows} rows, {keyed} keyed, {figure_no_key} figure rows without a database key".format(
            **publish.run_publish(a.batch, Path(a.readback), Path(a.sealed), Path(a.export), Path(a.intents),
                                  Path(a.out))))

    pb.set_defaults(func=lambda a: _guard(lambda: run(a)))


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
        for w in res["warnings"]:
            print(f"warning {w['id']} {w['check']}: {w['detail']}")
        print("lint: {passed} passed, {pulled_rows} rows pulled, {n} QA warnings".format(n=len(res["warnings"]), **res))

    ln.set_defaults(func=lambda a: _guard(lambda: run(a)))


def _register_corpus(sub) -> None:
    cp = sub.add_parser("corpus", help="cluster every captured occurrence; elect canonicals; count unique questions")
    cp.add_argument("--c-index", required=True, help="final-current-plus-partial-question-records-*.json")
    cp.add_argument("--ledger", required=True, help="current-readiness-ledger.json")
    cp.add_argument("--export", help="saved result of sql/live_export.sql (omit: live status from the ledger)")
    cp.add_argument("--out", required=True, help="output folder, e.g. pipeline/corpus/")
    cp.add_argument("--decision-log", help="founder_decisions.json answer log to re-apply "
                    "(default: <out>/founder_decisions.json if present)")
    cp.add_argument("--lane", help="pipeline/lane.json: open or parked items are never elected canonical "
                    "(default: lane.json in --out, or one folder up, if present)")
    cp.add_argument("--extra-c-records", action="append",
                    help="extra corrected texts: hand re-reads for occurrences the C index cannot give, and "
                    "new-exam captures; repeatable (default: reread-records.json and new-exam-c-records.json "
                    "in --out, those present)")
    cp.add_argument("--extra-ledger", action="append",
                    help="supplementary ledger of new-exam occurrences; repeatable "
                    "(default: new-exam-ledger.json in --out, if present)")
    cp.add_argument("--figures", help="pipeline/figures: ids in its no-figure.json are text questions "
                    "(default: figures/ next to the lane file)")
    cp.set_defaults(func=lambda a: _guard(lambda: print(
        "corpus: {occurrences} occurrences, {unique} unique, {unique_not_live} not yet live, "
        "{founder_pairs} founder pairs, {unparsed} unparsed".format(
            **corpus.run_corpus(Path(a.c_index), Path(a.ledger), Path(a.export) if a.export else None,
                                Path(a.out), Path(a.decision_log) if a.decision_log else None,
                                Path(a.lane) if a.lane else None,
                                a.extra_c_records, a.extra_ledger,
                                Path(a.figures) if a.figures else None)))))


def _log_beside(pairs: Path) -> Path | None:
    log = pairs.parent / "founder_decisions.json"
    return log if log.exists() else None


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
    ap.add_argument("--decisions-file", help="append-only answer log (default: founder_decisions.json next to clusters.json)")
    ap.add_argument("--now", help="ISO-8601 time stamped on new answers (default: now, UTC)")
    ap.set_defaults(func=lambda a: _guard(lambda: pairs_page.apply_decisions(
        Path(a.pairs), Path(a.decisions), Path(a.clusters),
        Path(a.decisions_file) if a.decisions_file else None, a.now) or print("pairs: decisions applied")))
    au = psub.add_parser("auto", help="propose same/different/unclear for undecided pairs (writes files only, applies nothing)")
    au.add_argument("--pairs", required=True, help="corpus/founder_pairs.json")
    au.add_argument("--out", required=True, help="output folder, e.g. pipeline/corpus/auto-pairs")
    au.add_argument("--clusters", help="corpus/clusters.json, read only: counts the held questions each group settles")
    au.add_argument("--decisions-file", help="answer log whose pairs are skipped (default: founder_decisions.json next to --pairs)")
    au.set_defaults(func=lambda a: _guard(lambda: print("pairs auto: " + json.dumps(autopairs.write_outputs(
        Path(a.pairs), Path(a.out), Path(a.clusters) if a.clusters else None,
        Path(a.decisions_file) if a.decisions_file else _log_beside(Path(a.pairs)))))))


def _register_lane(sub) -> None:
    ln = sub.add_parser("lane", help="problem lane: set a question aside, record attempts, requeue, summarise")
    ln.set_defaults(func=lambda a: ln.print_help(sys.stderr) or 2)
    lsub = ln.add_subparsers(dest="lane_action", metavar="<action>")
    sa = lsub.add_parser("set-aside", help="put a question in the lane with a typed reason")
    sa.add_argument("--lane", required=True, help="pipeline/lane.json")
    sa.add_argument("--id", required=True, help="occurrence id")
    sa.add_argument("--reason", required=True, help="one of: " + ", ".join(lane.REASONS))
    sa.add_argument("--detail", required=True)
    sa.add_argument("--now", required=True)
    sa.add_argument("--clusters", help="clusters.json: required for broken_or_excluded (promotes the next member)")

    def set_aside(a):
        if a.reason == "broken_or_excluded" and not a.clusters:
            raise ValueError("--reason broken_or_excluded needs --clusters, so the next member can be promoted")
        lane.set_aside(Path(a.lane), a.id, a.reason, a.detail, a.now)
        print(f"lane: {a.id} set aside as {a.reason}")
        if a.reason == "broken_or_excluded" and a.clusters:
            _promote(a.clusters, a.id, a.lane)

    sa.set_defaults(func=lambda a: _guard(lambda: set_aside(a)))
    at = lsub.add_parser("attempt", help="record a fix attempt (two failed attempts by different methods park it)")
    at.add_argument("--lane", required=True)
    at.add_argument("--id", required=True)
    at.add_argument("--method", required=True)
    outcome = at.add_mutually_exclusive_group(required=True)
    outcome.add_argument("--ok", action="store_true", help="the attempt fixed it (resolves the item)")
    outcome.add_argument("--failed", action="store_true")
    at.add_argument("--detail", default="")
    at.add_argument("--now", required=True)
    at.add_argument("--clusters", help="clusters.json: when the item becomes parked, promote the next member")

    def attempt(a):
        status = lane.record_attempt(Path(a.lane), a.id, a.method, a.ok, a.now, a.detail)
        print(f"lane: {a.id} is {status}")
        if status == "parked" and a.clusters:
            _promote(a.clusters, a.id, a.lane)

    at.set_defaults(func=lambda a: _guard(lambda: attempt(a)))
    rq = lsub.add_parser("requeue", help="a campaign starts: parked and open items with a reason go back to open")
    rq.add_argument("--lane", required=True)
    rq.add_argument("--reason", required=True)
    rq.set_defaults(func=lambda a: _guard(lambda: print(
        "lane: {} requeued".format(len(lane.requeue(Path(a.lane), a.reason))))))
    sm = lsub.add_parser("summary", help="counts by reason and status, with the oldest age per reason")
    sm.add_argument("--lane", required=True)
    sm.add_argument("--now", required=True)

    def summary(a):
        s = lane.summary(Path(a.lane), a.now)
        print(f"lane: {s['total']} questions")
        for r, counts in s["by_reason"].items():
            if sum(counts.values()):
                age = s["oldest_age_days"][r]
                print(f"  {r}: " + ", ".join(f"{n} {k}" for k, n in counts.items()) +
                      ("" if age is None else f"; oldest {age} days"))

    sm.set_defaults(func=lambda a: _guard(lambda: summary(a)))

    sl = sub.add_parser("slice", help="give a reviewer the next slice of canonical questions (one exam module)")
    sl.add_argument("--reviewer")
    sl.add_argument("--clusters", help="corpus/clusters.json")
    sl.add_argument("--lane", help="pipeline/lane.json")
    sl.add_argument("--ledger", help="current-readiness-ledger.json")
    sl.add_argument("--claims", help="pipeline/claims.json (default: next to the lane file)")
    sl.add_argument("--size", type=int, default=lane.SLICE_SIZE)
    sl.add_argument("--now", help="ISO-8601 time stamped on the claim")
    sl.add_argument("--release", action="store_true", help="give back all of --reviewer's claims")
    sl.add_argument("--release-done", action="store_true", help="drop claims that are resolved or live")
    sl.add_argument("--extra-ledger", action="append",
                    help="supplementary ledger of new-exam occurrences; repeatable (default: new-exam-ledger.json "
                    "next to --clusters, or in <lane folder>/corpus for --release-done, if present)")

    def slice_cmd(a):
        def need(*names):
            missing = [n for n in names if not getattr(a, n)]
            if missing:
                raise ValueError("slice needs " + ", ".join("--" + n for n in missing))
        claims = Path(a.claims) if a.claims else None
        if a.release_done:
            need("lane", "ledger")
            claims = claims or lane.claims_path_for(Path(a.lane))
            print(f"slice: {len(lane.release_done(claims, Path(a.lane), Path(a.ledger), a.extra_ledger))} finished claims dropped")
        elif a.release:
            need("reviewer", "lane")
            claims = claims or lane.claims_path_for(Path(a.lane))
            print(f"slice: released {len(lane.release(claims, a.reviewer))} for {a.reviewer}")
        else:
            need("reviewer", "clusters", "lane", "ledger", "now")
            for i in lane.next_slice(Path(a.clusters), Path(a.lane), Path(a.ledger), a.reviewer,
                                     a.size, claims, a.now, a.extra_ledger):
                print(i)

    sl.set_defaults(func=lambda a: _guard(lambda: slice_cmd(a)))


def _register_autopilot(sub) -> None:
    ap = sub.add_parser("autopilot", help="stage, seal and publish every new READY batch end to end, unattended")
    ap.add_argument("--pipe", required=True, help="the pipeline folder (batches/, intents.jsonl, lane.json)")
    ap.add_argument("--max-rows", type=int, help="stage at most this many reviewed rows (whole batches)")
    ap.add_argument("--dry", action="store_true", help="read-only: export, build, run every dry run; write nothing")
    ap.add_argument("--chunk-size", type=int, default=autopilot.CHUNK, help="rows per SQL file")
    ap.add_argument("--retry", nargs="+", default=[], metavar="PATTERN",
                    help="also take batch folders the ledger lists as refused or published, by name pattern (e.g. 'r2-fix-*')")
    ap.add_argument("--resume", metavar="RUN",
                    help="finish a run that stopped after readback and seal but before publish (e.g. auto-20261023-021443): "
                         "every check runs again against the current bank (kimport/autopilot_resume.py)")

    def run(a):
        res = autopilot.run_autopilot(Path(a.pipe), a.dry, a.max_rows,
                                      autopilot.Deps(chunk_size=a.chunk_size,
                                                     log=lambda m: print(m, file=sys.stderr, flush=True)),
                                      a.retry, a.resume)
        print(json.dumps(res))
        if res["result"] in ("stopped", "lock_held"):
            raise ValueError(res["message"])

    ap.set_defaults(func=lambda a: _guard(lambda: run(a)))

    rf = sub.add_parser("autopilot-refresh", help="for an earlier run: record its refused duplicates of live rows "
                        "in the lane and rebuild the corpus duplicate map from a fresh export")
    rf.add_argument("--pipe", required=True)
    rf.add_argument("--run", required=True, help="run folder name inside --pipe, e.g. auto-20261021-075531")
    rf.add_argument("--now", required=True)
    rf.set_defaults(func=lambda a: _guard(lambda: print(autopilot_live.refresh_now(
        Path(a.pipe), a.run, lambda out: fetch.run_export(out, log=lambda m: None), a.now)["message"])))

    rc = sub.add_parser("autopilot-record", help="enter a run done by hand (e.g. bulk-1) into autopilot-state.json")
    rc.add_argument("--pipe", required=True)
    rc.add_argument("--run", required=True, help="run folder name inside --pipe, e.g. bulk-1")
    rc.add_argument("--published", type=int, required=True)
    rc.add_argument("--visible-after", type=int)
    rc.add_argument("--held", help="JSON list of stable ids held at seal")
    rc.add_argument("--now", required=True)

    def record(a):
        res = autopilot_state.record_manual_run(Path(a.pipe), a.run, a.published, a.visible_after, a.now,
                                                Path(a.held) if a.held else None)
        state = autopilot_state.read_state(Path(a.pipe))
        autopilot_state.write_status(Path(a.pipe), state, {"id": a.run, "at": a.now, "result": "published",
                                                           **state["runs"][a.run]},
                                     f"{a.run} (done by hand) recorded: {a.published} published, "
                                     f"{res['held']} held.")
        print("autopilot-record {}: {batches} batches, {published} published, {held} held, {released} claims "
              "released".format(a.run, **res))

    rc.set_defaults(func=lambda a: _guard(lambda: record(a)))


def _register_figures(sub) -> None:
    fp = sub.add_parser("figures", help="figure lane: hand out figure questions, submit them to the founder, no-figure, rework")
    fp.set_defaults(func=lambda a: fp.print_help(sys.stderr) or 2)
    fsub = fp.add_subparsers(dest="figures_action", metavar="<action>")

    sl = fsub.add_parser("slice", help="give a reviewer the next figure questions (one copy per figure group)")
    sl.add_argument("--reviewer", required=True)
    sl.add_argument("--clusters", required=True, help="corpus/clusters.json")
    sl.add_argument("--lane", required=True, help="pipeline/lane.json")
    sl.add_argument("--ledger", required=True, help="current-readiness-ledger.json")
    sl.add_argument("--figures", help="pipeline/figures (default: figures/ next to --lane)")
    sl.add_argument("--size", type=int, default=figures.SLICE_SIZE)
    sl.add_argument("--now", required=True)
    sl.add_argument("--extra-ledger", action="append",
                    help="supplementary new-exam ledger (default: new-exam-ledger.json next to --clusters)")
    sl.add_argument("--b-root", default=str(figures.B_ROOT), help="agent-b-output/revisions (source crops)")
    sl.add_argument("--prefix", help="only ids starting with this, e.g. 2026-10_US_V1 (one exam form)")

    def slice_cmd(a):
        fdir = Path(a.figures) if a.figures else Path(a.lane).parent / "figures"
        got = figures.next_slice(fdir, Path(a.clusters), Path(a.lane), Path(a.ledger), a.reviewer, a.now,
                                 a.size, a.extra_ledger, Path(a.b_root), a.prefix)
        for g in got:
            print(g["id"] + ("" if g["original"] else "  (no source crop found: add original.png)"))
        print(f"figures slice: {len(got)} for {a.reviewer} in {fdir}", file=sys.stderr)

    sl.set_defaults(func=lambda a: _guard(lambda: slice_cmd(a)))

    sm = fsub.add_parser("submit", help="check figure.json and send it to the founder (ready_for_founder)")
    sm.add_argument("--figures", required=True, help="pipeline/figures")
    sm.add_argument("--id", required=True, help="occurrence id")
    sm.add_argument("--by", required=True, help="your reviewer name")
    sm.add_argument("--now", required=True)
    sm.set_defaults(func=lambda a: _guard(lambda: print(
        "figures submit: {occurrence_id} ready for the founder (round {round})".format(
            **figures.submit(Path(a.figures), a.id, a.by, a.now)))))

    sw = fsub.add_parser("sweep", help="return ready_for_founder figures the quiz cannot draw to drafting")
    sw.add_argument("--figures", required=True, help="pipeline/figures")
    sw.add_argument("--now", required=True)

    def sweep(a):
        got = figures.return_unrenderable(Path(a.figures), a.now)
        for g in got:
            print(f"{g['id']}  {g['error']}")
        print(f"figures sweep: {len(got)} returned to drafting", file=sys.stderr)

    sw.set_defaults(func=lambda a: _guard(lambda: sweep(a)))

    sn = fsub.add_parser("snapshot", help="one review image per figure (original left, real quiz render right) + manifest.json")
    sn.add_argument("--figures", default=str(figures.PIPELINE_FIGURES), help="pipeline/figures")
    sn.add_argument("--out", required=True, help="output folder")
    sn.add_argument("--status", default="ready_for_founder")
    sn.add_argument("--limit", type=int)
    sn.add_argument("--base-url", default="http://127.0.0.1:3107",
                    help="dev server started with FIGURE_REVIEW_DIR=<figures> npx next dev --webpack -H 127.0.0.1 -p 3107")

    def snapshot(a):
        r = figures.snapshot(Path(a.figures), Path(a.out), a.status, a.limit, a.base_url)
        for f in r["failed"]:
            print(f"FAILED {f['id']}: {f['error']}")
        print(f"figures snapshot: {r['produced']} in manifest ({len(r['clipped'])} rendered now were clipped at 800px), "
              f"{len(r['failed'])} failed, to {a.out}", file=sys.stderr)

    sn.set_defaults(func=lambda a: _guard(lambda: snapshot(a)))

    nf = fsub.add_parser("no-figure", help="original.png shows no figure: send the question back to the text lane")
    nf.add_argument("--figures", help="pipeline/figures (default: figures/ next to --lane)")
    nf.add_argument("--lane", help="pipeline/lane.json (to find figures/ when --figures is not given)")
    nf.add_argument("--id", required=True, help="occurrence id")
    nf.add_argument("--reviewer", required=True, help="your reviewer name")
    nf.add_argument("--note", required=True, help="what original.png shows, e.g. 'text, one equation, four choices'")
    nf.add_argument("--now", required=True)

    def no_figure(a):
        if not (a.figures or a.lane):
            raise ValueError("no-figure needs --figures (or --lane)")
        fdir = Path(a.figures) if a.figures else Path(a.lane).parent / "figures"
        e = figures.no_figure(fdir, a.id, a.reviewer, a.note, a.now)
        also = f" (and its copies {', '.join(e['covers'])})" if e["covers"] else ""
        print(f"figures no-figure: {e['id']}{also} back to the text lane; re-run k corpus, then k slice hands it out")

    nf.set_defaults(func=lambda a: _guard(lambda: no_figure(a)))

    rw = fsub.add_parser("rework", help="figures the founder rejected, with his notes (do these first)")
    rw.add_argument("--figures", required=True)
    rw.add_argument("--reviewer", help="only this reviewer's items")

    def rework(a):
        items = figures.rework(Path(a.figures), a.reviewer)
        for i in items:
            print(f"{i['id']} (round {i['round']}, {i['claimed_by']}): {i['note'] or '(no note)'}")
        print(f"figures rework: {len(items)} rejected", file=sys.stderr)

    rw.set_defaults(func=lambda a: _guard(lambda: rework(a)))

    st = fsub.add_parser("status", help="counts by status, and drafting items per reviewer")
    st.add_argument("--figures", required=True)

    def status(a):
        s = figures.summary(Path(a.figures))
        print("figures: " + ", ".join(f"{n} {k}" for k, n in s["counts"].items()) + f" ({s['total']} in all)")
        for who, n in sorted(s["drafting_by_reviewer"].items()):
            print(f"  drafting {who}: {n}")

    st.set_defaults(func=lambda a: _guard(lambda: status(a)))


def _register_qa(sub) -> None:
    qa = sub.add_parser("qa", help="live-bank QA: hide questions with problems, republish them once fixed")
    qa.set_defaults(func=lambda a: (qa.print_help(sys.stderr), 2)[1])
    qsub = qa.add_subparsers(dest="qa_action", metavar="<action>")
    hd = qsub.add_parser("hide", help="hide (un-publish) live questions the QA results or the audit list say to hide")
    hd.add_argument("--results", nargs="+", required=True, help="pipeline/qa/results-*.jsonl (later lines win)")
    hd.add_argument("--ids", action="append", default=[], help="extra id list from the automated audit (repeatable)")
    hd.add_argument("--pipe", required=True, help="the pipeline folder (writer.lock, intents.jsonl, qa/)")
    hd.add_argument("--now", required=True, help="ISO-8601 time")
    hd.add_argument("--export", help="use this saved export instead of taking a fresh one")
    hd.add_argument("--dry", action="store_true", help="export, build, run only the .dryrun.sql; write nothing")
    hd.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_run.run_hide(
        Path(a.pipe), a.results, a.ids, a.now, a.dry, a.export, _qa_deps()))))
    rs = qsub.add_parser("restore", help="republish QA-hidden questions whose fix is in (no longer unresolved)")
    rs.add_argument("--ids", required=True, help="ids to republish (JSON list or one per line)")
    rs.add_argument("--results", nargs="+", required=True, help="the current results files")
    rs.add_argument("--audit", action="append", default=[], help="current audit id list; listed ids are refused")
    rs.add_argument("--pipe", required=True)
    rs.add_argument("--now", required=True)
    rs.add_argument("--export", help="use this saved export instead of taking a fresh one")
    rs.add_argument("--skip-refused", action="store_true", help="republish the eligible rows, list the rest")
    rs.add_argument("--dry", action="store_true", help="export, build, run only the .dryrun.sql; write nothing")
    rs.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_run.run_restore(
        Path(a.pipe), a.ids, a.results, a.audit, a.now, a.dry, a.export, a.skip_refused, _qa_deps()))))
    fl = qsub.add_parser("fix-legacy", help="apply reviewers' fixes in place to rows whose evidence names no stable id")
    fl.add_argument("--fixes", nargs="+", required=True, help="pipeline/qa/fixes-*.jsonl (decision \"fix\" lines)")
    fl.add_argument("--ids", help="only these ids (JSON list or one per line)")
    fl.add_argument("--pipe", required=True)
    fl.add_argument("--now", required=True)
    fl.add_argument("--export", help="use this saved export instead of taking a fresh one")
    fl.add_argument("--snapshot", help="use this saved legacy snapshot (qa_legacy.snapshot_sql result); with --plan")
    fl.add_argument("--plan", action="store_true", help="build the SQL and plan.json only; run nothing")
    fl.add_argument("--dry", action="store_true", help="export, build, run only the .dryrun.sql; write nothing")
    fl.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_run.run_fix_legacy(
        Path(a.pipe), a.fixes, a.now, a.ids, a.dry, a.plan, a.export, a.snapshot, _qa_deps()))))
    ids = qsub.add_parser("ids", help="candidate live id -> stable id map for the questions QA hid (read-only)")
    ids.add_argument("--pipe", required=True)
    ids.add_argument("--now", required=True)
    ids.add_argument("--ids", action="append", default=[], help="more ids beyond qa/hidden.jsonl (repeatable)")
    ids.add_argument("--rows", help="saved qa_ids.ids_sql result (or a full dump with answer_key_entries)")
    ids.add_argument("--ledger", action="append", help="ledger files (default: readiness + new-exam ledger)")
    ids.add_argument("--clusters", help="corpus clusters.json (default: <pipe>/corpus/clusters.json)")
    ids.add_argument("--write-approved", action="store_true",
                     help="write hidden-id-map.json and hidden-stable-ids.json from the reviewed candidate")
    ids.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_run.run_ids(
        Path(a.pipe), a.ids, a.now, a.rows, a.ledger, a.clusters, a.write_approved, _qa_deps()))))
    rt = qsub.add_parser("retag", help="change skill / difficulty labels of live questions from reviewed decisions")
    rt.add_argument("--decisions", required=True, help="pipeline/qa/skill-recheck/decisions.jsonl")
    rt.add_argument("--pipe", required=True, help="the pipeline folder (writer.lock, intents.jsonl, qa/)")
    rt.add_argument("--now", required=True, help="ISO-8601 time")
    rt.add_argument("--export", help="use this saved export (for the fingerprint guard) instead of a fresh one")
    rt.add_argument("--live-rows", help="use this saved full live export (qa export) instead of a fresh one")
    rt.add_argument("--dry", action="store_true", help="export, build, run only the .dryrun.sql; write nothing")
    rt.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_run.run_retag(
        Path(a.pipe), a.decisions, a.now, a.dry, a.export, a.live_rows, _qa_deps()))))
    fc = qsub.add_parser("record-fix-corrections",
                         help="record in qa/corrections.jsonl the QA corrections a run published through the fix path")
    fc.add_argument("--pipe", required=True, help="the pipeline folder")
    fc.add_argument("--run", required=True, help="the autopilot run folder name (auto-<time>)")
    fc.add_argument("--now", required=True, help="ISO-8601 time")
    fc.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_correct.backfill_fix_corrections(
        Path(a.pipe), a.run, a.now))))
    ce = qsub.add_parser("certify", help="certify every student-visible question (read-only): static checks, render on "
                                         "main, answer evidence -> qa/certificate-<date>.md and .json")
    ce.add_argument("--pipe", required=True, help="the pipeline folder (qa/, batches/)")
    ce.add_argument("--now", required=True, help="ISO-8601 time (names the certificate)")
    ce.add_argument("--export", help="use this saved visible export (qa_export visible=True) instead of a fresh one")
    ce.add_argument("--reuse", help="an earlier qa/certify-<time> folder: reuse its export, static report and render; "
                                    "certify the answers again")
    ce.set_defaults(func=lambda a: _guard(lambda: _qa_print(qa_certify.run_certify(
        Path(a.pipe), a.now, Path(a.export) if a.export else None,
        log=lambda m: print(m, file=sys.stderr, flush=True), reuse=Path(a.reuse) if a.reuse else None))))


def _qa_deps():
    return qa_run.Deps(log=lambda m: print(m, file=sys.stderr, flush=True))


def _qa_print(res: dict) -> None:
    print(json.dumps(res, indent=2, ensure_ascii=False))


def _promote(clusters: str, occ_id: str, lane_path: str) -> None:
    new = lane.promote_next_member(Path(clusters), occ_id, Path(lane_path))
    print(f"lane: promoted {new} to canonical" if new else f"lane: no member to promote for {occ_id}")


def _guard(fn) -> int:
    try:
        fn()
    except publish.RefuseToBuild as e:
        print(f"refused: {e.reason}", file=sys.stderr)
        return 1
    except KeyError as e:
        print(f"error: a file is missing the field {e}; it may be from an older run or the wrong file", file=sys.stderr)
        return 1
    except (writer.LockHeld, writer.WrongHolder, writer.NoLock, writer.OpenIntent,
            writer.CorruptLock, fetch.ExportFailed, ValueError, OSError) as e:
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
