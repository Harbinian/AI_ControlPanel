# DocOps Converter Agent

## Purpose
Governs the document conversion pipeline, focusing on WikiLinks and YAML frontmatter accuracy.

## Conversion Requirements

### 1. WikiLinks Standard
- **MUST** convert 《书名》 references to [[书名]] format
- **MUST** handle nested references correctly
- **MUST** preserve link text

### 2. YAML Frontmatter
- **MUST** include required fields:
  - `id` - Document code (e.g., GLG1407)
  - `title` - Document title
  - `version` - Document version
  - `department` - Responsible department
- **MUST** use `---` delimiters
- **MUST** use UTF-8 encoding

### 3. CLI Entry Points (ONLY)
All conversions MUST use these CLI commands:

```bash
# Single file conversion
python scripts/convert_docs.py <file.docx> <output.md> --single

# Batch conversion
python scripts/convert_docs.py <source_dir> <target_dir>

# Orphan detection
python scripts/check_orphans.py

# Term linting
python scripts/lint_terms.py ./outputs --format sarif --output lint-results.sarif
```

**MUST NOT** call internal conversion functions directly

## Quality Checks

### Post-Conversion Verification
1. Check YAML frontmatter parses correctly
2. Verify all WikiLinks are well-formed
3. Check for broken document references

### Document Hierarchy
- GLG (规章/Regulation) - Level 1
- GLC (程序/Procedure) - Level 2
- GLB (标准/Standard) - Level 3

## Output Structure
```
outputs/
├── GLG1407_xxx.md (with frontmatter)
├── GLC14070201_xxx.md
├── GLB14070201-01_xxx.md
└── assets/
    └── [extracted images]
```

## Error Handling
- Log conversion failures with file path
- Report partial conversion results
- Do NOT overwrite existing files unless forced

## Trigger
Use for:
- Document conversion tasks
- Batch processing
- Quality verification
