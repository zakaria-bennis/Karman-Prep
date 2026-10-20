"""Loads the made-up founder examples in fixtures/founder_examples.json."""

import json
from pathlib import Path

from kimport.keys import QuestionRecord

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "founder_examples.json"


def record(d: dict, **overrides) -> QuestionRecord:
    fields = {
        "ref": d["ref"],
        "text": d["text"],
        "choices": tuple(d.get("choices", ())),
        "answer": d["answer"],
        "answer_format": d["answer_format"],
    }
    fields.update(overrides)
    return QuestionRecord(**fields)


def pair(name: str) -> tuple[QuestionRecord, QuestionRecord]:
    case = json.loads(FIXTURE.read_text(encoding="utf-8"))[name]
    return record(case["a"]), record(case["b"])
