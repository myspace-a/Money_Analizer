# Personal Money Analyzer — Development Guide

## 1. Purpose

This document defines how the project is developed.

`PROJECT_SPEC.md` defines requirements.
`ARCHITECTURE.md` defines technical design.
This document defines the development workflow.

## ChatGPT Project chat structure

The ChatGPT Project is organized into four types of chats. Project documents and chats have distinct roles.

| Responsibility | Document / Source | Chat |
|---|---|---|
| Requirements | `PROJECT_SPEC.md` | Requirements & Architecture |
| Architecture | `ARCHITECTURE.md` | Requirements & Architecture |
| Development process | `DEVELOPMENT.md` | Development Workflow & Tools |
| Build procedure | `CHAT_BUILD_TEMPLATE.md` | Used by every Build Chat |
| Coaching | — | Project Coaching |
| Implementation | GitHub repository | Build Chats |

### 1. Requirements & Architecture

Responsible for:
- product requirements;
- requirements clarification;
- technical architecture;
- architecture decisions;
- maintaining PROJECT_SPEC.md and ARCHITECTURE.md.

This chat does not implement application code. This chat will not touch development workflow. If user request questions or topic not strictly related to requirements or technical architecture suggest to move to the appropriate chat

### 2. Development Workflow & Tools

Responsible for:
- development workflow;
- build-chat structure;
- Git workflow;
- testing workflow;
- AI tool usage;
- ChatGPT/Copilot workflow;
- maintaining DEVELOPMENT.md and CHAT_BUILD_TEMPLATE.md.

This chat does not implement application code. This chat will not work on requirements nor technical architecture. If user ask questions related to requirements or technical architecture suggest to use the right chat

### 3. Project Coaching

The coaching chat provides guidance across the project.

It helps the user:
- evaluate project organization;
- make or prepare architectural decisions;
- choose between development tools;
- decide how to structure chats;
- resolve workflow issues;
- review lessons learned during development.

The coaching chat does not become the source of truth for requirements or implementation. Decisions must be reflected in the appropriate project document.

### 4. Build Chats

Build chats implement specific development phases.

A build chat:
- has a defined scope;
- reads the relevant project documents;
- inspects the current repository;
- proposes an implementation before making changes;
- implements only after explicit approval;
- tests the implementation;
- reviews the result against the project requirements and architecture.

Build chats may be executed using either GitHub Copilot or ChatGPT. The GitHub repository is the implementation source of truth.

The exact number and organization of build chats may evolve as the project develops.

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
