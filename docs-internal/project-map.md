

# 🗺 KForge Project Map

Location:

D:\kforge\docs-internal\project-map.md

Version: **v24**
Updated: **05/04/2026**

Purpose: architectural topology & execution responsibility map.

---

# 1 Core Application Architecture

## Application Root

File:

src/App.js

Responsibilities:

* canonical message store
* AI request execution
* prompt construction
* retry logic
* project lifecycle
* workspace root management
* layout authority
* AI capability-awareness context injection

This is the **AI execution brain**.

App.js is also the **authority for the current project root**.

---

# 2 AI System Architecture

## Single Message Store

Defined in:

src/App.js

Structure:

```text
messages = [{ id, role, content, ts, action?, actions? }]
```

Everything renders from this.

There are **no duplicate message systems**.

---

## Rendering Surfaces

### Chat Surface

File:

src/ai/panel/AiPanel.jsx

Filtered projection of message store.

Shows:

* assistant messages
* AI messages
* tool-related system messages
* consent prompts

---

### Transcript Surface

File:

src/ai/panel/TranscriptPanel.jsx

Full system log.

Includes:

* user
* assistant
* system
* tool messages

Contains Retry + Clear controls.

---

# 3 Tool Runtime Architecture

## Tool Detection

File:

src/ai/panel/AiPanel.jsx

Detects:

* JSON tool payloads
* XML tool payloads
* fenced tool blocks
* natural-language tool calls (fallback for weaker models)

Triggers runtime execution.

---

## Tool Runtime Wrapper

File:

src/ai/tools/toolRuntime.js

Handles:

* consent gating
* lifecycle events
* result formatting
* transcript logging
* error handling

Runtime flow:

```text
detect tool
→ consent
→ handler execution
→ result appended
```

---

## Tool Schemas (Model Interface)

File:

src/ai/tools/toolSchema.js

Defines the **model-visible tool interface**.

Responsibilities:

* tool names
* tool descriptions
* parameter shapes

Purpose:

Ensure the model receives a **clean and controlled tool inventory**.

---

## Tool Handlers

File:

src/ai/tools/handlers/index.js

Current tools:

* read_file
* write_file
* list_dir
* search_in_file
* mkdir

Filesystem layer:

src/lib/fs.js

Ensures project-root safety.

---

# 3a Agent Runtime (Phase 4.10)

Files:

src/ai/agent/agentRunner.js
src/ai/panel/AiPanel.jsx

Phase 4.10 introduced a **tool-calling agent loop**.

The runtime now supports **multi-step reasoning with tools**.

Execution flow:

```text
assistant reasoning
→ tool request
→ runtime executes tool
→ result returned to model
→ model continues reasoning
→ final response
```

Important rule:

The agent loop **does not bypass the existing runtime**.

All tool execution still flows through:

src/ai/tools/toolRuntime.js

---

# 3b Agent Hardening (Phase 4.10.1)

Phase 4.10.1 improved reliability when using weaker models.

Primary files:

src/ai/panel/AiPanel.jsx
src/ai/agent/agentRunner.js

Improvements include:

* natural-language tool-call fallback parsing
* duplicate tool-call suppression
* injection of tool results into continuation prompts
* prevention of runaway directory exploration
* stricter consent handling for write operations
* transcript noise reduction

---

# 3c Preview Runner

Backend:

src-tauri/src/preview.rs

Frontend bridge:

src/runtime/previewRunner.js

UI:

src/runtime/PreviewPanel.jsx

Capabilities:

* dependency installation
* dev server startup
* static preview server
* log streaming
* preview URL detection
* controlled process shutdown
* template detection

---

# 3d Template Registry / Scaffold System

Registry:

src/runtime/templateRegistry.js

Backend:

src-tauri/src/scaffold.rs

UI:

src/runtime/PreviewPanel.jsx

Current templates:

* static-html
* vite-react
* nextjs

Scaffold commands:

* scaffold_static_html
* scaffold_vite_react
* scaffold_nextjs

---

# 4 Command Runner Architecture

Backend:

src-tauri/src/command_runner.rs

Frontend bridge:

src/runtime/commandRunner.js

UI:

src/runtime/CommandRunnerPanel.jsx

Capabilities:

* run shell commands inside project root
* stream stdout/stderr
* Windows compatibility (`cmd /C`)

Events:

```
kforge://command/log
kforge://command/status
```

User-facing label:

**Terminal**

---

# 5 Service Integration Layer

Backend:

src-tauri/src/service.rs

