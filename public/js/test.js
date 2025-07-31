/**
 * 테스트 기능 관리 스크립트
 * GitHub 연결, 인증, 리포지토리, 브랜치, 권한 테스트를 처리합니다.
 */

class TestManager {
    constructor() {
        this.currentTab = 'connection';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabSwitching();
    }

    setupEventListeners() {
        // 연결 테스트
        document.getElementById('btnTestConnection')?.addEventListener('click', () => {
            this.testConnection();
        });

        document.getElementById('btnTestAuth')?.addEventListener('click', () => {
            this.testAuthentication();
        });

        // 리포지토리 테스트
        document.getElementById('btnTestRepo')?.addEventListener('click', () => {
            this.testRepository();
        });

        document.getElementById('btnTestAllRepos')?.addEventListener('click', () => {
            this.testAllRepositories();
        });

        // 브랜치 테스트
        document.getElementById('btnTestBranches')?.addEventListener('click', () => {
            this.testBranches();
        });

        document.getElementById('btnTestAllBranches')?.addEventListener('click', () => {
            this.testAllBranches();
        });

        // 권한 테스트
        document.getElementById('btnTestPermissions')?.addEventListener('click', () => {
            this.testPermissions();
        });

        document.getElementById('btnTestPRPermission')?.addEventListener('click', () => {
            this.testPRPermission();
        });

        document.getElementById('btnTestBranchPermission')?.addEventListener('click', () => {
            this.testBranchPermission();
        });

        // API 테스트
        document.getElementById('btnTestAPI')?.addEventListener('click', () => {
            this.testAPI();
        });

        document.getElementById('btnTestRateLimit')?.addEventListener('click', () => {
            this.testRateLimit();
        });
    }

    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.test-section .tab-button');
        const tabContents = document.querySelectorAll('.test-section .tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');

                // 모든 탭 버튼에서 active 클래스 제거
                tabButtons.forEach(btn => btn.classList.remove('active'));
                // 클릭된 버튼에 active 클래스 추가
                button.classList.add('active');

