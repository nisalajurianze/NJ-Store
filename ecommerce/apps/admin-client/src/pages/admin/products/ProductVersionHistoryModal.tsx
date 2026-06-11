import { Button, Modal } from '@njstore/ui';
import type { ProductRecord, ProductVersionRecord } from './productFormModel';

interface ProductVersionHistoryModalProps {
  historyProduct: ProductRecord | null;
  isLoading: boolean;
  versionItems: ProductVersionRecord[];
  selectedVersionId: string | null;
  selectedVersion?: ProductVersionRecord;
  diffBaselineUnavailable: boolean;
  versionDiffEntries: Array<{
    label: string;
    previous: string;
    next: string;
  }>;
  canWriteProducts: boolean;
  isRestoringVersion: boolean;
  onClose: () => void;
  onSelectVersion: (versionId: string) => void;
  onRestoreVersion: () => void;
}

export const ProductVersionHistoryModal = ({
  historyProduct,
  isLoading,
  versionItems,
  selectedVersionId,
  selectedVersion,
  diffBaselineUnavailable,
  versionDiffEntries,
  canWriteProducts,
  isRestoringVersion,
  onClose,
  onSelectVersion,
  onRestoreVersion
}: ProductVersionHistoryModalProps): JSX.Element => (
  <Modal
    isOpen={Boolean(historyProduct)}
    title={historyProduct ? `Version History - ${historyProduct.name}` : 'Version History'}
    onClose={onClose}
    size="xl"
  >
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.38fr)_minmax(0,0.62fr)]">
      <div className="space-y-3">
        <p className="text-sm leading-6 text-gray-400">
          Review the last five saved product states, inspect what changed in each edit, and restore any version when you need to roll back quickly.
        </p>
        <div className="space-y-2">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-gray-400">Loading version history...</div>
          ) : versionItems.length ? (
            versionItems.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => onSelectVersion(version.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  selectedVersionId === version.id ? 'border-gold/30 bg-gold/10 text-white' : 'border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Version {version.version}</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-gray-400">{new Date(version.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-sm text-gray-300">{version.commitMessage}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {version.updatedBy?.name ?? version.updatedBy?.email ?? 'Unknown admin'} - {new Date(version.createdAt).toLocaleString()}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-gray-400">
              This product does not have saved version history yet.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {selectedVersion ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gold">Selected Version</p>
                  <h3 className="mt-2 font-display text-[1.45rem] text-white">Version {selectedVersion.version}</h3>
                  <p className="mt-2 text-sm text-gray-400">{selectedVersion.commitMessage}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    Saved by {selectedVersion.updatedBy?.name ?? selectedVersion.updatedBy?.email ?? 'Unknown admin'} on{' '}
                    {new Date(selectedVersion.createdAt).toLocaleString()}
                  </p>
                </div>
                {canWriteProducts ? (
                  <Button onClick={onRestoreVersion} isLoading={isRestoringVersion}>
                    Restore This Version
                  </Button>
                ) : null}
              </div>
            </div>

            {diffBaselineUnavailable ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Older baseline data is outside the last five saved versions, so only the snapshot details are available for this entry.
              </div>
            ) : null}

            <div className="space-y-3">
              {versionDiffEntries.length ? (
                versionDiffEntries.map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-gray-400">{entry.label}</p>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-dark-light/50 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Previous</p>
                        <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">{entry.previous}</pre>
                      </div>
                      <div className="rounded-2xl border border-gold/15 bg-gold/[0.06] px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Selected Version</p>
                        <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white">{entry.next}</pre>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-gray-400">
                  No field changes were detected for this version compared with the immediately previous saved state.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-gray-400">
            Select a version on the left to inspect its saved snapshot and restore controls.
          </div>
        )}
      </div>
    </div>
  </Modal>
);
