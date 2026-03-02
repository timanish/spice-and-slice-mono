import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCrud } from "@/hooks/useAdminCrud";
import { useToast } from "@/hooks/use-toast";

interface SettingRow {
  key: string;
  value: string;
  description: string | null;
}

const STORE_SETTING_KEYS = ["show_tax_on_product_cards", "lunch_box_enabled"];

const AdminStoreSettingsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { update } = useAdminCrud();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["adminStoreSettings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("key, value, description")
        .in("key", STORE_SETTING_KEYS);

      if (error) throw error;

      return (data || []).reduce((acc, row) => {
        acc[row.key] = row;
        return acc;
      }, {} as Record<string, SettingRow>);
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await update("delivery_settings", { value }, [{ column: "key", operator: "eq", value: key }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStoreSettings"] });
      queryClient.invalidateQueries({ queryKey: ["storeDisplaySettings"] });
      toast({ title: "Setting updated" });
    },
    onError: () => {
      toast({ title: "Failed to update setting", variant: "destructive" });
    },
  });

  const showTax = settings?.show_tax_on_product_cards?.value !== "false";
  const lunchBoxEnabled = settings?.lunch_box_enabled?.value !== "false";

  return (
    <AdminLayout title="Store Settings">
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Settings</h1>
          <p className="text-gray-600">Configure how your store displays information to customers.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Display Settings</CardTitle>
              <CardDescription>Control what information is visible on product cards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="show-tax" className="text-sm font-medium">
                    Show tax on product cards
                  </Label>
                  <p className="text-sm text-gray-500">
                    Display the estimated tax amount below the price on each product card.
                  </p>
                </div>
                <Switch
                  id="show-tax"
                  checked={showTax}
                  onCheckedChange={(checked) => {
                    updateSetting.mutate({
                      key: "show_tax_on_product_cards",
                      value: checked ? "true" : "false",
                    });
                  }}
                  disabled={updateSetting.isPending}
                />
              </div>

              <div className="border-t pt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="lunch-box-enabled" className="text-sm font-medium">
                    Lunch Box Program
                  </Label>
                  <p className="text-sm text-gray-500">
                    Enable the Lunch Box subscription page. When off, customers see a "Coming Soon" page.
                  </p>
                </div>
                <Switch
                  id="lunch-box-enabled"
                  checked={lunchBoxEnabled}
                  onCheckedChange={(checked) => {
                    updateSetting.mutate({
                      key: "lunch_box_enabled",
                      value: checked ? "true" : "false",
                    });
                  }}
                  disabled={updateSetting.isPending}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminStoreSettingsPage;
