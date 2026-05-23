package com.moneyrocket.app.presentation.controller;

import com.moneyrocket.app.presentation.dto.request.AiFeedbackRequest;
import com.moneyrocket.app.presentation.dto.response.AiFeedbackResponse;
import com.moneyrocket.app.presentation.dto.response.ErrorResponse;
import com.moneyrocket.app.service.AiFeedbackService;
import com.moneyrocket.app.service.OpenAiFeedbackException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AiFeedbackController {

  private final AiFeedbackService aiFeedbackService;

  @PostMapping("/api/feedback")
  public AiFeedbackResponse createFeedback(@RequestBody AiFeedbackRequest request) {
    return aiFeedbackService.createFeedback(request);
  }

  @ExceptionHandler(OpenAiFeedbackException.class)
  public ResponseEntity<ErrorResponse> handleOpenAiFeedbackException(OpenAiFeedbackException error) {
    HttpStatus status = HttpStatus.resolve(error.getStatusCode());
    return ResponseEntity
        .status(status == null ? HttpStatus.INTERNAL_SERVER_ERROR : status)
        .body(new ErrorResponse(error.getMessage()));
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException error) {
    return ResponseEntity
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(new ErrorResponse(error.getMessage()));
  }
}
