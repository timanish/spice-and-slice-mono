#!/usr/bin/env python3
"""
Batch background removal for product images in Supabase Storage.

Uses rembg (free, local AI model) to remove backgrounds from all active
product images, re-uploads them as PNGs, and updates the product image_url.

Usage:
  pip3 install rembg pillow supabase
  python3 remove-bg.py

Environment variables:
  SUPABASE_URL          - Your Supabase project URL
  SUPABASE_SERVICE_KEY  - Service role key (needed for DB writes + storage)
"""

import os
import sys
import io
import time
import requests
from pathlib import Path
from urllib.parse import urlparse

try:
    from rembg import remove
except ImportError:
    print("rembg not installed. Run: pip3 install rembg[cpu]")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip3 install pillow")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("supabase not installed. Run: pip3 install supabase")
    sys.exit(1)

# --------------- Config ---------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BUCKET = "menu-items"
DRY_RUN = "--dry-run" in sys.argv

# Parse --category flag
CATEGORY_FILTER = None
LIMIT = None
for i, arg in enumerate(sys.argv):
    if arg == "--category" and i + 1 < len(sys.argv):
        CATEGORY_FILTER = sys.argv[i + 1]
    if arg == "--limit" and i + 1 < len(sys.argv):
        LIMIT = int(sys.argv[i + 1])

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.")
    print("Example:")
    print('  export SUPABASE_URL="https://xxx.supabase.co"')
    print('  export SUPABASE_SERVICE_KEY="eyJ..."')
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --------------- Helpers ---------------


def get_active_products():
    """Fetch all active products that have an image_url, optionally filtered by category."""
    query = (
        supabase.table("products")
        .select("id, name, image_url, category_id, categories!inner(name)")
        .eq("is_active", True)
        .not_.is_("image_url", "null")
    )

    if CATEGORY_FILTER:
        query = query.ilike("categories.name", f"%{CATEGORY_FILTER}%")

    result = query.execute()

    # Filter out products that already have bg-removed images
    products = [
        p for p in (result.data or [])
        if p.get("image_url") and "-nobg." not in p["image_url"]
    ]
    return products


def extract_storage_path(image_url):
    """Extract the storage path from a Supabase public URL."""
    # URL format: https://xxx.supabase.co/storage/v1/object/public/menu-items/category/file.jpg
    parsed = urlparse(image_url)
    path = parsed.path
    marker = f"/storage/v1/object/public/{BUCKET}/"
    if marker in path:
        return path.split(marker, 1)[1]
    return None


def download_image(image_url):
    """Download image from URL and return bytes."""
    resp = requests.get(image_url, timeout=30)
    resp.raise_for_status()
    return resp.content


def remove_background(image_bytes):
    """Remove background using rembg and return PNG bytes."""
    output = remove(image_bytes)
    # Ensure output is PNG with transparency
    img = Image.open(io.BytesIO(output)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def upload_to_supabase(png_bytes, storage_path):
    """Upload the processed image to Supabase Storage."""
    # Create new filename with -nobg suffix
    path_obj = Path(storage_path)
    new_name = f"{path_obj.stem}-nobg.png"
    new_path = str(path_obj.parent / new_name)

    supabase.storage.from_(BUCKET).upload(
        new_path,
        png_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )

    # Get public URL
    public_url = supabase.storage.from_(BUCKET).get_public_url(new_path)
    return public_url


def update_product_image(product_id, new_url):
    """Update the product's image_url in the database."""
    supabase.table("products").update({"image_url": new_url}).eq(
        "id", product_id
    ).execute()


# --------------- Main ---------------


def main():
    print(f"{'[DRY RUN] ' if DRY_RUN else ''}Batch Background Removal")
    print(f"Supabase: {SUPABASE_URL}")
    print(f"Bucket: {BUCKET}")
    if CATEGORY_FILTER:
        print(f"Category: {CATEGORY_FILTER}")
    if LIMIT:
        print(f"Limit: {LIMIT}")
    print()

    products = get_active_products()
    print(f"Found {len(products)} active products with images to process.\n")

    if not products:
        print("Nothing to do.")
        return

    if LIMIT:
        products = products[:LIMIT]
        print(f"Processing first {len(products)} product(s).\n")

    success = 0
    skipped = 0
    failed = 0

    for i, product in enumerate(products, 1):
        name = product["name"]
        image_url = product["image_url"]
        product_id = product["id"]

        print(f"[{i}/{len(products)}] {name}")
        print(f"  Source: {image_url}")

        storage_path = extract_storage_path(image_url)
        if not storage_path:
            print("  SKIP: Could not parse storage path from URL")
            skipped += 1
            continue

        if DRY_RUN:
            print("  DRY RUN: Would process this image")
            success += 1
            continue

        try:
            # Download
            print("  Downloading...", end=" ", flush=True)
            img_bytes = download_image(image_url)
            print(f"({len(img_bytes) // 1024} KB)")

            # Remove background
            print("  Removing background...", end=" ", flush=True)
            start = time.time()
            png_bytes = remove_background(img_bytes)
            elapsed = time.time() - start
            print(f"done ({elapsed:.1f}s, {len(png_bytes) // 1024} KB)")

            # Upload
            print("  Uploading...", end=" ", flush=True)
            new_url = upload_to_supabase(png_bytes, storage_path)
            print("done")

            # Update DB
            print("  Updating product record...", end=" ", flush=True)
            update_product_image(product_id, new_url)
            print("done")

            print(f"  New URL: {new_url}")
            success += 1

        except Exception as e:
            print(f"\n  FAILED: {e}")
            failed += 1

        print()

    print("=" * 50)
    print(f"Results: {success} success, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    main()
