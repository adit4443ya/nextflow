# NextFlow Assignment — Complete Requirements Checklist
# Run through every item below and verify it exists and works in the codebase.
# Mark each as PASS / FAIL / PARTIAL with a brief note.

## ============================================================
## 1. CORE WORKFLOW INTERFACE (UI/UX)
## ============================================================

### 1.1 Pixel-Perfect UI
- [ ] Dark theme matching Krea.ai — background, layout, spacing, fonts, node designs
- [ ] Animations and scrolling behavior are smooth
- [ ] No visible UI bugs, clipping, or overflow issues

### 1.2 Left Sidebar
- [ ] Collapsible sidebar (expand/collapse toggle works)
- [ ] Search input that filters node types
- [ ] Quick Access section with exactly 6 buttons:
  - [ ] Text Node
  - [ ] Upload Image Node
  - [ ] Upload Video Node
  - [ ] Run LLM Node
  - [ ] Crop Image Node
  - [ ] Extract Frame Node
- [ ] Clicking a button adds the node to the canvas

### 1.3 Right Sidebar
- [ ] Workflow History Panel is present
- [ ] Shows list of all workflow runs with timestamps
- [ ] Collapsible (expand/collapse toggle works)

### 1.4 Workflow Canvas
- [ ] Uses React Flow library (check package.json for @xyflow/react)
- [ ] Dot grid background pattern
- [ ] Smooth panning (drag background)
- [ ] Smooth zooming (scroll wheel)
- [ ] MiniMap visible in bottom-right corner

### 1.5 Responsive Design
- [ ] Layout handles different viewport sizes without breaking
- [ ] Proper overflow handling on sidebars and canvas

## ============================================================
## 2. NODE TYPES (all 6 required)
## ============================================================

### 2.1 Text Node
- [ ] Has a textarea for text input
- [ ] Has an output handle for text data
- [ ] Output updates as user types

### 2.2 Upload Image Node
- [ ] File upload functionality exists (click or drag)
- [ ] Accepts: jpg, jpeg, png, webp, gif
- [ ] Shows image preview after upload
- [ ] Has output handle that provides image URL
- [ ] File upload goes to server (via Transloadit or direct upload API)

### 2.3 Upload Video Node
- [ ] File upload functionality exists
- [ ] Accepts: mp4, mov, webm, m4v
- [ ] Shows video player preview after upload
- [ ] Has output handle that provides video URL
- [ ] File upload goes to server (via Transloadit or direct upload API)

### 2.4 Run LLM Node
- [ ] Model selector dropdown exists with multiple models
- [ ] Has 3 input handles:
  - [ ] system_prompt — accepts connection from Text Node (optional)
  - [ ] user_message — accepts connection from Text Node (required)
  - [ ] images — accepts connection from Image Node(s) (optional, supports multiple)
- [ ] Has 1 output handle: output (text response)
- [ ] Executes via Trigger.dev task (not direct API call from frontend)
- [ ] Results displayed directly ON the LLM node itself (inline, not a separate output node)
- [ ] Node expands or shows response inline after execution

### 2.5 Crop Image Node
- [ ] Accepts image input via handle
- [ ] Has configurable crop parameters: x%, y%, width%, height%
  - [ ] x_percent — optional, default 0
  - [ ] y_percent — optional, default 0
  - [ ] width_percent — optional, default 100
  - [ ] height_percent — optional, default 100
- [ ] All params accept text/number (0-100)
- [ ] Executes via Trigger.dev task
- [ ] Has 1 output handle: output (cropped image URL)

### 2.6 Extract Frame from Video Node
- [ ] Accepts video URL input via handle
- [ ] Has configurable timestamp parameter (seconds or percentage like "50%")
- [ ] Executes via Trigger.dev task
- [ ] Extracts a single frame as image
- [ ] Has 1 output handle: output (extracted frame image URL)

## ============================================================
## 3. AUTHENTICATION (Clerk)
## ============================================================

- [ ] Clerk is the auth provider (check package.json for @clerk/nextjs)
- [ ] Sign In page exists and works (/sign-in)
- [ ] Sign Up page exists and works (/sign-up)
- [ ] Clerk-hosted UI or embedded components used
- [ ] All /workflow routes are protected — redirects to sign-in if not authenticated
- [ ] Middleware file exists (middleware.ts) with route protection
- [ ] Workflows are scoped to authenticated user (userId filter on all DB queries)
- [ ] History is scoped to authenticated user

## ============================================================
## 4. LLM INTEGRATION
## ============================================================

- [ ] LLM API calls work and return responses
- [ ] Vision support — images can be sent as part of prompts
- [ ] System prompts are supported (optional per request)
- [ ] Input chaining — text/image inputs from connected nodes aggregate into the prompt
- [ ] Graceful error display with user-friendly messages (not raw stack traces)
- [ ] Loading states during API calls (spinner visible, button disabled)
- [ ] Running node effect — pulsating glow animation on nodes currently executing

