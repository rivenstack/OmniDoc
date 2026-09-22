package com.omnidoc.api.web.notes;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import tools.jackson.databind.JsonNode;

/** JSON shapes consumed from the frozen S-02 note schemas. */
public final class NotesDtos {

	private NotesDtos() {
	}

	public record CreateNoteRequest(String title, JsonNode bodyJson, String corpusOwnership) {
	}

	public record UpdateNoteRequest(String title, JsonNode bodyJson, String expectedVersion) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record NoteResponse(
		String id,
		String workspaceId,
		String versionId,
		String title,
		JsonNode bodyJson,
		Instant updatedAt,
		String corpusOwnership) {
	}

	public record NotePageResponse(List<NoteResponse> items, String nextCursor) {
		public NotePageResponse {
			items = List.copyOf(items);
		}
	}
}
