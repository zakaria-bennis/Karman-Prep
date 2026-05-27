#!/usr/bin/env python3
# ============================================================
# sympy-check.py — Phase 5 symbolic equivalence check.
#
# Reads a JSON payload from stdin:
#   { "expression_a": "x^2 + 2*x + 1",
#     "expression_b": "(x + 1)**2",
#     "timeout_seconds": 10 }
#
# Writes a JSON response to stdout:
#   { "ok": true,
#     "equivalent": true,
#     "method": "simplify_subtract_to_zero",
#     "diagnostics": { ... } }
#
# OR on failure:
#   { "ok": false,
#     "equivalent": null,
#     "error": "parse_error" | "timeout" | "sympy_exception",
#     "details": "<traceback or message>" }
#
# Exit code is ALWAYS 0 — failures are signaled in the JSON. The
# Node wrapper depends on this to handle "inconclusive" gracefully
# rather than treating any exit code as a crash.
#
# The Node wrapper enforces its own subprocess timeout; the
# timeout_seconds in the payload is a *soft* timeout the Python
# side respects for sympy.simplify().
# ============================================================

import json
import signal
import sys
import traceback


def _emit(payload):
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


class _Timeout(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _Timeout("sympy simplification exceeded soft timeout")


def main():
    try:
        raw = sys.stdin.read()
    except Exception as exc:  # noqa: BLE001
        _emit({"ok": False, "equivalent": None, "error": "stdin_read_error", "details": str(exc)})
        return

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        _emit({"ok": False, "equivalent": None, "error": "stdin_parse_error", "details": str(exc)})
        return

    expr_a = payload.get("expression_a")
    expr_b = payload.get("expression_b")
    timeout_seconds = int(payload.get("timeout_seconds") or 10)

    if not isinstance(expr_a, str) or not isinstance(expr_b, str):
        _emit({
            "ok": False,
            "equivalent": None,
            "error": "missing_expressions",
            "details": "expression_a and expression_b must both be strings",
        })
        return

    try:
        import sympy
        from sympy.parsing.sympy_parser import (
            parse_expr,
            standard_transformations,
            implicit_multiplication_application,
            convert_xor,
        )
    except ImportError as exc:
        _emit({
            "ok": False,
            "equivalent": None,
            "error": "sympy_not_installed",
            "details": str(exc),
        })
        return

    # Allow caret-as-power (x^2 instead of x**2) and implicit
    # multiplication (2x → 2*x) — that's exactly the SAT printing
    # convention Phase 5 cares about.
    transformations = standard_transformations + (
        implicit_multiplication_application,
        convert_xor,
    )

    try:
        parsed_a = parse_expr(expr_a, transformations=transformations, evaluate=True)
        parsed_b = parse_expr(expr_b, transformations=transformations, evaluate=True)
    except Exception as exc:  # noqa: BLE001
        _emit({
            "ok": False,
            "equivalent": None,
            "error": "parse_error",
            "details": f"{type(exc).__name__}: {exc}",
        })
        return

    # ── Equivalence test under soft timeout ────────────────────
    signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(timeout_seconds)
    try:
        diff = sympy.simplify(parsed_a - parsed_b)
        equivalent = diff == 0
        method = "simplify_subtract_to_zero"
        diagnostics = {
            "parsed_a": str(parsed_a),
            "parsed_b": str(parsed_b),
            "difference": str(diff),
        }
        _emit({
            "ok": True,
            "equivalent": bool(equivalent),
            "method": method,
            "diagnostics": diagnostics,
        })
    except _Timeout as exc:
        _emit({
            "ok": False,
            "equivalent": None,
            "error": "timeout",
            "details": str(exc),
        })
    except Exception as exc:  # noqa: BLE001
        _emit({
            "ok": False,
            "equivalent": None,
            "error": "sympy_exception",
            "details": f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}",
        })
    finally:
        signal.alarm(0)


if __name__ == "__main__":
    main()
