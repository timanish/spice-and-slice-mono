import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
}

export const useCustomerSearch = () => {
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_number')
        .or(
          `email.ilike.%${query}%,full_name.ilike.%${query}%,phone_number.ilike.%${query}%`
        )
        .limit(10);

      if (searchError) throw searchError;

      setResults(data as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, search };
};
