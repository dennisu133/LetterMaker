import * as React from "react";

interface RateLimitConfig {
	/** Base cooldown in milliseconds (default: 5000ms = 5 seconds) */
	baseCooldown: number;
	/** Maximum cooldown in milliseconds (default: 60000ms = 1 minute) */
	maxCooldown: number;
	/** Number of submissions before escalating cooldown (default: 3) */
	escalationThreshold: number;
	/** Multiplier for cooldown escalation (default: 2) */
	escalationMultiplier: number;
	/** Time in ms after which escalation resets if no submissions (default: 300000ms = 5 minutes) */
	resetAfter: number;
}

interface RateLimitState {
	/** Number of submissions in current escalation window */
	submissionCount: number;
	/** Current cooldown duration in ms */
	currentCooldown: number;
	/** Remaining cooldown time in ms (updates every second) */
	cooldownRemaining: number;
	/** Absolute deadline for the active cooldown */
	cooldownEndsAt: number | null;
}

interface UseRateLimitReturn {
	/** Whether submission is currently allowed */
	canSubmit: boolean;
	/** Remaining cooldown in seconds (for display) */
	cooldownSeconds: number;
	/** Current cooldown duration in seconds (for display) */
	currentCooldownSeconds: number;
	/** Call this after a successful submission to start the cooldown */
	recordSubmission: () => void;
}

const DEFAULT_CONFIG: RateLimitConfig = {
	baseCooldown: 5000,
	maxCooldown: 60000,
	escalationThreshold: 3,
	escalationMultiplier: 2,
	resetAfter: 5 * 60 * 1000
};

/**
 * Hook for rate limiting form submissions with exponential backoff.
 *
 * Features:
 * - Base cooldown period between submissions
 * - Escalating cooldown for repeated submissions (anti-automation)
 * - Automatic reset after period of inactivity
 * - Only affects successful submissions (call recordSubmission manually)
 *
 * @param config - Optional configuration to override defaults
 */
export function useRateLimit(config?: Partial<RateLimitConfig>): UseRateLimitReturn {
	const options = React.useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

	const [state, setState] = React.useState<RateLimitState>({
		submissionCount: 0,
		currentCooldown: options.baseCooldown,
		cooldownRemaining: 0,
		cooldownEndsAt: null
	});

	// Timer ref for escalation reset
	const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	React.useEffect(() => {
		return () => {
			if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
		};
	}, []);

	React.useEffect(() => {
		if (state.cooldownEndsAt === null) return;

		const timer = setInterval(() => {
			setState((prev) => ({
				...prev,
				cooldownRemaining:
					prev.cooldownEndsAt === null ? 0 : Math.max(0, prev.cooldownEndsAt - Date.now()),
				cooldownEndsAt:
					prev.cooldownEndsAt !== null && prev.cooldownEndsAt <= Date.now()
						? null
						: prev.cooldownEndsAt
			}));
		}, 1000);

		return () => clearInterval(timer);
	}, [state.cooldownEndsAt]);

	// Schedule escalation reset
	const scheduleReset = React.useCallback(() => {
		if (resetTimerRef.current) {
			clearTimeout(resetTimerRef.current);
		}

		resetTimerRef.current = setTimeout(() => {
			setState((prev) => ({
				...prev,
				submissionCount: 0,
				currentCooldown: options.baseCooldown
			}));
		}, options.resetAfter);
	}, [options.baseCooldown, options.resetAfter]);

	// Record a successful submission
	const recordSubmission = React.useCallback(() => {
		setState((prev) => {
			const newCount = prev.submissionCount + 1;

			// Calculate new cooldown with escalation
			let newCooldown = prev.currentCooldown;
			if (newCount > 0 && newCount % options.escalationThreshold === 0) {
				// Escalate cooldown
				newCooldown = Math.min(
					prev.currentCooldown * options.escalationMultiplier,
					options.maxCooldown
				);
			}

			return {
				submissionCount: newCount,
				currentCooldown: newCooldown,
				cooldownRemaining: newCooldown,
				cooldownEndsAt: Date.now() + newCooldown
			};
		});

		// Schedule reset of escalation after inactivity
		scheduleReset();
	}, [
		options.escalationThreshold,
		options.escalationMultiplier,
		options.maxCooldown,
		scheduleReset
	]);

	const canSubmit = state.cooldownRemaining <= 0;
	const cooldownSeconds = Math.ceil(state.cooldownRemaining / 1000);
	const currentCooldownSeconds = Math.ceil(state.currentCooldown / 1000);

	return {
		canSubmit,
		cooldownSeconds,
		currentCooldownSeconds,
		recordSubmission
	};
}
