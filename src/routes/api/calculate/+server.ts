import { json, type RequestHandler } from '@sveltejs/kit';
import { calculatePrescription } from '$lib/services/calculation';
import type { PrescriptionInput } from '$lib/types';
import type { UserFriendlyError } from '$lib/utils/errors';

export const POST: RequestHandler = async ({ request }) => {
	let input: PrescriptionInput | null = null;
	try {
		input = await request.json();
		console.log('[API] Received request:', JSON.stringify(input, null, 2));

		const result = await calculatePrescription(input);
		console.log('[API] Calculation successful');

		return json(result, { status: 200 });
	} catch (error) {
		// Handle user-friendly errors
		if (error instanceof Error && 'userMessage' in error) {
			const friendlyError = error as UserFriendlyError;
			console.error('[API] User-friendly error (400):', {
				message: friendlyError.message,
				userMessage: friendlyError.userMessage,
				actionable: friendlyError.actionable,
				input: input ? JSON.stringify(input, null, 2) : 'N/A'
			});
			return json(
				{ error: friendlyError.userMessage, actionable: friendlyError.actionable },
				{ status: 400 }
			);
		}

		// Handle unknown errors
		console.error('[API] Unexpected error (500):', error);
		return json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
	}
};
