# Build Chat Template

Every Build Chat for Money Map follows this structure, in order. Copy this file's steps into the start of a new Build Chat (or paste this whole template as the first message) so Claude follows it from the start.

---

## 1. State the phase/scope

State plainly which phase (per `PROJECT_SPEC.md` §6) or narrower task this Build Chat covers, and what is explicitly *not* in scope for this session. Example:

> This Build Chat covers Phase 2 — ING Import: parser, mapping, normalization, validation, fingerprinting, duplicate detection/review, incremental import. It does not cover categorization (Phase 3) or dashboard UI (Phase 6).

---

## 2. Read the project docs

Before doing anything else, read from project knowledge:

- `PROJECT_SPEC.md` — product requirements
- `docs/ARCHITECTURE.md` — technical design
- `DEVELOPMENT.md` — process, environment, git, testing, CI, AI-tool responsibilities

Do not proceed on memory or assumption from a previous session — re-read these each time, since they may have changed.

---

## 3. Inspect the current state of the repository

Don't assume — check. Concretely:

```bash
git status
git log --oneline -10
node -v
npm -v
npm ci
```

Confirm:
- Current branch and working tree state.
- What already exists in the repo relevant to this phase (don't re-propose work that's already done, and don't assume something exists that doesn't).
- Node version matches `DEVELOPMENT.md` §1.1, and `npm ci` succeeds cleanly (`DEVELOPMENT.md` §1.2). If either fails, stop and flag it before proceeding — do not attempt to work around it silently.

If work for this phase is starting fresh, create the branch per `DEVELOPMENT.md` §2.1 (`build/<phase-number>-<short-phase-name>`) at this point.

---

## 4. Propose an implementation plan — wait for approval

Before writing any code, propose a concrete plan: what files will be created/changed, what the approach is, and any open questions or assumptions. Explicitly wait for approval before proceeding.

- If the plan reveals a gap or conflict with `PROJECT_SPEC.md` or `ARCHITECTURE.md`, flag it now rather than quietly working around it (see §7 below and `DEVELOPMENT.md` §6).
- If the plan is large, it's fine to break it into smaller approved chunks rather than one big upfront plan.

---

## 5. Implement only the approved scope

Build exactly what was approved in §4. If something outside that scope turns out to be necessary (e.g. a small refactor to unblock the approved work), pause and flag it rather than silently expanding scope.

Follow commit conventions from `DEVELOPMENT.md` §2.2 as work progresses.

---

## 6. Test according to `DEVELOPMENT.md`

Run:

```bash
npm test              # Vitest — narrow scope, see ARCHITECTURE.md §7.2
npx playwright test   # Playwright — primary, acceptance-level
```

Per `DEVELOPMENT.md` §3.3, most new features should get a Playwright test. Vitest is only for the four narrow areas in `ARCHITECTURE.md` §7.2 (money math, migrations, categorization rule logic, duplicate-detection fingerprinting).

Both suites must pass locally before this Build Chat's work is considered done. Report the actual pass/fail result — don't state tests pass without having run them in this session.

---

## 7. Review against the spec and architecture — flag, don't resolve, conflicts

Before wrapping up:

- Check the implemented work against `PROJECT_SPEC.md` (does it meet the actual requirement?) and `ARCHITECTURE.md` (does it follow the intended design — layering, the `Database` port, money-as-integer-minor-units, etc.)?
- If anything is inconsistent between the code just written and either doc, **do not edit `PROJECT_SPEC.md` or `ARCHITECTURE.md` from this chat.** Write a clear flagged note (what's inconsistent, and a suggested resolution) for the **Requirements & Architecture chat** to actually resolve, per `DEVELOPMENT.md` §6.

---

## 8. Wrap-up summary

End the Build Chat with a short summary covering:

- What was implemented, and which files changed.
- Test results (Vitest + Playwright), including anything skipped or pending.
- Branch name and PR status (opened / not yet opened) — per `DEVELOPMENT.md` §2.3, merging into `main` is done via a Pull Request that you review and merge yourself.
- Any flagged doc/code conflicts for the Requirements & Architecture chat (§7).
- Anything explicitly deferred or left as a known gap for a future Build Chat.
