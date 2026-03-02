
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Percent, Tag, Trash, Edit } from 'lucide-react';
import PromoCodeForm from './PromoCodeForm';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discount_percentage: number | null;
  discount_amount: number | null;
  minimum_order_amount: number | null;
  start_date: string;
  end_date: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  is_sitewide: boolean;
  created_at: string;
}

interface PromoCodeListProps {
  promoCodes: PromoCode[];
  onDelete: (id: string) => Promise<void>;
  onRefresh: () => void;
}

const PromoCodeList = ({ promoCodes, onDelete, onRefresh }: PromoCodeListProps) => {
  const { toast } = useToast();
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (promoCode: PromoCode) => {
    setEditingPromo(promoCode);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletePromoId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletePromoId) return;
    
    setIsDeleting(true);
    try {
      await onDelete(deletePromoId);
      toast({
        title: "Promo code deleted",
        description: "The promo code has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting promo code:", error);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error.message || "There was a problem deleting the promo code.",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setDeletePromoId(null);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setEditingPromo(null);
    onRefresh();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No end date";
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  return (
    <>
      {promoCodes.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="hidden md:table-cell">Validity</TableHead>
                <TableHead className="hidden md:table-cell">Uses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="font-medium">{promo.code}</TableCell>
                  <TableCell>{promo.description}</TableCell>
                  <TableCell>
                    {promo.discount_percentage ? (
                      <div className="flex items-center">
                        <Percent className="h-4 w-4 mr-1" />
                        {promo.discount_percentage}%
                      </div>
                    ) : promo.discount_amount ? (
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 mr-1" />
                        ${promo.discount_amount}
                      </div>
                    ) : "No discount"}
                    
                    {promo.minimum_order_amount && (
                      <div className="text-xs text-gray-500 mt-1">
                        Min. ${promo.minimum_order_amount}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(promo.start_date)} →<br />
                    {promo.end_date ? formatDate(promo.end_date) : "No end date"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {promo.current_uses}
                    {promo.max_uses ? ` / ${promo.max_uses}` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={promo.is_active ? "success" : "destructive"}>
                        {promo.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {!promo.is_sitewide && (
                        <Badge variant="outline">User-specific</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(promo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(promo.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No promo codes found.</p>
        </div>
      )}
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Promo Code</DialogTitle>
            <DialogDescription>
              Make changes to the promo code details.
            </DialogDescription>
          </DialogHeader>
          {editingPromo && (
            <PromoCodeForm 
              onSuccess={handleEditSuccess}
              initialData={editingPromo}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the promo code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PromoCodeList;
