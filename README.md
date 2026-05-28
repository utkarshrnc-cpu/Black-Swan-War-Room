# Black Swan War Room

> A CFO crisis-response platform for navigating black-swan events with grounded AI, in minutes instead of weeks.

Built as a PwC hackathon demo for **Meridian Drivetrain Systems, Inc.** — a fictional Tier-1 automotive parts manufacturer ($195M revenue, 6 NA plants, 240 suppliers, FY2026 baseline).

The framing: **the AI proposes; the human disposes.**
The grounding rule: **every $-figure traces to a Databricks query on Datasphere — the LLM narrates but never produces numbers.**

---

## What it does

When a geopolitical or commodity shock hits, the platform compresses the analysis-and-decision cycle from **6 weeks to a single working session**:

- **Cascading Impact Graph** — D3 force-directed propagation across Signal → Suppliers → BOMs → Plants → Budget Lines → P&L outcomes
- **Mitigation Workbench** — three paths (Accept, Compose, Reject) with composable clauses, Monte Carlo P10/P50/P90 bands, OR-Tools-style constraint solver
- **Stakeholder voting** — per-strategy CFO / VP S&C / Procurement / Engineering with CFO veto, plus a Reject-all → AI re-proposes flow that pivots between supply-side and demand/financial/time-buying philosophies
- **Multi-Event Stress Mode** — joint constraints that flip previously-feasible strategies infeasible
- **Counterfactual Replay** — slider showing savings forgone if you'd acted N days earlier
- **Board Pack export** — 4-slide deck (Situation / Options / Recommendation / Financial Impact) as a real `.pptx`
- **Audit Trail** — every action timestamped, exportable as JSON
- **Saved Plays library** — reusable compositions from prior crises (2024 Red Sea, 2023 Steel Tariff)

---

## Tech stack

- **Vite + React 18** (JS, not TS) — single-file architecture: all UI, state, mock data, AI calls, chart logic, D3 graph, drag/drop, Monte Carlo, and pptx export live in `src/App.jsx`
- **Tailwind v4** with `@theme` tokens + CSS variable cascade for runtime theming
- **Zustand** for state
- **D3** (force, selection, zoom) for the cascade graph
- **@dnd-kit/core** for drag-and-drop clause composition
- **recharts** for KPI / donut / bar charts
- **pptxgenjs** for board-pack export
- **lucide-react** for iconography

No backend. All data is mocked and lives in-memory. Refreshing the page resets state by design.

---

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

The app **works without any API key** — Demo Mode is the default. The AI fields gracefully fall back to canned narration when no provider is configured.

### Optional: connect an AI provider

Either drop a key into `.env.local`:

```bash
VITE_CHATPWC_API_KEY=your-key-here
VITE_CHATPWC_BASE_URL=https://genai-sharedservice-americas.pwcinternal.com
VITE_CHATPWC_MODEL=gpt-4o
```

Or click the gear icon in the header and configure **OpenAI**, **Anthropic**, or **Azure OpenAI** directly in the Settings modal. Keys entered there live only in this browser tab — never persisted to `localStorage`, `sessionStorage`, or `IndexedDB`.

---

## Demo flow

1. Boot sequence loads Datasphere connections (~3 sec) → lands in **Steady State**
2. Walk the ambient panels: FY2026 budget donut, supplier risk heatmap, recent activity
3. Open Demo Controls (`Cmd+Shift+D`) → pick an event → **Trigger**
4. Alert banner drops, signal pulses, time-to-decision counter starts
5. Click **Run Impact Analysis** → Response State
6. Cascade graph animates layer by layer
7. Drag clauses from proposed strategies into the **Custom Workspace**
8. Vote: CFO approves → **Apply Custom Strategy**
9. Baseline-vs-Mitigated slider appears; drag to see the recompute
10. Toggle Multi-Event Stress for the compound-shock demo
11. Drag the Counterfactual Replay slider
12. **Generate Board Pack** → downloads a real `.pptx`
13. Open the Audit Drawer → **Save as Play**
14. Time counter reads ~5 min vs. 6-week industry benchmark

---

## Keyboard shortcuts

- `Cmd+Shift+D` / `Ctrl+Shift+D` — toggle Demo Controls panel
- `Esc` — skip boot, close modals

---

## Theming

Two themes ship in the same build:

- **War Room** (default) — cinematic dark palette, severe-orange accents, brutalist hairlines
- **SAC Story** — SAP Analytics Cloud Morning Horizon aesthetic, lighter surfaces, Fiori blue

Toggle from the Demo Controls panel. The theme switch is purely cosmetic — never persisted. Refresh restores War Room.

---

## Notes

- The 60-line operating budget is scaled at module load so the FY26 OpEx total lands at ~$134M against $195M revenue, producing a ~31.2% gross margin (target 32%, –80bps).
- Monte Carlo runs 5,000 triangular-distribution iterations per composition.
- All numeric values trace to a lineage drawer — click any `$` figure's lineage icon to see the simulated Databricks SQL, sample rows, and model card.
- Three-Phase Indicator panel is intentionally honest about Phase 3 (Execute) — the platform compresses analysis and alignment, but execution timelines remain governed by real-world supplier qualification and treasury approval cycles.
