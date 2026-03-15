import { AdminLayout } from "@/components/admin/AdminLayout";
import { TvMenuBoardsList } from "@/components/admin/tv-menu/TvMenuBoardsList";

const AdminTvMenuPage = () => {
  return (
    <AdminLayout title="TV Menu Board">
      <div className="p-8">
        <TvMenuBoardsList />
      </div>
    </AdminLayout>
  );
};

export default AdminTvMenuPage;