                // 모든 탭 컨텐트에서 active 클래스 제거
                tabContents.forEach(content => content.classList.remove('active'));
                // 해당 탭 컨텐트에 active 클래스 추가
                const targetContent = document.getElementById(tabName);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                this.currentTab = tabName;
            });
        });
    }

    // ============================================
    // 연결 테스트
    // ============================================

    async testConnection() {
        const resultsContainer = document.getElementById('connectionResults');
        const button = document.getElementById('btnTestConnection');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, 'GitHub API 연결을 테스트하는 중...');

        try {
            const response = await fetch('/api/test/connection');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, 'GitHub API 연결 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, 'GitHub API 연결 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '인터넷 연결을 확인해주세요',
                        '서버가 실행 중인지 확인해주세요',
                        'GitHub API가 접근 가능한지 확인해주세요'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async testAuthentication() {
        const resultsContainer = document.getElementById('connectionResults');
        const button = document.getElementById('btnTestAuth');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, 'GitHub 토큰 인증을 검증하는 중...');

        try {
            const response = await fetch('/api/test/authentication');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, 'GitHub 토큰 인증 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, 'GitHub 토큰 인증 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '토큰이 설정되지 않았습니다',
                        '잘못된 토큰 형식입니다',
                        '토큰이 만료되었습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    // ============================================
    // 리포지토리 테스트
    // ============================================

    async testRepository() {
        const repoSelect = document.getElementById('repoSelect');
        const resultsContainer = document.getElementById('repositoryResults');
        const button = document.getElementById('btnTestRepo');

        const selectedRepo = repoSelect.value;
        if (!selectedRepo) {
            this.displayError(resultsContainer, '리포지토리 테스트',
                '테스트할 리포지토리를 선택해주세요.', {
                    errorType: 'ValidationError',
                    possibleCauses: ['리포지토리 선택 드롭다운에서 리포지토리를 선택해주세요']
                });
            return;
        }

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, `${selectedRepo} 리포지토리 상태를 확인하는 중...`);

        try {
            const response = await fetch(`/api/test/repository/${selectedRepo}`);
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, `${selectedRepo} 리포지토리 테스트`, result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, `${selectedRepo} 리포지토리 테스트`,
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '서버와 연결할 수 없습니다',
                        'GitHub API 요청 제한에 걸렸을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async testAllRepositories() {
        const resultsContainer = document.getElementById('repositoryResults');
        const button = document.getElementById('btnTestAllRepos');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, '모든 리포지토리 상태를 확인하는 중...');

        try {
            const response = await fetch('/api/test/repositories/all');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, '전체 리포지토리 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, '전체 리포지토리 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '서버와 연결할 수 없습니다',
                        'GitHub API 요청 제한에 걸렸을 수 있습니다',
                        '일부 리포지토리에 접근 권한이 없을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    // ============================================
    // 브랜치 테스트
    // ============================================

    async testBranches() {
        const repoSelect = document.getElementById('branchRepoSelect');
        const branchInput = document.getElementById('branchName');
        const resultsContainer = document.getElementById('branchResults');
        const button = document.getElementById('btnTestBranches');

        const selectedRepo = repoSelect.value;
        if (!selectedRepo) {
            this.displayError(resultsContainer, '브랜치 테스트',
                '테스트할 리포지토리를 선택해주세요.', {
                    errorType: 'ValidationError',
                    possibleCauses: ['리포지토리 선택 드롭다운에서 리포지토리를 선택해주세요']
                });
            return;
        }

        const branches = branchInput.value.trim() || 'master,release,develop';
        const branchList = branches.split(',').map(b => b.trim()).filter(b => b);

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer,
            `${selectedRepo} 리포지토리의 브랜치 [${branchList.join(', ')}]를 확인하는 중...`);

        try {
            const response = await fetch('/api/test/branches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    repository: selectedRepo,
                    branches: branchList
                })
            });
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, `${selectedRepo} 브랜치 테스트`, result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, `${selectedRepo} 브랜치 테스트`,
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '서버와 연결할 수 없습니다',
                        'GitHub API 요청 제한에 걸렸을 수 있습니다',
                        '지정된 브랜치가 존재하지 않을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async testAllBranches() {
        const resultsContainer = document.getElementById('branchResults');
        const button = document.getElementById('btnTestAllBranches');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, '모든 리포지토리의 브랜치를 확인하는 중...');

        try {
            const response = await fetch('/api/test/branches/all');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, '전체 브랜치 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, '전체 브랜치 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '서버와 연결할 수 없습니다',
                        'GitHub API 요청 제한에 걸렸을 수 있습니다',
                        '일부 리포지토리에 접근 권한이 없을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    // ============================================
    // 권한 테스트
    // ============================================

    async testPermissions() {
        const resultsContainer = document.getElementById('permissionResults');
        const button = document.getElementById('btnTestPermissions');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, 'GitHub 접근 권한을 검증하는 중...');

        try {
            const response = await fetch('/api/test/permissions');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, '전체 권한 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, '전체 권한 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '서버와 연결할 수 없습니다',
                        '토큰 권한이 부족할 수 있습니다',
                        'GitHub API 요청 제한에 걸렸을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async testPRPermission() {
        const resultsContainer = document.getElementById('permissionResults');
        const button = document.getElementById('btnTestPRPermission');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, 'Pull Request 생성 권한을 확인하는 중...');

        try {
            const response = await fetch('/api/test/permissions/pr');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, 'PR 생성 권한 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, 'PR 생성 권한 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        'Pull Request 생성 권한이 없습니다',
                        '토큰에 repo 권한이 필요합니다',
                        '리포지토리 접근 권한을 확인해주세요'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async testBranchPermission() {
        const resultsContainer = document.getElementById('permissionResults');
        const button = document.getElementById('btnTestBranchPermission');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, '브랜치 생성 권한을 확인하는 중...');

        try {
            const response = await fetch('/api/test/permissions/branch');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, '브랜치 생성 권한 테스트', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, '브랜치 생성 권한 테스트',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '브랜치 생성 권한이 없습니다',
                        '토큰에 repo 권한이 필요합니다',
                        '리포지토리 접근 권한을 확인해주세요'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    // ============================================
    // API 테스트
    // ============================================

    async testAPI() {
        const endpointInput = document.getElementById('apiEndpoint');
        const methodSelect = document.getElementById('apiMethod');
        const resultsContainer = document.getElementById('apiResults');
        const button = document.getElementById('btnTestAPI');

        const endpoint = endpointInput.value.trim();
        const method = methodSelect.value;

        if (!endpoint) {
            this.displayError(resultsContainer, 'API 호출 테스트',
                'API 엔드포인트를 입력해주세요.', {
                    errorType: 'ValidationError',
                    possibleCauses: [
                        'API 엔드포인트를 입력해주세요 (예: /user, /repos/owner/repo)',
                        '슬래시(/)로 시작하는 경로를 입력해주세요'
                    ]
                });
            return;
        }

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, `${method} ${endpoint} API를 호출하는 중...`);

        try {
            const response = await fetch('/api/test/api-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: endpoint,
                    method: method
                })
            });
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, `${method} ${endpoint} API 테스트`, result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, `${method} ${endpoint} API 테스트`,
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '잘못된 API 엔드포인트입니다',
                        'API 호출 권한이 없습니다',
                        'GitHub API 요청 제한에 걸렸을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async testRateLimit() {
        const resultsContainer = document.getElementById('apiResults');
        const button = document.getElementById('btnTestRateLimit');

        this.setButtonLoading(button, true);
        this.clearResults(resultsContainer);
        this.showLoadingMessage(resultsContainer, 'GitHub API Rate Limit을 확인하는 중...');

        try {
            const response = await fetch('/api/test/rate-limit');
            const result = await response.json();

            this.clearResults(resultsContainer);
            this.displayTestResult(resultsContainer, 'Rate Limit 확인', result);
        } catch (error) {
            this.clearResults(resultsContainer);
            this.displayError(resultsContainer, 'Rate Limit 확인',
                `네트워크 오류: ${error.message}`, {
                    errorType: 'NetworkError',
                    possibleCauses: [
                        '서버와 연결할 수 없습니다',
                        'GitHub API에 접근할 수 없습니다',
                        '토큰이 유효하지 않을 수 있습니다'
                    ]
                });
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    // ============================================
    // 유틸리티 메서드
    // ============================================

    setButtonLoading(button, loading) {
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = '<span>⏳</span> 테스트 중...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || button.innerHTML;
            button.classList.remove('loading');
        }
    }

    clearResults(container) {
        if (container) {
            container.innerHTML = '';
        }
    }

    showLoadingMessage(container, message) {
        if (!container) return;

        container.innerHTML = `
            <div class="test-result loading">
                <div class="result-header">
                    <span class="status-icon">⏳</span>
                    <span class="result-title">${message}</span>
                </div>
            </div>
        `;
    }

    displayTestResult(container, title, result) {
        if (!container) return;

        const { success, message, data } = result;
        const statusIcon = success ? '✅' : '❌';
        const statusClass = success ? 'success' : 'error';

        let html = `
            <div class="test-result ${statusClass}">
                <div class="result-header">
                    <span class="status-icon">${statusIcon}</span>
                    <span class="result-title">${title}</span>
                </div>
                <div class="result-message">${message}</div>
        `;

        if (data && Object.keys(data).length > 0) {
            html += '<div class="result-details">';

            if (success) {
                // 성공 시 데이터 표시
                html += this.formatSuccessData(data);
            } else {
                // 실패 시 상세 에러 정보 표시
                html += this.formatErrorData(data);
            }

            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    displayError(container, title, message, details = {}) {
        if (!container) return;

        let html = `
            <div class="test-result error">
                <div class="result-header">
                    <span class="status-icon">❌</span>
                    <span class="result-title">${title}</span>
                </div>
                <div class="result-message">${message}</div>
        `;

        if (details && Object.keys(details).length > 0) {
            html += '<div class="result-details">';
            html += this.formatErrorData(details);
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    formatSuccessData(data) {
        let html = '<div class="success-data">';

        if (Array.isArray(data)) {
            // 배열 데이터 처리
            html += '<div class="data-list">';
            data.forEach((item, index) => {
                html += `<div class="data-item">
                    <strong>항목 ${index + 1}:</strong>
                    ${this.formatDataObject(item)}
                </div>`;
            });
            html += '</div>';
        } else if (typeof data === 'object') {
            // 객체 데이터 처리
            html += this.formatDataObject(data);
        } else {
            // 기본 데이터 처리
            html += `<div class="data-value">${data}</div>`;
        }

        html += '</div>';
        return html;
    }

    formatErrorData(data) {
        let html = '<div class="error-data">';

        // 기본 에러 정보
        if (data.statusCode) {
            html += `<div class="error-item">
                <strong>상태 코드:</strong> ${data.statusCode}
            </div>`;
        }

        if (data.statusText) {
            html += `<div class="error-item">
                <strong>상태 텍스트:</strong> ${data.statusText}
            </div>`;
        }

        if (data.errorType) {
            html += `<div class="error-item">
                <strong>에러 유형:</strong> ${data.errorType}
            </div>`;
        }

        if (data.timestamp) {
            html += `<div class="error-item">
                <strong>발생 시간:</strong> ${new Date(data.timestamp).toLocaleString()}
            </div>`;
        }

        // 가능한 원인들
        if (data.possibleCauses && Array.isArray(data.possibleCauses)) {
            html += `<div class="error-item">
                <strong>가능한 원인:</strong>
                <ul class="cause-list">`;
            data.possibleCauses.forEach(cause => {
                html += `<li>${cause}</li>`;
            });
            html += '</ul></div>';
        }

        // 추가 세부 정보
        const additionalKeys = Object.keys(data).filter(key =>
            !['statusCode', 'statusText', 'errorType', 'timestamp', 'possibleCauses'].includes(key)
        );

        if (additionalKeys.length > 0) {
            html += '<div class="error-item"><strong>추가 정보:</strong><div class="additional-info">';
            additionalKeys.forEach(key => {
                const value = data[key];
                if (value !== null && value !== undefined) {
                    html += `<div class="info-item">
                        <span class="info-key">${key}:</span>
                        <span class="info-value">${typeof value === 'object' ? JSON.stringify(value, null, 2) : value}</span>
                    </div>`;
                }
            });
            html += '</div></div>';
        }

        html += '</div>';
        return html;
    }

    formatDataObject(obj) {
        let html = '<div class="data-object">';

        Object.entries(obj).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                html += `<div class="data-item">
                    <span class="data-key">${key}:</span>
                    <span class="data-value">`;

                if (typeof value === 'object') {
                    if (Array.isArray(value)) {
                        html += value.join(', ');
                    } else {
                        html += JSON.stringify(value, null, 2);
                    }
                } else {
                    html += value;
                }

                html += '</span></div>';
            }
        });

        html += '</div>';
        return html;
    }
}

// TestManager 인스턴스 생성
window.testManager = new TestManager();
