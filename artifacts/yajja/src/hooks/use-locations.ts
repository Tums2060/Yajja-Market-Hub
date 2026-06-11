import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";

export interface SavedLocation {
  id: number;
  customerId: number;
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationInput {
  label: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
}

const KEY = ["customer-locations"];

export function useSavedLocations(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => customFetch<SavedLocation[]>("/api/customer/locations"),
    enabled,
  });
}

export function useLocationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: (body: LocationInput) =>
      customFetch<SavedLocation>("/api/customer/locations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<LocationInput> }) =>
      customFetch<SavedLocation>(`/api/customer/locations/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const setDefault = useMutation({
    mutationFn: (id: number) =>
      customFetch<SavedLocation>(`/api/customer/locations/${id}/default`, {
        method: "PUT",
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      customFetch<{ success: boolean }>(`/api/customer/locations/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  });

  return { create, update, setDefault, remove };
}
