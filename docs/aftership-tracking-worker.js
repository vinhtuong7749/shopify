const AFTERSHIP_API_BASE = 'https://api.aftership.com/tracking/2026-01';
const TRACKING_FIELDS = [
	'title',
	'order_id',
	'tag',
	'checkpoints',
	'origin_country_region',
	'destination_country_region',
	'destination_state'
].join(',');

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

			if (!env.AFTERSHIP_API_KEY) {
				return jsonResponse({ error: { message: 'AfterShip API key is not configured.' } }, 500, request, env);
			}

			const input = await parseTrackingInput(request);
			const trackingNumber = normalizeTrackingNumber(input.trackingNumber || input.tracking || input.tn);
			const slug = normalizeSlug(input.slug || input.carrier || input.courier);

			if (!/^[A-Z0-9-]{4,48}$/.test(trackingNumber)) {
				return jsonResponse({ error: { message: 'Please enter a valid tracking number.' } }, 400, request, env);
			}

			const existing = await getExistingTracking(trackingNumber, slug, env);
			if (existing) {
				return jsonResponse({ ok: true, tracking: normalizeTracking(existing, trackingNumber) }, 200, request, env);
			}

			const created = await createTracking(trackingNumber, slug, env);
			return jsonResponse({ ok: true, tracking: normalizeTracking(created, trackingNumber) }, 200, request, env);
		} catch (error) {
			const status = error && error.status ? error.status : 502;
			return jsonResponse({
				error: {
					message: error && error.message ? error.message : 'Tracking service is temporarily unavailable.'
				}
			}, status, request, env);
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

function normalizeSlug(value) {
	return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

async function getExistingTracking(trackingNumber, slug, env) {
	const url = new URL(`${apiBase(env)}/trackings`);
	url.searchParams.set('tracking_numbers', trackingNumber);
	url.searchParams.set('limit', '1');
	url.searchParams.set('fields', TRACKING_FIELDS);

	if (slug) {
		url.searchParams.set('slug', slug);
	}

	const response = await aftershipFetch(url.toString(), { method: 'GET' }, env);
	const payload = await parseMaybeJson(response);

	if (!response.ok) {
		if (response.status === 404) return null;
		throw aftershipError(payload, response.status);
	}

	return extractTracking(payload);
}

async function createTracking(trackingNumber, slug, env) {
	const body = {
		tracking_number: trackingNumber
	};

	if (slug) {
		body.slug = slug;
	}

	const response = await aftershipFetch(`${apiBase(env)}/trackings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	}, env);
	const payload = await parseMaybeJson(response);

	if (!response.ok) {
		if (response.status === 400 || response.status === 409) {
			const existing = await getExistingTracking(trackingNumber, slug, env);
			if (existing) return existing;
		}

		throw aftershipError(payload, response.status);
	}

	return extractTracking(payload) || { tracking_number: trackingNumber, slug };
}

function apiBase(env) {
	return env.AFTERSHIP_API_BASE || AFTERSHIP_API_BASE;
}

function aftershipFetch(url, options, env) {
	return fetch(url, {
		...options,
		headers: {
			Accept: 'application/json',
			'as-api-key': env.AFTERSHIP_API_KEY,
			...(options && options.headers ? options.headers : {})
		}
	});
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

function extractTracking(payload) {
	const data = payload && payload.data ? payload.data : payload;

	if (!data) return null;
	if (data.tracking) return data.tracking;
	if (Array.isArray(data.trackings)) return data.trackings[0] || null;
	if (Array.isArray(data)) return data[0] || null;
	if (data.id || data.tracking_number || data.trackingNumber) return data;

	return null;
}

function normalizeTracking(tracking, fallbackNumber) {
	const checkpoints = Array.isArray(tracking.checkpoints) ? tracking.checkpoints.slice() : [];
	const sortedCheckpoints = checkpoints.sort((a, b) => {
		const aTime = Date.parse(a.checkpoint_time || a.created_at || '');
		const bTime = Date.parse(b.checkpoint_time || b.created_at || '');
		return (isNaN(bTime) ? 0 : bTime) - (isNaN(aTime) ? 0 : aTime);
	});
	const latestCheckpoint = sortedCheckpoints[0] || {};
	const carrierSlug = tracking.slug || latestCheckpoint.slug || '';

	return {
		trackingNumber: tracking.tracking_number || fallbackNumber,
		carrier: tracking.courier_name || humanizeSlug(carrierSlug),
		carrierSlug,
		service: tracking.shipment_type || tracking.shipping_method || '',
		status: tracking.tag || latestCheckpoint.tag || 'Tracking received',
		statusCategory: tracking.tag || latestCheckpoint.tag || '',
		statusSummary: tracking.subtag_message || latestCheckpoint.message || latestCheckpoint.subtag_message || '',
		expectedDeliveryDate: tracking.expected_delivery || tracking.expected_delivery_date || tracking.delivery_date || '',
		originCountry: tracking.origin_country_region || '',
		destinationCountry: tracking.destination_country_region || '',
		destinationState: tracking.destination_state || '',
		trackingEvents: sortedCheckpoints.map((checkpoint) => ({
			eventTimestamp: checkpoint.checkpoint_time || checkpoint.created_at || '',
			eventType: checkpoint.message || checkpoint.subtag_message || checkpoint.tag || 'Tracking update received.',
			location: joinLocation([
				checkpoint.city,
				checkpoint.state,
				checkpoint.postal_code,
				checkpoint.country_region || checkpoint.country_region_name
			]),
			eventCity: checkpoint.city || '',
			eventState: checkpoint.state || '',
			eventZIPCode: checkpoint.postal_code || '',
			eventCountry: checkpoint.country_region || checkpoint.country_region_name || ''
		}))
	};
}

function humanizeSlug(slug) {
	if (!slug) return '';

	const names = {
		usps: 'USPS',
		ups: 'UPS',
		fedex: 'FedEx',
		dhl: 'DHL',
		yunexpress: 'YunExpress'
	};

	if (names[slug]) return names[slug];

	return slug
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function joinLocation(parts) {
	return parts.filter(Boolean).join(', ');
}

function aftershipError(payload, status) {
	const message = errorMessage(payload) || fallbackMessage(status);
	const error = new Error(message);
	error.status = status;
	return error;
}

function errorMessage(payload) {
	if (!payload) return '';
	if (typeof payload === 'string') return payload;
	if (payload.message) return payload.message;
	if (payload.meta && payload.meta.message) return payload.meta.message;
	if (payload.error) return errorMessage(payload.error);
	if (payload.errors && payload.errors.length) return errorMessage(payload.errors[0]);
	return '';
}

function fallbackMessage(status) {
	if (status === 401 || status === 403) return 'Tracking API access is not authorized. Please check the AfterShip API key.';
	if (status === 404) return 'No tracking record was found for this number yet.';
	if (status === 429) return 'Tracking lookup is busy right now. Please try again in a few minutes.';
	return 'Tracking request failed.';
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
