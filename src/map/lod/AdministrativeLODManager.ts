import type { GeographicDataManager } from '../data/GeographicDataManager';

/**
 * AdministrativeLODManager manages the semantic expansion and unloading
 * of hierarchical administrative levels (ADM0 -> ADM1 -> ADM2).
 */
export class AdministrativeLODManager {
  private dataManager: GeographicDataManager;
  private focusedCountryIso2: string | null = null;
  private focusedSubdivisionCode: string | null = null;

  constructor(dataManager: GeographicDataManager) {
    this.dataManager = dataManager;
  }

  public setFocusedCountry(iso2: string | null): void {
    this.focusedCountryIso2 = iso2;
    if (iso2) {
      void this.dataManager.ensureAdm1(iso2);
    }
  }

  public setFocusedSubdivision(iso2: string, code: string | number): void {
    this.focusedCountryIso2 = iso2;
    this.focusedSubdivisionCode = String(code);
    void this.dataManager.ensureAdm1(iso2);
    void this.dataManager.ensureAdm2(iso2, code);
  }

  public clearFocus(): void {
    this.focusedCountryIso2 = null;
    this.focusedSubdivisionCode = null;
  }

  public getFocusedCountry(): string | null {
    return this.focusedCountryIso2;
  }

  public getFocusedSubdivision(): string | null {
    return this.focusedSubdivisionCode;
  }
}
