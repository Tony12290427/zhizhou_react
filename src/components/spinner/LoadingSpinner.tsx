import React from 'react';
import { Loader2 } from 'lucide-react';
import '../skeleton.css';

export interface LoadingSpinnerProps {
  duration?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ duration = 1.5 }) => {
  return (
    <div
      className="loading-spinner"
      style={{ '--animation-duration': `${duration}s` } as React.CSSProperties}
    >
      <Loader2 className="spinner-icon" width={28} height={28} />
    </div>
  );
};

export default LoadingSpinner;
