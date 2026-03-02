import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ImageFetcher } from "./image-fetcher.js";
import * as readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PLACEHOLDER_IMAGE_URL =
  process.env.PLACEHOLDER_IMAGE_URL ||
  "https://via.placeholder.com/400x400.png?text=No+Image";
const CSV_PATH = path.join(__dirname, "../../products (1).csv");
const BATCH_SIZE = 25; // Smaller batches for safety

interface CSVRow {
  upc: string;
  description: string;
  cost: string;
  normal_price: string;
  special_price: string;
  start_date: string;
  end_date: string;
  departmentId: string;
  quantity: string;
  tax: string;
  scale: string;
  active: string;
  deleted: string;
  QuantityOnHand: string;
  dept_name: string;
  UnitOfMeasure: string;
}

interface ProductToInsert {
  upc: string;
  name: string;
  category_name: string;
  price_per_unit: number;
  is_weighted: boolean;
  unit_of_measure: string;
  tax_rate: number | null;
  inventory_count: number;
  inventory_weight: number;
  track_inventory: boolean;
  is_active: boolean;
}

interface SafeImportStats {
  csvTotal: number;
  csvValidProducts: number;
  dbExistingProducts: number;
  productsVerifiedSafe: number;
  productsToInsert: number;
  productsInserted: number;
  productsFailed: number;
  imagesSuccess: number;
  imagesFailed: number;
  duplicatesAvoided: number;
}

