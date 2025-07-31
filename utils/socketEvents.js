const logger = require('./logger');

/**
 * Socket.IO 이벤트 설정
 */
function setupSocketEvents(io, mergeManager) {
    // Socket.IO 연결 처리
    io.on('connection', (socket) => {
        logger.info(`클라이언트 연결: ${socket.id}`);
        
        // 현재 상태 전송
        socket.emit('current-status', mergeManager.getCurrentProcessStatus());
        
        socket.on('disconnect', () => {
            logger.info(`클라이언트 연결 해제: ${socket.id}`);
        });
    });

    // 머지 매니저 이벤트를 Socket.IO로 브로드캐스트
    mergeManager.on('process-started', (data) => {
        io.emit('process-started', data);
    });

    mergeManager.on('process-completed', (data) => {
        io.emit('process-completed', data);
    });

    mergeManager.on('process-failed', (data) => {
        io.emit('process-failed', data);
    });

    mergeManager.on('phase-started', (data) => {
        io.emit('phase-started', data);
    });

    mergeManager.on('phase-completed', (data) => {
        io.emit('phase-completed', data);
    });

    mergeManager.on('repository-started', (data) => {
        io.emit('repository-started', data);
    });

    mergeManager.on('repository-completed', (data) => {
        io.emit('repository-completed', data);
    });

    mergeManager.on('repository-failed', (data) => {
        io.emit('repository-failed', data);
    });

    // 로그 스트림을 Socket.IO로 전송
    logger.stream.on('log', (logEntry) => {
        io.emit('log-update', logEntry);
    });
}

module.exports = { setupSocketEvents };