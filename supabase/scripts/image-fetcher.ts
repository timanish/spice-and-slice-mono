import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

interface ImageFetchResult {
  success: boolean;
  url?: string;
  error?: string;
  source?: "google" | "placeholder";
}

export class ImageFetcher {
  private supabase: ReturnType<typeof createClient>;
  private placeholderUrl: string;
  private requestCount = 0;
  private failedSearches = new Set<string>();
  private rateLimitDelay = 2000; // 2 seconds between requests to avoid blocking
  private userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    placeholderUrl: string
  ) {
    this.placeholderUrl = placeholderUrl;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Sanitize filename for storage
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch image from Google Images search
   */
  private async fetchFromGoogle(searchQuery: string): Promise<string | null> {
    try {
      this.requestCount++;

      // Build Google Images search URL
      const encodedQuery = encodeURIComponent(searchQuery);
      const searchUrl = `https://www.google.com/search?q=${encodedQuery}&tbm=isch`;

      console.log(`    🔍 Searching Google Images: "${searchQuery}"`);

      // Fetch the Google Images page
      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": this.userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        timeout: 10000,
      });

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Google Images stores image URLs in various ways. Try multiple methods:

      // Method 1: Look for img tags with specific class
      let imageUrl = $('img[class*="rg_i"]').first().attr("src");

      // Method 2: Look for any img tag with a valid http/https src
      if (!imageUrl || imageUrl.startsWith("data:")) {
        $("img").each((i, elem) => {
          const src = $(elem).attr("src");
          if (
            src &&
            (src.startsWith("http://") || src.startsWith("https://")) &&
            !src.includes("google.com/images/branding")
          ) {
            imageUrl = src;
            return false; // break
          }
        });
      }

      // Method 3: Parse from JSON data in script tags
      if (!imageUrl || imageUrl.startsWith("data:")) {
        const scripts = $("script");
        scripts.each((i, elem) => {
          const scriptContent = $(elem).html() || "";
          // Look for image URLs in JSON data
          const urlMatch = scriptContent.match(
            /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|webp)/i
          );
          if (urlMatch && !urlMatch[0].includes("google.com/images/branding")) {
            imageUrl = urlMatch[0];
            return false; // break
          }
        });
      }

      if (imageUrl && imageUrl.startsWith("http")) {
        console.log(`    ✓ Found image URL`);
        return imageUrl;
      }

      console.log(`    ✗ No valid image found in search results`);
      return null;
    } catch (error: any) {
      console.log(`    ✗ Google search failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(imageUrl: string): Promise<Buffer | null> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        headers: {
          "User-Agent": this.userAgent,
        },
        timeout: 15000,
        maxContentLength: 10 * 1024 * 1024, // 10MB max
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      console.log(`    ✗ Download failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  private async uploadToSupabase(
    imageBuffer: Buffer,
    productName: string,
    categoryName: string
  ): Promise<string | null> {
    try {
      const sanitizedProduct = this.sanitizeFilename(productName);
      const sanitizedCategory = this.sanitizeFilename(categoryName);
      const timestamp = Date.now();
      const fileName = `${sanitizedCategory}/${sanitizedProduct}-${timestamp}.jpg`;
      const bucketName = "menu-items";

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.log(`    ✗ Upload error: ${error.message}`);
        return null;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from(bucketName).getPublicUrl(fileName);

      console.log(`    ✓ Uploaded to Supabase Storage`);
      return publicUrl;
    } catch (error: any) {
      console.log(`    ✗ Upload failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Main method: Fetch and upload image
   */
  async fetchAndUploadImage(
    productName: string,
    categoryName: string
  ): Promise<ImageFetchResult> {
    const cacheKey = productName.toLowerCase();
    if (this.failedSearches.has(cacheKey)) {
      return {
        success: false,
        url: this.placeholderUrl,
        source: "placeholder",
      };
    }

    if (this.requestCount > 0) {
      await this.sleep(this.rateLimitDelay);
    }

    try {
      const searchQuery = `${productName} food`;
      const imageUrl = await this.fetchFromGoogle(searchQuery);

      if (!imageUrl) {
        this.failedSearches.add(cacheKey);
        return {
          success: false,
          url: this.placeholderUrl,
          source: "placeholder",
        };
      }

      const imageBuffer = await this.downloadImage(imageUrl);
      if (!imageBuffer) {
        this.failedSearches.add(cacheKey);
        return {
          success: false,
          url: this.placeholderUrl,
          source: "placeholder",
        };
      }

      const uploadedUrl = await this.uploadToSupabase(
        imageBuffer,
        productName,
        categoryName
      );

      if (!uploadedUrl) {
        this.failedSearches.add(cacheKey);
        return {
          success: false,
          url: this.placeholderUrl,
          source: "placeholder",
        };
      }

      return {
        success: true,
        url: uploadedUrl,
        source: "google",
      };
    } catch (error: any) {
      console.log(`    ✗ Error: ${error.message}`);
      this.failedSearches.add(cacheKey);
      return {
        success: false,
        error: error.message,
        url: this.placeholderUrl,
        source: "placeholder",
      };
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      googleRequests: this.requestCount,
      failedSearches: this.failedSearches.size,
    };
  }
}
