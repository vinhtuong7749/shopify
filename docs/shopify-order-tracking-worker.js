const SHOPIFY_API_VERSION = '2026-04';
const DEFAULT_ORDER_LIMIT = 25;
const DEFAULT_TRACKING_LOOKUP_ENDPOINT = 'https://tracking-api-ru28.onrender.com/api/search';
const GENERIC_LOOKUP_ERROR = 'Please check your email and order number, then try again.';
const GENERIC_NOT_FOUND_ERROR = 'No tracking is available for those details yet. Please check your email and order number.';
const RATE_LIMIT_ERROR = 'Too many lookup attempts. Please wait a few minutes and try again.';
const TRACKING_PAGE_PATCH_JS = String.raw`
(function () {
	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback, { once: true });
			return;
		}

		callback();
	}

	function runScripts(root) {
		root.querySelectorAll('script').forEach(function (oldScript) {
			var script = document.createElement('script');
			Array.prototype.slice.call(oldScript.attributes).forEach(function (attr) {
				script.setAttribute(attr.name, attr.value);
			});
			script.text = oldScript.textContent || '';
			oldScript.replaceWith(script);
		});
	}

	ready(function () {
		if (window.__camoSignalTrackingPatchApplied) return;
		if (window.location.pathname !== '/pages/track-your-order') return;
		if (document.querySelector('[data-order-form]') && document.querySelector('[data-tracking-form]')) return;

		var section = document.querySelector('[id^="shopify-section-"][id$="__tracking"]');
		if (!section || section.id.indexOf('shopify-section-') !== 0) return;

		var sectionId = section.id.replace('shopify-section-', '');
		var url = window.location.pathname + '?sections=' + encodeURIComponent(sectionId) + '&_=' + Date.now();

		window.__camoSignalTrackingPatchApplied = true;
		fetch(url, { credentials: 'same-origin' })
			.then(function (response) {
				if (!response.ok) throw new Error('Could not refresh tracking section.');
				return response.json();
			})
			.then(function (payload) {
				var html = payload && payload[sectionId];
				if (!html || html.indexOf('data-order-form') === -1 || html.indexOf('data-tracking-form') === -1) return;

				var template = document.createElement('template');
				template.innerHTML = html.trim();
				var freshSection = template.content.firstElementChild;
				if (!freshSection) return;

				section.replaceWith(freshSection);
				runScripts(freshSection);
			})
			.catch(function () {
				window.__camoSignalTrackingPatchApplied = false;
			});
	});
})();`;

const ORDERS_BY_EMAIL_QUERY = `
	query OrdersByEmail($query: String!, $first: Int!) {
		orders(first: $first, sortKey: CREATED_AT, reverse: true, query: $query) {
			edges {
				node {
					id
					name
					email
					createdAt
					displayFulfillmentStatus
					fulfillments(first: 10) {
						id
						status
						displayStatus
						createdAt
						updatedAt
						estimatedDeliveryAt
						trackingInfo(first: 10) {
							company
							number
							url
						}
					}
				}
			}
		}
	}
`;

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === '/tracking-page-patch.js') {
			return new Response(TRACKING_PAGE_PATCH_JS, {
				status: 200,
				headers: {
					'Content-Type': 'application/javascript; charset=utf-8',
					'Cache-Control': 'no-store, max-age=0',
					'X-Content-Type-Options': 'nosniff'
				}
			});
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(request, env)
			});
		}

		try {
			if (request.method !== 'POST') {
				return jsonResponse({ error: { message: 'Method not allowed.' } }, 405, request, env);
			}

			const requestGuard = validateRequestContext(request, env);
			if (requestGuard) return requestGuard;

			const input = await parseLookupInput(request, env);
			const email = normalizeEmail(input.email);
			const orderNumber = normalizeOrderNumber(input.orderNumber || input.order || input.name || input.orderName);
			const trackingNumber = normalizeTrackingNumber(input.trackingNumber || input.tracking || input.number);

			const botGuard = validateBotFields(input, request, env);
			if (botGuard) return botGuard;

			if (trackingNumber && !email && !orderNumber) {
				const trackingRateLimit = await enforceTrackingRateLimits(request, { trackingNumber }, env);
				if (trackingRateLimit) return trackingRateLimit;

				if (!isValidTrackingNumber(trackingNumber)) {
					return jsonResponse({ error: { message: 'Please check the tracking number and try again.' } }, 400, request, env);
				}

				const tracking = await lookupTrackingNumber(trackingNumber, env);
				return jsonResponse({ ok: true, tracking }, 200, request, env);
			}

			const rateLimit = await enforceRateLimits(request, { email, orderNumber }, env);
			if (rateLimit) return rateLimit;

			if (!isValidEmail(email) || !isValidOrderNumber(orderNumber)) {
				return jsonResponse({ error: { message: GENERIC_LOOKUP_ERROR } }, 400, request, env);
			}

			const order = await findOrder(email, orderNumber, env);
			if (!order) {
				return jsonResponse({ error: { message: GENERIC_NOT_FOUND_ERROR } }, 404, request, env);
			}

			const trackingCandidates = trackingCandidatesForOrder(order);
			if (!trackingCandidates.length) {
				return jsonResponse({ error: { message: GENERIC_NOT_FOUND_ERROR } }, 404, request, env);
			}

			const tracking = await lookupBestTrackingForOrder(order, trackingCandidates, env);
			if (!tracking) {
				return jsonResponse({ error: { message: GENERIC_NOT_FOUND_ERROR } }, 404, request, env);
			}

			return jsonResponse({ ok: true, order: orderPayload(order), tracking }, 200, request, env);
		} catch (error) {
			return jsonResponse({
				error: {
					message: error && error.message ? error.message : 'Order tracking is temporarily unavailable.'
				}
			}, error && error.status ? error.status : 502, request, env);
		}
	}
};

