type Fields = Record<string, string | number | boolean | undefined>;

/**
 * One JSON object per line.
 *
 * Vercel captures stdout, so writing JSON rather than prose means the logs can
 * be filtered and counted instead of read by eye.
 *
 * Question text and passage text are never logged: people upload private
 * documents, and the timings and counts here are enough to see what happened.
 */
export function log(event: string, fields: Fields = {}) {
	console.log(JSON.stringify({ event, at: new Date().toISOString(), ...fields }));
}