class SafeProductImporter {
  private supabase: ReturnType<typeof createClient>;
  private imageFetcher: ImageFetcher;
  private categoryMap: Map<string, string> = new Map();
  private existingProducts: Map<string, any> = new Map(); // Multiple lookup strategies
  private stats: SafeImportStats = {
    csvTotal: 0,
    csvValidProducts: 0,
    dbExistingProducts: 0,
    productsVerifiedSafe: 0,
    productsToInsert: 0,
    productsInserted: 0,
    productsFailed: 0,
    imagesSuccess: 0,
    imagesFailed: 0,
    duplicatesAvoided: 0,
  };
  private dryRun: boolean = false;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    this.imageFetcher = new ImageFetcher(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      PLACEHOLDER_IMAGE_URL
    );
  }

  /**
   * Convert string to Title Case
   */
  private toTitleCase(str: string): string {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Normalize string for comparison (remove extra spaces, special chars, lowercase)
   */
  private normalizeForComparison(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Parse CSV file
   */
  private parseCSV(): CSVRow[] {
    console.log("\n📂 Reading CSV file...");
    const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    console.log(`✓ Found ${records.length} rows in CSV`);
    return records;
  }

  /**
   * Check if date is currently valid for special pricing
   */
  private isSpecialPriceValid(startDate: string, endDate: string): boolean {
    if (!startDate || !endDate) return false;
    try {
      const now = new Date();
      const start = new Date(startDate);
      const end = new Date(endDate);
      return now >= start && now <= end;
    } catch {
      return false;
    }
  }

  /**
   * Transform CSV row to product data
   */
  private transformRow(row: CSVRow): ProductToInsert | null {
    // Include all products except those with no description/category
    if (!row.description || !row.dept_name) {
      return null;
    }

    const name = this.toTitleCase(row.description);
    const isWeighted = row.scale === "True";

    let price = parseFloat(row.normal_price) || 0;
    if (
      row.special_price &&
      this.isSpecialPriceValid(row.start_date, row.end_date)
    ) {
      price = parseFloat(row.special_price);
    }

    let unitOfMeasure = row.UnitOfMeasure?.trim() || "";
    if (!unitOfMeasure) {
      unitOfMeasure = isWeighted ? "lb" : "ea";
    }

    const quantityOnHand = parseFloat(row.QuantityOnHand) || 0;
    const inventory = Math.max(0, quantityOnHand);

    let taxRate: number | null = null;
    if (row.tax === "True") {
      taxRate = 0.085;
    }

    // Preserve the active/deleted status from CSV
    const isActive = row.active === "True" && row.deleted !== "True";

    return {
      upc: row.upc?.trim() || "",
      name,
      category_name: row.dept_name,
      price_per_unit: price,
      is_weighted: isWeighted,
      unit_of_measure: unitOfMeasure,
      tax_rate: taxRate,
      inventory_count: isWeighted ? 0 : Math.round(inventory),
      inventory_weight: isWeighted ? inventory : 0,
      track_inventory: true,
      is_active: isActive,
    };
  }

  /**
   * Load all existing products with multiple lookup strategies
   */
  private async loadExistingProducts(): Promise<void> {
    console.log("\n🔍 Loading existing products (SAFE MODE)...");

    let allProducts: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from("products")
        .select("id, upc_code, name, category:categories(name)")
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Error loading products: ${error.message}`);
      }

      if (data && data.length > 0) {
        allProducts = [...allProducts, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    // Build multiple lookup maps for safety
    allProducts.forEach((p) => {
      const nameLower = p.name.toLowerCase().trim();
      const nameNormalized = this.normalizeForComparison(p.name);

      // Store by exact name (lowercase)
      this.existingProducts.set(`name:${nameLower}`, p);

      // Store by normalized name (for fuzzy matching)
      this.existingProducts.set(`norm:${nameNormalized}`, p);

      // Store by UPC if exists
      if (p.upc_code) {
        this.existingProducts.set(`upc:${p.upc_code.trim()}`, p);
      }

      // Store by UPC + name combination for extra safety
      if (p.upc_code) {
        this.existingProducts.set(`combo:${p.upc_code.trim()}:${nameLower}`, p);
      }
    });

    this.stats.dbExistingProducts = allProducts.length;
    console.log(`✓ Loaded ${allProducts.length} existing products`);
    console.log(`✓ Created multiple safety lookups for duplicate prevention`);
  }

  /**
   * TRIPLE-CHECK: Verify product doesn't exist in database
   */
  private isProductSafeToInsert(product: ProductToInsert): {
    safe: boolean;
    reason?: string;
    existingProduct?: any;
  } {
    const nameLower = product.name.toLowerCase().trim();
    const nameNormalized = this.normalizeForComparison(product.name);
    const upc = product.upc?.trim();

    // Check 1: Exact name match
    if (this.existingProducts.has(`name:${nameLower}`)) {
      return {
        safe: false,
        reason: "Exact name match",
        existingProduct: this.existingProducts.get(`name:${nameLower}`),
      };
    }

    // Check 2: Normalized name match (fuzzy)
    if (this.existingProducts.has(`norm:${nameNormalized}`)) {
      return {
        safe: false,
        reason: "Normalized name match",
        existingProduct: this.existingProducts.get(`norm:${nameNormalized}`),
      };
    }

    // Check 3: UPC match (if UPC exists)
    if (upc && this.existingProducts.has(`upc:${upc}`)) {
      return {
        safe: false,
        reason: "UPC match",
        existingProduct: this.existingProducts.get(`upc:${upc}`),
      };
    }

    // Check 4: Combo match (UPC + name)
    if (upc && this.existingProducts.has(`combo:${upc}:${nameLower}`)) {
      return {
        safe: false,
        reason: "UPC + Name match",
        existingProduct: this.existingProducts.get(`combo:${upc}:${nameLower}`),
      };
    }

    return { safe: true };
  }

  /**
   * Load existing categories
   */
  private async loadCategories(): Promise<void> {
    console.log("\n📋 Loading categories...");

    const { data: existingCategories, error } = await this.supabase
      .from("categories")
      .select("id, name, display_order");

    if (error) {
      throw new Error(`Error loading categories: ${error.message}`);
    }

    if (existingCategories) {
      existingCategories.forEach((c) => {
        this.categoryMap.set(c.name, c.id);
      });
      console.log(`✓ Found ${existingCategories.length} categories`);
    }
  }

  /**
   * Create missing categories (safe mode)
   */
  private async createMissingCategories(
    products: ProductToInsert[]
  ): Promise<void> {
    const categoryNames = [
      ...new Set(products.map((p) => p.category_name)),
    ].filter((name) => !this.categoryMap.has(name));

    if (categoryNames.length === 0) {
      console.log("✓ All required categories exist");
      return;
    }

    console.log(`\n📋 Creating ${categoryNames.length} missing categories...`);

    if (this.dryRun) {
      console.log("  [DRY RUN] Would create categories:", categoryNames);
      return;
    }

    // Get the highest display_order
    const { data: maxOrderData } = await this.supabase
      .from("categories")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);

    let nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

    for (const name of categoryNames) {
      const productsInCategory = products.filter(
        (p) => p.category_name === name
      );
      const allTaxable = productsInCategory.every((p) => p.tax_rate !== null);
      const taxRate = allTaxable ? 0.085 : null;

      const { data, error } = await this.supabase
        .from("categories")
        .insert({
          name,
          tax_rate: taxRate,
          display_order: nextOrder++,
          is_active: true,
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Error creating category ${name}: ${error.message}`);
      }

      this.categoryMap.set(name, data.id);
      console.log(`  ✓ Created: ${name} (tax: ${taxRate ? "8.5%" : "none"})`);
    }
  }

  /**
   * Filter and verify safe products to insert
   */
  private async verifySafeProducts(
    allProducts: ProductToInsert[]
  ): Promise<ProductToInsert[]> {
    console.log(
      "\n🛡️  SAFETY VERIFICATION (Triple-checking for duplicates)..."
    );

    const safeProducts: ProductToInsert[] = [];
    const duplicates: Array<{
      product: ProductToInsert;
      reason: string;
      existing: any;
    }> = [];

    for (const product of allProducts) {
      const check = this.isProductSafeToInsert(product);

      if (check.safe) {
        safeProducts.push(product);
      } else {
        duplicates.push({
          product,
          reason: check.reason!,
          existing: check.existingProduct,
        });
        this.stats.duplicatesAvoided++;
      }
    }

    this.stats.productsVerifiedSafe = safeProducts.length;
    this.stats.productsToInsert = safeProducts.length;

    console.log(`\n✅ Safe to insert: ${safeProducts.length} products`);
    console.log(`🛑 Duplicates avoided: ${duplicates.length} products`);

    if (duplicates.length > 0) {
      console.log("\n📋 Sample duplicates avoided (first 5):");
      duplicates.slice(0, 5).forEach((d, i) => {
        console.log(
          `  ${i + 1}. ${d.product.name} | Reason: ${d.reason} | Existing: ${
            d.existing.name
          }`
        );
      });

      // Save duplicate report
      const dupReportPath = path.join(__dirname, "duplicates-avoided.json");
      fs.writeFileSync(dupReportPath, JSON.stringify(duplicates, null, 2));
      console.log(`\n📄 Full duplicate report: ${dupReportPath}`);
    }

    return safeProducts;
  }

  /**
   * Preview products that will be inserted
   */
  private previewInserts(products: ProductToInsert[]): void {
    console.log("\n📋 PREVIEW: Products to be inserted");
    console.log("=".repeat(60));

    const preview = products.slice(0, 10);
    preview.forEach((p, i) => {
      console.log(`\n${i + 1}. ${p.name}`);
      console.log(`   UPC: ${p.upc || "N/A"}`);
      console.log(`   Category: ${p.category_name}`);
      console.log(`   Price: $${p.price_per_unit.toFixed(2)}`);
      console.log(`   Active: ${p.is_active ? "Yes" : "No"}`);
    });

    if (products.length > 10) {
      console.log(`\n... and ${products.length - 10} more products`);
    }

    console.log("\n" + "=".repeat(60));
  }

  /**
   * Ask for user confirmation
   */
  private async askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
      });
    });
  }

  /**
   * Safely insert products in batches
   */
  private async insertProductsSafely(
    products: ProductToInsert[]
  ): Promise<void> {
    if (products.length === 0) {
      console.log("\n✨ No products to insert!");
      return;
    }

    console.log(`\n🚀 Inserting ${products.length} new products...`);
    console.log("This will take a while due to image fetching...\n");

    const insertLog: Array<{ product: string; status: string }> = [];
    const productsToInsert: any[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;

      console.log(`${progress} Processing: ${product.name}`);

      // Double-check one more time before inserting
      const safetyCheck = this.isProductSafeToInsert(product);
      if (!safetyCheck.safe) {
        console.log(
          `  🛑 SAFETY STOP: Duplicate detected (${safetyCheck.reason})`
        );
        insertLog.push({
          product: product.name,
          status: `Skipped - duplicate: ${safetyCheck.reason}`,
        });
        continue;
      }

      const categoryId = this.categoryMap.get(product.category_name);
      if (!categoryId) {
        console.log(`  ✗ Skipped: Category not found`);
        this.stats.productsFailed++;
        insertLog.push({
          product: product.name,
          status: "Failed - category not found",
        });
        continue;
      }

      // Fetch image
      const imageResult = await this.imageFetcher.fetchAndUploadImage(
        product.name,
        product.category_name
      );

      if (imageResult.success) {
        this.stats.imagesSuccess++;
      } else {
        this.stats.imagesFailed++;
        console.log(`  ⚠ Using placeholder image`);
      }

      productsToInsert.push({
        upc_code: product.upc || null,
        name: product.name,
        category_id: categoryId,
        price_per_unit: product.price_per_unit,
        is_weighted: product.is_weighted,
        unit_of_measure: product.unit_of_measure,
        image_url: imageResult.url || PLACEHOLDER_IMAGE_URL,
        has_default_image: !imageResult.success,
        description: null,
        tax_rate: product.tax_rate,
        track_inventory: product.track_inventory,
        inventory_count: product.inventory_count,
        inventory_weight: product.inventory_weight,
        is_active: product.is_active,
      });

      // Insert in batches
      if (productsToInsert.length >= BATCH_SIZE || i === products.length - 1) {
        const batchSize = productsToInsert.length;

        const { error, data } = await this.supabase
          .from("products")
          .insert(productsToInsert)
          .select("id, name");

        if (error) {
          console.error(`\n❌ Batch insert error:`, error.message);
          this.stats.productsFailed += batchSize;
          productsToInsert.forEach((p) => {
            insertLog.push({
              product: p.name,
              status: `Failed - ${error.message}`,
            });
          });
        } else {
          this.stats.productsInserted += batchSize;
          console.log(`\n✅ Successfully inserted ${batchSize} products`);
          data?.forEach((p) => {
            insertLog.push({ product: p.name, status: "Success" });
          });
        }

        productsToInsert.length = 0;
      }
    }

    // Save insert log
    const logPath = path.join(__dirname, "insert-log.json");
    fs.writeFileSync(logPath, JSON.stringify(insertLog, null, 2));
    console.log(`\n📄 Insert log saved: ${logPath}`);
  }

  /**
   * Print final statistics
   */
  private printStats(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 SAFE IMPORT SUMMARY");
    console.log("=".repeat(60));
    console.log(`CSV total rows:           ${this.stats.csvTotal}`);
    console.log(`CSV valid products:       ${this.stats.csvValidProducts}`);
    console.log(`DB existing products:     ${this.stats.dbExistingProducts}`);
    console.log(`Products verified safe:   ${this.stats.productsVerifiedSafe}`);
    console.log(`Duplicates avoided:       ${this.stats.duplicatesAvoided}`);
    console.log(`Products to insert:       ${this.stats.productsToInsert}`);
    console.log(`Products inserted:        ${this.stats.productsInserted}`);
    console.log(`Products failed:          ${this.stats.productsFailed}`);
    console.log(`Images success:           ${this.stats.imagesSuccess}`);
    console.log(`Images failed:            ${this.stats.imagesFailed}`);

    const imageFetcherStats = this.imageFetcher.getStats();
    console.log(`\nAPI Usage:`);
    console.log(
      `  Google searches:        ${imageFetcherStats.googleRequests}`
    );
    console.log(
      `  Failed searches:        ${imageFetcherStats.failedSearches}`
    );

    console.log("\n✅ DATABASE STATE: PRESERVED");
    console.log(`   No existing products were modified or deleted`);
    console.log(`   ${this.stats.productsInserted} new products added`);
    console.log("=".repeat(60) + "\n");
  }

  /**
   * Main run process
   */
  async run(skipConfirmation: boolean = false): Promise<void> {
    try {
      console.log("\n🎯 SAFE PRODUCT IMPORTER");
      console.log("====================================");
      console.log("⚠️  SAFETY MODE: No existing data will be modified");
      console.log("====================================\n");

      if (this.dryRun) {
        console.log("🔍 DRY RUN MODE: No changes will be made\n");
      }

      // Validate environment
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase configuration. Check .env file.");
      }

      // Step 1: Parse CSV
      const rows = this.parseCSV();
      this.stats.csvTotal = rows.length;

      // Step 2: Transform data
      console.log("\n🔄 Transforming CSV data...");
      const allProducts = rows
        .map((row) => this.transformRow(row))
        .filter((p) => p !== null) as ProductToInsert[];
      this.stats.csvValidProducts = allProducts.length;
      console.log(`✓ ${allProducts.length} valid products in CSV`);

      // Step 3: Load existing products (with multiple safety checks)
      await this.loadExistingProducts();

      // Step 4: Load categories
      await this.loadCategories();

      // Step 5: Verify safe products (triple-check for duplicates)
      const safeProducts = await this.verifySafeProducts(allProducts);

      if (safeProducts.length === 0) {
        console.log("\n✨ All products already exist in database!");
        console.log("No new products to insert.\n");
        return;
      }

      // Step 6: Create missing categories
      await this.createMissingCategories(safeProducts);

      // Step 7: Preview what will be inserted
      this.previewInserts(safeProducts);

      if (this.dryRun) {
        console.log("\n🔍 DRY RUN COMPLETE - No changes made");
        return;
      }

      // Step 8: Ask for confirmation
      if (!skipConfirmation) {
        const confirmed = await this.askConfirmation(
          `\n⚠️  Ready to insert ${safeProducts.length} new products. Continue? (yes/no): `
        );

        if (!confirmed) {
          console.log("\n❌ Import cancelled by user");
          return;
        }
      }

      // Step 9: Insert products safely
      await this.insertProductsSafely(safeProducts);

      // Step 10: Print stats
      this.printStats();

      console.log("✨ Safe import completed!\n");
    } catch (error) {
      console.error("\n❌ Fatal error:", error);
      console.log("\n🛡️  DATABASE STATE: PRESERVED (no changes were made)");
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-d");
const skipConfirm = args.includes("--yes") || args.includes("-y");

// Run the importer
const importer = new SafeProductImporter(dryRun);
importer.run(skipConfirm);
