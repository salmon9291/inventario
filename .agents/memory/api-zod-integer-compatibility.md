---
name: API Zod integer compatibility
description: Compatibility constraint for generated validation schemas in this workspace
---

OpenAPI integer fields currently generate `zod.int()` while the installed validator exposes the Zod 3 API, so generated library typechecks fail.

**Why:** The code generator and validator package are on mismatched API generations; preserving integer semantics in server validation avoids a fragile generated-schema workaround.

**How to apply:** For new numeric contracts, prefer number schemas in OpenAPI and enforce integer-only business fields explicitly at the server boundary until the generator/validator versions are aligned.