# MoneyRocket

> 목표 금액까지의 도달 가능성을 계산하고, 입력값을 기반으로 AI 재무 피드백을 제공하는 Spring Boot 기반 MVP입니다.

## 1. 프로젝트 소개

MoneyRocket은 사용자가 나이, 목표 금액, 현재 자산, 월 수입/지출, 자산별 납입액과 기대 수익률을 입력하면 목표 달성까지의 흐름을 계산하고 AI 피드백을 받을 수 있는 웹 서비스입니다.

프론트엔드는 Spring Boot 정적 리소스로 제공하고, 백엔드는 OpenAI Responses API를 호출해 한국어 재무 코칭 응답을 JSON 형태로 반환합니다. GCP Cloud Run 배포와 GitHub Actions 자동 배포까지 함께 구성했습니다.

## 2. 주요 기능

- 목표 금액, 현재 자산, 월 수입/지출 기반 계산 화면 제공
- 자산별 금액, 월 납입액, 기대 수익률 입력
- 목표까지 남은 금액, 월 현금흐름, 예상 도달 기간 계산
- OpenAI API 기반 한국어 재무 피드백 생성
- 헬스 체크 API 제공
- Docker 이미지 빌드 및 Cloud Run 자동 배포

## 3. 기술 스택

| 분류 | 기술 |
| --- | --- |
| Language | Java 21, JavaScript |
| Backend | Spring Boot 3.5, Spring Web |
| AI | OpenAI Responses API |
| Build | Gradle |
| Infra | Docker, GCP Cloud Run, Artifact Registry, Secret Manager |
| CI/CD | GitHub Actions, Workload Identity Federation |
| Test | JUnit 5, Spring Boot Test |

## 4. 프로젝트 구조

```text
.
├── src/main/java/com/moneyrocket/app
│   ├── config              # CORS, 보안 헤더 설정
│   ├── presentation        # API controller, request/response DTO
│   └── service             # OpenAI 피드백 생성 로직
├── src/main/resources
│   ├── application.yaml    # 서버/AI/CORS 설정
│   └── static              # 정적 프론트엔드
├── scripts                 # GCP 초기 설정 스크립트
├── .github/workflows       # Cloud Run 배포 워크플로우
├── Dockerfile
└── build.gradle
```

## 5. 실행 방법

### 사전 준비

- Java 21
- OpenAI API key

### 로컬 실행

```bash
OPENAI_API_KEY=sk-... ./gradlew bootRun
```

브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:8080
```

API 키 없이도 화면은 열리지만, AI 피드백 기능은 `OPENAI_API_KEY`가 있어야 동작합니다.

### Docker 실행

```bash
docker build -t moneyrocket .
docker run --rm -p 8080:8080 -e OPENAI_API_KEY=sk-... moneyrocket
```

## 6. API 명세

| Method | URI | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 서버 상태 확인 |
| POST | `/api/feedback` | 자산/목표 데이터를 기반으로 AI 피드백 생성 |

`POST /api/feedback` 요청은 나이, 목표 나이, 목표 금액, 현재 자산, 월 수입/지출, 자산 목록 등을 포함합니다. 응답은 `summary`, `feedback`, `riskNote` 필드를 가진 JSON입니다.

## 7. 테스트 및 배포

### 테스트

```bash
./gradlew test
```

### GCP 초기 설정

```bash
PROJECT_ID=your-gcp-project-id \
OPENAI_API_KEY_VALUE=sk-... \
./scripts/gcp-bootstrap.sh
```

스크립트는 Artifact Registry, Cloud Run 배포용 서비스 계정, Workload Identity Federation, Secret Manager의 `OPENAI_API_KEY`를 설정합니다.

### 자동 배포

`.github/workflows/deploy-cloud-run.yml`은 `main` 브랜치 push 시 다음 순서로 동작합니다.

1. 테스트 실행
2. Docker 이미지 빌드
3. Artifact Registry push
4. Cloud Run 배포

필요한 GitHub Secrets는 다음과 같습니다.

```text
GCP_PROJECT_ID
GCP_WIF_PROVIDER
GCP_SERVICE_ACCOUNT
```

## 8. 학습 포인트

- 외부 AI API 응답을 서비스 DTO로 안정적으로 변환하는 흐름을 구현했습니다.
- 사용자가 입력한 재무 데이터만 기준으로 피드백을 생성하도록 프롬프트 제약을 설계했습니다.
- Cloud Run 배포를 위해 Docker, Secret Manager, GitHub Actions를 함께 구성했습니다.

## 9. 개선할 점

- AI 응답 실패 시 사용자 친화적인 fallback 메시지 제공
- 입력값 검증과 에러 응답 표준화
- 계산 로직에 대한 단위 테스트 보강
- API 문서화와 화면 캡처 추가
