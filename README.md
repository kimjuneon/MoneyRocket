# 머니로켓

목표 금액까지 얼마나 남았는지 계산하고, 입력값을 바탕으로 AI 재무 피드백을 받는 Spring Boot 기반 MVP입니다.

## 구성

- Spring Boot 3.5
- Java 21
- Gradle
- 정적 프론트엔드: `src/main/resources/static`
- AI 피드백 API: `POST /api/feedback`
- 헬스 체크: `GET /api/health`
- 배포 대상: GCP Cloud Run
- CI/CD: GitHub Actions → Artifact Registry → Cloud Run

## 로컬 실행

```bash
OPENAI_API_KEY=sk-... ./gradlew bootRun
```

브라우저에서 아래 주소로 접속합니다.

```text
http://127.0.0.1:8080
```

API 키 없이 실행해도 앱 화면은 뜹니다. 다만 `AI 피드백 받기`는 `OPENAI_API_KEY`가 있어야 동작합니다.

## Docker 실행

```bash
docker build -t moneyrocket .
docker run --rm -p 8080:8080 -e OPENAI_API_KEY=sk-... moneyrocket
```

## 테스트

```bash
./gradlew test
```

로컬 Java 25와 Gradle 호환 문제가 있으면 IntelliJ Gradle JVM을 Java 21로 바꾸거나 Docker 빌드를 사용합니다.

## GCP 최초 설정

새 GCP 계정으로 로그인한 뒤 새 프로젝트를 만들고, 아래 값을 정해서 초기 설정을 실행합니다.

```bash
gcloud auth login
gcloud projects create moneyrocket-juneon --name="MoneyRocket"
gcloud config set project moneyrocket-juneon
```

결제 계정 연결은 GCP 콘솔에서 프로젝트에 연결해야 합니다. 연결 후 아래 스크립트를 실행합니다.

```bash
PROJECT_ID=moneyrocket-juneon \
OPENAI_API_KEY_VALUE=sk-... \
./scripts/gcp-bootstrap.sh
```

스크립트가 하는 일:

- 필요한 GCP API 활성화
- Artifact Registry 저장소 생성
- GitHub Actions 배포용 서비스 계정 생성
- Cloud Run 배포 권한 부여
- Secret Manager에 `OPENAI_API_KEY` 생성 및 값 등록
- GitHub Secret에 넣을 서비스 계정 키 파일 생성

## GitHub Secrets

GitHub 저장소 `Settings > Secrets and variables > Actions`에 아래 값을 등록합니다.

```text
GCP_PROJECT_ID=money-rocket-497214
GCP_WIF_PROVIDER=projects/53188815359/locations/global/workloadIdentityPools/github-actions/providers/github
GCP_SERVICE_ACCOUNT=github-moneyrocket-deployer@money-rocket-497214.iam.gserviceaccount.com
```

## 자동 배포

`main` 브랜치에 push되면 `.github/workflows/deploy-cloud-run.yml`이 실행됩니다.

파이프라인 순서:

1. Gradle 테스트
2. Docker 이미지 빌드
3. Artifact Registry에 이미지 push
4. Cloud Run `moneyrocket` 서비스 배포

배포 지역은 기본값 `asia-northeast3`입니다.
