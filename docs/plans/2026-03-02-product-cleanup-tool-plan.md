# Product Cleanup Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local React webapp for cleaning up ~300 product records — fixing images, adding descriptions, generating nutrition info via Claude Sonnet, all through a review queue.

**Architecture:** Standalone Vite + React app at `/Users/anishtimsina/workspace/product-cleanup-tool/`. Reuses the existing Supabase `admin-crud` and `upload-image` edge functions (zero new backend). Clerk auth for admin access. Vite server middleware proxies Claude API calls to avoid CORS issues.

**Tech Stack:** Vite 5, React 18, TypeScript, Tailwind CSS, shadcn/ui, Anthropic Claude Sonnet, Google Custom Search API, HTML5 Canvas for image processing, IndexedDB for review state.

**Design doc:** `docs/plans/2026-03-02-product-cleanup-tool-design.md` in spice-and-slice-mono.

---

## Task 1: Project Scaffolding

**Goal:** Create the Vite project with all dependencies, Tailwind, shadcn/ui, and env config.

**Step 1: Create Vite project**

```bash
cd /Users/anishtimsina/workspace
npm create vite@latest product-cleanup-tool -- --template react-ts
cd product-cleanup-tool
```

**Step 2: Install dependencies**

```bash
# Core
bun add @supabase/supabase-js@2.49.4 @clerk/clerk-react@5.53.8 @tanstack/react-query@5.56.2

# UI
bun add tailwindcss@3.4.11 postcss autoprefixer
bun add lucide-react@0.462.0 class-variance-authority clsx tailwind-merge
bun add @radix-ui/react-tabs @radix-ui/react-dialog @radix-ui/react-select
bun add @radix-ui/react-collapsible @radix-ui/react-tooltip @radix-ui/react-progress
bun add @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-switch
bun add @radix-ui/react-separator @radix-ui/react-scroll-area

# Image processing
bun add @imgly/background-removal

# Utilities
bun add uuid idb
bun add -D @types/uuid
```

**Step 3: Configure Tailwind**

Create `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "food-red": "#8B0000",
        "food-orange": "#FF8C00",
        "food-brown": "#8B4513",
        "food-green": "#228B22",
        "food-gold": "#FFD700",
        "food-cream": "#FFFDD0",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

Install animation plugin: `bun add -D tailwindcss-animate`

Create `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 4: Set up CSS variables**

Replace `src/index.css` with shadcn theme variables (slate base):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 0 73% 27%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 0 73% 27%;
    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Inter", sans-serif;
  }
}
```

**Step 5: Configure path aliases**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

`vite.config.ts` (with Claude API proxy middleware):

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
  },
});
```

**Step 6: Create .env.local template**

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://isexlpmxnhuezhkmbuyu.supabase.co
VITE_SUPABASE_ANON_KEY=<copy from main app>
VITE_CLERK_PUBLISHABLE_KEY=<copy from main app>
VITE_ANTHROPIC_API_KEY=<your key>
VITE_GOOGLE_CSE_ID=<your custom search engine id>
VITE_GOOGLE_API_KEY=<your google api key>
```

Add to `.gitignore`:

```
.env.local
.env*.local
```

**Step 7: Create cn utility**

Create `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 8: Verify project starts**

```bash
bun dev
```

Visit `http://localhost:5174` — should show the default Vite React page with Tailwind working.

**Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold product cleanup tool with Vite + React + Tailwind + shadcn"
```

---

## Task 2: Database Migration

**Goal:** Add the `nutrition` JSONB column to the products table.

**Files:**
- Create: `spice-and-slice-mono/supabase/migrations/20260302000005_add_nutrition_column.sql`

**Step 1: Write migration**

In the **spice-and-slice-mono** repo (not the new tool):

```sql
-- Add nutrition info as JSONB to products table.
-- Stores serving_size, calories, macros etc. as flexible JSON.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS nutrition JSONB;

COMMENT ON COLUMN public.products.nutrition IS
'Nutrition facts as JSON: { serving_size, calories, total_fat, saturated_fat, cholesterol, sodium, total_carbs, dietary_fiber, sugars, protein }';
```

**Step 2: Apply migration**

```bash
cd /Users/anishtimsina/workspace/spice-and-slice-mono
npx supabase db push
```

**Step 3: Commit in spice-and-slice-mono**

```bash
git add supabase/migrations/20260302000005_add_nutrition_column.sql
git commit -m "feat: add nutrition JSONB column to products table"
git push
```

---

## Task 3: Core Libraries

**Goal:** Build the backend integration layer — Supabase client, Clerk auth, Claude proxy, Google search, image processing, IndexedDB.

### Task 3a: Supabase Client + Auth

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/auth.ts`