## ============================================================
## 5. TRIGGER.DEV INTEGRATION — "NON-NEGOTIABLE"
## ============================================================

- [ ] Trigger.dev SDK installed (check package.json for @trigger.dev/sdk)
- [ ] trigger.config.ts exists at project root
- [ ] Task files exist in src/trigger/tasks/:
  - [ ] run-llm.ts — task that calls LLM API
  - [ ] crop-image.ts — task that runs image crop operation
  - [ ] extract-frame.ts — task that runs frame extraction
- [ ] Each task uses `task()` from @trigger.dev/sdk/v3
- [ ] Execution engine routes through Trigger.dev (check for tasks.triggerAndPoll or tasks.trigger usage)
- [ ] TRIGGER_SECRET_KEY environment variable is referenced
- [ ] Parallel task execution — independent nodes (no dependencies) trigger concurrently
- [ ] Tasks only await their direct upstream dependencies, not unrelated nodes

## ============================================================
## 6. WORKFLOW FEATURES
## ============================================================

### 6.1 Drag & Drop
- [ ] Nodes can be added from sidebar via click or drag
- [ ] Nodes are draggable on the canvas

### 6.2 Node Connections
- [ ] Output handles connect to input handles
- [ ] Edges are animated (animated purple edges)
- [ ] Connection lines visible between nodes

### 6.3 Configurable Inputs
- [ ] All node parameters configurable via input handles OR manual entry
- [ ] Example: Crop Image x/y/width/height can be connected from other nodes or entered directly

### 6.4 Connected Input State
- [ ] When an input handle has a connection, the corresponding manual input field is disabled/greyed out
- [ ] The value comes from the connected node, not the manual field
- [ ] Visual indication that field is connected (e.g., "● connected" label)

