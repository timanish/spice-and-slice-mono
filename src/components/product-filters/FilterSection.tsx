
import React from 'react';

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children }) => {
  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export default FilterSection;
