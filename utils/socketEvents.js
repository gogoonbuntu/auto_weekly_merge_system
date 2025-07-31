const logger = require('./logger');

/**
 * Socket.IO 이벤트 설정
 */
function setupSocketEvents(io, mergeManager) {
    // Socket.IO 연결 처리
    io.on('connection', (socket) => {
        logger.info(`클라이언트 연결: ${socket.id}`);
        
        // 클라이언트 연결 시 현재 상태 및 토큰 상태 전송
        socket.emit('current-status', {
            process: mergeManager.getCurrentProcessStatus(),
            tokenConfigured: mergeManager.tokenConfigured,
            timestamp: new Date().toISOString()
        });
        
        // 클라이언트별 실시간 테스트 결과 요청 처리
        socket.on('request-test-result', async (data) => {
            const { testType, params } = data;
            logger.info(`테스트 요청 받음: ${testType} from ${socket.id}`);
            
            try {
                let result;
                
                switch (testType) {
                    case 'connection':
                        result = await mergeManager.testGitHubConnection();
                        break;
                    case 'authentication':
                        result = await mergeManager.testAuthentication();
                        break;
                    case 'repository':
                        result = await mergeManager.testRepository(params.repoName);
                        break;
                    case 'all-repositories':
                        result = await mergeManager.testAllRepositories();
                        break;
                    case 'branches':
                        result = await mergeManager.testBranches(params.repository, params.branches);
                        break;
                    case 'all-branches':
                        result = await mergeManager.testAllBranches();
                        break;
                    case 'permissions':
                        result = await mergeManager.testPermissions();
                        break;
                    case 'pr-permission':
                        result = await mergeManager.testPRPermission();
                        break;
                    case 'branch-permission':
                        result = await mergeManager.testBranchPermission();
                        break;
                    case 'api-call':
                        result = await mergeManager.testAPICall(params.endpoint, params.method);
                        break;
                    case 'rate-limit':
                        result = await mergeManager.testRateLimit();
                        break;
                    default:
                        result = {
                            success: false,
                            message: `지원하지 않는 테스트 유형: ${testType}`,
                            data: null
                        };
                }
                
                // 테스트 결과를 요청한 클라이언트에게만 전송
                socket.emit('test-result', {
                    testType,
                    params,
                    result,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                logger.error(`테스트 실행 실패 (${testType}):`, error);
                socket.emit('test-result', {
                    testType,
                    params,
                    result: {
                        success: false,
                        message: `테스트 실행 실패: ${error.message}`,
                        data: null
                    },
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        // 상태 새로고침 요청 처리
        socket.on('refresh-status', () => {
            socket.emit('current-status', {
                process: mergeManager.getCurrentProcessStatus(),
                tokenConfigured: mergeManager.tokenConfigured,
                timestamp: new Date().toISOString()
            });
        });
        
        socket.on('disconnect', () => {
            logger.info(`클라이언트 연결 해제: ${socket.id}`);
        });
    });

    // 머지 매니저 이벤트를 Socket.IO로 브로드캐스트
    mergeManager.on('process-started', (data) => {
        logger.info('📤 프로세스 시작 이벤트 브로드캐스트');
        io.emit('process-started', data);
    });

    mergeManager.on('process-completed', (data) => {
        logger.info('📤 프로세스 완료 이벤트 브로드캐스트');
        io.emit('process-completed', data);
    });

    mergeManager.on('process-failed', (data) => {
        logger.error('📤 프로세스 실패 이벤트 브로드캐스트');
        io.emit('process-failed', data);
    });

    mergeManager.on('process-cancelled', (data) => {
        logger.warn('📤 프로세스 취소 이벤트 브로드캐스트');
        io.emit('process-cancelled', data);
    });

    mergeManager.on('phase-started', (data) => {
        logger.info(`📤 Phase ${data.phase} 시작 이벤트 브로드캐스트`);
        io.emit('phase-started', data);
    });

    mergeManager.on('phase-completed', (data) => {
        logger.info(`📤 Phase ${data.phase} 완료 이벤트 브로드캐스트`);
        io.emit('phase-completed', data);
    });

    mergeManager.on('repository-started', (data) => {
        logger.info(`📤 리포지토리 시작 이벤트 브로드캐스트: ${data.repo}`);
        io.emit('repository-started', data);
    });

    mergeManager.on('repository-completed', (data) => {
        logger.info(`📤 리포지토리 완료 이벤트 브로드캐스트: ${data.repo}`);
        io.emit('repository-completed', data);
    });

    mergeManager.on('repository-failed', (data) => {
        logger.error(`📤 리포지토리 실패 이벤트 브로드캐스트: ${data.repo}`);
        io.emit('repository-failed', data);
    });

    mergeManager.on('token-configured', (data) => {
        logger.info('📤 토큰 설정 이벤트 브로드캐스트');
        io.emit('token-configured', data);
    });

    // 로그 스트림을 Socket.IO로 전송
    if (logger.stream) {
        logger.stream.on('log', (logEntry) => {
            // 실시간 로그를 모든 클라이언트에게 전송
            io.emit('log-update', {
                ...logEntry,
                timestamp: new Date().toISOString()
            });
        });
    }

    // 정기적으로 시스템 상태 업데이트 (30초마다)
    setInterval(() => {
        io.emit('system-status-update', {
            process: mergeManager.getCurrentProcessStatus(),
            tokenConfigured: mergeManager.tokenConfigured,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
        });
    }, 30000);
}

module.exports = { setupSocketEvents };