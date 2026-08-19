import { vi } from "vitest";

const storage = new Map<string, string>();

Object.defineProperty(window, "localStorage", {
	configurable: true,
	value: {
		clear: () => storage.clear(),
		getItem: (key: string) => storage.get(key) ?? null,
		removeItem: (key: string) => storage.delete(key),
		setItem: (key: string, value: string) => storage.set(key, String(value))
	}
});

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}))
});

class ResizeObserverMock implements ResizeObserver {
	disconnect = vi.fn();
	observe = vi.fn();
	unobserve = vi.fn();
}

globalThis.ResizeObserver = ResizeObserverMock;

Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();
