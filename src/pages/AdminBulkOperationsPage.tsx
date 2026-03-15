import { AdminLayout } from "@/components/admin/AdminLayout";
import { BulkMenuItemUploader } from "@/components/admin/BulkMenuItemUploader";

const AdminBulkOperationsPage = () => {
  return (
    <AdminLayout title="Bulk Operations">
      <div className="p-8">
        <BulkMenuItemUploader />
      </div>
    </AdminLayout>
  );
};

export default AdminBulkOperationsPage;
