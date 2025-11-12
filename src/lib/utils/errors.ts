export class UserFriendlyError extends Error {
	constructor(
		message: string,
		public userMessage: string,
		public actionable?: string
	) {
		super(message);
		this.name = 'UserFriendlyError';
	}
}

export function getDrugNotFoundError(originalError?: Error): UserFriendlyError {
	return new UserFriendlyError(
		originalError?.message || 'Drug not found',
		"We couldn't find that drug. Please check the spelling or try entering the NDC directly.",
		'Try entering the NDC code instead, or check the drug name spelling.'
	);
}

export function getAPITimeoutError(): UserFriendlyError {
	return new UserFriendlyError(
		'API timeout',
		'The drug database is temporarily unavailable. Please try again in a moment.',
		'Wait a few seconds and try again.'
	);
}

export function getNoActiveNDCError(): UserFriendlyError {
	return new UserFriendlyError(
		'No active NDCs found',
		'No active packages found for this medication. The available options are inactive and should not be used.',
		'Contact the manufacturer or check for alternative medications.'
	);
}

export function getInvalidSIGError(): UserFriendlyError {
	return new UserFriendlyError(
		'SIG parsing failed',
		"We couldn't understand the prescription instructions. Please enter the number of doses per day manually.",
		'Use the "Manual Override: Doses Per Day" field below.'
	);
}

export function getGenericError(message: string, userMessage?: string): UserFriendlyError {
	return new UserFriendlyError(
		message,
		userMessage || 'Something went wrong. Please try again.',
		'If the problem persists, try refreshing the page.'
	);
}
