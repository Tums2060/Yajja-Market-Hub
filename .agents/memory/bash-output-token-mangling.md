---
name: bash/rg output token mangling
description: bash tool's stdout redacts/replaces certain identifier tokens; trust the read tool for accurate file contents
---

The `bash` tool's stdout (including `rg`/`grep`/`cat` output) sometimes replaces
certain identifier tokens with short stand-ins like `n` or `ln`. Observed:
`Route`→`ln`, `Switch`→`ln`, `uploads`→`n`, `multer`→`n`, `import`→`import` (intact).
This made App.tsx look like `<ln path=...>` and api-server look like `const n = n({...})`.

**This is a display artifact in the bash output channel, NOT real file corruption.**
The same files render correctly via the `read` tool.

**Why:** A redaction/transform layer mangles the bash stdout stream for some tokens.

**How to apply:** When `rg`/`bash` output of source looks garbled or has suspicious
single-letter identifiers, do not "fix" the file. Re-open it with the `read` tool to
see the true contents before editing.
