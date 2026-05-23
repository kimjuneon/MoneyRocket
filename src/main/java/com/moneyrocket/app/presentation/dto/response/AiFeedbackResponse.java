package com.moneyrocket.app.presentation.dto.response;

import java.util.List;

public record AiFeedbackResponse(
        String summary,
        List<String> feedback,
        String riskNote
) {
}
