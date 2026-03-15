import { useState } from "react";
import { useTvMenuBoards } from "@/hooks/useTvMenuBoards";
import { TvMenuBoard } from "@/types/tv-menu";
import { TvMenuBoardEditor } from "./TvMenuBoardEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Globe,
  GlobeIcon,
  Loader2,
  Monitor,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TvMenuBoardsList() {
  const {
    boards,
    isLoading,
    createBoard,
    updateBoard,
    deleteBoard,
    publishBoard,
    unpublishBoard,
  } = useTvMenuBoards();

  const [editingBoard, setEditingBoard] = useState<TvMenuBoard | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const handleCreate = () => {
    if (!newBoardName.trim()) return;
    createBoard.mutate(newBoardName.trim(), {
      onSuccess: () => {
        setNewBoardName("");
        setShowCreateInput(false);
      },
    });
  };

  const handlePreview = (board: TvMenuBoard) => {
    window.open(`/tv-menu?board_id=${board.id}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-food-red" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">TV Menu Boards</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure menu displays for in-store TV screens
          </p>
        </div>
        {!showCreateInput && (
          <Button onClick={() => setShowCreateInput(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Board
          </Button>
        )}
      </div>

      {/* Create Input */}
      {showCreateInput && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                placeholder="Board name (e.g., Main TV, Counter Display)"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              <Button onClick={handleCreate} disabled={createBoard.isPending}>
                {createBoard.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateInput(false);
                  setNewBoardName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boards List */}
      {boards.length === 0 && !showCreateInput ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Monitor className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No boards yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create a TV menu board to display your menu on in-store screens.
            </p>
            <Button onClick={() => setShowCreateInput(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Board
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {boards.map((board) => (
            <Card key={board.id} className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {board.name}
                        </h3>
                        {board.is_published && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Published
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Layout: {board.config?.layout ?? "classic"} &middot;{" "}
                        {board.config?.category_ids?.length ?? 0} categories
                        &middot; Updated{" "}
                        {new Date(board.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(board)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>

                    {board.is_published ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unpublishBoard.mutate(board.id)}
                        disabled={unpublishBoard.isPending}
                      >
                        <GlobeIcon className="h-4 w-4 mr-1" />
                        Unpublish
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => publishBoard.mutate(board.id)}
                        disabled={publishBoard.isPending}
                      >
                        <Globe className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBoard(board)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingBoardId(board.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      {editingBoard && (
        <TvMenuBoardEditor
          board={editingBoard}
          open={!!editingBoard}
          onClose={() => setEditingBoard(null)}
          onSave={(config) => {
            updateBoard.mutate(
              { id: editingBoard.id, data: { config } },
              { onSuccess: () => setEditingBoard(null) },
            );
          }}
          isSaving={updateBoard.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingBoardId}
        onOpenChange={() => setDeletingBoardId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this board? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deletingBoardId) {
                  deleteBoard.mutate(deletingBoardId);
                  setDeletingBoardId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
