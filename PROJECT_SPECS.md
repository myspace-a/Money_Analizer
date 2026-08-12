# Personal Money Analyzer — Project Specification

**Version:** 1.0  
**Status:** Initial specification  
**Target:** Personal/local-first finance analysis application  
**Primary country:** Italy  
**Primary bank:** ING Italy

---

## 1. Project Goal

Build a personal finance application that imports bank transactions from ING Italy CSV exports, stores them locally, automatically categorizes spending, learns from previous categorization decisions, and provides dashboards and reports for understanding personal income and expenses.

The application is intended primarily for a single user and should operate **local-first**, without requiring a cloud backend or sending financial transaction data to external services.

---

# 2. Core Requirements

## 2.1 Incremental CSV Import

The application must support incremental imports of CSV transaction exports from ING Italy.

Requirements:

- Import CSV files without replacing existing transactions.
- Existing transactions must remain unchanged unless explicitly merged/updated.
- ING Italy CSV format must be supported through a configurable import profile.
- Column mapping must be adjustable.
- The application should allow mapping source CSV columns to internal transaction fields.
- Import settings should be persisted.
- The importer should handle:
  - dates
  - transaction/value dates where available
  - amounts
  - currency
  - descriptions
  - counterparties/merchants
  - transaction type where available
  - debit/credit information where available

The internal data model must not depend directly on ING's column names.

---

## 2.2 Duplicate Detection

Every imported transaction must be checked against transactions already stored locally.

Duplicate handling must:

1. Detect obvious duplicates automatically.
2. Identify possible duplicates separately from confirmed duplicates.
3. Allow the user to review duplicate candidates before merging.
4. Never silently delete a transaction solely because it appears similar to another transaction.

A transaction fingerprint should be generated from normalized transaction data.

Potential fingerprint fields:

- transaction date
- value date
- amount
- currency
- normalized description
- normalized merchant/counterparty
- account identifier, where applicable

The duplicate system should support:

- exact duplicate
- probable duplicate
- unique/new transaction

The user must be able to choose:

- Keep existing
- Import new
- Keep both
- Merge/ignore duplicate

---

# 3. Categorization Engine

Categorization is a central feature of the application.

Every transaction must contain both:

- its current category
- the method that produced the category

Possible methods:

```text
default
rule
learned
manual
uncategorized
```

## 3.1 Categorization Priority

The effective categorization order is:

```text
1. Custom user rule
2. Built-in default rule
3. Learning from historical transactions
4. Uncategorized
```

Custom rules therefore override built-in defaults.

Example:

```text
Default:
COOP → Groceries

User rule:
COOP → Household

Result:
Household
Method: rule
```

---

## 3.2 Built-in Default Rules

The application must contain a baseline set of keyword/merchant rules.

Examples:

```text
COOP → Groceries
ESSELUNGA → Groceries
CONAD → Groceries
AMAZON → Shopping
ENI → Fuel
```

The default rules must be stored separately from user-created rules.

Users must not be required to modify source code to change their own rules.

Default rules should be versioned so future application releases can improve them without destroying user rules.

---

## 3.3 Custom Rules

Users must be able to create, edit, enable/disable and delete custom categorization rules.

A rule should support at least:

- keyword
- merchant/description matching
- category
- priority
- enabled/disabled state

Future extensibility may include:

- contains
- starts with
- exact match
- regular expression
- amount conditions
- date conditions
- transaction type
- income/expense

Custom rules must have priority over default rules.

---

# 4. Learning From History

The application should learn from transactions that the user has manually categorized.

No external AI service is required for the initial implementation.

The learning system should use historical patterns such as:

1. Exact merchant match
2. Normalized merchant match
3. Similar transaction description
4. Merchant + transaction characteristics
5. Repeated historical categorization

Example:

```text
Previous:
AMAZON EU SARL       → Shopping
AMAZON EU SARL       → Shopping
AMAZON EU SARL       → Shopping

New:
AMAZON EU SARL       → ?

Suggestion:
Shopping
Method: learned
Confidence: high
```

Learning should initially produce a **suggestion**, not an irreversible categorization, when confidence is insufficient.

The user must always be able to correct a learned categorization.

Manual corrections should be available as training data for future suggestions.

---

# 5. Explainability

Every transaction must expose why it was categorized.

Example:

```text
Category: Groceries
Method: Default
Rule: "ESSELUNGA"
```

or:

```text
Category: Restaurants
Method: Rule
Rule: "LA PAROLACCIA"
```