`src/lib/supabase.ts` — Supabase client + admin-crud wrapper + upload-image wrapper:

```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Auth token management ----

let tokenGetter: (() => Promise<string | null>) | null = null;
let cachedToken: string | null = null;
let tokenExpiry = 0;

export function registerTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  if (!tokenGetter) throw new Error("Token getter not registered");
  const token = await tokenGetter();
  if (!token) throw new Error("Not authenticated");
  cachedToken = token;
  tokenExpiry = Date.now() + 30_000; // 30s cache
  return token;
}

// ---- Admin CRUD ----

interface FilterSpec {
  column: string;
  operator: string;
  value: unknown;
}

interface AdminCrudRequest {
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "upsert";
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: FilterSpec[];
  select?: string;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  count?: boolean;
}

export async function adminCrud(request: AdminCrudRequest) {
  const token = await getToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-crud`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `admin-crud failed (${res.status})`);
  return json;
}

// Convenience helpers
export async function fetchProducts() {
  return adminCrud({
    table: "products",
    operation: "select",
    select: "*, category:categories(id, name, tax_rate)",
    order: { column: "name", ascending: true },
    limit: 1000,
  });
}

export async function fetchCategories() {
  return adminCrud({
    table: "categories",
    operation: "select",
    select: "id, name",
    filters: [{ column: "is_active", operator: "eq", value: true }],
    order: { column: "name", ascending: true },
  });
}

export async function updateProduct(
  id: string,
  data: Record<string, unknown>
) {
  return adminCrud({
    table: "products",
    operation: "update",
    data: { ...data, updated_at: new Date().toISOString() },
    filters: [{ column: "id", operator: "eq", value: id }],
  });
}

// ---- Image Upload ----

export async function uploadProductImage(
  file: File,
  fileName: string
): Promise<string> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("filePath", fileName);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "x-require-admin": "true",
    },
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json.publicUrl;
}
```

`src/lib/auth.ts` — Clerk provider setup helper:

```typescript
// Re-export registerTokenGetter for use in App.tsx
export { registerTokenGetter } from "./supabase";
```

### Task 3b: Claude API Integration

**Files:**
- Create: `src/lib/claude.ts`
- Modify: `vite.config.ts` (add proxy middleware)

**Important:** The Anthropic API does not support CORS. We add a Vite dev server middleware to proxy requests.

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Connect } from "vite";

function claudeProxy(): { name: string; configureServer: (server: any) => void } {
  return {
    name: "claude-proxy",
    configureServer(server: any) {
      server.middlewares.use("/api/claude", async (req: Connect.IncomingMessage & { body?: any }, res: any) => {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          res.end();
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks).toString();

          const apiKey = process.env.VITE_ANTHROPIC_API_KEY;
          if (!apiKey) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "VITE_ANTHROPIC_API_KEY not set" }));
            return;
          }

          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body,
          });

          const data = await response.text();
          res.writeHead(response.status, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(data);
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), claudeProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
  },
});
```

`src/lib/claude.ts`:

```typescript
interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: { type: "text"; text: string }[];
}

async function callClaude(messages: ClaudeMessage[], system?: string): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error?.message || err.error || `Claude API error (${res.status})`);
  }

  const data: ClaudeResponse = await res.json();
  return data.content[0]?.text || "";
}

export async function generateDescription(
  name: string,
  category: string,
  brand?: string | null
): Promise<string> {
  const system = `You are a food product copywriter for an Indo-Nepali grocery store called Spice & Slice Bazaar. Write concise, appetizing product descriptions.`;

  const prompt = `Generate a product description (2-3 sentences) for:
- Product: ${name}
- Category: ${category}${brand ? `\n- Brand: ${brand}` : ""}

Highlight what makes this product appealing. Mention common uses or recipes if relevant. Use warm, appetizing language. Be factual. Return only the description text.`;

  return callClaude([{ role: "user", content: prompt }], system);
}

export interface NutritionInfo {
  serving_size?: string;
  calories?: number;
  total_fat?: string;
  saturated_fat?: string;
  cholesterol?: string;
  sodium?: string;
  total_carbs?: string;
  dietary_fiber?: string;
  sugars?: string;
  protein?: string;
}

export async function generateNutrition(
  name: string,
  category: string,
  brand?: string | null
): Promise<NutritionInfo> {
  const system = `You are a nutrition expert. Estimate nutrition facts for food products. Return only valid JSON.`;

  const prompt = `Estimate the nutrition facts for this food product:
