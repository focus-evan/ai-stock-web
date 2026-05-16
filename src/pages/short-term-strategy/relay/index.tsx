import { useEffect } from "react";

export default function RelayRedirect() {
	useEffect(() => {
		window.location.replace("/short-term-strategy/emotion-relay");
	}, []);

	return null;
}
