import { Badge, Button, Input, Modal, Textarea } from '@njstore/ui';
import type { BroadcastFormErrors, BroadcastFormState } from './types';

interface UserBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  segmentUserCount: number;
  activeFiltersLabel: string;
  broadcastForm: BroadcastFormState;
  broadcastErrors: BroadcastFormErrors;
  isSendingSegment: boolean;
  onFieldChange: <K extends keyof BroadcastFormState>(field: K, value: BroadcastFormState[K]) => void;
  onSend: () => void;
}

export const UserBroadcastModal = ({
  isOpen,
  onClose,
  segmentUserCount,
  activeFiltersLabel,
  broadcastForm,
  broadcastErrors,
  isSendingSegment,
  onFieldChange,
  onSend
}: UserBroadcastModalProps): JSX.Element => (
  <Modal isOpen={isOpen} title="Email Segment" onClose={onClose} size="lg">
    <div className="space-y-5">
      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Selected recipients</p>
            <h3 className="mt-2 font-medium text-white">{segmentUserCount.toLocaleString()} active users</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              This send uses the current search, role, verification, and active filters from the Users page.
            </p>
          </div>
          <Badge variant="default" className="bg-white/[0.06] text-gray-300">
            {activeFiltersLabel}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Subject Line"
          value={broadcastForm.subject}
          onChange={(event) => onFieldChange('subject', event.target.value)}
          placeholder="Complete your account setup this week"
          error={broadcastErrors.subject}
        />
        <Input
          label="Preview Text"
          value={broadcastForm.previewText}
          onChange={(event) => onFieldChange('previewText', event.target.value)}
          placeholder="Helpful next steps for this segment."
          error={broadcastErrors.previewText}
        />
      </div>
      <Input
        label="Headline"
        value={broadcastForm.headline}
        onChange={(event) => onFieldChange('headline', event.target.value)}
        placeholder="You still have a few details left"
        error={broadcastErrors.headline}
      />
      <Textarea
        label="Message Body"
        value={broadcastForm.body}
        onChange={(event) => onFieldChange('body', event.target.value)}
        placeholder="Write the campaign message that should go to the current filtered segment."
        error={broadcastErrors.body}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="CTA Label"
          value={broadcastForm.ctaLabel}
          onChange={(event) => onFieldChange('ctaLabel', event.target.value)}
          placeholder="Open account"
          error={broadcastErrors.ctaLabel}
        />
        <Input
          label="CTA URL"
          value={broadcastForm.ctaUrl}
          onChange={(event) => onFieldChange('ctaUrl', event.target.value)}
          placeholder="/account"
          error={broadcastErrors.ctaUrl}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={onSend} isLoading={isSendingSegment} loadingLabel="Sending">
          Send Segment Email
        </Button>
      </div>
    </div>
  </Modal>
);
