import { useState } from "react";
import { CartComboItem as CartComboItemType } from "@/stores/cart/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Trash2,
  Check,
  Package,
} from "lucide-react";

interface CartComboItemProps {
  item: CartComboItemType;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

const CartComboItem = ({ item, onRemove, onUpdateQuantity }: CartComboItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const coreItems = item.combo.items.filter((ci) => !ci.is_addon);
  const selectedAddons = item.combo.items.filter(
    (ci) => ci.is_addon && item.selected_addon_ids.includes(ci.id)
  );

  // Total price = (combo_price + sum of selected addon prices) * quantity
  const addonTotal = selectedAddons.reduce(
    (sum, addon) => sum + (addon.addon_price || 0),
    0
  );
  const unitPrice = item.combo.combo_price + addonTotal;
  const totalPrice = unitPrice * item.quantity;

  const handleDecrement = () => {
    if (item.quantity <= 1) {
      onRemove();
    } else {
      onUpdateQuantity(item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    onUpdateQuantity(item.quantity + 1);
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
      {/* Header row */}
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-lg">
              {item.combo.name}
            </h3>
            <Badge className="bg-food-orange text-white">Combo</Badge>
          </div>
          {item.combo.description && (
            <p className="text-sm text-gray-500 mt-1">{item.combo.description}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-gray-900">
            ${totalPrice.toFixed(2)}
          </p>
          {item.quantity > 1 && (
            <p className="text-sm text-gray-500">
              ${unitPrice.toFixed(2)} each
            </p>
          )}
        </div>
      </div>

      {/* Controls row */}
      <div className="flex justify-between items-center">
        {/* Expand/collapse toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {coreItems.length + selectedAddons.length} item
              {coreItems.length + selectedAddons.length !== 1 ? "s" : ""}
            </>
          )}
        </button>

        {/* Quantity controls and remove */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleDecrement}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-medium text-gray-900">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleIncrement}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-red-500"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 pl-2">
          {/* Core items */}
          {coreItems.map((ci) => (
            <div key={ci.id} className="flex items-center gap-2 text-sm text-gray-600">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span>
                {ci.product.name}
                {ci.product.is_weighted && ci.weight
                  ? ` (${ci.weight} ${ci.product.unit_of_measure || "lb"})`
                  : ci.quantity > 1
                  ? ` (x${ci.quantity})`
                  : ""}
              </span>
            </div>
          ))}

          {/* Selected add-ons */}
          {selectedAddons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center justify-between gap-2 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-food-orange flex-shrink-0" />
                <span>
                  {addon.product.name}
                  {addon.quantity > 1 ? ` (x${addon.quantity})` : ""}
                </span>
              </div>
              {addon.addon_price != null && addon.addon_price > 0 && (
                <span className="text-gray-500">+${addon.addon_price.toFixed(2)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CartComboItem;
