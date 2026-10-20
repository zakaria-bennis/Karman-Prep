"""Entry point for the Karman question-import tools.

Run with: python3 -I scripts/import-tools/kimport-cli.py <command> ...
Each task adds its command by registering a subparser in build_parser().
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script dir


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="kimport-cli", description="kimport: question import tools")
    parser.add_subparsers(dest="command", metavar="<command>")
    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help(sys.stderr)
        return 2
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