- Product: ${name}
- Category: ${category}${brand ? `\n- Brand: ${brand}` : ""}

Return a JSON object:
{
  "serving_size": "string (e.g., '100g', '1 cup')",
  "calories": number,
  "total_fat": "string with unit",
  "saturated_fat": "string with unit",
  "cholesterol": "string with unit",
  "sodium": "string with unit",
  "total_carbs": "string with unit",
  "dietary_fiber": "string with unit",
  "sugars": "string with unit",
  "protein": "string with unit"
}

Use standard serving size for this product type. If uncertain, prefix with "~". Return only valid JSON, no markdown.`;

  const text = await callClaude([{ role: "user", content: prompt }], system);

  // Extract JSON from response (handle potential markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse nutrition response");
  return JSON.parse(jsonMatch[0]);
}
```

### Task 3c: Google Image Search

**Files:**
- Create: `src/lib/google-search.ts`

```typescript
export interface SearchResult {
  title: string;
  link: string; // Full-size image URL
  thumbnail: string; // Thumbnail URL
  width: number;
  height: number;
}

export async function searchImages(
  query: string,
  start = 1
): Promise<{ results: SearchResult[]; totalResults: number }> {
  const cseId = import.meta.env.VITE_GOOGLE_CSE_ID;
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  if (!cseId || !apiKey) {
    throw new Error("Google CSE credentials not configured");
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query,
    searchType: "image",
    num: "10",
    start: String(start),
    imgSize: "large",
    safe: "active",
  });

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params}`
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google search failed (${res.status})`);
  }

  const data = await res.json();

  const results: SearchResult[] = (data.items || []).map((item: any) => ({
    title: item.title,
    link: item.link,
    thumbnail: item.image?.thumbnailLink || item.link,
    width: item.image?.width || 0,
    height: item.image?.height || 0,
  }));

  return {
    results,
    totalResults: parseInt(data.searchInformation?.totalResults || "0"),
  };
}
```

### Task 3d: Image Processing

**Files:**
- Create: `src/lib/image-processing.ts`

```typescript
const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 600;

/**
 * Load an image from a URL or File into an HTMLImageElement.
 */
export function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));

    if (src instanceof File) {
      img.src = URL.createObjectURL(src);
    } else {
      img.src = src;
    }
  });
}

/**
 * Standardize an image: resize to 800x600, center on white background.
 * Returns a Blob ready for upload.
 */
export async function standardizeImage(
  source: HTMLImageElement | string | File,
  options?: { removeBackground?: boolean }
): Promise<{ blob: Blob; dataUrl: string }> {
  let img: HTMLImageElement;
  if (source instanceof HTMLImageElement) {
    img = source;
  } else {
    img = await loadImage(source);
  }

  // Optional background removal
  let processedImg = img;
  if (options?.removeBackground) {
    const { removeBackground } = await import("@imgly/background-removal");
    const blob = await removeBackground(img.src);
    processedImg = await loadImage(URL.createObjectURL(blob));
  }

  // Calculate scale to fit within target while maintaining aspect ratio
  const scale = Math.min(
    TARGET_WIDTH / processedImg.naturalWidth,
    TARGET_HEIGHT / processedImg.naturalHeight,
    1 // Don't upscale
  );

  const scaledWidth = Math.round(processedImg.naturalWidth * scale);
  const scaledHeight = Math.round(processedImg.naturalHeight * scale);

  // Create canvas with white background
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_WIDTH;
  canvas.height = TARGET_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

  // Center the image
  const x = Math.round((TARGET_WIDTH - scaledWidth) / 2);
  const y = Math.round((TARGET_HEIGHT - scaledHeight) / 2);
  ctx.drawImage(processedImg, x, y, scaledWidth, scaledHeight);

  // Export as WebP (fallback to JPEG)
  const dataUrl = canvas.toDataURL("image/webp", 0.9);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))),
      "image/webp",
      0.9
    );
  });

  return { blob, dataUrl };
}

/**
 * Convert a Blob to a File object for upload.
 */
export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type });
}
```

### Task 3e: IndexedDB Review State

**Files:**
- Create: `src/lib/review-db.ts`

