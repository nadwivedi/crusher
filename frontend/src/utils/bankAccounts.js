export const normalizeBankName = (value) => String(value || '').trim().toLowerCase();

export const getBankDisplayName = (bank) => String(bank?.name || '').trim() || 'Cash Account';

export const getDefaultBankAccountId = (banks = []) => {
  const defaultAccount = banks.find((bank) => bank?.isDefault);
  return defaultAccount?._id || banks[0]?._id || '';
};

export const getFirstNonCashBankAccountId = (banks = []) => {
  const firstBank = banks.find((bank) => bank?.type !== 'cash');
  return firstBank?._id || getDefaultBankAccountId(banks);
};

export const inferMethodFromBankId = (banks = [], bankAccountId) => {
  const selectedBank = banks.find((bank) => String(bank._id) === String(bankAccountId));
  if (!selectedBank) return 'cash';
  return selectedBank.type === 'cash' ? 'cash' : 'bank';
};
