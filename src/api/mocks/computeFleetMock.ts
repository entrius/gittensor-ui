// Dev-only fixture for GET /compute/fleet. Enabled via
// VITE_COMPUTE_MOCK=true; imported lazily so it never ships in production.
// The JSON beside this file is the document the controller's publish.py builds
// for its test fleet; das-gittensor's tests carry the same file.
import type { ComputeFleet } from '../models/Compute';
import fixture from './computeFleet.fixture.json';

/** The fixture moved to "now", as das would serve it a few seconds after a publish. */
export const mockComputeFleet = (): ComputeFleet => {
  const doc = fixture as unknown as Omit<ComputeFleet, 'stale' | 'age_s'>;
  const age = 8;
  const shift = Date.now() / 1000 - age - doc.generated_at;
  const at = (t: number | null | undefined) => (t == null ? null : t + shift);
  return {
    ...doc,
    generated_at: doc.generated_at + shift,
    controller: {
      ...doc.controller,
      last_round_at: at(doc.controller.last_round_at),
    },
    scorecard: doc.scorecard && {
      ...doc.scorecard,
      issued_at: at(doc.scorecard.issued_at),
      valid_until: at(doc.scorecard.valid_until),
    },
    boxes: doc.boxes.map((box, index) => ({
      ...box,
      uid: 40 + index * 7,
      last_check_at: at(box.last_check_at),
      bench_until: at(box.bench_until),
      last_event: box.last_event && {
        ...box.last_event,
        at: at(box.last_event.at),
      },
      cards: box.cards.map((card) => ({
        ...card,
        since: at(card.since),
        ...(card.leased_at !== undefined && { leased_at: at(card.leased_at) }),
        ...(card.last_heartbeat_at !== undefined && {
          last_heartbeat_at: at(card.last_heartbeat_at),
        }),
      })),
    })),
    stale: false,
    age_s: age,
  };
};
