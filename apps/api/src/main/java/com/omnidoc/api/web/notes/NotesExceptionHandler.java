package com.omnidoc.api.web.notes;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.ErrorBody;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortFailures;
import com.omnidoc.api.web.identity.IdentityProfiles;

/** S-02 {@link ErrorBody} mapping scoped to the notes controller. */
@RestControllerAdvice(assignableTypes = NotesController.class)
@Profile(IdentityProfiles.PERSISTENT_IDENTITY)
public class NotesExceptionHandler {

	@ExceptionHandler(PortFailureException.class)
	public ResponseEntity<ErrorBody> handlePortFailure(PortFailureException exception) {
		PortFailure failure = exception.failure();
		return ResponseEntity.status(PortFailures.status(failure.code()))
			.body(PortFailures.body(failure));
	}

	@ExceptionHandler({
		HttpMessageNotReadableException.class,
		MethodArgumentTypeMismatchException.class,
		IllegalArgumentException.class
	})
	public ResponseEntity<ErrorBody> handleInvalidRequest(Exception exception) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
			.body(new ErrorBody("validation", "Request is not valid for this endpoint."));
	}
}
