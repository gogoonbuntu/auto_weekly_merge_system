const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

let mergeManager = null;

// mergeManager 인스턴스 설정
router.use((req, res, next) => {
    if (!mergeManager) {
        mergeManager = req.app.get('mergeManager');
    }
    next();
});

/**
 * 시스템 상태 조회
 */
router.get('/status', async (req, res) => {
    try {
        const repositoryStatus = await mergeManager.checkAllRepositories();
        const currentProcess = mergeManager.getCurrentProcessStatus();
        
        res.json({
            success: true,
            data: {
                repositories: repositoryStatus,
                currentProcess,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('상태 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Master → Release 머지 실행
 */
router.post('/merge/master-to-release', async (req, res) => {
    try {
        logger.info('Master → Release 머지 시작 요청');
        
        const result = await mergeManager.executeWeeklyMerge('master-to-release');
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Master → Release 머지 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message || error
        });
    }
});

/**
 * Release → Develop 머지 실행
 */
router.post('/merge/release-to-develop', async (req, res) => {
    try {
        logger.info('Release → Develop 머지 시작 요청');
        
        const result = await mergeManager.executeWeeklyMerge('release-to-develop');
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Release → Develop 머지 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message || error
        });
    }
});

/**
 * 현재 프로세스 중단
 */
router.post('/process/stop', async (req, res) => {
    try {
        const stopped = await mergeManager.stopCurrentProcess();
        
        res.json({
            success: true,
            data: { stopped }
        });
    } catch (error) {
        logger.error('프로세스 중단 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 프로세스 히스토리 조회
 */
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const history = mergeManager.getProcessHistory(limit);
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        logger.error('히스토리 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 로그 파일 목록 조회
 */
router.get('/logs', (req, res) => {
    try {
        const logFiles = logger.getLogFiles();
        
        res.json({
            success: true,
            data: logFiles
        });
    } catch (error) {
        logger.error('로그 파일 목록 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 특정 로그 파일 내용 조회
 */
router.get('/logs/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const lines = parseInt(req.query.lines) || 100;
        const level = req.query.level;
        
        if (filename === 'stream') {
            // 실시간 로그 스트림 데이터
            const logs = logger.stream.getLogs(level, lines);
            return res.json({
                success: true,
                data: logs
            });
        }
        
        const logContent = logger.readLogFile(filename, lines);
        
        res.json({
            success: true,
            data: logContent
        });
    } catch (error) {
        logger.error('로그 파일 조회 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 로그 파일 다운로드
 */
router.get('/logs/:filename/download', (req, res) => {
    try {
        const { filename } = req.params;
        const path = require('path');
        const filePath = path.join(__dirname, '../logs', filename);
        
        res.download(filePath, filename);
    } catch (error) {
        logger.error('로그 파일 다운로드 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ===============================
// 테스트 API 라우트
// ===============================

/**
 * GitHub 토큰 설정
 */
router.post('/config/token', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token || !token.startsWith('ghp_')) {
            return res.status(400).json({
                success: false,
                error: '유효한 GitHub Personal Access Token을 입력해주세요 (ghp_로 시작)'
            });
        }

        logger.info('GitHub 토큰 설정 시도');
        
        // 토큰 유효성 검증
        const isValid = await mergeManager.setGitHubToken(token);
        
        if (isValid) {
            res.json({
                success: true,
                message: 'GitHub 토큰이 성공적으로 설정되었습니다.',
                data: {
                    tokenPreview: `${token.substring(0, 10)}...`,
                    setAt: new Date().toISOString()
                }
            });
        } else {
            res.status(400).json({
                success: false,
                error: '토큰이 유효하지 않습니다. 권한을 확인해주세요.'
            });
        }
    } catch (error) {
        logger.error('GitHub 토큰 설정 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GitHub 토큰 상태 확인
 */
router.get('/config/token/status', async (req, res) => {
    try {
        const tokenStatus = await mergeManager.getTokenStatus();
        
        res.json({
            success: true,
            data: tokenStatus
        });
    } catch (error) {
        logger.error('GitHub 토큰 상태 확인 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GitHub 토큰 검증
 */
router.post('/config/token/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: '토큰이 제공되지 않았습니다.'
            });
        }

        logger.info('GitHub 토큰 검증 시도');
        
        const verification = await mergeManager.verifyGitHubToken(token);
        
        res.json({
            success: verification.valid,
            message: verification.message,
            data: verification.data
        });
    } catch (error) {
        logger.error('GitHub 토큰 검증 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * GitHub API 연결 테스트
 */
router.get('/test/connection', async (req, res) => {
    try {
        logger.info('GitHub 연결 테스트 실행');
        
        const testResult = await mergeManager.testGitHubConnection();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('GitHub 연결 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 인증 토큰 검증
 */
router.get('/test/auth', async (req, res) => {
    try {
        logger.info('인증 토큰 검증 실행');
        
        const testResult = await mergeManager.testAuthentication();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('인증 토큰 검증 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 단일 리포지토리 테스트
 */
router.get('/test/repository/:repoName', async (req, res) => {
    try {
        const { repoName } = req.params;
        logger.info(`리포지토리 테스트 실행: ${repoName}`);
        
        const testResult = await mergeManager.testRepository(repoName);
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error(`리포지토리 테스트 실패 (${req.params.repoName}):`, error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 모든 리포지토리 테스트
 */
router.get('/test/repositories', async (req, res) => {
    try {
        logger.info('전체 리포지토리 테스트 실행');
        
        const testResult = await mergeManager.testAllRepositories();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('전체 리포지토리 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 브랜치 테스트
 */
router.post('/test/branches/:repoName', async (req, res) => {
    try {
        const { repoName } = req.params;
        const { branches } = req.body;
        
        logger.info(`브랜치 테스트 실행: ${repoName} - [${branches.join(', ')}]`);
        
        const testResult = await mergeManager.testBranches(repoName, branches);
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error(`브랜치 테스트 실패 (${req.params.repoName}):`, error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 모든 브랜치 테스트
 */
router.get('/test/all-branches', async (req, res) => {
    try {
        logger.info('전체 브랜치 테스트 실행');
        
        const testResult = await mergeManager.testAllBranches();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('전체 브랜치 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 전체 권한 테스트
 */
router.get('/test/permissions', async (req, res) => {
    try {
        logger.info('권한 테스트 실행');
        
        const testResult = await mergeManager.testPermissions();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('권한 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * PR 생성 권한 테스트
 */
router.get('/test/permissions/pr', async (req, res) => {
    try {
        logger.info('PR 생성 권한 테스트 실행');
        
        const testResult = await mergeManager.testPRPermission();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('PR 생성 권한 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * 브랜치 생성 권한 테스트
 */
router.get('/test/permissions/branch', async (req, res) => {
    try {
        logger.info('브랜치 생성 권한 테스트 실행');
        
        const testResult = await mergeManager.testBranchPermission();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('브랜치 생성 권한 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * API 호출 테스트
 */
router.post('/test/api-call', async (req, res) => {
    try {
        const { endpoint, method } = req.body;
        logger.info(`API 호출 테스트: ${method} ${endpoint}`);
        
        const testResult = await mergeManager.testAPICall(endpoint, method);
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('API 호출 테스트 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

/**
 * Rate Limit 확인
 */
router.get('/test/rate-limit', async (req, res) => {
    try {
        logger.info('Rate Limit 확인 실행');
        
        const testResult = await mergeManager.testRateLimit();
        
        res.json({
            success: testResult.success,
            message: testResult.message,
            data: testResult.data
        });
    } catch (error) {
        logger.error('Rate Limit 확인 실패:', error);
        res.json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

module.exports = router;