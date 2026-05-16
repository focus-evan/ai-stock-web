import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RelayRedirect() {
	const navigate = useNavigate();

	useEffect(() => {
		navigate("/short-term-strategy/emotion-relay", { replace: true });
	}, [navigate]);

	return null;
}
