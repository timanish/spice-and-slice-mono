import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Flame, Users } from 'lucide-react';
import { MenuItem } from '@/hooks/products/types';

interface MenuItemCardProps {
  item: MenuItem;
  servingCount: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  servingCount,
  onAdd,
  onIncrease,
  onDecrease
}) => {
  return (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-200 hover:border-[#8B0000] rounded-2xl bg-white">
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden bg-gray-50">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&q=80'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {item.is_vegetarian && (
            <Badge className="bg-emerald-500 text-white border-0 shadow-sm text-xs font-semibold">
              🌱 Vegetarian
            </Badge>
          )}
          {item.is_spicy && (
            <Badge className="bg-orange-500 text-white border-0 shadow-sm text-xs font-semibold">
              <Flame className="h-3 w-3 mr-1" />
              Spicy
            </Badge>
          )}
        </div>

        {/* Selected indicator */}
        {servingCount > 0 && (
          <div className="absolute top-3 right-3">
            <div className="bg-[#8B0000] text-white rounded-full px-2.5 py-1 flex items-center gap-1 font-bold shadow-lg text-sm">
              <Users className="h-3.5 w-3.5" />
              {servingCount}
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 leading-tight">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {/* Serving Size Info */}
        {item.serves_people && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-5 border border-gray-200">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#8B0000]" />
              <span className="text-sm font-semibold text-gray-700">
                Each tray serves ~{item.serves_people} people
              </span>
            </div>
          </div>
        )}

        {/* People Count Controls */}
        {servingCount === 0 ? (
          <Button
            onClick={onAdd}
            className="w-full bg-[#8B0000] hover:bg-[#6B0000] text-white h-12 font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-base"
          >
            Add to Enquiry
          </Button>
        ) : (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
              How many people?
            </p>
            <div className="flex items-center justify-between bg-[#8B0000] rounded-xl p-1.5 shadow-md">
              <Button
                onClick={onDecrease}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-[#6B0000] hover:text-white rounded-lg"
              >
                <Minus className="h-4 w-4" />
              </Button>

              <div className="flex-1 text-center">
                <span className="text-white font-bold text-xl">{servingCount}</span>
                <span className="text-white/80 text-sm ml-1.5 font-medium">
                  {servingCount === 1 ? 'person' : 'people'}
                </span>
              </div>

              <Button
                onClick={onIncrease}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-[#6B0000] hover:text-white rounded-lg"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MenuItemCard;
