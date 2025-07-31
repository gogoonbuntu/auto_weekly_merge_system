# 🔐 보안 토큰 설정 가이드

Auto Weekly Merge System의 GitHub 토큰을 안전하게 관리하는 방법을 설명합니다.

## 📋 개요

기존의 평문 토큰 저장 방식 대신, **AES-256-GCM 암호화**를 사용하여 토큰을 안전하게 보관합니다.

### 🎯 보안 특징

- **암호화**: AES-256-GCM 알고리즘 사용
- **마스터 키**: 32바이트 랜덤 키 자동 생성
- **파일 권한**: 소유자만 읽기/쓰기 가능 (mode 0o600)
- **Git 제외**: 보안 파일들이 자동으로 .gitignore에 포함

## 🚀 빠른 시작

### Step 1: 토큰 설정

```bash
# 토큰 관리 CLI 실행
npm run token

# 또는 직접 실행
node scripts/token-manager.js
```

### Step 2: GitHub Personal Access Token 입력

CLI에서 `1. GitHub 토큰 설정`을 선택하고 토큰을 입력합니다.

### Step 3: 설정 검증

```bash
# 전체 설정 상태 확인
npm run validate-config
```

## 🔧 상세 사용법

### 토큰 관리 CLI 메뉴

```
📋 메뉴를 선택하세요:
1. GitHub 토큰 설정     # 새 토큰 설정/업데이트
2. 토큰 목록 조회       # 저장된 토큰 확인
3. 토큰 검증           # 토큰 유효성 검사
4. 토큰 삭제           # 토큰 제거
5. 설정 상태 확인       # 전체 상태 점검
0. 종료
```

### 토큰 설정 예시

```bash
$ npm run token

🔐 보안 토큰 관리자
==================================================

📋 메뉴를 선택하세요:
1. GitHub 토큰 설정
...
선택 (0-5): 1

🔑 GitHub Personal Access Token 설정
💡 토큰은 repo, workflow 권한이 필요합니다.
GitHub Token을 입력하세요: ghp_your_token_here
✅ GitHub 토큰이 안전하게 저장되었습니다.
```

## 📁 생성되는 보안 파일

### `.token_key`
- **용도**: 암호화 마스터 키
- **형식**: 32바이트 바이너리 파일
- **권한**: 소유자만 읽기/쓰기 (0o600)

### `.secure_tokens`
- **용도**: 암호화된 토큰 저장소
- **형식**: JSON (암호화된 데이터)
- **권한**: 소유자만 읽기/쓰기 (0o600)

```json
{
  "GITHUB_TOKEN": {
    "encrypted": "base64_encrypted_data...",
    "createdAt": "2025-07-31T12:00:00.000Z",
    "updatedAt": "2025-07-31T12:00:00.000Z"
  }
}
```

## 🛡️ 보안 모델

### 암호화 프로세스

```
Plain Token → AES-256-GCM → Base64 → JSON File
     ↓
Master Key (32 bytes) + IV (16 bytes) + AuthTag
```

### 복호화 프로세스

```
JSON File → Base64 → AES-256-GCM → Plain Token
    ↓
Master Key + IV + AuthTag 검증
```

## 🔄 마이그레이션

### 기존 평문 토큰에서 보안 토큰으로

시스템은 기존 `.env` 파일의 평문 토큰을 자동으로 감지하고 마이그레이션을 제안합니다:

```bash
🔄 기존 GitHub 토큰을 보안 저장소로 마이그레이션 중...
✅ GitHub 토큰이 안전하게 마이그레이션되었습니다.
⚠️  .env 파일에서 GITHUB_TOKEN을 제거하세요.
```

### 수동 마이그레이션

```bash
# 1. 토큰 관리 CLI 실행
npm run token

# 2. 새 토큰 설정 선택
# 3. 기존 토큰 입력
# 4. .env 파일에서 GITHUB_TOKEN 제거
```

## 🔍 검증 및 테스트

### 설정 전체 검증

```bash
npm run validate-config
```