async function parseLookupInput(request, env) {
	const contentLength = Number(request.headers.get('content-length') || 0);
	const maxBodyBytes = envNumber(env, 'MAX_BODY_BYTES', 2048);
	if (contentLength > maxBodyBytes) {
		throw apiError('Request is too large.', 413);
	}

	const contentType = request.headers.get('content-type') || '';
	if (contentType.includes('application/json')) {
		try {
			const input = await request.json();
			return input && typeof input === 'object' ? input : {};
		} catch (error) {
			throw apiError(GENERIC_LOOKUP_ERROR, 400);
		}
	}

	throw apiError('Unsupported content type.', 415);
}

function validateRequestContext(request, env) {
	if (envBool(env, 'REQUIRE_STOREFRONT_ORIGIN', true) && !requestIsFromAllowedOrigin(request, env)) {
		return jsonResponse({ error: { message: 'Request is not allowed.' } }, 403, request, env);
	}

	const contentType = request.headers.get('content-type') || '';
	if (envBool(env, 'REQUIRE_JSON_POST', true) && !contentType.includes('application/json')) {
		return jsonResponse({ error: { message: 'Unsupported content type.' } }, 415, request, env);
	}

	return null;
}

function requestIsFromAllowedOrigin(request, env) {
	const origin = request.headers.get('Origin') || '';
	const referer = request.headers.get('Referer') || '';

	if (origin) return originIsAllowed(origin, env);
	if (!referer) return false;

	try {
		return originIsAllowed(new URL(referer).origin, env);
	} catch (error) {
		return false;
	}
}

function originIsAllowed(origin, env) {
	const allowed = String(env.ALLOWED_ORIGIN || 'https://camosignal.com')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);

	return allowed.includes(origin);
}

function validateBotFields(input, request, env) {
	const honeypot = String(input.website || input.company || input.url || '').trim();
	if (honeypot) {
		return jsonResponse({ error: { message: GENERIC_LOOKUP_ERROR } }, 400, request, env);
	}

	if (envBool(env, 'REQUIRE_FORM_TIMING', true)) {
		const elapsed = Number(input.formElapsedMs || 0);
		const minElapsed = envNumber(env, 'MIN_FORM_ELAPSED_MS', 700);
		if (!Number.isFinite(elapsed) || elapsed < minElapsed) {
			return jsonResponse({ error: { message: RATE_LIMIT_ERROR } }, 429, request, env, {
				'Retry-After': '60'
			});
		}
	}

	return null;
}

