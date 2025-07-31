// UI 업데이트 관련 함수들

// UI 상태 업데이트
function setUIState(running) {
    isProcessRunning = running;
    
    btnMasterToRelease.disabled = running;
    btnReleaseToDevelop.disabled = running;
    btnStop.classList.toggle('hidden', !running);
    processInfo.classList.toggle('hidden', !running);
    
    if (running) {
        btnMasterToRelease.innerHTML = '<div class="loading"></div> 실행 중...';
        btnReleaseToDevelop.innerHTML = '<div class="loading"></div> 실행 중...';
    } else {
        btnMasterToRelease.innerHTML = '<span>🔄</span> Master → Release 머지 실행';
        btnReleaseToDevelop.innerHTML = '<span>🔄</span> Release → Develop 머지 실행';
    }
}

// 리포지토리 목록 업데이트
function updateRepositoryList() {
    repositoryList.innerHTML = '';
    
    repositories.forEach(repo => {
        const item = document.createElement('div');
        item.className = `repository-item ${repo.status}`;
        
        const statusIcon = getStatusIcon(repo.status);
        const statusText = getStatusText(repo.status);
        
        item.innerHTML = `
            <div class="repository-name">
                ${statusIcon} ${repo.repo}
            </div>
            <div class="repository-status">${statusText}</div>
        `;
        
        repositoryList.appendChild(item);
    });
}

// 프로세스 상태 업데이트
function updateProcessStatus() {
    if (currentProcessData) {
        currentProcess.textContent = currentProcessData.status;
        
        if (currentProcessData.status === 'running') {
            setUIState(true);
            processTitle.textContent = `${currentProcessData.direction} 프로세스 실행 중...`;
            
            const progress = ((currentProcessData.currentPhase - 1) / currentProcessData.totalPhases) * 100;
            progressFill.style.width = `${progress}%`;
            
            processDetails.textContent = `Phase ${currentProcessData.currentPhase}/${currentProcessData.totalPhases} 진행 중`;
        }
    } else {
        currentProcess.textContent = '대기 중';
        setUIState(false);
    }
}

// 상태 아이콘 반환
function getStatusIcon(status) {
    switch (status) {
        case 'completed': return '✅';
        case 'in-progress': return '🔄';
        case 'waiting': return '⏳';
        case 'failed': return '❌';
        default: return '📋';
    }
}

// 상태 텍스트 반환
function getStatusText(status) {
    switch (status) {
        case 'completed': return '완료됨';
        case 'in-progress': return '진행 중';
        case 'waiting': return '대기 중';
        case 'failed': return '실패';
        default: return '준비됨';
    }
}

// 로그 추가
function addLog(level, message, timestamp = new Date()) {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    
    const timeStr = timestamp.toLocaleTimeString();
    logEntry.textContent = `[${timeStr}] ${level.toUpperCase()}: ${message}`;
    
    logContainer.insertBefore(logEntry, logContainer.firstChild);
    
    // 최대 100개 로그만 유지
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// 리포지토리 상태 업데이트
function updateRepositoryStatus(repoName, status) {
    const repoIndex = repositories.findIndex(r => r.repo === repoName);
    if (repoIndex !== -1) {
        repositories[repoIndex].status = status;
        updateRepositoryList();
    }
}