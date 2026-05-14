# Architecture Decision Records

Short documents capturing significant architectural choices and the reasoning behind them. Future devs read these to understand "why is it this way?" without having to spelunk through Slack history.

## When to write an ADR

You should write one when you're about to:

- Pick between two non-trivial technical approaches
- Adopt a new third-party service or framework
- Change a data model in a way that affects more than one feature
- Deviate from a convention that's already in the codebase

You don't need one for: bug fixes, copy changes, dependency bumps, or routine feature work that follows existing patterns.

## How to write one

1. Copy [`0000-template.md`](./0000-template.md) to `NNNN-short-kebab-title.md` where `NNNN` is the next number in sequence
2. Fill in the sections — keep it short (1-2 pages max)
3. Open a PR; the ADR is part of the change it describes
4. Once merged, the ADR is **append-only** — never edit history. If a decision is reversed, write a new ADR that supersedes it

## Index

- [0001 — Per-session pay model for tutor payouts](./0001-per-session-tutor-pay.md)
- [0002 — Stripe Connect Express (not Standard) for tutor accounts](./0002-stripe-connect-express.md)
- [0003 — ChatGPT Custom GPT (not Claude API daemon) for question imports](./0003-chatgpt-custom-gpt-imports.md)
