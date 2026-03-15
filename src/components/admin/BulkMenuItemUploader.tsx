import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategoriesFetcher } from "@/hooks/useCategoriesFetcher";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  AlertTriangle,
  Check,
  X,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Download,
} from "lucide-react";

interface CsvRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  sub_category: string;
  is_vegetarian: boolean;
  is_spicy: boolean;
  serves_people: number | null;
  status: "pending" | "duplicate" | "imported" | "error";
  duplicateOf?: string;
  similarityScore?: number;
  error?: string;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1;
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(al, bl) / maxLen;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  return lines.slice(1).map((line) => {
    // Handle quoted commas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim().replace(/^['"]|['"]$/g, ""));
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim().replace(/^['"]|['"]$/g, ""));

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

const SAMPLE_CSV = `name,description,price,sub_category,is_vegetarian,is_spicy,serves_people
Chicken Tikka Masala,Creamy tomato curry with tender chicken,14.99,,false,true,2
Vegetable Samosa,Crispy pastry with spiced potato filling,6.99,,true,false,
Mango Lassi,Sweet mango yogurt drink,4.99,,true,false,1`;

export function BulkMenuItemUploader() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<CsvRow[]>([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const { insert } = useAdminCrud();
  const { data: categories = [] } = useCategoriesFetcher({ includeHidden: true });

  // Fetch existing menu items for duplicate detection
  const { data: existingItems = [] } = useQuery({
    queryKey: ["existing-menu-items-for-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, price, category_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const duplicateCount = rows.filter((r) => r.status === "duplicate").length;
  const importedCount = rows.filter((r) => r.status === "imported").length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);

    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const processCSV = (text: string) => {
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      toast({
        variant: "destructive",
        title: "Invalid CSV",
        description: "No data rows found. Check format.",
      });
      return;
    }

    const newRows: CsvRow[] = parsed.map((raw, i) => {
      const name = raw.name || `Unnamed Item ${i + 1}`;
      const price = parseFloat(raw.price) || 0;
      const categoryId = raw.category_id || defaultCategoryId;

      // Check duplicates against existing items
      let status: CsvRow["status"] = "pending";
      let duplicateOf: string | undefined;
      let similarityScore: number | undefined;

      for (const existing of existingItems) {
        const score = similarity(name, existing.name);
        if (score >= 0.85) {
          status = "duplicate";
          duplicateOf = existing.name;
          similarityScore = Math.round(score * 100);
          break;
        }
      }

      // Also check within the CSV itself (intra-CSV duplicates)
      if (status === "pending") {
        for (let j = 0; j < i; j++) {
          const otherName = parsed[j].name || `Unnamed Item ${j + 1}`;
          const score = similarity(name, otherName);
          if (score >= 0.85) {
            status = "duplicate";
            duplicateOf = `(CSV row ${j + 1}) ${otherName}`;
            similarityScore = Math.round(score * 100);
            break;
          }
        }
      }

      return {
        id: crypto.randomUUID(),
        name,
        description: raw.description || "",
        price,
        category_id: categoryId,
        sub_category: raw.sub_category || "",
        is_vegetarian: raw.is_vegetarian?.toLowerCase() === "true",
        is_spicy: raw.is_spicy?.toLowerCase() === "true",
        serves_people: raw.serves_people ? parseInt(raw.serves_people) : null,
        status,
        duplicateOf,
        similarityScore,
      };
    });

    setRows(newRows);
    toast({
      title: `Parsed ${newRows.length} items`,
      description: `${newRows.filter((r) => r.status === "duplicate").length} potential duplicates found`,
    });
  };

  const updateRow = (id: string, field: keyof CsvRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const forcePending = (id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "pending", duplicateOf: undefined, similarityScore: undefined } : r,
      ),
    );
  };

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.status === "pending");
    if (toImport.length === 0) {
      toast({ variant: "destructive", title: "No items to import" });
      return;
    }

    // Validate all have a category
    const noCat = toImport.filter((r) => !r.category_id);
    if (noCat.length > 0) {
      toast({
        variant: "destructive",
        title: "Missing category",
        description: `${noCat.length} items have no category. Set a default category or assign individually.`,
      });
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    for (const row of toImport) {
      try {
        await insert("menu_items", {
          name: row.name,
          description: row.description || null,
          price: row.price,
          category_id: row.category_id,
          sub_category: row.sub_category || null,
          is_vegetarian: row.is_vegetarian,
          is_spicy: row.is_spicy,
          serves_people: row.serves_people,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, status: "imported" } : r,
          ),
        );
        successCount++;
      } catch (err: any) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...r, status: "error", error: err.message }
              : r,
          ),
        );
      }
    }

    setIsImporting(false);
    await queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    await queryClient.invalidateQueries({ queryKey: ["all-menu_items"] });
    toast({
      title: `Imported ${successCount} of ${toImport.length} items`,
    });
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu_items_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Bulk Menu Item Upload
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload a CSV to bulk add menu items. Duplicates are detected
          automatically using fuzzy name matching.
        </p>
      </div>

      {/* Upload Card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Default Category
              </label>
              <Select
                value={defaultCategoryId}
                onValueChange={setDefaultCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default category for imports" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
            </div>

            <Button variant="outline" onClick={downloadSample} className="gap-2">
              <Download className="h-4 w-4" />
              Sample CSV
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
            <p className="font-medium mb-1">Expected CSV columns:</p>
            <code>
              name, description, price, sub_category, is_vegetarian, is_spicy,
              serves_people
            </code>
            <p className="mt-1">
              Only <strong>name</strong> and <strong>price</strong> are required.
              Category is set via the default above or per-row in the table.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5" />
                {rows.length} Items
                <Badge variant="outline" className="ml-2">
                  {pendingCount} pending
                </Badge>
                {duplicateCount > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    {duplicateCount} duplicates
                  </Badge>
                )}
                {importedCount > 0 && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {importedCount} imported
                  </Badge>
                )}
              </CardTitle>
              <Button
                onClick={handleImport}
                disabled={isImporting || pendingCount === 0}
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Import {pendingCount} Items
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        row.status === "duplicate"
                          ? "bg-yellow-50"
                          : row.status === "imported"
                            ? "bg-green-50 opacity-60"
                            : row.status === "error"
                              ? "bg-red-50"
                              : ""
                      }
                    >
                      <TableCell>
                        {row.status === "pending" && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                        {row.status === "duplicate" && (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {row.similarityScore}%
                          </Badge>
                        )}
                        {row.status === "imported" && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <Check className="h-3 w-3" />
                          </Badge>
                        )}
                        {row.status === "error" && (
                          <Badge className="bg-red-100 text-red-700 text-xs">
                            <X className="h-3 w-3" />
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={(e) =>
                            updateRow(row.id, "name", e.target.value)
                          }
                          className="h-8 text-sm"
                          disabled={
                            row.status === "imported"
                          }
                        />
                        {row.duplicateOf && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-yellow-600">
                              Similar to: {row.duplicateOf}
                            </span>
                            <button
                              onClick={() => forcePending(row.id)}
                              className="text-xs text-blue-600 hover:underline ml-1"
                            >
                              Import anyway
                            </button>
                          </div>
                        )}
                        {row.error && (
                          <span className="text-xs text-red-600">
                            {row.error}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.price}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "price",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-8 text-sm w-24"
                          disabled={row.status === "imported"}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.category_id || defaultCategoryId}
                          onValueChange={(v) =>
                            updateRow(row.id, "category_id", v)
                          }
                          disabled={row.status === "imported"}
                        >
                          <SelectTrigger className="h-8 text-sm w-[150px]">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.sub_category}
                          onChange={(e) =>
                            updateRow(row.id, "sub_category", e.target.value)
                          }
                          className="h-8 text-sm w-[130px]"
                          placeholder="e.g., Appetizers"
                          disabled={row.status === "imported"}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.description}
                          onChange={(e) =>
                            updateRow(row.id, "description", e.target.value)
                          }
                          className="h-8 text-sm"
                          placeholder="Description..."
                          disabled={row.status === "imported"}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {row.is_vegetarian && (
                            <Badge className="bg-green-500 text-xs py-0">
                              V
                            </Badge>
                          )}
                          {row.is_spicy && (
                            <Badge className="bg-red-500 text-xs py-0">
                              S
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.status !== "imported" && (
                          <button
                            onClick={() => removeRow(row.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
