# Personal Money Analyzer — Development Guide

## 1. Purpose

This document defines how the project is developed.

`PROJECT_SPEC.md` defines requirements.
`ARCHITECTURE.md` defines technical design.
This document defines the development workflow.

## 2. Build chats

Development is divided into focused build chats:

00 — Requirements & Architecture
01 — Data Model & Database
02 — ING CSV Import
03 — Duplicate Detection
04 — Categorization Engine
05 — Transaction UI
06 — Categories & Rules UI
07 — Dashboard
08 — Export & Backup
09 — Testing & Integration
10 — Final Review

Each build chat has a defined scope. Do not silently implement future phases or unrelated refactoring.

The exact build-chat structure may evolve as the project develops.

## 3. AI tools

Build chats are tool-independent.

The user may use:
- GitHub Copilot;
- ChatGPT;
- another suitable development tool if explicitly chosen.

The initial preference is GitHub Copilot for implementation because it has direct repository write capability. If Copilot is ineffective for a task, the user may move that build chat to ChatGPT.

Requirements, scope, decisions and implementation state must remain consistent regardless of tool.

The GitHub repository is the implementation source of truth. AI conversation history is not.

When moving a build chat between tools:
1. inspect the current repository;
2. read the relevant project documents;
3. verify the current implementation;
4. continue from repository state rather than relying on previous AI memory.

## 4. Standard build workflow

For non-trivial work:

1. understand the requirement;
2. read relevant specification and architecture;
3. inspect the repository;
4. identify dependencies and impact;
5. propose the implementation;
6. identify decisions requiring approval;
7. obtain explicit approval;
8. implement;
9. test;
10. review against requirements and architecture;
11. summarize.

## 5. Approval and Git safety

Do not modify the repository during inspection, analysis or planning.

Before explicit implementation approval:
- do not create/modify files;
- do not create branches;
- do not commit;
- do not push;
- do not open PRs.

After approval, implementation may proceed only within the approved scope.

If the selected AI tool lacks repository write access, do not create a parallel repository or silently work around the limitation. Provide the changes/instructions for the user to apply or use another approved tool.

Never commit or push without explicit user authorization.

## 6. Git discipline

Prefer focused branches and small, understandable commits.

Example commit styles:
- `feat: add ING CSV parser`
- `fix: correct transaction fingerprint`
- `test: add duplicate detection tests`

Do not mix unrelated changes.

Before a commit, summarize:
- what changed;
- why;
- requirements addressed;
- tests performed.

## 7. Testing

New functionality requires appropriate tests.

Prioritize:
- financial precision;
- data integrity;
- duplicate detection;
- categorization priority;
- imports;
- category changes;
- backup/restore;
- regression cases.

Manual UI testing alone does not make a feature complete.

## 8. Scope and ambiguity

When work belongs mainly to another build chat, say so.

For important financial or architectural ambiguity:
1. identify it;
2. explain alternatives;
3. recommend the safest/simple option;
4. ask for a decision.

Use reasonable judgement for minor details.

## 9. Completion checklist

Before declaring significant work complete, verify:
- PROJECT_SPEC.md compliance;
- ARCHITECTURE.md consistency;
- Android/Linux compatibility where relevant;
- data preservation;
- privacy/local-first requirements;
- tests;
- scope discipline;
- maintainability for future build chats.

Report incomplete items explicitly.
