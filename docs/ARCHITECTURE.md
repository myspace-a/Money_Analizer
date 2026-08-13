# Personal Money Analyzer — Architecture

## 1. Purpose

This document defines the technical architecture and durable design decisions for Personal Money Analyzer.

`PROJECT_SPEC.md` defines what the product must do. This document defines how it is designed.

## 2. Platform architecture

Target platforms:
- Android
- Linux

Preferred application stack:
- React + TypeScript for UI;
- Tauri for the application shell/native integration;
- SQLite for local persistent data.

The exact Tauri/SQLite integration must be verified for BOTH Android and Linux before implementation is locked.

The application is local-first:
- each installation/device has its own local database;
- no REST server is required merely for cross-platform support;
- no cloud database or synchronization layer is assumed.

Cross-device synchronization is a future architectural decision, not a Phase 1 requirement.

## 3. Layers

Preferred separation:

UI
→ application/domain services
→ repository interfaces
→ persistence implementation
→ SQLite

Domain logic must not depend directly on React or SQLite.

Use small focused modules and explicit interfaces.

## 4. Database

SQLite is the preferred local database because it provides transactional, structured, persistent local storage.

Database changes must use migrations and preserve existing data.

Initial core entities:
- transactions
- categories
- categorization_rules

Learning persistence is deliberately deferred until real ING data and the categorization design have been evaluated.

## 5. Money

Store monetary values using integer minor units, for example EUR 12.50 as 1250, together with currency.

Avoid JavaScript floating-point arithmetic for financial calculations.

## 6. IDs

Domain entities should use stable UUID-style identifiers, preferably UUID v4 unless implementation constraints justify another choice.

IDs must not depend on database row order and must remain stable when names change or data is backed up/restored.

## 7. Transaction model

Initial conceptual fields:

`id`
`transactionDate`
`valueDate`
`amountMinorUnits`
`currency`
`direction`
`description`
`merchant`
`counterparty`
`categoryId`
`categoryMethod`
`categoryConfidence`
`categorizationRuleId`
`source`
`sourceFile`
`fingerprint`
`duplicateStatus`
`createdAt`
`updatedAt`

Do not add speculative bank-specific fields unless the ING import work demonstrates a need.

Duplicate detection semantics belong to the duplicate-detection phase. Phase 1 may reserve persistence fields but must not implement duplicate business logic.

## 8. Category model

Conceptual fields:

`id`
`name`
`parentId`
`active`
`createdAt`
`updatedAt`

Category names are mutable; IDs are stable.

## 9. Categorization rule model

Conceptual fields:

`id`
`name`
`type`
`pattern`
`categoryId`
`priority`
`enabled`
`source`
`createdAt`
`updatedAt`

Rule source distinguishes default rules from user rules.

## 10. Import boundary

Keep ING-specific parsing behind an importer boundary:

CSV
→ parsing
→ column mapping
→ normalization
→ validation
→ fingerprinting
→ duplicate handling
→ import
→ categorization

The domain model must not depend directly on ING column names.

## 11. Categorization

Effective priority:

1. custom user rule
2. built-in default rule
3. historical learning
4. uncategorized

Every categorization must preserve enough metadata to explain the result.

## 12. Testing

Use Vitest for unit/domain/integration testing and Playwright for appropriate E2E tests.

Database tests must cover precision, persistence, migrations, relationships and invalid references.

## 13. Technology decisions

Preferred:
- React + TypeScript
- Tauri
- SQLite
- Vitest
- Playwright where appropriate
- mature TypeScript CSV parser/writer
- React-compatible charting library such as Recharts

Technology choices must be verified against Android and Linux before adoption.

## 14. Evolution

Avoid premature abstraction and speculative features.

Important architectural changes must be documented and reflected here before implementation when they materially affect future phases.
