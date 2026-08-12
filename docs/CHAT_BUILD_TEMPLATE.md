# Personal Money Analyzer — Development Chat Template

## Chat identity

Chat:

Scope:

Primary phase:

---

## 1. Objective

Describe the specific feature or problem being worked on.

This chat must remain focused on this objective.

---

## 2. Specification

Before implementation:

1. Read PROJECT_SPEC.md.
2. Identify the relevant requirements.
3. Inspect the current GitHub repository.
4. Identify the existing implementation related to this task.
5. Inspect relevant tests.

Relevant PROJECT_SPEC.md sections:

- 
- 
- 

---

## 3. Scope

### In scope

- 
- 
- 

### Out of scope

- 
- 
- 

Do not expand the scope without first explaining why it is necessary.

---

## 4. Repository inspection

Before modifying code, determine:

- relevant existing files;
- existing interfaces;
- existing services;
- existing domain models;
- database dependencies;
- related tests;
- dependencies on other project areas.

Do not assume implementation exists without verifying it.

---

## 5. Implementation approach

Before significant changes, explain:

### Existing architecture

Describe the relevant current architecture.

### Proposed change

Describe the proposed implementation.

### Why

Explain why the change is required.

### Specification compliance

Explain which PROJECT_SPEC.md requirements the change addresses.

### Cross-domain impact

Identify whether other development areas are affected.

---

## 6. Implementation rules

While implementing:

- preserve existing data;
- avoid unrelated refactoring;
- keep domain logic independent from UI;
- avoid duplicated business logic;
- use existing architecture where appropriate;
- use safe monetary representations;
- preserve explainability;
- avoid unnecessary dependencies;
- maintain backward compatibility where practical.

---

## 7. Testing

Add or update appropriate tests.

At minimum consider:

- normal cases;
- edge cases;
- invalid input;
- regression cases;
- data integrity;
- interaction with existing functionality.

Use Vitest for domain/unit/integration tests.

Use Playwright when end-to-end testing is appropriate.

---

## 8. Review

Before declaring the task complete, verify:

### Requirements

Does the implementation satisfy the relevant PROJECT_SPEC.md requirements?

### Architecture

Does it fit the existing architecture?

### Data

Does it preserve existing data?

### Security/privacy

Does it preserve local-first/privacy requirements?

### Tests

Are appropriate tests present and passing?

### Scope

Were unrelated changes avoided?

### Maintainability

Can another development chat understand and continue the work?

---

## 9. Final report

At completion provide:

### Changed

List the important changes.

### Files

List files added, modified, or removed.

### Requirements

List the PROJECT_SPEC.md requirements addressed.

### Tests

List tests added/run and their results.

### Risks / limitations

List anything incomplete or uncertain.

### Follow-up

List work that belongs to another chat or future phase.
