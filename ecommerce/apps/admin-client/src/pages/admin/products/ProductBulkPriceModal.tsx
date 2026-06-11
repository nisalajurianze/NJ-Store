import { Button, Input, Modal } from '@njstore/ui';
import type { BulkAdjustmentTarget, BulkAdjustmentType } from './productFormModel';

interface ProductBulkPriceModalProps {
  isOpen: boolean;
  bulkAdjustmentType: BulkAdjustmentType;
  bulkAdjustmentAmount: string;
  bulkAdjustmentTarget: BulkAdjustmentTarget;
  applyToVariantOverrides: boolean;
  selectedProductCount: number;
  selectedVisibleCount: number;
  isApplyingBulkPrice: boolean;
  selectClassName: string;
  onClose: () => void;
  onAdjustmentTypeChange: (value: BulkAdjustmentType) => void;
  onAdjustmentAmountChange: (value: string) => void;
  onAdjustmentTargetChange: (value: BulkAdjustmentTarget) => void;
  onApplyToVariantOverridesChange: (value: boolean) => void;
  onApply: () => void;
}

export const ProductBulkPriceModal = ({
  isOpen,
  bulkAdjustmentType,
  bulkAdjustmentAmount,
  bulkAdjustmentTarget,
  applyToVariantOverrides,
  selectedProductCount,
  selectedVisibleCount,
  isApplyingBulkPrice,
  selectClassName,
  onClose,
  onAdjustmentTypeChange,
  onAdjustmentAmountChange,
  onAdjustmentTargetChange,
  onApplyToVariantOverridesChange,
  onApply
}: ProductBulkPriceModalProps): JSX.Element => (
  <Modal isOpen={isOpen} title="Bulk Price Update" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm leading-6 text-gray-400">
        Apply a percentage or fixed amount across the selected products. Existing flash deals that become invalid will be turned off automatically.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span>Adjustment Type</span>
          <select className={selectClassName} value={bulkAdjustmentType} onChange={(event) => onAdjustmentTypeChange(event.target.value as BulkAdjustmentType)}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </label>
        <Input
          label={bulkAdjustmentType === 'percentage' ? 'Percentage Change' : 'Fixed Amount'}
          type="number"
          value={bulkAdjustmentAmount}
          onChange={(event) => onAdjustmentAmountChange(event.target.value)}
        />
        <label className="flex flex-col gap-2 text-sm text-gray-300">
          <span>Target Field</span>
          <select className={selectClassName} value={bulkAdjustmentTarget} onChange={(event) => onAdjustmentTargetChange(event.target.value as BulkAdjustmentTarget)}>
            <option value="price">Base Price</option>
            <option value="comparePrice">Compare Price</option>
            <option value="both">Both Price Fields</option>
          </select>
        </label>
      </div>
      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-gray-300">
        <input
          className="mt-1 h-4 w-4 rounded border-white/20 bg-dark-light text-gold focus:ring-gold/30"
          type="checkbox"
          checked={applyToVariantOverrides}
          onChange={(event) => onApplyToVariantOverridesChange(event.target.checked)}
        />
        <span>
          <span className="block font-medium text-white">Also update variant price overrides</span>
          <span className="mt-1 block text-xs text-gray-400">
            Variant-level prices will be adjusted using the same rule whenever they currently override the base price.
          </span>
        </span>
      </label>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-gray-300">
        <p className="font-medium text-white">Selected products</p>
        <p className="mt-2 text-gray-400">
          {selectedProductCount} product{selectedProductCount === 1 ? '' : 's'} selected. The current filtered view includes {selectedVisibleCount} selected item
          {selectedVisibleCount === 1 ? '' : 's'}.
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={onApply} isLoading={isApplyingBulkPrice}>
          Apply Adjustment
        </Button>
      </div>
    </div>
  </Modal>
);
