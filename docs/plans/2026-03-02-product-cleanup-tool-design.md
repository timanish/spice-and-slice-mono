# Product Data Cleanup Tool — Design Document

## Summary

A local React webapp for cleaning up ~300+ product records: fixing inconsistent images, adding descriptions, generating nutrition info, and standardizing tags. Split-panel UI with product editor on the left and image workspace on the right. AI-powered first drafts via Claude Sonnet, manual review of every product.

## Architecture

```
Local Webapp (localhost:5174)
├── Left Panel: Product Editor (all fields)
├── Right Panel: Image Workspace (search, upload, standardize)
├── Claude Sonnet API → descriptions, nutrition, tags
├── Google Custom Search API → image search
├── Canvas API → image resize/crop to 800x600 white bg
└── Supabase Edge Functions → admin-crud (reads/writes), upload-image (images)
```

**Key principle**: Zero new backend work. The tool reuses the existing `admin-crud` and `upload-image` edge functions from the main app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| AI (text) | Claude Sonnet via Anthropic API |
| Image search | Google Custom Search JSON API |
| Image processing | HTML5 Canvas (resize/crop), `@imgly/background-removal` (bg removal) |
| Local state | IndexedDB (review progress tracking) |
| Backend | Existing Supabase edge functions (admin-crud, upload-image) |

## Database Changes

