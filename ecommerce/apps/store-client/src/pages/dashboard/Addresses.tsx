import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Badge, Button, Card, Input, SectionHeading } from '@njstore/ui';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/lazyToast';

const addressSchema = z.object({
  label: z.string().min(2),
  fullName: z.string().min(2),
  phone: z.string().min(7),
  line1: z.string().min(5),
  line2: z.string().optional(),
  city: z.string().min(2),
  district: z.string().min(2),
  postalCode: z.string().min(4),
  country: z.string().min(2).default('Sri Lanka')
});

type AddressFormValues = z.infer<typeof addressSchema>;

const emptyAddressValues: AddressFormValues = {
  label: '',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  district: '',
  postalCode: '',
  country: 'Sri Lanka'
};

const AddressFields = ({ form }: { form: UseFormReturn<AddressFormValues> }): JSX.Element => (
  <>
    <Input label="Label" {...form.register('label')} error={form.formState.errors.label?.message} />
    <Input label="Full Name" {...form.register('fullName')} error={form.formState.errors.fullName?.message} />
    <Input label="Phone" {...form.register('phone')} error={form.formState.errors.phone?.message} />
    <Input label="Address Line 1" {...form.register('line1')} error={form.formState.errors.line1?.message} />
    <Input label="Address Line 2" {...form.register('line2')} error={form.formState.errors.line2?.message} />
    <Input label="City" {...form.register('city')} error={form.formState.errors.city?.message} />
    <Input label="District" {...form.register('district')} error={form.formState.errors.district?.message} />
    <Input label="Postal Code" {...form.register('postalCode')} error={form.formState.errors.postalCode?.message} />
    <Input label="Country" {...form.register('country')} error={form.formState.errors.country?.message} />
  </>
);

export const DashboardAddresses = (): JSX.Element => {
  const { addAddress, addresses, updateAddress, deleteAddress, setDefaultAddress } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(addresses.length === 0);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const createForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddressValues
  });
  const editForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: emptyAddressValues
  });

  useEffect(() => {
    if (addresses.length === 0) {
      setIsCreateOpen(true);
    }
  }, [addresses.length]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Addresses"
        size="compact"
        description="Saved delivery destinations from your account profile."
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingAddressId(null);
              createForm.reset(emptyAddressValues);
              setIsCreateOpen((current) => !current);
            }}
          >
            {isCreateOpen && addresses.length > 0 ? 'Close' : 'New Address'}
          </Button>
        }
      />

      {isCreateOpen ? (
        <Card className="rounded-[26px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">New Address</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Add a delivery location</h3>
            </div>
          </div>
          <form
            className="mt-5 grid gap-4 md:grid-cols-2"
            onSubmit={createForm.handleSubmit(async (values) => {
              try {
                await addAddress({ ...values, isDefault: addresses.length === 0 });
                toast.success('Address added');
                createForm.reset(emptyAddressValues);
                setIsCreateOpen(false);
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'Unable to save this address right now.'));
              }
            })}
          >
            <AddressFields form={createForm} />
            <div className="flex flex-wrap gap-2 md:col-span-2">
              {addresses.length > 0 ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" size="sm" isLoading={createForm.formState.isSubmitting}>
                Add Address
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {addresses.map((address) => (
          <Card key={address._id} className="rounded-[26px] p-5 !shadow-none sm:p-6 sm:!shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold leading-tight text-white">{address.label}</h3>
                  {address.isDefault ? <Badge variant="success">Default</Badge> : null}
                </div>
                <p className="mt-2 text-sm font-medium text-white">{address.fullName}</p>
                <p className="mt-1 text-sm text-gray-400">{address.phone}</p>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                  <br />
                  {address.city}, {address.district} {address.postalCode}
                  <br />
                  {address.country}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!address._id) {
                    return;
                  }

                  setIsCreateOpen(false);
                  setEditingAddressId(address._id);
                  editForm.reset({
                    label: address.label,
                    fullName: address.fullName,
                    phone: address.phone,
                    line1: address.line1,
                    line2: address.line2 ?? '',
                    city: address.city,
                    district: address.district,
                    postalCode: address.postalCode,
                    country: address.country
                  });
                }}
              >
                Edit
              </Button>
              {!address.isDefault ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (!address._id) {
                      return;
                    }

                    try {
                      await setDefaultAddress(address._id);
                      toast.success('Default address updated');
                    } catch (error) {
                      toast.error(getApiErrorMessage(error, 'Unable to update the default address right now.'));
                    }
                  }}
                >
                  Set Default
                </Button>
              ) : null}
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={async () => {
                  if (!address._id) {
                    return;
                  }

                  try {
                    await deleteAddress(address._id);
                    toast.success('Address removed');
                  } catch (error) {
                    toast.error(getApiErrorMessage(error, 'Unable to remove this address right now.'));
                  }
                }}
              >
                Delete
              </Button>
            </div>

            {editingAddressId === address._id ? (
              <form
                className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2"
                onSubmit={editForm.handleSubmit(async (values) => {
                  if (!address._id) {
                    return;
                  }

                  try {
                    await updateAddress(address._id, values);
                    setEditingAddressId(null);
                    toast.success('Address updated');
                  } catch (error) {
                    toast.error(getApiErrorMessage(error, 'Unable to update this address right now.'));
                  }
                })}
              >
                <AddressFields form={editForm} />
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setEditingAddressId(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={editForm.formState.isSubmitting}>
                    Save Address
                  </Button>
                </div>
              </form>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
};
