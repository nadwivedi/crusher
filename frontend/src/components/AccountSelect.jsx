/**
 * Dropdown of the user's cash / bank accounts ("Received In" / "Paid From").
 * Pass the list and default from useAccounts(); an empty value shows the default account.
 */
export default function AccountSelect({ accounts, defaultAccountId, value, onChange, name = 'account', className = 'input', disabled = false }) {
  return (
    <select name={name} value={value || defaultAccountId || ''} onChange={onChange} className={className} disabled={disabled}>
      {accounts.length === 0 && <option value="">Cash Account</option>}
      {accounts.map((account) => (
        <option key={account._id} value={account._id}>{account.name}</option>
      ))}
    </select>
  );
}
