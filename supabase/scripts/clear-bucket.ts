import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function clearBucket() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("🗑️  Clearing menu-items bucket...\n");

  try {
    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from("menu-items")
      .list("", {
        limit: 1000,
        offset: 0,
      });

    if (listError) {
      console.error("Error listing files:", listError);
      return;
    }

    if (!files || files.length === 0) {
      console.log("✓ Bucket is already empty");
      return;
    }

    console.log(`Found ${files.length} folders/files to delete\n`);

    // Delete all folders (this will delete all contents recursively)
    for (const file of files) {
      if (file.name) {
        console.log(`Deleting: ${file.name}`);

        // List all files in the folder
        const { data: folderFiles, error: folderListError } =
          await supabase.storage.from("menu-items").list(file.name, {
            limit: 1000,
          });

        if (folderListError) {
          console.error(`Error listing folder ${file.name}:`, folderListError);
          continue;
        }

        if (folderFiles && folderFiles.length > 0) {
          // Delete all files in the folder
          const filePaths = folderFiles.map((f) => `${file.name}/${f.name}`);
          const { error: deleteError } = await supabase.storage
            .from("menu-items")
            .remove(filePaths);

          if (deleteError) {
            console.error(`Error deleting files in ${file.name}:`, deleteError);
          } else {
            console.log(`  ✓ Deleted ${filePaths.length} files`);
          }
        }
      }
    }

    console.log("\n✅ Bucket cleared successfully!\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

clearBucket();
