import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const LOG_FILE = join(process.cwd(), 'debug-metformin.log');

export function logToFile(message: string, data?: unknown) {
	const timestamp = new Date().toISOString();
	const logEntry = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n\n`;

	try {
		appendFileSync(LOG_FILE, logEntry, 'utf8');
	} catch {
		// Fallback to console if file write fails
		console.log(message, data);
	}
}

export function clearLogFile() {
	try {
		writeFileSync(LOG_FILE, `=== Debug log started at ${new Date().toISOString()} ===\n\n`, 'utf8');
	} catch {
		// Ignore if file write fails
	}
}
