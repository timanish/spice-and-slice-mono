import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ImageFetcher } from "./image-fetcher.js";

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
const BATCH_SIZE = 50;

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

interface TransformedProduct {
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

interface ImportStats {
  totalRows: number;
  skippedInactive: number;
  skippedDeleted: number;
  categoriesCreated: number;
  productsImported: number;
  productsFailed: number;
  productsSkipped: number;
  imagesSuccess: number;
  imagesFailed: number;
  errors: Array<{ product: string; error: string }>;
}

class ProductImporter {
  private supabase: ReturnType<typeof createClient>;
  private imageFetcher: ImageFetcher;
  private categoryMap: Map<string, string> = new Map(); // dept_name -> category_id
  private existingProducts: Set<string> = new Set(); // product names (lowercase)
  private stats: ImportStats = {
    totalRows: 0,
    skippedInactive: 0,
    skippedDeleted: 0,
    categoriesCreated: 0,
    productsImported: 0,
    productsFailed: 0,
    productsSkipped: 0,
    imagesSuccess: 0,
    imagesFailed: 0,
    errors: [],
  };

  constructor() {
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
  private transformRow(row: CSVRow): TransformedProduct | null {
    if (row.deleted === "True" || row.active === "False") {
      if (row.deleted === "True") this.stats.skippedDeleted++;
      if (row.active === "False") this.stats.skippedInactive++;
      return null;
    }

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
    const inventory = Math.max(0, quantityOnHand); // Convert negative to 0

    let taxRate: number | null = null;
    if (row.tax === "True") {
      taxRate = 0.085; // 8.5% default
    }

    return {
      upc: row.upc,
      name,
      category_name: row.dept_name,
      price_per_unit: price,
      is_weighted: isWeighted,
      unit_of_measure: unitOfMeasure,
      tax_rate: taxRate,
      inventory_count: isWeighted ? 0 : Math.round(inventory),
      inventory_weight: isWeighted ? inventory : 0,
      track_inventory: true,
      is_active: true,
    };
  }

  /**
   * Load existing products to prevent duplicates
   */
  private async loadExistingProducts(): Promise<void> {
    console.log("\n🔍 Checking for existing products...");
    const { data, error } = await this.supabase.from("products").select("name");

    if (error) {
      console.error("Error loading existing products:", error);
      return;
    }

    if (data) {
      data.forEach((p) => this.existingProducts.add(p.name.toLowerCase()));
      console.log(`✓ Found ${data.length} existing products`);
    }
  }

  /**
   * Create or get categories
   */
  private async setupCategories(products: TransformedProduct[]): Promise<void> {
    console.log("\n📋 Setting up categories...");

    const categoryNames = [...new Set(products.map((p) => p.category_name))];
    console.log(
      `Found ${categoryNames.length} unique categories:`,
      categoryNames
    );

    const { data: existingCategories } = await this.supabase
      .from("categories")
      .select("id, name");

    const existingMap = new Map(
      existingCategories?.map((c) => [c.name, c.id]) || []
    );

    for (let i = 0; i < categoryNames.length; i++) {
      const name = categoryNames[i];

      if (existingMap.has(name)) {
        this.categoryMap.set(name, existingMap.get(name)!);
        console.log(`  ✓ Category exists: ${name}`);
      } else {
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
            display_order: i + 1,
            is_active: true,
          })
          .select("id")
          .single();

        if (error) {
          console.error(`  ✗ Error creating category ${name}:`, error);
          continue;
        }

        this.categoryMap.set(name, data.id);
        this.stats.categoriesCreated++;
        console.log(
          `  ✓ Created category: ${name} (tax: ${taxRate ? "8.5%" : "none"})`
        );
      }
    }
  }

