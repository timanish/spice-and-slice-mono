/**
 * React hook wrapping the admin-crud edge function.
 *
 * Provides typed helpers for CRUD operations on admin-managed
 * tables, all authenticated via Clerk JWT with admin role check.
 */

import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface FilterSpec {
  column: string;
  operator: string;
  value: unknown;
}

interface OrderSpec {
  column: string;
  ascending?: boolean;
}

interface AdminCrudRequest {
  table: string;
  operation: "select" | "insert" | "update" | "delete" | "upsert";
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: FilterSpec[];
  select?: string;
  order?: OrderSpec;
  limit?: number;
  offset?: number;
  count?: boolean;
}

async function callAdminCrud(
  token: string | null,
  request: AdminCrudRequest,
) {
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-crud`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `admin-crud request failed (${res.status})`);
  }

  return json;
}

export function useAdminCrud() {
  const { getToken } = useAuth();

  const execute = useCallback(
    async (request: AdminCrudRequest) => {
      const token = await getToken();
      return callAdminCrud(token, request);
    },
    [getToken],
  );

  // Convenience methods

  const select = useCallback(
    (
      table: string,
      options?: {
        columns?: string;
        filters?: FilterSpec[];
        order?: OrderSpec;
        limit?: number;
        offset?: number;
        count?: boolean;
      },
    ) =>
      execute({
        table,
        operation: "select",
        select: options?.columns,
        filters: options?.filters,
        order: options?.order,
        limit: options?.limit,
        offset: options?.offset,
        count: options?.count,
      }),
    [execute],
  );

  const insert = useCallback(
    (
      table: string,
      data: Record<string, unknown> | Record<string, unknown>[],
      selectColumns?: string,
    ) =>
      execute({
        table,
        operation: "insert",
        data,
        select: selectColumns,
      }),
    [execute],
  );

  const update = useCallback(
    (
      table: string,
      data: Record<string, unknown>,
      filters: FilterSpec[],
      selectColumns?: string,
    ) =>
      execute({
        table,
        operation: "update",
        data,
        filters,
        select: selectColumns,
      }),
    [execute],
  );

  const remove = useCallback(
    (table: string, filters: FilterSpec[], selectColumns?: string) =>
      execute({
        table,
        operation: "delete",
        filters,
        select: selectColumns,
      }),
    [execute],
  );

  const upsert = useCallback(
    (
      table: string,
      data: Record<string, unknown> | Record<string, unknown>[],
      selectColumns?: string,
    ) =>
      execute({
        table,
        operation: "upsert",
        data,
        select: selectColumns,
      }),
    [execute],
  );

  return { execute, select, insert, update, remove, upsert };
}
