import { useCallback, useEffect, useRef, useState } from "react";

/** Cancels superseded work and rejects stale responses even if a transport ignores abort. */
export function useLatestRequest<T>() {
	const [data, setData] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const active = useRef<AbortController | null>(null);
	const run = useCallback(async (loader: (signal: AbortSignal) => Promise<T>) => {
		active.current?.abort();
		const controller = new AbortController();
		active.current = controller;
		setData(null);
		setError(null);
		setLoading(true);
		try {
			const result = await loader(controller.signal);
			if (controller.signal.aborted || active.current !== controller)
				return;
			setData(result);
			return result;
		}
		catch {
			if (!controller.signal.aborted && active.current === controller)
				setError("加载失败，请重试。当前结果未更新。");
		}
		finally {
			if (!controller.signal.aborted && active.current === controller)
				setLoading(false);
		}
	}, []);
	useEffect(() => () => active.current?.abort(), []);
	return { data, loading, error, run };
}
