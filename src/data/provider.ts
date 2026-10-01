import type { Hazard, RegionId, RegionState, Snapshot } from '../engine/types';
import { REGIONS } from './regions';
import {
  CALOR_EL_NINO, CALOR_NORMAL, CHUVA_EL_NINO, CHUVA_NORMAL, type Scenario
} from './scenarios';

/**
 * Fonte de dados do painel. Hoje: simulação determinística.
 * No futuro, um `RealDataProvider` implementa esta mesma interface sem mexer no engine.
 */
export interface DataProvider {
  readonly label: string;
  getSnapshot(hazard: Hazard, intensity: number): Snapshot;
}

const lerp = (a: number, b: number, s: number): number => a + (b - a) * s;

export class SimulationDataProvider implements DataProvider {
  readonly label = 'Simulação determinística';

  private scenarios(hazard: Hazard): { normal: Scenario; elNino: Scenario } {
    return hazard === 'chuva'
      ? { normal: CHUVA_NORMAL, elNino: CHUVA_EL_NINO }
      : { normal: CALOR_NORMAL, elNino: CALOR_EL_NINO };
  }

  /** Interpola linearmente clima, ocorrências e equipes livres entre os dois cenários (contagens arredondadas). */
  getSnapshot(hazard: Hazard, intensity: number): Snapshot {
    const s = Math.min(Math.max(intensity, 0), 1);
    const { normal, elNino } = this.scenarios(hazard);
    const weather = normal.weather.map((w0, t) => lerp(w0, elNino.weather[t], s));
    const states = {} as Record<RegionId, RegionState[]>;
    for (const region of REGIONS) {
      states[region.id] = normal.states[region.id].map((p0, t) => {
        const p1 = elNino.states[region.id][t];
        return {
          active: Math.round(lerp(p0[0], p1[0], s)),
          teamsFree: Math.min(region.teamsTotal, Math.round(lerp(p0[1], p1[1], s)))
        };
      });
    }
    return { hazard, regions: REGIONS, weather, states };
  }
}
