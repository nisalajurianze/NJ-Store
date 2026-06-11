export interface StarRatingProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}
export declare const StarRating: ({ value, max, size, className }: StarRatingProps) => JSX.Element;
