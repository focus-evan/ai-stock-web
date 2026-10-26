import { useCallback, useEffect, useRef, useState } from "react";

/** Abort old reads and remove failed snapshots instead of presenting stale results as current. */
export function useSnapshot<T>(reader: (signal?: AbortSignal) => Promise<T>, failure: string) {
	const [state, setState] = useState<{ data: T | null, loading: boolean, error: string, readAt: Date | null }>({ data: null, loading: true, error: "", readAt: null });
	const sequence = useRef(0);
	const controller = useRef<AbortController>();
	const read = useCallback(async () => {
		const run = ++sequence.current;
		controller.current?.abort();
		const pending = new AbortController();
		controller.current = pending;
		setState(previous => ({ ...previous, loading: true }));
		try {
			const data = await reader(pending.signal);
			if (run === sequence.current && !pending.signal.aborted)
				setState({ data, loading: false, error: "", readAt: new Date() });
		}
		catch {
			if (run === sequence.current && !pending.signal.aborted)
				setState({ data: null, loading: false, error: failure, readAt: null });
		}
	}, [reader, failure]);
	useEffect(() => {
		void read();
		const timer = window.setInterval(() => void read(), 60000);
		return () => {
			sequence.current++;
			controller.current?.abort();
			window.clearInterval(timer);
		};
	}, [read]);
	return { ...state, read };
}
