export interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}
export declare const MobileDrawer: ({ isOpen, onClose, title, children, className }: MobileDrawerProps) => JSX.Element;
