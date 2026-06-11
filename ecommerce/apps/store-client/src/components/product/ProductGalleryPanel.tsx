import type { ImageAsset, ProductDetailDto } from '@njstore/types';
import { ImageGallery } from './ImageGallery';

interface ProductGalleryPanelProps {
  product: ProductDetailDto;
  activeImageIndex: number;
  glowColor: string;
  galleryImages: ImageAsset[];
  isZoomEnabled: boolean;
  zoomOffset: { x: number; y: number };
  zoomOrigin: { x: number; y: number };
  zoomScale: number;
  onToggleZoom: () => void;
  onZoomOffsetChange: (offset: { x: number; y: number }) => void;
  onZoomOriginChange: (origin: { x: number; y: number }) => void;
  onZoomScaleChange: (scale: number) => void;
  onSelectImage: (index: number) => void;
}

export const ProductGalleryPanel = ({
  product,
  activeImageIndex,
  glowColor,
  galleryImages,
  isZoomEnabled,
  zoomOffset,
  zoomOrigin,
  zoomScale,
  onToggleZoom,
  onZoomOffsetChange,
  onZoomOriginChange,
  onZoomScaleChange,
  onSelectImage
}: ProductGalleryPanelProps): JSX.Element => {
  return (
    <div className="product-gallery-sticky-panel pt-1 xl:sticky">
      <ImageGallery
        activeImageIndex={activeImageIndex}
        glowColor={glowColor}
        images={galleryImages}
        isZoomEnabled={isZoomEnabled}
        onToggleZoom={onToggleZoom}
        onZoomOffsetChange={onZoomOffsetChange}
        onZoomOriginChange={onZoomOriginChange}
        onZoomScaleChange={onZoomScaleChange}
        onSelectImage={onSelectImage}
        productName={product.name}
        zoomOffset={zoomOffset}
        zoomOrigin={zoomOrigin}
        zoomScale={zoomScale}
      />
    </div>
  );
};