출력 예시:
```
🔍 Auto Weekly Merge System 설정 검증
============================================================

📋 1. 기본 설정 검증
----------------------------------------
✅ 모든 기본 설정이 올바릅니다.

⚙️  2. 현재 설정 정보
----------------------------------------
포트: 3000
환경: development
GitHub 조직: your-org
대상 리포지토리 수: 5
보안 토큰 설정: ✅ 설정됨

🔐 3. 보안 토큰 상태
----------------------------------------
✅ 1개의 보안 토큰이 저장되어 있습니다:
   - GITHUB_TOKEN (생성: 2025-07-31 21:00:00)

🌐 4. GitHub API 연결 테스트
----------------------------------------
✅ GitHub API 연결 성공
   응답시간: 234ms
   Rate Limit 남은 횟수: 4999
✅ GitHub 인증 성공
   사용자: your-username
   권한: repo, workflow
```

### GitHub API 연결 테스트

토큰 검증 시 실제 GitHub API 연결을 테스트할 수 있습니다:

```bash
검증할 토큰 이름을 입력하세요 (기본: GITHUB_TOKEN): 
✅ 토큰 'GITHUB_TOKEN'이 유효합니다.
GitHub API 연결을 테스트하시겠습니까? (y/N): y
✅ GitHub API 연결 성공!
   사용자: your-username
   이름: Your Name
   권한: User
```

## 🚨 보안 주의사항

### ✅ 해야 할 것

- 토큰 관리 CLI를 사용하여 토큰 설정
- `.env` 파일에서 평문 토큰 제거
- 보안 파일들을 Git에 커밋하지 않기
- 정기적으로 토큰 유효성 검증

### ❌ 하지 말아야 할 것

- `.token_key`, `.secure_tokens` 파일을 Git에 추가
- 보안 파일들을 다른 시스템과 공유
- 암호화된 토큰을 직접 수정
- 마스터 키 파일을 삭제 (토큰 복구 불가능)

## 🔧 API 사용법

### ConfigManager 사용

```javascript
const config = require('./src/config/config');

// GitHub 토큰 가져오기
const token = config.getGitHubToken(); // 자동으로 보안 저장소에서 로드

// 새 토큰 설정
config.setGitHubToken('ghp_new_token_here');

// 설정 검증
const validation = config.validate();
console.log(validation.isValid); // true/false
```

### SecureTokenManager 직접 사용

```javascript
const SecureTokenManager = require('./src/config/security');
const tokenManager = new SecureTokenManager();

// 토큰 저장
tokenManager.saveSecureToken('GITHUB_TOKEN', 'ghp_your_token');

// 토큰 로드
const token = tokenManager.loadSecureToken('GITHUB_TOKEN');

// 토큰 검증
const isValid = tokenManager.validateToken('GITHUB_TOKEN');

// 토큰 목록
const tokens = tokenManager.listTokens();
```

## 🆘 문제 해결

### "토큰을 찾을 수 없습니다"

```bash
# 토큰 상태 확인
npm run token
# 메뉴에서 "2. 토큰 목록 조회" 선택

# 새 토큰 설정
npm run token
# 메뉴에서 "1. GitHub 토큰 설정" 선택
```

### "마스터 키 처리 실패"

```bash
# .token_key 파일 권한 확인
ls -la .token_key

# 파일이 없으면 자동으로 재생성됩니다
rm .token_key
npm run token
```

### "암호화/복호화 실패"

```bash
# 토큰 저장소 재설정
rm .secure_tokens
npm run token
# 새로운 토큰 설정
```

## 📞 지원

추가적인 도움이 필요하시면:

1. **설정 검증**: `npm run validate-config`
2. **토큰 상태 확인**: `npm run token` → 메뉴 5번
3. **로그 확인**: `logs/` 폴더의 로그 파일 검토

---

**⚠️ 중요**: 보안 파일들 (`.token_key`, `.secure_tokens`)을 절대 Git에 커밋하거나 다른 사람과 공유하지 마세요!
