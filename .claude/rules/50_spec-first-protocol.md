# Spec-First Development Protocol

## Overview
This rule mandates that before modifying code in any domain, the corresponding specification file must be read and understood first.

## Pre-Modification Checklist

Before editing any code file, you MUST:

1. **Identify the domain** - Determine which technical domain the code belongs to
2. **Locate the spec file** - Look for `specs/{domain_name}.md` or `specs/{NN}_{domain_name}.md`
3. **Read the spec** - Understand the design constraints and requirements
4. **Verify compliance** - Ensure your changes align with the spec

## Spec File Locations

| Domain | Spec File |
|--------|-----------|
| Data/Schema | `specs/01_data_schema.md` |
| Protocols | `specs/02_openclaw_protocols.md` |
| Model Routing | `specs/03_model_routing.md` |
| UI/Interactions | `specs/04_ui_interactions.md` |
| Architecture | `specs/00_master_architecture.md` |

## Missing Spec File Protocol

If the spec file for a domain does NOT exist:
- **STOP** immediately
- Ask the user to provide the specification before proceeding
- Document the missing spec in the request

## Naming Convention for New Specs

When creating new spec files:
- Use 2-digit zero-padded prefix: `NN_domain_name.md`
- Examples: `05_rag_pipeline.md`, `06_authentication.md`
- Keep alphabetical order within the numbering

## Enforcement

This rule is **MANDATORY**. Violations will result in:
1. Immediate halt of code generation
2. Request for spec file creation
3. Re-evaluation of the implementation approach
