
import React from 'react';
import { MenuItems } from '@/components/admin/MenuItems';
import { AdminLayout } from '@/components/admin/AdminLayout';

const AdminMenuItemsPage = () => {
  return (
    <AdminLayout title="Menu Items">
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-8">Manage Menu Items</h1>
        <MenuItems />
      </div>
    </AdminLayout>
  );
};

export default AdminMenuItemsPage;
