// Socket.IO 연결
const socket = io();

// DOM 요소 참조
const btnMasterToRelease = document.getElementById('btnMasterToRelease');
const btnReleaseToDevelop = document.getElementById('btnReleaseToDevelop');
const btnStop = document.getElementById('btnStop');
const btnRefresh = document.getElementById('btnRefresh');
const repositoryList = document.getElementById('repositoryList');
const logContainer = document.getElementById('logContainer');
const processInfo = document.getElementById('processInfo');
const processTitle = document.getElementById('processTitle');
const processDetails = document.getElementById('processDetails');
const progressFill = document.getElementById('progressFill');
const completedRepos = document.getElementById('completedRepos');
const currentProcess = document.getElementById('currentProcess');

// 토큰 관련 요소
const githubToken = document.getElementById('githubToken');
const btnSaveToken = document.getElementById('btnSaveToken');
const btnTestToken = document.getElementById('btnTestToken');
const btnToggleToken = document.getElementById('btnToggleToken');
const tokenStatus = document.getElementById('tokenStatus');
const tokenStatusIcon = document.getElementById('tokenStatusIcon');
const tokenStatusText = document.getElementById('tokenStatusText');

// 상태 변수
let repositories = [];
let isProcessRunning = false;
let currentProcessData = null;
let isTokenVisible = false;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadStatus();
    checkTokenStatus();
    setupEventListeners();
    setupTabs();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 기존 이벤트 리스너
    btnMasterToRelease.addEventListener('click', () => executeMerge('master-to-release'));
    btnReleaseToDevelop.addEventListener('click', () => executeMerge('release-to-develop'));
    btnStop.addEventListener('click', stopProcess);
    btnRefresh.addEventListener('click', loadStatus);

    // 토큰 관련 이벤트 리스너
    btnSaveToken.addEventListener('click', handleSaveToken);
    btnTestToken.addEventListener('click', handleTestToken);
    btnToggleToken.addEventListener('click', toggleTokenVisibility);
    
    // 토큰 입력 필드에서 엔터키 처리
    githubToken.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSaveToken();
        }
    });
}

// 토큰 상태 확인
async function checkTokenStatus() {
    try {
        const result = await getTokenStatus();
        updateTokenStatus(result.data);
    } catch (error) {
        console.error('토큰 상태 확인 실패:', error);
        updateTokenStatus({
            configured: false,
            valid: false,
            message: '토큰 상태 확인 실패'
        });
    }
}

// 토큰 상태 업데이트
function updateTokenStatus(status) {
    if (status.configured && status.valid) {
        tokenStatusIcon.textContent = '✅';
        tokenStatusText.textContent = '토큰이 정상적으로 설정되었습니다.';
        tokenStatus.style.color = '#28a745';
        
        // 사용자 정보가 있으면 표시
        if (status.user) {
            tokenStatusText.textContent += ` (사용자: ${status.user.login})`;
        }
    } else if (status.configured && !status.valid) {
        tokenStatusIcon.textContent = '❌';
        tokenStatusText.textContent = '토큰이 유효하지 않습니다.';
        tokenStatus.style.color = '#dc3545';
    } else {
        tokenStatusIcon.textContent = '❓';
        tokenStatusText.textContent = 'GitHub 토큰을 설정해주세요.';
        tokenStatus.style.color = '#ffc107';
    }
}

// 토큰 저장 처리
async function handleSaveToken() {
    const token = githubToken.value.trim();
    
    if (!token) {
        alert('토큰을 입력해주세요.');
        return;
    }

    if (!token.startsWith('ghp_')) {
        alert('올바른 GitHub Personal Access Token을 입력해주세요 (ghp_로 시작).');
        return;
    }

    try {
        btnSaveToken.disabled = true;
        btnSaveToken.innerHTML = '<span>⏳</span> 저장 중...';

        const result = await saveToken(token);
        
        if (result.success) {
            alert('토큰이 성공적으로 저장되었습니다!');
            githubToken.value = ''; // 토큰 입력 필드 초기화
            await checkTokenStatus(); // 토큰 상태 다시 확인
            loadStatus(); // 상태 새로고침
        } else {
            alert(`토큰 저장 실패: ${result.error}`);
        }
    } catch (error) {
        console.error('토큰 저장 중 오류:', error);
        alert(`토큰 저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        btnSaveToken.disabled = false;
        btnSaveToken.innerHTML = '<span>💾</span> 토큰 저장';
    }
}

// 토큰 검증 처리
async function handleTestToken() {
    const token = githubToken.value.trim();
    
    if (!token) {
        alert('검증할 토큰을 입력해주세요.');
        return;
    }

    try {
        btnTestToken.disabled = true;
        btnTestToken.innerHTML = '<span>⏳</span> 검증 중...';

        const result = await verifyToken(token);
        
        if (result.success) {
            const userData = result.data;
            alert(`토큰이 유효합니다!\n\n사용자: ${userData.user.login}\n이름: ${userData.user.name || 'N/A'}\n권한: ${userData.scopes.join(', ')}`);
        } else {
            alert(`토큰 검증 실패: ${result.message}`);
        }
    } catch (error) {
        console.error('토큰 검증 중 오류:', error);
        alert(`토큰 검증 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        btnTestToken.disabled = false;
        btnTestToken.innerHTML = '<span>🔍</span> 토큰 검증';
    }
}

// 토큰 표시/숨김 토글
function toggleTokenVisibility() {
    isTokenVisible = !isTokenVisible;
    githubToken.type = isTokenVisible ? 'text' : 'password';
    btnToggleToken.innerHTML = isTokenVisible ? '<span>🙈</span>' : '<span>👁️</span>';
}

// 탭 설정
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // 모든 탭 비활성화
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // 선택된 탭 활성화
            button.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // 탭별 데이터 로드
            if (tabId === 'history') {
                loadHistory();
            } else if (tabId === 'files') {
                loadLogFiles();
            }
        });
    });
}

// 주기적으로 상태 새로고침 (30초마다)
setInterval(() => {
    if (!isProcessRunning) {
        loadStatus();
        checkTokenStatus(); // 토큰 상태도 주기적으로 확인
    }
}, 30000);