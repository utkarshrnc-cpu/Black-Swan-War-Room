/**
 * Black Swan War Room v3 — Demo Flow
 *
 * 0:00–0:15  Boot sequence runs, lands in Steady State
 * 0:15–1:30  Steady State walkthrough — point at ambient panels, click a number for lineage
 * 1:30–2:00  Alert fires via demo controls (Cmd+Shift+D → Strait of Hormuz → Trigger)
 *            Signal pulses, banner drops, time counter starts
 * 2:00–3:30  Click "Run Impact Analysis" → Response State
 *            Cascading Impact Graph animates, click node for lineage
 * 3:30–6:00  Mitigation Workbench — drag clauses to compose custom strategy
 *            Stakeholder votes Approve, click "Apply Custom Strategy"
 * 6:00–6:45  Baseline-vs-Mitigated slider appears, drag to show recompute
 * 6:45–7:30  Toggle Multi-Event Stress Mode for compound-shock demo
 * 7:30–8:30  Drag Counterfactual Replay slider, click "Generate Board Pack"
 * 8:30–9:00  Open Audit Drawer, click "Save as Play"
 * 9:00–9:30  Time counter reads ~5 min vs. 6-week benchmark — close
 *
 * The framing: "The AI proposes; the human disposes."
 * The grounding rule: every $-figure traces to a Databricks query on Datasphere.
 *
 * Three workbench paths (all functional, demo emphasizes Path B):
 *   A · Accept-as-is  — select a proposed card, CFO approves, Apply Selected Strategy
 *   B · Compose       — drag clauses to Custom Workspace, CFO approves, Apply Custom Strategy
 *   C · Reject        — reject all primary proposals, AI re-proposes alternative set
 *                       (demand-side / financial / time-buying philosophies)
 *
 * Architecture: single-file React app — all UI, state, mock data, AI calls,
 * chart logic, D3 graph, drag/drop, Monte Carlo, pptx export — in src/App.jsx.
 * Three-mode war room: Steady → Alert → Response.
 * LLM narrates; it never produces numbers.
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect
} from 'react';
import { create } from 'zustand';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts';
import * as d3 from 'd3';
import {
  AlertTriangle, Activity, ArrowRight, ArrowUpRight, ArrowDownRight,
  Database, Bot, Zap, Clock, CheckCircle2, XCircle, Circle, Layers,
  Play, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, X, Send,
  Search, FileText, Download, Save, ShieldCheck, ShieldAlert,
  TrendingDown, TrendingUp, Building2, Factory, Truck, Globe2,
  Sparkles, Settings, BookOpen, GitBranch, Loader2, Radio,
  ThumbsUp, ThumbsDown, MinusCircle, FlaskConical, Network, Gauge,
  History, Sliders, ListChecks, Power, Eye, Users, Wrench
} from 'lucide-react';
import PptxGenJS from 'pptxgenjs';
import {
  DndContext, useDraggable, useDroppable, DragOverlay,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core';

/* ============================================================================
 * SECTION 1: CONSTANTS / THEME TOKENS
 * ========================================================================== */

// All colors below are CSS var() references so inline styles re-theme
// automatically when document.documentElement.dataset.theme flips.
const COLORS = {
  ink50:        'var(--color-ink-50)',
  ink100:       'var(--color-ink-100)',
  ink200:       'var(--color-ink-200)',
  ink300:       'var(--color-ink-300)',
  ink400:       'var(--color-ink-400)',
  ink500:       'var(--color-ink-500)',
  ink600:       'var(--color-ink-600)',
  ink700:       'var(--color-ink-700)',
  paper50:      'var(--color-paper-50)',
  paper100:     'var(--color-paper-100)',
  paper200:     'var(--color-paper-200)',
  paper300:     'var(--color-paper-300)',
  paper400:     'var(--color-paper-400)',
  paper500:     'var(--color-paper-500)',
  paper600:     'var(--color-paper-600)',
  severe:       'var(--color-severe)',
  severeSoft:   'var(--color-severe-soft)',
  amber:        'var(--color-amber)',
  amberSoft:    'var(--color-amber-soft)',
  critical:     'var(--color-critical)',
  criticalSoft: 'var(--color-critical-soft)',
  stable:       'var(--color-stable)',
  stableSoft:   'var(--color-stable-soft)',
  info:         'var(--color-info)',
  infoSoft:     'var(--color-info-soft)',
  // Semantic role aliases
  primary:      'var(--color-primary)',
  positive:     'var(--color-positive)',
  negative:     'var(--color-negative)',
  textPrimary:  'var(--color-text-primary)',
  textInverse:  'var(--color-text-inverse)',
  bgCanvas:     'var(--color-bg-canvas)',
  bgSurface:    'var(--color-bg-surface)',
};

// Resolved hex palettes by theme — used where SVG attributes need literal colors
// (recharts <Cell fill="...">, d3 stop-color in gradients without inline style, etc.)
const CHART_PALETTES = {
  'war-room': [
    '#ea580c', '#f59e0b', '#06b6d4', '#10b981', '#8b5cf6',
    '#ec4899', '#3b82f6', '#f43f5e', '#84cc16', '#14b8a6', '#a855f7',
  ],
  'sac-story': [
    '#5D87BA', '#F8B135', '#76C5BF', '#C7A2D2', '#E89BAB',
    '#4A6786', '#93C36A', '#F58D7C', '#5D87BA', '#76C5BF', '#C7A2D2',
  ],
};

// Cascading impact graph layer colors (resolved hex per theme) — see CASCADE_LAYERS
const CASCADE_PALETTES = {
  'war-room': {
    0: '#ea580c', // signal
    1: '#f59e0b', // suppliers
    2: '#fbbf24', // BOMs
    3: '#06b6d4', // plants
    4: '#8b5cf6', // budget lines
    5: '#dc2626', // P&L
    joint: '#dc2626',
    nodeStroke: '#0a0a0b',
  },
  'sac-story': {
    0: '#BB0000', // signal (negative red)
    1: '#E76500', // suppliers (critical orange)
    2: '#F8B135', // BOMs (amber)
    3: '#5D87BA', // plants (mid blue)
    4: '#4A6786', // budget lines (deep slate)
    5: '#BB0000', // P&L (negative red)
    joint: '#BB0000',
    nodeStroke: '#FFFFFF',
  },
};

// Backwards-compat alias used by BudgetPanel
const CATEGORY_PALETTE = CHART_PALETTES['war-room'];

/* ============================================================================
 * SECTION 2: MOCK DATA — Auto Parts Manufacturer
 * Revenue $195M · 6 NA plants · 2,400 employees · 240 suppliers · FY2026
 * ========================================================================== */

const COMPANY = {
  name: 'Meridian Drivetrain Systems, Inc.',
  ticker: 'NYSE: MDS (private; mock)',
  revenue: 195_000_000,
  fy: 'FY2026',
  targets: {
    grossMargin: 0.32,
    ebitdaMargin: 0.145,
    debtToEbitdaMax: 2.5,
    wacc: 0.092,
    hedgeCoverage: 0.70,
  },
  plants: [
    { id: 'DET', city: 'Detroit',   state: 'MI', country: 'US', capacity: 0.92, headcount: 480 },
    { id: 'TOL', city: 'Toledo',    state: 'OH', country: 'US', capacity: 0.87, headcount: 360 },
    { id: 'MTY', city: 'Monterrey', state: 'NL', country: 'MX', capacity: 0.95, headcount: 620 },
    { id: 'SAL', city: 'Saltillo',  state: 'CO', country: 'MX', capacity: 0.88, headcount: 450 },
    { id: 'WDS', city: 'Windsor',   state: 'ON', country: 'CA', capacity: 0.83, headcount: 270 },
    { id: 'KNX', city: 'Knoxville', state: 'TN', country: 'US', capacity: 0.79, headcount: 220 },
  ],
};

const BUDGET_CATEGORIES = [
  { id: 'raw',     name: 'Raw Materials',     color: CATEGORY_PALETTE[0] },
  { id: 'comp',    name: 'Components',        color: CATEGORY_PALETTE[1] },
  { id: 'labor',   name: 'Direct Labor',      color: CATEGORY_PALETTE[2] },
  { id: 'maint',   name: 'Maintenance',       color: CATEGORY_PALETTE[3] },
  { id: 'log',     name: 'Logistics',         color: CATEGORY_PALETTE[4] },
  { id: 'qual',    name: 'Quality',           color: CATEGORY_PALETTE[5] },
  { id: 'indir',   name: 'Indirect',          color: CATEGORY_PALETTE[6] },
  { id: 'over',    name: 'Overhead',          color: CATEGORY_PALETTE[7] },
  { id: 'rd',      name: 'R&D',               color: CATEGORY_PALETTE[8] },
  { id: 'sm',      name: 'Sales & Marketing', color: CATEGORY_PALETTE[9] },
  { id: 'trade',   name: 'Trade Costs',       color: CATEGORY_PALETTE[10] },
];

// 60-line operating budget. Numbers sum to ~$135M.
const BUDGET_LINES = [
  // Raw Materials (12 lines) — heavy steel/aluminum/copper exposure
  { id: 'RM-001', cat: 'raw',   name: 'Hot-rolled steel coil',        fy25: 18_400_000, esc: 0.062, sap: 'S/4 GL 511010', risk: 'commodity-steel'  },
  { id: 'RM-002', cat: 'raw',   name: 'Aluminum extrusions',          fy25: 8_900_000,  esc: 0.041, sap: 'S/4 GL 511020', risk: 'commodity-alu'    },
  { id: 'RM-003', cat: 'raw',   name: 'Copper rod / busbar',          fy25: 4_200_000,  esc: 0.078, sap: 'S/4 GL 511030', risk: 'commodity-cu'     },
  { id: 'RM-004', cat: 'raw',   name: 'Engineering polymers (PA66)',  fy25: 3_600_000,  esc: 0.032, sap: 'S/4 GL 511040', risk: 'oil-derivative'   },
  { id: 'RM-005', cat: 'raw',   name: 'Synthetic rubber compounds',   fy25: 2_700_000,  esc: 0.049, sap: 'S/4 GL 511050', risk: 'oil-derivative'   },
  { id: 'RM-006', cat: 'raw',   name: 'Foundry sand & binders',       fy25: 1_400_000,  esc: 0.024, sap: 'S/4 GL 511060', risk: 'commodity'        },
  { id: 'RM-007', cat: 'raw',   name: 'Magnesium ingots',             fy25: 1_900_000,  esc: 0.055, sap: 'S/4 GL 511070', risk: 'commodity'        },
  { id: 'RM-008', cat: 'raw',   name: 'Lubricants & cutting fluids',  fy25: 2_100_000,  esc: 0.038, sap: 'S/4 GL 511080', risk: 'oil-derivative'   },
  { id: 'RM-009', cat: 'raw',   name: 'Industrial gases',             fy25: 1_300_000,  esc: 0.027, sap: 'S/4 GL 511090', risk: 'commodity'        },
  { id: 'RM-010', cat: 'raw',   name: 'Adhesives & sealants',         fy25: 1_100_000,  esc: 0.029, sap: 'S/4 GL 511100', risk: 'standard'         },
  { id: 'RM-011', cat: 'raw',   name: 'Surface treatment chemicals',  fy25: 900_000,    esc: 0.034, sap: 'S/4 GL 511110', risk: 'standard'         },
  { id: 'RM-012', cat: 'raw',   name: 'Brazing alloys',               fy25: 750_000,    esc: 0.045, sap: 'S/4 GL 511120', risk: 'commodity'        },

  // Components (10)
  { id: 'CO-001', cat: 'comp',  name: 'Bearings & bushings',          fy25: 7_400_000,  esc: 0.036, sap: 'S/4 GL 512010', risk: 'asia-routing'    },
  { id: 'CO-002', cat: 'comp',  name: 'Electronic control modules',   fy25: 6_800_000,  esc: 0.052, sap: 'S/4 GL 512020', risk: 'semiconductor'   },
  { id: 'CO-003', cat: 'comp',  name: 'Forged steel gears',           fy25: 5_900_000,  esc: 0.044, sap: 'S/4 GL 512030', risk: 'commodity-steel' },
  { id: 'CO-004', cat: 'comp',  name: 'Hydraulic seals',              fy25: 2_300_000,  esc: 0.029, sap: 'S/4 GL 512040', risk: 'oil-derivative'  },
  { id: 'CO-005', cat: 'comp',  name: 'Fasteners (Tier-2)',           fy25: 1_700_000,  esc: 0.022, sap: 'S/4 GL 512050', risk: 'standard'        },
  { id: 'CO-006', cat: 'comp',  name: 'Wire harness assemblies',      fy25: 4_100_000,  esc: 0.039, sap: 'S/4 GL 512060', risk: 'mexico-labor'    },
  { id: 'CO-007', cat: 'comp',  name: 'Stamped sheet metal',          fy25: 3_400_000,  esc: 0.041, sap: 'S/4 GL 512070', risk: 'commodity-steel' },
  { id: 'CO-008', cat: 'comp',  name: 'Plastic injection molded',     fy25: 2_900_000,  esc: 0.033, sap: 'S/4 GL 512080', risk: 'oil-derivative'  },
  { id: 'CO-009', cat: 'comp',  name: 'Sensors (Hall / pressure)',    fy25: 2_200_000,  esc: 0.048, sap: 'S/4 GL 512090', risk: 'semiconductor'   },
  { id: 'CO-010', cat: 'comp',  name: 'Heat exchangers',              fy25: 1_800_000,  esc: 0.037, sap: 'S/4 GL 512100', risk: 'commodity-cu'    },

  // Direct Labor (4)
  { id: 'LB-001', cat: 'labor', name: 'Production labor — US',        fy25: 11_200_000, esc: 0.048, sap: 'S/4 GL 521010', risk: 'wage-pressure'   },
  { id: 'LB-002', cat: 'labor', name: 'Production labor — MX',        fy25: 6_800_000,  esc: 0.072, sap: 'S/4 GL 521020', risk: 'wage-pressure'   },
  { id: 'LB-003', cat: 'labor', name: 'Production labor — CA',        fy25: 2_400_000,  esc: 0.039, sap: 'S/4 GL 521030', risk: 'wage-pressure'   },
  { id: 'LB-004', cat: 'labor', name: 'Overtime premium',             fy25: 1_900_000,  esc: 0.045, sap: 'S/4 GL 521040', risk: 'capacity'        },

  // Maintenance (5)
  { id: 'MT-001', cat: 'maint', name: 'Spare parts & MRO',            fy25: 3_200_000,  esc: 0.031, sap: 'S/4 GL 531010', risk: 'standard'        },
  { id: 'MT-002', cat: 'maint', name: 'External maintenance svc',     fy25: 1_900_000,  esc: 0.035, sap: 'S/4 GL 531020', risk: 'standard'        },
  { id: 'MT-003', cat: 'maint', name: 'Tooling refurbishment',        fy25: 1_400_000,  esc: 0.028, sap: 'S/4 GL 531030', risk: 'standard'        },
  { id: 'MT-004', cat: 'maint', name: 'Facility maintenance',         fy25: 1_100_000,  esc: 0.025, sap: 'S/4 GL 531040', risk: 'standard'        },
  { id: 'MT-005', cat: 'maint', name: 'IT / OT system maintenance',   fy25: 850_000,    esc: 0.042, sap: 'S/4 GL 531050', risk: 'standard'        },

  // Logistics (7)
  { id: 'LG-001', cat: 'log',   name: 'Ocean freight — inbound',      fy25: 4_300_000,  esc: 0.064, sap: 'TM Lane 4012',   risk: 'ocean-freight'  },
  { id: 'LG-002', cat: 'log',   name: 'Trucking — domestic',          fy25: 6_200_000,  esc: 0.041, sap: 'TM Lane 4013',   risk: 'fuel-diesel'    },
  { id: 'LG-003', cat: 'log',   name: 'Air freight — expedites',      fy25: 1_400_000,  esc: 0.058, sap: 'TM Lane 4014',   risk: 'fuel-jet'       },
  { id: 'LG-004', cat: 'log',   name: 'Customs & brokerage',          fy25: 920_000,    esc: 0.024, sap: 'TM Lane 4015',   risk: 'tariff'         },
  { id: 'LG-005', cat: 'log',   name: 'Warehouse & 3PL',              fy25: 2_700_000,  esc: 0.038, sap: 'TM Lane 4016',   risk: 'standard'       },
  { id: 'LG-006', cat: 'log',   name: 'Rail — bulk inbound',          fy25: 1_300_000,  esc: 0.033, sap: 'TM Lane 4017',   risk: 'fuel-diesel'    },
  { id: 'LG-007', cat: 'log',   name: 'Insurance — cargo / marine',   fy25: 680_000,    esc: 0.094, sap: 'TM Lane 4018',   risk: 'geopolitical'   },

  // Quality (3)
  { id: 'QL-001', cat: 'qual',  name: 'Inspection & metrology',       fy25: 1_700_000,  esc: 0.032, sap: 'S/4 GL 541010', risk: 'standard'        },
  { id: 'QL-002', cat: 'qual',  name: 'Warranty reserve',             fy25: 2_400_000,  esc: 0.045, sap: 'S/4 GL 541020', risk: 'liability'       },
  { id: 'QL-003', cat: 'qual',  name: 'Quality systems / audits',     fy25: 540_000,    esc: 0.029, sap: 'S/4 GL 541030', risk: 'standard'        },

  // Indirect (5)
  { id: 'ID-001', cat: 'indir', name: 'Salaried staff — plants',      fy25: 8_900_000,  esc: 0.039, sap: 'S/4 GL 551010', risk: 'wage-pressure'   },
  { id: 'ID-002', cat: 'indir', name: 'Benefits & pension',           fy25: 5_400_000,  esc: 0.057, sap: 'S/4 GL 551020', risk: 'inflation'       },
  { id: 'ID-003', cat: 'indir', name: 'Training & development',       fy25: 720_000,    esc: 0.028, sap: 'S/4 GL 551030', risk: 'standard'        },
  { id: 'ID-004', cat: 'indir', name: 'Travel & expenses',            fy25: 1_100_000,  esc: 0.034, sap: 'S/4 GL 551040', risk: 'fuel'            },
  { id: 'ID-005', cat: 'indir', name: 'Telecom & IT services',        fy25: 1_900_000,  esc: 0.029, sap: 'S/4 GL 551050', risk: 'standard'        },

  // Overhead (5)
  { id: 'OV-001', cat: 'over',  name: 'Utilities — electric',         fy25: 3_800_000,  esc: 0.051, sap: 'S/4 GL 561010', risk: 'energy'          },
  { id: 'OV-002', cat: 'over',  name: 'Utilities — natural gas',      fy25: 2_300_000,  esc: 0.083, sap: 'S/4 GL 561020', risk: 'energy'          },
  { id: 'OV-003', cat: 'over',  name: 'Property tax & insurance',     fy25: 1_900_000,  esc: 0.041, sap: 'S/4 GL 561030', risk: 'standard'        },
  { id: 'OV-004', cat: 'over',  name: 'Lease / depreciation',         fy25: 4_700_000,  esc: 0.022, sap: 'S/4 GL 561040', risk: 'standard'        },
  { id: 'OV-005', cat: 'over',  name: 'Environmental compliance',     fy25: 920_000,    esc: 0.046, sap: 'S/4 GL 561050', risk: 'regulatory'      },

  // R&D (3)
  { id: 'RD-001', cat: 'rd',    name: 'EV powertrain R&D',            fy25: 3_400_000,  esc: 0.062, sap: 'S/4 GL 571010', risk: 'strategic'       },
  { id: 'RD-002', cat: 'rd',    name: 'Materials science research',   fy25: 1_800_000,  esc: 0.048, sap: 'S/4 GL 571020', risk: 'strategic'       },
  { id: 'RD-003', cat: 'rd',    name: 'Engineering software / CAE',   fy25: 1_200_000,  esc: 0.034, sap: 'S/4 GL 571030', risk: 'standard'        },

  // Sales & Marketing (3)
  { id: 'SM-001', cat: 'sm',    name: 'Sales force — OEM',            fy25: 4_200_000,  esc: 0.041, sap: 'S/4 GL 581010', risk: 'standard'        },
  { id: 'SM-002', cat: 'sm',    name: 'Trade shows & marketing',      fy25: 850_000,    esc: 0.028, sap: 'S/4 GL 581020', risk: 'standard'        },
  { id: 'SM-003', cat: 'sm',    name: 'Customer engineering support', fy25: 1_400_000,  esc: 0.039, sap: 'S/4 GL 581030', risk: 'standard'        },

  // Trade Costs (3)
  { id: 'TR-001', cat: 'trade', name: 'Tariffs & duties — China',     fy25: 1_900_000,  esc: 0.142, sap: 'Ariba T-CN',     risk: 'tariff'         },
  { id: 'TR-002', cat: 'trade', name: 'Tariffs & duties — Mexico',    fy25: 420_000,    esc: 0.038, sap: 'Ariba T-MX',     risk: 'tariff-usmca'   },
  { id: 'TR-003', cat: 'trade', name: 'Currency hedging premium',     fy25: 680_000,    esc: 0.072, sap: 'BDC FX',         risk: 'fx'             },
];

// Normalize FY25 totals so FY26 OpEx lands near $134M against $195M revenue —
// yielding ~31.2% Gross Margin (target 32%, -80bps to target per KPI strip text).
// Preserves relative proportions across the 60 lines.
// Without this scaling, raw values summed to ~$186M and crushed Gross Margin to 0%.
{
  const TARGET_FY26_OPEX = 134_000_000;
  const avgEsc = BUDGET_LINES.reduce((s, l) => s + l.esc, 0) / BUDGET_LINES.length;
  const rawTotal = BUDGET_LINES.reduce((s, l) => s + l.fy25, 0);
  const targetFy25 = TARGET_FY26_OPEX / (1 + avgEsc);
  const scale = targetFy25 / rawTotal;
  BUDGET_LINES.forEach(l => { l.fy25 = Math.round(l.fy25 * scale); });
}

// Pre-compute baseline (FY2026)
BUDGET_LINES.forEach(l => {
  l.fy26 = Math.round(l.fy25 * (1 + l.esc));
});

const BUDGET_TOTAL_FY26 = BUDGET_LINES.reduce((s, l) => s + l.fy26, 0);
const BUDGET_TOTAL_FY25 = BUDGET_LINES.reduce((s, l) => s + l.fy25, 0);

// ---------- 240 suppliers ----------
const REGIONS = {
  NA: { name: 'North America', cities: [['Detroit','US'],['Cleveland','US'],['Pittsburgh','US'],['Toledo','US'],['Monterrey','MX'],['Saltillo','MX'],['Windsor','CA'],['Toronto','CA'],['Knoxville','US'],['Houston','US']] },
  EU: { name: 'Europe',        cities: [['Stuttgart','DE'],['Munich','DE'],['Düsseldorf','DE'],['Milan','IT'],['Turin','IT'],['Lyon','FR'],['Liverpool','UK'],['Madrid','ES'],['Brno','CZ'],['Gdansk','PL']] },
  AS: { name: 'Asia',          cities: [['Shanghai','CN'],['Guangzhou','CN'],['Suzhou','CN'],['Tianjin','CN'],['Busan','KR'],['Ulsan','KR'],['Nagoya','JP'],['Osaka','JP'],['Bangkok','TH'],['Ho Chi Minh','VN'],['Chennai','IN'],['Pune','IN']] },
  ME: { name: 'Middle East',   cities: [['Dubai','AE'],['Doha','QA'],['Jeddah','SA'],['Manama','BH']] },
};

const SUPPLIER_NAMES_BY_REGION = {
  NA: ['Westshore Forge','Lakeshore Metals','Great Lakes Alloy','Anchor Bearings','Riverbend Components','Apex Drivetrain','Stonecreek Tool','Northern Castings','Concordia Polymers','Pinnacle Stampings','Cascade Industrial','Foundry Hills','Ironworks Group','Continental Wire','Vanguard Sensors','Magnolia Hydraulics','Cardinal Electronics','Summit Forge','Hudson Fasteners','Granite Foundry'],
  EU: ['Bauer-Müller GmbH','Rheingruppe AG','Brennero Componenti','Lyonnaise Métaux','Reichsmann Stahl','Schwarzwald Castings','Stratos Hellenic','Vermes Hungaria','Lübeck Maritime','Frigus Polska','Iberforge SA','Acciaio Italiana','Brescia Components','Kortrijk Polymers','Östra Bearings','Vasa Industries','Krakow Stampings','Salzburg Sensors','Genova Hydraulics','Wittenberg Tool'],
  AS: ['Yangzhou Precision','Baosteel Components','Suzhou Metalcraft','Tianjin Drivetrain','Hyundai Mobis Tier','Daehwa Forging','Komatsu Bearings','Aichi Stamping','Mitsuba Wire','Toyo Polymers','Bangkok Diecast','Saigon Components','Chennai Castings','Pune Forge Works','Guangzhou Sensors','Shenzhen Electronics','Jiangsu Hydraulics','Bharat Steel','Wuxi Tooling','Qingdao Industrial'],
  ME: ['Gulf Steel Industries','Doha Petrochem Supply','Manama Bearings Co','Jubail Aluminum Works'],
};

function makeSuppliers() {
  const list = [];
  let n = 0;
  const targets = { NA: 110, EU: 60, AS: 60, ME: 10 };

  const regions = Object.keys(targets);
  for (const r of regions) {
    const cities = REGIONS[r].cities;
    const names = SUPPLIER_NAMES_BY_REGION[r];
    const total = targets[r];
    for (let i = 0; i < total; i++) {
      const city = cities[i % cities.length];
      const base = names[i % names.length];
      const suffix = i >= names.length ? `-${Math.floor(i / names.length) + 1}` : '';
      const name = `${base}${suffix}`;
      const id = `SUP-${String(++n).padStart(4, '0')}`;

      // Risk profile by region (deterministic-ish using i)
      const seed = (i * 37 + r.charCodeAt(0)) % 100;
      let baseRisk;
      if (r === 'NA') baseRisk = 18 + (seed % 25);
      else if (r === 'EU') baseRisk = 28 + (seed % 30);
      else if (r === 'AS') baseRisk = 45 + (seed % 38);
      else baseRisk = 60 + (seed % 35);

      const otd = Math.max(0.78, 1 - (baseRisk / 280) - ((seed % 7) / 100));
      const credit = baseRisk < 30 ? 'A+' : baseRisk < 45 ? 'A' : baseRisk < 60 ? 'BBB' : baseRisk < 75 ? 'BB' : 'B';

      const materialsList = ['Steel coil','Aluminum','Bearings','Sensors','Wire','Polymers','Castings','Stampings','Forgings','Electronics','Hydraulic seals','Fasteners','Lubricants','Rubber','Adhesives'];
      const mats = [materialsList[(i + 0) % materialsList.length], materialsList[(i + 4) % materialsList.length]];

      const spend = Math.round((250 + (seed * 31)) * 1000); // $K range
      const plant = COMPANY.plants[i % COMPANY.plants.length].id;

      // Hormuz exposure: ~22 suppliers tied to ME / oil-derivative / ocean freight from AS
      let hormuzExposed = false;
      if (r === 'ME') hormuzExposed = true;
      else if (r === 'AS' && (i % 5 === 0)) hormuzExposed = true;
      else if (r === 'AS' && mats.includes('Polymers')) hormuzExposed = true;
      else if (r === 'AS' && mats.includes('Rubber')) hormuzExposed = true;

      list.push({
        id, name, region: r, city: city[0], country: city[1],
        materials: mats, otd: Math.round(otd * 1000) / 1000,
        credit, riskScore: Math.min(95, baseRisk),
        spend, plant, hormuzExposed,
      });
    }
  }
  return list;
}

const SUPPLIERS = makeSuppliers();

