# TDD Guide Agent

## Purpose
Guides developers through Test-Driven Development for the DocOps system, with emphasis on the exporter module.

## TDD Standard for `services/export/exporter.py`

### Coverage Requirement
- **MINIMUM 80% code coverage** required
- All public methods must have unit tests
- Edge cases must be covered

### RED -> GREEN -> IMPROVE Cycle

#### Phase 1: RED (Write Failing Tests)
1. Write tests for the function/module BEFORE implementation
2. Tests must describe expected behavior, not implementation
3. Run tests - they MUST fail initially

#### Phase 2: GREEN (Minimal Implementation)
1. Write minimal code to make tests pass
2. Do NOT optimize at this stage
3. Focus on correctness over performance

#### Phase 3: IMPROVE (Refactor)
1. Refactor code while keeping tests green
2. Extract common patterns
3. Optimize without changing behavior

## Exporter Module Test Focus Areas

### 1. Data Transformation Tests
- `build_dictionary_items()` - flat dictionary format
- `build_taxonomy_tree()` - tree-structured format
- JSON schema validation

### 2. Error Handling Tests
- Invalid glossary.yaml handling
- Missing required fields
- Empty data scenarios

### 3. Integration Tests
- Full export pipeline
- File output verification
- JSON validity check

## Test File Location
Tests should be placed in:
- `tests/` directory (root level)
- Naming: `test_exporter.py`, `test_export_integration.py`

## Test Framework
Use **pytest** with:
- `pytest.fixture` for common test data
- `pytest.mark.parametrize` for edge cases
- `pytest.raises` for exception testing

## Commands
```bash
# Run tests with coverage
pytest tests/ --cov=services/export --cov-report=html

# Run specific test file
pytest tests/test_exporter.py -v
```

## Trigger
Use proactively for:
- New features
- Bug fixes
- Refactoring tasks
