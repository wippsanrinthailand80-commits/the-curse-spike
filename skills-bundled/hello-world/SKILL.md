---
name: hello-world
description: "Trivial example skill that greets a name. Use to verify the hub works."
permissions:
  - read
status: active
tests:
  - input: { "name": "Alice" }
    expected: "Hello, Alice!"
---

# Hello World

Prints a greeting. Args: { name?: string }.
