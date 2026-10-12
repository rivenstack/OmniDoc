package com.omnidoc.api.adapters.answer;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RuntimeMode;

/** Read-only account check before each chargeable B-08 request. */
public final class AvalAiAccountCredit {

	private static final URI CREDIT_URL = URI.create("https://api.avalai.ir/user/v1/credit");
	private static final double MIN_AVAILABLE_USD = 0.10;
	private final HttpClient http;
	private final ObjectMapper json;

	public AvalAiAccountCredit(ObjectMapper json) {
		this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
		this.json = json;
	}

	public PortFailure check(String apiKey) {
		if (apiKey == null || apiKey.isBlank()) {
			return unavailable();
		}
		try {
			HttpRequest request = HttpRequest.newBuilder(CREDIT_URL)
				.timeout(Duration.ofSeconds(10))
				.header("Authorization", "Bearer " + apiKey)
				.GET().build();
			HttpResponse<String> response = this.http.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() != 200) {
				return unavailable();
			}
			JsonNode root = this.json.readTree(response.body());
			double available = availableUsd(root);
			if (!Double.isFinite(available)) {
				return unavailable();
			}
			if (available < MIN_AVAILABLE_USD) {
				return PortFailure.forMode(PortFailure.Code.QUOTA_EXHAUSTED,
					"AvalAI account has insufficient verified credit for a live Ask call.",
					RuntimeMode.OPERATOR_FREE_TIER);
			}
			return null;
		}
		catch (IOException | InterruptedException | RuntimeException ex) {
			if (ex instanceof InterruptedException) {
				Thread.currentThread().interrupt();
			}
			return unavailable();
		}
	}

	static double availableUsd(JsonNode root) {
		double units = numeric(root.path("remaining_unit"));
		double irt = numeric(root.path("remaining_irt"));
		double exchange = numeric(root.path("exchange_rate"));
		if (!Double.isFinite(units) || !Double.isFinite(irt) || !Double.isFinite(exchange)
			|| units < 0 || irt < 0 || exchange <= 0) {
			return Double.NaN;
		}
		double sourcesIrt = 0;
		for (String kind : new String[] {"grants", "packages"}) {
			JsonNode sources = root.path("credit_sources").path(kind);
			if (!sources.isArray()) {
				continue;
			}
			for (JsonNode source : sources) {
				if (!eligible(source)) {
					continue;
				}
				double remaining = numeric(source.path("remaining_irt"));
				if (Double.isFinite(remaining) && remaining > 0) {
					sourcesIrt += remaining;
				}
			}
		}
		// The top-level amount may exclude grant credit. Avoid double-counting
		// paid packages that can also appear in the top-level amount.
		return units + Math.max(irt, sourcesIrt) / exchange;
	}

	private static boolean eligible(JsonNode source) {
		try {
			Instant expiry = Instant.parse(source.path("end_date").asText());
			if (!expiry.isAfter(Instant.now())) {
				return false;
			}
			JsonNode services = source.path("allowed_services");
			if (!services.isArray()) {
				return false;
			}
			if (!services.isEmpty() && !contains(services, "api")) {
				return false;
			}
			JsonNode models = source.path("scope_details").path("api");
			return models.isMissingNode() || (models.isArray()
				&& (models.isEmpty() || contains(models, AvalAiAskClient.MODEL_ID)));
		}
		catch (RuntimeException ex) {
			return false;
		}
	}

	private static boolean contains(JsonNode array, String value) {
		for (JsonNode item : array) {
			if (value.equals(item.asText())) {
				return true;
			}
		}
		return false;
	}

	private static double numeric(JsonNode value) {
		if (value.isNumber()) {
			return value.doubleValue();
		}
		if (value.isTextual()) {
			try {
				return Double.parseDouble(value.asText());
			}
			catch (NumberFormatException ignored) {
				return Double.NaN;
			}
		}
		return Double.NaN;
	}

	private static PortFailure unavailable() {
		return PortFailure.forMode(PortFailure.Code.UNAVAILABLE,
			"AvalAI account credit could not be verified.", RuntimeMode.OPERATOR_FREE_TIER);
	}
}
