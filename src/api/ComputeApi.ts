// Compute pool API hook: the live fleet from `GET /compute/fleet` on the main
// das API (the controller's published state, not a database table).
import { useQuery } from '@tanstack/react-query';
import axios, { type AxiosError } from 'axios';
import type { ComputeFleet } from './models/Compute';

/** The controller publishes every 30 s. */
export const COMPUTE_FLEET_REFETCH_MS = 30_000;
/** While the route answers 404 / 503 (not wired, controller down): look again, slowly. */
export const COMPUTE_FLEET_ERROR_REFETCH_MS = 120_000;

// Dev-only fixture. The mock module is imported lazily so it never ships in
// the production bundle.
const USE_COMPUTE_MOCK =
  import.meta.env.DEV && import.meta.env.VITE_COMPUTE_MOCK === 'true';

export const useComputeFleet = () =>
  useQuery<ComputeFleet, AxiosError>({
    queryKey: ['useComputeFleet', '/compute/fleet'],
    queryFn: async () => {
      if (USE_COMPUTE_MOCK) {
        const mock = await import('./mocks/computeFleetMock');
        return mock.mockComputeFleet();
      }
      const baseUrl = import.meta.env.VITE_REACT_APP_BASE_URL;
      const { data } = await axios.get(
        baseUrl ? `${baseUrl}/compute/fleet` : '/compute/fleet',
      );
      return data;
    },
    retry: false,
    refetchInterval: (query) =>
      query.state.status === 'error'
        ? COMPUTE_FLEET_ERROR_REFETCH_MS
        : COMPUTE_FLEET_REFETCH_MS,
  });
