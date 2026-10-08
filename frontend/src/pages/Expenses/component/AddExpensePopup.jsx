import FormPopup from '../../../components/FormPopup';

/** Popup shell for a service expense. The fields are passed in as children by the Expenses page. */
export default function AddExpensePopup({
  open,
  onClose,
  onSubmit,
  loading,
  error = '',
  isEditing = false,
  children,
}) {
  if (!open) return null;

  return (
    <FormPopup
      title={isEditing ? 'Edit Expense' : 'Add Expense'}
      subtitle="Money spent on a service or running cost"
      submitLabel={loading ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
      submitDisabled={loading}
      maxWidth="max-w-xl"
      onSubmit={onSubmit}
      onClose={onClose}
    >
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      {children}
    </FormPopup>
  );
}
