import React from 'react';
import { Loader2 } from 'lucide-react';
import '../skeleton.css';

export interface SimpleSpinnerProps {
  size?: string | number;
  color?: string;
}

const SimpleSpinner: React.FC<SimpleSpinnerProps> = ({
  size = 20,
  color = 'var(--text-color-secondary)',
}) => {
  const numericSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className="simple-spinner">
      <Loader2
        className="simple-spinner-icon"
        width={numericSize}
        height={numericSize}
        style={{ color }}
      />
    </div>
  );
};

export default SimpleSpinner;