### 6.5 Type-Safe Connections
- [ ] Image outputs cannot connect to text-only inputs (system_prompt, user_message)
- [ ] Text outputs cannot connect to image/video inputs
- [ ] Invalid connections are visually prevented (dragging doesn't snap)
- [ ] Handle colors are coded by data type (e.g., purple=text, green=image, blue=video)

### 6.6 DAG Validation
- [ ] Circular loops/cycles are detected
- [ ] Cycle detection prevents execution (error shown to user)
- [ ] No circular connections allowed

### 6.7 Node Deletion
- [ ] Delete via button on node (visible on hover or always)
- [ ] Delete via keyboard: Delete key or Backspace key
- [ ] Connected edges are also removed when node is deleted

### 6.8 Canvas Navigation
- [ ] Pan — drag background to move canvas
- [ ] Zoom — scroll wheel to zoom in/out
- [ ] Fit view — controls button to fit all nodes in view

### 6.9 MiniMap
- [ ] MiniMap component exists in bottom-right corner
- [ ] Shows overview of all nodes on canvas

### 6.10 Undo/Redo
- [ ] Undo works (Ctrl+Z or Cmd+Z)
- [ ] Redo works (Ctrl+Shift+Z or Cmd+Shift+Z)
- [ ] Applies to node add/delete/move and edge operations

### 6.11 Selective Execution
- [ ] Run a single node only
- [ ] Select multiple nodes and run only those
- [ ] Run the entire workflow
- [ ] Each execution type creates its own history entry
- [ ] History entry shows scope: full/partial/single

### 6.12 Parallel Execution
- [ ] Independent branches in the DAG execute concurrently
- [ ] Nodes only wait for their direct dependencies
- [ ] Nodes without dependencies between them trigger simultaneously
- [ ] Implementation uses topological sort (Kahn's algorithm or similar)

### 6.13 Workflow Persistence
- [ ] Workflows save to PostgreSQL database
- [ ] Workflows load from PostgreSQL database
- [ ] Auto-save on changes (debounced)
- [ ] Workflow data includes: nodes, edges, viewport position

## ============================================================
## 7. WORKFLOW HISTORY (Right Sidebar)
## ============================================================

- [ ] History panel shows list of all workflow runs
- [ ] Each run entry shows:
  - [ ] Timestamp
  - [ ] Status (success/failed/partial) with color coding
  - [ ] Duration
  - [ ] Scope (full/partial/single)
- [ ] Click to expand — shows node-level execution details
- [ ] Node-level details include:
  - [ ] Each node's status (success/failed/running)
  - [ ] Each node's inputs used
  - [ ] Each node's outputs generated
  - [ ] Each node's execution time
- [ ] Partial runs — shows which nodes succeeded even if workflow failed
- [ ] Color-coded status badges: green=success, red=failed, yellow=running
- [ ] All history persists to PostgreSQL database

## ============================================================
## 8. SAMPLE WORKFLOW (Required)
## ============================================================

- [ ] Pre-built sample workflow exists in codebase
- [ ] Loadable via UI (button in toolbar or auto-load)
- [ ] Demonstrates ALL 6 node types
- [ ] Demonstrates parallel execution (two independent branches)
- [ ] Demonstrates convergence point (a node that waits for both branches)
- [ ] Sample workflow is: "Product Marketing Kit Generator"

### Branch A: Image Processing + Product Description
- [ ] Upload Image Node → Crop Image Node
- [ ] Text Node #1 (system prompt) → LLM Node #1
- [ ] Text Node #2 (product details) → LLM Node #1
- [ ] Crop Image output → LLM Node #1 images input
- [ ] LLM Node #1 generates product description

### Branch B: Video Frame Extraction
- [ ] Upload Video Node → Extract Frame Node
- [ ] timestamp set to "50%"

### Convergence: Final Marketing Summary
- [ ] Text Node #3 (social media prompt) → LLM Node #2 system_prompt
- [ ] LLM Node #1 output → LLM Node #2 user_message
- [ ] Crop Image output → LLM Node #2 images
- [ ] Extract Frame output → LLM Node #2 images
- [ ] LLM Node #2 waits for BOTH branches to complete
- [ ] Outputs final marketing post inline on the node

## ============================================================
## 9. TECHNICAL SPECIFICATIONS
## ============================================================

### 9.1 Project Stack (all required)
- [ ] Next.js with App Router (check next.config.ts or next.config.js)
- [ ] TypeScript throughout — strict mode enabled (check tsconfig.json "strict": true)
- [ ] PostgreSQL database — using Neon (check DATABASE_URL in .env.example)
- [ ] Prisma ORM (check prisma/schema.prisma exists)
- [ ] Clerk for authentication
- [ ] React Flow (@xyflow/react in package.json)
- [ ] Trigger.dev (@trigger.dev/sdk in package.json)
- [ ] Tailwind CSS (check tailwind.config.ts)
- [ ] Zustand for state management (check package.json)
- [ ] Zod for schema validation (check package.json)
- [ ] Lucide React for icons (check package.json)

### 9.2 API Routes
- [ ] API routes exist for workflow CRUD (GET, POST, PUT, DELETE)
- [ ] API routes have Zod validation on inputs
- [ ] API routes check authentication (userId from Clerk)
- [ ] Execute endpoint exists: POST /api/workflows/[id]/execute
- [ ] Runs endpoint exists: GET /api/runs

### 9.3 Database Schema
- [ ] Workflow model — id, userId, name, nodes (JSON), edges (JSON), timestamps
- [ ] WorkflowRun model — id, workflowId, userId, status, scope, duration, timestamps
- [ ] NodeRun model — id, workflowRunId, nodeId, nodeType, nodeName, status, inputs, output, error, duration
- [ ] RunStatus enum: RUNNING, SUCCESS, FAILED
- [ ] RunScope enum: FULL, PARTIAL, SINGLE

## ============================================================
## 10. EXPORT/IMPORT
## ============================================================

- [ ] Export workflow as JSON file (download)
- [ ] Import workflow from JSON file (upload)
- [ ] Exported JSON contains nodes and edges
- [ ] Import correctly restores all nodes, edges, positions, and data

## ============================================================
## 11. DEPLOYMENT & SUBMISSION
## ============================================================

- [ ] Deployed on Vercel with working URL
- [ ] All environment variables set on Vercel dashboard
- [ ] Production build succeeds without errors (npm run build)
- [ ] GitHub repository — private repo created
- [ ] GitHub access granted to bluerocketinfo@gmail.com
- [ ] .env.example file exists with all required variable names
- [ ] .gitignore properly excludes node_modules, .env.local, .next

## ============================================================
## 12. DEMO VIDEO CHECKLIST (3-5 minutes covering all of these)
## ============================================================

- [ ] User authentication flow (sign up or sign in)
- [ ] Creating a workflow with all 6 node types
- [ ] Uploading files (image, video) via the upload nodes
- [ ] Running the full workflow and viewing real-time status (pulsating glow on running nodes)
- [ ] Running a single node
- [ ] Running selected nodes
- [ ] Viewing workflow history in right sidebar (showing all run types)
- [ ] Clicking a run to see node-level execution details
- [ ] Export workflow as JSON
- [ ] Import workflow from JSON

## ============================================================
## 13. EDGE CASES & POLISH
## ============================================================

- [ ] Empty workflow — Run All shows helpful error, not crash
- [ ] Missing required inputs — validation error before execution
- [ ] Disconnected nodes — warning shown
- [ ] API key not configured — helpful error message (not raw 500)
- [ ] Large file upload — size limit enforced with friendly error
- [ ] Node with no output connected — still executes without error
- [ ] Multiple runs in quick succession — doesn't corrupt state
- [ ] Page refresh — workflow reloads from database
- [ ] Landing page text matches actual functionality (no "Google Gemini" if only using Groq)