or:

```text
Category: Shopping
Method: Learned
Confidence: 91%
Based on: 7 previous transactions
```

This is a core usability requirement.

The user must never have to guess why the application assigned a category.

---

# 6. Category Management

Categories must be stored using stable internal IDs.

Category names must not be used as database identifiers.

The user must be able to:

- create category
- rename category
- deactivate category
- split category
- merge categories
- move transactions between categories

## Split

Example:

```text
Food
```

can become:

```text
Groceries
Restaurants
Takeaway
```

Existing transactions must remain historically consistent.

## Merge

Example:

```text
Fuel
Petrol
```

can be merged into:

```text
Fuel
```

Transactions assigned to the merged category must be reassigned to the destination category.

Category changes must not corrupt historical transactions.

---

# 7. Transaction Management

The application must provide a transaction list.

Each transaction should display at minimum:

- date
- description
- merchant/counterparty
- amount
- currency
- income/expense
- category
- categorization method
- confidence where applicable

The user must be able to:

- edit category
- search transactions
- filter transactions
- inspect categorization
- correct categorization
- inspect duplicate status

---

# 8. Filters

The application must support filtering by:

- month
- date range
- category
- income/expense
- search text

Search should operate against relevant textual fields such as:

- description
- merchant
- counterparty

Filters should work consistently across transaction views and dashboard views.

---

# 9. Dashboard

The main dashboard must provide:

## 9.1 Spending by Category

Pie/donut chart showing expenses grouped by category.

The chart should respond to active filters.

---

## 9.2 Monthly Trend

Display monthly:

- income
- expenses
- net cash flow

Example:

```text
Month       Income      Expenses      Net
Jan         €4,000      €2,700        €1,300
Feb         €4,000      €2,950        €1,050
Mar         €4,100      €2,600        €1,500
```

---

## 9.3 Top Merchants

Show merchants/counterparties ranked by spending.

Example:

```text
COOP          €420
Amazon        €285
Esselunga     €241
ENI           €180
```

---

## 9.4 Income vs Expenses

Provide a clear comparison between incoming and outgoing money.

The dashboard should make it easy to understand:

- total income
- total expenses
- net balance
- spending distribution
- monthly evolution

---

# 10. Export

The application must support:

## CSV

Export transactions in a normalized application format.

## JSON

Export application data where appropriate.

JSON export should be capable of containing:

- transactions
- categories
- custom rules
- learning data
- import configuration
- application settings

---

# 11. Backup and Restore

Because financial data is important, full local backup/restore is a required feature.

The user should be able to create a complete backup containing:

```text
transactions
categories
rules
learning history
settings
import mappings
```

The backup should be restorable on the same application.

The preferred format is JSON or a structured application backup format.

---

# 12. Persistent Local Storage

Financial data must persist between application sessions.

The preferred architecture is:

```text
Local application
      ↓
Local database
      ↓
Transactions
Categories
Rules
Learning history
Settings
```

No cloud database is required.

The initial implementation must not require a user account.

---

# 13. Privacy

Financial transaction data is sensitive.

Design principles:

- local-first
- no mandatory cloud backend
- no external AI/API required for categorization
- no transaction data sent externally by default
- exports are explicitly user initiated
- database stored locally

If external services are introduced in the future, they must be opt-in.

---

# 14. Recommended Technology Stack

## Frontend

**React + TypeScript**

Reasons:

- mature ecosystem
- component-based architecture
- strong typing
- suitable for dashboard applications
- easy testing
- maintainable as functionality grows

## Application/Desktop Layer

Preferred option:

**Tauri**

Reasons:

- lightweight desktop application
- local filesystem/database access
- good fit for a local-first personal finance application
- avoids requiring a permanent browser/server setup

Alternative:

A browser-only application using IndexedDB can be considered if desktop packaging is unnecessary.

---

## Database

Preferred:

**SQLite**

Reasons:

- local
- reliable
- transactional
- excellent for structured financial data
- easy backup
- supports indexes and complex queries
- future-proof compared with storing everything as JSON

---

## Charts

**Recharts** or equivalent React-compatible charting library.

Required chart types:

- pie/donut
- line chart
- bar chart

---

## CSV

Use a mature TypeScript CSV parser/writer.

The CSV layer must be isolated behind an importer service so that the application does not depend directly on ING's CSV structure.

---

## Testing

Use:

**Vitest**

for unit and integration tests.

Use a browser/UI testing framework such as:

**Playwright**

