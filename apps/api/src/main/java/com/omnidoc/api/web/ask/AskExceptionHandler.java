package com.omnidoc.api.web.ask;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.omnidoc.api.web.ErrorBody;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortFailures;
import com.omnidoc.api.web.identity.IdentityProfiles;

/** Pre-stream failures use the frozen S-02 JSON ErrorBody. */
@RestControllerAdvice(assignableTypes = AskController.class)
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
public final class AskExceptionHandler {

	@ExceptionHandler(PortFailureException.class)
	public ResponseEntity<ErrorBody> portFailure(PortFailureException exception) {
		return ResponseEntity.status(PortFailures.status(exception.failure().code()))
			.contentType(MediaType.APPLICATION_JSON)
			.body(PortFailures.body(exception.failure()));
	}

	@ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
	public ResponseEntity<ErrorBody> invalid(Exception exception) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
			.contentType(MediaType.APPLICATION_JSON)
			.body(new ErrorBody("validation", "Request is not valid for this endpoint."));
	}
}
