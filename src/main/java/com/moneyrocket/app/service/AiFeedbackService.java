package com.moneyrocket.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.moneyrocket.app.presentation.dto.request.AiFeedbackRequest;
import com.moneyrocket.app.presentation.dto.response.AiFeedbackResponse;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiFeedbackService {
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String openAiApiKey;
    private final String openAiModel;

    public AiFeedbackService(
            ObjectMapper objectMapper,
            @Value("${openai.api-key:}") String openAiApiKey,
            @Value("${openai.model:gpt-5.2}") String openAiModel
    ) {
        this.objectMapper = objectMapper;
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .build();
    }

    public AiFeedbackResponse createFeedback(AiFeedbackRequest request) {
        if (openAiApiKey == null || openAiApiKey.isBlank()) {
            throw new IllegalStateException(
                    "OPENAI_API_KEY가 설정되어 있지 않습니다. GCP Cloud Run 환경변수 또는 로컬 실행 환경에 API 키를 넣어야 AI 피드백이 동작합니다."
            );
        }

        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openAiModel);
            requestBody.put("input", buildPrompt(request));
            requestBody.put("text", Map.of("format", Map.of("type", "json_object")));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + openAiApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofString()
            );

            JsonNode root = objectMapper.readTree(response.body());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = root.path("error")
                        .path("message")
                        .asText("OpenAI API 호출에 실패했습니다.");

                throw new OpenAiFeedbackException(response.statusCode(), message);
            }

            String outputText = extractOutputText(root);

            if (outputText == null || outputText.isBlank()) {
                throw new OpenAiFeedbackException(500, "OpenAI 응답 본문이 비어 있습니다.");
            }

            return objectMapper.readValue(outputText, AiFeedbackResponse.class);
        } catch (OpenAiFeedbackException error) {
            throw error;
        } catch (Exception error) {
            throw new OpenAiFeedbackException(500, error.getMessage());
        }
    }

    private String buildPrompt(AiFeedbackRequest request) throws Exception {
        String requestJson = objectMapper
                .writerWithDefaultPrettyPrinter()
                .writeValueAsString(request);

        return """
      너는 한국어로 답하는 목표 자금 관리 코치다.
      특정 금융상품, 투자 종목, 코인, 대출, 보험, 카드 상품을 추천하지 않는다.
      사용자가 직접 입력한 값과 계산된 값만 기준으로 목표 달성 피드백을 제공한다.

      가장 중요한 목표:
      - 사용자를 혼내거나 명령하지 말고, 친절한 코치처럼 말한다.
      - "~해라" 대신 "~해보세요", "~부터 확인해보면 좋아요", "~를 추천해요"처럼 부드러운 표현을 쓴다.
      - 단순히 상황을 요약하지 말고, 사용자가 바로 수정하거나 실행할 수 있는 피드백을 제공한다.
      - feedback 배열에는 문제 설명보다 개선 행동을 중심으로 작성한다.
      - 각 feedback 문장은 반드시 사용자가 무엇을 해보면 좋은지 드러나야 한다.
      - 진단이 필요하면 한 문장 안에서 짧게 언급하고, 바로 행동 제안으로 연결한다.
      - 한 문장은 80자 안팎으로 짧게 쓴다.

      중요한 규칙:
      - 0은 누락된 값이 아니라 사용자가 입력한 유효한 값으로 간주한다.
      - null은 계산이 불가능한 값으로 해석하되, 없는 필드를 새로 요구하지 않는다.
      - 제공되지 않은 필드명을 요구하지 않는다.
      - goalName, targetAmount, currentAmount, monthlySavingAmount, targetMonths 같은 필드가 없어도 문제 삼지 않는다.
      - 아래 제공된 필드만 기준으로 판단한다.
      - 특정 금융상품, 투자 종목, 코인, 대출, 보험, 카드 상품을 추천하지 않는다.
      - 응답은 반드시 JSON 형식만 반환한다.

      데이터 필드 설명:
      - age: 현재 나이
      - targetAge: 희망 목표 나이
      - goalAmount: 목표 금액
      - currentTotal: 현재 총자산
      - remaining: 목표까지 남은 금액
      - monthlyIncome: 월 실수령액
      - fixedExpense: 월 고정지출
      - variableExpense: 월 변동지출
      - monthlySurplus: 월 예상 순수익. 월 실수령액에서 고정지출과 변동지출을 뺀 값이다.
      - monthlyCashSaving: 월 현금 증가 예상액. 월 예상 순수익에서 자산 월 납입액을 뺀 값이다.
      - assetContribution: 매월 자산에 납입하는 총액
      - savingOnlyMonths: 자산 성장 없이 저축만 했을 때 목표 도달까지 걸리는 개월 수
      - growthMonths: 자산 성장률까지 반영했을 때 목표 도달까지 걸리는 개월 수
      - weightedReturn: 입력 자산 기준 가중 평균 연수익률
      - assets: 사용자가 직접 입력한 자산 목록

      피드백 작성 기준:
      - monthlySurplus가 음수이면, 수익률보다 현금흐름 개선을 최우선으로 조언한다.
      - growthMonths가 목표 기간보다 길면, 목표 금액 낮추기, 목표 나이 늘리기, 월 순수익 늘리기 중 하나를 부드럽게 제안한다.
      - weightedReturn이 15% 이상이면, 높은 수익률 가정에 의존하고 있음을 지적하고 보수적인 시나리오 점검을 제안한다.
      - monthlyIncome이 0이고 지출이 있으면, 수입 입력 누락 가능성과 실제 무수입 상태를 나눠 확인하라고 제안한다.
      - assetContribution이 0이면, 매월 추가 납입 없이 자산 성장에만 의존하는 구조임을 짚고 월 납입 가능액 설정을 제안한다.
      - savingOnlyMonths가 null이면, 저축만으로는 목표 도달 계산이 어렵다는 뜻이므로 월 순수익을 플러스로 만드는 것을 제안한다.

      응답 형식:
      {
        "summary": "현재 상황을 한 문장으로 요약",
        "feedback": [
          "친절한 말투의 실행 피드백 1",
          "친절한 말투의 실행 피드백 2",
          "친절한 말투의 실행 피드백 3",
          "친절한 말투의 실행 피드백 4"
        ],
        "riskNote": "가장 큰 리스크와 주의할 점 한 문장"
      }

      좋은 feedback 예시:
      - "월 현금흐름이 마이너스라서, 먼저 줄일 수 있는 지출 1~2개를 골라보세요."
      - "목표 시점보다 늦을 수 있어요. 목표 나이, 목표 금액, 월 저축액을 함께 비교해보세요."
      - "연수익률 가정이 높은 편이에요. 낮은 수익률 기준의 시나리오도 같이 확인해보세요."
      - "월 납입액이 0원이라면, 부담 없는 금액부터 정해 다시 계산해보는 걸 추천해요."

      나쁜 feedback 예시:
      - "줄인 금액만큼을 즉시 지출에서 제거해라."
      - "목표 금액을 낮추거나 목표 나이를 늦춰라."
      - "목표까지 남은 금액은 얼마입니다."
      - "월 순수익이 얼마입니다."
      - "목표 도달기간은 몇 개월입니다."
      - "저축만으로는 계산이 어렵습니다."

      데이터:
      {{DATA}}
      """.replace("{{DATA}}", requestJson);
    }

    private String extractOutputText(JsonNode root) {
        String outputText = root.path("output_text").asText();

        if (outputText != null && !outputText.isBlank()) {
            return outputText;
        }

        JsonNode outputArray = root.path("output");

        if (outputArray.isArray()) {
            for (JsonNode outputItem : outputArray) {
                JsonNode contentArray = outputItem.path("content");

                if (contentArray.isArray()) {
                    for (JsonNode contentItem : contentArray) {
                        String text = contentItem.path("text").asText();

                        if (text != null && !text.isBlank()) {
                            return text;
                        }
                    }
                }
            }
        }

        return null;
    }
}