// ---------- 12 events for demo controls ----------
const EVENTS = [
  {
    id: 'HORMUZ',
    label: 'Strait of Hormuz Blockade',
    severity: 'Severe',
    region: 'Middle East',
    summary: 'Iranian naval forces escalate Strait of Hormuz patrols. Three tanker incidents in last 48hr; insurance war-risk premiums spike 340%. Ocean freight, oil-derivative materials, and Asia-routing inbound flows at risk.',
    aiBlurb: 'Severe disruption to Asia-inbound ocean freight and oil-derivative inputs. P50 impact ~$4.2M over 90 days; mitigation window: 7–10 days before contracts begin to fail.',
    impactRange: { min: 3_200_000, mode: 4_200_000, max: 5_800_000 },
    primaryDriver: 'ocean freight + oil-derivative inputs',
    affectedLineIds: ['LG-001','LG-007','RM-004','RM-005','RM-008','CO-004','CO-008','TR-003'],
    affectedSupplierTag: 'hormuzExposed',
    detailedDrivers: [
      { name: 'Tariff/war-risk premium uncertainty', weight: 0.62 },
      { name: 'FX volatility (USD/AED, USD/KRW)',    weight: 0.21 },
      { name: 'Demand elasticity downstream',        weight: 0.17 },
    ],
  },
  {
    id: 'CHINA_TARIFF',
    label: 'China Tariff Escalation (Section 301 +25%)',
    severity: 'High',
    region: 'Asia',
    summary: 'USTR announces +25% Section 301 tariff increase on automotive components effective in 14 days. Electronics, bearings, sensors, and stamped metal categories impacted.',
    aiBlurb: 'Tariff escalation hits electronic modules and bearings worst. P50 ~$3.6M; window to re-route via Mexico ~21 days under USMCA pre-clearance.',
    impactRange: { min: 2_400_000, mode: 3_600_000, max: 5_200_000 },
    primaryDriver: 'tariff pass-through on Asia components',
    affectedLineIds: ['CO-001','CO-002','CO-009','CO-007','TR-001','RM-001','LG-001'],
    affectedSupplierTag: 'asiaTariff',
    detailedDrivers: [
      { name: 'Tariff rate uncertainty (Sec 301)',  weight: 0.71 },
      { name: 'Supplier pass-through behavior',     weight: 0.18 },
      { name: 'Demand elasticity on EVs',           weight: 0.11 },
    ],
  },
  {
    id: 'USMCA_AUDIT',
    label: 'USMCA Rules-of-Origin Audit',
    severity: 'Medium',
    region: 'North America',
    summary: 'CBP launches RoO audit on wire-harness assemblies from Mexico operations; preliminary findings flag 18% of SKUs as non-compliant.',
    aiBlurb: 'USMCA non-compliance forces tariff back-pay and re-certification. P50 ~$1.4M, mostly back-duty + admin.',
    impactRange: { min: 800_000, mode: 1_400_000, max: 2_200_000 },
    primaryDriver: 'tariff back-pay + recertification cost',
    affectedLineIds: ['CO-006','TR-002','LG-004','QL-003'],
    affectedSupplierTag: 'mexico',
    detailedDrivers: [
      { name: 'Volume of non-compliant SKUs', weight: 0.58 },
      { name: 'CBP penalty rate range',       weight: 0.27 },
      { name: 'Re-engineering cost',          weight: 0.15 },
    ],
  },
  { id: 'CHIP_SHORTAGE',  label: 'Semiconductor Supply Crunch (TSMC)',     severity: 'High',   region: 'Asia',           summary: 'TSMC yield issues at N5 node; automotive MCU allocations cut 22% for Q3.', aiBlurb: 'Stub.', impactRange: { min: 2_100_000, mode: 3_100_000, max: 4_600_000 }, affectedLineIds: ['CO-002','CO-009'], detailedDrivers: [{name:'Allocation uncertainty',weight:0.55},{name:'Spot premium volatility',weight:0.30},{name:'Demand pull-forward',weight:0.15}] },
  { id: 'RED_SEA',        label: 'Red Sea Houthi Escalation',                severity: 'Severe', region: 'Middle East',    summary: 'Houthi attacks force major carriers to reroute via Cape of Good Hope.', aiBlurb: 'Stub.', impactRange: { min: 1_800_000, mode: 2_600_000, max: 3_900_000 }, affectedLineIds: ['LG-001','LG-007','LG-005'], detailedDrivers: [{name:'Lane diversion cost',weight:0.64},{name:'Insurance war-risk',weight:0.22},{name:'Lead time variance',weight:0.14}] },
  { id: 'TAIWAN_STRAIT',  label: 'Taiwan Strait Tension Spike',              severity: 'Critical', region: 'Asia',         summary: 'PLA navy exercises encircle Taiwan; semiconductor exports paused.', aiBlurb: 'Stub.', impactRange: { min: 5_200_000, mode: 8_400_000, max: 14_000_000 }, affectedLineIds: ['CO-002','CO-009','CO-001'], detailedDrivers: [{name:'Export licensing uncertainty',weight:0.68},{name:'Allocation pull-forward',weight:0.22},{name:'Demand destruction',weight:0.10}] },
  { id: 'STEEL_SURGE',    label: 'Steel Commodity Surge (Iron Ore +18%)',    severity: 'Medium', region: 'Global',         summary: 'Iron ore futures surge 18% on China stimulus headlines.', aiBlurb: 'Stub.', impactRange: { min: 1_100_000, mode: 1_700_000, max: 2_500_000 }, affectedLineIds: ['RM-001','CO-003','CO-007'], detailedDrivers: [{name:'Commodity price elasticity',weight:0.72},{name:'Hedge coverage gap',weight:0.18},{name:'Mill pass-through',weight:0.10}] },
  { id: 'FX_PESO',        label: 'MXN Peso Devaluation (-12%)',              severity: 'High',   region: 'Mexico',         summary: 'Mexican peso devalues 12% on credit-rating action; labor cost USD-equivalent drops.', aiBlurb: 'Stub.', impactRange: { min: -2_400_000, mode: -1_500_000, max: 400_000 }, affectedLineIds: ['LB-002','TR-003'], detailedDrivers: [{name:'FX volatility',weight:0.62},{name:'Hedge timing',weight:0.28},{name:'Wage indexation lag',weight:0.10}] },
  { id: 'EV_TARIFF',      label: 'EU EV Component Tariff',                   severity: 'Medium', region: 'Europe',         summary: 'EU announces 15% tariff on non-EU EV components.', aiBlurb: 'Stub.', impactRange: { min: 700_000, mode: 1_200_000, max: 1_900_000 }, affectedLineIds: ['RD-001','CO-002','TR-001'], detailedDrivers: [{name:'EU classification',weight:0.55},{name:'Volume to EU OEMs',weight:0.30},{name:'Re-shoring cost',weight:0.15}] },
  { id: 'LITHIUM',        label: 'Lithium Supply Disruption (Chile)',        severity: 'Low',    region: 'South America',  summary: 'Chilean lithium production paused over water rights dispute.', aiBlurb: 'Stub.', impactRange: { min: 400_000, mode: 700_000, max: 1_200_000 }, affectedLineIds: ['RD-001','RD-002'], detailedDrivers: [{name:'Lithium spot price',weight:0.78},{name:'Alt-chemistry feasibility',weight:0.15},{name:'Inventory buffer',weight:0.07}] },
  { id: 'CYBER',          label: 'Tier-1 Cyber Attack (CDK Auto)',           severity: 'High',   region: 'North America',  summary: 'Major automotive software vendor hit by ransomware; OEM ordering systems offline 7-14 days.', aiBlurb: 'Stub.', impactRange: { min: 1_400_000, mode: 2_300_000, max: 3_900_000 }, affectedLineIds: ['SM-001','SM-003','ID-005'], detailedDrivers: [{name:'Outage duration uncertainty',weight:0.60},{name:'Order volume impact',weight:0.28},{name:'Recovery surge cost',weight:0.12}] },
  { id: 'UAW_STRIKE',     label: 'UAW Strike Authorization Vote',            severity: 'High',   region: 'North America',  summary: 'UAW Local 600 authorizes strike vote; Detroit plant ramp at risk.', aiBlurb: 'Stub.', impactRange: { min: 2_100_000, mode: 3_400_000, max: 5_200_000 }, affectedLineIds: ['LB-001','LB-004','SM-001'], detailedDrivers: [{name:'Strike duration uncertainty',weight:0.66},{name:'Customer line-down penalty',weight:0.24},{name:'Replacement labor cost',weight:0.10}] },
];

const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

// ---------- Cascading impact graph (Hormuz default; built per event) ----------
function buildCascade(event) {
  const affectedSuppliers = SUPPLIERS
    .filter(s => event.id === 'HORMUZ' ? s.hormuzExposed :
                 event.id === 'CHINA_TARIFF' ? (s.region === 'AS' && s.riskScore > 50) :
                 event.id === 'USMCA_AUDIT' ? (s.country === 'MX') :
                 s.riskScore > 60)
    .slice(0, 10);

  const lines = event.affectedLineIds.map(id => BUDGET_LINES.find(l => l.id === id)).filter(Boolean);
  const plants = COMPANY.plants.slice(0, 4);

  const nodes = [];
  const links = [];

  // Layer 0: signal
  nodes.push({ id: `SIG-${event.id}`, layer: 0, label: event.label, type: 'signal', impact: 1.0, severity: event.severity });

  // Layer 1: suppliers
  affectedSuppliers.forEach((s, i) => {
    nodes.push({ id: s.id, layer: 1, label: s.name, type: 'supplier', impact: s.riskScore / 100, meta: s });
    links.push({ source: `SIG-${event.id}`, target: s.id, weight: 0.4 + (s.riskScore / 200) });
  });

  // Layer 2: BOMs
  const boms = ['BOM-DRIVE-A12','BOM-DRIVE-B07','BOM-CHASS-C14','BOM-AXLE-D03','BOM-MOTOR-E21','BOM-CTRL-F09','BOM-SUS-G15','BOM-BRAKE-H02'].slice(0, Math.min(8, lines.length + 2));
  boms.forEach((b, i) => {
    nodes.push({ id: b, layer: 2, label: b, type: 'bom', impact: 0.5 + Math.random() * 0.4 });
    // link from 2 suppliers
    affectedSuppliers.slice(i, i + 2).forEach(s => links.push({ source: s.id, target: b, weight: 0.3 + Math.random() * 0.3 }));
  });

  // Layer 3: plants
  plants.forEach((p, i) => {
    nodes.push({ id: p.id, layer: 3, label: `${p.city} Plant`, type: 'plant', impact: 0.4 + Math.random() * 0.3 });
    boms.slice(i * 2, i * 2 + 3).forEach(b => links.push({ source: b, target: p.id, weight: 0.35 + Math.random() * 0.3 }));
  });

  // Layer 4: budget lines
  lines.forEach((l, i) => {
    nodes.push({ id: l.id, layer: 4, label: l.name, type: 'budget', impact: 0.6 + Math.random() * 0.3, meta: l });
    plants.slice(i % 4, (i % 4) + 2).forEach(p => links.push({ source: p.id, target: l.id, weight: 0.3 + Math.random() * 0.4 }));
  });

  // Layer 5: P&L
  const pl = [
    { id: 'PL-REV',    label: 'Revenue at Risk',  est: -3_400_000 },
    { id: 'PL-MARGIN', label: 'Gross Margin Δ',   est: -2_100_000 },
    { id: 'PL-EBITDA', label: 'EBITDA Δ',         est: -2_900_000 },
    { id: 'PL-CASH',   label: 'Working Capital',  est: -1_800_000 },
  ];
  pl.forEach((p, i) => {
    nodes.push({ id: p.id, layer: 5, label: p.label, type: 'pnl', impact: 0.9, meta: p });
    lines.slice(i * 2, i * 2 + 3).forEach(l => links.push({ source: l.id, target: p.id, weight: 0.4 + Math.random() * 0.3 }));
  });

  return { nodes, links };
}

