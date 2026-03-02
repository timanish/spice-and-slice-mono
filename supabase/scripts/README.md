# Product Import Script

Automated script to import products from CSV to Supabase database with intelligent image fetching from Google Images.

## Features

- ✅ Parses CSV and transforms data (Title Case names, price calculations, inventory)
- ✅ Creates categories automatically from `dept_name`
- ✅ Fetches product images from Google Images (no API keys needed!)
- ✅ Uploads images to Supabase Storage
- ✅ Handles duplicates (skips existing products)
- ✅ Batch processing for performance
- ✅ Detailed progress logging and error reporting
- ✅ Smart rate limiting to be respectful to Google

## Setup

### 1. Install Dependencies

```bash
cd supabase/scripts
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# From Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Default placeholder if no image found
PLACEHOLDER_IMAGE_URL=https://via.placeholder.com/400x400.png?text=No+Image
```

**That's it!** No API keys needed for image fetching - the script uses Google Images search automatically.

### 3. Prepare CSV File

Make sure `products (1).csv` is in the project root:

```
grubhub-wizard-catering-app/
  └── products (1).csv  ← Should be here
  └── supabase/
      └── scripts/
          └── import-products.ts
```

## Usage

Run the import script:

```bash
npm run import
```

The script will:

1. Read and parse the CSV file
2. Transform product data (title case, pricing, inventory)
3. Create categories if they don't exist
4. For each product:
   - Check if it already exists (skip if yes)
   - Search Google Images for "{product name} food"
   - Download and upload image to Supabase Storage
   - Insert product into database
5. Print detailed summary report

## Expected Runtime

- **Total time**: 1-2 hours for 1773 products
- **Rate limiting**: 2 second delay between requests to be respectful to Google
- **Automatic fallback**: Uses placeholder if image not found

## Data Transformations

| CSV Field                        | Product Field                          | Transformation                                                  |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `description`                    | `name`                                 | Title Case (e.g., "TANDOORI CHICKEN" → "Tandoori Chicken")      |
| `dept_name`                      | `category_id`                          | Maps to category UUID (creates if not exists)                   |
| `normal_price` / `special_price` | `price_per_unit`                       | Uses special price if date range is valid                       |
| `scale`                          | `is_weighted`                          | TRUE → weighted, FALSE → count-based                            |
| `QuantityOnHand`                 | `inventory_count` / `inventory_weight` | Based on `is_weighted`, negative → 0                            |
| `tax`                            | `tax_rate`                             | TRUE → 0.085 (8.5%), FALSE → null                               |
| `UnitOfMeasure`                  | `unit_of_measure`                      | Defaults to "lb" (weighted) or "ea" (count)                     |
| -                                | `track_inventory`                      | Always TRUE                                                     |
| -                                | `is_active`                            | Always TRUE (skips if CSV has `deleted=True` or `active=False`) |

## Output

The script provides:

- Real-time progress logging
- Batch insertion confirmations
- Final summary with statistics
- Error log saved to `import-errors.json`

Example output:

```
📊 IMPORT SUMMARY
============================================================
Total rows processed:     1773
Skipped (inactive):       0
Skipped (deleted):        0
Categories created:       5
Products imported:        1650
Products skipped (dupe):  0
Products failed:          123
Images fetched success:   1550
Images failed/placeholder:100

API Usage:
  Google Image searches:  1650
  Failed searches:        123
```

## Troubleshooting

**Error: Missing Supabase configuration**

- Check `.env` file exists and has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Products imported but no images**

- Verify internet connection
- Check Supabase Storage bucket `menu-items` exists and is public
- Script will use placeholder if Google Images search fails

**Want to re-run for failed products only**

- The script skips existing products automatically
- Failed products are logged to `import-errors.json`
- You can filter CSV to only include failed products and re-run

## Safety Features

- ✅ Duplicate prevention by product name (case-insensitive)
- ✅ Skips inactive/deleted products from CSV
- ✅ Safe to run multiple times (won't create duplicates)
- ✅ All operations logged for auditability
- ✅ Batch processing reduces database load

## Notes

- Images are stored in: `menu-items/{category-name}/{product-name}-{timestamp}.jpg`
- Supabase Storage bucket `menu-items` must exist (create manually if needed)
- Google Images crawler parses search results - no API keys needed
- Indian/Nepali food items should have good image matches
- Consider running overnight due to 2-second delay per product (respectful rate limiting)
