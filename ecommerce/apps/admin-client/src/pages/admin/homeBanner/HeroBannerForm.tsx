import { Button, Input, Textarea } from '@njstore/ui';
import type { UseFormReturn } from 'react-hook-form';
import { CampaignEditorSection } from './CampaignEditorSection';
import { HomeBannerImageUploadButton } from './HomeBannerImageUploadButton';
import type { HomeBannerFormValues } from './homeBannerFormModel';
import type { HomeBannerImageUploadHandler } from './homeBannerUploadTypes';

interface HeroBannerFormProps {
  form: UseFormReturn<HomeBannerFormValues>;
  preview: HomeBannerFormValues;
  canWriteBanner: boolean;
  isBootstrapping: boolean;
  isSaving: boolean;
  uploadingImageTarget: string | null;
  onUploadImage: HomeBannerImageUploadHandler;
  onSave: () => Promise<void>;
}

export const HeroBannerForm = ({
  form,
  preview,
  canWriteBanner,
  isBootstrapping,
  isSaving,
  uploadingImageTarget,
  onUploadImage,
  onSave
}: HeroBannerFormProps): JSX.Element => (
  <CampaignEditorSection
    eyebrow="Hero"
    title="Main Campaign Copy"
    description="This controls the left hero block and its background artwork."
    summary={preview.isActive ? 'This campaign is published on the storefront.' : 'This campaign stays in draft until you publish it.'}
    action={
      canWriteBanner ? (
        <Button type="button" size="sm" disabled={isBootstrapping} isLoading={isSaving} onClick={() => void onSave()}>
          Save Hero
        </Button>
      ) : undefined
    }
  >
    <div className="grid gap-4 md:grid-cols-2">
      <Input label="Campaign Label" {...form.register('campaignLabel')} error={form.formState.errors.campaignLabel?.message} />
      <Input label="Primary CTA Text" {...form.register('ctaText')} error={form.formState.errors.ctaText?.message} />
      <div className="md:col-span-2">
        <Input label="Headline" {...form.register('title')} error={form.formState.errors.title?.message} />
      </div>
      <div className="md:col-span-2">
        <Textarea label="Subtitle" className="min-h-28" {...form.register('subtitle')} error={form.formState.errors.subtitle?.message} />
      </div>
      <Input label="Primary CTA Path" placeholder="/shop" {...form.register('ctaUrl')} error={form.formState.errors.ctaUrl?.message} />
      <Input label="Accent Line" placeholder="Official warranty, fast delivery..." {...form.register('accentText')} error={form.formState.errors.accentText?.message} />
      <div className="md:col-span-2">
        <div className="rounded-[20px] border border-white/10 bg-[#081224]/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Background Artwork</p>
          <p className="mt-2 text-sm leading-6 text-gray-400">Upload artwork directly, or keep these empty to use the themed hero background.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <Input label="Image URL" {...form.register('imageUrl')} error={form.formState.errors.imageUrl?.message} />
            <div className="flex items-end">
              <HomeBannerImageUploadButton
                label="Upload Background"
                className="h-12 min-w-[178px] justify-center"
                target={{
                  uploadKey: 'hero-background',
                  label: 'Hero background',
                  urlField: 'imageUrl',
                  publicIdField: 'imagePublicId',
                  altField: 'imageAlt'
                }}
                onUploadImage={onUploadImage}
                isLoading={uploadingImageTarget === 'hero-background'}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input label="Image Public ID" {...form.register('imagePublicId')} error={form.formState.errors.imagePublicId?.message} />
            <Input label="Image Alt Text" {...form.register('imageAlt')} error={form.formState.errors.imageAlt?.message} />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#081224]/80 px-4 py-3 text-sm text-gray-300 md:col-span-2">
        <span className={`relative flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${preview.isActive ? 'bg-gold/70' : 'bg-white/10'}`}>
          <span
            className={`h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
              preview.isActive ? 'translate-x-[1.25rem]' : 'translate-x-0.5'
            }`}
          />
        </span>
        <input type="checkbox" className="sr-only" {...form.register('isActive')} />
        Publish this home campaign on the storefront
      </label>
    </div>
  </CampaignEditorSection>
);