async function enforceRateLimits(request, lookup, env) {
	const kv = env.ORDER_TRACKING_RATE_LIMIT;
	if (!kv || envBool(env, 'RATE_LIMIT_DISABLED', false)) return null;

	const ipHash = await sha256Hex(clientIp(request));
	const emailHash = await sha256Hex(lookup.email || 'invalid-email');
	const pairHash = await sha256Hex(`${lookup.email || ''}\n${lookup.orderNumber || ''}`);
	const checks = [
		rateLimitCheck(`ip:${ipHash}`, envNumber(env, 'RATE_LIMIT_IP_MAX', 8), envNumber(env, 'RATE_LIMIT_IP_WINDOW_SECONDS', 300)),
		rateLimitCheck(`ip-day:${ipHash}`, envNumber(env, 'RATE_LIMIT_IP_DAY_MAX', 60), envNumber(env, 'RATE_LIMIT_IP_DAY_WINDOW_SECONDS', 86400)),
		rateLimitCheck(`email:${emailHash}`, envNumber(env, 'RATE_LIMIT_EMAIL_MAX', 12), envNumber(env, 'RATE_LIMIT_EMAIL_WINDOW_SECONDS', 3600)),
		rateLimitCheck(`pair:${pairHash}`, envNumber(env, 'RATE_LIMIT_PAIR_MAX', 5), envNumber(env, 'RATE_LIMIT_PAIR_WINDOW_SECONDS', 3600))
	];

	for (const check of checks) {
		const allowed = await incrementRateLimit(kv, check);
		if (!allowed) {
			return jsonResponse({ error: { message: RATE_LIMIT_ERROR } }, 429, request, env, {
				'Retry-After': String(Math.max(60, check.windowSeconds))
			});
		}
	}

	return null;
}

async function enforceTrackingRateLimits(request, lookup, env) {
	const kv = env.ORDER_TRACKING_RATE_LIMIT;
	if (!kv || envBool(env, 'RATE_LIMIT_DISABLED', false)) return null;

	const ipHash = await sha256Hex(clientIp(request));
	const trackingHash = await sha256Hex(lookup.trackingNumber || 'invalid-tracking');
	const checks = [
		rateLimitCheck(`ip:${ipHash}`, envNumber(env, 'RATE_LIMIT_IP_MAX', 8), envNumber(env, 'RATE_LIMIT_IP_WINDOW_SECONDS', 300)),
		rateLimitCheck(`ip-day:${ipHash}`, envNumber(env, 'RATE_LIMIT_IP_DAY_MAX', 60), envNumber(env, 'RATE_LIMIT_IP_DAY_WINDOW_SECONDS', 86400)),
		rateLimitCheck(`tracking:${trackingHash}`, envNumber(env, 'RATE_LIMIT_TRACKING_MAX', 200), envNumber(env, 'RATE_LIMIT_TRACKING_WINDOW_SECONDS', 3600))
	];

	for (const check of checks) {
		const allowed = await incrementRateLimit(kv, check);
		if (!allowed) {
			return jsonResponse({ error: { message: RATE_LIMIT_ERROR } }, 429, request, env, {
				'Retry-After': String(Math.max(60, check.windowSeconds))
			});
		}
	}

	return null;
}

function rateLimitCheck(name, limit, windowSeconds) {
	const boundedWindow = Math.max(60, Math.floor(windowSeconds));
	const boundedLimit = Math.max(1, Math.floor(limit));
	const bucket = Math.floor(Date.now() / (boundedWindow * 1000));

	return {
		key: `rl:${name}:${boundedWindow}:${bucket}`,
		limit: boundedLimit,
		windowSeconds: boundedWindow
	};
}

async function incrementRateLimit(kv, check) {
	const current = Number(await kv.get(check.key)) || 0;
	if (current >= check.limit) return false;

	await kv.put(check.key, String(current + 1), {
		expirationTtl: Math.max(120, check.windowSeconds * 2)
	});

	return true;
}

function clientIp(request) {
	return request.headers.get('CF-Connecting-IP') ||
		request.headers.get('X-Forwarded-For') ||
		request.headers.get('X-Real-IP') ||
		'unknown';
}

