# 📊 Auto Weekly Merge System

GitHub 리포지토리의 주간 브랜치 머지 작업을 자동화하는 웹 기반 시스템입니다.

## 🎯 주요 기능

- **5개 리포지토리 순차 머지**: danal-core → smart-settlement-extapi → 나머지 3개 병렬 실행
- **웹 인터페이스**: 직관적인 대시보드를 통한 실행 제어
- **실시간 모니터링**: Socket.IO를 통한 프로세스 상태 실시간 업데이트
- **상세 로깅**: 다단계 로그 시스템 및 파일 다운로드 기능
- **에러 처리**: 실패 시 자동 알림 및 재시도 로직

## 🏗️ 시스템 아키텍처

```
Auto Weekly Merge System
├── 🖥️  Web Dashboard (React-like Frontend)
├── 🔧  Express.js Server
├── 🔌  Socket.IO (Real-time Updates)
├── 📊  GitHub API Integration
├── 📝  Winston Logging System
└── 🗄️  Process Management
```

## 📂 프로젝트 구조

```
auto-weekly-merge-system/
├── server.js                 # Express 서버 메인 파일
├── package.json              # 프로젝트 의존성
├── .env.example              # 환경변수 템플릿
├── services/
│   ├── githubService.js      # GitHub API 연동
│   └── mergeManager.js       # 머지 프로세스 관리
├── utils/
│   └── logger.js             # 로깅 시스템
├── public/
│   └── index.html            # 웹 대시보드
└── logs/                     # 로그 파일 저장 디렉토리
```

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd auto-weekly-merge-system
npm install
```

### 2. 환경변수 설정

`.env.example`을 `.env`로 복사하고 필요한 값들을 설정하세요:

```bash
cp .env.example .env
```

**필수 환경변수:**

```bash
# GitHub 설정
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_ORG=your_organization_name

# 서버 설정
PORT=3000
NODE_ENV=development

# 대상 리포지토리
REPOSITORIES=danal-core,smart-settlement-extapi,smart-settlement-batch,smart-settlement-api,smart-settlement-merchant-interface
```

### 3. GitHub Personal Access Token 생성

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token" 클릭
3. 다음 권한 선택:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)

### 4. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

### 5. 웹 대시보드 접속

브라우저에서 `http://localhost:3000` 접속

## 📋 API 엔드포인트

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | 시스템 및 리포지토리 상태 조회 |
| POST | `/api/merge/master-to-release` | Master → Release 머지 실행 |
| POST | `/api/merge/release-to-develop` | Release → Develop 머지 실행 |
| POST | `/api/process/stop` | 현재 프로세스 중단 |
| GET | `/api/history` | 프로세스 실행 히스토리 |
| GET | `/api/logs` | 로그 파일 목록 |
| GET | `/api/logs/:filename` | 특정 로그 파일 내용 |
| GET | `/api/logs/:filename/download` | 로그 파일 다운로드 |

## 🔄 머지 프로세스

### Master → Release 머지
1. **Phase 1**: `danal-core` 리포지토리 처리
2. **Phase 2**: `smart-settlement-extapi` 리포지토리 처리  
3. **Phase 3**: 나머지 3개 리포지토리 병렬 처리

### 각 리포지토리별 처리 과정
1. **브랜치 생성**: `hotfix-master/merge-master-into-release-YYYYMMDD`
2. **Pull Request 생성**: `[Auto] Merge master into release - YYYY-MM-DD`
3. **상태 업데이트**: 실시간 진행 상황 모니터링

## 📊 웹 대시보드 기능

### 🎮 실행 컨트롤
- Master → Release 머지 실행 버튼
- Release → Develop 머지 실행 버튼  
- 프로세스 중단 버튼
- 상태 새로고침 버튼

### 📈 실시간 모니터링
- 리포지토리별 진행 상태 (대기/진행중/완료/실패)
- 전체 프로세스 진행률 표시
- Phase별 실행 단계 표시

### 📋 로깅 시스템
- **실시간 로그**: Socket.IO를 통한 실시간 로그 스트리밍
- **히스토리**: 과거 실행 기록 조회
- **로그 파일**: 파일별 로그 조회 및 다운로드

## 🔧 설정 옵션

### 리포지토리 순서 변경

`services/mergeManager.js`의 `getExecutionOrder()` 함수에서 실행 순서를 변경할 수 있습니다:

```javascript
getExecutionOrder() {
  return {
    phase1: ['danal-core'],
    phase2: ['smart-settlement-extapi'],
    phase3: [
      'smart-settlement-batch',
      'smart-settlement-api',
      'smart-settlement-merchant-interface'
    ]
  };
}
```

### 브랜치명 패턴 변경

`services/githubService.js`의 `createHotfixBranch()` 함수에서 브랜치명 패턴을 수정할 수 있습니다:

```javascript
const branchName = `hotfix-${baseBranch}/merge-${baseBranch}-into-${targetBranch}-${date}`;
```

## 🚨 에러 처리

### 일반적인 문제 해결

1. **GitHub API Rate Limit**
   - GitHub Token의 권한 확인
   - API 호출 빈도 조절

2. **브랜치 생성 실패**
   - 동일한 이름의 브랜치가 이미 존재하는 경우
   - 기준 브랜치(master/release)가 존재하지 않는 경우

3. **Pull Request 생성 실패**
   - 머지할 변경사항이 없는 경우
   - 권한 부족

4. **네트워크 오류**
   - 자동 재시도 로직 동작
   - 로그에서 상세 오류 내용 확인

## 📈 로그 분석

### 로그 레벨
- **INFO**: 일반적인 프로세스 진행 상황
- **WARN**: 주의가 필요한 상황 (브랜치 중복 등)
- **ERROR**: 실행 실패 및 오류 상황
- **DEBUG**: 상세 디버깅 정보 (개발 모드)

### 로그 파일 위치
- `logs/application.log`: 전체 애플리케이션 로그
- `logs/error.log`: 에러 로그만 분리
- `logs/weekly-merge-YYYY-MM-DD.log`: 일별 머지 작업 로그

## 🔒 보안 고려사항

1. **GitHub Token 보안**
   - 환경변수로 토큰 관리
   - 최소 권한 원칙 적용

2. **웹 접근 제어**
   - 내부 네트워크에서만 접근 가능하도록 설정
   - 필요시 인증 시스템 추가 구현

3. **로그 보안**
   - 민감 정보 로그 출력 방지
   - 로그 파일 접근 권한 관리

## 🔧 개발 및 확장

### 테스트 실행

```bash
npm test
```

### 추가 기능 개발 가이드

1. **알림 시스템 추가**
   - Slack/Email 연동
   - `services/notificationService.js` 생성

2. **스케줄링 기능**
   - node-cron을 이용한 자동 실행
   - 주간 스케줄 설정

3. **대시보드 확장**
   - 통계 차트 추가
   - 성능 모니터링 메트릭

## 📞 지원 및 문의

문제 발생 시 다음을 확인해주세요:

1. **로그 파일**: `/logs` 디렉토리의 최신 로그 확인
2. **환경변수**: `.env` 파일의 설정값 검증
3. **GitHub 권한**: Personal Access Token의 권한 확인
4. **네트워크**: GitHub API 접근 가능 여부 확인

## 📝 라이센스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request