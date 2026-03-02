# 🎯 PRODUCT IMPORT - SETUP COMPLETE!

## ✅ What's Been Created

```
supabase/scripts/
├── package.json              # Dependencies configuration
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment template
├── .env                     # Your environment file (EDIT THIS!)
├── README.md                # Full documentation
├── start-import.sh          # Quick start script
├── import-products.ts       # Main import script
├── image-fetcher.ts         # Google Images crawler
└── clear-bucket.ts          # Utility to clear storage bucket
```

## 🚀 Next Steps

### 1. Configure Your Credentials

Edit `supabase/scripts/.env` with your actual values:

```bash
cd supabase/scripts
nano .env  # or use your preferred editor
```

**Required:**

- `SUPABASE_URL` - From Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Dashboard → Settings → API

**Optional:**

- `PLACEHOLDER_IMAGE_URL` - Default image when search fails

**That's it!** No API keys needed - the script uses Google Images search automatically.

**Option A: Quick Start (Recommended)**

```bash
cd supabase/scripts
./start-import.sh
```

**Option B: Direct Run**

```bash
cd supabase/scripts
npm run import
```

## 📊 What the Script Does

1. ✅ Reads `products (1).csv` from project root
2. ✅ Transforms data:
   - Converts names to Title Case
   - Calculates prices (special vs normal)
   - Determines inventory based on weighted/count
   - Sets tax rates (8.5% if taxable)
3. ✅ Creates categories from `dept_name`
4. ✅ For each product:
   - Checks for duplicates (skips if exists)
   - Searches Google Images for "{product name} food"
   - Downloads and uploads to Supabase Storage
   - Inserts product into database
5. ✅ Generates summary report

## ⏱️ Expected Runtime

- **Without image fetching**: ~2 minutes
- **With image fetching**: ~1-2 hours (1773 products × 2s delay)

The script uses rate limiting to be respectful to Google.

## 🛡️ Safety Features

- ✅ **Duplicate Prevention**: Checks existing products by name
- ✅ **Safe Re-run**: Won't create duplicates if run multiple times
- ✅ **Error Logging**: Saves failed items to `import-errors.json`
- ✅ **Batch Processing**: Inserts 50 products at a time
- ✅ **Progress Tracking**: Shows real-time progress

## 📋 Data Mapping

| CSV Field                        | →   | Database Field                          |
| -------------------------------- | --- | --------------------------------------- |
| `description`                    | →   | `name` (Title Case)                     |
| `dept_name`                      | →   | `category_id`                           |
| `normal_price` / `special_price` | →   | `price_per_unit`                        |
| `scale` (True/False)             | →   | `is_weighted`                           |
| `QuantityOnHand`                 | →   | `inventory_count` or `inventory_weight` |
| `tax` (True/False)               | →   | `tax_rate` (0.085 or null)              |
| Google Images search             | →   | `image_url`                             |

## 🔍 Monitoring Progress

The script prints detailed logs:

```
[150/1773] Processing: Tandoori Chicken
    🔍 Searching Google Images: "Tandoori Chicken food"
    ✓ Found image URL
    ✓ Uploaded to Supabase Storage

✅ Batch inserted 50 products
```

## 📊 Final Report

After completion, you'll see:

```
📊 IMPORT SUMMARY
============================================================
Total rows processed:     1773
Categories created:       5
Products imported:        1650
Products skipped (dupe):  0
Images fetched success:   1550
Images failed:            100
============================================================
```

## 🚨 Troubleshooting

**"Missing Supabase configuration"**

- Check `.env` file has correct SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

**"CSV file not found"**

- Make sure `products (1).csv` is in the project root (not in supabase/scripts/)

**Images not downloading**

- Verify internet connection
- Check Supabase Storage bucket `menu-items` exists
- Script will use placeholder if Google Images search fails

**Want to stop and resume later?**

- Press `Ctrl+C` to stop
- When you restart, it will skip already imported products

**Clear images and start fresh?**

- Run `npm run clear-bucket` to delete all images from `menu-items` bucket
- Then run import again

## 📞 Questions?

Check the full documentation in `README.md` or review the error log at `import-errors.json` after running.

---

**Ready to import? Run:** `./start-import.sh` 🚀