Frontend bridge:

src/runtime/serviceRunner.js

Registry:

src/runtime/serviceRegistry.js

UI:

src/runtime/ServicePanel.jsx

Pattern:

```
registry entry
+ adapter implementation
```

This allows integrations to plug into a **shared service execution pipeline**.

---

# 5a GitHub Adapter

Capabilities:

* detect Git repository
* detect remote
* publish repository
* open repository
* push changes
* pull changes
* GitHub import during project creation

Authentication handled via:

```
GitHub CLI (gh)
```

---

# 5b Supabase Adapter

Capabilities:

* readiness inspection
* `.env` helpers
* client install
* client file generation
* Quick Connect
* read / insert example generation
* query helper generation

Generated artifacts:

```
src/lib/supabase.js
src/examples/supabaseExample.js
src/examples/supabaseInsertExample.js
src/lib/supabaseQueries.js
```

---

# 5c Stripe Adapter

Capabilities:

* Stripe setup inspection
* `.env` helpers
* dashboard handoff
* docs handoff
* webhook-readiness guidance

Environment variables detected:

```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

---

# 5d OpenAI Adapter (Phase 5.3)

Primary implementation:

src-tauri/src/service.rs

UI:

src/runtime/ServicePanel.jsx

Frontend bridge:

src/runtime/serviceRunner.js

Registry:

src/runtime/serviceRegistry.js

Purpose:

Provide a **guided AI integration workflow**.

Path:

```
Services
→ AI
→ OpenAI
```

Capabilities currently implemented:

* Check OpenAI setup
* Create `.env` file
* Install OpenAI SDK (`pnpm add openai`)
* Create OpenAI client file

Generated artifact:

```
src/lib/openai.js
```

Example client:

```javascript
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
});
```

The adapter allows projects to move from:

```
AI idea
→ SDK installed
→ reusable OpenAI client
```

Future extension:

Phase **5.3.3 — Generate AI Example**

---

# 6 AI Capability Awareness System

Primary files:

```
src/ai/capabilities/kforgeCapabilities.js
src/ai/capabilities/kforgeServiceWorkflows.js
src/ai/capabilities/kforgePreviewWorkflows.js
src/ai/capabilities/kforgeTerminalWorkflows.js
src/ai/capabilities/discoverCapabilities.js
```

Purpose:

Teach the AI about **real KForge workflows**.

AI can guide users toward:

* Services workflows
* Preview workflows
* Terminal workflows

Discovery sources:

```
serviceRegistry.js
templateRegistry.js
```

---

# 7 Layout / Dock Architecture

Dock controller:

```
src/layout/DockShell.jsx
```

Modes:

```
bottom
full
```

Meaning:

```
bottom → dock below workspace
full → focus mode
```

Focus mode is a **surface promotion**.

---

# 8 Operational Flow Map

## Standard Dev Flow

```
Open folder
→ Generate template (optional)
→ Install
→ Preview
→ Open
→ Iterate
```

---

## AI Editing Flow

```
Open folder
→ prompt AI
→ AI edits files
→ preview / rerun
```

---

## Agent Flow

```
Open folder
→ prompt AI
→ AI requests tools
→ tools execute
→ AI continues reasoning
→ final answer
```

---

## Backend Flow

```
Open folder
→ Services
→ Backend → Supabase
→ guided setup
```

---

## Payments Flow

```
Open folder
→ Services
→ Payments → Stripe
→ guided setup
```

---

## AI Integration Flow

```
Open folder
→ Services
→ AI → OpenAI
→ check setup
→ create .env
→ install SDK
→ create client
→ generate AI example (future)
```

---

# 9 Stable Milestone Summary

Current milestone includes:

* AI message architecture
* tool runtime
* agent runtime
* preview runner
* scaffold system
* command runner
* terminal panel
* service integration layer
* GitHub adapter
* deploy guidance
* Supabase integration
* Supabase Developer Assist
* Stripe adapter
* Stripe webhook-readiness guidance
* OpenAI adapter foundation
* OpenAI SDK installation
* OpenAI client generation
* per-service log isolation
* AI capability-awareness system
* workflow-aware AI guidance

---

# 10 Next Architecture Lane

Next roadmap phases:

```
Phase 5.3.3 — Generate OpenAI AI Example
Phase 5.4 — Future Template Expansion
```

Possible future integrations:

* Firebase
* Clerk
* Auth0
* Vercel API integration
* Netlify API integration

Longer term:

```
Phase 6 — Model Routing & Guidance
```

---

