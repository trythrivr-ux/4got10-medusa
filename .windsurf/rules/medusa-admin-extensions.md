---
trigger: always_on
---

# Medusa Extension Build Rule

## Purpose

When building Medusa JS extensions, ALWAYS extend Medusa's existing system first.
Do NOT rebuild UI patterns, admin page structures, form shells, or upload infrastructure if Medusa already provides them.

The goal is to create Medusa-native extensions, not parallel custom systems.

---

## Core Principle

Before creating any new structure, check whether Medusa already has:

- an admin widget injection zone
- an existing admin route pattern
- a Medusa UI component
- an admin form pattern
- a built-in file upload flow
- an existing backend API/resource that can be reused
- existing layout primitives from Medusa Admin Components

If any of these exist, USE THEM.

Never build custom replacements for existing Medusa patterns unless the task explicitly requires a new architecture.

---

## Non-Negotiable Rules

### 1. Do not rebuild existing Medusa admin UI

If the feature belongs inside the Medusa admin, prefer:

- Admin widgets
- Admin UI routes
- Medusa Admin Components
- `@medusajs/ui` components

Do NOT create custom standalone admin layouts that duplicate Medusa's built-in admin styling or interaction patterns.

---

### 2. Do not rebuild forms from scratch

When a form is needed, use Medusa's established admin form conventions:

- `FocusModal` for create flows
- `Drawer` for edit/update flows
- `react-hook-form` for form state
- `zod` for validation
- Medusa UI form primitives like `Input`, `Label`, `Button`

Do NOT hand-roll:

- modal systems
- drawer systems
- validation systems
- custom input frameworks

Only compose Medusa's existing building blocks.

---

### 3. Do not rebuild file upload infrastructure

If a form needs image or file upload:

- use Medusa's existing upload/file handling flow
- use the Medusa backend upload APIs/services/modules
- store returned file references/URLs/keys in the relevant entity

Do NOT create a custom upload backend, storage abstraction, or media pipeline if Medusa already supports the upload use case.

---

### 4. Extend, don't replace

When adding custom functionality, inject into Medusa where possible instead of recreating entire screens.

Preferred order:

1. Add a widget to an existing admin injection zone
2. Add a Medusa-style form inside that widget
3. Reuse Medusa backend workflows/resources
4. Only create a custom admin route if the feature truly cannot fit into an existing page

---

### 5. Reuse Medusa data and API structures

Before creating custom endpoints, services, or entities, check whether the use case can be handled by:

- metadata
- existing resources
- existing admin actions
- existing modules/workflows
- file module/provider
- existing product/order/customer structures

Do NOT duplicate API structures that Medusa already has.

Only create a new API route, workflow, service, or module if there is no reasonable Medusa-native extension point.

---

## Decision Framework

Before generating code, follow this exact decision order:

### A. Can this be a widget?

If yes, make it an admin widget.

### B. Can this use an existing injection zone?

If yes, inject into that zone.

### C. Can this use Medusa UI/Admin Components?

If yes, reuse them.

### D. Can this use Medusa's form conventions?

If yes, use:

- `FocusModal` for create
- `Drawer` for edit
- `react-hook-form`
- `zod`

### E. Can this use Medusa's upload system?

If yes, do not invent a custom uploader.

### F. Can this use existing Medusa entities or metadata?

If yes, do not invent a duplicate model.

### G. Only if all answers are no:

create a new custom backend/admin structure.

---

## Required Build Style

When generating Medusa extension code, ALWAYS prefer:

- `src/admin/widgets/...` for injected UI
- `defineWidgetConfig(...)` for widget placement
- Medusa UI components from `@medusajs/ui`
- Medusa-native admin layouts and patterns
- small extension layers on top of existing Medusa features

Generated code should feel like a natural part of Medusa Admin.

---

## Example Rule: Form With Image Upload + Text Fields

If asked to build a form with:

- image upload
- text fields
- save action

DO THIS:

- place it in an admin widget or admin route
- use Medusa UI components for form layout
- use `FocusModal` if it's a create flow
- use `Drawer` if it's an edit flow
- use `react-hook-form` + `zod`
- use Medusa's upload flow for the image
- submit data into existing Medusa resources or metadata when possible

DO NOT:

- build a custom modal from scratch
- build a custom uploader from scratch
- build raw HTML inputs if Medusa UI equivalents exist
- create a new API architecture if Medusa already has the required backend capability

---

## Output Expectations for the AI Agent

Whenever you generate a Medusa extension, you must:

1. Briefly state which Medusa-native primitives are being reused
2. Explain why those primitives were chosen
3. Generate code that integrates with Medusa's existing extension points
4. Avoid redundant custom abstractions
5. Only introduce custom backend structures when strictly necessary

---

## Preferred Component Strategy

Always look for existing Medusa primitives first, including:

- widget injection zones
- `Container`
- `Header`
- `FocusModal`
- `Drawer`
- `Input`
- `Label`
- `Button`

If a Medusa component exists for the job, use it before considering custom UI.

---

## Strict Prohibitions

Never do the following unless explicitly requested and justified:

- recreate admin page shells already provided by Medusa
- recreate form modal/drawer patterns
- recreate basic UI primitives already available in Medusa UI
- recreate upload/file infrastructure
- recreate existing API/entity structures
- introduce a parallel design system inside Medusa Admin

---

## Short Instruction Summary

Build Medusa extensions by composing Medusa's existing widgets, admin routes, UI components, form patterns, and upload infrastructure.
Extend first.
Reuse first.
Inject first.
Only build custom architecture when Medusa has no native extension point for the task.