for end-to-end testing where appropriate.

---

# 15. Proposed Repository Structure

```text
personal-money-analyzer/
│
├── README.md
├── PROJECT_SPEC.md
├── package.json
├── tsconfig.json
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes/
│   │   └── providers/
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── import/
│   │   ├── categories/
│   │   ├── rules/
│   │   └── common/
│   │
│   ├── domain/
│   │   ├── transactions/
│   │   ├── categories/
│   │   ├── rules/
│   │   ├── categorization/
│   │   └── import/
│   │
│   ├── services/
│   │   ├── csv/
│   │   ├── duplicate-detection/
│   │   ├── categorization/
│   │   ├── learning/
│   │   ├── export/
│   │   └── backup/
│   │
│   ├── database/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── database.ts
│   │
│   ├── data/
│   │   └── default-rules/
│   │
│   ├── utils/
│   │
│   └── types/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── architecture/
│   └── decisions/
│
└── .github/
    └── workflows/
```

The exact directory structure may evolve during implementation, but domain logic should remain separated from UI components.

---

# 16. Core Domain Model

Initial entities:

## Transaction

Suggested fields:

```text
id
transactionDate
valueDate
amount
currency
direction
description
merchant
counterparty
categoryId
categoryMethod
categoryConfidence
categorizationRuleId
source
sourceFile
fingerprint
duplicateStatus
createdAt
updatedAt
```

Direction:

```text
income
expense
```

Category method:

```text
default
rule
learned
manual
uncategorized
```

---

## Category

```text
id
name
parentId
active
createdAt
updatedAt
```

`parentId` allows future hierarchical categories.

---

## Categorization Rule

```text
id
name
type
pattern
categoryId
priority
enabled
source
createdAt
updatedAt
```

Source:

```text
default
user
```

---

## Learning Record

Potential fields:

```text
id
normalizedMerchant
normalizedDescription
categoryId
occurrenceCount
lastUsed
confidence
```

The exact learning model may evolve after real ING transaction data is tested.

---

# 17. Import Architecture

The import pipeline should be:

```text
CSV file
   ↓
CSV parser
   ↓
Column mapping
   ↓
Normalization
   ↓
Validation
   ↓
Fingerprint generation
   ↓
Duplicate detection
   ↓
Review
   ↓
Merge/import
   ↓
Categorization
   ↓
Database
```

Categorization occurs only after the transaction has passed the import/duplicate workflow.

---

# 18. Categorization Architecture

```text
Transaction
     │
     ▼
Custom user rules
     │
     ├── match → RULE
     │
     ▼
Default rules
     │
     ├── match → DEFAULT
     │
     ▼
Historical learning
     │
     ├── reliable match → LEARNED
     │
     ▼
UNCATEGORIZED
```

Manual user changes are stored as `manual`.

Manual categorization should influence future learning.

---

# 19. Development Phases

Development should occur in separate focused work sessions while maintaining one Git repository.

## Phase 1 — Foundation

- repository setup
- React/TypeScript setup
- Tauri setup
- SQLite setup
- database schema
- transaction model
- category model
- rule model
- basic persistence

## Phase 2 — ING Import

- CSV parser
- ING profile
- configurable mapping
- normalization
- validation
- fingerprinting
- duplicate detection
- duplicate review UI
- incremental merge

## Phase 3 — Categorization

- default rules
- custom rules
- rule priority
- categorization metadata
- learning engine
- confidence
- manual corrections

## Phase 4 — Transaction UI

- transaction table
- search
- filters
- sorting
- transaction detail
- category editing
- categorization explanation

## Phase 5 — Category Management

- create
- rename
- split
- merge
- deactivate
- reassignment

## Phase 6 — Dashboard

- category chart
- monthly trend
- income/expense
- top merchants
- dashboard filters

## Phase 7 — Export / Backup

- CSV export
- JSON export
- full backup
- restore

## Phase 8 — Testing / Hardening

- unit tests
- integration tests
- end-to-end tests
- real ING CSV validation
- duplicate edge cases
- categorization edge cases
- backup/restore validation
- performance review
- UX refinement

---

# 20. Development Rules

