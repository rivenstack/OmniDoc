package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.NotesModels.CreateNote;
import com.omnidoc.api.domain.NotesModels.DeleteNote;
import com.omnidoc.api.domain.NotesModels.GetNote;
import com.omnidoc.api.domain.NotesModels.ListNotes;
import com.omnidoc.api.domain.NotesModels.Note;
import com.omnidoc.api.domain.NotesModels.NotePage;
import com.omnidoc.api.domain.NotesModels.UpdateNote;
import com.omnidoc.api.domain.Completion;
import com.omnidoc.api.domain.PortResult;

public interface NotesPort {
	PortResult<Note> create(CreateNote request);
	PortResult<Note> update(UpdateNote request);
	PortResult<Note> get(GetNote request);
	PortResult<NotePage> list(ListNotes request);
	PortResult<Completion> softDelete(DeleteNote request);
	PortResult<Completion> purge(DeleteNote request);
}
