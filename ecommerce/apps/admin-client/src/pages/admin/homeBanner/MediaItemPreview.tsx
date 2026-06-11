import type { HomeBannerFormValues } from './homeBannerFormModel';

type HomeBannerMediaItem = HomeBannerFormValues['featurePromo']['mediaItems'][number];

interface MediaItemPreviewProps {
  media?: HomeBannerMediaItem;
  title: string;
}

const getUrlFileName = (url: string): string => {
  const withoutQuery = url.split('?')[0] ?? url;
  const lastSegment = withoutQuery.split('/').filter(Boolean).pop() ?? '';

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

const getPublicIdFileName = (publicId: string): string => publicId.split('/').filter(Boolean).pop() ?? publicId;

export const MediaItemPreview = ({ media, title }: MediaItemPreviewProps): JSX.Element => {
  const mediaUrl = media?.url?.trim() ?? '';
  const mediaPublicId = media?.publicId?.trim() ?? '';
  const mediaAlt = media?.alt?.trim() ?? '';
  const mediaName = mediaAlt || (mediaPublicId ? getPublicIdFileName(mediaPublicId) : '') || (mediaUrl ? getUrlFileName(mediaUrl) : '');

  return (
    <aside className="rounded-[18px] border border-white/10 bg-[#050c19]/72 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Current Preview</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-gray-300">
          {media?.kind ?? 'media'}
        </span>
      </div>

      <div className="mt-3 flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[14px] border border-white/10 bg-black/30">
        {mediaUrl ? (
          media?.kind === 'video' ? (
            <video src={mediaUrl} className="h-full w-full object-contain" muted playsInline preload="metadata" />
          ) : (
            <img
              src={mediaUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          )
        ) : (
          <p className="px-4 text-center text-xs leading-5 text-gray-500">Add a media URL or upload an image to preview it here.</p>
        )}
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-semibold text-gray-200">{mediaName || title}</p>
      {mediaPublicId ? <p className="mt-1 truncate text-xs text-gray-500">{mediaPublicId}</p> : null}
    </aside>
  );
};
