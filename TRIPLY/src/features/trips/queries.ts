import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ApiError, useApi } from '@/lib/api';

import type { TripInput } from './schema';
import type { TripDetail, TripSummary } from './types';

const POLL_MS = 3000;
const inFlight = (status?: string) => status === 'pending' || status === 'generating';

export function useTrips() {
  const api = useApi();
  return useQuery({
    queryKey: ['trips'],
    queryFn: async () => (await api<{ trips: TripSummary[] }>('/api/trips')).trips,
    // Keep refreshing while any trip is still being generated.
    refetchInterval: (query) => (query.state.data?.some((t) => inFlight(t.status)) ? POLL_MS : false),
  });
}

export function useTrip(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['trip', id],
    queryFn: async () => (await api<{ trip: TripDetail }>(`/api/trips/${id}`)).trip,
    refetchInterval: (query) => (inFlight(query.state.data?.status) ? POLL_MS : false),
  });
}

export function useCreateTrip() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TripInput) =>
      (await api<{ id: string }>('/api/trips', { method: 'POST', body: input })).id,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export type PickedImage = { uri: string; mimeType: string };

// Uploads a custom cover (multipart). The server stores it in ImageKit and updates the trip.
export function useUpdateTripCover(id: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (image: PickedImage) => {
      const form = new FormData();
      const extension = image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      // React Native's FormData accepts a { uri, name, type } descriptor for files.
      form.append('file', { uri: image.uri, name: `cover.${extension}`, type: image.mimeType } as unknown as Blob);
      return (await api<{ heroImageUrl: string }>(`/api/trips/${id}/cover`, { method: 'POST', body: form }))
        .heroImageUrl;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trip', id] }),
        queryClient.invalidateQueries({ queryKey: ['trips'] }),
      ]),
  });
}

export function useDeleteTrip() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api<{ ok: true }>(`/api/trips/${id}`, { method: 'DELETE' });
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<TripSummary[]>(['trips'], (old) => old?.filter((t) => t.id !== id));
      return queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export type PlaceSuggestion = { placeId: string; name: string; description: string };

function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Destination suggestions. If the server has no Places key (503) the query stays empty and
// the field simply behaves as free text.
export function usePlaceSuggestions(input: string, sessionToken: string, enabled: boolean) {
  const api = useApi();
  const term = useDebounced(input.trim(), 300);
  return useQuery({
    queryKey: ['places', term, sessionToken],
    enabled: enabled && term.length >= 2,
    staleTime: 5 * 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status === 503) && count < 1,
    queryFn: async () =>
      (
        await api<{ suggestions: PlaceSuggestion[] }>(
          `/api/places/autocomplete?${new URLSearchParams({ input: term, sessionToken })}`,
        )
      ).suggestions,
  });
}
