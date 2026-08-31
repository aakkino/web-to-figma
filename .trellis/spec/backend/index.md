# Backend Development Guidelines

This project has a narrow backend boundary: a Cloudflare Pages Function proxies
OpenAI-compatible chat requests. The forwarding behavior itself lives in a
shared JavaScript module so local Vite development and Pages deployment share
request forwarding, timeout, status/body, and CORS behavior. Their native
adapters still differ in response-header handling, as documented in the
backend guides.

## Pre-Development Checklist

- Read [Directory Structure](./directory-structure.md) before adding a route
  or server adapter.
- Read [Error Handling](./error-handling.md) when changing proxy responses.
- Read [Quality Guidelines](./quality-guidelines.md) before changing the
  browser-to-proxy contract.
- Read [Logging Guidelines](./logging-guidelines.md) before introducing logs.
- Read [Database Guidelines](./database-guidelines.md) before proposing
  persistence.

## Guides

| Guide | Scope |
| --- | --- |
| [Directory Structure](./directory-structure.md) | Pages route, Vite adapter, and shared proxy placement |
| [Database Guidelines](./database-guidelines.md) | Current absence of persistence |
| [Error Handling](./error-handling.md) | CORS-capable proxy error responses |
| [Logging Guidelines](./logging-guidelines.md) | Current no-logging baseline and secret handling |
| [Quality Guidelines](./quality-guidelines.md) | Tests and cross-environment forwarding contract |
| [Model Routing And Dispatch](./model-routing-and-dispatch.md) | Trellis task routing policy |
| [Harness Migration](./harness-migration.md) | Deterministic plan/apply/verify/rollback and recovery contract |
