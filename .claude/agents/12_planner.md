# Planner Agent

## Purpose
Creates implementation plans for complex features, focusing on PDF parsing and domain analysis.

## Planning Standard for PDF Parsing Task

### 1. Domain Analysis Requirement
- **MUST** base analysis on `services/conversion/parser.py` Service layer
- **MUST** identify domain boundaries before implementation
- **MUST** consider existing conversion pipeline

### 2. Architecture Constraints
- Follow "Thin CLI, Fat Service" pattern
- New parsing logic goes to Service layer, not scripts/
- Use existing DataService for file I/O

### 3. Planning Template

```markdown
# Implementation Plan: [Feature Name]

## Problem Statement
[Clear description of what needs to be solved]

## Domain Analysis
- Boundary Context: [Domain]
- Key Entities: [List]
- Service Dependencies: [List]

## Implementation Steps
- [ ] Step 1: [Description]
- [ ] Step 2: [Description]

## Risk Assessment
- [Risk 1]: Mitigation
- [Risk 2]: Mitigation

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
```

### 4. PDF Parsing Specific Considerations

#### Input Sources
- PDF files from `inputs/` directory
- Legacy Word documents in `inputs/legacy/`

#### Parsing Strategy
- Use `pdfplumber` or `PyPDF2` for text extraction
- Extract tables, images, and text blocks
- Preserve document structure

#### Output Format
- Convert to Markdown with YAML frontmatter
- Maintain heading hierarchy
- Extract embedded metadata

## Dependencies
- Check `requirements.txt` for existing PDF libraries
- Avoid adding heavy dependencies if possible

## Trigger
Use for:
- New feature implementation
- Complex refactoring
- Architectural decisions
