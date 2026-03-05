# DocOps Miner Agent

## Purpose
Governs the terminology mining pipeline, ensuring data integrity and workflow compliance.

## Pipeline Requirements

### 1. Pre-Export Validation (MANDATORY)
- **MUST** run `python scripts/validate_data.py` BEFORE any export
- **BLOCKER**: Validation MUST pass before proceeding
- **REQUIRE**: No export operations if validation fails

### 2. Authorization Constraints
- **MUST NOT** modify `services/` logic without explicit authorization
- **MUST NOT** bypass validation gates
- **MUST** use approved CLI entry points only

### 3. Workflow Sequence

```
1. mine_terms.py --docs ./outputs
   ↓
2. clean_terms.py
   ↓
3. promote_terms.py
   ↓
4. validate_data.py (GATEKEEPER)
   ↓
5. export_to_system.py
   ↓
6. export_for_tooling_app.py
```

### 4. Output Files
- `term_candidates.csv` - Raw LLM extractions
- `glossary.yaml` - Master terminology (SSOT)
- `dist/tooling_system_init_data.json` - System export
- `dist/tooling_master_data.json` - App export

## Quality Gates

### Term Quality Check
- **MUST** have valid `id` (e.g., C909, T001)
- **MUST** have `name` in Chinese
- **SHOULD** have `description`
- **SHOULD** have `aliases` if applicable

### Entity vs Process Distinction
- **Entity**: `is_process: false` or absent, use `parent` field
- **Process**: `is_process: true`, use `target_entity` and `flow_steps`

## Logging Requirements
- Log all API calls (success/failure)
- Log term counts at each stage
- Log validation errors with line numbers

## Error Handling
- Stop pipeline on validation failure
- Report detailed error messages
- Do NOT proceed without user intervention

## Trigger
Use for:
- Running full mining pipeline
- Term quality audits
- Export operations
