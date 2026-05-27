const SEVENTEENTRACK_API_BASE = 'https://api.17track.net/track/v2';
const DEFAULT_LOOKUP_DELAY_MS = 2500;

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

			if (!env.SEVENTEENTRACK_API_KEY) {
				return jsonResponse({ error: { message: '17TRACK API key is not configured.' } }, 500, request, env);
			}

			const input = await parseTrackingInput(request);
			const trackingNumber = normalizeTrackingNumber(input.trackingNumber || input.tracking || input.tn);
			const carrier = normalizeCarrier(input.carrier || input.carrierCode);

			if (!/^[A-Z0-9-]{4,48}$/.test(trackingNumber)) {
				return jsonResponse({ error: { message: 'Please enter a valid tracking number.' } }, 400, request, env);
			}

			await registerTracking(trackingNumber, carrier, env);
			await wait(Number(env.LOOKUP_DELAY_MS) || DEFAULT_LOOKUP_DELAY_MS);

			const tracking = await getTrackingInfo(trackingNumber, carrier, env);
			return jsonResponse({ ok: true, tracking: normalizeTracking(tracking, trackingNumber) }, 200, request, env);
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

function normalizeCarrier(value) {
	if (value === null || value === undefined || value === '') return null;

	const carrier = Number(value);
	return Number.isFinite(carrier) && carrier > 0 ? carrier : null;
}

async function registerTracking(trackingNumber, carrier, env) {
	const payload = await seventeenTrackFetch('register', [{
		number: trackingNumber,
		carrier
	}], env);

	if (hasFatalRejection(payload)) {
		throw apiError(rejectionMessage(payload) || '17TRACK could not register this tracking number.', 400);
	}

	return payload;
}

async function getTrackingInfo(trackingNumber, carrier, env) {
	const payload = await seventeenTrackFetch('gettrackinfo', [{
		number: trackingNumber,
		carrier
	}], env);

	const item = firstAccepted(payload);
	if (item) return item;

	if (hasRejected(payload)) {
		throw apiError(rejectionMessage(payload) || 'No tracking record was found for this number yet.', 404);
	}

	throw apiError('No tracking record was found for this number yet.', 404);
}

