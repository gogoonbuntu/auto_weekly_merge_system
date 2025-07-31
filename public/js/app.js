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

// 상태 변수
let repositories = [];
let isProcessRunning = false;
let currentProcessData = null;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadStatus();
    setupEventListeners();
    setupTabs();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    btnMasterToRelease.addEventListener('click', () => executeMerge('master-to-release'));
    btnReleaseToDevelop.addEventListener('click', () => executeMerge('release-to-develop'));
    btnStop.addEventListener('click', stopProcess);
    btnRefresh.addEventListener('click', loadStatus);
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
    }
}, 30000);