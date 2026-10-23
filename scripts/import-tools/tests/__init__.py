from kimport import qa_gate


def _no_ts_checks(rows):
    """Stand-in for ts/qa-check.ts --gate: no app-code findings, a figure when a figure column is set.
    The Python half of the gate still runs; tests/test_qa_gate.py runs the real checker."""
    figure = lambda r: next((c for c in ("figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg",
                                         "image_url") if r.get(c)), None)
    return {str(r["id"]): {"checks": {}, "figure": figure(r), "choice_tables": 0, "delivery": "not_checked",
                           "display": {}} for r in rows}


qa_gate.CHECKER = _no_ts_checks
qa_gate.REACH = lambda url: None  # every image loads
