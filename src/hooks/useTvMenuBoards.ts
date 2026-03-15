import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminCrud } from "./useAdminCrud";
import { TvMenuBoard, TvMenuBoardConfig, DEFAULT_CONFIG } from "@/types/tv-menu";
import { useToast } from "@/hooks/use-toast";

const QUERY_KEY = ["admin-tv-menu-boards"];

export function useTvMenuBoards() {
  const { select, insert, update, remove } = useAdminCrud();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const boardsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await select("tv_menu_boards", {
        order: { column: "created_at", ascending: false },
      });
      return (res.data ?? []) as TvMenuBoard[];
    },
  });

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      const res = await insert("tv_menu_boards", {
        name,
        config: DEFAULT_CONFIG,
      });
      return res.data[0] as TvMenuBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Board created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create board", description: err.message, variant: "destructive" });
    },
  });

  const updateBoard = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<TvMenuBoard, "name" | "config">> }) => {
      const res = await update(
        "tv_menu_boards",
        data as Record<string, unknown>,
        [{ column: "id", operator: "eq", value: id }],
      );
      return res.data[0] as TvMenuBoard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Board updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update board", description: err.message, variant: "destructive" });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      await remove("tv_menu_boards", [{ column: "id", operator: "eq", value: id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Board deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete board", description: err.message, variant: "destructive" });
    },
  });

  const publishBoard = useMutation({
    mutationFn: async (id: string) => {
      // Unpublish all boards first
      const boards = boardsQuery.data ?? [];
      for (const board of boards) {
        if (board.is_published) {
          await update(
            "tv_menu_boards",
            { is_published: false },
            [{ column: "id", operator: "eq", value: board.id }],
          );
        }
      }
      // Publish the selected board
      await update(
        "tv_menu_boards",
        { is_published: true },
        [{ column: "id", operator: "eq", value: id }],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Board published" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to publish board", description: err.message, variant: "destructive" });
    },
  });

  const unpublishBoard = useMutation({
    mutationFn: async (id: string) => {
      await update(
        "tv_menu_boards",
        { is_published: false },
        [{ column: "id", operator: "eq", value: id }],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Board unpublished" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to unpublish board", description: err.message, variant: "destructive" });
    },
  });

  return {
    boards: boardsQuery.data ?? [],
    isLoading: boardsQuery.isLoading,
    error: boardsQuery.error,
    refetch: boardsQuery.refetch,
    createBoard,
    updateBoard,
    deleteBoard,
    publishBoard,
    unpublishBoard,
  };
}