```typescript
import { openDB, type IDBPDatabase } from "idb";

interface ReviewRecord {
  productId: string;
  status: "pending" | "reviewed" | "skipped";
  reviewedAt?: string;
}

const DB_NAME = "product-cleanup-review";
const STORE_NAME = "reviews";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "productId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function getReviewStatus(
  productId: string
): Promise<ReviewRecord | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, productId);
}

export async function getAllReviewStatuses(): Promise<ReviewRecord[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function markReviewed(productId: string) {
  const db = await getDb();
  await db.put(STORE_NAME, {
    productId,
    status: "reviewed",
    reviewedAt: new Date().toISOString(),
  } satisfies ReviewRecord);
}

export async function markSkipped(productId: string) {
  const db = await getDb();
  await db.put(STORE_NAME, {
    productId,
    status: "skipped",
  } satisfies ReviewRecord);
}

export async function clearAllReviews() {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function getReviewedCount(): Promise<number> {
  const all = await getAllReviewStatuses();
  return all.filter((r) => r.status === "reviewed").length;
}
```

**Step: Commit all libraries**

```bash
git add -A
git commit -m "feat: add core libraries — supabase, claude, google search, image processing, review db"
```

---

## Task 4: Shadcn UI Components

**Goal:** Add the shadcn/ui primitives we need. Since this is a standalone project, we create them manually.

**Files to create (copy from shadcn/ui source — standard implementations):**
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/switch.tsx`

**Step 1:** Initialize shadcn via CLI (easiest way to get all components):

```bash
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables: yes
npx shadcn@latest add button input textarea label badge card tabs select dialog progress separator scroll-area collapsible tooltip switch toast
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui components"
```

---

## Task 5: Types and Hooks

**Goal:** Create TypeScript types and React hooks for data fetching, product updates, AI generation, image search, and review queue.

### Task 5a: Types

**Files:**
- Create: `src/types.ts`

```typescript
export interface Category {
  id: string;
  name: string;
  tax_rate?: number | null;
}

export interface NutritionInfo {
  serving_size?: string;
  calories?: number;
  total_fat?: string;
  saturated_fat?: string;
  cholesterol?: string;
  sodium?: string;
  total_carbs?: string;
  dietary_fiber?: string;
  sugars?: string;
  protein?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: number;
  inventory_count: number;
  inventory_weight: number;
  is_weighted: boolean;
  unit_of_measure: string | null;
  track_inventory: boolean;
  low_stock_threshold: number;
  low_stock_weight_threshold: number;
  upc_code: string | null;
  category_id: string;
  category?: Category | null;
  sub_category: string | null;
  brand: string | null;
  tags: string[] | null;
  is_active: boolean;
  priority: number;
  min_order_value: number | null;
  min_order_unit: "pieces" | "kg" | "lbs" | null;
  tax_rate: number | null;
  nutrition: NutritionInfo | null;
  image_url: string | null;
  has_default_image: boolean;
  created_at?: string;
  updated_at?: string;
}

export type QueueFilter =
  | "all"
  | "needs-image"
  | "needs-description"
  | "needs-nutrition"
  | "needs-tags"
  | "reviewed"
  | "clean";
```

### Task 5b: Data Hooks

**Files:**
- Create: `src/hooks/useProducts.ts`
- Create: `src/hooks/useProductUpdate.ts`
- Create: `src/hooks/useReviewQueue.ts`
- Create: `src/hooks/useAIGenerate.ts`
- Create: `src/hooks/useImageSearch.ts`

`src/hooks/useProducts.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories } from "@/lib/supabase";
import type { Product, Category } from "@/types";

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetchProducts();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetchCategories();
      return res.data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}
```

`src/hooks/useProductUpdate.ts`:

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@/lib/supabase";
import type { Product } from "@/types";

export function useProductUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Product>;
    }) => {
      return updateProduct(id, data as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      // Optimistically update the cache
      queryClient.setQueryData<Product[]>(["products"], (old) =>
        old?.map((p) =>
          p.id === variables.id ? { ...p, ...variables.data } : p
        )
      );
    },
  });
}
```

`src/hooks/useReviewQueue.ts`:

