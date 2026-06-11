import { type HTMLAttributes, type PropsWithChildren } from 'react';
type ModalSize = 'md' | 'lg' | 'xl' | 'full';
type ModalPanelProps = Pick<HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'onMouseEnter' | 'onMouseLeave' | 'onPointerEnter' | 'onPointerLeave'>;
export interface ModalOriginRect {
    left: number;
    top: number;
    width: number;
    height: number;
    borderRadius?: number;
}
export interface ModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    size?: ModalSize;
    contentClassName?: string;
    bodyClassName?: string;
    overlayClassName?: string;
    panelProps?: ModalPanelProps;
    originRect?: ModalOriginRect | null;
    anchorToOrigin?: boolean;
    anchoredOffset?: number;
    morphOnClose?: boolean;
    closeOnBackdropPointerDown?: boolean;
    lockBodyScroll?: boolean;
    ariaModal?: boolean;
    overlayVariant?: 'default' | 'transparent' | 'plain';
    showHeader?: boolean;
    performanceMode?: 'default' | 'fast';
}
export declare const Modal: ({ children, isOpen, onClose, title, size, contentClassName, bodyClassName, overlayClassName, panelProps, originRect, anchorToOrigin, anchoredOffset, morphOnClose, closeOnBackdropPointerDown, lockBodyScroll, ariaModal, overlayVariant, showHeader, performanceMode }: PropsWithChildren<ModalProps>) => JSX.Element | null;
export {};
