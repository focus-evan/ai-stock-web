import { useEffect } from "react";

export default function SentimentRedirect() {
	useEffect(() => {
		window.location.replace("/short-term-strategy/emotion-relay");
	}, []);

	return null;
}
