package com.omnidoc.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.lang.reflect.RecordComponent;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.omnidoc.api.application.port.AnswerPort;
import com.omnidoc.api.application.port.CredentialVaultPort;
import com.omnidoc.api.application.port.EmbeddingPort;
import com.omnidoc.api.application.port.ExportPort;
import com.omnidoc.api.application.port.IdentityPort;
import com.omnidoc.api.application.port.IngestionPort;
import com.omnidoc.api.application.port.NotesPort;
import com.omnidoc.api.application.port.RuntimeModePort;
import com.omnidoc.api.application.port.SearchPort;
import com.omnidoc.api.application.port.UsagePort;
import com.omnidoc.api.application.port.VectorSearchPort;
import com.omnidoc.api.domain.AccessContext.AclScope;
import com.omnidoc.api.domain.AnswerModels.Answer;
import com.omnidoc.api.domain.AnswerModels.Citation;
import com.omnidoc.api.domain.AnswerModels.Outcome;
import com.omnidoc.api.domain.AnswerModels.PassageAnchor;
import com.omnidoc.api.domain.CorpusOwnership;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.RetrievalModels.TextSearch;
import com.omnidoc.api.domain.RetrievalModels.VectorSearch;
import com.omnidoc.api.domain.RuntimeMode;
import com.omnidoc.api.domain.UsageModels.UsageSnapshot;
import com.omnidoc.api.domain.VaultModels.VaultMetadata;

class DomainPortContractTest {

	@Test
	void exposesAllArchitecturePortSurfaces() {
		assertMethods(NotesPort.class, "create", "update", "get", "list", "softDelete", "purge");
		assertMethods(IngestionPort.class, "enqueueImport", "getJob", "chunkVersion");
		assertMethods(EmbeddingPort.class, "embedTexts", "embedChunks");
		assertMethods(VectorSearchPort.class, "similaritySearch");
		assertMethods(SearchPort.class, "lexicalSearch", "hybridSearch");
		assertMethods(AnswerPort.class, "ask", "askStreaming");
		assertMethods(IdentityPort.class, "authenticate", "resolveMembership", "listWorkspaces", "invite");
		assertMethods(ExportPort.class, "exportWorkspace", "exportNotes");
		assertMethods(CredentialVaultPort.class, "store", "rotate", "revoke", "verify", "getMetadata");
		assertMethods(UsagePort.class, "getUsage", "getRemainingLimits");
		assertMethods(RuntimeModePort.class, "resolveMode", "assertModeAllowed", "stampOutbound");
	}

	@Test
	void everySearchShapeCarriesAclScope() {
		assertThat(componentTypes(TextSearch.class)).contains(AclScope.class);
		assertThat(componentTypes(VectorSearch.class)).contains(AclScope.class);
	}

	@Test
	void modesMapExactlyToArchitectureVocabulary() {
		assertThat(Arrays.stream(RuntimeMode.values()).map(RuntimeMode::value))
			.containsExactly("mock", "operator_free_tier", "customer_key");
		for (RuntimeMode mode : RuntimeMode.values()) assertThat(RuntimeMode.fromValue(mode.value())).isEqualTo(mode);
	}

	@Test
	void answerSuccessStatesAndCitationTrustFieldsRemainExplicit() {
		assertThat(Outcome.values()).containsExactly(
			Outcome.SUPPORTED, Outcome.PARTIAL, Outcome.NO_SUPPORTED_ANSWER, Outcome.CONFLICT, Outcome.REFUSED_POLICY);
		Citation citation = new Citation(new NoteId("n"), new VersionId("v"), new ChunkId("c"),
			new PassageAnchor(0, 4, Optional.empty()), "text", Optional.of(Instant.EPOCH),
			Optional.of(CorpusOwnership.SAMPLE));
		Answer answer = new Answer(Outcome.NO_SUPPORTED_ANSWER, "No supported answer", java.util.List.of(citation));
		assertThat(answer.outcome()).isEqualTo(Outcome.NO_SUPPORTED_ANSWER);
		assertThat(citation.corpusOwnership()).contains(CorpusOwnership.SAMPLE);
	}

	@Test
	void quotaFailureRetainsSelectedModeAndUsageCanBeUnavailable() {
		PortFailure failure = PortFailure.forMode(PortFailure.Code.QUOTA_EXHAUSTED, "quota", RuntimeMode.CUSTOMER_KEY);
		assertThat(failure.mode()).contains(RuntimeMode.CUSTOMER_KEY);
		assertThat(new UsageSnapshot.Unavailable("not reported")).isInstanceOf(UsageSnapshot.class);
	}

	@Test
	void vaultMetadataCannotExposePlaintext() {
		assertThat(Arrays.stream(VaultMetadata.class.getRecordComponents()).map(RecordComponent::getName))
			.doesNotContain("credential", "plaintext", "key", "secret")
			.contains("maskedPrefix");
	}

	@Test
	void publicPortsExposeNoFrameworkOrTransportTypes() {
		Set<String> forbiddenPrefixes = Set.of("org.springframework.", "reactor.", "org.reactivestreams.");
		for (Class<?> port : Set.of(NotesPort.class, IngestionPort.class, EmbeddingPort.class,
			VectorSearchPort.class, SearchPort.class, AnswerPort.class, IdentityPort.class,
			ExportPort.class, CredentialVaultPort.class, UsagePort.class, RuntimeModePort.class)) {
			for (Method method : port.getMethods()) {
				assertThat(forbiddenPrefixes).noneMatch(prefix -> method.toGenericString().contains(prefix));
			}
		}
	}

	private static void assertMethods(Class<?> type, String... expected) {
		assertThat(Arrays.stream(type.getDeclaredMethods()).map(Method::getName)).containsExactlyInAnyOrder(expected);
	}

	private static Set<Class<?>> componentTypes(Class<?> recordType) {
		return Arrays.stream(recordType.getRecordComponents()).map(RecordComponent::getType)
			.collect(java.util.stream.Collectors.toSet());
	}
}
