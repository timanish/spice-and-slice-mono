import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser as useClerkUser } from "@clerk/clerk-react";
import { SUPABASE_URL } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldCheck, ShieldOff, Users, Loader2 } from "lucide-react";

type Role = "admin" | "user";

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string | null;
  is_guest?: boolean | null;
  role: Role;
}

interface PendingChange {
  user: AdminUser;
  newRole: Role;
}

const PAGE_SIZE = 50;

const AdminUsersPage = () => {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { user: clerkUser } = useClerkUser();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  // Debounce the search input so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available");

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-manage-users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "list",
            search,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.details || err.error || "Failed to load users");
      }

      return (await response.json()) as { users: AdminUser[]; total: number };
    },
    staleTime: 30_000,
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ targetUserId, role }: { targetUserId: string; role: Role }) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication token not available");

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/admin-manage-users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "set_role", targetUserId, role }),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.details || err.error || "Failed to update role");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Role updated",
        description: `User is now ${variables.role === "admin" ? "an admin" : "a regular user"}.`,
      });
      setPendingChange(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update role",
        description: err.message,
        variant: "destructive",
      });
      setPendingChange(null);
    },
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const requestRoleChange = (user: AdminUser) => {
    const newRole: Role = user.role === "admin" ? "user" : "admin";
    setPendingChange({ user, newRole });
  };

  const confirmRoleChange = () => {
    if (!pendingChange) return;
    setRoleMutation.mutate({
      targetUserId: pendingChange.user.id,
      role: pendingChange.newRole,
    });
  };

  return (
    <AdminLayout title="User Management">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-food-red to-food-orange rounded-lg flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600">Promote or demote users.</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Users</span>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by email or name…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading users…
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
                {(error as Error).message}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">Phone</th>
                      <th className="py-2 pr-4 font-medium">Role</th>
                      <th className="py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = clerkUser?.id === u.id;
                      const isAdmin = u.role === "admin";
                      return (
                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {u.full_name || "—"}
                              </span>
                              {isSelf && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                              {u.is_guest && (
                                <Badge variant="outline" className="text-xs text-gray-500">Guest</Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-gray-700 break-all">{u.email || "—"}</td>
                          <td className="py-3 pr-4 text-gray-700">{u.phone_number || "—"}</td>
                          <td className="py-3 pr-4">
                            {isAdmin ? (
                              <Badge className="bg-food-red/10 text-food-red border-food-red/20 hover:bg-food-red/10">
                                <ShieldCheck className="h-3 w-3 mr-1" /> Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <Button
                              size="sm"
                              variant={isAdmin ? "outline" : "default"}
                              className={
                                !isAdmin ? "bg-food-red hover:bg-food-red/90 text-white" : ""
                              }
                              disabled={isSelf || setRoleMutation.isPending}
                              onClick={() => requestRoleChange(u)}
                              title={
                                isSelf
                                  ? "You can't change your own role. Ask another admin."
                                  : isAdmin
                                  ? "Demote to user"
                                  : "Promote to admin"
                              }
                            >
                              {isAdmin ? (
                                <>
                                  <ShieldOff className="h-4 w-4 mr-1" />
                                  Demote
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-4 w-4 mr-1" />
                                  Make admin
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Showing {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0 || isFetching}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!pendingChange}
        onOpenChange={(open) => !open && setPendingChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingChange?.newRole === "admin"
                ? "Promote to admin?"
                : "Demote to regular user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingChange?.newRole === "admin" ? (
                <>
                  <span className="font-medium">
                    {pendingChange?.user.full_name || pendingChange?.user.email}
                  </span>{" "}
                  will gain full admin access — managing orders, products, and other users.
                  Only do this for trusted teammates.
                </>
              ) : (
                <>
                  <span className="font-medium">
                    {pendingChange?.user.full_name || pendingChange?.user.email}
                  </span>{" "}
                  will lose admin access immediately.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setRoleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={setRoleMutation.isPending}
              className={
                pendingChange?.newRole === "admin"
                  ? "bg-food-red hover:bg-food-red/90"
                  : ""
              }
            >
              {setRoleMutation.isPending
                ? "Saving…"
                : pendingChange?.newRole === "admin"
                ? "Promote to admin"
                : "Demote to user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsersPage;