```typescript
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllReviewStatuses,
  markReviewed,
  markSkipped,
  getReviewedCount,
} from "@/lib/review-db";
import type { Product, QueueFilter } from "@/types";

export function useReviewQueue(products: Product[] | undefined) {
  const [reviewMap, setReviewMap] = useState<
    Map<string, "reviewed" | "skipped">
  >(new Map());
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Load review statuses from IndexedDB on mount
  useEffect(() => {
    getAllReviewStatuses().then((statuses) => {
      const map = new Map<string, "reviewed" | "skipped">();
      statuses.forEach((s) => map.set(s.productId, s.status));
      setReviewMap(map);
      setReviewedCount(statuses.filter((s) => s.status === "reviewed").length);
    });
  }, []);

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((p) => {
      switch (filter) {
        case "needs-image":
          return !p.image_url || p.has_default_image;
        case "needs-description":
          return !p.description || p.description.trim() === "";
        case "needs-nutrition":
          return !p.nutrition;
        case "needs-tags":
          return !p.tags || p.tags.length === 0;
        case "reviewed":
          return reviewMap.get(p.id) === "reviewed";
        case "clean":
          return (
            p.image_url &&
            !p.has_default_image &&
            p.description &&
            p.description.trim() !== "" &&
            p.nutrition &&
            p.tags &&
            p.tags.length > 0
          );
        case "all":
        default:
          return true;
      }
    });
  }, [products, filter, reviewMap]);

  const currentProduct = filteredProducts[currentIndex] || null;

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, filteredProducts.length - 1));
  }, [filteredProducts.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const markCurrentReviewed = useCallback(async () => {
    if (!currentProduct) return;
    await markReviewed(currentProduct.id);
    setReviewMap((m) => new Map(m).set(currentProduct.id, "reviewed"));
    setReviewedCount((c) => c + 1);
  }, [currentProduct]);

  const markCurrentSkipped = useCallback(async () => {
    if (!currentProduct) return;
    await markSkipped(currentProduct.id);
    setReviewMap((m) => new Map(m).set(currentProduct.id, "skipped"));
  }, [currentProduct]);

  // Queue counts for dashboard
  const counts = useMemo(() => {
    if (!products) return null;
    return {
      total: products.length,
      needsImage: products.filter((p) => !p.image_url || p.has_default_image)
        .length,
      needsDescription: products.filter(
        (p) => !p.description || p.description.trim() === ""
      ).length,
      needsNutrition: products.filter((p) => !p.nutrition).length,
      needsTags: products.filter((p) => !p.tags || p.tags.length === 0).length,
      reviewed: reviewedCount,
      clean: products.filter(
        (p) =>
          p.image_url &&
          !p.has_default_image &&
          p.description &&
          p.description.trim() !== "" &&
          p.nutrition &&
          p.tags &&
          p.tags.length > 0
      ).length,
    };
  }, [products, reviewedCount]);

  return {
    filteredProducts,
    currentProduct,
    currentIndex,
    filter,
    setFilter,
    goNext,
    goPrev,
    setCurrentIndex,
    markCurrentReviewed,
    markCurrentSkipped,
    counts,
    reviewMap,
  };
}
```

`src/hooks/useAIGenerate.ts`:

```typescript
import { useState, useCallback } from "react";
import { generateDescription, generateNutrition } from "@/lib/claude";
import type { NutritionInfo, Product } from "@/types";

export function useAIGenerate() {
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDesc = useCallback(async (product: Product) => {
    setIsGeneratingDesc(true);
    setError(null);
    try {
      const description = await generateDescription(
        product.name,
        product.category?.name || "General",
        product.brand
      );
      return description;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsGeneratingDesc(false);
    }
  }, []);

  const generateNut = useCallback(async (product: Product) => {
    setIsGeneratingNutrition(true);
    setError(null);
    try {
      const nutrition = await generateNutrition(
        product.name,
        product.category?.name || "General",
        product.brand
      );
      return nutrition;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsGeneratingNutrition(false);
    }
  }, []);

  const generateAll = useCallback(
    async (product: Product) => {
      const [description, nutrition] = await Promise.all([
        generateDesc(product),
        generateNut(product),
      ]);
      return { description, nutrition };
    },
    [generateDesc, generateNut]
  );

  return {
    generateDesc,
    generateNut,
    generateAll,
    isGeneratingDesc,
    isGeneratingNutrition,
    isGenerating: isGeneratingDesc || isGeneratingNutrition,
    error,
  };
}
```

`src/hooks/useImageSearch.ts`:

```typescript
import { useState, useCallback } from "react";
import { searchImages, type SearchResult } from "@/lib/google-search";

export function useImageSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    setQuery(searchQuery);
    try {
      const data = await searchImages(searchQuery + " product photo");
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setQuery("");
    setError(null);
  }, []);

  return { results, isSearching, error, query, search, clear };
}
```

**Commit:**

```bash
git add -A
git commit -m "feat: add types and React hooks — products, review queue, AI generate, image search"
```

---

## Task 6: App Shell and Layout

**Goal:** Build the main App component with Clerk auth, React Query provider, routing between dashboard and review view, and the split-panel layout.

**Files:**
- Rewrite: `src/App.tsx`
- Create: `src/components/Layout.tsx`
- Rewrite: `src/main.tsx`

`src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
);
```

