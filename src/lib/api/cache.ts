import { API_CONFIG } from '$lib/config';

interface CacheEntry<T> {
	data: T;
	expires: number;
}

class Cache {
	private store = new Map<string, CacheEntry<unknown>>();

	get<T>(key: string): T | null {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expires) {
			this.store.delete(key);
			return null;
		}

		return entry.data as T;
	}

	set<T>(key: string, data: T, ttlMs: number = API_CONFIG.CACHE_TTL_MS): void {
		this.store.set(key, {
			data,
			expires: Date.now() + ttlMs
		});
	}

	clear(): void {
		this.store.clear();
	}

	has(key: string): boolean {
		const entry = this.store.get(key);
		if (!entry) return false;
		if (Date.now() > entry.expires) {
			this.store.delete(key);
			return false;
		}
		return true;
	}
}

export const cache = new Cache();
