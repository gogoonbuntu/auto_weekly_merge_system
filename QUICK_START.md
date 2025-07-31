# 🚀 Auto Weekly Merge System - 빠른 시작 가이드

## 📋 사전 준비사항

1. **Node.js 18 이상** 설치 확인
2. **GitHub Personal Access Token** 준비
3. **GitHub Organization** 접근 권한 확인

## ⚡ 빠른 실행 방법

### 1단계: 환경변수 설정

`.env` 파일에서 다음 값들을 실제 값으로 변경하세요:

```bash
# ⚠️ 필수 설정 - 반드시 변경해야 합니다!
GITHUB_TOKEN=ghp_your_actual_github_token_here
GITHUB_ORG=your_actual_organization_name
```

### 2단계: 의존성 설치 및 실행

```bash
# 프로젝트 디렉토리로 이동
cd auto-weekly-merge-system

# 의존성 설치
npm install

# 개발 모드로 실행
npm run dev
```

### 3단계: 웹 대시보드 접속

브라우저에서 **http://localhost:3000** 접속

## 🔧 GitHub Token 생성 방법

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)** 클릭
3. 다음 권한 선택:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **read:org** (Read org and team membership)
4. 생성된 토큰을 `.env` 파일의 `GITHUB_TOKEN`에 설정

## 📊 대시보드 사용법

### 🎮 기본 기능
- **Master → Release 머지**: 첫 번째 파란색 버튼 클릭
- **Release → Develop 머지**: 두 번째 분홍색 버튼 클릭
- **프로세스 중단**: 빨간색 중단 버튼 (실행 중일 때만 표시)
- **상태 새로고침**: 회색 새로고침 버튼

### 📈 모니터링
- **실시간 상태**: 리포지토리별 진행 상황 확인
- **로그 뷰어**: 실시간 로그, 히스토리, 파일 다운로드
- **진행률 표시**: Phase별 실행 단계 시각화

## 🔄 머지 프로세스 순서

```
Phase 1: danal-core (완료 대기)
    ↓
Phase 2: smart-settlement-extapi (완료 대기)
    ↓
Phase 3: 나머지 3개 리포지토리 (병렬 실행)
    ├── smart-settlement-batch
    ├── smart-settlement-api
    └── smart-settlement-merchant-interface
```

## 🚨 문제 해결

### 일반적인 오류들

1. **"GITHUB_TOKEN이 설정되지 않았습니다"**
   - `.env` 파일의 `GITHUB_TOKEN` 값 확인

2. **"권한이 없습니다" (403 에러)**
   - GitHub Token의 권한 재확인
   - Organization 접근 권한 확인

3. **"브랜치를 찾을 수 없습니다" (404 에러)**
   - 리포지토리에 master, release, develop 브랜치 존재 확인

4. **"포트가 이미 사용 중입니다"**
   - `.env` 파일의 `PORT` 값을 다른 포트로 변경

### 로그 확인 방법

```bash
# 실시간 로그 확인
tail -f logs/application.log

# 에러 로그만 확인
tail -f logs/error.log
```

## 🛠️ 개발자 옵션

### 테스트 실행
```bash
npm test
```

### Docker로 실행
```bash
# Docker 이미지 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-composer logs -f auto-merge-system
```

### 디버그 모드
```bash
# 더 자세한 로그와 함께 실행
LOG_LEVEL=debug npm run dev
```

## 📞 지원

문제가 발생하면:

1. **로그 파일** 확인: `/logs` 디렉토리
2. **네트워크 연결** 확인: GitHub API 접근 가능 여부
3. **환경변수** 재확인: `.env` 파일 설정값
4. **브라우저 개발자 도구** 확인: JavaScript 콘솔 에러

## ✅ 성공적인 실행 확인

다음이 정상적으로 표시되면 설정이 완료된 것입니다:

1. 터미널에 `서버가 포트 3000에서 시작되었습니다` 메시지
2. 웹 대시보드에서 5개 리포지토리 상태 표시
3. "Dashboard에 연결되었습니다" 로그 메시지
4. 리포지토리 상태가 "준비됨" 또는 "ready"로 표시

---

🎉 **축하합니다!** Auto Weekly Merge System이 성공적으로 설치되었습니다.