require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const MergeManager = require('./services/mergeManager');
const logger = require('./utils/logger');
const { setupSocketEvents } = require('./utils/socketEvents');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// 머지 매니저 인스턴스 생성
const mergeManager = new MergeManager();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// mergeManager를 app에 설정 (API 라우터에서 사용)
app.set('mergeManager', mergeManager);

// Socket.IO 이벤트 설정
setupSocketEvents(io, mergeManager);

// API 라우트 설정
app.use('/api', apiRoutes);

// 기본 라우트 - 웹 인터페이스
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 에러 핸들러
app.use((err, req, res, next) => {
    logger.error('서버 에러:', err);
    res.status(500).json({
        success: false,
        error: '내부 서버 오류가 발생했습니다.'
    });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '요청한 리소스를 찾을 수 없습니다.'
    });
});

// 서버 시작
server.listen(PORT, () => {
    logger.info(`Auto Weekly Merge System 서버가 포트 ${PORT}에서 시작되었습니다.`);
    logger.info(`웹 인터페이스: http://localhost:${PORT}`);
});

// 프로세스 종료 시 정리
process.on('SIGTERM', () => {
    logger.info('서버가 종료됩니다...');
    server.close(() => {
        logger.info('서버가 정상적으로 종료되었습니다.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('서버가 종료됩니다...');
    server.close(() => {
        logger.info('서버가 정상적으로 종료되었습니다.');
        process.exit(0);
    });
});

module.exports = { app, server };