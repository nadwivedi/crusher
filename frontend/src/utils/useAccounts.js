import { useEffect, useMemo, useState } from 'react';
import apiClient from './api';
import { getDefaultBankAccountId, normalizeBankName } from './bankAccounts';

/**
 * The user's cash / bank accounts, for "Received In" and "Paid From" pickers.
 * Cash Account comes first and is the default choice.
 */
export default function useAccounts() {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let ignore = false;

    apiClient.get('/banks')
      .then((response) => {
        if (ignore) return;
        const isCash = (account) => normalizeBankName(account?.name) === 'cash account';
        setAccounts([...(response.data || [])].sort((a, b) => Number(isCash(b)) - Number(isCash(a))));
      })
      .catch((err) => console.error('Error fetching accounts:', err));

    return () => { ignore = true; };
  }, []);

  const defaultAccountId = useMemo(() => getDefaultBankAccountId(accounts), [accounts]);

  return { accounts, defaultAccountId };
}
