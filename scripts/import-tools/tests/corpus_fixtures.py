"""Synthetic C/B/ledger trees for corpus tests (made-up question text only).

Layout mirrors the real task-4 C output and task-3 B packages closely enough
for load_corpus: an index list with C_output_path / B_final_version, a C folder
with corrected.txt + provenance.json, and a B package folder with teacher.json,
source.json and version.json. The ledger is {"items": [...]}.
"""

import hashlib
import json
from pathlib import Path

from kimport.keys import QuestionRecord
from kimport.corpus_load import record_from_question


def q(i, text, key="A", **kw):
    """A task-6 dedup.py style fixture question."""
    return {"exam_id": f"exam{i}", "question_id": f"q{i}", "text": text, "key": key, **kw}


def rec(i, text, key="A", meta=None, is_live=False, **kw) -> QuestionRecord:
    x = q(i, text, key, **kw)
    return record_from_question(x, ref=f"exam{i}_q{i}", is_live=is_live, meta=meta)


def ref(i) -> str:
    return f"exam{i}_q{i}"


def mc(stem: str, choices=("alpha", "beta", "gamma", "delta")) -> str:
    return stem + "\n" + "\n".join(f"{'ABCD'[n]}) {c}" for n, c in enumerate(choices))


def build_tree(root: Path, items: list[dict], extra_ledger: list[dict] = ()) -> tuple[Path, Path]:
    """items: {id, text, key, holds?, live_rows?, certified?, acceptance?, b_version?,
    ledger_b_version?, strip_newline_hash?, no_c_hash?}. Returns (index path, ledger path)."""
    root = Path(root)
    index, ledger = [], []
    for it in items:
        qid = it["id"]
        bver = it.get("b_version", "b" + hashlib.sha256(qid.encode()).hexdigest()[1:])
        bdir = root / "B" / qid
        cdir = root / "C" / qid / bver
        bdir.mkdir(parents=True)
        cdir.mkdir(parents=True)
        text = it["text"] + "\n"
        (cdir / "corrected.txt").write_text(text, encoding="utf-8")
        hashed = text.rstrip("\n") if it.get("strip_newline_hash") else text
        prov = {"b_final_student_text": {"path": str(bdir / "student.json")}}
        if not it.get("no_c_hash"):
            prov["c_corrected_text_sha256"] = hashlib.sha256(hashed.encode("utf-8")).hexdigest()
        (cdir / "provenance.json").write_text(json.dumps(prov), encoding="utf-8")
        teacher = {"key_answer": it.get("key", "A"), "matches_key": True}
        if it.get("acceptance") == "generated":
            teacher = {"key_answer": None, "matches_key": None,
                       "acceptance_basis": "two_independent_question_only_reviews_without_original_key",
                       "private_generated_key_entry": {"generated_answer": it.get("key", "A")}}
        (bdir / "teacher.json").write_text(json.dumps(teacher), encoding="utf-8")
        (bdir / "source.json").write_text(json.dumps({"source": "synthetic"}), encoding="utf-8")
        (bdir / "student.json").write_text(json.dumps({"renderable_text": "synthetic"}), encoding="utf-8")
        (bdir / "version.json").write_text(json.dumps({"final_version_sha256": bver}), encoding="utf-8")
        index.append({"question_id": qid, "exam_id": qid.split("_Q")[0], "B_final_version": bver,
                      "B_output_version": "B-synthetic", "C_output_path": str(cdir)})
        ledger.append(_ledger_item(qid, it.get("ledger_b_version", bver), it))
    ledger += [_ledger_item(x["id"], "b-none", x) for x in extra_ledger]
    ip, lp = root / "index.json", root / "ledger.json"
    ip.write_text(json.dumps(index), encoding="utf-8")
    lp.write_text(json.dumps({"items": ledger}), encoding="utf-8")
    return ip, lp


def _ledger_item(qid, bver, it):
    cert = it.get("certified")
    return {
        "id": qid, "exam": qid.split("_Q")[0], "B_package_sha256": bver,
        "bucket": "certified_duplicate" if cert else "awaiting_evidence",
        "holds": list(it.get("holds", [])),
        "db_live_rows": list(it.get("live_rows", [])),
        "final_category": "CERTIFIED_DUPLICATE" if cert else ("LIVE" if it.get("live_rows") else None),
        "certificate": {"matching_live_question_id": cert} if cert else None,
    }
