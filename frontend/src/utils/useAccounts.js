import { useEffect, useMemo, useState } from 'react';
import apiClient from './api';
import { getDefaultBankAccountId } from './bankAccounts';

/**
 * The user's cash / bank accounts, for "Received In" and "Paid From" pickers.
 * The default account comes first and is the default choice.
 */
export default function useAccounts() {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    let ignore = false;

    apiClient.get('/banks')
      .then((response) => {
        if (ignore) return;
        setAccounts([...(response.data || [])].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))));
      })
      .catch((err) => console.error('Error fetching accounts:', err));

    return () => { ignore = true; };
  }, []);

  const defaultAccountId = useMemo(() => getDefaultBankAccountId(accounts), [accounts]);

  return { accounts, defaultAccountId };
}
