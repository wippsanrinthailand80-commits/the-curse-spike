---
name: skill-creator
description: "Guide for writing good skills: clear description, when to use, small scope, category-prefix naming, include tests."
permissions:
  - read
status: active
tests: []
---

# Skill Creator

Use this skill when creating or improving a skill.

## Naming
- lowercase kebab-case with a category prefix: `<category>-<action>` (e.g. `git-commit`, `web-search`).

## Description
- Short, specific, says WHEN to use it.

## Scope
- Keep each skill small and focused.

## Tests
- Include example input/expected output in frontmatter `tests`.

## Permissions
- Declare only needed permissions: read, write, network, exec.

## Status
- New skills start `pending` and require human approval before running.