  /**
   * Import products in batches
   */
  private async importProducts(products: TransformedProduct[]): Promise<void> {
    console.log(
      `\n🚀 Starting product import (${products.length} products)...`
    );
    console.log("This will take a while due to image fetching...\n");

    const productsToInsert: any[] = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const progress = `[${i + 1}/${products.length}]`;

      console.log(`${progress} Processing: ${product.name}`);

      // Check for duplicates
      if (this.existingProducts.has(product.name.toLowerCase())) {
        console.log(`  ⏭  Skipped: Already exists`);
        this.stats.productsSkipped++;
        continue;
      }

      const categoryId = this.categoryMap.get(product.category_name);
      if (!categoryId) {
        console.log(`  ✗ Skipped: Category not found`);
        this.stats.productsFailed++;
        this.stats.errors.push({
          product: product.name,
          error: "Category not found",
        });
        continue;
      }

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
        name: product.name,
        category_id: categoryId,
        price_per_unit: product.price_per_unit,
        is_weighted: product.is_weighted,
        unit_of_measure: product.unit_of_measure,
        image_url: imageResult.url || PLACEHOLDER_IMAGE_URL,
        has_default_image: !imageResult.success,
        description: null, // Made optional as requested
        tax_rate: product.tax_rate,
        track_inventory: product.track_inventory,
        inventory_count: product.inventory_count,
        inventory_weight: product.inventory_weight,
        is_active: product.is_active,
      });

      if (productsToInsert.length >= BATCH_SIZE || i === products.length - 1) {
        const { error } = await this.supabase
          .from("products")
          .insert(productsToInsert);

        if (error) {
          console.error(`\n❌ Batch insert error:`, error);
          this.stats.productsFailed += productsToInsert.length;
          productsToInsert.forEach((p) => {
            this.stats.errors.push({
              product: p.name,
              error: error.message,
            });
          });
        } else {
          this.stats.productsImported += productsToInsert.length;
          console.log(
            `\n✅ Batch inserted ${productsToInsert.length} products\n`
          );
        }

        productsToInsert.length = 0; 
      }
    }
  }

  /**
   * Print final statistics
   */
  private printStats(): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 IMPORT SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total rows processed:     ${this.stats.totalRows}`);
    console.log(`Skipped (inactive):       ${this.stats.skippedInactive}`);
    console.log(`Skipped (deleted):        ${this.stats.skippedDeleted}`);
    console.log(`Categories created:       ${this.stats.categoriesCreated}`);
    console.log(`Products imported:        ${this.stats.productsImported}`);
    console.log(`Products skipped (dupe):  ${this.stats.productsSkipped}`);
    console.log(`Products failed:          ${this.stats.productsFailed}`);
    console.log(`Images fetched success:   ${this.stats.imagesSuccess}`);
    console.log(`Images failed/placeholder:${this.stats.imagesFailed}`);

    const imageFetcherStats = this.imageFetcher.getStats();
    console.log(`\nAPI Usage:`);
    console.log(
      `  Google Image searches:  ${imageFetcherStats.googleRequests}`
    );
    console.log(
      `  Failed searches:        ${imageFetcherStats.failedSearches}`
    );

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 10).forEach((e) => {
        console.log(`  - ${e.product}: ${e.error}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`  ... and ${this.stats.errors.length - 10} more`);
      }

      // Save full error log
      const errorLogPath = path.join(__dirname, "import-errors.json");
      fs.writeFileSync(
        errorLogPath,
        JSON.stringify(this.stats.errors, null, 2)
      );
      console.log(`\n📝 Full error log saved to: ${errorLogPath}`);
    }

    console.log("=".repeat(60) + "\n");
  }

  /**
   * Main import process
   */
  async run(): Promise<void> {
    try {
      console.log("\n🎯 Starting Product Import Process");
      console.log("====================================\n");

      // Validate environment
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase configuration. Check .env file.");
      }

      // Step 1: Parse CSV
      const rows = this.parseCSV();
      this.stats.totalRows = rows.length;

      // Step 2: Transform data
      console.log("\n🔄 Transforming data...");
      const products = rows
        .map((row) => this.transformRow(row))
        .filter((p) => p !== null) as TransformedProduct[];
      console.log(`✓ ${products.length} products ready for import`);

      // Step 3: Load existing products
      await this.loadExistingProducts();

      // Step 4: Setup categories
      await this.setupCategories(products);

      // Step 5: Import products with images
      await this.importProducts(products);

      // Step 6: Print stats
      this.printStats();

      console.log("✨ Import process completed!\n");
    } catch (error) {
      console.error("\n❌ Fatal error during import:", error);
      process.exit(1);
    }
  }
}

const importer = new ProductImporter();
importer.run();