`src/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useAuth, SignIn, useUser } from "@clerk/clerk-react";
import { registerTokenGetter } from "@/lib/supabase";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import ReviewDashboard from "@/components/ReviewDashboard";
import ProductReview from "@/components/ProductReview";

export default function App() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [view, setView] = useState<"dashboard" | "review">("dashboard");

  // Register Clerk token getter for Supabase calls
  useEffect(() => {
    if (isSignedIn) {
      registerTokenGetter(() => getToken());
    }
  }, [isSignedIn, getToken]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-food-red" />
      </div>
    );
  }

  // Not signed in — show Clerk sign-in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Product Cleanup Tool
          </h1>
          <p className="text-gray-600">Sign in with your admin account</p>
          <SignIn />
        </div>
      </div>
    );
  }

  return (
    <Layout userName={user?.firstName || "Admin"}>
      {view === "dashboard" ? (
        <ReviewDashboard onStartReview={(filter) => { setView("review"); }} />
      ) : (
        <ProductReview onBackToDashboard={() => setView("dashboard")} />
      )}
      <Toaster />
    </Layout>
  );
}
```

`src/components/Layout.tsx`:

```tsx
import { UserButton } from "@clerk/clerk-react";

interface LayoutProps {
  children: React.ReactNode;
  userName: string;
}

export default function Layout({ children, userName }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-food-red to-food-orange flex items-center justify-center">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Product Cleanup Tool
            </h1>
            <p className="text-xs text-gray-500">Spice & Slice Bazaar</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, {userName}</span>
          <UserButton />
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
```

**Commit:**

```bash
git add -A
git commit -m "feat: add app shell with Clerk auth, React Query, and layout"
```

---

## Task 7: Review Dashboard

**Goal:** Build the landing page that shows product counts by status and lets you start a review session.

**Files:**
- Create: `src/components/ReviewDashboard.tsx`

This component:
- Fetches all products via `useProducts()`
- Computes counts: needs image, needs description, needs nutrition, needs tags, reviewed, clean
- Renders a grid of status cards with counts (clickable to start review filtered to that set)
- Shows a search bar to find a specific product by name
- Has a "Generate All Missing" button for batch AI generation

Key elements per card: icon (from lucide-react), count number (large), label, colored background tint matching the category. Cards for: Needs Image (orange), Needs Description (blue), Needs Nutrition (purple), Needs Tags (green), Reviewed (gray), All Clean (emerald). Click navigates to review view with that filter.

Also includes:
- A progress bar showing `reviewed / total`
- A search input to jump to a specific product

**Commit:**

```bash
git add -A
git commit -m "feat: add review dashboard with status counts and filters"
```

---

## Task 8: Product Review — Left Panel (Product Editor)

**Goal:** Build the scrollable product editor form.

**Files:**
- Create: `src/components/ProductReview.tsx` (main split-panel container)
- Create: `src/components/ProductEditor.tsx` (left panel)
- Create: `src/components/DescriptionEditor.tsx`
- Create: `src/components/NutritionForm.tsx`
- Create: `src/components/TagEditor.tsx`
- Create: `src/components/ProductNav.tsx`

`ProductReview.tsx` is the main container:
- Uses `useProducts()` and `useReviewQueue(products)` to get current product
- Split layout: `grid grid-cols-1 lg:grid-cols-2 gap-0 h-[calc(100vh-57px)]`
- Left: `<ProductEditor>` in a `<ScrollArea>`
- Right: `<ImageWorkspace>` (Task 9)
- Header bar with `<ProductNav>` (prev/next, progress, filter buttons)

`ProductEditor.tsx`:
- Receives current product + update mutation
- Local form state initialized from product (resets when product changes)
- Section 1 — Identity: name (Input), category (Select from useCategories), brand (Input), UPC (Input), tags (TagEditor)
- Section 2 — Description: DescriptionEditor (textarea + "Generate" button)
- Section 3 — Nutrition: NutritionForm (structured fields + "Generate" button)
- Section 4 — Pricing (Collapsible): price, tax_rate, min_order_value, min_order_unit
- Save button: compares local state to original product, sends only changed fields via `useProductUpdate()`, then calls `markCurrentReviewed()`
- Dirty state tracking: visual indicator when unsaved changes exist

`DescriptionEditor.tsx`:
- Textarea with current description
- "Generate with AI" button that calls `useAIGenerate().generateDesc(product)`
- Shows loading spinner while generating
- Generated text replaces textarea content (user can edit before saving)

