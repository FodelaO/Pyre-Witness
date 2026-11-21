/** Admits one live tour at a time; Stop, Escape, and unmount cancel the run that holds it. */
export class TourLock {
  private active: AbortController | null = null;

  get running(): boolean {
    return this.active !== null;
  }

  /** Returns a controller for a new run, or null while another run still holds the lock. */
  acquire(): AbortController | null {
    if (this.active) return null;
    this.active = new AbortController();
    return this.active;
  }

  /** Frees the lock only for the run that still holds it; a stopped run never frees a newer one. */
  release(controller: AbortController): boolean {
    if (this.active !== controller) return false;
    this.active = null;
    return true;
  }

  stop(): void {
    const current = this.active;
    this.active = null;
    current?.abort();
  }
}

// One launcher exists; a module-level lock also covers remounts and hot reloads.
export const tourLock = new TourLock();
