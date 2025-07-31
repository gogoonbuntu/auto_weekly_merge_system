const dotenv = require('dotenv');
const SecureTokenManager = require('./security');

// .env 파일 로드
dotenv.config();

class ConfigManager {
    constructor() {
        this.tokenManager = new SecureTokenManager();
        this.initializeTokens();
    }

    /**
     * 기존 평문 토큰을 보안 저장소로 마이그레이션
     */
    initializeTokens() {
        // .env에서 GITHUB_TOKEN이 있는지 확인
        const plainToken = process.env.GITHUB_TOKEN;
        
        if (plainToken && plainToken !== 'your_github_token_here') {
            console.log('🔄 기존 GitHub 토큰을 보안 저장소로 마이그레이션 중...');
            
            try {
                // 보안 저장소에 토큰 저장
                this.tokenManager.saveSecureToken('GITHUB_TOKEN', plainToken);
                console.log('✅ GitHub 토큰이 안전하게 마이그레이션되었습니다.');
                console.log('⚠️  .env 파일에서 GITHUB_TOKEN을 제거하세요.');
            } catch (error) {
                console.error('❌ 토큰 마이그레이션 실패:', error.message);
            }
        }
    }

    /**
     * GitHub 토큰 가져오기
     * @returns {string|null} GitHub 토큰
     */
    getGitHubToken() {
        // 1순위: 보안 저장소에서 로드
        let token = this.tokenManager.loadSecureToken('GITHUB_TOKEN');
        
        // 2순위: 환경변수에서 로드 (백업용)
        if (!token) {
            token = process.env.GITHUB_TOKEN;
            if (token && token !== 'your_github_token_here') {
                console.log('⚠️  .env 파일의 토큰을 사용합니다. 보안상 secure token으로 마이그레이션을 권장합니다.');
            }
        }
        
        if (!token || token === 'your_github_token_here') {
            throw new Error('GitHub 토큰이 설정되지 않았습니다. setGitHubToken() 메서드를 사용하여 토큰을 설정하세요.');
        }
        
        return token;
    }

    /**
     * GitHub 토큰 설정
     * @param {string} token - GitHub Personal Access Token
     */
    setGitHubToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('유효한 GitHub 토큰을 입력해주세요.');
        }
        
        // GitHub 토큰 형식 검증 (ghp_로 시작하는 40자리)
        if (!token.match(/^ghp_[a-zA-Z0-9]{36}$/)) {
            console.log('⚠️  GitHub Personal Access Token 형식이 올바르지 않을 수 있습니다.');
        }
        
        try {
            this.tokenManager.saveSecureToken('GITHUB_TOKEN', token);
            console.log('✅ GitHub 토큰이 안전하게 저장되었습니다.');
        } catch (error) {
            throw new Error(`토큰 저장 실패: ${error.message}`);
        }
    }

    /**
     * 설정 값 가져오기
     * @param {string} key - 설정 키
     * @param {any} defaultValue - 기본값
     * @returns {any} 설정 값
     */
    get(key, defaultValue = null) {
        return process.env[key] || defaultValue;
    }

    /**
     * 모든 설정 조회
     * @returns {Object} 설정 객체
     */
    getAll() {
        return {
            // 서버 설정
            port: parseInt(this.get('PORT', 3000)),
            nodeEnv: this.get('NODE_ENV', 'development'),
            
            // GitHub 설정
            githubOrg: this.get('GITHUB_ORG', 'your_organization_name_here'),
            
            // 리포지토리 설정
            repositories: this.get('REPOSITORIES', '').split(',').filter(repo => repo.trim()),
            
            // 알림 설정
            slackWebhookUrl: this.get('SLACK_WEBHOOK_URL'),
            emailFrom: this.get('EMAIL_FROM', 'noreply@company.com'),
            emailTo: this.get('EMAIL_TO', 'team@company.com'),
            
            // 로깅 설정
            logLevel: this.get('LOG_LEVEL', 'info'),
            
            // 보안 토큰 상태
            hasSecureGitHubToken: this.tokenManager.validateToken('GITHUB_TOKEN')
        };
    }

    /**
     * 설정 검증
     * @returns {Object} 검증 결과
     */
    validate() {
        const errors = [];
        const warnings = [];
        
        // 필수 설정 검증
        try {
            this.getGitHubToken();
        } catch (error) {
            errors.push('GitHub Token이 설정되지 않았습니다.');
        }
        
        if (!this.get('GITHUB_ORG') || this.get('GITHUB_ORG') === 'your_organization_name_here') {
            errors.push('GITHUB_ORG가 설정되지 않았습니다.');
        }
        
        if (!this.get('REPOSITORIES')) {
            errors.push('REPOSITORIES가 설정되지 않았습니다.');
        }
        
        // 경고 사항 검증
        if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'your_github_token_here') {
            warnings.push('.env 파일에 평문 토큰이 있습니다. 보안상 제거를 권장합니다.');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 토큰 관리자 반환
     * @returns {SecureTokenManager} 토큰 관리자 인스턴스
     */
    getTokenManager() {
        return this.tokenManager;
    }
}

// 싱글톤 패턴으로 내보내기
module.exports = new ConfigManager();