// ---------- Mitigation strategies (per Hormuz, with composable clauses) ----------
const CLAUSES = {
  DUAL: { id: 'DUAL', name: 'Dual-source', savingsMin: 800_000, savingsMode: 1_200_000, savingsMax: 1_700_000, feasibility: { capacity: 'green', leadTime: 'amber', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
  PREBUILD: { id: 'PREBUILD', name: 'Inventory pre-build (60d)', savingsMin: 500_000, savingsMode: 850_000, savingsMax: 1_300_000, feasibility: { capacity: 'amber', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
  PASSTHRU: { id: 'PASSTHRU', name: 'Price pass-through to OEM', savingsMin: 600_000, savingsMode: 950_000, savingsMax: 1_400_000, feasibility: { capacity: 'green', leadTime: 'green', compliance: 'amber' }, compliance: { usmca: true, ofac: true, ear: false } },
  HEDGE: { id: 'HEDGE', name: 'Extend FX hedge to 90%', savingsMin: 300_000, savingsMode: 550_000, savingsMax: 850_000, feasibility: { capacity: 'green', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
  RENEGOTIATE: { id: 'RENEGOTIATE', name: 'Contract renegotiation', savingsMin: 400_000, savingsMode: 700_000, savingsMax: 1_100_000, feasibility: { capacity: 'green', leadTime: 'red', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
  REROUTE: { id: 'REROUTE', name: 'Re-route via Pacific corridor', savingsMin: 400_000, savingsMode: 720_000, savingsMax: 1_150_000, feasibility: { capacity: 'amber', leadTime: 'amber', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
  AIRFREIGHT: { id: 'AIRFREIGHT', name: 'Expedite via air (critical SKUs)', savingsMin: 100_000, savingsMode: 250_000, savingsMax: 500_000, feasibility: { capacity: 'green', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
  USMCA_SHIFT: { id: 'USMCA_SHIFT', name: 'Shift volume to Monterrey under USMCA', savingsMin: 700_000, savingsMode: 1_100_000, savingsMax: 1_600_000, feasibility: { capacity: 'amber', leadTime: 'amber', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true } },
};

const STRATEGIES = [
  {
    id: 'MIT-001',
    name: 'Dual-source steel via POSCO + Nucor',
    rationale: 'Diversify steel/component sourcing away from Asia-routing exposure. POSCO holds RoO under KOR-USA FTA; Nucor adds USMCA-compliant capacity.',
    clauses: ['DUAL', 'HEDGE', 'PREBUILD'],
    leadTimeDays: 14,
  },
  {
    id: 'MIT-002',
    name: 'Re-route via Pacific + Air-Expedite',
    rationale: 'Bypass Hormuz lane entirely. Pacific corridor adds ~6 days lead time; air-expedite critical SKUs to preserve OEM delivery cadence.',
    clauses: ['REROUTE', 'AIRFREIGHT', 'HEDGE'],
    leadTimeDays: 7,
  },
  {
    id: 'MIT-003',
    name: 'Pass-through + Renegotiate',
    rationale: 'Open price-adjustment clauses with OEM customers; renegotiate force-majeure-adjacent supplier contracts. Lower friction but slower revenue recognition.',
    clauses: ['PASSTHRU', 'RENEGOTIATE', 'HEDGE'],
    leadTimeDays: 21,
  },
  {
    id: 'MIT-004',
    name: 'USMCA Shift + Pre-build',
    rationale: 'Shift Asia-sourced rubber/polymer volumes to Monterrey under USMCA; pre-build 60-day inventory at Saltillo while the lane reorganizes.',
    clauses: ['USMCA_SHIFT', 'PREBUILD', 'HEDGE'],
    leadTimeDays: 18,
  },
];

// ---------- Alternative strategies (Path C — surfaced after Reject) ----------
// Demand-side / financial / time-buying philosophies — distinct from the supply-side primary set.
const ALTERNATIVE_CLAUSES = {
  PASSTHRU60:     { id: 'PASSTHRU60',    name: '60% pass-through to top 12 OEMs',     savingsMin: 900_000,  savingsMode: 1_350_000, savingsMax: 1_900_000, feasibility: { capacity: 'green', leadTime: 'green', compliance: 'amber' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'demand' },
  CONTRACT_MAC:   { id: 'CONTRACT_MAC',  name: 'Invoke MAC / force-majeure clauses',  savingsMin: 400_000,  savingsMode: 700_000,   savingsMax: 1_100_000, feasibility: { capacity: 'green', leadTime: 'amber', compliance: 'amber' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'demand' },
  HEDGE_FX_90:    { id: 'HEDGE_FX_90',   name: 'Extend FX hedge 70% → 90%',           savingsMin: 350_000,  savingsMode: 600_000,   savingsMax: 950_000,   feasibility: { capacity: 'green', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'financial' },
  HEDGE_OIL_Q34:  { id: 'HEDGE_OIL_Q34', name: 'Lock Q3-Q4 oil forwards',             savingsMin: 500_000,  savingsMode: 850_000,   savingsMax: 1_300_000, feasibility: { capacity: 'amber', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'financial' },
  HEDGE_STEEL:    { id: 'HEDGE_STEEL',   name: 'Lock steel HRC futures (Q3-Q4)',      savingsMin: 400_000,  savingsMode: 700_000,   savingsMax: 1_100_000, feasibility: { capacity: 'amber', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'financial' },
  SAFETY_RELEASE: { id: 'SAFETY_RELEASE',name: 'Release 60% safety stock',            savingsMin: 300_000,  savingsMode: 550_000,   savingsMax: 900_000,   feasibility: { capacity: 'green', leadTime: 'amber', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'time' },
  EXTEND_TERMS:   { id: 'EXTEND_TERMS',  name: 'Extend payment terms 60d → 90d',      savingsMin: 200_000,  savingsMode: 400_000,   savingsMax: 700_000,   feasibility: { capacity: 'green', leadTime: 'green', compliance: 'green' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'time' },
  QUOTE_DELAY:    { id: 'QUOTE_DELAY',   name: 'Pause new OEM quotes 30d',            savingsMin: 150_000,  savingsMode: 300_000,   savingsMax: 500_000,   feasibility: { capacity: 'green', leadTime: 'green', compliance: 'amber' }, compliance: { usmca: true, ofac: true, ear: true }, philosophy: 'time' },
};

// Merge alternative clauses into main CLAUSES so the solver finds them by id
Object.assign(CLAUSES, ALTERNATIVE_CLAUSES);

const ALTERNATIVE_STRATEGIES = [
  {
    id: 'ALT-001',
    name: 'Price Pass-Through to Key Accounts',
    rationale: 'Pass 60% of cost increase to top 12 OEM customers via existing contractual price-adjustment and MAC clauses. Demand-side mitigation — protects margin without supply-chain disruption, but carries customer-relationship and reputation risk.',
    clauses: ['PASSTHRU60', 'CONTRACT_MAC'],
    leadTimeDays: 28,
    philosophy: 'demand-side',
  },
  {
    id: 'ALT-002',
    name: 'FX & Commodity Hedging Expansion',
    rationale: 'Expand hedge book to 90% FX coverage and lock Q3-Q4 forward prices on oil and steel. Financial mitigation — caps volatility regardless of operational outcome, but burns treasury bandwidth and forecloses upside.',
    clauses: ['HEDGE_FX_90', 'HEDGE_OIL_Q34', 'HEDGE_STEEL'],
    leadTimeDays: 5,
    philosophy: 'financial',
  },
  {
    id: 'ALT-003',
    name: 'Strategic Inventory Drawdown',
    rationale: 'Release 60% of safety stock to delay impact 8–10 weeks; extend payment terms to suppliers; pause new OEM quotes. Time-buying mitigation — preserves optionality at the cost of inventory cushion.',
    clauses: ['SAFETY_RELEASE', 'EXTEND_TERMS', 'QUOTE_DELAY'],
    leadTimeDays: 1,
    philosophy: 'time-buying',
  },
];

// ---------- 2 fully formed saved plays ----------
const SAVED_PLAYS = [
  {
    id: 'PLAY-2024-RS',
    name: '2024 Red Sea Crisis',
    date: '2024-02-18',
    crisis: 'Houthi escalation; Suez closure',
    savings: 3_800_000,
    composition: ['REROUTE', 'AIRFREIGHT', 'HEDGE', 'PASSTHRU'],
    outcome: 'Margin held within 80bps of target; 0 OEM line-downs.',
  },
  {
    id: 'PLAY-2023-STEEL',
    name: '2023 Steel Tariff Shock',
    date: '2023-08-04',
    crisis: 'Sec 232 expansion to fabricated steel',
    savings: 2_100_000,
    composition: ['DUAL', 'PREBUILD', 'RENEGOTIATE'],
    outcome: 'Saved $2.1M; established Nucor as Tier-1 backup.',
  },
];

// ---------- Live signal feed pool ----------
const SIGNAL_POOL = [
  { type: 'geo', text: 'Iranian naval forces escalate Strait of Hormuz patrols — 3 tanker incidents reported in last 48hr', confidence: 'red', tagId: 'HORMUZ_PRESTAGE' },
  { type: 'commodity', text: 'Hot-rolled steel coil (US Midwest)', value: '+2.4%', confidence: 'amber' },
  { type: 'commodity', text: 'Aluminum LME 3M',                  value: '+1.1%', confidence: 'green' },
  { type: 'commodity', text: 'Copper LME 3M',                    value: '-0.6%', confidence: 'green' },
  { type: 'commodity', text: 'WTI Crude',                        value: '+3.8%', confidence: 'amber' },
  { type: 'commodity', text: 'Brent Crude',                      value: '+4.2%', confidence: 'amber' },
  { type: 'commodity', text: 'Natural Gas (Henry Hub)',          value: '+5.1%', confidence: 'amber' },
  { type: 'credit', text: 'Baosteel — Moody\'s outlook revised to negative', confidence: 'amber' },
  { type: 'credit', text: 'Hyundai Mobis — S&P affirms A-', confidence: 'green' },
  { type: 'reg', text: 'USTR publishes Federal Register notice on Section 301 Q3 review', confidence: 'amber' },
  { type: 'reg', text: 'USMCA Free Trade Commission to convene Aug 14', confidence: 'green' },
  { type: 'reg', text: 'EAR Entity List expansion — 8 entities added', confidence: 'amber' },
  { type: 'geo', text: 'Red Sea: 2 vessels rerouted via Cape of Good Hope', confidence: 'amber' },
  { type: 'geo', text: 'UAW Local 600 announces strike authorization vote', confidence: 'red' },
  { type: 'geo', text: 'China RRR cut announced — 50bps', confidence: 'green' },
  { type: 'commodity', text: 'TSMC N5 wafer pricing',            value: '+8.4%', confidence: 'red' },
  { type: 'commodity', text: 'Ocean freight (FBX SE Asia→USWC)', value: '+12.6%', confidence: 'red' },
  { type: 'commodity', text: 'MXN/USD',                          value: '-1.8%', confidence: 'amber' },
  { type: 'commodity', text: 'EUR/USD',                          value: '+0.4%', confidence: 'green' },
  { type: 'credit', text: 'TSMC — Fitch reaffirms AA-, outlook stable', confidence: 'green' },
  { type: 'credit', text: 'Magna International — Moody\'s upgrades to A2', confidence: 'green' },
  { type: 'reg', text: 'CBP issues memo on USMCA wire-harness RoO interpretation', confidence: 'amber' },
  { type: 'geo', text: 'Panama Canal draft restrictions extended through Q4', confidence: 'amber' },
  { type: 'commodity', text: 'PA66 resin (Asia spot)',           value: '+6.2%', confidence: 'amber' },
  { type: 'commodity', text: 'Synthetic rubber SBR',             value: '+4.7%', confidence: 'amber' },
  { type: 'commodity', text: 'Magnesium ingot (China)',          value: '+9.1%', confidence: 'red' },
  { type: 'geo', text: 'Korean Peninsula tensions — joint US/JP/KR naval exercise', confidence: 'green' },
  { type: 'reg', text: 'IRS issues guidance on Section 45X advanced manufacturing credits', confidence: 'green' },
  { type: 'credit', text: 'Bridgestone — S&P revises outlook to negative', confidence: 'amber' },
  { type: 'commodity', text: 'Iron ore 62% Fe',                  value: '+3.1%', confidence: 'amber' },
  { type: 'geo', text: 'Black Sea grain corridor — 4 vessels cleared today', confidence: 'green' },
  { type: 'geo', text: 'EU Commission opens Subsidy Reg probe on 3 Chinese EV OEMs', confidence: 'amber' },
  { type: 'commodity', text: 'Lithium carbonate (China)',        value: '-2.3%', confidence: 'green' },
  { type: 'credit', text: 'Yanfeng Auto Interiors — Moody\'s B1 confirmed', confidence: 'amber' },
  { type: 'reg', text: 'NHTSA opens preliminary investigation on Tier-1 wiring supplier', confidence: 'amber' },
  { type: 'commodity', text: 'Semiconductor leadtime index',     value: '+11.4%', confidence: 'red' },
  { type: 'geo', text: 'IMO bulletin: Hormuz transit advisory level raised to 3', confidence: 'red' },
  { type: 'commodity', text: 'War risk insurance (Persian Gulf)', value: '+340%', confidence: 'red' },
];

// ---------- Activity feed (steady state ambient) ----------
const RECENT_ACTIVITY = [
  { ts: '10:18:42', actor: 'A. Patel · FP&A',         action: 'Revised',  object: 'CO-002 Electronic control modules', detail: '+$120K accrual' },
  { ts: '10:14:11', actor: 'M. Okafor · Procurement', action: 'Approved', object: 'PO-78431 to Hyundai Mobis',           detail: '$340K' },
  { ts: '10:09:54', actor: 'L. Chen · CFO',           action: 'Reviewed', object: 'Q3 forecast bridge',                  detail: 'No change' },
  { ts: '10:04:30', actor: 'System',                  action: 'Retrained', object: 'demand-elasticity XGBoost v4.2',     detail: 'MAE 2.1%' },
  { ts: '09:58:21', actor: 'R. Singh · VP S&C',       action: 'Flagged',  object: 'SUP-0177 Baosteel Components',        detail: 'Credit watch' },
  { ts: '09:51:08', actor: 'System',                  action: 'Retrained', object: 'tariff-impact Bayesian v2.7',         detail: 'CRPS 0.18' },
  { ts: '09:45:33', actor: 'D. Kowalski · Eng',       action: 'Released', object: 'BOM-DRIVE-A12 rev 14',                detail: '3 SKU updates' },
];

/* ============================================================================
 * SECTION 3: MONTE CARLO + SOLVER + UTILITIES
 * ========================================================================== */

function sampleTriangular(min, mode, max) {
  const u = Math.random();
  const fc = (mode - min) / (max - min);
  if (u < fc) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function runMonteCarlo(items, iterations = 5000) {
  const results = new Array(iterations);
  for (let i = 0; i < iterations; i++) {
    let total = 0;
    for (const item of items) {
      total += sampleTriangular(item.min, item.mode, item.max);
    }
    results[i] = total;
  }
  results.sort((a, b) => a - b);
  return results;
}

function percentiles(sorted, ps = [0.10, 0.50, 0.90]) {
  return ps.map(p => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)))]);
}

// ---------- Mock OR-Tools "solver" for clause composition ----------
function solveStrategy(activeEvent, selectedClauses, multiEvent = false) {
  // Deterministic: sum savings of selected clauses, apply interaction penalties
  let totalMin = 0, totalMode = 0, totalMax = 0;
  let capacity = 'green', leadTime = 'green', compliance = 'green';
  const usedClauses = selectedClauses.map(id => CLAUSES[id]).filter(Boolean);

  for (const c of usedClauses) {
    totalMin += c.savingsMin;
    totalMode += c.savingsMode;
    totalMax += c.savingsMax;
  }

  // Interaction penalty when many clauses selected
  if (usedClauses.length >= 3) {
    totalMin *= 0.92; totalMode *= 0.94; totalMax *= 0.96;
  }
  if (usedClauses.length >= 4) {
    totalMin *= 0.88; totalMode *= 0.90; totalMax *= 0.94;
  }

  // Multi-event constraint: AIRFREIGHT and DUAL conflict on capacity under joint constraints
  if (multiEvent) {
    if (selectedClauses.includes('AIRFREIGHT')) leadTime = 'amber';
    if (selectedClauses.includes('REROUTE') && selectedClauses.includes('USMCA_SHIFT')) capacity = 'red';
    if (selectedClauses.includes('PASSTHRU')) compliance = 'amber';
    totalMin *= 0.78; totalMode *= 0.82; totalMax *= 0.85;
  }

  // Worst feasibility flag wins
  for (const c of usedClauses) {
    if (c.feasibility.capacity === 'red') capacity = 'red';
    else if (c.feasibility.capacity === 'amber' && capacity !== 'red') capacity = 'amber';
    if (c.feasibility.leadTime === 'red') leadTime = 'red';
    else if (c.feasibility.leadTime === 'amber' && leadTime !== 'red') leadTime = 'amber';
    if (c.feasibility.compliance === 'red') compliance = 'red';
    else if (c.feasibility.compliance === 'amber' && compliance !== 'red') compliance = 'amber';
  }

  return {
    savingsMin: Math.round(totalMin),
    savingsMode: Math.round(totalMode),
    savingsMax: Math.round(totalMax),
    feasibility: { capacity, leadTime, compliance },
    clauseCount: usedClauses.length,
  };
}

// ---------- Formatters ----------
function fmtUSD(n, opts = {}) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (opts.compact && abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(opts.precision ?? 1)}M`;
  if (opts.compact && abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

function fmtDuration(secs) {
  if (secs == null) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function fmtClock(d = new Date()) {
  return d.toTimeString().slice(0, 8);
}

/* ============================================================================
 * SECTION 4: AI Provider integrations — direct fetch, no LangChain
 *   ChatPwC (default, env-backed) · OpenAI · Anthropic · Azure OpenAI
 *
 * Security:
 *   - User-entered keys live ONLY in zustand state (never localStorage/etc.)
 *   - Keys are masked in UI (type="password" always)
 *   - Errors are sanitized — raw response bodies are NEVER surfaced (could echo keys/headers)
 *   - Keys are NEVER logged, stringified to console, or included in URLs
 * ========================================================================== */

const CHATPWC_KEY           = import.meta.env.VITE_CHATPWC_API_KEY;
const CHATPWC_BASE          = import.meta.env.VITE_CHATPWC_BASE_URL || 'https://genai-sharedservice-americas.pwcinternal.com';
const CHATPWC_MODEL_DEFAULT = import.meta.env.VITE_CHATPWC_MODEL || 'gpt-4o';

const PROVIDER_META = {
  chatpwc:   { label: 'ChatPwC',      envBacked: true,  models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'] },
  openai:    { label: 'OpenAI',       envBacked: false, models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini'] },
  anthropic: { label: 'Anthropic',    envBacked: false, models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'] },
  azure:     { label: 'Azure OpenAI', envBacked: false, models: [] }, // model = deployment name on Azure
};

// Map HTTP status → safe, human-readable message. NEVER include the response body.
function sanitizedErrorMessage(status) {
  if (status === 401) return 'Invalid API key';
  if (status === 403) return 'Key valid but lacks permission for this model';
  if (status === 404) return 'Endpoint or model not found';
  if (status === 429) return 'Rate limit hit — try again or check your billing';
  if (status === 0)   return 'Connection failed — check your network or firewall';
  return `Connection failed (HTTP ${status})`;
}

// Per-provider fetch. Always returns { text, error?, status, latencyMs }.
// Never echoes the raw response body to caller; only the status code drives error text.
async function callProvider(provider, config, { system, messages, maxTokens = 500, temperature = 0.4 }) {
  const t0 = performance.now();
  const measure = () => Math.round(performance.now() - t0);
  try {
    if (provider === 'chatpwc') {
      if (!CHATPWC_KEY) return { error: 'no-key', status: 0, latencyMs: 0 };
      const fullMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const res = await fetch(`${CHATPWC_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CHATPWC_KEY}` },
        body: JSON.stringify({ model: config.model || CHATPWC_MODEL_DEFAULT, messages: fullMessages, temperature, max_tokens: maxTokens }),
      });
      const latencyMs = measure();
      if (!res.ok) return { error: sanitizedErrorMessage(res.status), status: res.status, latencyMs };
      const data = await res.json();
      return { text: data?.choices?.[0]?.message?.content ?? '', latencyMs };
    }

    if (provider === 'openai') {
      if (!config?.apiKey) return { error: 'no-key', status: 0, latencyMs: 0 };
      const fullMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: fullMessages, temperature, max_tokens: maxTokens }),
      });
      const latencyMs = measure();
      if (!res.ok) return { error: sanitizedErrorMessage(res.status), status: res.status, latencyMs };
      const data = await res.json();
      return { text: data?.choices?.[0]?.message?.content ?? '', latencyMs };
    }

    if (provider === 'anthropic') {
      if (!config?.apiKey) return { error: 'no-key', status: 0, latencyMs: 0 };
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          messages,
          ...(system ? { system } : {}),
        }),
      });
      const latencyMs = measure();
      if (!res.ok) return { error: sanitizedErrorMessage(res.status), status: res.status, latencyMs };
      const data = await res.json();
      return { text: data?.content?.[0]?.text ?? '', latencyMs };
    }

    if (provider === 'azure') {
      if (!config?.apiKey || !config?.endpoint || !config?.deploymentName) return { error: 'no-key', status: 0, latencyMs: 0 };
      const fullMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const ep = config.endpoint.replace(/\/$/, '');
      const url = `${ep}/openai/deployments/${encodeURIComponent(config.deploymentName)}/chat/completions?api-version=${encodeURIComponent(config.apiVersion || '2024-08-01-preview')}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': config.apiKey },
        body: JSON.stringify({ messages: fullMessages, temperature, max_tokens: maxTokens }),
      });
      const latencyMs = measure();
      if (!res.ok) return { error: sanitizedErrorMessage(res.status), status: res.status, latencyMs };
      const data = await res.json();
      return { text: data?.choices?.[0]?.message?.content ?? '', latencyMs };
    }

    return { error: 'Unknown provider', status: 0, latencyMs: 0 };
  } catch (e) {
    // e.message could contain CORS / network details — keep generic, never echo
    return { error: sanitizedErrorMessage(0), status: 0, latencyMs: measure() };
  }
}

// Unified call used by every feature in the app. Routes to the active provider.
async function callAI({ system, messages, maxTokens = 500, temperature = 0.4 }) {
  const store = useWarRoom.getState();
  const provider = store.activeProvider;
  const config = store.providerConfig[provider];
  const result = await callProvider(provider, config, { system, messages, maxTokens, temperature });
  // Drive the header status indicator. Never store any key material here — just status.
  if (result.error && result.error !== 'no-key') {
    useWarRoom.setState({ connectionStatus: 'error', lastError: result.error });
  } else if (result.text) {
    useWarRoom.setState({ connectionStatus: 'connected', lastError: null, lastTestLatencyMs: result.latencyMs });
  }
  return result;
}

// 1-token "ping" probe used by the Settings modal's Test Connection button.
// NEVER sends business data; only "ping".
async function testProviderConnection(provider, config) {
  return callProvider(provider, config, {
    messages: [{ role: 'user', content: 'ping' }],
    maxTokens: 1,
    temperature: 0,
  });
}

// Sync check: is the active provider sufficiently configured to make a real call?
function isAIConfigured(provider, providerConfig) {
  const cfg = providerConfig?.[provider];
  if (provider === 'chatpwc') return !!CHATPWC_KEY;
  if (provider === 'openai' || provider === 'anthropic') return !!cfg?.apiKey && !!cfg?.model;
  if (provider === 'azure') return !!cfg?.apiKey && !!cfg?.endpoint && !!cfg?.deploymentName && !!cfg?.apiVersion;
  return false;
}

/* ============================================================================
 * SECTION 5: ZUSTAND STORE
 * ========================================================================== */

const useWarRoom = create((set, get) => ({
  // --- Mode ---
  mode: 'boot', // 'boot' | 'steady' | 'alert' | 'response'
  setMode: (m) => set({ mode: m }),

  // --- Boot ---
  bootSteps: 0,
  setBootSteps: (n) => set({ bootSteps: n }),

  // --- Active event(s) ---
  activeEventId: null,
  secondaryEventId: null,
  fireAlert: (eventId) => {
    const ev = EVENT_BY_ID[eventId];
    if (!ev) return;
    set({
      activeEventId: eventId,
      mode: 'alert',
      alertFiredAt: Date.now(),
      timeElapsedSec: 0,
      cascade: buildCascade(ev),
      selectedStrategyId: null,
      selectedClauses: [],            // Custom workspace starts empty — user composes by drag
      strategyVotes: {},              // Per-strategy votes reset per alert
      proposalSet: 'primary',
      reproposing: false,
      applyingStrategy: false,
      appliedStrategy: null,
      strategyApplied: false,
      counterfactualDays: 0,
      auditLog: [
        ...get().auditLog,
        { ts: fmtClock(), actor: 'System', action: 'Detected',  object: ev.label, detail: `Severity: ${ev.severity}` },
      ],
    });
  },
  acceptAlert: () => {
    set({ mode: 'response' });
    get().pushAudit({ actor: 'CFO', action: 'Accepted', object: 'Alert briefing', detail: get().activeEventId });
  },
  fireSecondary: (eventId) => {
    set({ secondaryEventId: eventId });
    get().pushAudit({ actor: 'System', action: 'Detected', object: EVENT_BY_ID[eventId].label, detail: 'Multi-event escalation' });
  },
  reset: () => set({
    mode: 'steady',
    activeEventId: null,
    secondaryEventId: null,
    timeElapsedSec: 0,
    cascade: null,
    selectedStrategyId: null,
    selectedClauses: [],
    counterfactualDays: 0,
    multiEvent: false,
    boardPackOpen: false,
    aiAdvisorOpen: false,
    strategyVotes: {},
    proposalSet: 'primary',
    reproposing: false,
    applyingStrategy: false,
    appliedStrategy: null,
    strategyApplied: false,
  }),

  // --- Time-to-decision counter ---
  alertFiredAt: null,
  timeElapsedSec: 0,
  tickTimer: () => set(s => ({ timeElapsedSec: s.alertFiredAt ? Math.floor((Date.now() - s.alertFiredAt) / 1000) : 0 })),

  // --- Cascade (built when alert fires) ---
  cascade: null,

  // --- Mitigation workbench ---
  selectedStrategyId: null,             // Currently highlighted preset (visual only)
  selectedClauses: [],                  // Custom workspace contents (Path B)
  setStrategy: (id) => {
    set({ selectedStrategyId: id });
    const s = [...STRATEGIES, ...ALTERNATIVE_STRATEGIES].find(x => x.id === id);
    get().pushAudit({ actor: 'CFO', action: 'Highlighted', object: id, detail: s?.name || '' });
  },
  toggleClause: (clauseId) => {
    const cur = get().selectedClauses;
    const has = cur.includes(clauseId);
    const next = has ? cur.filter(c => c !== clauseId) : [...cur, clauseId];
    set({ selectedClauses: next });
    get().pushAudit({ actor: 'CFO', action: has ? 'Removed' : 'Added', object: 'clause', detail: CLAUSES[clauseId]?.name || clauseId });
  },
  addClauseToCustom: (clauseId) => {
    const cur = get().selectedClauses;
    if (cur.includes(clauseId)) return;
    set({ selectedClauses: [...cur, clauseId] });
    get().pushAudit({ actor: 'CFO', action: 'Composed', object: 'clause', detail: CLAUSES[clauseId]?.name || clauseId });
  },

  // --- Stakeholder voting (per strategy id, plus 'CUSTOM' for the workspace) ---
  strategyVotes: {},
  setStrategyVote: (strategyId, role, value) => {
    set(s => ({
      strategyVotes: {
        ...s.strategyVotes,
        [strategyId]: { ...(s.strategyVotes[strategyId] || { CFO: null, VPSC: null, PROC: null, ENG: null }), [role]: value }
      }
    }));
    const labelMap = { CUSTOM: 'Custom Composition' };
    const strat = [...STRATEGIES, ...ALTERNATIVE_STRATEGIES].find(x => x.id === strategyId);
    get().pushAudit({ actor: role, action: value, object: strategyId, detail: labelMap[strategyId] || strat?.name || '' });
  },

  // --- Proposal set (Path C reject → alternative) ---
  proposalSet: 'primary',
  reproposing: false,
  rejectAll: () => {
    const visible = get().proposalSet === 'primary' ? STRATEGIES.slice(0, 3) : ALTERNATIVE_STRATEGIES;
    set(s => {
      const nextVotes = { ...s.strategyVotes };
      visible.forEach(strat => {
        nextVotes[strat.id] = { CFO: 'Rejected', VPSC: 'Rejected', PROC: 'Rejected', ENG: 'Rejected' };
      });
      return { strategyVotes: nextVotes, reproposing: true };
    });
    get().pushAudit({ actor: 'CFO', action: 'Rejected All', object: get().proposalSet + ' set', detail: 'AI re-proposing...' });
    setTimeout(() => {
      const wasPrimary = get().proposalSet === 'primary';
      set({ reproposing: false, proposalSet: wasPrimary ? 'alternative' : 'primary' });
      get().pushAudit({
        actor: 'System', action: 'Re-proposed',
        object: wasPrimary ? 'alternative strategy set' : 'primary strategy set',
        detail: wasPrimary ? 'demand-side / financial / time-buying' : 'supply-side mitigations'
      });
    }, 1500);
  },
  switchProposalSet: (which) => {
    set({ proposalSet: which });
    get().pushAudit({ actor: 'CFO', action: 'Switched', object: 'proposal set', detail: which });
  },

  // --- Apply strategy (with 600ms spinner) ---
  applyingStrategy: false,
  appliedStrategy: null,
  applyStrategyById: (strategyId) => {
    const all = [...STRATEGIES, ...ALTERNATIVE_STRATEGIES];
    const s = all.find(x => x.id === strategyId);
    if (!s) return;
    const ev = EVENT_BY_ID[get().activeEventId];
    const result = ev ? solveStrategy(ev, s.clauses, get().multiEvent) : { savingsMode: 0 };
    const baselineImpact = ev ? ev.impactRange.mode + (get().multiEvent ? (EVENT_BY_ID.CHINA_TARIFF?.impactRange.mode || 0) * 1.18 : 0) : 0;
    const mitigatedImpact = Math.max(0, baselineImpact - result.savingsMode);
    set({ applyingStrategy: true });
    setTimeout(() => {
      set(state => ({
        appliedStrategy: { id: s.id, clauses: [...s.clauses], name: s.name, isCustom: false },
        applyingStrategy: false,
        strategyApplied: true,
        auditPing: state.auditPing + 1,
      }));
      get().pushAudit({ actor: 'CFO', action: 'Applied', object: s.id, detail: `${s.name} · ${s.clauses.length} clauses` });
      get().pushAudit({ actor: 'System', action: 'Recomputed', object: 'FY2026 Budget Impact', detail: `${fmtUSD(-baselineImpact, { compact: true, precision: 1 })} → ${fmtUSD(-mitigatedImpact, { compact: true, precision: 1 })}` });
    }, 600);
  },
  applyCustomStrategy: () => {
    const clauses = get().selectedClauses;
    if (clauses.length === 0) return;
    const ev = EVENT_BY_ID[get().activeEventId];
    const result = ev ? solveStrategy(ev, clauses, get().multiEvent) : { savingsMode: 0 };
    const baselineImpact = ev ? ev.impactRange.mode + (get().multiEvent ? (EVENT_BY_ID.CHINA_TARIFF?.impactRange.mode || 0) * 1.18 : 0) : 0;
    const mitigatedImpact = Math.max(0, baselineImpact - result.savingsMode);
    set({ applyingStrategy: true });
    setTimeout(() => {
      set(state => ({
        appliedStrategy: { id: 'CUSTOM', clauses: [...clauses], name: 'Custom Composition', isCustom: true },
        applyingStrategy: false,
        strategyApplied: true,
        auditPing: state.auditPing + 1,
      }));
      get().pushAudit({ actor: 'CFO', action: 'Applied', object: 'CUSTOM', detail: `${clauses.length} clauses composed` });
      get().pushAudit({ actor: 'System', action: 'Recomputed', object: 'FY2026 Budget Impact', detail: `${fmtUSD(-baselineImpact, { compact: true, precision: 1 })} → ${fmtUSD(-mitigatedImpact, { compact: true, precision: 1 })}` });
    }, 600);
  },

  // --- Audit ping (drawer tab pulse) ---
  auditPing: 0,

  // --- Multi-event ---
  multiEvent: false,
  toggleMultiEvent: () => {
    const next = !get().multiEvent;
    set({ multiEvent: next });
    if (next && get().activeEventId === 'HORMUZ' && !get().secondaryEventId) {
      get().fireSecondary('CHINA_TARIFF');
    } else if (!next) {
      set({ secondaryEventId: null });
    }
  },

  // --- Counterfactual ---
  counterfactualDays: 0,
  setCounterfactualDays: (d) => set({ counterfactualDays: d }),

  // --- Saved plays ---
  savedPlays: [...SAVED_PLAYS],
  applySavedPlay: (playId) => {
    const p = get().savedPlays.find(x => x.id === playId);
    if (!p) return;
    set({ selectedClauses: [...p.composition] });
    get().pushAudit({ actor: 'CFO', action: 'Applied play', object: p.id, detail: p.name });
  },
  saveCurrentAsPlay: () => {
    const id = `PLAY-USR-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const ev = EVENT_BY_ID[get().activeEventId];
    const play = {
      id, name: `${ev?.label || 'Custom'} — saved`,
      date: new Date().toISOString().slice(0,10),
      crisis: ev?.label || '',
      savings: solveStrategy(ev, get().selectedClauses, get().multiEvent).savingsMode,
      composition: [...get().selectedClauses],
      outcome: 'Session play',
    };
    set(s => ({ savedPlays: [play, ...s.savedPlays] }));
    get().pushAudit({ actor: 'CFO', action: 'Saved play', object: play.id, detail: play.name });
  },

  // --- Audit log ---
  auditLog: [...RECENT_ACTIVITY.map(a => ({ ...a }))],
  pushAudit: (entry) => set(s => ({ auditLog: [
    { ...entry, ts: entry.ts || fmtClock() },
    ...s.auditLog,
  ].slice(0, 200) })),
  auditOpen: false,
  setAuditOpen: (v) => set({ auditOpen: v }),

  // --- Lineage drawer ---
  lineageOpen: false,
  lineageContext: null,
  openLineage: (ctx) => set({ lineageOpen: true, lineageContext: ctx }),
  closeLineage: () => set({ lineageOpen: false, lineageContext: null }),

  // --- AI Advisor ---
  aiAdvisorOpen: false,
  setAiAdvisorOpen: (v) => set({ aiAdvisorOpen: v }),

  // --- Demo controls ---
  demoControlsOpen: false,
  setDemoControlsOpen: (v) => set({ demoControlsOpen: v }),
  skipBoot: false,
  setSkipBoot: (v) => set({ skipBoot: v }),
  showConnectionLines: true,
  setShowConnectionLines: (v) => set({ showConnectionLines: v }),

  // --- Strategy applied & comparison slider ---
  strategyApplied: false,
  setStrategyApplied: (v) => set({ strategyApplied: v }),

  // --- Board pack ---
  boardPackOpen: false,
  setBoardPackOpen: (v) => set({ boardPackOpen: v }),

  // --- Three-Phase Indicator panel (closing visual of the demo) ---
  phasesPanelOpen: false,
  togglePhasesPanel: () => set(state => ({ phasesPanelOpen: !state.phasesPanelOpen })),

  // --- Theme (cosmetic-only) ---
  // 'war-room' (default, cinematic dark) | 'sac-story' (SAP Analytics Cloud Morning Horizon)
  // Toggled from the hidden demo controls panel. Never persisted — refresh restores 'war-room'.
  theme: 'war-room',
  setTheme: (t) => {
    set({ theme: t });
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t);
    }
    get().pushAudit({ actor: 'System', action: 'Switched theme', object: t === 'sac-story' ? 'SAC Story (Morning Horizon)' : 'War Room (default)', detail: '' });
  },

  // --- AI provider settings (never persisted; refresh wipes user-entered keys) ---
  activeProvider: 'chatpwc',
  providerConfig: {
    chatpwc:   { hasKey: !!CHATPWC_KEY, base: CHATPWC_BASE, model: CHATPWC_MODEL_DEFAULT },
    openai:    { apiKey: '', model: 'gpt-4o' },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-5' },
    azure:     { apiKey: '', endpoint: '', deploymentName: '', apiVersion: '2024-08-01-preview' },
  },
  connectionStatus: CHATPWC_KEY ? 'connected' : 'offline', // 'connected' | 'offline' | 'error'
  lastTestLatencyMs: null,
  lastError: null,
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  // Commit a draft from the SettingsModal. Stores nothing else.
  commitProviderSettings: ({ provider, config, latencyMs, connected }) => {
    set(s => ({
      activeProvider: provider,
      providerConfig: { ...s.providerConfig, [provider]: config },
      connectionStatus: connected ? 'connected' : (isAIConfigured(provider, { ...s.providerConfig, [provider]: config }) ? 'offline' : 'offline'),
      lastTestLatencyMs: latencyMs ?? null,
      lastError: null,
    }));
    get().pushAudit({ actor: 'System', action: 'Configured', object: 'AI Provider', detail: PROVIDER_META[provider]?.label || provider });
  },
}));

// Helper: default clauses for an event
function CLAUSES_DEFAULT_FOR(event) {
  if (event.id === 'HORMUZ')       return ['DUAL', 'HEDGE', 'PREBUILD'];
  if (event.id === 'CHINA_TARIFF') return ['USMCA_SHIFT', 'PASSTHRU', 'HEDGE'];
  if (event.id === 'USMCA_AUDIT')  return ['RENEGOTIATE', 'HEDGE'];
  return ['DUAL', 'HEDGE'];
}

/* ============================================================================
 * SECTION 6: BOOT SEQUENCE
 * ========================================================================== */

const BOOT_LINES = [
  { label: 'Connecting to Datasphere',           detail: 'sap-cds://prod.datasphere.americas/'   },
  { label: 'Loading 240 suppliers',              detail: 'Suppliers_BV · materialized: 02:14 UTC' },
  { label: 'Indexing 60 budget lines',           detail: 'GL_Balances_BV · FY2026 baseline'      },
  { label: 'Spinning up Databricks ML cluster',  detail: 'dbx-cluster · 4× r5.4xlarge · driver up' },
  { label: 'War Room Ready',                     detail: 'all systems nominal'                    },
];

function BootSequence() {
  const setMode = useWarRoom(s => s.setMode);
  const setBootSteps = useWarRoom(s => s.setBootSteps);
  const skipBoot = useWarRoom(s => s.skipBoot);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (skipBoot) {
      setMode('steady');
      return;
    }
    let cancelled = false;
    const stepDelay = 580;
    function next(i) {
      if (cancelled) return;
      setStep(i);
      setBootSteps(i);
      if (i >= BOOT_LINES.length) {
        setTimeout(() => !cancelled && setMode('steady'), 480);
      } else {
        setTimeout(() => next(i + 1), stepDelay);
      }
    }
    next(1);
    return () => { cancelled = true; };
  }, [skipBoot, setBootSteps, setMode]);

  // Esc skips boot
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMode('steady');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-50">
      <div className="absolute inset-0 hatch opacity-40" />
      <div className="absolute inset-0 pointer-events-none"
           style={{background: 'radial-gradient(ellipse at center, rgba(234,88,12,0.05), transparent 60%)'}} />
      <div className="relative z-10 w-[640px] px-10 py-12 hairline bg-ink-100/80 backdrop-blur">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <div>
              <div className="font-display text-xl text-paper-50 leading-none tracking-tight">Black Swan</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-paper-500 mt-1">War Room · v3.0</div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-stable anim-blink" />
            Initializing
          </div>
        </div>

        <div className="space-y-3 font-mono text-[13px]">
          {BOOT_LINES.map((line, i) => {
            const done = i < step;
            const active = i === step - 1;
            return (
              <div key={line.label} className="flex items-baseline gap-3" style={{opacity: done || active ? 1 : 0.25}}>
                <span className={`size-3 ${done ? 'text-stable' : 'text-paper-500'}`}>
                  {done ? <CheckCircle2 size={12} /> : active ? <Loader2 size={12} className="animate-spin" /> : <Circle size={12} />}
                </span>
                <span className={`flex-1 ${done ? 'text-paper-100' : 'text-paper-400'}`}>{line.label}</span>
                <span className="text-paper-500 text-[11px]">{line.detail}</span>
                {done && <span className="text-stable text-[11px]">✓</span>}
              </div>
            );
          })}
        </div>

        <div className="mt-10 hairline-t pt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-paper-500">
          <span>Datasphere · S/4HANA · IBP · TM · Ariba · BDC</span>
          <span className="flex items-center gap-3">
            <span>Region: AMER-EAST</span>
            <span className="text-paper-400">·</span>
            <span className="hairline px-1.5 py-[1px] text-[9px] text-paper-300">ESC</span>
            <span className="text-paper-500">to skip</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * SECTION 7: SHARED PRIMITIVES
 * ========================================================================== */

function Logo({ size = 22 }) {
  // Use style (CSS) for fills/strokes so var() resolves on theme switch.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="block">
      <rect width="64" height="64" rx="6"
        style={{ fill: 'var(--color-bg-canvas)', stroke: 'var(--color-border-strong)' }} strokeWidth="1" />
      <path d="M14 44 L26 24 L38 36 L50 14"
        style={{ stroke: 'var(--color-primary)' }} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="14" r="3" style={{ fill: 'var(--color-warn)' }} />
      <circle cx="50" cy="14" r="6" fill="none" style={{ stroke: 'var(--color-warn)' }} strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

function Pill({ children, color = 'paper', size = 'sm' }) {
  const colorMap = {
    paper: 'bg-ink-400 text-paper-200 border-ink-500',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    severe: 'bg-orange-600/20 text-orange-400 border-orange-600/40',
    critical: 'bg-red-600/20 text-red-400 border-red-600/40',
    stable: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    info: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  };
  const sizeMap = {
    xs: 'text-[9px] tracking-[0.18em] uppercase px-1.5 py-[1px]',
    sm: 'text-[10px] tracking-[0.16em] uppercase px-2 py-0.5',
    md: 'text-[11px] tracking-[0.14em] uppercase px-2.5 py-1',
  };
  return (
    <span className={`inline-flex items-center gap-1 border ${colorMap[color]} ${sizeMap[size]} font-mono`}>
      {children}
    </span>
  );
}

function SectionLabel({ children, right, className = '' }) {
  return (
    <div className={`flex items-baseline justify-between ${className}`}>
      <div className="text-[10px] uppercase tracking-[0.28em] text-paper-500">{children}</div>
      {right && <div className="text-[10px] uppercase tracking-[0.2em] text-paper-400 font-mono">{right}</div>}
    </div>
  );
}

// ---------- GroundedNumber — every $ flows through this ----------
function GroundedNumber({
  value,
  format = 'usd',
  compact = false,
  precision,
  lineageId,
  decomp,   // [{name, weight}]
  band,     // { p10, p50, p90 }
  className = '',
  label,
  size = 'md',
}) {
  const openLineage = useWarRoom(s => s.openLineage);
  const [hover, setHover] = useState(false);

  const rendered = format === 'usd'
    ? fmtUSD(value, { compact, precision })
    : format === 'pct'
      ? fmtPct(value, precision ?? 1)
      : String(value);

  const sizeMap = {
    xs: 'text-[12px]',
    sm: 'text-[13px]',
    md: 'text-[15px]',
    lg: 'text-[22px]',
    xl: 'text-[34px]',
    '2xl': 'text-[44px]',
  };

  return (
    <span
      className={`group inline-flex items-baseline gap-1 font-mono tabular ${sizeMap[size] || ''} ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="relative">
        {rendered}
        {hover && decomp && (
          <span className="absolute z-30 bottom-full left-0 mb-2 w-72 hairline bg-ink-200 p-3 font-sans normal-case text-paper-100 text-[11px] tracking-normal shadow-2xl">
            <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500 mb-1.5">Confidence Decomposition</div>
            {band && (
              <div className="mb-2 font-mono text-paper-200">
                P50 <span className="text-paper-50">{fmtUSD(band.p50, { compact: true })}</span>
                {' · '}
                P10–P90 <span className="text-paper-300">{fmtUSD(band.p10, { compact: true })} – {fmtUSD(band.p90, { compact: true })}</span>
              </div>
            )}
            <div className="space-y-1">
              {decomp.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="flex-1 truncate">{d.name}</div>
                  <div className="w-20 h-1.5 bg-ink-400 relative">
                    <div className="absolute inset-y-0 left-0 bg-amber" style={{width: `${d.weight*100}%`}} />
                  </div>
                  <div className="w-10 text-right font-mono text-paper-200">{Math.round(d.weight*100)}%</div>
                </div>
              ))}
            </div>
          </span>
        )}
      </span>
      {lineageId && (
        <button
          onClick={() => openLineage({ id: lineageId, label, value, band, decomp })}
          className="text-paper-500 hover:text-amber-400 transition-colors leading-none"
          title="Show data lineage"
        >
          <Database size={size === 'lg' || size === 'xl' || size === '2xl' ? 12 : 10} />
        </button>
      )}
    </span>
  );
}

/* ============================================================================
 * SECTION 8: LINEAGE DRAWER
 * ========================================================================== */

const LINEAGE_QUERIES = {
  budget_total: {
    title: 'FY2026 Operating Budget — Total',
    sql: `-- Databricks · Datasphere passthrough
SELECT
  SUM(gl.fy26_baseline_usd) AS total_opex,
  COUNT(DISTINCT gl.gl_account) AS line_items
FROM datasphere.Suppliers_BV s
JOIN datasphere.GL_Balances_BV gl
  ON s.gl_account = gl.gl_account
WHERE gl.fiscal_year = 'FY2026'
  AND gl.legal_entity = 'MDS-US-01';`,
    rows: BUDGET_LINES.slice(0, 8).map(l => ({ gl: l.sap.split(' ').pop(), name: l.name, fy26: l.fy26 })),
    model: { name: 'budget-aggregator-v1.4', type: 'OR-Tools constraint LP', features: 'fy25 actual, escalation %, hedge coverage', retrain: 'monthly · last 14 days', window: '36-month rolling' },
  },
  budget_donut: {
    title: 'FY2026 Budget by Category',
    sql: `SELECT category, SUM(fy26_baseline_usd) AS total
FROM datasphere.GL_Balances_BV
WHERE fiscal_year = 'FY2026' GROUP BY category;`,
    rows: BUDGET_CATEGORIES.map(c => ({ category: c.name, total: BUDGET_LINES.filter(l => l.cat === c.id).reduce((s,l)=>s+l.fy26,0) })),
    model: { name: 'budget-aggregator-v1.4', type: 'Aggregation', features: 'category mapping', retrain: 'on-update', window: 'live' },
  },
  margin: {
    title: 'Gross Margin Projection',
    sql: `SELECT (rev.total - opex.total) / rev.total AS margin
FROM (SELECT SUM(fy26_revenue_usd) AS total FROM datasphere.Sales_BV WHERE fy='FY2026') rev,
     (SELECT SUM(fy26_baseline_usd) AS total FROM datasphere.GL_Balances_BV WHERE fy='FY2026') opex;`,
    rows: [{ metric: 'Revenue', value: COMPANY.revenue }, { metric: 'OpEx', value: BUDGET_TOTAL_FY26 }, { metric: 'Gross Margin', value: ((COMPANY.revenue - BUDGET_TOTAL_FY26)/COMPANY.revenue) }],
    model: { name: 'margin-projector-v3.1', type: 'Bayesian regression', features: 'revenue forecast, opex baseline, hedge coverage', retrain: 'weekly · Tue 04:00 UTC', window: '60-month' },
  },
  ebitda: {
    title: 'EBITDA Margin (FY2026)',
    sql: `WITH p AS (
  SELECT ebitda_baseline_usd FROM datasphere.PnL_BV WHERE fy='FY2026'
) SELECT ebitda_baseline_usd / 195000000 AS ebitda_margin FROM p;`,
    rows: [{ metric: 'Target', value: COMPANY.targets.ebitdaMargin }, { metric: 'Projected', value: 0.139 }, { metric: 'Variance', value: -0.006 }],
    model: { name: 'pnl-projector-v2.6', type: 'XGBoost', features: 'opex, revenue mix, FX, hedge coverage', retrain: 'weekly', window: '48-month' },
  },
  contingency: {
    title: 'Contingency Reserve',
    sql: `SELECT reserve_usd, reserve_usd / opex_total AS pct
FROM datasphere.Treasury_BV WHERE fy='FY2026';`,
    rows: [{ metric: 'Reserve', value: 4_800_000 }, { metric: 'OpEx', value: BUDGET_TOTAL_FY26 }, { metric: '% of OpEx', value: 4_800_000 / BUDGET_TOTAL_FY26 }],
    model: { name: 'treasury-recon-v1.0', type: 'Rule-based', features: 'cash, credit lines, accruals', retrain: 'daily', window: 'live' },
  },
  hormuz_impact: {
    title: 'Strait of Hormuz — P50 Impact',
    sql: `SELECT SUM(impact_usd_mode) AS p50_impact
FROM databricks.event_impact
WHERE event_id = 'HORMUZ' AND scenario_horizon_days = 90;`,
    rows: EVENTS[0].affectedLineIds.map(id => {
      const l = BUDGET_LINES.find(x => x.id === id);
      return { line: l.name, baseline: l.fy26, est_impact: Math.round(l.fy26 * 0.045) };
    }),
    model: { name: 'event-impact-bayes-v2.7', type: 'Bayesian regression', features: 'tariff rate, FX, demand elasticity, hedge coverage', retrain: 'event-triggered', window: '24-month' },
  },
  risk_score: {
    title: 'Composite Risk Score',
    sql: `SELECT supplier_id, name, region, composite_risk_score
FROM datasphere.Suppliers_BV
ORDER BY composite_risk_score DESC LIMIT 20;`,
    rows: [...SUPPLIERS].sort((a,b) => b.riskScore - a.riskScore).slice(0, 12).map(s => ({ id: s.id, name: s.name, region: s.region, score: s.riskScore })),
    model: { name: 'supplier-risk-iforest-v3.2', type: 'Isolation Forest', features: 'credit, OTD, region, geopolitical exposure', retrain: 'weekly', window: '24-month rolling' },
  },
};

function LineageDrawer() {
  const { lineageOpen, lineageContext, closeLineage } = useWarRoom(s => ({
    lineageOpen: s.lineageOpen, lineageContext: s.lineageContext, closeLineage: s.closeLineage
  }));

  if (!lineageOpen) return null;
  const data = LINEAGE_QUERIES[lineageContext?.id] || LINEAGE_QUERIES.budget_total;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 anim-fade-in" onClick={closeLineage} />
      <div className="fixed top-0 right-0 z-50 h-full w-[560px] bg-ink-100 hairline-l overflow-y-auto anim-slide-up" style={{animationDuration:'.35s'}}>
        <div className="sticky top-0 bg-ink-100/95 backdrop-blur hairline-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Data Lineage</div>
            <div className="font-display text-lg text-paper-50 mt-0.5">{data.title}</div>
          </div>
          <button onClick={closeLineage} className="hairline px-2 py-1.5 hover:bg-ink-300 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <SectionLabel>Simulated Databricks query</SectionLabel>
            <pre className="mt-2 hairline bg-ink-50 p-4 font-mono text-[11px] leading-relaxed text-paper-200 overflow-x-auto whitespace-pre">{data.sql}</pre>
            <div className="mt-2 text-[10px] text-paper-500 font-mono">Datasphere CDS views: Suppliers_BV · BOM_Header_BV · GL_Balances_BV · Freight_Lanes_BV</div>
          </section>

          <section>
            <SectionLabel right={`${data.rows.length} rows`}>Underlying records (sample)</SectionLabel>
            <div className="mt-2 hairline overflow-hidden">
              <table className="w-full text-[12px] font-mono">
                <thead className="bg-ink-200 text-paper-400 text-[10px] uppercase tracking-[0.16em]">
                  <tr>{Object.keys(data.rows[0]).map(k => <th key={k} className="text-left px-3 py-2">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className={i % 2 ? 'bg-ink-200/40' : ''}>
                      {Object.entries(r).map(([k, v]) => (
                        <td key={k} className="px-3 py-2 text-paper-100">
                          {typeof v === 'number' && k.includes('value') && k !== 'fy26' ? (Math.abs(v) < 1 ? fmtPct(v) : fmtUSD(v, { compact: true })) :
                           typeof v === 'number' && (k.includes('impact') || k.includes('baseline') || k === 'fy26' || k === 'total' || k === 'spend') ? fmtUSD(v, { compact: true }) :
                           typeof v === 'number' && k === 'score' ? v.toFixed(0) :
                           String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <SectionLabel>Model card</SectionLabel>
            <div className="mt-2 hairline p-4 space-y-2 bg-ink-200/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-[13px] text-paper-50">{data.model.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-paper-500 mt-0.5">{data.model.type}</div>
                </div>
                <Pill color="info" size="xs">Production</Pill>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] mt-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">Features</div>
                  <div className="text-paper-200 mt-0.5">{data.model.features}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">Training window</div>
                  <div className="text-paper-200 mt-0.5 font-mono">{data.model.window}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">Retrain cadence</div>
                  <div className="text-paper-200 mt-0.5 font-mono">{data.model.retrain}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">Decision boundary</div>
                  <div className="text-paper-200 mt-0.5 font-mono">CRPS &lt; 0.20</div>
                </div>
              </div>
            </div>
          </section>

          {lineageContext?.band && (
            <section>
              <SectionLabel>Confidence</SectionLabel>
              <div className="mt-2 hairline p-4 bg-ink-200/40">
                <div className="font-mono text-[14px] text-paper-50">
                  P50 {fmtUSD(lineageContext.band.p50, { compact: true })}
                  <span className="text-paper-400"> ± {fmtUSD((lineageContext.band.p90 - lineageContext.band.p10)/2, { compact: true })}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-[11px] font-mono">
                  <div className="text-paper-400">P10 <span className="text-paper-100">{fmtUSD(lineageContext.band.p10, { compact: true })}</span></div>
                  <div className="text-paper-400">P50 <span className="text-paper-100">{fmtUSD(lineageContext.band.p50, { compact: true })}</span></div>
                  <div className="text-paper-400">P90 <span className="text-paper-100">{fmtUSD(lineageContext.band.p90, { compact: true })}</span></div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/* ============================================================================
 * SECTION 9: HEADER
 * ========================================================================== */

function Header() {
  const { mode, activeEventId, secondaryEventId, timeElapsedSec, multiEvent } = useWarRoom(s => ({
    mode: s.mode, activeEventId: s.activeEventId, secondaryEventId: s.secondaryEventId,
    timeElapsedSec: s.timeElapsedSec, multiEvent: s.multiEvent,
  }));
  const showCounter = mode === 'alert' || mode === 'response';
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;

  return (
    <header className="relative z-30 hairline-b bg-ink-100/80 backdrop-blur">
      {/* Top row */}
      <div className="shell-bar h-[60px] px-5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 min-w-[280px]">
          <Logo size={26} />
          <div className="leading-none">
            <div className="font-display text-[19px] text-paper-50 tracking-tight">Black Swan</div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-paper-500 mt-1">War Room · {COMPANY.fy}</div>
          </div>
          <div className="hairline-l h-7 mx-2" />
          <div className="leading-tight">
            <div className="text-[11px] text-paper-200">{COMPANY.name}</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500 mt-0.5">{COMPANY.ticker}</div>
          </div>
        </div>

        {/* Center — Time-to-Decision (shown in alert/response) */}
        <div className="flex-1 flex justify-center">
          {showCounter && (
            <div className="flex flex-col items-center anim-fade-in" style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}>
              <div className="font-mono text-[13px] text-paper-50 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-severe anim-blink" />
                Signal detected <span className="text-paper-400">·</span> <span className="text-amber-400">{fmtDuration(timeElapsedSec)} ago</span>
                <span className="text-paper-500 mx-1">|</span>
                <span className="text-paper-400">Industry benchmark:</span> <span className="text-paper-200">6 weeks</span>
              </div>
              {/* Brutal progress bar */}
              <div className="mt-1.5 relative w-[420px] h-[3px] bg-ink-400">
                <div className="absolute inset-y-0 left-0 bg-paper-500/40" style={{width: `${Math.min(100, (timeElapsedSec / (6*7*24*3600)) * 100)}%`}} />
                <div className="absolute inset-y-[-3px] w-[1px] bg-amber-400" style={{left: `${Math.min(100, (timeElapsedSec / (6*7*24*3600)) * 100)}%`}} />
                <div className="absolute -top-3 left-0 text-[8px] uppercase tracking-[0.18em] text-paper-500 font-mono">Now</div>
                <div className="absolute -top-3 right-0 text-[8px] uppercase tracking-[0.18em] text-paper-500 font-mono">6 weeks</div>
              </div>
              {event && (
                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-paper-400 font-mono">
                  {event.label}{multiEvent && secondaryEventId ? ` × ${EVENT_BY_ID[secondaryEventId].label.split('(')[0].trim()}` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-[280px] justify-end">
          <ThemeIndicators />
          <SavedPlaysDropdown />
          <button
            onClick={() => useWarRoom.setState({ settingsOpen: true })}
            className="hairline px-2 py-1.5 text-paper-400 hover:text-amber-300 hover:bg-ink-300 transition-colors"
            title="AI Provider Settings"
            aria-label="AI Provider Settings"
          >
            <Settings size={13} />
          </button>
          <button
            className="hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-300 hover:text-paper-50 hover:bg-ink-300 transition-colors flex items-center gap-1.5"
            onClick={() => useWarRoom.setState({ aiAdvisorOpen: !useWarRoom.getState().aiAdvisorOpen })}
          >
            <Bot size={12} /> Advisor
          </button>
          <ConnectionStatus />
        </div>
      </div>

      {/* KPI strip */}
      <KPIStrip />
    </header>
  );
}

function ConnectionStatus() {
  const { activeProvider, providerConfig, connectionStatus } = useWarRoom(s => ({
    activeProvider: s.activeProvider,
    providerConfig: s.providerConfig,
    connectionStatus: s.connectionStatus,
  }));
  const meta = PROVIDER_META[activeProvider];
  const cfg = providerConfig[activeProvider] || {};
  const configured = isAIConfigured(activeProvider, providerConfig);
  // Effective tone
  const tone = connectionStatus === 'error' ? 'error'
    : configured ? 'connected'
    : 'offline';
  const dotClass = tone === 'connected' ? 'bg-stable anim-blink'
    : tone === 'error' ? 'bg-critical anim-blink'
    : 'bg-paper-500';
  const textClass = tone === 'connected' ? 'text-paper-300'
    : tone === 'error' ? 'text-critical-soft'
    : 'text-paper-500';
  // Model label — never leak any part of the key.
  const modelLabel = activeProvider === 'azure'
    ? (cfg.deploymentName ? `· ${cfg.deploymentName}` : '')
    : (cfg.model ? `· ${cfg.model}` : '');
  const label = tone === 'connected' ? `AI Connected (${meta?.label} ${modelLabel})`
    : tone === 'error' ? 'AI Connection Error — click to reconfigure'
    : 'AI Offline — using mock data';
  return (
    <button
      onClick={() => useWarRoom.setState({ settingsOpen: true })}
      className={`flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-mono hover:opacity-80 transition-opacity`}
      title="Open AI provider settings"
    >
      <span className={`size-1.5 rounded-full ${dotClass}`} />
      <span className={textClass}>{label}</span>
    </button>
  );
}

// SAC-only indicators (Demo Data + active theme). Both hide in War Room.
function ThemeIndicators() {
  const theme = useWarRoom(s => s.theme);
  if (theme !== 'sac-story') return null;
  return (
    <>
      <span
        className="px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase"
        style={{
          background: 'var(--color-negative)',
          color: '#FFFFFF',
          borderRadius: 'var(--radius-pill)',
        }}
        title="Mock dataset for demonstration"
      >
        Demo Data
      </span>
      <span
        className="px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em]"
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          color: 'var(--color-text-inverse)',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid rgba(255, 255, 255, 0.20)',
        }}
        title="Active theme"
      >
        Theme: SAC Story
      </span>
    </>
  );
}

function SavedPlaysDropdown() {
  const { savedPlays, applySavedPlay, mode } = useWarRoom(s => ({
    savedPlays: s.savedPlays, applySavedPlay: s.applySavedPlay, mode: s.mode
  }));
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-300 hover:text-paper-50 hover:bg-ink-300 transition-colors flex items-center gap-1.5"
      >
        <BookOpen size={12} /> Saved Plays <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[340px] hairline bg-ink-200 anim-fade-in">
          <div className="px-3 py-2 hairline-b text-[10px] uppercase tracking-[0.2em] text-paper-500 flex justify-between">
            <span>Library · {savedPlays.length}</span>
            <span className="text-paper-400 font-mono">prior crises</span>
          </div>
          {savedPlays.map(p => (
            <button
              key={p.id}
              onClick={() => { applySavedPlay(p.id); setOpen(false); }}
              disabled={mode !== 'response'}
              className="block w-full text-left px-3 py-2.5 hover:bg-ink-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <div className="flex items-baseline justify-between">
                <div className="font-display text-[14px] text-paper-50 group-hover:text-amber-300">{p.name}</div>
                <div className="font-mono text-[10px] text-paper-500">{p.date}</div>
              </div>
              <div className="text-[11px] text-paper-400 mt-1">{p.crisis}</div>
              <div className="mt-1.5 flex items-center gap-2">
                <Pill color="stable" size="xs">SAVED {fmtUSD(p.savings, { compact: true })}</Pill>
                <div className="text-[10px] text-paper-500 font-mono">{p.composition.length} clauses</div>
              </div>
            </button>
          ))}
          {mode !== 'response' && (
            <div className="px-3 py-2 hairline-t text-[10px] text-paper-500">Applicable in Response State</div>
          )}
        </div>
      )}
    </div>
  );
}

function KPIStrip() {
  // Compute KPIs from baseline
  const opex = BUDGET_TOTAL_FY26;
  const margin = (COMPANY.revenue - opex) / COMPANY.revenue;
  const ebitda = 0.139; // mocked
  const contingencyPct = 4_800_000 / opex;
  const riskScore = Math.round(SUPPLIERS.reduce((s, x) => s + x.riskScore, 0) / SUPPLIERS.length);

  const activeSignals = 12; // count of red+amber in signal feed
  const mode = useWarRoom(s => s.mode);

  return (
    <div className="hairline-t bg-ink-50/60 px-5 py-2.5 grid grid-cols-5 gap-px">
      <KPITile
        label="Total OpEx (FY26)" sub="Baseline · 60 lines"
        value={<GroundedNumber value={opex} compact precision={1} size="md" label="Total OpEx" lineageId="budget_total" />}
        delta="+4.1% vs FY25" deltaColor="amber"
      />
      <KPITile
        label="Gross Margin" sub={`Target ${fmtPct(COMPANY.targets.grossMargin, 0)}`}
        value={<GroundedNumber value={margin} format="pct" precision={1} size="md" label="Gross Margin" lineageId="margin" />}
        delta="-80bps to target" deltaColor="amber"
      />
      <KPITile
        label="EBITDA Margin" sub={`Target ${fmtPct(COMPANY.targets.ebitdaMargin, 1)}`}
        value={<GroundedNumber value={ebitda} format="pct" precision={1} size="md" label="EBITDA Margin" lineageId="ebitda" />}
        delta="-60bps to target" deltaColor="amber"
      />
      <KPITile
        label="Contingency Reserve" sub="As % of OpEx"
        value={<GroundedNumber value={contingencyPct} format="pct" precision={1} size="md" label="Contingency" lineageId="contingency" />}
        delta={fmtUSD(4_800_000, { compact: true })} deltaColor="stable"
      />
      <KPITile
        label="Active Signals" sub={`Avg supplier risk: ${riskScore}`}
        value={<span className="font-mono text-[15px] text-paper-50">{activeSignals}</span>}
        delta={mode === 'alert' || mode === 'response' ? '1 SEVERE' : 'all monitored'}
        deltaColor={mode === 'alert' || mode === 'response' ? 'severe' : 'stable'}
      />
    </div>
  );
}

function KPITile({ label, sub, value, delta, deltaColor = 'paper' }) {
  const deltaColorMap = {
    paper: 'text-paper-400', amber: 'text-amber-400', severe: 'text-orange-400',
    critical: 'text-red-400', stable: 'text-emerald-400', info: 'text-cyan-400',
  };
  return (
    <div className="px-4 py-1.5 flex flex-col">
      <div className="flex items-baseline justify-between">
        <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">{label}</div>
        <div className={`text-[10px] font-mono ${deltaColorMap[deltaColor]}`}>{delta}</div>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between">
        <div>{value}</div>
        <div className="text-[10px] text-paper-500">{sub}</div>
      </div>
    </div>
  );
}

/* ============================================================================
 * SECTION 10: SIGNAL FEED SIDEBAR
 * ========================================================================== */

function SignalSidebar() {
  const { mode, activeEventId, showConnectionLines } = useWarRoom(s => ({
    mode: s.mode, activeEventId: s.activeEventId, showConnectionLines: s.showConnectionLines
  }));
  const [items, setItems] = useState(() => {
    // Seed with 16 items; the Hormuz pre-stage gets reserved for slot 5
    const initial = [];
    const pool = [...SIGNAL_POOL];
    for (let i = 0; i < 16; i++) {
      const idx = (i * 3) % pool.length;
      initial.push({ ...pool[idx], key: `init-${i}`, age: 60 + i * 4 });
    }
    return initial;
  });
  const [pulseKey, setPulseKey] = useState(0);

  // Periodic ticker
  useEffect(() => {
    const t = setInterval(() => {
      setItems(cur => {
        const next = [...cur];
        const sourceIdx = Math.floor(Math.random() * SIGNAL_POOL.length);
        const item = { ...SIGNAL_POOL[sourceIdx], key: `tick-${Date.now()}-${sourceIdx}`, age: 0 };
        // Skip the pre-stage one in periodic mode
        if (item.tagId === 'HORMUZ_PRESTAGE') return cur;
        next.unshift(item);
        if (next.length > 22) next.pop();
        return next.map(x => ({ ...x, age: x.age + 8 }));
      });
    }, 8500);
    return () => clearInterval(t);
  }, []);

  // When alert fires, move the Hormuz item to top and pulse
  useEffect(() => {
    if (mode !== 'alert' && mode !== 'response') return;
    const eventTagMap = {
      HORMUZ: 'HORMUZ_PRESTAGE',
    };
    const tag = eventTagMap[activeEventId];
    if (!tag) return;
    setItems(cur => {
      const hormuz = SIGNAL_POOL.find(s => s.tagId === tag);
      const without = cur.filter(x => x.tagId !== tag);
      return [{ ...hormuz, key: `alert-${Date.now()}`, age: 0, pulsing: true }, ...without];
    });
    setPulseKey(k => k + 1);
  }, [mode, activeEventId]);

  return (
    <aside className="w-[240px] flex-none hairline-r bg-ink-100/40 flex flex-col h-full relative" id="signal-sidebar">
      <div className="px-3 py-3 hairline-b flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Signal Feed</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-paper-300 font-mono mt-0.5 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-stable anim-blink" />
            Live · {items.length}
          </div>
        </div>
        <button className="text-paper-500 hover:text-paper-200">
          <Search size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.map((item, i) => (
          <SignalItem key={item.key} item={item} index={i} pulsing={item.pulsing} pulseKey={pulseKey} />
        ))}
      </div>

      <div className="hairline-t px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono flex justify-between">
        <span>Sources · 14</span>
        <span>Updated {fmtClock(new Date())}</span>
      </div>
    </aside>
  );
}

function SignalItem({ item, index, pulsing, pulseKey }) {
  const confColor = item.confidence === 'red' ? COLORS.critical : item.confidence === 'amber' ? COLORS.amber : COLORS.stable;
  return (
    <div
      className={`px-3 py-2 hairline-b border-ink-300 hover:bg-ink-200/60 transition-colors group ${pulsing ? 'pulse-severe' : ''}`}
      style={{ animation: index === 0 && !pulsing ? 'tick 0.4s var(--ease-stoic) forwards' : undefined }}
      data-tag={item.tagId || ''}
    >
      <div className="flex items-start gap-2">
        <span className="size-1.5 rounded-full mt-1.5 flex-none" style={{background: confColor}} />
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] text-paper-100 leading-snug">{item.text}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[9px] uppercase tracking-[0.16em] text-paper-500 font-mono">{item.type}</span>
            {item.value && (
              <span className={`text-[10px] font-mono ${item.value.startsWith('+') ? 'text-amber-400' : 'text-emerald-400'}`}>
                {item.value}
              </span>
            )}
            <span className="text-[9px] text-paper-500 ml-auto font-mono">{Math.floor(item.age / 60)}m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * SECTION 11: AUDIT DRAWER
 * ========================================================================== */

function AuditDrawer() {
  const { auditOpen, setAuditOpen, auditLog, auditPing } = useWarRoom(s => ({
    auditOpen: s.auditOpen, setAuditOpen: s.setAuditOpen, auditLog: s.auditLog,
    auditPing: s.auditPing,
  }));
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (auditPing === 0) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 2900);
    return () => clearTimeout(t);
  }, [auditPing]);

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!auditOpen) {
    return (
      <button
        onClick={() => { setAuditOpen(true); setPulse(false); }}
        className={`hairline-l hover:bg-ink-200 transition-colors w-[32px] flex items-center justify-center bg-ink-100/40 h-full group relative ${pulse ? 'audit-pulse' : ''}`}
      >
        <div className={`text-[9px] uppercase tracking-[0.3em] ${pulse ? 'text-amber-300' : 'text-paper-400'} group-hover:text-amber-300 transition-colors`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Audit Trail · {auditLog.length}
          {pulse && <span className="text-amber-400"> · new</span>}
        </div>
      </button>
    );
  }

  return (
    <aside className="w-[360px] flex-none hairline-l bg-ink-100 flex flex-col h-full">
      <div className="px-4 py-3 hairline-b flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Audit Trail</div>
          <div className="font-mono text-[11px] text-paper-300 mt-0.5">{auditLog.length} entries · session</div>
        </div>
        <button onClick={() => setAuditOpen(false)} className="hairline px-1.5 py-1.5 hover:bg-ink-300">
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {auditLog.map((e, i) => (
          <div key={i} className="px-4 py-2.5 hairline-b border-ink-300 group hover:bg-ink-200/40">
            <div className="flex items-baseline justify-between">
              <div className="font-mono text-[10px] text-paper-500">{e.ts}</div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-paper-400">{e.action}</div>
            </div>
            <div className="mt-0.5 text-[12px] text-paper-100 leading-snug">{e.object}</div>
            <div className="mt-0.5 flex items-baseline justify-between text-[10px]">
              <div className="text-paper-400">{e.actor}</div>
              {e.detail && <div className="text-paper-500 font-mono">{e.detail}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="hairline-t px-4 py-3 flex gap-2">
        <button onClick={exportLog} className="hairline flex-1 py-2 text-[10px] uppercase tracking-[0.18em] text-paper-200 hover:bg-ink-300 transition-colors flex items-center justify-center gap-1.5">
          <Download size={11} /> Export JSON
        </button>
        <button onClick={() => useWarRoom.getState().saveCurrentAsPlay()} className="hairline px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-paper-200 hover:bg-ink-300 transition-colors flex items-center gap-1.5">
          <Save size={11} /> Save Play
        </button>
      </div>
    </aside>
  );
}

/* ============================================================================
 * SECTION 12: STEADY STATE — Ambient Budget · Heatmap · Activity
 * ========================================================================== */

function SteadyState() {
  return (
    <div className="h-full overflow-y-auto px-6 py-4 anim-fade-in">
      <BudgetPanel />
      <div className="mt-6"><SupplierHeatmap /></div>
      <div className="mt-6"><ActivityFeed /></div>
    </div>
  );
}

function BudgetPanel() {
  // Theme-aware palette — donut + legend swatches re-color on theme switch
  const theme = useWarRoom(s => s.theme);
  const palette = CHART_PALETTES[theme] || CHART_PALETTES['war-room'];
  const catSums = useMemo(() => BUDGET_CATEGORIES.map((c, i) => ({
    ...c,
    color: palette[i % palette.length],
    total: BUDGET_LINES.filter(l => l.cat === c.id).reduce((s, l) => s + l.fy26, 0),
  })).sort((a, b) => b.total - a.total), [palette]);

  return (
    <section className="hairline bg-ink-100/40">
      <div className="px-5 py-3 hairline-b flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">FY2026 Operating Budget</div>
          <div className="font-display text-[20px] text-paper-50 mt-0.5 tracking-tight">
            <GroundedNumber value={BUDGET_TOTAL_FY26} compact precision={1} size="lg" lineageId="budget_total" label="FY2026 Total OpEx" />
            <span className="ml-2 text-[12px] font-sans text-paper-400 font-normal">across 60 line items · 11 categories</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Pill color="info">BASELINE</Pill>
          <Pill color="stable">FY2026 LOCKED · 04 NOV</Pill>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-px bg-ink-300/40">
        {/* Donut — chart + centered overlay locked together in a 280px box so the
            overlay never drifts when the grid row stretches taller than the chart. */}
        <div className="col-span-5 bg-ink-100 p-5 flex items-center justify-center">
          <div className="relative w-full" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={catSums} dataKey="total" nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={68} outerRadius={108} stroke={COLORS.ink50} strokeWidth={2}
                  paddingAngle={1}
                >
                  {catSums.map((c, i) => <Cell key={c.id} fill={c.color} />)}
                </Pie>
                <RTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="hairline bg-ink-200 px-3 py-2 text-[11px]">
                        <div className="text-paper-50 font-mono">{d.name}</div>
                        <div className="text-paper-300 font-mono">{fmtUSD(d.total, { compact: true })} · {fmtPct(d.total / BUDGET_TOTAL_FY26, 1)}</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Overlay covers the same 280px box → its center matches the pie center exactly */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center leading-tight">
                <div className="text-[9px] uppercase tracking-[0.24em] text-paper-500">OpEx FY26</div>
                <div className="font-display text-[22px] text-paper-50 leading-none mt-1.5 whitespace-nowrap">
                  {fmtUSD(BUDGET_TOTAL_FY26, { compact: true })}
                </div>
                <div className="text-[10px] text-paper-400 mt-1.5 font-mono whitespace-nowrap">
                  +{fmtPct((BUDGET_TOTAL_FY26 - BUDGET_TOTAL_FY25) / BUDGET_TOTAL_FY25, 1)} vs FY25
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category legend */}
        <div className="col-span-4 bg-ink-100 p-5">
          <SectionLabel right={`${catSums.length} categories`}>Categories</SectionLabel>
          <div className="mt-2 space-y-1">
            {catSums.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 group cursor-default"
                onClick={() => useWarRoom.getState().openLineage({ id: 'budget_donut', label: c.name })}
              >
                <div className="size-2.5 flex-none" style={{ background: c.color }} />
                <div className="text-[11.5px] text-paper-100 flex-1">{c.name}</div>
                <div className="font-mono text-[11px] text-paper-200">{fmtUSD(c.total, { compact: true })}</div>
                <div className="font-mono text-[10px] text-paper-500 w-10 text-right">{fmtPct(c.total / BUDGET_TOTAL_FY26, 1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KPIs vertical stack */}
        <div className="col-span-3 bg-ink-100 p-5 space-y-3">
          <SmallKPI
            label="Gross Margin (proj)" value={(COMPANY.revenue - BUDGET_TOTAL_FY26) / COMPANY.revenue}
            target={COMPANY.targets.grossMargin} format="pct" lineageId="margin"
          />
          <SmallKPI label="EBITDA Margin" value={0.139} target={COMPANY.targets.ebitdaMargin} format="pct" lineageId="ebitda" />
          <SmallKPI label="Contingency" value={4_800_000 / BUDGET_TOTAL_FY26} target={0.04} format="pct" lineageId="contingency" />
          <SmallKPI label="Hedge Coverage" value={0.70} target={COMPANY.targets.hedgeCoverage} format="pct" />
        </div>
      </div>
    </section>
  );
}

function SmallKPI({ label, value, target, format = 'pct', lineageId }) {
  const onTarget = value >= target;
  const variance = value - target;
  return (
    <div className="hairline p-3 bg-ink-200/30">
      <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <GroundedNumber value={value} format={format} precision={1} size="md" lineageId={lineageId} label={label} />
        <span className={`text-[10px] font-mono ${onTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
          {onTarget ? '▲' : '▼'} {fmtPct(Math.abs(variance), 2)}
        </span>
      </div>
      <div className="text-[9px] text-paper-500 font-mono mt-0.5">Target {fmtPct(target, 1)}</div>
    </div>
  );
}

// ---------- Supplier Risk Heatmap ----------
function SupplierHeatmap() {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const byRegion = useMemo(() => {
    const groups = { NA: [], EU: [], AS: [], ME: [] };
    SUPPLIERS.forEach(s => groups[s.region].push(s));
    return groups;
  }, []);

  return (
    <section className="hairline bg-ink-100/40 relative">
      <div className="px-5 py-3 hairline-b flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Supplier Risk Heatmap</div>
          <div className="font-display text-[16px] text-paper-50 mt-0.5">
            240 suppliers · composite risk score
            <span className="ml-3 text-[12px] font-sans text-paper-400 font-normal">XGBoost / Isolation Forest ensemble · retrained weekly</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskLegend />
          <button
            onClick={() => useWarRoom.getState().openLineage({ id: 'risk_score', label: 'Composite Risk Score' })}
            className="hairline px-2 py-1.5 text-[10px] uppercase tracking-[0.18em] text-paper-300 hover:text-paper-50 hover:bg-ink-300 transition-colors flex items-center gap-1.5"
          >
            <Database size={11} /> Lineage
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-px bg-ink-300/40">
        {Object.entries(byRegion).map(([r, list]) => (
          <div key={r} className="bg-ink-100 p-4 min-h-[200px]">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-paper-400">{REGIONS[r].name}</div>
              <div className="text-[10px] font-mono text-paper-500">{list.length}</div>
            </div>
            <div className="grid grid-cols-10 gap-[2px]">
              {list.map(s => (
                <button
                  key={s.id}
                  className={`aspect-square transition-all ${selected?.id === s.id ? 'ring-2 ring-amber-400' : ''}`}
                  style={{ background: riskColor(s.riskScore) }}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(s)}
                />
              ))}
            </div>
            <div className="mt-2 flex items-baseline gap-2 text-[10px] font-mono">
              <span className="text-paper-500">avg</span>
              <span className="text-paper-200">{Math.round(list.reduce((a,x)=>a+x.riskScore,0)/list.length)}</span>
              <span className="text-paper-500 ml-auto">red</span>
              <span className="text-red-400">{list.filter(x=>x.riskScore>=65).length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Hover tooltip / selected detail rail */}
      {(hovered || selected) && (
        <div className="hairline-t bg-ink-200/60 px-5 py-3 flex items-start gap-5">
          {(() => {
            const s = selected || hovered;
            return (
              <>
                <div className="flex-none">
                  <div className="font-display text-[15px] text-paper-50">{s.name}</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono mt-0.5">{s.id} · {s.city}, {s.country}</div>
                </div>
                <div className="flex-1 grid grid-cols-5 gap-4 text-[11px]">
                  <Metric label="Risk Score"  v={<span className="font-mono text-paper-50">{s.riskScore}</span>} />
                  <Metric label="OTD"          v={<span className="font-mono text-paper-50">{fmtPct(s.otd, 1)}</span>} />
                  <Metric label="Credit"       v={<span className="font-mono text-paper-50">{s.credit}</span>} />
                  <Metric label="Annual Spend" v={<GroundedNumber value={s.spend} compact precision={0} size="sm" />} />
                  <Metric label="Materials"    v={<span className="text-paper-100">{s.materials.join(' · ')}</span>} />
                </div>
                {selected && (
                  <button onClick={() => setSelected(null)} className="text-paper-500 hover:text-paper-200"><X size={12} /></button>
                )}
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
}

function riskColor(score) {
  if (score < 30) return 'rgba(16, 185, 129, 0.75)';   // stable
  if (score < 45) return 'rgba(132, 204, 22, 0.7)';
  if (score < 60) return 'rgba(245, 158, 11, 0.75)';   // amber
  if (score < 75) return 'rgba(234, 88, 12, 0.78)';    // severe
  return 'rgba(220, 38, 38, 0.85)';                     // critical
}

function RiskLegend() {
  const buckets = [
    { l: '<30', c: 'rgba(16, 185, 129, 0.75)' },
    { l: '30-44', c: 'rgba(132, 204, 22, 0.7)' },
    { l: '45-59', c: 'rgba(245, 158, 11, 0.75)' },
    { l: '60-74', c: 'rgba(234, 88, 12, 0.78)' },
    { l: '75+', c: 'rgba(220, 38, 38, 0.85)' },
  ];
  return (
    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-paper-400 font-mono">
      {buckets.map(b => (
        <div key={b.l} className="flex items-center gap-0.5">
          <span className="size-2.5" style={{ background: b.c }} />
          <span>{b.l}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, v }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500">{label}</div>
      <div className="mt-0.5">{v}</div>
    </div>
  );
}

function ActivityFeed() {
  const auditLog = useWarRoom(s => s.auditLog);
  const display = auditLog.slice(0, 8);
  return (
    <section className="hairline bg-ink-100/40">
      <div className="px-5 py-3 hairline-b flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Recent Activity</div>
          <div className="font-display text-[16px] text-paper-50 mt-0.5">Budget revisions · stakeholder actions · model retrains</div>
        </div>
        <Pill color="info">LIVE</Pill>
      </div>
      <div className="grid grid-cols-2 gap-px bg-ink-300/40">
        {display.map((a, i) => (
          <div key={i} className="bg-ink-100 px-5 py-2.5 flex items-baseline gap-3">
            <div className="font-mono text-[10px] text-paper-500 w-16 flex-none">{a.ts}</div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-paper-400 font-mono">{a.action}</span>
                <span className="text-[12px] text-paper-100">{a.object}</span>
              </div>
              <div className="text-[10px] text-paper-500 mt-0.5">{a.actor}{a.detail ? ` · ${a.detail}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
 * SECTION 13: ALERT STATE — banner
 * ========================================================================== */

function AlertBanner() {
  const { activeEventId, acceptAlert, reset, savedPlays, secondaryEventId, multiEvent, mode } = useWarRoom(s => ({
    activeEventId: s.activeEventId, acceptAlert: s.acceptAlert, reset: s.reset,
    savedPlays: s.savedPlays, secondaryEventId: s.secondaryEventId, multiEvent: s.multiEvent, mode: s.mode,
  }));
  const [aiBlurb, setAiBlurb] = useState(null);
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  const ev2 = secondaryEventId ? EVENT_BY_ID[secondaryEventId] : null;
  const [showGlow, setShowGlow] = useState(true);

  useEffect(() => {
    if (!event) return;
    setShowGlow(true);
    const t = setTimeout(() => setShowGlow(false), 1200);
    return () => clearTimeout(t);
  }, [event]);

  // Try active AI provider for the AI summary; fallback to mock on no-key/error.
  useEffect(() => {
    let cancelled = false;
    async function go() {
      if (!event) return;
      const baseLine = `${event.aiBlurb}` + (ev2 ? ` Joint exposure with ${ev2.label}: non-linear interaction effects raise total risk envelope.` : '');
      const { activeProvider, providerConfig } = useWarRoom.getState();
      if (!isAIConfigured(activeProvider, providerConfig)) { setAiBlurb(baseLine); return; }
      const res = await callAI({
        system: `You are a CFO crisis advisor at Meridian Drivetrain Systems (auto parts mfg, $195M revenue, 6 plants, ${SUPPLIERS.length} suppliers). Reply in TWO sentences max. NO numbers, no $-figures, no probabilities. Focus on operational implication and decision urgency.`,
        messages: [{ role: 'user', content: `New signal: ${event.label}. Severity ${event.severity}. Geography ${event.region}. Context: ${event.summary}. ${ev2 ? `Co-occurring: ${ev2.label}.` : ''} Write the two-sentence alert blurb shown on the war room screen.` }],
        temperature: 0.6,
        maxTokens: 140,
      });
      if (cancelled) return;
      setAiBlurb(res.text || baseLine);
    }
    go();
    return () => { cancelled = true; };
  }, [event, ev2]);

  // Reactive provider label for the byline (without leaking any key material)
  const aiByline = useWarRoom(s => {
    const ap = s.activeProvider;
    const cfg = s.providerConfig[ap];
    if (!isAIConfigured(ap, s.providerConfig)) return 'Demo narration (no provider configured)';
    const model = ap === 'azure' ? cfg.deploymentName : cfg.model;
    return `${PROVIDER_META[ap].label}${model ? ' · ' + model : ''} · narration only`;
  });

  if (!event || mode !== 'alert') return null;

  // similar saved play suggestion
  const suggestion = savedPlays.find(p => p.composition.includes('REROUTE') || p.composition.includes('DUAL'));

  return (
    <>
      {/* Choreographed beats within 600ms: signal pulse (0ms) → glow ring (150ms) → banner slide (300ms) → counter visible (450ms) */}
      {showGlow && <div className="fixed inset-0 z-20 pointer-events-none glow-ring" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }} />}
      <div
        className="relative z-20 hairline-b bg-ink-100 anim-slide-down"
        style={{ borderBottomColor: COLORS.severe, animationDelay: '300ms', animationFillMode: 'backwards' }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{background: COLORS.severe}} />
        <div className="absolute inset-0 hatch opacity-30 pointer-events-none" />
        <div className="relative px-6 py-5 flex items-start gap-6">
          <div className="flex-none">
            <div className="flex items-center gap-2 mb-1">
              <Pill color="severe" size="md"><AlertTriangle size={11} /> {event.severity}</Pill>
              {multiEvent && ev2 && <Pill color="critical" size="md">+ {ev2.severity}</Pill>}
              <span className="text-[10px] uppercase tracking-[0.2em] text-paper-500 font-mono">Sig-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
            </div>
            <div className="font-display text-[26px] text-paper-50 leading-tight tracking-tight">
              {event.label}
              {multiEvent && ev2 && <span className="text-paper-400 text-[20px]"> + {ev2.label}</span>}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.22em] text-paper-500 mb-1 font-mono flex items-center gap-2">
              <Sparkles size={10} /> AI summary
              <span className="text-paper-400 normal-case tracking-normal">·</span>
              <span className="text-paper-400 normal-case tracking-normal">{aiByline}</span>
            </div>
            <div className="text-[13.5px] text-paper-100 leading-relaxed max-w-3xl">
              {aiBlurb || <span className="text-paper-500">Generating briefing...</span>}
            </div>
            {suggestion && (
              <div className="mt-3 text-[12px] text-paper-300 flex items-center gap-2">
                <BookOpen size={12} className="text-amber-400" />
                <span className="text-amber-400 font-mono text-[11px] uppercase tracking-[0.16em]">Similar Pattern</span>
                <span>Resembles the {suggestion.name} playbook — apply same approach?</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-2 flex-none min-w-[200px]">
            <button
              onClick={acceptAlert}
              className="px-4 py-2.5 bg-severe hover:bg-severe-soft text-paper-50 text-[12px] uppercase tracking-[0.18em] font-medium flex items-center justify-center gap-2 transition-colors group"
              style={{background: COLORS.severe}}
            >
              <Play size={12} /> Run Impact Analysis
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={reset}
              className="hairline px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-paper-300 hover:bg-ink-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================================
 * SECTION 14: RESPONSE STATE — Cascading Graph + Mitigation Workbench
 * (Full implementation arrives in M6; this file ships a working scaffold so
 *  the three-mode transformation can be demoed end-to-end immediately.)
 * ========================================================================== */

function ResponseState() {
  const { activeEventId, mode, strategyApplied } = useWarRoom(s => ({
    activeEventId: s.activeEventId, mode: s.mode, strategyApplied: s.strategyApplied,
  }));
  if (mode !== 'response' || !activeEventId) return null;

  return (
    <div className="h-full grid grid-cols-2 gap-px bg-ink-300/40 anim-fade-in">
      <div className="bg-ink-100 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <CascadingGraphPanel />
        </div>
        {/* Show baseline impact by default. After Apply, swap to the baseline-vs-mitigated comparison slider. */}
        {strategyApplied ? <BaselineVsMitigated /> : <BaselineImpactPanel />}
      </div>
      <div className="bg-ink-100 min-h-0 flex flex-col">
        <MitigationWorkbench />
      </div>
    </div>
  );
}

// ---------- Cascading Impact Graph (D3 force-directed with layered propagation) ----------
// Layer metadata. Actual colors resolved at render time via CASCADE_PALETTES[theme].
const CASCADE_LAYERS = [
  { id: 0, label: 'Signal' },
  { id: 1, label: 'Suppliers' },
  { id: 2, label: 'BOMs' },
  { id: 3, label: 'Plants' },
  { id: 4, label: 'Budget Lines' },
  { id: 5, label: 'P&L Outcomes' },
];

function CascadingGraphPanel() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const {
    cascade, openLineage, multiEvent, secondaryEventId, activeEventId,
    counterfactualDays, setCounterfactualDays, strategyApplied,
  } = useWarRoom();
  const [revealedLayer, setRevealedLayer] = useState(0);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hover, setHover] = useState(null);
  // Ref-tracked mirror of revealedLayer so the d3 rebuild effect (re-run on resize)
  // can paint the correct opacity immediately without subscribing to layer changes.
  const revealedLayerRef = useRef(0);
  useEffect(() => { revealedLayerRef.current = revealedLayer; }, [revealedLayer]);

  // Compute joint cascade if multi-event
  const renderCascade = useMemo(() => {
    if (!cascade) return null;
    if (!multiEvent || !secondaryEventId) return cascade;
    const second = buildCascade(EVENT_BY_ID[secondaryEventId]);
    // Merge nodes by id (joint markers)
    const seen = new Map();
    cascade.nodes.forEach(n => seen.set(n.id, { ...n, joint: false }));
    second.nodes.forEach(n => {
      if (seen.has(n.id)) {
        seen.set(n.id, { ...seen.get(n.id), joint: true, impact: Math.min(1, (seen.get(n.id).impact + n.impact) * 0.8) });
      } else {
        seen.set(n.id, { ...n, joint: false });
      }
    });
    const allLinks = [...cascade.links, ...second.links];
    return { nodes: Array.from(seen.values()), links: allLinks };
  }, [cascade, multiEvent, secondaryEventId]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sequence reveal of layers — delayed 400ms so layout transition completes first
  useEffect(() => {
    if (!renderCascade) return;
    setRevealedLayer(0);
    let intervalId;
    const timeoutId = setTimeout(() => {
      let layer = 0;
      intervalId = setInterval(() => {
        layer++;
        setRevealedLayer(layer);
        if (layer > 5) clearInterval(intervalId);
      }, 420);
    }, 400);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [renderCascade]);

  // D3 force simulation
  useEffect(() => {
    if (!renderCascade || !svgRef.current || size.w === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const W = size.w;
    const H = size.h;
    const margin = { l: 40, r: 40, t: 40, b: 24 };

    // Layer X positions
    const layerX = d3.scaleLinear()
      .domain([0, 5])
      .range([margin.l, W - margin.r]);

    // Clone nodes/links so d3 can mutate
    const nodes = renderCascade.nodes.map(d => ({ ...d, fx: layerX(d.layer) }));
    const links = renderCascade.links.map(d => ({ ...d }));

    // Defs for gradients — colors set via CSS so theme switch repaints instantly
    const defs = svg.append('defs');
    CASCADE_LAYERS.forEach((L, i) => {
      const nextIdx = Math.min(i + 1, CASCADE_LAYERS.length - 1);
      const g = defs.append('linearGradient')
        .attr('id', `grad-${i}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '0%');
      g.append('stop').attr('offset', '0%')
        .style('stop-color', `var(--color-chart-${i + 1})`).style('stop-opacity', 0.7);
      g.append('stop').attr('offset', '100%')
        .style('stop-color', `var(--color-chart-${nextIdx + 1})`).style('stop-opacity', 0.4);
    });
    // Glow filter
    const filt = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filt.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'blur');
    const merge = filt.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Zoom container
    const root = svg.append('g').attr('class', 'cascade-root');

    const zoom = d3.zoom()
      .scaleExtent([0.4, 3])
      .on('zoom', (event) => root.attr('transform', event.transform));
    svg.call(zoom).on('dblclick.zoom', null);

    // Layer guides (vertical scan lines + labels) — CSS styles for theme reactivity
    const guides = root.append('g').attr('class', 'guides');
    CASCADE_LAYERS.forEach(L => {
      const x = layerX(L.id);
      guides.append('line')
        .attr('x1', x).attr('x2', x)
        .attr('y1', margin.t + 8).attr('y2', H - margin.b - 4)
        .style('stroke', 'var(--color-border)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,4');
      guides.append('text')
        .attr('x', x).attr('y', margin.t - 12)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--color-text-tertiary)')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-size', '9px')
        .attr('letter-spacing', '0.18em')
        .text(L.label.toUpperCase());
    });

    // Links
    const linkSel = root.append('g').attr('class', 'links').selectAll('path')
      .data(links).enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', d => `url(#grad-${Math.min(4, (typeof d.source === 'object' ? d.source.layer : 0))})`)
      .attr('stroke-width', d => 0.8 + d.weight * 2.2)
      .attr('stroke-opacity', 0)
      .attr('stroke-linecap', 'round');

    // Nodes
    const nodeSel = root.append('g').attr('class', 'nodes').selectAll('g')
      .data(nodes).enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .style('opacity', 0)
      .on('click', (event, d) => {
        const lineageId = d.type === 'budget' ? 'budget_total' : d.type === 'supplier' ? 'risk_score' : d.type === 'pnl' ? 'hormuz_impact' : 'hormuz_impact';
        openLineage({ id: lineageId, label: d.label, value: d.meta?.est || d.meta?.fy26 });
      })
      .on('mouseenter', (event, d) => setHover({ d, x: event.clientX, y: event.clientY }))
      .on('mouseleave', () => setHover(null));

    nodeSel.append('circle')
      .attr('r', d => 4 + d.impact * 11)
      .style('fill', d => d.joint
        ? 'var(--color-negative)'
        : `var(--color-chart-${d.layer + 1})`)
      .style('stroke', d => d.joint
        ? 'var(--color-critical-soft)'
        : 'var(--color-bg-canvas)')
      .style('stroke-width', d => d.joint ? '2px' : '1.5px')
      .attr('filter', d => (d.layer === 0 || d.joint) ? 'url(#glow)' : null);

    nodeSel.append('text')
      .attr('x', d => (d.layer === 0 ? 14 : d.layer === 5 ? -14 : 12))
      .attr('y', 3)
      .attr('text-anchor', d => d.layer === 5 ? 'end' : 'start')
      .style('fill', d => d.joint
        ? 'var(--color-critical-soft)'
        : 'var(--color-text-secondary)')
      .attr('font-size', d => d.layer === 0 ? '11px' : '9.5px')
      .attr('font-family', d => d.layer === 0 ? 'var(--font-family-display)' : 'var(--font-family-base)')
      .text(d => {
        const max = d.layer === 0 ? 36 : d.layer === 5 ? 22 : 26;
        return d.label.length > max ? d.label.slice(0, max - 1) + '…' : d.label;
      });

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('y', d3.forceY(H / 2).strength(0.06))
      .force('charge', d3.forceManyBody().strength(-90))
      .force('link', d3.forceLink(links).id(d => d.id).distance(60).strength(0.4))
      .force('collide', d3.forceCollide(d => 6 + d.impact * 12))
      .on('tick', () => {
        linkSel.attr('d', d => {
          const sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
          const dx = tx - sx;
          const cx1 = sx + dx * 0.5;
          const cx2 = tx - dx * 0.5;
          return `M${sx},${sy} C${cx1},${sy} ${cx2},${ty} ${tx},${ty}`;
        });
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });

    simulationRef.current = simulation;

    // Apply the current reveal state immediately. Without this, a rebuild
    // triggered by container resize (e.g. when the Baseline-vs-Mitigated panel
    // mounts below the graph after Apply Strategy) would leave every node at
    // opacity 0 — because the layer-reveal effect only re-fires when
    // revealedLayer changes, and by Apply time it has already settled.
    const r = revealedLayerRef.current;
    nodeSel.style('opacity', d => d.layer < r ? 1 : d.layer === r ? 0.9 : 0);
    linkSel.attr('stroke-opacity', d => {
      const sLayer = (typeof d.source === 'object' ? d.source.layer : 0);
      return sLayer < r ? (0.4 + d.weight * 0.4) : 0;
    });

    return () => simulation.stop();
  }, [renderCascade, size, openLineage]);

  // Reveal layers progressively
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('.node')
      .transition().duration(380)
      .style('opacity', d => d.layer < revealedLayer ? 1 : d.layer === revealedLayer ? 0.9 : 0);
    svg.selectAll('.links path')
      .transition().duration(380)
      .attr('stroke-opacity', function(d) {
        const sLayer = (typeof d.source === 'object' ? d.source.layer : 0);
        return sLayer < revealedLayer ? (0.4 + d.weight * 0.4) : 0;
      });
  }, [revealedLayer]);

  return (
    <div ref={containerRef} className="h-full relative overflow-hidden flex flex-col">
      <div className="px-5 py-3 hairline-b bg-ink-100/80 backdrop-blur flex items-center justify-between flex-none z-10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Cascading Impact Graph</div>
          <div className="font-display text-[16px] text-paper-50 mt-0.5">
            {EVENT_BY_ID[activeEventId]?.label}
            {multiEvent && secondaryEventId && <span className="text-critical-soft"> × {EVENT_BY_ID[secondaryEventId].label.split('(')[0].trim()}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono">
            Layer {Math.min(revealedLayer, 5)} / 5
          </div>
          {revealedLayer <= 5 && (
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-amber-400 font-mono">
              <Loader2 size={10} className="animate-spin" /> propagating
            </div>
          )}
          <button
            onClick={() => { setRevealedLayer(0); setTimeout(() => setRevealedLayer(6), 50); }}
            className="hairline px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-paper-300 hover:bg-ink-300"
          >
            <RotateCcw size={11} className="inline mr-1" /> Replay
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg ref={svgRef} className="absolute inset-0 w-full h-full" />

        {/* Layer count badges (always visible top-right) */}
        <div className="absolute top-3 right-3 hairline bg-ink-200/80 backdrop-blur px-3 py-2 text-[10px] font-mono space-y-0.5 z-10">
          {CASCADE_LAYERS.map(L => {
            const count = renderCascade?.nodes.filter(n => n.layer === L.id).length || 0;
            return (
              <div key={L.id} className="flex items-center gap-2">
                <span className="size-2" style={{ background: `var(--color-chart-${L.id + 1})` }} />
                <span className="text-paper-300 w-24">{L.label}</span>
                <span className="text-paper-50 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Counterfactual replay slider */}
        <CounterfactualReplay />

        {/* Hover tooltip */}
        {hover && (
          <div
            className="fixed z-50 hairline bg-ink-200/95 backdrop-blur px-3 py-2 text-[11px] pointer-events-none"
            style={{ left: hover.x + 14, top: hover.y + 14 }}
          >
            <div className="font-display text-[13px] text-paper-50">{hover.d.label}</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-paper-500 font-mono mt-0.5">
              {CASCADE_LAYERS[hover.d.layer].label} · impact {Math.round(hover.d.impact * 100)}
              {hover.d.joint && <span className="ml-2 text-critical-soft">· JOINT</span>}
            </div>
            <div className="text-[9px] text-paper-400 mt-1">Click for data lineage</div>
          </div>
        )}

        {/* Note: Baseline-vs-Mitigated lives below the graph in ResponseState (Change 4) */}
      </div>
    </div>
  );
}

// ---------- Counterfactual replay slider ----------
function CounterfactualReplay() {
  const { counterfactualDays, setCounterfactualDays, activeEventId } = useWarRoom();
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  if (!event) return null;
  // Savings forgone scales non-linearly with delay
  const forgoneRate = (counterfactualDays / 21) * 0.42; // up to 42% of P50 impact
  const forgone = event.impactRange.mode * forgoneRate;

  return (
    <div className="absolute bottom-3 left-3 right-3 hairline bg-ink-100/95 backdrop-blur px-4 py-3 z-10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History size={12} className="text-amber-400" />
          <div className="text-[10px] uppercase tracking-[0.22em] text-paper-400 font-mono">Counterfactual Replay</div>
        </div>
        <div className="font-mono text-[11px] text-paper-300">
          {counterfactualDays === 0 ? (
            <span className="text-paper-500">slide to see savings forgone</span>
          ) : (
            <span>Acting <span className="text-amber-400">{counterfactualDays}d ago</span> would have saved an additional{' '}
              <GroundedNumber value={forgone} compact precision={1} size="sm" className="text-paper-50"
                band={{ p10: forgone * 0.7, p50: forgone, p90: forgone * 1.3 }}
                decomp={event.detailedDrivers}
              />
            </span>
          )}
        </div>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 bg-ink-400" />
        <div
          className="absolute h-1.5 bg-amber/40"
          style={{ width: `${(counterfactualDays / 21) * 100}%` }}
        />
        <input
          type="range" min={0} max={21} step={1}
          value={counterfactualDays}
          onChange={e => setCounterfactualDays(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute size-3 bg-amber border border-paper-50 rounded-full pointer-events-none"
          style={{ left: `calc(${(counterfactualDays / 21) * 100}% - 6px)` }}
        />
        <div className="absolute -bottom-3 left-0 text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono">Today</div>
        <div className="absolute -bottom-3 right-0 text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono">21d ago</div>
      </div>
    </div>
  );
}

// ---------- Baseline Impact panel — shown BEFORE any strategy is applied ----------
// The user needs to see the cost of doing nothing immediately on entering Response State.
function BaselineImpactPanel() {
  const { activeEventId, multiEvent, secondaryEventId } = useWarRoom();
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  if (!event) return null;

  // Joint impact when multi-event stress mode is on (~18% non-linear interaction penalty)
  const ev2 = multiEvent && secondaryEventId ? EVENT_BY_ID[secondaryEventId] : null;
  const ev2Mult = 1.18;
  const p50 = event.impactRange.mode + (ev2 ? ev2.impactRange.mode * ev2Mult : 0);
  const p10 = event.impactRange.min  + (ev2 ? ev2.impactRange.min  * ev2Mult : 0);
  const p90 = event.impactRange.max  + (ev2 ? ev2.impactRange.max  * ev2Mult : 0);
  const spread = (p90 - p10) / 2;

  // Top-affected budget lines for the per-line bars (4.5% impact rate against fy26 baseline)
  const affected = event.affectedLineIds.slice(0, 7).map(id => {
    const l = BUDGET_LINES.find(x => x.id === id);
    if (!l) return null;
    return { id: l.id, name: l.name, impact: l.fy26 * 0.045 };
  }).filter(Boolean);
  const maxBar = Math.max(...affected.map(l => l.impact), 1);

  return (
    <div className="hairline-t bg-ink-100 px-4 py-3 flex-none anim-fade-in">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={12} className="text-critical-soft flex-none" />
          <div className="text-[10px] uppercase tracking-[0.22em] text-paper-500 font-mono">Baseline Impact · No Mitigation</div>
          <Pill color="critical" size="xs">UNMITIGATED</Pill>
          {ev2 && <Pill color="critical" size="xs">+JOINT</Pill>}
        </div>
        <div className="text-[10px] text-paper-500 font-mono whitespace-nowrap">90-day horizon · Monte Carlo</div>
      </div>

      {/* Headline figure + range */}
      <div className="grid grid-cols-[auto_1fr] gap-4 items-baseline mb-3">
        <div className="hairline bg-critical/10 border-critical/40 px-3 py-2">
          <div className="text-[9px] uppercase tracking-[0.2em] text-critical-soft font-mono">Expected · P50</div>
          <div className="mt-0.5">
            <GroundedNumber
              value={-p50} compact precision={1} size="xl"
              className="text-critical-soft tabular"
              band={{ p10: -p90, p50: -p50, p90: -p10 }}
              decomp={event.detailedDrivers}
              lineageId="hormuz_impact"
              label="Baseline event impact (P50)"
            />
          </div>
          <div className="text-[10px] text-paper-400 font-mono mt-0.5">
            ± {fmtUSD(spread, { compact: true, precision: 1 })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="hairline bg-ink-200/40 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500 font-mono">Best · P10</div>
            <div className="font-mono text-[15px] text-paper-200 tabular mt-0.5">{fmtUSD(-p10, { compact: true, precision: 1 })}</div>
          </div>
          <div className="hairline bg-ink-200/40 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.2em] text-paper-500 font-mono">Worst · P90</div>
            <div className="font-mono text-[15px] text-paper-200 tabular mt-0.5">{fmtUSD(-p90, { compact: true, precision: 1 })}</div>
          </div>
          <div className="col-span-2 text-[10px] text-paper-400 leading-snug">
            <span className="font-mono text-paper-500 uppercase tracking-[0.16em] mr-1.5">Drivers:</span>
            {event.detailedDrivers.map((d, i) => (
              <span key={d.name}>
                {d.name} <span className="text-paper-200 font-mono">{Math.round(d.weight * 100)}%</span>
                {i < event.detailedDrivers.length - 1 && <span className="text-paper-500"> · </span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Per-line bars showing where the damage lands */}
      <div className="space-y-[3px]">
        <div className="text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono mb-1">Top affected budget lines</div>
        {affected.map(l => {
          const pct = (l.impact / maxBar) * 100;
          return (
            <div key={l.id} className="flex items-center gap-2 text-[10px] font-mono">
              <div className="w-36 text-paper-400 truncate" title={l.name}>{l.name}</div>
              <div className="flex-1 relative h-2.5 bg-ink-300/60">
                <div className="absolute inset-y-0 left-0 bg-critical/70" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-16 text-right text-critical-soft">{fmtUSD(-l.impact, { compact: true })}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 text-[10px] text-paper-500 italic flex items-center gap-1.5">
        <Sparkles size={10} className="text-amber-400 flex-none" />
        Compose or accept a strategy in the workbench → this panel will switch to the baseline-vs-mitigated comparison.
      </div>
    </div>
  );
}

// ---------- Baseline vs Mitigated comparison panel (lives BELOW the graph, Change 4) ----------
function BaselineVsMitigated() {
  const { activeEventId, multiEvent, appliedStrategy } = useWarRoom();
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  const [slide, setSlide] = useState(50);
  if (!event || !appliedStrategy) return null;

  const appliedClauses = appliedStrategy.clauses;
  const result = solveStrategy(event, appliedClauses, multiEvent);
  const baselineImpact = event.impactRange.mode + (multiEvent ? (EVENT_BY_ID.CHINA_TARIFF?.impactRange.mode || 0) * 1.18 : 0);
  const mitigatedImpact = Math.max(0, baselineImpact - result.savingsMode);
  const t = slide / 100;
  const currentImpact = baselineImpact * (1 - t) + mitigatedImpact * t;
  const currentSavings = baselineImpact - currentImpact;

  // Affected budget lines visualization
  const affectedLines = event.affectedLineIds.slice(0, 7).map(id => {
    const l = BUDGET_LINES.find(x => x.id === id);
    if (!l) return null;
    const lineBaseline  = l.fy26 * 0.045;
    const lineMitigated = lineBaseline * (mitigatedImpact / Math.max(1, baselineImpact));
    const lineCurrent   = lineBaseline * (1 - t) + lineMitigated * t;
    return { id: l.id, name: l.name, lineBaseline, lineMitigated, lineCurrent };
  }).filter(Boolean);

  const maxBar = Math.max(...affectedLines.map(l => l.lineBaseline), 1);

  return (
    <div className="hairline-t bg-ink-100 px-4 py-3 flex-none anim-fade-in">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitBranch size={12} className="text-stable" />
          <div className="text-[10px] uppercase tracking-[0.22em] text-paper-500 font-mono">Baseline vs Mitigated</div>
          <Pill color="stable" size="xs">APPLIED · {appliedStrategy.id}</Pill>
          {appliedStrategy.isCustom && <Pill color="amber" size="xs">CUSTOM</Pill>}
          <span className="text-[10px] text-paper-400 truncate max-w-[220px]">{appliedStrategy.name}</span>
        </div>
        <div className="text-[10px] text-paper-500 font-mono">drag slider · 0–100%</div>
      </div>

      {/* Top totals tri-panel */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="hairline bg-critical/5 p-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-critical-soft font-mono">Baseline (no action)</div>
          <div className="font-mono text-[16px] text-critical-soft tabular mt-0.5">{fmtUSD(-baselineImpact, { compact: true, precision: 1 })}</div>
        </div>
        <div className="hairline bg-amber/5 p-2" style={{ borderColor: COLORS.amber + '60' }}>
          <div className="text-[9px] uppercase tracking-[0.18em] text-amber-400 font-mono">Current view · {slide}%</div>
          <div className="font-mono text-[16px] text-amber-300 tabular mt-0.5 transition-all duration-300">
            {fmtUSD(-currentImpact, { compact: true, precision: 1 })}
          </div>
          <div className="text-[9px] text-paper-400 font-mono mt-0.5">savings {fmtUSD(currentSavings, { compact: true, precision: 1 })}</div>
        </div>
        <div className="hairline bg-stable/5 p-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-stable-soft font-mono">Mitigated (applied)</div>
          <div className="font-mono text-[16px] text-stable-soft tabular mt-0.5">{fmtUSD(-mitigatedImpact, { compact: true, precision: 1 })}</div>
        </div>
      </div>

      {/* Per-line bars */}
      <div className="space-y-[3px] mb-3">
        {affectedLines.map(l => {
          const baselinePct = (l.lineBaseline / maxBar) * 100;
          const currentPct  = (l.lineCurrent  / maxBar) * 100;
          return (
            <div key={l.id} className="flex items-center gap-2 text-[10px] font-mono">
              <div className="w-36 text-paper-400 truncate" title={l.name}>{l.name}</div>
              <div className="flex-1 relative h-3 bg-ink-300/60">
                <div className="absolute inset-y-0 left-0 bg-critical/25" style={{ width: `${baselinePct}%` }} />
                <div className="absolute inset-y-0 left-0 transition-all duration-300"
                  style={{ width: `${currentPct}%`, background: `linear-gradient(90deg, ${COLORS.critical} 0%, ${COLORS.amber} 100%)` }} />
              </div>
              <div className="w-16 text-right text-paper-200 transition-colors">
                {fmtUSD(-l.lineCurrent, { compact: true })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slider */}
      <div className="relative h-7 flex items-center">
        <div className="absolute inset-x-0 h-1.5" style={{ background: `linear-gradient(90deg, ${COLORS.critical}, ${COLORS.amber} 50%, ${COLORS.stable})` }} />
        <input
          type="range" min={0} max={100} step={1}
          value={slide}
          onChange={e => setSlide(parseInt(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-grab"
        />
        <div
          className="absolute size-4 bg-paper-50 border-2 border-amber-400 rounded-full pointer-events-none shadow-lg transition-all duration-200"
          style={{ left: `calc(${slide}% - 8px)` }}
        />
        <div className="absolute -bottom-3 left-0 text-[9px] uppercase tracking-[0.18em] text-critical-soft font-mono">Baseline</div>
        <div className="absolute -bottom-3 right-0 text-[9px] uppercase tracking-[0.18em] text-stable-soft font-mono">Mitigated</div>
      </div>
    </div>
  );
}

// ---------- Vote consensus helper ----------
function consensusOf(votes) {
  const v = votes || {};
  const counts = { Approved: 0, Hold: 0, Rejected: 0 };
  ['CFO','VPSC','PROC','ENG'].forEach(r => { if (counts[v[r]] !== undefined) counts[v[r]]++; });
  const pending = 4 - (counts.Approved + counts.Hold + counts.Rejected);
  const parts = [];
  if (counts.Approved) parts.push(`${counts.Approved}/4 Approve`);
  if (counts.Hold) parts.push(`${counts.Hold} Hold`);
  if (counts.Rejected) parts.push(`${counts.Rejected} Reject`);
  if (pending && (counts.Approved + counts.Hold + counts.Rejected) === 0) parts.push('pending');
  const tone = counts.Approved === 4 ? 'stable'
    : counts.Rejected >= 2 ? 'critical'
    : counts.Approved >= 2 ? 'amber'
    : 'paper';
  return { text: parts.join(' · ') || 'pending', tone, counts, pending, cfoApproved: v.CFO === 'Approved', cfoRejected: v.CFO === 'Rejected' };
}

// ---------- Draggable clause pill (@dnd-kit) ----------
function DraggableClausePill({ clauseId, sourceId, inWorkspace, dimmed }) {
  const c = CLAUSES[clauseId];
  const dragId = `clause:${clauseId}:${sourceId}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { clauseId, sourceId },
    disabled: inWorkspace,
  });
  if (!c) return null;
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); }}
      className={`select-none text-[9.5px] uppercase tracking-[0.14em] font-mono px-1.5 py-[3px] hairline transition-colors
        ${inWorkspace ? 'bg-amber/15 border-amber/40 text-amber-300 cursor-not-allowed' :
          isDragging ? 'opacity-30 bg-ink-300 border-amber/30 cursor-grabbing' :
          dimmed ? 'bg-ink-300/60 text-paper-500 cursor-grab' :
          'bg-ink-300 text-paper-300 hover:bg-ink-400 cursor-grab'}`}
      title={inWorkspace ? 'Already in custom workspace' : 'Drag to Custom Workspace'}
    >
      {c.name}
    </button>
  );
}

// ---------- Strategy card (one per proposed mitigation) ----------
function StrategyCard({ strategy, event, multiEvent }) {
  const { strategyVotes, setStrategyVote, applyStrategyById, selectedStrategyId, setStrategy, selectedClauses, applyingStrategy } = useWarRoom();
  const sResult = solveStrategy(event, strategy.clauses, multiEvent);
  const isSelected = selectedStrategyId === strategy.id;
  const votes = strategyVotes[strategy.id];
  const cons = consensusOf(votes);
  const compUSMCA = strategy.clauses.every(c => CLAUSES[c]?.compliance.usmca);
  const compOFAC  = strategy.clauses.every(c => CLAUSES[c]?.compliance.ofac);
  const compEAR   = strategy.clauses.every(c => CLAUSES[c]?.compliance.ear);
  const rejected  = cons.cfoRejected;

  return (
    <div
      onClick={() => setStrategy(strategy.id)}
      className={`hairline p-3 cursor-pointer transition-all relative ${
        rejected ? 'bg-ink-100/50 opacity-50' :
        isSelected ? 'ring-1 ring-amber-400 bg-ink-300/30' :
        'bg-ink-200/40 hover:bg-ink-300/40'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <div className="font-display text-[14px] text-paper-50">{strategy.name}</div>
          {strategy.philosophy && <Pill color="info" size="xs">{strategy.philosophy.toUpperCase()}</Pill>}
        </div>
        <div className="font-mono text-[11px] text-paper-500">{strategy.id}</div>
      </div>
      <div className="text-[11px] text-paper-400 mt-1 leading-snug">{strategy.rationale}</div>

      <div className="mt-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-[0.16em] text-paper-500 font-mono">Savings P50</span>
          <GroundedNumber value={sResult.savingsMode} compact precision={1} size="sm" className="text-stable"
            band={{ p10: sResult.savingsMin, p50: sResult.savingsMode, p90: sResult.savingsMax }} />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="text-paper-500">Lead</span>
          <span className="text-paper-200">{strategy.leadTimeDays}d</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <ComplianceBadge label="USMCA" ok={compUSMCA} />
          <ComplianceBadge label="OFAC"  ok={compOFAC} />
          <ComplianceBadge label="EAR"   ok={compEAR} />
        </div>
      </div>

      {/* Feasibility */}
      <div className="mt-2 flex flex-wrap gap-2">
        <FeasibilityBadge label="Capacity"   v={sResult.feasibility.capacity} />
        <FeasibilityBadge label="Lead Time"  v={sResult.feasibility.leadTime} />
        <FeasibilityBadge label="Compliance" v={sResult.feasibility.compliance} />
      </div>

      {/* Draggable clause chips */}
      <div className="mt-2 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono pt-1 mr-1">drag →</span>
        {strategy.clauses.map(c => (
          <DraggableClausePill key={c} clauseId={c} sourceId={strategy.id} inWorkspace={selectedClauses.includes(c)} />
        ))}
      </div>

      {/* Per-card voting strip */}
      <div className="mt-3 hairline-t pt-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[9px] uppercase tracking-[0.22em] text-paper-500 font-mono">Stakeholder Vote</div>
          <ConsensusPill tone={cons.tone}>{cons.text}</ConsensusPill>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[['CFO','L. Chen'],['VPSC','R. Singh'],['PROC','M. Okafor'],['ENG','D. Kowalski']].map(([role, person]) => (
            <VoteCard
              key={role} role={role} person={person}
              value={votes?.[role]}
              onVote={(v) => setStrategyVote(strategy.id, role, v)}
            />
          ))}
        </div>
      </div>

      {/* Per-card Apply */}
      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => applyStrategyById(strategy.id)}
          disabled={!cons.cfoApproved || applyingStrategy}
          className="flex-1 py-2 text-[10.5px] uppercase tracking-[0.16em] font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: cons.cfoApproved ? COLORS.amber : COLORS.ink400,
            color: cons.cfoApproved ? COLORS.ink50 : COLORS.paper400,
          }}
        >
          {!cons.cfoApproved
            ? <><ShieldAlert size={11} /> CFO Approval Required</>
            : <><Zap size={11} /> Apply Selected Strategy</>}
        </button>
      </div>
    </div>
  );
}

// ---------- Custom Workspace (drop target, Path B) ----------
function CustomWorkspace({ event, multiEvent }) {
  const {
    selectedClauses, toggleClause, applyCustomStrategy,
    applyingStrategy, strategyVotes, setStrategyVote,
  } = useWarRoom();
  const { isOver, setNodeRef } = useDroppable({ id: 'custom-workspace' });
  const [solverRunning, setSolverRunning] = useState(false);
  const [montecarlo, setMontecarlo] = useState(null);
  const [mcRunning, setMcRunning] = useState(false);
  const result = solveStrategy(event, selectedClauses, multiEvent);
  const votes = strategyVotes['CUSTOM'];
  const cons = consensusOf(votes);

  useEffect(() => {
    setSolverRunning(true);
    const t = setTimeout(() => setSolverRunning(false), 200);
    return () => clearTimeout(t);
  }, [selectedClauses.join(','), multiEvent]);

  useEffect(() => {
    if (selectedClauses.length === 0) { setMontecarlo(null); return; }
    setMcRunning(true);
    const handle = setTimeout(() => {
      const items = selectedClauses.map(id => {
        const c = CLAUSES[id];
        return { min: c.savingsMin, mode: c.savingsMode, max: c.savingsMax };
      });
      const interaction = items.length >= 3 ? 0.92 : 1;
      const sorted = runMonteCarlo(items.map(i => ({ min: i.min * interaction, mode: i.mode * interaction, max: i.max * interaction })), 5000);
      const [p10, p50, p90] = percentiles(sorted);
      const bins = 24;
      const minV = sorted[0], maxV = sorted[sorted.length - 1];
      const step = (maxV - minV) / bins;
      const hist = new Array(bins).fill(0);
      for (const v of sorted) {
        const idx = Math.min(bins - 1, Math.floor((v - minV) / step));
        hist[idx]++;
      }
      setMontecarlo({ p10, p50, p90, hist, minV, maxV, n: sorted.length });
      setMcRunning(false);
    }, 50);
    return () => clearTimeout(handle);
  }, [selectedClauses.join(','), multiEvent]);

  const isEmpty = selectedClauses.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={`hairline relative transition-all ${
        isOver ? 'bg-amber/10 border-amber/60 ring-1 ring-amber/40' :
        isEmpty ? 'border-dashed bg-ink-200/20' :
        'bg-ink-200/60'
      }`}
      style={{ borderStyle: isEmpty ? 'dashed' : 'solid' }}
    >
      <div className="px-4 py-2.5 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] font-mono">
          <Sliders size={12} className="text-amber-400" />
          <span className="text-paper-300">Custom Strategy</span>
          <span className="text-paper-500">·</span>
          <span className="text-paper-500">Path B · composer</span>
        </div>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button
              onClick={() => useWarRoom.setState({ selectedClauses: [] })}
              className="text-[10px] uppercase tracking-[0.16em] text-paper-500 hover:text-paper-200"
            >Clear</button>
          )}
        </div>
      </div>

      {/* Drop area / pills */}
      <div className="px-4 py-3 min-h-[80px] relative">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className={`text-[12px] font-mono uppercase tracking-[0.18em] ${isOver ? 'text-amber-300' : 'text-paper-500'}`}>
              {isOver ? '↓ Release to compose' : 'Drop clauses here to compose'}
            </div>
            <div className="text-[10px] text-paper-500 mt-1">Drag from any strategy card below · or click the + chips</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedClauses.map(c => (
              <div key={c} className="flex items-center gap-1 bg-amber/15 border border-amber/40 px-1.5 py-[3px] hairline">
                <span className="text-[9.5px] uppercase tracking-[0.14em] font-mono text-amber-300">{CLAUSES[c]?.name}</span>
                <button onClick={() => toggleClause(c)} className="text-amber-400 hover:text-amber-200 leading-none">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live solver block */}
      <div className="hairline-t px-4 py-3 bg-ink-100/40 relative">
        {solverRunning && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-amber-400 font-mono">
            <Loader2 size={10} className="animate-spin" /> solver running...
          </div>
        )}
        <div className="text-[9px] uppercase tracking-[0.22em] text-paper-500 font-mono">Composed savings · P50 · OR-Tools LP</div>
        <div className="mt-1">
          <GroundedNumber
            value={result.savingsMode}
            compact precision={1} size="xl"
            className="text-paper-50"
            label="Custom mitigated savings (P50)"
            band={montecarlo || { p10: result.savingsMin, p50: result.savingsMode, p90: result.savingsMax }}
            decomp={event.detailedDrivers}
            lineageId="hormuz_impact"
          />
        </div>

        {montecarlo && (
          <div className="mt-2">
            <div className="flex items-end gap-[1px] h-8">
              {montecarlo.hist.map((c, i) => {
                const max = Math.max(...montecarlo.hist);
                const isP50 = Math.floor(montecarlo.hist.length / 2) === i;
                return (
                  <div key={i}
                    className={`flex-1 ${isP50 ? 'bg-amber' : 'bg-amber/40'}`}
                    style={{ height: `${(c / max) * 100}%`, minHeight: '2px' }} />
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px] font-mono text-paper-500">
              <span>P10 {fmtUSD(montecarlo.p10, { compact: true })}</span>
              <span className="text-amber-400">P50 {fmtUSD(montecarlo.p50, { compact: true })}</span>
              <span>P90 {fmtUSD(montecarlo.p90, { compact: true })}</span>
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          <FeasibilityBadge label="Capacity"   v={result.feasibility.capacity} />
          <FeasibilityBadge label="Lead Time"  v={result.feasibility.leadTime} />
          <FeasibilityBadge label="Compliance" v={result.feasibility.compliance} />
        </div>
      </div>

      {/* Voting strip */}
      <div className="hairline-t px-4 py-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="text-[9px] uppercase tracking-[0.22em] text-paper-500 font-mono">Stakeholder Vote · Custom</div>
          <ConsensusPill tone={cons.tone}>{cons.text}</ConsensusPill>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[['CFO','L. Chen'],['VPSC','R. Singh'],['PROC','M. Okafor'],['ENG','D. Kowalski']].map(([role, person]) => (
            <VoteCard
              key={role} role={role} person={person}
              value={votes?.[role]}
              onVote={(v) => setStrategyVote('CUSTOM', role, v)}
            />
          ))}
        </div>
      </div>

      {/* Apply Custom */}
      <div className="hairline-t px-4 py-3">
        <button
          onClick={applyCustomStrategy}
          disabled={selectedClauses.length === 0 || !cons.cfoApproved || applyingStrategy}
          className="w-full py-2.5 text-[11px] uppercase tracking-[0.18em] font-medium flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: (selectedClauses.length > 0 && cons.cfoApproved) ? COLORS.amber : COLORS.ink400,
            color: (selectedClauses.length > 0 && cons.cfoApproved) ? COLORS.ink50 : COLORS.paper400,
          }}
        >
          {selectedClauses.length === 0
            ? <><Sliders size={12} /> Compose a strategy first</>
            : !cons.cfoApproved
              ? <><ShieldAlert size={12} /> CFO Approval Required</>
              : <><Zap size={12} /> Apply Custom Strategy · {fmtUSD(result.savingsMode, { compact: true })}</>}
        </button>
      </div>
    </div>
  );
}

function MitigationWorkbench() {
  const {
    activeEventId, multiEvent, proposalSet, reproposing, rejectAll, switchProposalSet,
    applyingStrategy, addClauseToCustom, strategyVotes,
  } = useWarRoom();
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  const [draggingClauseId, setDraggingClauseId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const visibleStrategies = proposalSet === 'primary' ? STRATEGIES.slice(0, 3) : ALTERNATIVE_STRATEGIES;

  // Auto-trigger re-propose when all visible cards have CFO=Rejected
  useEffect(() => {
    if (reproposing) return;
    if (visibleStrategies.length === 0) return;
    const allCfoRejected = visibleStrategies.every(s => strategyVotes[s.id]?.CFO === 'Rejected');
    if (allCfoRejected) {
      const t = setTimeout(() => rejectAll(), 250);
      return () => clearTimeout(t);
    }
  }, [strategyVotes, reproposing, proposalSet, rejectAll, visibleStrategies]);

  if (!event) return null;

  function handleDragStart(ev) {
    const data = ev.active?.data?.current;
    setDraggingClauseId(data?.clauseId || null);
  }
  function handleDragEnd(ev) {
    const { active, over } = ev;
    setDraggingClauseId(null);
    if (!over) return;
    if (over.id === 'custom-workspace') {
      const id = active?.data?.current?.clauseId;
      if (id) addClauseToCustom(id);
    }
  }
  function handleDragCancel() { setDraggingClauseId(null); }

  const draggingClause = draggingClauseId ? CLAUSES[draggingClauseId] : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} collisionDetection={closestCenter}>
      <div className="relative h-full overflow-y-auto">
        {/* "Applying strategy..." overlay */}
        {applyingStrategy && (
          <div className="absolute inset-0 bg-ink-50/70 backdrop-blur-sm z-30 flex items-center justify-center anim-fade-in">
            <div className="hairline bg-ink-100 px-6 py-4 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-amber-400" />
              <div>
                <div className="font-display text-[14px] text-paper-50">Applying strategy</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-paper-500 font-mono">Recomputing budget · auditing decision</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-5">
          {/* Header */}
          <div>
            <SectionLabel right={`OR-Tools LP · ${proposalSet === 'primary' ? 'supply-side' : 'demand/financial/time'}`}>Mitigation Workbench</SectionLabel>
            <div className="font-display text-[20px] text-paper-50 mt-1">The AI proposes · the human disposes</div>
            <div className="text-[12px] text-paper-400 mt-1">
              Path A · approve a card and apply it. Path B · drag clauses to the workspace and compose. Path C · reject all to see an alternative philosophy.
              {multiEvent && <span className="text-critical-soft block mt-1">Joint-event constraints active — some strategies become infeasible.</span>}
            </div>
          </div>

          {/* Custom Workspace (Path B) — top of column */}
          <CustomWorkspace event={event} multiEvent={multiEvent} />

          {/* Proposals header */}
          <div className="flex items-center justify-between hairline-t pt-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500 font-mono flex items-center gap-2">
                <ListChecks size={11} /> AI Proposals
                <Pill color={proposalSet === 'primary' ? 'amber' : 'info'} size="xs">
                  {proposalSet === 'primary' ? 'PRIMARY · SUPPLY-SIDE' : 'ALTERNATIVE · DEMAND / FINANCIAL / TIME'}
                </Pill>
              </div>
              <div className="text-[11px] text-paper-400 mt-1">{visibleStrategies.length} candidate strateg{visibleStrategies.length === 1 ? 'y' : 'ies'} · ranked by P50 mitigated savings</div>
            </div>
            <div className="flex items-center gap-2">
              {proposalSet === 'alternative' && (
                <button
                  onClick={() => switchProposalSet('primary')}
                  className="hairline px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-paper-300 hover:bg-ink-300 transition-colors flex items-center gap-1.5"
                >
                  <ChevronLeft size={11} /> Back to Primary
                </button>
              )}
              <button
                onClick={rejectAll}
                disabled={reproposing}
                className="hairline px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] text-critical hover:bg-critical/10 hover:border-critical/40 transition-colors flex items-center gap-1.5 disabled:opacity-30"
              >
                <ThumbsDown size={11} /> Reject All · Re-propose
              </button>
            </div>
          </div>

          {/* Reproposing overlay */}
          {reproposing ? (
            <div className="hairline bg-ink-100/60 p-6 anim-fade-in relative overflow-hidden">
              <div className="absolute inset-0 hatch opacity-30" />
              <div className="relative flex items-center gap-4">
                <div className="size-12 hairline bg-ink-200 flex items-center justify-center">
                  <Sparkles size={20} className="text-amber-400 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-[16px] text-paper-50 flex items-center gap-2">
                    AI is re-proposing
                    <Loader2 size={14} className="animate-spin text-amber-400" />
                  </div>
                  <div className="text-[11px] text-paper-400 mt-1">
                    Switching from <span className="text-paper-200">supply-side</span> to{' '}
                    <span className="text-amber-400">demand / financial / time-buying</span> philosophies.
                    Re-ranking under same constraints...
                  </div>
                  <div className="mt-2 h-1 bg-ink-400 relative overflow-hidden">
                    <div className="absolute inset-y-0 bg-amber" style={{ animation: 'tick 1.5s linear forwards', width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleStrategies.map(s => (
                <StrategyCard key={s.id} strategy={s} event={event} multiEvent={multiEvent} />
              ))}
            </div>
          )}

          {/* Closing-visual + Board Pack buttons */}
          <div className="hairline-t pt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => useWarRoom.getState().togglePhasesPanel()}
              className="hairline px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-paper-200 hover:bg-amber/10 hover:border-amber/40 hover:text-amber-300 transition-colors flex items-center justify-center gap-2"
            >
              <Layers size={12} /> Show Phases
            </button>
            <button
              onClick={() => useWarRoom.setState({ boardPackOpen: true })}
              className="hairline px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-paper-200 hover:bg-ink-300 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={12} /> Generate Board Pack · 4 slides
            </button>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {draggingClause && (
            <div className="select-none text-[9.5px] uppercase tracking-[0.14em] font-mono px-1.5 py-[3px] hairline bg-amber/30 border-amber text-amber-200 shadow-2xl cursor-grabbing">
              {draggingClause.name}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

function ComplianceBadge({ label, ok }) {
  return (
    <div className={`flex items-center gap-1 hairline px-1.5 py-[3px] text-[9px] uppercase tracking-[0.14em] font-mono ${ok ? 'text-stable-soft border-stable/40 bg-stable/10' : 'text-critical-soft border-critical/40 bg-critical/10'}`}>
      {ok ? <ShieldCheck size={9} /> : <ShieldAlert size={9} />}
      {label}
    </div>
  );
}

function VoteCard({ role, person, value, onVote }) {
  return (
    <div className="hairline bg-ink-300/40 p-2">
      <div className="text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono">{role}</div>
      <div className="text-[10.5px] text-paper-200 mt-0.5 truncate">{person}</div>
      <div className="mt-1.5 grid grid-cols-3 gap-[2px]">
        <button onClick={() => onVote('Approved')} title="Approve"
          className={`py-1 hairline text-[9px] flex items-center justify-center ${value === 'Approved' ? 'bg-stable/30 text-stable border-stable/60' : 'text-paper-500 hover:bg-ink-400'}`}>
          <ThumbsUp size={10} />
        </button>
        <button onClick={() => onVote('Hold')} title="Hold"
          className={`py-1 hairline text-[9px] flex items-center justify-center ${value === 'Hold' ? '' : 'text-paper-500 hover:bg-ink-400'}`}
          style={value === 'Hold' ? {
            background: 'color-mix(in srgb, var(--color-warn) 30%, transparent)',
            color: 'var(--color-warn)',
            borderColor: 'color-mix(in srgb, var(--color-warn) 60%, transparent)',
          } : undefined}>
          <MinusCircle size={10} />
        </button>
        <button onClick={() => onVote('Rejected')} title="Reject"
          className={`py-1 hairline text-[9px] flex items-center justify-center ${value === 'Rejected' ? 'bg-critical/30 text-critical border-critical/60' : 'text-paper-500 hover:bg-ink-400'}`}>
          <ThumbsDown size={10} />
        </button>
      </div>
    </div>
  );
}

function ConsensusPill({ tone, children }) {
  // 'amber' here means "partial approval, cautious" — semantically a warn signal.
  // Uses --color-warn so SAC theme renders it in Horizon critical-orange (#E76500)
  // rather than the primary-accent blue that --color-amber resolves to in SAC.
  const map = {
    stable:   { color: 'var(--color-positive)', borderColor: 'color-mix(in srgb, var(--color-positive) 40%, transparent)', background: 'color-mix(in srgb, var(--color-positive) 10%, transparent)' },
    amber:    { color: 'var(--color-warn)',     borderColor: 'color-mix(in srgb, var(--color-warn) 40%, transparent)',     background: 'color-mix(in srgb, var(--color-warn) 10%, transparent)' },
    critical: { color: 'var(--color-negative)', borderColor: 'color-mix(in srgb, var(--color-negative) 40%, transparent)', background: 'color-mix(in srgb, var(--color-negative) 10%, transparent)' },
    paper:    { color: 'var(--color-text-tertiary)', borderColor: 'var(--color-border)', background: 'var(--color-bg-surface-elevated)' },
  };
  return (
    <div
      className="text-[9.5px] uppercase tracking-[0.14em] font-mono px-1.5 py-[2px] hairline"
      style={map[tone] || map.paper}
    >
      {children}
    </div>
  );
}

function FeasibilityBadge({ label, v }) {
  // Status colors come from semantic role vars so 'amber' stays amber even in SAC
  // (where the primary-accent amber utility is remapped to Fiori blue).
  // var(--color-warn) = severe orange in War Room, Horizon critical-orange #E76500 in SAC.
  const tokenMap = {
    green: 'var(--color-positive)',
    amber: 'var(--color-warn)',
    red:   'var(--color-negative)',
  };
  const dot = tokenMap[v] || tokenMap.amber;
  return (
    <div
      className="flex items-center gap-1.5 hairline px-2 py-1 bg-ink-300/40"
      style={{ color: dot, borderColor: dot }}
    >
      <span className="size-1.5 rounded-full" style={{ background: dot }} />
      <span className="text-[9px] uppercase tracking-[0.18em] font-mono">{label}: {v}</span>
    </div>
  );
}

/* ============================================================================
 * SECTION 15: DEMO CONTROLS (Cmd+Shift+D)
 * ========================================================================== */

function DemoControls() {
  const {
    demoControlsOpen, setDemoControlsOpen, fireAlert, reset, mode,
    multiEvent, toggleMultiEvent, skipBoot, setSkipBoot,
    showConnectionLines, setShowConnectionLines, activeEventId,
    theme, setTheme,
  } = useWarRoom();

  // Cmd+Shift+D toggles
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        setDemoControlsOpen(!useWarRoom.getState().demoControlsOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDemoControlsOpen]);

  const [selectedEvent, setSelectedEvent] = useState('HORMUZ');

  if (!demoControlsOpen) return null;
  return (
    <div className="fixed bottom-5 left-5 z-40 w-[340px] hairline bg-ink-100 shadow-2xl anim-slide-up" style={{animationDuration:'.3s'}}>
      <div className="px-4 py-2.5 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-paper-400 font-mono">
          <Settings size={11} /> Demo Controls
        </div>
        <button onClick={() => setDemoControlsOpen(false)} className="text-paper-500 hover:text-paper-100"><X size={12} /></button>
      </div>

      <div className="p-4 space-y-4">
        {/* Theme — invisible during normal viewing; reveal moment on demo day */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-paper-500 mb-1.5">Theme</div>
          <div className="space-y-1.5">
            <ThemeRadio
              value="war-room"
              active={theme === 'war-room'}
              onSelect={() => setTheme('war-room')}
              label="War Room"
              hint="default · cinematic dark"
            />
            <ThemeRadio
              value="sac-story"
              active={theme === 'sac-story'}
              onSelect={() => setTheme('sac-story')}
              label="SAC Story"
              hint="SAP Analytics Cloud · Morning Horizon"
            />
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-paper-500 mb-1.5">Fire Alert</div>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full hairline bg-ink-200 text-paper-100 px-3 py-2 text-[12px] font-mono"
          >
            {EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => fireAlert(selectedEvent)}
              className="flex-1 py-2 bg-severe hover:bg-severe-soft text-paper-50 text-[10px] uppercase tracking-[0.18em] font-medium"
              style={{background: COLORS.severe}}
            >
              Trigger
            </button>
            <button
              onClick={reset}
              className="hairline px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-paper-300 hover:bg-ink-300 flex items-center gap-1.5"
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
        </div>

        <div className="hairline-t pt-3 space-y-2">
          <ToggleRow
            label="Multi-Event Stress" sub="Fire secondary event alongside primary"
            value={multiEvent} onChange={toggleMultiEvent}
            disabled={mode !== 'alert' && mode !== 'response'}
          />
          <ToggleRow
            label="Skip Boot Sequence" sub="For repeat demo runs"
            value={skipBoot} onChange={() => setSkipBoot(!skipBoot)}
          />
          <ToggleRow
            label="Show Connection Lines" sub="Signal → banner visual link"
            value={showConnectionLines} onChange={() => setShowConnectionLines(!showConnectionLines)}
          />
        </div>

        <div className="hairline-t pt-3 text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono flex justify-between">
          <span>Mode: {mode}</span>
          <span>{activeEventId || '—'}</span>
        </div>
        <div className="text-[9px] text-paper-500 font-mono flex justify-between">
          <span>Cmd+Shift+D to toggle</span>
          <span>v3.0</span>
        </div>
      </div>
    </div>
  );
}

function ThemeRadio({ value, active, onSelect, label, hint }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 hairline transition-colors text-left ${
        active ? 'ring-1 ring-amber-400 bg-amber/10 border-amber/40' : 'bg-ink-200/40 hover:bg-ink-300/40'
      }`}
      data-theme-radio={value}
    >
      <span className={`size-3 rounded-full hairline flex-none ${active ? 'bg-amber border-amber' : 'border-paper-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[11.5px] text-paper-100 leading-tight">{label}</div>
        <div className="text-[9.5px] text-paper-500 mt-0.5">{hint}</div>
      </div>
    </button>
  );
}

function ToggleRow({ label, sub, value, onChange, disabled }) {
  return (
    <button
      onClick={onChange} disabled={disabled}
      className={`w-full flex items-center justify-between gap-2 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className="text-left flex-1 min-w-0">
        <div className="text-[11px] text-paper-100">{label}</div>
        <div className="text-[9px] text-paper-500">{sub}</div>
      </div>
      <div className={`w-9 h-5 hairline relative transition-colors ${value ? 'bg-amber/40 border-amber/60' : 'bg-ink-300'}`}>
        <div className={`absolute top-[2px] size-3 ${value ? 'bg-amber translate-x-[18px]' : 'bg-paper-400 translate-x-[2px]'} transition-transform`} />
      </div>
    </button>
  );
}

/* ============================================================================
 * SECTION 16: AI ADVISOR FAB (chat panel — full version in M8)
 * ========================================================================== */

function FabAIStatusDot() {
  const haveAI = useWarRoom(s => isAIConfigured(s.activeProvider, s.providerConfig));
  return haveAI
    ? <span className="absolute -top-1 -right-1 size-2 rounded-full bg-stable anim-blink" />
    : <span className="absolute -top-1 -right-1 size-2 rounded-full bg-paper-500" />;
}

function AdvisorByline() {
  const haveAI = useWarRoom(s => isAIConfigured(s.activeProvider, s.providerConfig));
  const label = useWarRoom(s => {
    const ap = s.activeProvider;
    const cfg = s.providerConfig[ap];
    if (!isAIConfigured(ap, s.providerConfig)) return null;
    const model = ap === 'azure' ? cfg.deploymentName : cfg.model;
    return `${PROVIDER_META[ap].label}${model ? ' · ' + model : ''} · grounded narration only`;
  });
  return (
    <div className="text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono">
      {haveAI ? label : 'Demo mode · no provider configured'}
    </div>
  );
}

function AdvisorInput({ draft, setDraft, send }) {
  const haveAI = useWarRoom(s => isAIConfigured(s.activeProvider, s.providerConfig));
  return (
    <input
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') send(draft); }}
      placeholder={haveAI ? 'Ask the advisor...' : 'Demo mode — open Settings (gear) to configure an AI provider'}
      className="flex-1 hairline bg-ink-200 px-3 py-2 text-[12px] text-paper-100 placeholder-paper-500"
    />
  );
}

function AIAdvisorFAB() {
  const { aiAdvisorOpen, setAiAdvisorOpen, activeEventId, selectedClauses, multiEvent, secondaryEventId } = useWarRoom();
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;

  return (
    <>
      <button
        onClick={() => setAiAdvisorOpen(!aiAdvisorOpen)}
        className="fixed bottom-5 right-5 z-30 size-12 hairline bg-ink-200 hover:bg-ink-300 transition-colors flex items-center justify-center group"
        title="AI Advisor"
      >
        <Bot size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
        <FabAIStatusDot />
      </button>
      {aiAdvisorOpen && <AIAdvisorPanel />}
    </>
  );
}

function AIAdvisorPanel() {
  const { setAiAdvisorOpen, activeEventId, multiEvent, selectedClauses, secondaryEventId } = useWarRoom();
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  const ev2 = secondaryEventId ? EVENT_BY_ID[secondaryEventId] : null;
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', text: event
      ? `I'm tracking ${event.label} (${event.severity}). The cascade flows through ~22 suppliers, 8 budget lines, and 4 P&L outcomes. Ask me about ranking, options, or comparable past events.`
      : `Steady state — I have FY2026 baseline loaded, 240 suppliers indexed, 60 budget lines mapped. Ask me anything about the portfolio.`
    },
  ]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pending]);

  const suggestions = [
    'Why did the AI rank dual-sourcing first?',
    'What\'s the worst-case if we do nothing for another week?',
    'Which suppliers should I call personally?',
    'How does this compare to the 2024 Red Sea event?',
  ];

  async function send(text) {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text };
    setMessages(m => [...m, userMsg]);
    setDraft('');
    setPending(true);

    const sys = `You are the CFO War Room advisor for Meridian Drivetrain Systems (auto parts mfg, $195M revenue, 6 NA plants).
Active event: ${event ? event.label + ' (' + event.severity + ')' : 'none'}.
${ev2 ? 'Co-occurring: ' + ev2.label + '.' : ''}
Selected clauses: ${selectedClauses.join(', ') || 'none'}.

Rules:
- Do NOT invent $-figures, probabilities, percentages, or confidence intervals.
- Reference where a value would come from (e.g., "the Datasphere event_impact view shows ...") rather than naming the value.
- Be concise: 3-5 sentences max.
- Operational, decision-focused tone.`;

    const { activeProvider, providerConfig } = useWarRoom.getState();
    if (!isAIConfigured(activeProvider, providerConfig)) {
      // Mock response — no AI provider configured. Open Settings to pick one.
      await new Promise(r => setTimeout(r, 700));
      const mockReply = `Demo mode — no AI provider configured. Click the gear icon in the header (or the status indicator) to add an OpenAI / Anthropic / Azure key, or set VITE_CHATPWC_API_KEY in .env.local. The grounding rule still holds: every number on screen traces to its Databricks query — click any value's lineage icon.`;
      setMessages(m => [...m, { role: 'assistant', text: mockReply }]);
      setPending(false);
      return;
    }

    const res = await callAI({
      system: sys,
      messages: [
        ...messages.map(m => ({ role: m.role, content: m.text })),
        { role: 'user', content: text },
      ],
      temperature: 0.5,
      maxTokens: 400,
    });
    // res.error is already sanitized — never echoes raw response body or headers
    setMessages(m => [...m, { role: 'assistant', text: res.text || `(${res.error || 'no response'})` }]);
    setPending(false);
  }

  return (
    <div className="fixed bottom-20 right-5 z-30 w-[420px] h-[520px] hairline bg-ink-100 shadow-2xl flex flex-col anim-slide-up">
      <div className="px-4 py-3 hairline-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-amber-400" />
          <div>
            <div className="font-display text-[14px] text-paper-50">AI Advisor</div>
            <AdvisorByline />
          </div>
        </div>
        <button onClick={() => setAiAdvisorOpen(false)} className="text-paper-500 hover:text-paper-100"><X size={14} /></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-[12.5px] leading-relaxed">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] px-3 py-2 ${m.role === 'user' ? 'bg-ink-300 text-paper-100' : 'bg-ink-200/60 text-paper-100 hairline'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-ink-200/60 hairline text-paper-400 font-mono text-[11px] flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> thinking...
            </div>
          </div>
        )}
      </div>

      <div className="hairline-t p-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-[10px] hairline px-2 py-1 text-paper-300 hover:bg-ink-300 transition-colors">
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <AdvisorInput draft={draft} setDraft={setDraft} send={send} />
          <button onClick={() => send(draft)} disabled={pending || !draft.trim()}
            className="hairline px-3 py-2 text-paper-200 hover:bg-ink-300 disabled:opacity-40">
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * SECTION 16.5: BOARD-READY PACK GENERATOR (pptxgenjs)
 * Established gotchas applied:
 *   - Upward arrows: yStart = min(y1,y2), h = |y2-y1|, flipV:true
 *   - Circles via roundRect with rectRadius = half-width (not oval)
 *   - Vertical lines: thin rect (w ≈ 0.012), not addShape('line', {w:0})
 *   - 22pt Georgia ≈ 26pt Calibri for single-line titles
 * ========================================================================== */

function BoardPackModal() {
  const { boardPackOpen, setBoardPackOpen, activeEventId, selectedClauses, multiEvent, secondaryEventId, timeElapsedSec, strategyVotes, appliedStrategy } = useWarRoom();
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [done, setDone] = useState(false);
  const event = activeEventId ? EVENT_BY_ID[activeEventId] : null;
  const ev2 = secondaryEventId ? EVENT_BY_ID[secondaryEventId] : null;
  const result = event ? solveStrategy(event, selectedClauses, multiEvent) : null;
  // Votes to embed in deck: the applied strategy's votes (or 'CUSTOM' workspace)
  const relevantVotes = appliedStrategy ? (strategyVotes[appliedStrategy.id] || {}) : (strategyVotes['CUSTOM'] || {});

  useEffect(() => {
    if (!boardPackOpen) { setDone(false); setSummary(null); return; }
    let cancelled = false;
    async function gen() {
      if (!event) return;
      const fallback = `${event.label} has emerged as a ${event.severity.toLowerCase()} disruption with material exposure to ${event.primaryDriver}. Time-to-decision is currently ${fmtDuration(timeElapsedSec)} versus an industry benchmark of six weeks. Recommended mitigation composition: ${selectedClauses.map(c => CLAUSES[c]?.name).join(', ') || 'pending selection'}.`;
      const { activeProvider, providerConfig } = useWarRoom.getState();
      if (!isAIConfigured(activeProvider, providerConfig)) { if (!cancelled) setSummary(fallback); return; }
      const res = await callAI({
        system: 'You are a CFO board-pack writer. Write a 3-sentence Situation summary. NO numbers, NO percentages — operational language only.',
        messages: [{ role: 'user', content: `Event: ${event.label}. Severity: ${event.severity}. Primary driver: ${event.primaryDriver}. Time elapsed: ${fmtDuration(timeElapsedSec)}.${ev2 ? ' Co-occurring: ' + ev2.label + '.' : ''} Active clauses: ${selectedClauses.map(c => CLAUSES[c]?.name).join(', ') || 'none'}.` }],
        temperature: 0.4,
        maxTokens: 220,
      });
      if (cancelled) return;
      setSummary(res.text || fallback);
    }
    gen();
    return () => { cancelled = true; };
  }, [boardPackOpen, event, ev2, selectedClauses, timeElapsedSec, multiEvent]);

  async function generatePack() {
    if (!event || !result) return;
    setPending(true);
    try {
      await buildPptx({ event, ev2, multiEvent, result, selectedClauses, summary, timeElapsedSec, votes: relevantVotes });
      setDone(true);
      useWarRoom.getState().pushAudit({ actor: 'System', action: 'Generated', object: 'Board Pack', detail: '4 slides · pptx exported' });
    } finally {
      setPending(false);
    }
  }

  if (!boardPackOpen) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 anim-fade-in" onClick={() => setBoardPackOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="w-[640px] hairline bg-ink-100 pointer-events-auto anim-slide-up shadow-2xl">
          <div className="px-5 py-4 hairline-b flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">Board-Ready Pack Generator</div>
              <div className="font-display text-[20px] text-paper-50 mt-0.5">4-slide deck · {event?.label}</div>
            </div>
            <button onClick={() => setBoardPackOpen(false)} className="hairline px-1.5 py-1.5 text-paper-500 hover:text-paper-100"><X size={14} /></button>
          </div>

          <div className="p-5 space-y-4">
            <SlidePreviewRow ordinal={1} title="Situation" hint={summary ? (summary.length > 130 ? summary.slice(0, 127) + '…' : summary) : <span className="flex items-center gap-2 text-paper-500"><Loader2 size={11} className="animate-spin" /> generating with ChatPwC...</span>} />
            <SlidePreviewRow ordinal={2} title="Options · Top 3 Strategies" hint={`${STRATEGIES.slice(0,3).map(s => s.name).join(' · ')}`} />
            <SlidePreviewRow ordinal={3} title="Recommendation" hint={selectedClauses.map(c => CLAUSES[c]?.name).join(' + ') || 'No clauses selected'} />
            <SlidePreviewRow ordinal={4} title="Financial Impact" hint={`Baseline vs Mitigated · P50 savings ${fmtUSD(result?.savingsMode || 0, { compact: true })}`} />

            <div className="hairline-t pt-3 flex items-center gap-3">
              <button
                onClick={generatePack}
                disabled={pending || done}
                className="flex-1 py-3 text-[12px] uppercase tracking-[0.18em] font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                style={{background: done ? COLORS.stable : COLORS.amber, color: COLORS.ink50}}
              >
                {pending ? <><Loader2 size={14} className="animate-spin" /> Building deck...</> :
                 done ? <><CheckCircle2 size={14} /> Downloaded</> :
                 <><Download size={14} /> Generate & Download .pptx</>}
              </button>
              <button onClick={() => setBoardPackOpen(false)} className="hairline px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-paper-300 hover:bg-ink-300">
                Cancel
              </button>
            </div>

            <div className="text-[9px] uppercase tracking-[0.18em] text-paper-500 font-mono">
              pptxgenjs · 4 slides · 16:9 · grounded values traced to Datasphere
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SlidePreviewRow({ ordinal, title, hint }) {
  return (
    <div className="hairline p-3 bg-ink-200/40 flex items-start gap-4">
      <div className="size-9 hairline bg-ink-300 flex items-center justify-center font-display text-[16px] text-amber-400">{ordinal}</div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[14px] text-paper-50">{title}</div>
        <div className="text-[11px] text-paper-400 mt-1 leading-snug truncate">{hint}</div>
      </div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-paper-500 font-mono pt-1">Slide {ordinal}/4</div>
    </div>
  );
}

async function buildPptx({ event, ev2, multiEvent, result, selectedClauses, summary, timeElapsedSec, votes }) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
  pptx.author = 'Meridian Drivetrain Systems · Black Swan War Room';
  pptx.company = 'Meridian Drivetrain Systems, Inc.';
  pptx.title = `Crisis Response · ${event.label}`;

  // ---- Theme ----
  const C = {
    ink: '0A0A0B', ink2: '131316', ink3: '1F1F24',
    paper: 'F5F5F0', paper2: 'A3A39A', paper3: '71716A',
    amber: 'F59E0B', severe: 'EA580C', critical: 'DC2626',
    stable: '10B981', info: '06B6D4',
  };

  // ---- Master ----
  pptx.defineSlideMaster({
    title: 'MDS_DARK',
    background: { color: C.ink },
    objects: [
      // Top hairline
      { rect: { x: 0, y: 0.36, w: 13.33, h: 0.012, fill: { color: C.ink3 } } },
      // Bottom hairline
      { rect: { x: 0, y: 7.12, w: 13.33, h: 0.012, fill: { color: C.ink3 } } },
      // Tiny logo block (top left)
      { rect: { x: 0.4, y: 0.18, w: 0.04, h: 0.04, fill: { color: C.amber } } },
      { text: {
          text: 'BLACK SWAN  ·  WAR ROOM',
          options: { x: 0.5, y: 0.13, w: 4.0, h: 0.16, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper2, charSpacing: 4 },
      } },
      { text: {
          text: 'MERIDIAN DRIVETRAIN SYSTEMS · FY2026',
          options: { x: 8.83, y: 0.13, w: 4.5, h: 0.16, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4, align: 'right' },
      } },
      // Footer
      { text: {
          text: 'GROUNDED IN DATASPHERE · MODEL CARDS AVAILABLE · GENERATED BY OR-TOOLS LP + BAYESIAN ENSEMBLE',
          options: { x: 0.5, y: 7.18, w: 12.33, h: 0.16, fontFace: 'JetBrains Mono', fontSize: 7, color: C.paper3, charSpacing: 3 },
      } },
    ],
  });

  // ============= SLIDE 1: SITUATION =============
  {
    const s = pptx.addSlide({ masterName: 'MDS_DARK' });
    // Severity flag block (left side accent)
    s.addShape('rect', { x: 0.5, y: 0.7, w: 0.08, h: 0.6, fill: { color: C.severe }, line: { type: 'none' } });
    s.addText('SITUATION · ' + event.severity.toUpperCase(),
      { x: 0.72, y: 0.7, w: 6, h: 0.3, fontFace: 'JetBrains Mono', fontSize: 10, color: C.severe, charSpacing: 6, bold: true });
    s.addText(event.label,
      { x: 0.72, y: 1.0, w: 12, h: 0.7, fontFace: 'Georgia', fontSize: 28, color: C.paper, bold: false });
    if (multiEvent && ev2) {
      s.addText('+ ' + ev2.label,
        { x: 0.72, y: 1.65, w: 12, h: 0.4, fontFace: 'Georgia', fontSize: 18, color: C.amber });
    }

    // Time-to-decision
    s.addText('TIME TO DECISION', { x: 0.72, y: 2.4, w: 4, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    s.addText(fmtDuration(timeElapsedSec),
      { x: 0.72, y: 2.6, w: 4, h: 0.5, fontFace: 'JetBrains Mono', fontSize: 26, color: C.paper, bold: true });
    s.addText('vs. industry benchmark: 6 weeks',
      { x: 0.72, y: 3.1, w: 6, h: 0.25, fontFace: 'Geist', fontSize: 11, color: C.paper2 });

    // Severity panel (right)
    s.addShape('rect', { x: 7.5, y: 2.4, w: 5.3, h: 1.5, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });
    s.addText('REGION', { x: 7.7, y: 2.55, w: 2, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    s.addText(event.region, { x: 7.7, y: 2.75, w: 5, h: 0.35, fontFace: 'Geist', fontSize: 14, color: C.paper });
    s.addText('PRIMARY DRIVER', { x: 7.7, y: 3.2, w: 3, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    s.addText(event.primaryDriver, { x: 7.7, y: 3.4, w: 5, h: 0.35, fontFace: 'Geist', fontSize: 13, color: C.paper });

    // AI summary block
    s.addShape('rect', { x: 0.72, y: 4.3, w: 12.1, h: 2.0, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });
    s.addText('AI SUMMARY · GROUNDED NARRATION (NO FIGURES GENERATED BY LLM)',
      { x: 0.9, y: 4.45, w: 12, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 3 });
    s.addText(summary || event.aiBlurb,
      { x: 0.9, y: 4.7, w: 11.8, h: 1.5, fontFace: 'Georgia', fontSize: 15, color: C.paper, valign: 'top' });
  }

  // ============= SLIDE 2: OPTIONS =============
  {
    const s = pptx.addSlide({ masterName: 'MDS_DARK' });
    s.addShape('rect', { x: 0.5, y: 0.7, w: 0.08, h: 0.6, fill: { color: C.amber }, line: { type: 'none' } });
    s.addText('OPTIONS · TOP 3 STRATEGIES',
      { x: 0.72, y: 0.7, w: 8, h: 0.3, fontFace: 'JetBrains Mono', fontSize: 10, color: C.amber, charSpacing: 6, bold: true });
    s.addText('Mitigation candidates · OR-Tools constraint LP',
      { x: 0.72, y: 1.0, w: 12, h: 0.5, fontFace: 'Georgia', fontSize: 24, color: C.paper });

    // 3 strategy cards side by side
    const top3 = STRATEGIES.slice(0, 3);
    top3.forEach((strat, i) => {
      const sRes = solveStrategy(event, strat.clauses, multiEvent);
      const cx = 0.72 + i * 4.15;
      const cw = 3.95;
      s.addShape('rect', { x: cx, y: 1.85, w: cw, h: 5.1, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });
      // index
      s.addText('MIT-00' + (i + 1),
        { x: cx + 0.15, y: 2.0, w: 1.2, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
      // name
      s.addText(strat.name, { x: cx + 0.15, y: 2.25, w: cw - 0.3, h: 0.8, fontFace: 'Georgia', fontSize: 15, color: C.paper, valign: 'top' });
      // rationale
      s.addText(strat.rationale,
        { x: cx + 0.15, y: 3.1, w: cw - 0.3, h: 1.6, fontFace: 'Geist', fontSize: 10, color: C.paper2, valign: 'top' });
      // savings figure
      s.addText('SAVINGS · P50', { x: cx + 0.15, y: 4.8, w: 2, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
      s.addText(fmtUSD(sRes.savingsMode, { compact: true, precision: 1 }),
        { x: cx + 0.15, y: 5.0, w: cw - 0.3, h: 0.5, fontFace: 'JetBrains Mono', fontSize: 24, color: C.stable, bold: true });
      s.addText(`P10–P90: ${fmtUSD(sRes.savingsMin, { compact: true })} – ${fmtUSD(sRes.savingsMax, { compact: true })}`,
        { x: cx + 0.15, y: 5.5, w: cw - 0.3, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 9, color: C.paper2 });
      s.addText('LEAD: ' + strat.leadTimeDays + ' days',
        { x: cx + 0.15, y: 5.7, w: 2, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 9, color: C.paper2 });

      // Feasibility row
      const fLabels = [['Capacity', sRes.feasibility.capacity], ['Lead Time', sRes.feasibility.leadTime], ['Compliance', sRes.feasibility.compliance]];
      fLabels.forEach(([lbl, v], j) => {
        const fcolor = v === 'green' ? C.stable : v === 'amber' ? C.amber : C.critical;
        const fy = 6.05 + j * 0.28;
        // circle (use roundRect with rectRadius = half width, NOT oval)
        s.addShape('roundRect', { x: cx + 0.15, y: fy, w: 0.16, h: 0.16, rectRadius: 0.08, fill: { color: fcolor }, line: { type: 'none' } });
        s.addText(lbl + ' · ' + v.toUpperCase(),
          { x: cx + 0.38, y: fy - 0.04, w: cw - 0.5, h: 0.22, fontFace: 'JetBrains Mono', fontSize: 9, color: C.paper2 });
      });
    });
  }

  // ============= SLIDE 3: RECOMMENDATION =============
  {
    const s = pptx.addSlide({ masterName: 'MDS_DARK' });
    s.addShape('rect', { x: 0.5, y: 0.7, w: 0.08, h: 0.6, fill: { color: C.stable }, line: { type: 'none' } });
    s.addText('RECOMMENDATION',
      { x: 0.72, y: 0.7, w: 8, h: 0.3, fontFace: 'JetBrains Mono', fontSize: 10, color: C.stable, charSpacing: 6, bold: true });
    const recName = selectedClauses.map(c => CLAUSES[c]?.name).join(' + ') || 'No clauses selected';
    s.addText(recName, { x: 0.72, y: 1.0, w: 12, h: 0.9, fontFace: 'Georgia', fontSize: 22, color: C.paper, valign: 'top' });

    // Rationale block
    s.addShape('rect', { x: 0.72, y: 2.05, w: 7.5, h: 4.7, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });
    s.addText('RATIONALE', { x: 0.9, y: 2.2, w: 4, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });

    const clauseLines = selectedClauses.map((cId, i) => {
      const c = CLAUSES[cId];
      return { text: `${i + 1}.  ${c.name} — projected savings ${fmtUSD(c.savingsMode, { compact: true })}`, options: { fontFace: 'Geist', fontSize: 13, color: C.paper, bullet: false, breakLine: true, paraSpaceAfter: 8 } };
    });
    if (clauseLines.length === 0) clauseLines.push({ text: 'No clauses currently selected. Compose a strategy before exporting.', options: { fontFace: 'Geist', fontSize: 13, color: C.paper2 } });
    s.addText(clauseLines, { x: 0.9, y: 2.5, w: 7.1, h: 3.8, valign: 'top' });

    // Decision panel (right)
    s.addShape('rect', { x: 8.45, y: 2.05, w: 4.4, h: 4.7, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });
    s.addText('DECISION', { x: 8.6, y: 2.2, w: 4, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });

    s.addText('STAKEHOLDER VOTES', { x: 8.6, y: 2.5, w: 4, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    const voteList = Object.entries(votes).map(([role, v]) => ({
      text: `${role.padEnd(6)}  ${v || '—'}`,
      options: { fontFace: 'JetBrains Mono', fontSize: 11, color: v === 'Approved' ? C.stable : v === 'Rejected' ? C.critical : v === 'Hold' ? C.amber : C.paper2, breakLine: true, paraSpaceAfter: 4 }
    }));
    s.addText(voteList, { x: 8.6, y: 2.75, w: 4, h: 1.6, valign: 'top' });

    s.addText('CLAUSES IN PLAY', { x: 8.6, y: 4.4, w: 4, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    s.addText(`${selectedClauses.length} active · ${Object.values(votes).filter(v => v === 'Approved').length}/4 approvals`,
      { x: 8.6, y: 4.6, w: 4, h: 0.3, fontFace: 'Geist', fontSize: 13, color: C.paper });

    s.addText('TOTAL P50 SAVINGS', { x: 8.6, y: 5.15, w: 4, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    s.addText(fmtUSD(result.savingsMode, { compact: true, precision: 1 }),
      { x: 8.6, y: 5.35, w: 4, h: 0.5, fontFace: 'JetBrains Mono', fontSize: 30, color: C.stable, bold: true });
  }

  // ============= SLIDE 4: FINANCIAL IMPACT =============
  {
    const s = pptx.addSlide({ masterName: 'MDS_DARK' });
    s.addShape('rect', { x: 0.5, y: 0.7, w: 0.08, h: 0.6, fill: { color: C.info }, line: { type: 'none' } });
    s.addText('FINANCIAL IMPACT',
      { x: 0.72, y: 0.7, w: 8, h: 0.3, fontFace: 'JetBrains Mono', fontSize: 10, color: C.info, charSpacing: 6, bold: true });
    s.addText('Baseline vs Mitigated · Monte Carlo Bands',
      { x: 0.72, y: 1.0, w: 12, h: 0.5, fontFace: 'Georgia', fontSize: 22, color: C.paper });

    const baselineImpact = event.impactRange.mode + (multiEvent ? (EVENT_BY_ID.CHINA_TARIFF?.impactRange.mode || 0) * 1.18 : 0);
    const mitigatedImpact = Math.max(0, baselineImpact - result.savingsMode);

    // Bar chart for Baseline vs Mitigated (recharts not available in pptx; use rects)
    const chartL = 0.72, chartT = 2.0, chartW = 7.5, chartH = 4.5;
    s.addShape('rect', { x: chartL, y: chartT, w: chartW, h: chartH, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });

    // Y-axis labels
    s.addText('IMPACT ($M, NEGATIVE = COST)', { x: chartL + 0.15, y: chartT + 0.1, w: 4, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });

    // Bar chart: 2 bars (baseline impact = -baselineImpact, mitigated = -mitigatedImpact)
    const maxMag = baselineImpact;
    const barAreaT = chartT + 0.5;
    const barAreaH = chartH - 1.4;
    const barW = 1.6;
    const bar1L = chartL + 1.4;
    const bar2L = chartL + 4.5;

    // Baseline bar (red, full)
    const b1H = barAreaH;
    s.addShape('rect', { x: bar1L, y: barAreaT, w: barW, h: b1H, fill: { color: C.critical }, line: { type: 'none' } });
    s.addText(fmtUSD(-baselineImpact, { compact: true, precision: 1 }),
      { x: bar1L - 0.2, y: barAreaT - 0.3, w: 2.0, h: 0.25, fontFace: 'JetBrains Mono', fontSize: 14, color: C.critical, bold: true, align: 'center' });
    s.addText('BASELINE\n(no action)',
      { x: bar1L - 0.2, y: barAreaT + barAreaH + 0.15, w: 2.0, h: 0.5, fontFace: 'JetBrains Mono', fontSize: 9, color: C.paper2, align: 'center' });

    // Mitigated bar (amber, shorter)
    const b2H = barAreaH * (mitigatedImpact / maxMag);
    s.addShape('rect', { x: bar2L, y: barAreaT + (barAreaH - b2H), w: barW, h: b2H, fill: { color: C.amber }, line: { type: 'none' } });
    s.addText(fmtUSD(-mitigatedImpact, { compact: true, precision: 1 }),
      { x: bar2L - 0.2, y: barAreaT + (barAreaH - b2H) - 0.3, w: 2.0, h: 0.25, fontFace: 'JetBrains Mono', fontSize: 14, color: C.amber, bold: true, align: 'center' });
    s.addText('MITIGATED\n(applied)',
      { x: bar2L - 0.2, y: barAreaT + barAreaH + 0.15, w: 2.0, h: 0.5, fontFace: 'JetBrains Mono', fontSize: 9, color: C.paper2, align: 'center' });

    // Upward savings arrow (gotcha: yStart = min(y1,y2), h = |y2-y1|, flipV: true)
    {
      const y1 = barAreaT + barAreaH;            // bottom of baseline
      const y2 = barAreaT + (barAreaH - b2H);    // top of mitigated
      const arrowX = bar2L + barW + 0.4;
      const yStart = Math.min(y1, y2);
      const h = Math.abs(y2 - y1);
      s.addShape('upArrow', {
        x: arrowX, y: yStart, w: 0.4, h,
        fill: { color: C.stable }, line: { type: 'none' },
        flipV: false, // points UP — y1 (bottom) > y2 (top) so arrow points from bottom up
      });
      s.addText('Δ ' + fmtUSD(result.savingsMode, { compact: true, precision: 1 }),
        { x: arrowX + 0.5, y: yStart + h / 2 - 0.18, w: 2, h: 0.3, fontFace: 'JetBrains Mono', fontSize: 14, color: C.stable, bold: true });
      s.addText('SAVINGS',
        { x: arrowX + 0.5, y: yStart + h / 2 + 0.12, w: 2, h: 0.18, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    }

    // Right side: P10/P50/P90 bands + KPI deltas
    const rL = 8.55;
    s.addShape('rect', { x: rL, y: 2.0, w: 4.3, h: 4.5, fill: { color: C.ink2 }, line: { color: C.ink3, width: 0.5 } });
    s.addText('CONFIDENCE BANDS', { x: rL + 0.15, y: 2.15, w: 4, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    const bands = [
      ['P10', result.savingsMin, C.paper2],
      ['P50', result.savingsMode, C.amber],
      ['P90', result.savingsMax, C.paper2],
    ];
    bands.forEach(([lbl, val, color], i) => {
      const y = 2.45 + i * 0.45;
      s.addText(lbl, { x: rL + 0.2, y, w: 0.6, h: 0.3, fontFace: 'JetBrains Mono', fontSize: 11, color: C.paper3 });
      s.addText(fmtUSD(val, { compact: true, precision: 1 }),
        { x: rL + 0.85, y: y - 0.05, w: 2.5, h: 0.35, fontFace: 'JetBrains Mono', fontSize: 18, color, bold: true });
    });

    // KPI deltas
    s.addText('KPI DELTAS · FY2026', { x: rL + 0.15, y: 4.0, w: 4, h: 0.2, fontFace: 'JetBrains Mono', fontSize: 8, color: C.paper3, charSpacing: 4 });
    const baselineMargin = (COMPANY.revenue - BUDGET_TOTAL_FY26) / COMPANY.revenue;
    const mitigatedMargin = (COMPANY.revenue - BUDGET_TOTAL_FY26 - mitigatedImpact) / COMPANY.revenue;
    const kpis = [
      ['Gross Margin', fmtPct(baselineMargin, 1) + ' → ' + fmtPct(mitigatedMargin, 1), C.amber],
      ['EBITDA Margin', '13.9% → ' + fmtPct(0.139 - mitigatedImpact / COMPANY.revenue, 1), C.amber],
      ['Hedge Coverage', '70% → 90%', C.stable],
      ['Risk Score', 'Δ -8 pts',                  C.stable],
    ];
    kpis.forEach(([lbl, val, color], i) => {
      const y = 4.3 + i * 0.42;
      s.addText(lbl, { x: rL + 0.2, y, w: 1.8, h: 0.22, fontFace: 'JetBrains Mono', fontSize: 9, color: C.paper2 });
      s.addText(val, { x: rL + 2.0, y, w: 2.2, h: 0.22, fontFace: 'JetBrains Mono', fontSize: 10, color });
    });

    // Vertical separator line (use thin rect, not addShape line)
    s.addShape('rect', { x: rL - 0.05, y: 2.0, w: 0.012, h: 4.5, fill: { color: C.ink3 }, line: { type: 'none' } });
  }

  // ---- Write file ----
  await pptx.writeFile({ fileName: `MDS_BoardPack_${event.id}_${new Date().toISOString().slice(0,10)}.pptx` });
}

/* ============================================================================
 * SECTION 16.7: AI PROVIDER SETTINGS MODAL
 *   - Lets user override the default ChatPwC with OpenAI / Anthropic / Azure
 *   - Keys are type="password" always — never displayed, never logged
 *   - Test Connection sends a single 1-token "ping" — never any business data
 *   - State lives only in zustand; refresh wipes user-entered keys (by design)
 * ========================================================================== */

function SettingsModal() {
  const {
    settingsOpen, setSettingsOpen,
    activeProvider, providerConfig,
    commitProviderSettings,
  } = useWarRoom(s => ({
    settingsOpen: s.settingsOpen, setSettingsOpen: s.setSettingsOpen,
    activeProvider: s.activeProvider, providerConfig: s.providerConfig,
    commitProviderSettings: s.commitProviderSettings,
  }));

  const [draftProvider, setDraftProvider] = useState(activeProvider);
  const [draftConfig, setDraftConfig] = useState(providerConfig);
  const [testState, setTestState] = useState({ status: 'idle' }); // 'idle' | 'testing' | 'success' | 'error'
  const [skipTest, setSkipTest] = useState(false);

  // Reset drafts when modal re-opens
  useEffect(() => {
    if (settingsOpen) {
      setDraftProvider(activeProvider);
      setDraftConfig(providerConfig);
      setTestState({ status: 'idle' });
      setSkipTest(false);
    }
  }, [settingsOpen, activeProvider, providerConfig]);

  // Esc closes (without saving). Backdrop click also closes via onClick on backdrop div.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, setSettingsOpen]);

  if (!settingsOpen) return null;

  const cur = draftConfig[draftProvider];

  function updateDraft(field, value) {
    setDraftConfig(d => ({ ...d, [draftProvider]: { ...d[draftProvider], [field]: value } }));
    // Any field edit invalidates a previous test result
    setTestState({ status: 'idle' });
    setSkipTest(false);
  }

  const canTest = (() => {
    if (draftProvider === 'chatpwc') return !!CHATPWC_KEY;
    if (draftProvider === 'openai') return !!cur.apiKey && !!cur.model;
    if (draftProvider === 'anthropic') return !!cur.apiKey && !!cur.model;
    if (draftProvider === 'azure') return !!cur.apiKey && !!cur.endpoint && !!cur.deploymentName && !!cur.apiVersion;
    return false;
  })();
  const canSave = canTest && (testState.status === 'success' || skipTest);

  async function handleTest() {
    setTestState({ status: 'testing' });
    const result = await testProviderConnection(draftProvider, cur);
    if (result.error) {
      // result.error is already sanitized — never includes raw response body
      setTestState({ status: 'error', message: result.error, latencyMs: result.latencyMs });
    } else {
      setTestState({ status: 'success', message: 'Connected', latencyMs: result.latencyMs });
    }
  }

  function handleSave() {
    commitProviderSettings({
      provider: draftProvider,
      config: draftConfig[draftProvider],
      latencyMs: testState.latencyMs ?? null,
      connected: testState.status === 'success',
    });
    setSettingsOpen(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => setSettingsOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[520px] max-h-[90vh] hairline bg-ink-100 pointer-events-auto anim-slide-up shadow-2xl flex flex-col"
          role="dialog" aria-label="AI Provider Settings"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 hairline-b flex items-center justify-between flex-none">
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-amber-400" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-paper-500">AI Provider</div>
                <div className="font-display text-[18px] text-paper-50 mt-0.5">Connection Settings</div>
              </div>
            </div>
            <button onClick={() => setSettingsOpen(false)} className="hairline px-1.5 py-1.5 text-paper-500 hover:text-paper-100" aria-label="Close settings">
              <X size={14} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1">
            {/* Provider selector */}
            <div>
              <SectionLabel right="select one">Provider</SectionLabel>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['chatpwc', 'openai', 'anthropic', 'azure'].map(p => {
                  const isSel = draftProvider === p;
                  return (
                    <button
                      key={p}
                      onClick={() => { setDraftProvider(p); setTestState({ status: 'idle' }); setSkipTest(false); }}
                      className={`hairline text-left p-3 transition-colors ${isSel ? 'ring-1 ring-amber-400 bg-amber/10 border-amber/40' : 'bg-ink-200/40 hover:bg-ink-300/40'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-display text-[13px] text-paper-50">{PROVIDER_META[p].label}</div>
                        {p === 'chatpwc' && <Pill color="info" size="xs">Default</Pill>}
                      </div>
                      <div className="text-[10px] text-paper-400 mt-1">
                        {p === 'chatpwc' && 'PwC firewall-friendly'}
                        {p === 'openai' && 'api.openai.com'}
                        {p === 'anthropic' && 'api.anthropic.com'}
                        {p === 'azure' && 'Azure tenant deployment'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider-specific fields */}
            <div>
              <SectionLabel>{PROVIDER_META[draftProvider].label} Configuration</SectionLabel>
              <div className="mt-2 space-y-2">
                {draftProvider === 'chatpwc' && (
                  <div className="hairline bg-ink-200/40 p-3 space-y-2">
                    {CHATPWC_KEY ? (
                      <>
                        <SettingsReadOnlyRow label="Source"        value=".env.local · VITE_CHATPWC_API_KEY" />
                        <SettingsReadOnlyRow label="Base URL"      value={CHATPWC_BASE} />
                        <SettingsReadOnlyRow label="Default model" value={CHATPWC_MODEL_DEFAULT} />
                        <div className="flex items-baseline gap-3">
                          <span className="w-24 text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono">Status</span>
                          <Pill color="stable" size="xs">KEY DETECTED</Pill>
                        </div>
                      </>
                    ) : (
                      <div className="hairline bg-amber/10 border-amber/40 p-3 text-[11.5px] text-amber-200 leading-snug">
                        <div className="font-mono uppercase tracking-[0.16em] text-[10px] text-amber-300 mb-1">Not configured</div>
                        Set <span className="font-mono">VITE_CHATPWC_API_KEY</span> in <span className="font-mono">.env.local</span> and restart <span className="font-mono">npm run dev</span> to use ChatPwC.
                        Or pick a different provider above and paste your own key.
                      </div>
                    )}
                  </div>
                )}

                {draftProvider === 'openai' && (
                  <>
                    <SettingsKeyField value={cur.apiKey} onChange={(v) => updateDraft('apiKey', v)} placeholder="sk-..." />
                    <SettingsSelectField label="Model" value={cur.model} options={PROVIDER_META.openai.models} onChange={(v) => updateDraft('model', v)} />
                  </>
                )}

                {draftProvider === 'anthropic' && (
                  <>
                    <SettingsKeyField value={cur.apiKey} onChange={(v) => updateDraft('apiKey', v)} placeholder="sk-ant-..." />
                    <SettingsSelectField label="Model" value={cur.model} options={PROVIDER_META.anthropic.models} onChange={(v) => updateDraft('model', v)} />
                  </>
                )}

                {draftProvider === 'azure' && (
                  <>
                    <SettingsKeyField value={cur.apiKey} onChange={(v) => updateDraft('apiKey', v)} placeholder="your-azure-api-key" />
                    <SettingsTextField label="Endpoint URL" value={cur.endpoint} onChange={(v) => updateDraft('endpoint', v)} placeholder="https://my-resource.openai.azure.com" />
                    <SettingsTextField label="Deployment Name" value={cur.deploymentName} onChange={(v) => updateDraft('deploymentName', v)} placeholder="gpt-4o-deployment" />
                    <SettingsTextField label="API Version" value={cur.apiVersion} onChange={(v) => updateDraft('apiVersion', v)} placeholder="2024-08-01-preview" />
                  </>
                )}
              </div>
            </div>

            {/* Privacy reminder */}
            <div className="hairline-t pt-3">
              <div className="text-[10.5px] text-paper-500 italic leading-snug">
                Keys entered here live only in this browser tab and are cleared on refresh.
                Never share screenshots showing this panel.
              </div>
            </div>

            {/* Test result */}
            {testState.status !== 'idle' && (
              <TestResultStrip state={testState} />
            )}
          </div>

          {/* Footer */}
          <div className="hairline-t px-5 py-3 flex items-center gap-2 flex-none">
            <button
              onClick={handleTest}
              disabled={!canTest || testState.status === 'testing'}
              className="hairline px-3 py-2 text-[10.5px] uppercase tracking-[0.16em] text-paper-200 hover:bg-ink-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
            >
              {testState.status === 'testing'
                ? <><Loader2 size={11} className="animate-spin" /> Testing...</>
                : <><Zap size={11} /> Test Connection</>}
            </button>
            {testState.status !== 'success' && canTest && (
              <button
                onClick={() => setSkipTest(s => !s)}
                className={`text-[10px] underline underline-offset-2 ${skipTest ? 'text-amber-400' : 'text-paper-500 hover:text-paper-300'}`}
              >
                {skipTest ? '✓ Skip test enabled' : 'Skip test'}
              </button>
            )}

            <div className="flex-1" />

            <button
              onClick={() => setSettingsOpen(false)}
              className="px-3 py-2 text-[10.5px] uppercase tracking-[0.16em] text-paper-400 hover:text-paper-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-2 text-[10.5px] uppercase tracking-[0.16em] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              style={{ background: canSave ? COLORS.amber : COLORS.ink400, color: canSave ? COLORS.ink50 : COLORS.paper400 }}
            >
              Save & Use
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsReadOnlyRow({ label, value }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-24 text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono flex-none">{label}</span>
      <span className="text-[11.5px] text-paper-200 font-mono break-all">{value}</span>
    </div>
  );
}

function SettingsKeyField({ value, onChange, placeholder }) {
  // Key field — ALWAYS type="password". No unmask toggle. Clipboard paste OK.
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono mb-1 flex items-center gap-1.5">
        API Key
        <span className="text-paper-400 normal-case tracking-normal text-[10px]">· masked · cleared on refresh</span>
      </div>
      <input
        type="password"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
        className="w-full hairline bg-ink-200 text-paper-100 px-3 py-2 text-[12px] font-mono placeholder-paper-500 focus:outline-none focus:border-amber/60"
      />
    </div>
  );
}

function SettingsTextField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono mb-1">{label}</div>
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || ''}
        className="w-full hairline bg-ink-200 text-paper-100 px-3 py-2 text-[12px] font-mono placeholder-paper-500 focus:outline-none focus:border-amber/60"
      />
    </div>
  );
}

function SettingsSelectField({ label, value, options, onChange }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-paper-500 font-mono mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full hairline bg-ink-200 text-paper-100 px-3 py-2 text-[12px] font-mono focus:outline-none focus:border-amber/60"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TestResultStrip({ state }) {
  if (state.status === 'success') {
    return (
      <div className="hairline bg-stable/10 border-stable/40 p-3 flex items-center gap-2 text-[12px]">
        <CheckCircle2 size={14} className="text-stable" />
        <div className="flex-1">
          <div className="text-stable-soft font-mono uppercase tracking-[0.16em] text-[10px]">Connected</div>
          <div className="text-paper-200 mt-0.5">Model responded in <span className="font-mono">{state.latencyMs}ms</span></div>
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className="hairline bg-critical/10 border-critical/40 p-3 flex items-center gap-2 text-[12px]">
        <XCircle size={14} className="text-critical" />
        <div className="flex-1">
          <div className="text-critical-soft font-mono uppercase tracking-[0.16em] text-[10px]">Connection Failed</div>
          <div className="text-paper-200 mt-0.5">{state.message}</div>
        </div>
      </div>
    );
  }
  if (state.status === 'testing') {
    return (
      <div className="hairline bg-ink-200/60 p-3 flex items-center gap-2 text-[12px]">
        <Loader2 size={14} className="animate-spin text-amber-400" />
        <div className="text-paper-200">Sending 1-token ping...</div>
      </div>
    );
  }
  return null;
}

/* ============================================================================
 * SECTION 16.8: THREE-PHASE INDICATOR PANEL — closing visual of the demo
 *   Intentionally inverts the dark war-room palette: a light "paper" card
 *   that reads like a printed report. Phase 3 has equivalent visual weight
 *   to Phases 1 & 2 — same icon size, same typography scale, same color.
 *   Only the compression badge differs (amber "governed" vs green reduction).
 * ========================================================================== */

const PHASE_DATA = [
  {
    key: 'detect',
    icon: Search,
    phase: 'Phase 1',
    title: 'Detect & Quantify',
    without: '2-3 weeks',
    withTime: 'Minutes',
    compressionLabel: '~99% time reduction',
    compressionTone: 'green',
    withoutStruck: true,
    footer: 'Pre-federated data, pre-trained ML models, automated cascade analysis.',
  },
  {
    key: 'decide',
    icon: Users,
    phase: 'Phase 2',
    title: 'Decide & Align',
    without: '2-3 weeks',
    withTime: 'Single working session',
    compressionLabel: '~95% time reduction',
    compressionTone: 'green',
    withoutStruck: true,
    footer: 'Shared source of truth, structured stakeholder workflow, grounded numbers.',
  },
  {
    key: 'execute',
    icon: Wrench,
    phase: 'Phase 3',
    title: 'Execute',
    without: 'Weeks to months',
    withTime: 'Weeks to months',
    compressionLabel: 'Governed by real-world lead times',
    compressionTone: 'amber',
    withoutStruck: false,
    footer: 'Supplier qualification, contract negotiation, treasury approval. Real lead times respected — execution starts same day, not two months later.',
  },
];

function PhasesPanel() {
  const phasesPanelOpen = useWarRoom(s => s.phasesPanelOpen);
  const togglePhasesPanel = useWarRoom(s => s.togglePhasesPanel);

  useEffect(() => {
    if (!phasesPanelOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') togglePhasesPanel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phasesPanelOpen, togglePhasesPanel]);

  if (!phasesPanelOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm anim-fade-in"
        onClick={togglePhasesPanel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-6">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[1100px] max-w-[96vw] max-h-[92vh] pointer-events-auto anim-slide-up overflow-hidden flex flex-col bg-paper-50 shadow-2xl"
          style={{ borderRadius: '4px', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.06)' }}
          role="dialog"
          aria-label="Three Phases of Crisis Response"
        >
          {/* Header — light palette */}
          <div className="px-8 py-5 flex items-center justify-between border-b border-paper-300 bg-paper-100 flex-none">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] font-mono text-paper-500">Intellectual Honesty</div>
              <div className="font-display text-[26px] mt-1 leading-tight" style={{ color: COLORS.ink50 }}>
                The Three Phases of Crisis Response
              </div>
              <div className="text-[12px] mt-1 text-paper-600">How this platform compresses each phase — and where it deliberately does not.</div>
            </div>
            <button
              onClick={togglePhasesPanel}
              className="border border-paper-300 hover:bg-paper-200 px-2 py-2 text-paper-600 hover:text-paper-700 transition-colors flex-none"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* 3 Columns — light grid */}
          <div className="grid grid-cols-3 gap-px bg-paper-300 flex-1 overflow-y-auto">
            {PHASE_DATA.map((p) => <PhaseColumn key={p.key} {...p} />)}
          </div>

          {/* Net effect summary line */}
          <div className="px-8 py-5 border-t border-paper-300 bg-paper-100 flex-none">
            <div className="font-display text-[19px] leading-snug" style={{ color: COLORS.ink50 }}>
              <span className="text-paper-500 uppercase tracking-[0.18em] font-mono text-[11px] mr-2 align-middle">Net effect</span>
              6-week analysis-and-decision cycle{' '}
              <span className="font-medium" style={{ color: COLORS.severe }}>→ single working session</span>.
              {' '}Execution begins the same day, not in November.
            </div>
            <div className="mt-2 text-[11px] text-paper-500 italic">
              Phase 3 timelines are kept honest. The platform compresses analysis and alignment — execution remains governed by real-world lead times.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PhaseColumn({ icon: Icon, phase, title, without, withTime, compressionLabel, compressionTone, withoutStruck, footer }) {
  // Light-surface badge tones — chosen for contrast against bg-paper-50
  const badge = compressionTone === 'green'
    ? { bg: '#d1fae5', border: '#10b98166', text: '#047857' }
    : { bg: '#fef3c7', border: '#f59e0b66', text: '#92400e' };
  const BadgeIcon = compressionTone === 'green' ? CheckCircle2 : Clock;

  return (
    <div className="bg-paper-50 px-6 py-6 flex flex-col gap-4">
      {/* Icon + phase + title — all phases use the same severe accent for equivalence */}
      <div className="flex items-center gap-3">
        <div
          className="size-11 flex items-center justify-center flex-none"
          style={{ background: 'rgba(234, 88, 12, 0.10)', border: '1px solid rgba(234, 88, 12, 0.35)', borderRadius: '2px' }}
        >
          <Icon size={20} style={{ color: COLORS.severe }} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] font-mono text-paper-500">{phase}</div>
          <div className="font-display text-[19px] leading-tight mt-0.5" style={{ color: COLORS.ink50 }}>{title}</div>
        </div>
      </div>

      <div className="border-t border-paper-300 pt-4 space-y-3">
        <div>
          <div className="text-[9px] uppercase tracking-[0.22em] font-mono text-paper-500">Without platform</div>
          <div
            className="font-mono text-[16px] mt-1"
            style={{
              color: withoutStruck ? '#a3a39a' : COLORS.paper600,
              textDecoration: withoutStruck ? 'line-through' : 'none',
              textDecorationColor: withoutStruck ? '#a3a39a' : 'transparent',
              textDecorationThickness: '1.5px',
            }}
          >
            {without}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-[0.22em] font-mono text-paper-500">With platform</div>
          <div className="font-display text-[24px] font-semibold mt-0.5 leading-tight" style={{ color: COLORS.severe }}>
            {withTime}
          </div>
        </div>
      </div>

      <div>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.16em] font-mono font-medium"
          style={{
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            color: badge.text,
            borderRadius: '2px',
          }}
        >
          <BadgeIcon size={11} />
          {compressionLabel}
        </div>
      </div>

      <div className="text-[11.5px] italic leading-snug text-paper-600 mt-auto pt-2 border-t border-paper-200">
        {footer}
      </div>
    </div>
  );
}

/* ============================================================================
 * SECTION 17: MAIN CANVAS — switches by mode
 * ========================================================================== */

function MainCanvas() {
  const mode = useWarRoom(s => s.mode);
  if (mode === 'response') return <ResponseState />;
  // Steady & Alert both show steady-state canvas behind the optional banner
  return <SteadyState />;
}

/* ============================================================================
 * SECTION 18: APP ROOT
 * ========================================================================== */

export default function App() {
  const { mode, tickTimer, alertFiredAt } = useWarRoom();

  // Time-to-decision counter ticking
  useEffect(() => {
    if (!alertFiredAt) return;
    const t = setInterval(tickTimer, 1000);
    return () => clearInterval(t);
  }, [alertFiredAt, tickTimer]);

  if (mode === 'boot') return <BootSequence />;

  return (
    <div className="h-screen w-screen flex flex-col bg-ink-50 text-paper-100 relative overflow-hidden">
      <Header />
      <AlertBanner />
      <div className="flex-1 flex min-h-0">
        <SignalSidebar />
        <main className="flex-1 min-w-0 relative">
          <MainCanvas />
        </main>
        <AuditDrawer />
      </div>
      <Footer />
      <AIAdvisorFAB />
      <DemoControls />
      <LineageDrawer />
      <BoardPackModal />
      <SettingsModal />
      <PhasesPanel />
    </div>
  );
}

function Footer() {
  return (
    <footer className="hairline-t bg-ink-100/60 px-5 py-1.5 flex items-center justify-between text-[9px] uppercase tracking-[0.22em] text-paper-500 font-mono">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-stable anim-blink" /> Datasphere · Connected</span>
        <span>Last sync 02:14 UTC</span>
        <span>{COMPANY.fy} · AMER-EAST</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Cmd+Shift+D · Demo Controls</span>
        <span className="text-amber-400">Demo Mode · PwC Hackathon</span>
      </div>
    </footer>
  );
}