async function seventeenTrackFetch(path, body, env) {
	const response = await fetch(`${apiBase(env)}/${path}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'17token': env.SEVENTEENTRACK_API_KEY
		},
		body: JSON.stringify(body)
	});
	const payload = await parseMaybeJson(response);

	if (!response.ok) {
		throw apiError(messageFromPayload(payload) || fallbackMessage(response.status), response.status);
	}

	return payload;
}

function apiBase(env) {
	return (env.SEVENTEENTRACK_API_BASE || SEVENTEENTRACK_API_BASE).replace(/\/$/, '');
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

function firstAccepted(payload) {
	const accepted = payload && payload.data && Array.isArray(payload.data.accepted) ? payload.data.accepted : [];
	return accepted[0] || null;
}

function hasRejected(payload) {
	return !!(payload && payload.data && Array.isArray(payload.data.rejected) && payload.data.rejected.length);
}

function hasFatalRejection(payload) {
	if (!hasRejected(payload)) return false;

	const message = rejectionMessage(payload).toLowerCase();
	return message.includes('invalid') || message.includes('quota') || message.includes('permission') || message.includes('token');
}

function rejectionMessage(payload) {
	const rejected = payload && payload.data && Array.isArray(payload.data.rejected) ? payload.data.rejected : [];
	if (!rejected.length) return '';

	return rejected
		.map((item) => messageFromPayload(item.error || item))
		.filter(Boolean)
		.join(' ');
}

function messageFromPayload(payload) {
	if (!payload) return '';
	if (typeof payload === 'string') return payload;
	if (payload.message) return payload.message;
	if (payload.msg) return payload.msg;
	if (payload.detail) return payload.detail;
	if (payload.error) return messageFromPayload(payload.error);
	if (payload.errors && payload.errors.length) return messageFromPayload(payload.errors[0]);
	return '';
}

function normalizeTracking(item, fallbackNumber) {
	const track = item.track_info || item.track || item;
	const latest = track.latest_status || track.status_info || {};
	const ship = track.shipping_info || {};
	const events = extractEvents(track);
	const provider = firstProvider(track);
	const carrierCode = item.carrier || provider.carrier || provider.key || provider.provider || track.carrier || '';
	const carrierName = provider.name || provider.alias || provider.provider_name || humanizeCarrier(carrierCode);
	const origin = ship.shipper_address || track.origin_info || {};
	const destination = ship.recipient_address || track.destination_info || {};
	const latestEvent = events[0] || {};
	const status = latest.status || track.status || track.tag || latestEvent.description || 'Tracking received';
	const summary = latest.sub_status_descr || latest.sub_status || track.status_text || latestEvent.description || '';

	return {
		trackingNumber: item.number || item.tracking_number || track.number || fallbackNumber,
		carrier: carrierName,
		carrierCode,
		service: track.service || track.service_type || track.shipment_type || '',
		status,
		statusCategory: status,
		statusSummary: summary,
		expectedDeliveryDate: track.expected_delivery || track.estimated_delivery || track.delivery_date || '',
		originCountry: origin.country || track.origin_country || '',
		destinationCountry: destination.country || track.destination_country || '',
		destinationState: destination.state || '',
		trackingEvents: events
	};
}

function firstProvider(track) {
	const providers = track && track.tracking && Array.isArray(track.tracking.providers) ? track.tracking.providers : [];
	return providers[0] || {};
}

function extractEvents(track) {
	let rawEvents = [];

	if (track && track.tracking && Array.isArray(track.tracking.providers)) {
		rawEvents = track.tracking.providers.reduce((events, provider) => {
			return events.concat(Array.isArray(provider.events) ? provider.events : []);
		}, []);
	}

	if (!rawEvents.length && Array.isArray(track.trackingEvents)) rawEvents = track.trackingEvents;
	if (!rawEvents.length && Array.isArray(track.events)) rawEvents = track.events;
	if (!rawEvents.length && Array.isArray(track.milestone)) rawEvents = track.milestone;
	if (!rawEvents.length && (Array.isArray(track.z0) || Array.isArray(track.z1))) {
		rawEvents = (track.z0 || []).concat(track.z1 || []);
	}

	return rawEvents
		.map((event, index) => normalizeEvent(event, index))
		.filter((event) => event.eventType || event.location || event.eventTimestamp)
		.sort((a, b) => {
			const aTime = Date.parse(a.eventTimestamp || '');
			const bTime = Date.parse(b.eventTimestamp || '');

			if (!isNaN(aTime) && !isNaN(bTime) && aTime !== bTime) return bTime - aTime;
			return a.index - b.index;
		});
}

function normalizeEvent(event, index) {
	if (typeof event === 'string') {
		return {
			index,
			eventTimestamp: '',
			eventType: event,
			location: ''
		};
	}

	const address = event.address || {};
	const location = event.location || event.c || joinLocation([
		event.city || address.city,
		event.state || address.state,
		event.postal_code || event.zip || address.postal_code,
		event.country || address.country
	]);
	const eventTimestamp = event.time_iso || event.time_utc || event.timestamp || event.time || event.a || event.date || '';
	const eventType = event.description || event.z || event.stage || event.status || event.event || event.message || '';

	return {
		index,
		eventTimestamp,
		eventType,
		location,
		eventCity: event.city || address.city || '',
		eventState: event.state || address.state || '',
		eventZIPCode: event.postal_code || event.zip || address.postal_code || '',
		eventCountry: event.country || address.country || ''
	};
}

function humanizeCarrier(value) {
	const known = {
		21051: 'USPS',
		100001: 'USPS',
		100002: 'UPS',
		100003: 'FedEx',
		100004: 'DHL',
		100007: 'DHL eCommerce'
	};

	if (known[value]) return known[value];
	if (!value) return '';

	return `Carrier ${value}`;
}

function joinLocation(parts) {
	return parts.filter(Boolean).join(', ');
}

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function apiError(message, status) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function fallbackMessage(status) {
	if (status === 401 || status === 403) return '17TRACK API access is not authorized. Please check the API key.';
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
