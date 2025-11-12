import { json, type RequestHandler } from '@sveltejs/kit';
import { calculatePrescription } from '$lib/services/calculation';
import type { PrescriptionInput } from '$lib/types';
import type { UserFriendlyError } from '$lib/utils/errors';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input: PrescriptionInput = await request.json();

		const result = await calculatePrescription(input);

		return json(result, { status: 200 });
	} catch (error) {
		// Handle user-friendly errors
		if (error instanceof Error && 'userMessage' in error) {
			const friendlyError = error as UserFriendlyError;
			return json(
				{ error: friendlyError.userMessage, actionable: friendlyError.actionable },
				{ status: 400 }
			);
		}

		// Handle unknown errors
		console.error('Calculation error:', error);
		return json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
	}
};