async function sha256Hex(value) {
	const bytes = new TextEncoder().encode(String(value));
	const digest = await crypto.subtle.digest('SHA-256', bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeEmail(value) {
	return String(value || '').trim().toLowerCase();
}

function normalizeOrderNumber(value) {
	return String(value || '').trim().replace(/\s+/g, '').replace(/^#+/, '').toUpperCase();
}

function normalizeTrackingNumber(value) {
	return String(value || '').trim().replace(/\s+/g, '').toUpperCase();
}

function isValidEmail(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function isValidOrderNumber(value) {
	return /^[A-Z0-9-]{2,32}$/.test(value);
}

function isValidTrackingNumber(value) {
	return /^[A-Z0-9]{4,34}$/.test(value);
}

async function findOrder(email, orderNumber, env) {
	const data = await shopifyGraphql(ORDERS_BY_EMAIL_QUERY, {
		query: `email:${shopifySearchQuote(email)}`,
		first: boundedOrderLimit(env.ORDER_LOOKUP_LIMIT)
	}, env);
	const orders = data && data.orders && Array.isArray(data.orders.edges) ? data.orders.edges.map((edge) => edge.node) : [];

	return orders.find((order) => orderMatches(order, orderNumber)) || null;
}

function boundedOrderLimit(value) {
	const limit = Number(value) || DEFAULT_ORDER_LIMIT;
	return Math.min(Math.max(limit, 1), 50);
}

function orderMatches(order, orderNumber) {
	const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
	const candidates = [
		order && order.name,
		order && order.name ? order.name.replace(/^#/, '') : ''
	].map(normalizeOrderNumber);

	return candidates.includes(normalizedOrderNumber);
}

function trackingCandidatesForOrder(order) {
	const fulfillments = Array.isArray(order && order.fulfillments) ? order.fulfillments : [];
	const candidates = [];
	const seen = new Set();

	for (const fulfillment of fulfillments) {
		const trackingInfo = Array.isArray(fulfillment.trackingInfo) ? fulfillment.trackingInfo : [];
		for (const info of trackingInfo) {
			const number = normalizeTrackingNumber(info && info.number);
			if (!number || seen.has(number)) {
				continue;
			}

			seen.add(number);
			candidates.push({ fulfillment, info });
		}
	}

	return candidates
		.sort((left, right) => trackingCandidateTime(right) - trackingCandidateTime(left))
		.slice(0, 10);
}

function trackingCandidateTime(candidate) {
	const fulfillment = candidate && candidate.fulfillment ? candidate.fulfillment : {};
	const timestamp = fulfillment.updatedAt || fulfillment.createdAt || '';
	const value = timestamp ? new Date(timestamp).getTime() : 0;

	return Number.isFinite(value) ? value : 0;
}

function orderPayload(order) {
	return {
		name: order.name,
		fulfillmentStatus: order.displayFulfillmentStatus
	};
}

async function lookupBestTrackingForOrder(order, candidates, env) {
	let bestTracking = null;
	let bestScore = -1;

	for (const candidate of candidates) {
		const baseTracking = normalizeShopifyTracking(order, candidate);
		const enrichedTracking = await enrichTracking(baseTracking, env);
		const tracking = enrichedTracking || baseTracking;
		const score = trackingRichnessScore(tracking) + (enrichedTracking ? 1000 : 0);

		if (!bestTracking || score > bestScore) {
			bestTracking = tracking;
			bestScore = score;
		}
	}

	return bestTracking;
}

function normalizeShopifyTracking(order, tracking) {
	const fulfillment = tracking.fulfillment || {};
	const info = tracking.info || {};
	const status = fulfillment.displayStatus || fulfillment.status || order.displayFulfillmentStatus || 'Tracking received';
	const summary = info.number ? `Tracking number found for ${order.name}.` : `Tracking link found for ${order.name}.`;

	return {
		order: orderPayload(order),
		trackingNumber: info.number || '',
		carrier: info.company || '',
		service: status,
		status,
		statusCategory: status,
		statusSummary: summary,
		expectedDeliveryDate: fulfillment.estimatedDeliveryAt || '',
		trackingUrl: info.url || '',
		trackingEvents: [{
			eventTimestamp: fulfillment.updatedAt || fulfillment.createdAt || order.createdAt || '',
			eventType: summary,
			location: info.company || ''
		}]
	};
}

async function enrichTracking(baseTracking, env) {
	const endpoint = trackingLookupEndpoint(env);

	if (!endpoint || !baseTracking.trackingNumber) {
		return null;
	}

	try {
		const payload = await fetchCarrierTracking(baseTracking.trackingNumber, endpoint, env);
		const tracking = unwrapTrackingPayload(payload);

		if (!tracking) return null;

		return mergeCarrierTracking(baseTracking, tracking);
	} catch (error) {
		return null;
	}
}

async function lookupTrackingNumber(trackingNumber, env) {
	const endpoint = trackingLookupEndpoint(env);
	if (!endpoint) {
		throw apiError('Tracking service is not configured.', 503);
	}

	const payload = await fetchCarrierTracking(trackingNumber, endpoint, env);
	const tracking = unwrapTrackingPayload(payload);
	if (!tracking) {
		throw apiError('No tracking record was found for this number yet.', 404);
	}

	return {
		...tracking,
		trackingNumber: trackingNumberFromPayload(tracking, trackingNumber)
	};
}

function mergeCarrierTracking(baseTracking, tracking) {
	return {
		...tracking,
		order: baseTracking.order,
		trackingNumber: trackingNumberFromPayload(tracking, baseTracking.trackingNumber),
		carrier: carrierFromPayload(tracking, baseTracking.carrier),
		trackingUrl: trackingUrlFromPayload(tracking, baseTracking.trackingUrl)
	};
}

function trackingNumberFromPayload(tracking, fallback) {
	return String(
		(tracking && (
			tracking.trackingNumber ||
			tracking.tracking_number ||
			tracking.number ||
			tracking.associatedTrackingNumber ||
			tracking.ID ||
			tracking['@ID']
		)) ||
		fallback ||
		''
	).trim();
}

function carrierFromPayload(tracking, fallback) {
	return String(
		(tracking && (
			tracking.carrier ||
			tracking.carrierName ||
			tracking.courierName ||
			tracking.courier_slug ||
			tracking.slug ||
			tracking.provider
		)) ||
		fallback ||
		''
	).trim();
}

function trackingUrlFromPayload(tracking, fallback) {
	return String(
		(tracking && (
			tracking.trackingUrl ||
			tracking.tracking_url ||
			tracking.trackingLink ||
			tracking.tracking_link ||
			tracking.url ||
			tracking.URL
		)) ||
		fallback ||
		''
	).trim();
}

function summaryFromPayload(tracking) {
	return String(
		(tracking && (
			tracking.statusSummary ||
			tracking.subtagMessage ||
			tracking.subtag_message ||
			tracking.TrackSummary ||
			tracking.summary ||
			tracking.message
		)) ||
		''
	).trim();
}

function deliveryFromPayload(tracking) {
	if (!tracking) return '';

	const delivery = tracking.deliveryDateExpectation || {};
	return String(
		delivery.predictedDeliveryDate ||
		delivery.expectedDeliveryDate ||
		delivery.guaranteedDeliveryDate ||
		tracking.expectedDelivery ||
		tracking.expectedDeliveryDate ||
		tracking.estimatedDelivery ||
		tracking.estimatedDeliveryDate ||
		tracking.expected_delivery ||
		tracking.expected_delivery_date ||
		tracking.estimated_delivery ||
		tracking.estimated_delivery_date ||
		tracking.estDeliveryDate ||
		tracking.eta ||
		tracking.ExpectedDeliveryDate ||
		tracking.GuaranteedDeliveryDate ||
		''
	).trim();
}

function hasStatusValue(tracking) {
	return !!String(
		(tracking && (
			tracking.status ||
			tracking.statusCategory ||
			tracking.tag ||
			tracking.subtag
		)) ||
		''
	).trim();
}

function trackingEventCount(tracking) {
	if (!tracking) return 0;

	const candidates = [
		tracking.trackingEvents,
		tracking.checkpoints,
		tracking.events,
		tracking.TrackDetail
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) return candidate.length;
		if (candidate && typeof candidate === 'object') return 1;
	}

	return 0;
}

function trackingRichnessScore(tracking) {
	const status = String(
		(tracking && (
			tracking.status ||
			tracking.statusCategory ||
			tracking.tag ||
			tracking.subtag
		)) ||
		''
	).trim();
	let score = 0;

	score += trackingEventCount(tracking) * 10;
	if (summaryFromPayload(tracking)) score += 6;
	if (deliveryFromPayload(tracking)) score += 4;
	if (carrierFromPayload(tracking, '')) score += 3;
	if (trackingNumberFromPayload(tracking, '')) score += 2;
	if (status && !/^\d+$/.test(status)) score += 4;
	if (status && /^\d+$/.test(status)) score += 1;

	return score;
}

function trackingLookupEndpoint(env) {
	const endpoint = String(env.TRACKING_LOOKUP_ENDPOINT || DEFAULT_TRACKING_LOOKUP_ENDPOINT).trim();
	if (!endpoint || endpoint.toLowerCase() === 'none' || endpoint.toLowerCase() === 'off') {
		return '';
	}

	return endpoint;
}

async function fetchCarrierTracking(trackingNumber, endpoint, env) {
	const method = String(env.TRACKING_LOOKUP_METHOD || 'POST').toUpperCase();
	const hasTrackingPlaceholder = endpoint.indexOf('{trackingNumber}') !== -1;
	const endpointUrl = endpoint.replace(/\{trackingNumber\}/g, encodeURIComponent(trackingNumber));
	const url = new URL(endpointUrl);
	const options = {
		method: method === 'GET' ? 'GET' : 'POST',
		headers: { Accept: 'application/json' }
	};
	const trackingSecret = String(env.TRACKING_LOOKUP_SECRET || '').trim();
	if (trackingSecret) {
		options.headers['X-CamoSignal-Tracking-Secret'] = trackingSecret;
	}
	options.headers['X-CamoSignal-Source'] = 'order-tracking-worker';

	if (options.method === 'GET') {
		if (!hasTrackingPlaceholder) {
			url.searchParams.set('trackingNumber', trackingNumber);
		}
	} else {
		options.headers['Content-Type'] = 'application/json';
		options.body = JSON.stringify({
			trackingNumber,
			trackingNumbers: [trackingNumber]
		});
	}

	const response = await fetch(url.toString(), options);
	const payload = await parseMaybeJson(response);

	if (!response.ok) {
		throw apiError(messageFromPayload(payload) || 'Carrier tracking lookup failed.', response.status);
	}

	return payload;
}

function unwrapTrackingPayload(payload) {
	if (!payload) return null;
	if (Array.isArray(payload)) return payload[0] || null;
	if (payload.tracking) return unwrapTrackingPayload(payload.tracking);
	if (payload.track) return unwrapTrackingPayload(payload.track);
	if (payload.result) return unwrapTrackingPayload(payload.result);
	if (payload.results) return unwrapTrackingPayload(payload.results);
	if (payload.data) return unwrapTrackingPayload(payload.data);
	if (payload.TrackResults && payload.TrackResults.TrackInfo) return unwrapTrackingPayload(payload.TrackResults.TrackInfo);
	if (payload.TrackInfo) return unwrapTrackingPayload(payload.TrackInfo);
	return payload;
}

async function shopifyGraphql(query, variables, env) {
	const shopDomain = normalizeShopDomain(env.SHOPIFY_SHOP_DOMAIN);

	if (!shopDomain) {
		throw apiError('Shopify shop domain is not configured.', 500);
	}

	const token = await shopifyAccessToken(env, shopDomain);
	const apiVersion = env.SHOPIFY_API_VERSION || SHOPIFY_API_VERSION;
	const response = await fetch(`https://${shopDomain}/admin/api/${apiVersion}/graphql.json`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'X-Shopify-Access-Token': token
		},
		body: JSON.stringify({ query, variables })
	});
	const payload = await parseMaybeJson(response);

	if (!response.ok || (payload && payload.errors)) {
		throw apiError(messageFromPayload(payload) || 'Shopify Admin API request failed.', response.status || 502);
	}

	return payload.data;
}

async function shopifyAccessToken(env, shopDomain) {
	const directToken = String(env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
	if (directToken) return directToken;

	const clientId = String(env.SHOPIFY_CLIENT_ID || '').trim();
	const clientSecret = String(env.SHOPIFY_CLIENT_SECRET || '').trim();
	if (!clientId || !clientSecret) {
		throw apiError('Shopify API credentials are not configured.', 500);
	}

	const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret
		})
	});
	const payload = await parseMaybeJson(response);

	if (!response.ok || !payload || !payload.access_token) {
		throw apiError(messageFromPayload(payload) || 'Shopify access token request failed.', response.status || 502);
	}

	return payload.access_token;
}

function normalizeShopDomain(value) {
	return String(value || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

function shopifySearchQuote(value) {
	return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
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

function messageFromPayload(payload) {
	if (!payload) return '';
	if (typeof payload === 'string') return payload;
	if (payload.message) return payload.message;
	if (payload.detail) return payload.detail;
	if (payload.error_description) return payload.error_description;
	if (payload.error) return messageFromPayload(payload.error);
	if (typeof payload.errors === 'string') return payload.errors;
	if (payload.errors && payload.errors.length) return messageFromPayload(payload.errors[0]);
	return '';
}

function apiError(message, status) {
	const error = new Error(message);
	error.status = status;
	return error;
}

function envNumber(env, name, fallback) {
	const value = Number(env && env[name]);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}

function envBool(env, name, fallback) {
	const value = env && env[name];
	if (value === undefined || value === null || value === '') return fallback;
	return !/^(false|0|no|off)$/i.test(String(value).trim());
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

function jsonResponse(payload, status, request, env, extraHeaders) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			...corsHeaders(request, env),
			...(extraHeaders || {}),
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store'
		}
	});
}
