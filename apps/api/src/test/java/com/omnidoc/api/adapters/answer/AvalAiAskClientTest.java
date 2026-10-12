package com.omnidoc.api.adapters.answer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import tools.jackson.databind.ObjectMapper;

import com.omnidoc.api.adapters.answer.JdbcCitationAssembler.Evidence;
import com.omnidoc.api.domain.AnswerModels.Answer;
import com.omnidoc.api.domain.AnswerModels.Citation;
import com.omnidoc.api.domain.AnswerModels.Outcome;
import com.omnidoc.api.domain.AnswerModels.PassageAnchor;
import com.omnidoc.api.domain.Identifiers.ChunkId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.VersionId;
import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.domain.PortResult;

import static org.assertj.core.api.Assertions.assertThat;

class AvalAiAskClientTest {

	private final AvalAiAskClient client = new AvalAiAskClient(
		null, null, null, null, new ObjectMapper());

	@Test
	void mapsOnlyKnownAuthorizedSourceIndexes() {
		Evidence source = evidence();
		PortResult<Answer> valid = this.client.parse(
			"{\"outcome\":\"supported\",\"text\":\"The review is Tuesday.\",\"sources\":[1]}",
			List.of(source));
		assertThat(valid).isInstanceOf(PortResult.Success.class);
		Answer answer = ((PortResult.Success<Answer>) valid).value();
		assertThat(answer.outcome()).isEqualTo(Outcome.SUPPORTED);
		assertThat(answer.citations()).containsExactly(source.citation());

		PortResult<Answer> invented = this.client.parse(
			"{\"outcome\":\"supported\",\"text\":\"The review is Friday.\",\"sources\":[2]}",
			List.of(source));
		assertThat(invented).isInstanceOf(PortResult.Failure.class);
		assertThat(((PortResult.Failure<Answer>) invented).failure().code())
			.isEqualTo(PortFailure.Code.UNAVAILABLE);

		PortResult<Answer> noSource = this.client.parse(
			"{\"outcome\":\"supported\",\"text\":\"An uncited assertion.\",\"sources\":[]}",
			List.of(source));
		assertThat(((PortResult.Success<Answer>) noSource).value().outcome())
			.isEqualTo(Outcome.NO_SUPPORTED_ANSWER);
	}

	@Test
	void refusesOneSidedConflictAndNormalizesNoSupport() {
		Evidence source = evidence();
		PortResult<Answer> oneSided = this.client.parse(
			"{\"outcome\":\"conflict\",\"text\":\"They disagree.\",\"sources\":[1]}",
			List.of(source));
		assertThat(((PortResult.Success<Answer>) oneSided).value().outcome())
			.isEqualTo(Outcome.NO_SUPPORTED_ANSWER);
		PortResult<Answer> unsupported = this.client.parse(
			"{\"outcome\":\"no_supported_answer\",\"text\":\"Revenue was 500.\",\"sources\":[]}",
			List.of(source));
		assertThat(((PortResult.Success<Answer>) unsupported).value().text())
			.doesNotContain("500");
	}

	@Test
	void sharedLedgerStopsAtFiveDollarReservationCap(@TempDir Path dir) throws Exception {
		Path ledgerPath = dir.resolve("budget.txt");
		Files.writeString(ledgerPath, "0\n");
		Files.setPosixFilePermissions(ledgerPath,
			Set.of(PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
		AvalAiSpendLedger ledger = new AvalAiSpendLedger(ledgerPath);
		for (int i = 0; i < 50; i++) {
			assertThat(ledger.reserve()).isNull();
		}
		assertThat(ledger.reserve().code()).isEqualTo(PortFailure.Code.QUOTA_EXHAUSTED);
		assertThat(Files.readString(ledgerPath)).isEqualTo("50\n");
	}

	@Test
	void creditGateRecognizesEligibleGrantAndRejectsWrongModelGrant() {
		ObjectMapper json = new ObjectMapper();
		String grant = """
			{"remaining_unit":0,"remaining_irt":0,"exchange_rate":260600,
			 "credit_sources":{"grants":[{"remaining_irt":"199957.55",
			 "end_date":"2099-10-18T11:50:12Z","allowed_services":[],"scope_details":{}}]}}
			""";
		assertThat(AvalAiAccountCredit.availableUsd(json.readTree(grant))).isGreaterThan(0.10);
		String wrongModel = grant.replace("\"scope_details\":{}",
			"\"scope_details\":{\"api\":[\"different-model\"]}");
		assertThat(AvalAiAccountCredit.availableUsd(json.readTree(wrongModel))).isZero();
	}

	private static Evidence evidence() {
		String text = "The launch review is on Tuesday.";
		Citation citation = new Citation(new NoteId("note-a"), new VersionId("version-a"),
			new ChunkId("chunk-a"), new PassageAnchor(0, text.length(), Optional.empty()),
			text, Optional.empty(), Optional.empty());
		return new Evidence(citation, text);
	}
}
