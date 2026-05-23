package com.moneyrocket.app.presentation.dto.request;

import java.math.BigDecimal;
import java.util.List;

public record AiFeedbackRequest(
        Integer age,
        Integer targetAge,
        BigDecimal goalAmount,
        BigDecimal currentTotal,
        BigDecimal remaining,
        BigDecimal monthlyIncome,
        BigDecimal fixedExpense,
        BigDecimal variableExpense,
        BigDecimal monthlySurplus,
        BigDecimal monthlyCashSaving,
        BigDecimal assetContribution,
        Integer savingOnlyMonths,
        Integer growthMonths,
        BigDecimal weightedReturn,
        List<AssetRequest> assets
) {
    public record AssetRequest(
            String name,
            String type,
            BigDecimal amount,
            BigDecimal monthlyContribution,
            BigDecimal annualReturn
    ) {
    }
}