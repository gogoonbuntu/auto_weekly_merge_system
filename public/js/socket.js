// Socket.IO 이벤트 리스너들

socket.on('connect', () => {
    addLog('info', 'Dashboard에 연결되었습니다.');
});

socket.on('process-started', (data) => {
    currentProcessData = data;
    setUIState(true);
    updateProcessStatus();
    addLog('info', `${data.direction} 프로세스가 시작되었습니다.`);
});

socket.on('process-completed', (data) => {
    currentProcessData = null;
    setUIState(false);
    completedRepos.textContent = data.results.filter(r => r.status === 'completed').length;
    addLog('info', `프로세스가 완료되었습니다. (${data.duration}초 소요)`);
    loadStatus(); // 상태 새로고침
});

socket.on('process-failed', (data) => {
    currentProcessData = null;
    setUIState(false);
    addLog('error', `프로세스 실행 중 오류가 발생했습니다: ${data.error}`);
    loadStatus(); // 상태 새로고침
});

socket.on('repository-started', (data) => {
    addLog('info', `${data.repo} 리포지토리 머지 시작`);
    updateRepositoryStatus(data.repo, 'in-progress');
});

socket.on('repository-completed', (data) => {
    addLog('info', `${data.repo} 리포지토리 머지 완료`);
    updateRepositoryStatus(data.repo, 'completed');
    completedRepos.textContent = parseInt(completedRepos.textContent) + 1;
});

socket.on('repository-failed', (data) => {
    addLog('error', `${data.repo} 리포지토리 머지 실패: ${data.error}`);
    updateRepositoryStatus(data.repo, 'failed');
});

socket.on('phase-started', (data) => {
    addLog('info', `Phase ${data.phase} 시작: ${data.repositories.join(', ')}`);
    if (currentProcessData) {
        currentProcessData.currentPhase = data.phase;
        updateProcessStatus();
    }
});

socket.on('phase-completed', (data) => {
    addLog('info', `Phase ${data.phase} 완료`);
});

socket.on('log-update', (logEntry) => {
    addLog(logEntry.level, logEntry.message, new Date(logEntry.timestamp));
});

socket.on('current-status', (status) => {
    if (status) {
        currentProcessData = status;
        updateProcessStatus();
    }
});