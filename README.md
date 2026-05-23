# 머니로켓 Spring Boot MVP

머니로켓 1차 MVP입니다.

- Spring Boot Java 서버
- 정적 프론트엔드 제공
- `/api/feedback`에서 OpenAI Responses API 호출
- GCP Cloud Run 배포용 Dockerfile 포함

## 로컬 실행

Gradle이 설치되어 있거나 IDE에서 Gradle 프로젝트로 열면:

```bash
OPENAI_API_KEY=sk-... ./gradlew bootRun
```

Docker로 실행하면:

```bash
docker build -t moneyrocket .
docker run --rm -p 8080:8080 -e OPENAI_API_KEY=sk-... moneyrocket
```

브라우저:

```text
http://127.0.0.1:8080
```

## GCP Cloud Run 배포

```bash
gcloud run deploy moneyrocket \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_MODEL=gpt-5.2 \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:latest
```

API 키는 Secret Manager에 `OPENAI_API_KEY` 이름으로 먼저 등록하는 것을 권장합니다.
# MoneyRocket
