import { Star } from 'lucide-react';

export interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StarRating = ({ value, max = 5, size = 'md', className = '' }: StarRatingProps): JSX.Element => {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={`flex items-center gap-[2px] ${className}`}>
      {Array.from({ length: max }).map((_, i) => {
        const fillPercentage = Math.max(0, Math.min(100, (value - i) * 100));
        
        return (
          <div key={i} className="relative" style={{ width: 'max-content' }}>
            <Star className={`text-gray-600 ${sizeClasses[size]}`} fill="currentColor" />
            <div 
              className="absolute inset-0 overflow-hidden" 
              style={{ width: `${fillPercentage}%` }}
            >
              <Star className={`text-gold ${sizeClasses[size]}`} fill="currentColor" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
