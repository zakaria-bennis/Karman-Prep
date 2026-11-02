from kimport import qa_gate


def _no_ts_checks(rows):
    """Stand-in for ts/qa-check.ts --gate: no app-code findings, a figure when a figure column is set
    (a figure_spec of the shape the screen draws first). The Python half of the gate still runs;
    tests/test_qa_gate.py runs the real checker."""
    from kimport.figure_gate import draws_spec
    figure = lambda r: "spec" if draws_spec(r.get("figure_spec")) else next(
        (c for c in ("figure_table_data", "figure_chart_data", "figure_geometry_data", "figure_svg", "image_url")
         if r.get(c)), None)
    choice_figures = lambda r: sum(draws_spec(c.get("choice_figure_spec")) for c in r.get("answer_choices") or ())
    return {str(r["id"]): {"checks": {}, "figure": figure(r), "choice_tables": 0, "choice_figures": choice_figures(r),
                           "delivery": "not_checked", "display": {}} for r in rows}


qa_gate.CHECKER = _no_ts_checks
qa_gate.REACH = lambda url: None  # every image loads
