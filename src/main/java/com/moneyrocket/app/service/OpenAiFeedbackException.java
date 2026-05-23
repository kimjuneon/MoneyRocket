package com.moneyrocket.app.service;

public class OpenAiFeedbackException extends RuntimeException {
  private final int statusCode;

  public OpenAiFeedbackException(int statusCode, String message) {
    super(message);
    this.statusCode = statusCode;
  }

  public int getStatusCode() {
    return statusCode;
  }
}
