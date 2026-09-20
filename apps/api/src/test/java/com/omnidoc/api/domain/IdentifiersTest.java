package com.omnidoc.api.domain;

import org.junit.jupiter.api.Test;

import com.omnidoc.api.domain.Identifiers.ActorId;
import com.omnidoc.api.domain.Identifiers.NoteId;
import com.omnidoc.api.domain.Identifiers.TenantId;
import com.omnidoc.api.domain.Identifiers.WorkspaceId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentifiersTest {

	@Test
	void nonBlankValuesAreAccepted() {
		assertThat(new TenantId("tenant-a").value()).isEqualTo("tenant-a");
		assertThat(new ActorId("actor-a").value()).isEqualTo("actor-a");
		assertThat(new WorkspaceId("ws-a").value()).isEqualTo("ws-a");
		assertThat(new NoteId("note-1").value()).isEqualTo("note-1");
	}

	@Test
	void blankOrNullValuesAreRejected() {
		assertThatThrownBy(() -> new TenantId(" "))
			.isInstanceOf(IllegalArgumentException.class)
			.hasMessageContaining("blank");
		assertThatThrownBy(() -> new ActorId(""))
			.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> new WorkspaceId(null))
			.isInstanceOf(NullPointerException.class);
	}

}
