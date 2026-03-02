import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CSV_PATH = path.join(__dirname, "../../products (1).csv");

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

interface CSVProduct {
  upc: string;
  name: string;
  category: string;
  isActive: boolean;
  isDeleted: boolean;
}

interface DBProduct {
  upc_code: string | null;
  name: string;
  category_name: string | null;
}

class ProductIdentifier {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
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
   * Parse CSV file - include ALL products
   */
  private parseCSV(): CSVProduct[] {
    console.log("\n📂 Reading CSV file...");
    const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRow[];

    console.log(`✓ Found ${records.length} rows in CSV`);

    const products = records
      .filter((row) => row.description && row.dept_name)
      .map((row) => ({
        upc: row.upc?.trim() || "",
        name: this.toTitleCase(row.description),
        category: row.dept_name,
        isActive: row.active === "True",
        isDeleted: row.deleted === "True",
      }));

    console.log(`✓ Parsed ${products.length} products from CSV`);
    return products;
  }

  /**
   * Load all products from database
   */
  private async loadDatabaseProducts(): Promise<DBProduct[]> {
    console.log("\n🔍 Loading products from database...");

    let allProducts: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase
        .from("products")
        .select(
          `
          upc_code,
          name,
          category:categories(name)
        `
        )
        .range(from, from + pageSize - 1);

      if (error) {
        console.error("Error loading products:", error);
        throw error;
      }

      if (data && data.length > 0) {
        allProducts = [...allProducts, ...data];
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const products = allProducts.map((p) => ({
      upc_code: p.upc_code?.trim() || null,
      name: p.name.trim(),
      category_name: p.category?.name || null,
    }));

    console.log(`✓ Found ${products.length} products in database`);
    return products;
  }

  /**
   * Compare and identify missing products
   */
  private compareProducts(
    csvProducts: CSVProduct[],
    dbProducts: DBProduct[]
  ): void {
    console.log("\n🔎 Comparing CSV vs Database...\n");

    // Build lookup maps for database products
    const dbByUPC = new Map<string, DBProduct>();
    const dbByName = new Map<string, DBProduct>();

    let dbWithUPC = 0;
    let dbWithoutUPC = 0;

    dbProducts.forEach((p) => {
      const nameLower = p.name.toLowerCase();
      dbByName.set(nameLower, p);

      if (p.upc_code) {
        dbByUPC.set(p.upc_code, p);
        dbWithUPC++;
      } else {
        dbWithoutUPC++;
      }
    });

    console.log("Database Analysis:");
    console.log(`  Total products: ${dbProducts.length}`);
    console.log(`  With UPC: ${dbWithUPC}`);
    console.log(`  Without UPC: ${dbWithoutUPC}`);

    // Analyze CSV products
    let csvWithUPC = 0;
    let csvWithoutUPC = 0;
    let csvActive = 0;
    let csvInactive = 0;
    let csvDeleted = 0;

    csvProducts.forEach((p) => {
      if (p.upc) csvWithUPC++;
      else csvWithoutUPC++;
      if (p.isActive) csvActive++;
      else csvInactive++;
      if (p.isDeleted) csvDeleted++;
    });

    console.log("\nCSV Analysis:");
    console.log(`  Total products: ${csvProducts.length}`);
    console.log(`  With UPC: ${csvWithUPC}`);
    console.log(`  Without UPC: ${csvWithoutUPC}`);
    console.log(`  Active: ${csvActive}`);
    console.log(`  Inactive: ${csvInactive}`);
    console.log(`  Deleted: ${csvDeleted}`);

    // Find missing products
    const missingProducts: (CSVProduct & { reason: string })[] = [];
    const foundByUPC: CSVProduct[] = [];
    const foundByName: CSVProduct[] = [];

    csvProducts.forEach((csvProduct) => {
      let found = false;
      let foundBy = "";

      // Try to match by UPC first
      if (csvProduct.upc && dbByUPC.has(csvProduct.upc)) {
        found = true;
        foundBy = "UPC";
        foundByUPC.push(csvProduct);
      }
      // Try to match by name
      else if (dbByName.has(csvProduct.name.toLowerCase())) {
        found = true;
        foundBy = "Name";
        foundByName.push(csvProduct);
      }

      if (!found) {
        missingProducts.push({
          ...csvProduct,
          reason: csvProduct.upc ? "Not found by UPC or Name" : "No UPC, not found by Name",
        });
      }
    });

    console.log("\n📊 Match Results:");
    console.log(`  Found by UPC: ${foundByUPC.length}`);
    console.log(`  Found by Name only: ${foundByName.length}`);
    console.log(`  Missing: ${missingProducts.length}`);

    // Categorize missing products
    const missingActive = missingProducts.filter((p) => p.isActive && !p.isDeleted);
    const missingInactive = missingProducts.filter((p) => !p.isActive && !p.isDeleted);
    const missingDeleted = missingProducts.filter((p) => p.isDeleted);
    const missingWithUPC = missingProducts.filter((p) => p.upc);
    const missingWithoutUPC = missingProducts.filter((p) => !p.upc);

    console.log("\n📋 Missing Products Breakdown:");
    console.log(`  Active (not deleted): ${missingActive.length}`);
    console.log(`  Inactive (not deleted): ${missingInactive.length}`);
    console.log(`  Deleted: ${missingDeleted.length}`);
    console.log(`  With UPC: ${missingWithUPC.length}`);
    console.log(`  Without UPC: ${missingWithoutUPC.length}`);

    // Show samples
    console.log("\n📝 Sample Missing Products (Active, first 20):");
    missingActive.slice(0, 20).forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.name} | UPC: ${p.upc || "N/A"} | Category: ${p.category}`
      );
    });

    if (missingActive.length > 20) {
      console.log(`  ... and ${missingActive.length - 20} more active products`);
    }

    console.log("\n📝 Sample Missing Products (Deleted, first 10):");
    missingDeleted.slice(0, 10).forEach((p, i) => {
      console.log(
        `  ${i + 1}. ${p.name} | UPC: ${p.upc || "N/A"} | Category: ${p.category}`
      );
    });

    if (missingDeleted.length > 10) {
      console.log(`  ... and ${missingDeleted.length - 10} more deleted products`);
    }

    // Save full report
    const reportPath = path.join(__dirname, "missing-products-report.json");
    const report = {
      summary: {
        csv_total: csvProducts.length,
        db_total: dbProducts.length,
        found_by_upc: foundByUPC.length,
        found_by_name: foundByName.length,
        missing_total: missingProducts.length,
        missing_active: missingActive.length,
        missing_inactive: missingInactive.length,
        missing_deleted: missingDeleted.length,
        missing_with_upc: missingWithUPC.length,
        missing_without_upc: missingWithoutUPC.length,
      },
      missing_products: {
        active: missingActive,
        inactive: missingInactive,
        deleted: missingDeleted,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);

    // Math check
    console.log("\n🔢 Math Check:");
    console.log(
      `  CSV (${csvProducts.length}) = DB (${dbProducts.length}) + Missing (${missingProducts.length})`
    );
    console.log(
      `  Expected missing: ${csvProducts.length - dbProducts.length}`
    );
    console.log(`  Actual missing: ${missingProducts.length}`);
    console.log(
      `  Difference: ${missingProducts.length - (csvProducts.length - dbProducts.length)}`
    );
  }

  /**
   * Main run process
   */
  async run(): Promise<void> {
    try {
      console.log("\n🎯 Product Identification Report");
      console.log("====================================\n");

      // Validate environment
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase configuration. Check .env file.");
      }

      // Step 1: Parse CSV
      const csvProducts = this.parseCSV();

      // Step 2: Load database products
      const dbProducts = await this.loadDatabaseProducts();

      // Step 3: Compare and report
      this.compareProducts(csvProducts, dbProducts);

      console.log("\n✨ Identification complete!\n");
    } catch (error) {
      console.error("\n❌ Fatal error:", error);
      process.exit(1);
    }
  }
}

// Run the identifier
const identifier = new ProductIdentifier();
identifier.run();