`NutritionForm.tsx`:
- Grid of labeled inputs: serving_size, calories, total_fat, saturated_fat, cholesterol, sodium, total_carbs, dietary_fiber, sugars, protein
- "Generate with AI" button that calls `useAIGenerate().generateNut(product)`
- Generated values populate the form fields
- "Clear All" button to reset nutrition

`TagEditor.tsx`:
- Displays current tags as Badge chips with X to remove
- Input field to type and add new tags (Enter to add)
- Common tag suggestions based on category

`ProductNav.tsx`:
- Left/right arrow buttons (ChevronLeft, ChevronRight from lucide)
- Progress text: "47 / 312"
- Filter dropdown or pill buttons: All | Needs Image | Needs Description | etc.
- "Back to Dashboard" button

**Commit:**

```bash
git add -A
git commit -m "feat: add product editor — description, nutrition, tags, identity, pricing"
```

---

## Task 9: Product Review — Right Panel (Image Workspace)

**Goal:** Build the image workspace with current image display, Google search, file upload, and standardization preview.

**Files:**
- Create: `src/components/ImageWorkspace.tsx` (right panel container)
- Create: `src/components/ImageSearch.tsx` (Google CSE tab)
- Create: `src/components/ImageUpload.tsx` (drag & drop tab)
- Create: `src/components/ImageStandardizer.tsx` (preview + standardize)

`ImageWorkspace.tsx`:
- Top: current product image displayed in 800x600 frame (or "No Image" placeholder with ImageOff icon)
- Below: `<Tabs>` with "Search" and "Upload" tabs
- Below tabs: `<ImageStandardizer>` appears when an image is selected from either tab
- "Apply Image" button at bottom: calls `standardizeImage()` → `uploadProductImage()` → `updateProduct()` to save new image_url

`ImageSearch.tsx`:
- Input pre-filled with product name, editable
- Search button (or Enter to search)
- Grid of results (3 columns) showing thumbnails from `useImageSearch()`
- Click a thumbnail to select it → passes to ImageStandardizer
- Loading spinner while searching
- Error message if search fails

`ImageUpload.tsx`:
- Drag-and-drop zone with dashed border
- "Choose File" button as alternative
- Accepts image/jpeg, image/png, image/webp
- Max 5MB validation
- On file select → passes to ImageStandardizer
- Preview of dropped file before standardization

`ImageStandardizer.tsx`:
- Shows "before" (raw image thumbnail) and "after" (800x600 white bg) side by side
- Toggle switch: "Remove Background" (default off)
- When toggled on, re-runs `standardizeImage()` with `removeBackground: true`
- Loading state while processing (background removal can take a few seconds)
- "Apply" button to upload the standardized image

Image upload flow:
1. User selects image (from search or upload)
2. ImageStandardizer shows before/after preview
3. User optionally toggles background removal
4. User clicks "Apply Image"
5. `standardizeImage()` → returns Blob
6. `blobToFile()` → creates File with UUID name
7. `uploadProductImage()` → uploads to Supabase
8. `updateProduct()` → saves new image_url + sets `has_default_image: false`
9. Product cache updated optimistically

**Commit:**

```bash
git add -A
git commit -m "feat: add image workspace — search, upload, standardize, preview"
```

---

## Task 10: Keyboard Shortcuts

**Goal:** Add keyboard shortcuts for fast review workflow.

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/components/ProductReview.tsx` (wire shortcuts)

`src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from "react";

