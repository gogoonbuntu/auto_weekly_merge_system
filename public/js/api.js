// API 호출 관련 함수들

// GitHub 토큰 관리
async function saveToken(token) {
    try {
        const response = await fetch('/api/config/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('토큰 저장 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

async function verifyToken(token) {
    try {
        const response = await fetch('/api/config/token/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('토큰 검증 실패:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

async function getTokenStatus() {
    try {
        const response = await fetch('/api/config/token/status');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('토큰 상태 확인 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 상태 로드
async function loadStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.success) {
            repositories = data.data.repositories;
            currentProcessData = data.data.currentProcess;
            updateRepositoryList();
            updateProcessStatus();
        }
    } catch (error) {
        console.error('상태 로드 실패:', error);
        addLog('error', `상태 로드 실패: ${error.message}`);
    }
}

// 머지 실행
async function executeMerge(direction) {
    if (isProcessRunning) {
        alert('이미 실행 중인 프로세스가 있습니다.');
        return;
    }

    const confirmed = confirm(`${direction === 'master-to-release' ? 'Master → Release' : 'Release → Develop'} 머지를 실행하시겠습니까?`);
    if (!confirmed) return;

    try {
        setUIState(true);
        
        const response = await fetch(`/api/merge/${direction}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error);
        }
        
        addLog('info', `${direction} 머지 프로세스가 시작되었습니다.`);
    } catch (error) {
        console.error('머지 실행 실패:', error);
        addLog('error', `머지 실행 실패: ${error.message}`);
        setUIState(false);
    }
}

// 프로세스 중단
async function stopProcess() {
    const confirmed = confirm('현재 실행 중인 프로세스를 중단하시겠습니까?');
    if (!confirmed) return;

    try {
        const response = await fetch('/api/process/stop', {
            method: 'POST'
        });

        const data = await response.json();
        
        if (data.success) {
            addLog('warn', '프로세스가 사용자에 의해 중단되었습니다.');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('프로세스 중단 실패:', error);
        addLog('error', `프로세스 중단 실패: ${error.message}`);
    }
}

// 히스토리 로드
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const data = await response.json();
        
        const historyContainer = document.getElementById('historyContainer');
        
        if (data.success && data.data.length > 0) {
            historyContainer.innerHTML = data.data.map(process => `
                <div class="process-history-item" style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 8px;">
                    <h4>${process.direction} - ${process.status}</h4>
                    <p>시작: ${new Date(process.startTime).toLocaleString()}</p>
                    ${process.endTime ? `<p>종료: ${new Date(process.endTime).toLocaleString()}</p>` : ''}
                    ${process.duration ? `<p>소요시간: ${process.duration}초</p>` : ''}
                    <p>결과: ${process.results ? process.results.length : 0}개 리포지토리 처리</p>
                </div>
            `).join('');
        } else {
            historyContainer.innerHTML = '<p>히스토리가 없습니다.</p>';
        }
    } catch (error) {
        console.error('히스토리 로드 실패:', error);
        document.getElementById('historyContainer').innerHTML = '<p>히스토리 로드에 실패했습니다.</p>';
    }
}

// 로그 파일 로드
async function loadLogFiles() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        const filesContainer = document.getElementById('filesContainer');
        
        if (data.success && data.data.length > 0) {
            filesContainer.innerHTML = data.data.map(file => `
                <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${file.name}</h4>
                        <p>크기: ${(file.size / 1024).toFixed(2)} KB</p>
                        <p>수정일: ${new Date(file.modified).toLocaleString()}</p>
                    </div>
                    <div>
                        <button class="btn" style="background: #667eea; color: white; padding: 5px 10px; margin: 0 5px;" 
                                onclick="viewLogFile('${file.name}')">보기</button>
                        <button class="btn" style="background: #28a745; color: white; padding: 5px 10px;" 
                                onclick="downloadLogFile('${file.name}')">다운로드</button>
                    </div>
                </div>
            `).join('');        } else {
            filesContainer.innerHTML = '<p>로그 파일이 없습니다.</p>';
        }
    } catch (error) {
        console.error('로그 파일 로드 실패:', error);
        document.getElementById('filesContainer').innerHTML = '<p>로그 파일 로드에 실패했습니다.</p>';
    }
}

// 로그 파일 보기
function viewLogFile(filename) {
    window.open(`/api/logs/${filename}`, '_blank');
}

// 로그 파일 다운로드
function downloadLogFile(filename) {
    window.open(`/api/logs/${filename}/download`, '_blank');
}