1. Do not implement the entire application in one source file.
2. Keep domain logic independent from UI.
3. Keep financial data local by default.
4. Do not introduce an external AI dependency for categorization unless explicitly approved.
5. Do not silently discard imported transactions.
6. Do not silently overwrite existing transactions.
7. Every categorization must have an explainable method.
8. User rules must override default rules.
9. Manual categorization must remain possible at all times.
10. Database migrations must preserve existing data.
11. Changes to the data model require corresponding migration and tests.
12. New features should include appropriate tests.
13. Avoid premature abstraction; keep the architecture modular but simple.
14. Prefer deterministic behavior for financial calculations.
15. Amount calculations must avoid floating-point monetary errors; use integer minor units or a decimal-safe representation.
16. Date handling must be timezone-safe.
17. Financial calculations must be reproducible from stored transactions.

---

# 21. Monetary Data Rules

Never use JavaScript floating-point numbers directly for monetary calculations where precision matters.

Preferred representation:

```text
amountMinorUnits: integer
currency: EUR
```

Example:

```text
€12.50 → 1250
```

This avoids errors such as:

```text
0.1 + 0.2 ≠ exactly 0.3
```

All dashboard totals and aggregations must use the safe monetary representation.

---

# 22. Security / Privacy Rules

The application must assume transaction data is sensitive.

Do not:

- transmit transactions to third-party APIs by default
- log full transaction descriptions unnecessarily
- include financial transaction data in telemetry
- commit real bank CSV files to Git
- commit database files containing personal financial data to Git

The repository should include:

```text
*.db
*.sqlite
*.sqlite3
*.csv
```

in `.gitignore` where appropriate.

Test data should be synthetic or anonymized.

---

# 23. Git Strategy

Use GitHub as the source-control repository.

Recommended branches:

```text
main
develop
feature/*
fix/*
```

For small personal development, `main` + feature branches is sufficient.

Recommended commit style:

```text
feat: add ING CSV parser
feat: add duplicate detection
feat: add categorization rules
fix: correct transaction fingerprint
test: add duplicate detection tests
refactor: isolate categorization engine
```

Each major phase should ideally be independently testable.

---

# 24. ChatGPT Project / Development Workflow

Use the ChatGPT Project as the project workspace.

Recommended conversations:

```text
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
```

The current conversation is the master requirements/architecture conversation.

Each development conversation should:

1. Read/use `PROJECT_SPEC.md`.
2. Work only on its assigned area unless architectural changes are required.
3. Update tests together with implementation.
4. Update `PROJECT_SPEC.md` when an architectural decision changes.
5. Avoid duplicating business logic in UI components.
6. Keep Git commits focused.

---

# 25. Definition of Done

A feature is considered complete only when:

- implementation exists
- relevant tests exist
- existing functionality still works
- data persistence is verified
- edge cases are considered
- UI behavior is usable
- documentation is updated where necessary

The final application must be able to:

1. Import an ING CSV.
2. Detect previously imported transactions.
3. Allow duplicate review.
4. Add only appropriate new transactions.
5. Automatically categorize transactions.
6. Apply custom rules over defaults.
7. Learn from historical categorization.
8. Show categorization method.
9. Allow manual corrections.
10. Manage categories.
11. Display spending dashboards.
12. Filter/search transactions.
13. Export data.
14. Back up and restore the complete local dataset.
15. Continue working without a cloud service.

---

# 26. Future Features — Not Part of Initial MVP

Potential future features:

- multiple bank accounts
- credit cards
- investment accounts
- recurring transaction detection
- budgets
- savings goals
- scheduled/expected transactions
- subscription detection
- automatic merchant normalization
- richer rule conditions
- category hierarchy
- year-over-year comparisons
- cash-flow forecasting
- mobile application
- optional encrypted cloud backup
- optional AI-assisted categorization

These should not complicate the initial implementation unless they become necessary for the core architecture.

---

# 27. Current Product Principle

The application should prioritize:

**Correctness → Privacy → Explainability → Reliability → Usability → Advanced automation**

Financial data correctness is more important than maximum automation.

When uncertain, the application should prefer:

> "Ask/suggest and let the user decide"

rather than silently making a potentially incorrect financial classification.

---

# 28. Initial MVP Scope

The first usable MVP consists of:

```text
✓ Local SQLite database
✓ ING CSV import
✓ Configurable column mapping
✓ Incremental imports
✓ Duplicate detection
✓ Duplicate review
✓ Default categorization rules
✓ Custom categorization rules
✓ Learned categorization suggestions
✓ Categorization method display
✓ Manual category correction
✓ Category management
✓ Transaction search/filter
✓ Spending dashboard
✓ CSV export
✓ JSON export
✓ Backup/restore
```

Everything else is secondary until this workflow is stable.

---

**End of PROJECT_SPEC.md**