One migration — add a JSONB nutrition column:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition JSONB;
```

Nutrition JSON structure:

```json
{
  "serving_size": "100g",
  "calories": 250,
  "total_fat": "12g",
  "saturated_fat": "3g",
  "cholesterol": "45mg",
  "sodium": "380mg",
  "total_carbs": "18g",
  "dietary_fiber": "2g",
  "sugars": "3g",
  "protein": "16g"
}
```

No other schema changes — `description`, `tags`, `image_url` already exist.

TypeScript type:

```typescript
interface NutritionInfo {
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
```

## UI Layout

### Header Bar

- Product name (large, editable)
- Category badge
- Navigation: prev/next arrows
- Progress: "47 / 312 reviewed"
- Queue filter buttons: Needs Image | Needs Description | Needs Nutrition | All

### Left Panel — Product Editor

Scrollable form with sections:

**Section 1 — Identity**
- Name (text input)
- Category (dropdown)
- Brand (text input)
- UPC code (text input)
- Tags (multi-select chips with add/remove)

**Section 2 — Description**
- Large textarea with current description
- "Generate with AI" button → Claude Sonnet generates 2-3 sentence description
- Appears as editable draft in textarea

**Section 3 — Nutrition**
- Structured form: serving_size, calories, fat, protein, carbs, etc.
- "Generate with AI" button → Claude estimates nutrition from product name + category
- Each field individually editable

**Section 4 — Pricing & Inventory** (collapsible, rarely needed)
- Price, tax rate, min order, inventory fields

**Save button** at bottom. Only sends modified fields via admin-crud.

### Right Panel — Image Workspace

**Current image** displayed at top (800x600 preview frame, or "no image" placeholder).

**Two tabs:**

1. **Search tab**
   - Google Custom Search input (pre-filled with product name)
   - Grid of thumbnail results (8-12 per search)
   - Click thumbnail to select

2. **Upload tab**
   - Drag-and-drop zone
   - File picker button
   - Accepts JPEG, PNG, WebP (max 5MB)

**Standardization preview:**
- Selected image shows "before" (raw) and "after" (800x600, white bg, centered)
- Toggle for background removal (on/off)
- Manual crop adjustment if needed

**"Apply Image" button**: Standardizes → uploads to Supabase → updates product image_url.

## AI Integration

### Claude Sonnet Prompt — Description

```
You are a food product copywriter for an Indo-Nepali grocery store.

Generate a concise product description (2-3 sentences) for:
- Product: {name}
- Category: {category}
- Brand: {brand}

The description should:
- Highlight what makes this product appealing
- Mention common uses or recipes if relevant
- Use warm, appetizing language
- Be factual (don't invent features)

Return only the description text, no formatting.
```

### Claude Sonnet Prompt — Nutrition

```
Estimate the nutrition facts for this food product:
- Product: {name}
- Category: {category}
- Brand: {brand}

Return a JSON object with these fields (use standard serving size for this type of product):
{
  "serving_size": "string (e.g., '100g', '1 cup', '2 pieces')",
  "calories": number,
  "total_fat": "string with unit (e.g., '12g')",
  "saturated_fat": "string with unit",
  "cholesterol": "string with unit (e.g., '45mg')",
  "sodium": "string with unit",
  "total_carbs": "string with unit",
  "dietary_fiber": "string with unit",
  "sugars": "string with unit",
  "protein": "string with unit"
}

Use your best estimate based on typical nutritional values for this type of product.
If uncertain, provide reasonable estimates and mark with "~" prefix (e.g., "~12g").
Return only valid JSON.
```

### Batch Generation

A "Generate All Missing" button runs Claude across all products missing descriptions/nutrition. Runs sequentially with a progress bar (to stay within rate limits). Results stored as drafts — still requires manual review per product.

Estimated cost: ~$5 for 300 products via Claude Sonnet.

## Review Queue

### Dashboard (landing page)

Shows product counts by status:
- **Needs image**: has_default_image=true OR image_url is null
- **Needs description**: description is null or empty
- **Needs nutrition**: nutrition is null
- **Needs tags**: tags is null or empty array
- **All clean**: has image + description + nutrition + tags
- **Total reviewed**: count from IndexedDB

Click any category to start reviewing that subset. Search by product name. Filter by DB category.

### Review State (IndexedDB)

```typescript
interface ReviewState {
  productId: string;
  status: 'pending' | 'reviewed' | 'skipped';
  reviewedAt?: string;
}
```

Persists across browser sessions. Resumable — pick up where you left off.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+S | Save current product |
| Cmd+Right | Next product |
| Cmd+Left | Previous product |
| Cmd+G | Generate AI content (description + nutrition) |
| Cmd+I | Focus image search |
| Escape | Close modals/popups |

## Image Standardization Pipeline

1. **Input**: Raw image (from search, upload, or existing)
2. **Background removal** (optional): `@imgly/background-removal` runs in-browser
3. **Resize**: Scale to fit within 800x600 maintaining aspect ratio
4. **Center**: Place on 800x600 white canvas, centered
5. **Format**: Output as WebP (for size) with JPEG fallback
6. **Upload**: Send to Supabase via upload-image edge function

All processing happens client-side in Canvas — no server needed.

## Authentication

The tool authenticates with Supabase using the same Clerk JWT flow as the main admin portal. On first load, it presents a Clerk sign-in. The admin-crud edge function validates the admin role.

For the Anthropic API and Google CSE, keys are stored in `.env.local` (local only, never committed).

## Environment Variables

```env
# Supabase (same as main app)
VITE_SUPABASE_URL=https://isexlpmxnhuezhkmbuyu.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...

# AI & Search
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_GOOGLE_CSE_ID=...
VITE_GOOGLE_API_KEY=...
```

## Project Structure

```
product-cleanup-tool/
├── src/
│   ├── components/
│   │   ├── ProductEditor.tsx        # Left panel form
│   │   ├── ImageWorkspace.tsx       # Right panel tabs
│   │   ├── ImageSearch.tsx          # Google CSE integration
│   │   ├── ImageUpload.tsx          # Drag-and-drop upload
│   │   ├── ImageStandardizer.tsx    # Canvas resize/crop preview
│   │   ├── NutritionForm.tsx        # Nutrition fields form
│   │   ├── DescriptionEditor.tsx    # Description textarea + AI
│   │   ├── ReviewQueue.tsx          # Dashboard with counts
│   │   ├── ProductNav.tsx           # Prev/next + progress
│   │   └── TagEditor.tsx            # Multi-select tag chips
│   ├── lib/
│   │   ├── supabase.ts             # Admin-crud + upload-image calls
│   │   ├── claude.ts               # Anthropic API calls
│   │   ├── google-search.ts        # Google CSE API calls
│   │   ├── image-processing.ts     # Canvas standardization
│   │   └── review-db.ts            # IndexedDB review state
│   ├── hooks/
│   │   ├── useProducts.ts          # Fetch all products
│   │   ├── useProductUpdate.ts     # Save product changes
│   │   ├── useAIGenerate.ts        # Claude API integration
│   │   ├── useImageSearch.ts       # Google search hook
│   │   └── useReviewQueue.ts       # IndexedDB + filtering
│   ├── App.tsx
│   └── main.tsx
├── .env.local                       # API keys (gitignored)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Scope — What's NOT Included (v1)

- AI image generation (Stability AI / DALL-E) — deferred
- Bulk image operations (batch standardize all at once)
- Undo/redo history
- Nutrition label rendering on the storefront (separate task)
- Multi-user collaboration
- Deployment to cloud (local only)

## Cost Estimate

| Service | Usage | Cost |
|---------|-------|------|
| Claude Sonnet | ~300 products x description + nutrition | ~$5 |
| Google Custom Search | ~500-1000 searches | Free (100/day) to ~$5 |
| Background removal | In-browser, free | $0 |
| **Total** | | **~$5-10** |
