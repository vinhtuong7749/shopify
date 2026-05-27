let cachedToken = null;
let cachedTokenExpiresAt = 0;

const USPS_TOKEN_URL = 'https://apis.usps.com/oauth2/v3/token';
const USPS_TRACKING_URL = 'https://apis.usps.com/tracking/v3r2/tracking';

export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request, env)
			});
		}

		try {
			if (request.method !== 'GET' && request.method !== 'POST') {
				return jsonResponse({ error: { message: 'Method not allowed.' } }, 405, request, env);
			}

			const input = await parseTrackingInput(request);
			const trackingNumber = normalizeTrackingNumber(input.trackingNumber || input.tracking || input.tn);

			if (!/^[A-Z0-9]{4,34}$/.test(trackingNumber)) {
				return jsonResponse({ error: { message: 'Please enter a valid USPS tracking number.' } }, 400, request, env);
			}

			const token = await getUspsToken(env);
			const requestBody = [{
				trackingNumber,
				...(input.mailingDate ? { mailingDate: String(input.mailingDate) } : {}),
				...(input.destinationZIPCode ? { destinationZIPCode: String(input.destinationZIPCode) } : {})
			}];

			const uspsResponse = await fetch(env.USPS_TRACKING_URL || USPS_TRACKING_URL, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
					...(request.headers.get('CF-Connecting-IP') ? { 'X-Forwarded-For': request.headers.get('CF-Connecting-IP') } : {})
				},
				body: JSON.stringify(requestBody)
			});

			const payload = await parseMaybeJson(uspsResponse);

			if (!uspsResponse.ok) {
				return jsonResponse(normalizeUspsError(payload, uspsResponse.status), uspsResponse.status, request, env);
			}

			return jsonResponse(payload, uspsResponse.status, request, env);
		} catch (error) {
			return jsonResponse({
				error: {
					message: error && error.message ? error.message : 'Tracking service is temporarily unavailable.'
				}
			}, 502, request, env);
		}
	}
};

async function parseTrackingInput(request) {
	const url = new URL(request.url);

	if (request.method === 'GET') {
		return Object.fromEntries(url.searchParams.entries());
	}

	const contentType = request.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		return await request.json();
	}

	const formData = await request.formData();
	return Object.fromEntries(formData.entries());
}

function normalizeTrackingNumber(value) {
	return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

async function getUspsToken(env) {
	const now = Date.now();
	if (cachedToken && cachedTokenExpiresAt > now + 60000) {
		return cachedToken;
	}

	if (!env.USPS_CLIENT_ID || !env.USPS_CLIENT_SECRET) {
		throw new Error('USPS credentials are not configured.');
	}

	const response = await fetch(env.USPS_TOKEN_URL || USPS_TOKEN_URL, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			client_id: env.USPS_CLIENT_ID,
			client_secret: env.USPS_CLIENT_SECRET,
			grant_type: 'client_credentials'
		})
	});

	const payload = await parseMaybeJson(response);

	if (!response.ok || !payload || !payload.access_token) {
		throw new Error('USPS OAuth token request failed.');
	}

	cachedToken = payload.access_token;
	cachedTokenExpiresAt = now + Math.max((Number(payload.expires_in) || 300) - 60, 60) * 1000;

	return cachedToken;
}

async function parseMaybeJson(response) {
	const text = await response.text();
	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch (error) {
		return { error: { message: text } };
	}
}

function normalizeUspsError(payload, status) {
	if (payload && (payload.error || payload.errors || payload.message)) {
		return payload;
	}

	if (status === 401 || status === 403) {
		return { error: { message: 'USPS tracking access is not authorized for this shipment.' } };
	}

	if (status === 404) {
		return { error: { message: 'No USPS tracking record was found for this number yet.' } };
	}

	if (status === 429) {
		return { error: { message: 'USPS tracking is busy right now. Please try again in a few minutes.' } };
	}

	return { error: { message: 'USPS tracking request failed.' } };
}

function corsHeaders(request, env) {
	const requestOrigin = request.headers.get('Origin') || '';
	const allowedOrigin = env.ALLOWED_ORIGIN || requestOrigin || '*';

	return {
		'Access-Control-Allow-Origin': allowedOrigin,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Accept',
		Vary: 'Origin'
	};
}

function jsonResponse(payload, status, request, env) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			...corsHeaders(request, env),
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}
