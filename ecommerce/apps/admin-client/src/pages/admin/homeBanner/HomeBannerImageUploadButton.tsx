import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@njstore/ui';
import type { HomeBannerImageUploadHandler, HomeBannerImageUploadTarget } from './homeBannerUploadTypes';

interface HomeBannerImageUploadButtonProps {
  target: HomeBannerImageUploadTarget;
  onUploadImage: HomeBannerImageUploadHandler;
  isLoading: boolean;
  label?: string;
  className?: string;
}

export const HomeBannerImageUploadButton = ({
  target,
  onUploadImage,
  isLoading,
  label = 'Upload Image',
  className
}: HomeBannerImageUploadButtonProps): JSX.Element => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        aria-label={label}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          void onUploadImage(event, target).finally(() => {
            if (inputRef.current) {
              inputRef.current.value = '';
            }
          });
        }}
      />
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => inputRef.current?.click()}
        isLoading={isLoading}
      >
        <Upload className="h-4 w-4" />
        {label}
      </Button>
    </>
  );
};
