package com.omnidoc.api.web.ingestion;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import com.omnidoc.api.domain.PortFailure;
import com.omnidoc.api.web.ErrorBody;
import com.omnidoc.api.web.PortFailureException;
import com.omnidoc.api.web.PortFailures;

/**
 * S-02 {@link ErrorBody} mapping scoped to the ingestion controller.
 *
 * <p>The container can reject an upload before the adapter ever sees it, so the two
 * ingestion-specific statuses are mapped here as well: an oversized multipart is
 * {@code too_large} (413) and a non-multipart body is {@code unsupported_type} (415) —
 * the same codes the port would have produced.
 */
@RestControllerAdvice(assignableTypes = IngestionController.class)
@Profile(com.omnidoc.api.web.identity.IdentityProfiles.PERSISTENT_IDENTITY)
public class IngestionExceptionHandler {

	@ExceptionHandler(PortFailureException.class)
	public ResponseEntity<ErrorBody> handlePortFailure(PortFailureException exception) {
		PortFailure failure = exception.failure();
		return ResponseEntity.status(PortFailures.status(failure.code()))
			.body(PortFailures.body(failure));
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErrorBody> handleTooLarge(MaxUploadSizeExceededException exception) {
		return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
			.body(new ErrorBody("too_large", "Imported files must be 10 MiB or smaller."));
	}

	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	public ResponseEntity<ErrorBody> handleUnsupportedRequestType(HttpMediaTypeNotSupportedException exception) {
		return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
			.body(new ErrorBody("unsupported_type", "Imports must be sent as multipart/form-data."));
	}

	@ExceptionHandler({
		MissingServletRequestPartException.class,
		MissingRequestHeaderException.class,
		MultipartException.class,
		HttpMessageNotReadableException.class,
		IllegalArgumentException.class
	})
	public ResponseEntity<ErrorBody> handleInvalidRequest(Exception exception) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
			.body(new ErrorBody("validation", "Request is not valid for this endpoint."));
	}
}
