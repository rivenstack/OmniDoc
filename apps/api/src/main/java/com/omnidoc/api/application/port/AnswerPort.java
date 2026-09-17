package com.omnidoc.api.application.port;

import com.omnidoc.api.domain.AnswerModels.Answer;
import com.omnidoc.api.domain.AnswerModels.AnswerEventSink;
import com.omnidoc.api.domain.AnswerModels.AskQuestion;
import com.omnidoc.api.domain.PortResult;
import com.omnidoc.api.domain.Completion;

public interface AnswerPort {
	PortResult<Answer> ask(AskQuestion request);
	PortResult<Completion> askStreaming(AskQuestion request, AnswerEventSink eventSink);
}