interface Shortcut {
  key: string;
  meta?: boolean; // Cmd on Mac
  shift?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only allow Cmd+S and Escape in inputs
        if (!(e.metaKey && e.key === "s") && e.key !== "Escape") return;
      }

      for (const shortcut of shortcuts) {
        if (
          e.key === shortcut.key &&
          !!e.metaKey === !!shortcut.meta &&
          !!e.shiftKey === !!shortcut.shift
        ) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
```

Wire in `ProductReview.tsx`:

```typescript
useKeyboardShortcuts([
  { key: "s", meta: true, handler: handleSave },
  { key: "ArrowRight", meta: true, handler: goNext },
  { key: "ArrowLeft", meta: true, handler: goPrev },
  { key: "g", meta: true, handler: handleGenerateAll },
]);
```

**Commit:**

```bash
git add -A
git commit -m "feat: add keyboard shortcuts — Cmd+S save, Cmd+arrows navigate, Cmd+G generate"
```

---

## Task 11: Batch AI Generation

**Goal:** Add a "Generate All Missing" button on the dashboard that runs Claude across all products with missing descriptions/nutrition.

**Files:**
- Create: `src/hooks/useBatchGenerate.ts`
- Modify: `src/components/ReviewDashboard.tsx` (add batch button + progress)

`src/hooks/useBatchGenerate.ts`:

```typescript
import { useState, useCallback, useRef } from "react";
import { generateDescription, generateNutrition } from "@/lib/claude";
import { updateProduct } from "@/lib/supabase";
import type { Product } from "@/types";

interface BatchProgress {
  total: number;
  completed: number;
  current: string; // Current product name
  errors: { productId: string; name: string; error: string }[];
}

export function useBatchGenerate() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const abortRef = useRef(false);

  const run = useCallback(
    async (
      products: Product[],
      options: { descriptions?: boolean; nutrition?: boolean }
    ) => {
      setIsRunning(true);
      abortRef.current = false;

      const targets = products.filter((p) => {
        if (options.descriptions && (!p.description || !p.description.trim()))
          return true;
        if (options.nutrition && !p.nutrition) return true;
        return false;
      });

      const prog: BatchProgress = {
        total: targets.length,
        completed: 0,
        current: "",
        errors: [],
      };
      setProgress({ ...prog });

      for (const product of targets) {
        if (abortRef.current) break;

        prog.current = product.name;
        setProgress({ ...prog });

        try {
          const updates: Record<string, unknown> = {};

          if (
            options.descriptions &&
            (!product.description || !product.description.trim())
          ) {
            const desc = await generateDescription(
              product.name,
              product.category?.name || "General",
              product.brand
            );
            updates.description = desc;
          }

          if (options.nutrition && !product.nutrition) {
            const nut = await generateNutrition(
              product.name,
              product.category?.name || "General",
              product.brand
            );
            updates.nutrition = nut;
          }

          if (Object.keys(updates).length > 0) {
            await updateProduct(product.id, updates);
          }
        } catch (err: any) {
          prog.errors.push({
            productId: product.id,
            name: product.name,
            error: err.message,
          });
        }

        prog.completed++;
        setProgress({ ...prog });

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      }

      setIsRunning(false);
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { run, abort, isRunning, progress };
}
```

On dashboard, add:
- "Generate All Missing Descriptions" button
- "Generate All Missing Nutrition" button
- Progress bar while running (shows "Processing: {product name}... 47/200")
- Cancel button to abort
- Error summary when done

**Commit:**

```bash
git add -A
git commit -m "feat: add batch AI generation with progress tracking and abort"
```

---

## Task 12: Polish and Integration

**Goal:** Final wiring, error handling, and visual polish.

**Steps:**

1. **Toast notifications**: Use shadcn toast for save success/error, AI generation results, image upload status
2. **Loading states**: Skeleton loaders for product data, spinners for AI/search
3. **Empty states**: "No products match this filter" with helpful message
4. **Error boundaries**: Wrap main content in error boundary with retry
5. **Responsive**: Ensure mobile layout stacks panels vertically (though primarily desktop tool)
6. **Image CORS proxy**: Some Google Image results may hit CORS. Add a simple fetch-through-proxy for image loading: use the same Vite middleware approach to proxy image fetches
7. **Dirty form warning**: If unsaved changes exist when navigating to next product, show a confirmation dialog

**Commit:**

```bash
git add -A
git commit -m "feat: add polish — toasts, loading states, error handling, dirty form warning"
```

---

## Task 13: Final Verification

**Steps:**

1. Start the dev server: `bun dev`
2. Sign in with admin Clerk account
3. Verify dashboard shows correct product counts
4. Click "Needs Description" → opens review for products missing descriptions
5. Click "Generate with AI" → description appears in textarea
6. Edit description → click Save → verify in Supabase dashboard
7. Search for an image → click thumbnail → see standardization preview
8. Toggle background removal → verify preview updates
9. Click "Apply Image" → verify image_url updated in Supabase
10. Use Cmd+S to save, Cmd+Right to advance
11. Test batch generation with 5 products
12. Verify IndexedDB persistence (close/reopen browser)

**Final commit:**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Summary

| Task | What it builds | Estimated effort |
|------|---------------|------------------|
| 1 | Project scaffolding | Setup |
| 2 | DB migration (nutrition column) | Tiny |
| 3 | Core libraries (supabase, claude, search, images, indexeddb) | Medium |
| 4 | Shadcn UI components | Setup |
| 5 | Types and React hooks | Medium |
| 6 | App shell + layout | Small |
| 7 | Review dashboard | Medium |
| 8 | Product editor (left panel) | Large |
| 9 | Image workspace (right panel) | Large |
| 10 | Keyboard shortcuts | Small |
| 11 | Batch AI generation | Medium |
| 12 | Polish and integration | Medium |
| 13 | Verification | Testing |
