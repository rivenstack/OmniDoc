package com.omnidoc.api.web.identity;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.ErrorBody;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortFailures;

/**
 * Renders port failures from the identity controllers as the S-02 {@code ErrorBody}.
 * Scoped to those controllers so later lanes can add their own advice without
 * inheriting this mapping by accident.
 */
@RestControllerAdvice(assignableTypes = {SessionController.class, WorkspaceController.class})
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
public class IdentityExceptionHandler {

	@ExceptionHandler(PortFailureException.class)
	public ResponseEntity<ErrorBody> handlePortFailure(PortFailureException exception) {
		PortFailure failure = exception.failure();
		return ResponseEntity.status(PortFailures.status(failure.code()))
			.body(PortFailures.body(failure));
	}

	@ExceptionHandler({HttpMessageNotReadableException.class, IllegalArgumentException.class})
	public ResponseEntity<ErrorBody> handleUnreadableRequest(Exception exception) {
		// Detail is deliberately generic: request bodies on these paths carry credentials.
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
			.body(new ErrorBody("validation", "Request body is not valid for this endpoint."));
	}

}
