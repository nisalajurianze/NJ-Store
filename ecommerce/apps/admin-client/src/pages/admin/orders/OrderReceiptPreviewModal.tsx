import { Button, Modal } from '@njstore/ui';
import { downloadPreviewAsset } from './receiptPreviewActions';
import type { ReceiptPreviewState } from './orderModalTypes';

interface OrderReceiptPreviewModalProps {
  receiptPreview: ReceiptPreviewState | null;
  onClose: () => void;
}

export const OrderReceiptPreviewModal = ({ receiptPreview, onClose }: OrderReceiptPreviewModalProps): JSX.Element => (
  <Modal isOpen={receiptPreview !== null} onClose={onClose} title="Receipt Preview" size="xl" bodyClassName="space-y-4">
    {receiptPreview ? (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-subtle,rgba(255,255,255,0.05))] px-4 py-3 text-sm text-[var(--app-modal-muted,rgba(226,232,240,0.74))]">
          <p className="truncate text-sm text-[var(--app-modal-muted,rgba(226,232,240,0.74))]">{receiptPreview.filename}</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-[color:var(--app-modal-border,rgba(255,255,255,0.12))] bg-[var(--app-modal-surface,rgba(255,255,255,0.045))] text-[var(--app-modal-text,#f8fafc)] hover:bg-[var(--app-modal-control-hover,rgba(255,255,255,0.075))] hover:text-[var(--app-modal-text,#f8fafc)]"
            onClick={() => downloadPreviewAsset(receiptPreview.url, receiptPreview.filename)}
          >
            Download Receipt
          </Button>
        </div>
        {receiptPreview.mimeType.startsWith('image/') ? (
          <div className="overflow-hidden rounded-3xl border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-preview-surface,rgba(0,0,0,0.20))] p-3">
            <img src={receiptPreview.url} alt="Receipt preview" className="max-h-[72vh] w-full rounded-2xl object-contain" loading="lazy" decoding="async" />
          </div>
        ) : receiptPreview.mimeType.includes('pdf') ? (
          <div className="overflow-hidden rounded-3xl border border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-white">
            <iframe src={receiptPreview.url} title="Receipt preview" className="h-[72vh] w-full" />
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[color:var(--app-modal-border,rgba(255,255,255,0.10))] bg-[var(--app-modal-subtle,rgba(255,255,255,0.05))] px-5 py-10 text-center text-sm text-[var(--app-modal-muted,rgba(226,232,240,0.74))]">
            Preview is not available for this file type. Use the download button above to open it locally.
          </div>
        )}
      </>
    ) : null}
  </Modal>
);
