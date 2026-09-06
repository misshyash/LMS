// Minimal reactive in-memory collection used to power Demo Mode so it mimics
// Firestore's onSnapshot() semantics (subscribe -> immediate value -> live
// updates) without needing any backend.
export class ReactiveStore<T> {
  private items = new Map<string, T>();
  private listeners = new Set<() => void>();

  set(id: string, value: T) {
    this.items.set(id, value);
    this.notify();
  }

  update(id: string, patch: Partial<T>) {
    const existing = this.items.get(id);
    if (!existing) return;
    this.items.set(id, { ...existing, ...patch });
    this.notify();
  }

  delete(id: string) {
    this.items.delete(id);
    this.notify();
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  all(): T[] {
    return Array.from(this.items.values());
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}
