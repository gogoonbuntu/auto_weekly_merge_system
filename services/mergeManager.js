const GitHubService = require('./githubService');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class MergeManager extends EventEmitter {
  constructor(configManager = null) {
    super();
    this.configManager = configManager;
    
    // 보안 설정으로 GitHub 서비스 초기화
    this.githubService = new GitHubService(configManager);
    
    // 리포지토리 목록 가져오기
    this.repositories = configManager 
      ? configManager.getAll().repositories 
      : (process.env.REPOSITORIES || '').split(',').map(repo => repo.trim()).filter(Boolean);
      
    this.currentProcess = null;
    this.processHistory = [];
    
    // 토큰 상태 추적
    this.tokenConfigured = this.githubService.isTokenConfigured();
  }

  // ===============================
  // 토큰 관리 메서드들
  // ===============================

  /**
   * GitHub 토큰 설정
   */
  async setGitHubToken(token) {
    try {
      logger.info('GitHub 토큰 설정 중...');
      
      // 토큰 유효성 검증
      const tempService = new GitHubService(token);
      const authResult = await tempService.testAuthentication();
      
      if (authResult.success) {
        // 유효한 토큰인 경우 설정
        this.githubService.setToken(token);
        this.tokenConfigured = true;
        
        logger.info(`GitHub 토큰 설정 완료 - 사용자: ${authResult.user?.login}`);
        
        // 토큰 설정 이벤트 발생
        this.emit('token-configured', {
          user: authResult.user,
          timestamp: new Date().toISOString()
        });
        
        return true;
      } else {
        logger.warn('유효하지 않은 GitHub 토큰');
        return false;
      }
    } catch (error) {
      logger.error('GitHub 토큰 설정 실패:', error);
      return false;
    }
  }

  /**
   * GitHub 토큰 검증
   */
  async verifyGitHubToken(token) {
    try {
      logger.info('GitHub 토큰 검증 중...');
      
      const tempService = new GitHubService(token);
      const authResult = await tempService.testAuthentication();
      
      if (authResult.success) {
        return {
          valid: true,
          message: '토큰이 유효합니다.',
          data: {
            user: authResult.user,
            scopes: authResult.scopes,
            tokenPreview: `${token.substring(0, 10)}...`
          }
        };
      } else {
        return {
          valid: false,
          message: '토큰이 유효하지 않습니다.',
          data: null
        };
      }
    } catch (error) {
      logger.error('GitHub 토큰 검증 실패:', error);
      return {
        valid: false,
        message: `토큰 검증 중 오류: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 토큰 상태 확인
   */
  async getTokenStatus() {
    if (!this.tokenConfigured) {
      return {
        configured: false,
        valid: false,
        message: 'GitHub 토큰이 설정되지 않았습니다.',
        user: null
      };
    }

    try {
      const authResult = await this.githubService.testAuthentication();
      
      if (authResult.success) {
        return {
          configured: true,
          valid: true,
          message: '토큰이 정상적으로 설정되어 있습니다.',
          user: authResult.user
        };
      } else {
        return {
          configured: true,
          valid: false,
          message: '설정된 토큰이 유효하지 않습니다.',
          user: null
        };
      }
    } catch (error) {
      return {
        configured: this.tokenConfigured,
        valid: false,
        message: `토큰 상태 확인 실패: ${error.message}`,
        user: null
      };
    }
  }

  /**
   * 리포지토리 실행 순서 정의
   */
  getExecutionOrder() {
    return {
      phase1: ['danal-core'],
      phase2: ['smart-settlement-extapi'],
      phase3: [
        'smart-settlement-batch',
        'smart-settlement-api',
        'smart-settlement-merchant-interface'
      ]
    };
  }

  /**
   * 모든 리포지토리 상태 확인
   */
  async checkAllRepositories() {
    logger.info('모든 리포지토리 상태 확인 시작');
    
    const statusPromises = this.repositories.map(repo => 
      this.githubService.checkRepositoryStatus(repo)
    );
    
    const results = await Promise.all(statusPromises);
    
    this.emit('status-check-completed', results);
    return results;
  }

  /**
   * 주간 머지 프로세스 실행
   */
  async executeWeeklyMerge(direction) {
    if (this.currentProcess) {
      throw new Error('이미 실행 중인 프로세스가 있습니다.');
    }

    const processId = `${direction}-${Date.now()}`;
    this.currentProcess = {
      id: processId,
      direction,
      status: 'running',
      startTime: new Date(),
      results: [],
      currentPhase: 1,
      totalPhases: 3
    };

    try {
      logger.info(`주간 머지 프로세스 시작: ${direction}`);
      this.emit('process-started', this.currentProcess);

      const executionOrder = this.getExecutionOrder();
      
      // Phase 1: danal-core 실행
      await this.executePhase(1, executionOrder.phase1, direction);
      
      // Phase 2: smart-settlement-extapi 실행
      await this.executePhase(2, executionOrder.phase2, direction);
      
      // Phase 3: 나머지 3개 리포지토리 병렬 실행
      await this.executePhase(3, executionOrder.phase3, direction, true);

      // 프로세스 완료
      this.currentProcess.status = 'completed';
      this.currentProcess.endTime = new Date();
      this.currentProcess.duration = this.getDuration();

      logger.info(`주간 머지 프로세스 완료: ${direction}`);
      this.emit('process-completed', this.currentProcess);

      // 히스토리에 저장
      this.processHistory.unshift({ ...this.currentProcess });
      if (this.processHistory.length > 50) {
        this.processHistory = this.processHistory.slice(0, 50);
      }

      const result = { ...this.currentProcess };
      this.currentProcess = null;
      return result;

    } catch (error) {
      logger.error(`주간 머지 프로세스 실패: ${direction}`, error);
      
      this.currentProcess.status = 'failed';
      this.currentProcess.error = error.message;
      this.currentProcess.endTime = new Date();
      this.currentProcess.duration = this.getDuration();

      this.emit('process-failed', this.currentProcess);

      const result = { ...this.currentProcess };
      this.currentProcess = null;
      throw result;
    }
  }

  /**
   * 단계별 실행
   */
  async executePhase(phaseNumber, repositories, direction, parallel = false) {
    logger.info(`Phase ${phaseNumber} 시작: ${repositories.join(', ')}`);
    
    this.currentProcess.currentPhase = phaseNumber;
    this.emit('phase-started', {
      phase: phaseNumber,
      repositories,
      parallel
    });

    let results;
    
    if (parallel) {
      // 병렬 실행
      const promises = repositories.map(repo => 
        this.executeRepository(repo, direction)
      );
      results = await Promise.all(promises);
    } else {
      // 순차 실행
      results = [];
      for (const repo of repositories) {
        const result = await this.executeRepository(repo, direction);
        results.push(result);
      }
    }

    this.currentProcess.results.push(...results);
    
    this.emit('phase-completed', {
      phase: phaseNumber,
      results
    });

    logger.info(`Phase ${phaseNumber} 완료`);
    return results;
  }

  /**
   * 단일 리포지토리 실행
   */
  async executeRepository(repo, direction) {
    logger.info(`리포지토리 머지 시작: ${repo}`);
    
    this.emit('repository-started', { repo, direction });

    try {
      const result = await this.githubService.processMerge(repo, direction);
      
      this.emit('repository-completed', result);
      logger.info(`리포지토리 머지 완료: ${repo}`);
      
      return result;
    } catch (error) {
      const errorResult = {
        repo,
        direction,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.emit('repository-failed', errorResult);
      logger.error(`리포지토리 머지 실패: ${repo}`, error);
      
      return errorResult;
    }
  }

  /**
   * 현재 프로세스 상태 조회
   */
  getCurrentProcessStatus() {
    return this.currentProcess;
  }

  /**
   * 프로세스 히스토리 조회
   */
  getProcessHistory(limit = 10) {
    return this.processHistory.slice(0, limit);
  }

  /**
   * 실행 시간 계산
   */
  getDuration() {
    if (!this.currentProcess.startTime) return 0;
    const endTime = this.currentProcess.endTime || new Date();
    return Math.round((endTime - this.currentProcess.startTime) / 1000);
  }

  /**
   * 프로세스 강제 중단
   */
  async stopCurrentProcess() {
    if (!this.currentProcess) {
      return false;
    }

    this.currentProcess.status = 'cancelled';
    this.currentProcess.endTime = new Date();
    this.currentProcess.duration = this.getDuration();

    logger.warn('프로세스가 사용자에 의해 중단되었습니다.');
    this.emit('process-cancelled', this.currentProcess);

    this.currentProcess = null;
    return true;
  }

  // ===============================
  // 테스트 메서드들
  // ===============================

  /**
   * GitHub API 연결 테스트
   */
  async testGitHubConnection() {
    try {
      if (!this.tokenConfigured) {
        const message = 'GitHub 토큰이 설정되지 않았습니다. 먼저 토큰을 설정해주세요.';
        logger.warn(message);
        return {
          success: false,
          message,
          data: null
        };
      }

      logger.info('GitHub API 연결 테스트 실행 중...');
      
      const result = await this.githubService.testConnection();
      
      const message = result.success 
        ? `GitHub API 연결 성공 (응답시간: ${result.connectionTime})`
        : result.error;
      
      logger.info(message);
      
      return {
        success: result.success,
        message,
        data: result.success ? {
          apiUrl: result.apiUrl,
          rateLimit: result.rateLimit,
          connectionTime: result.connectionTime,
          responseHeaders: result.responseHeaders
        } : result.details
      };
    } catch (error) {
      const message = `GitHub API 연결 실패: ${error.message}`;
      logger.error(message, error);
      return {
        success: false,
        message,
        data: null
      };
    }
  }

  /**
   * 인증 토큰 검증
   */
  async testAuthentication() {
    try {
      if (!this.tokenConfigured) {
        const message = 'GitHub 토큰이 설정되지 않았습니다. 먼저 토큰을 설정해주세요.';
        logger.warn(message);
        return {
          success: false,
          message,
          data: null
        };
      }

      logger.info('GitHub 토큰 인증 테스트 실행 중...');
      
      const result = await this.githubService.testAuthentication();
      
      const message = result.success 
        ? `인증 토큰 검증 성공 - 사용자: ${result.user?.login}`
        : result.error;
      
      logger.info(message);
      
      return {
        success: result.success,
        message,
        data: result.success ? {
          user: result.user,
          scopes: result.scopes,
          tokenType: result.tokenType,
          accountType: result.accountType
        } : result.details
      };
    } catch (error) {
      const message = `인증 토큰 검증 실패: ${error.message}`;
      logger.error(message, error);
      return {
        success: false,
        message,
        data: null
      };
    }
  }

  /**
   * 단일 리포지토리 테스트
   */
  async testRepository(repoName) {
    try {
      if (!this.tokenConfigured) {
        const message = 'GitHub 토큰이 설정되지 않았습니다. 먼저 토큰을 설정해주세요.';
        logger.warn(message);
        return {
          success: false,
          message,
          data: null
        };
      }

      logger.info(`리포지토리 테스트 실행 중: ${repoName}`);
      
      const result = await this.githubService.testRepository(repoName);
      
      const message = result.success
        ? `${repoName} 리포지토리 접근 성공`
        : `${repoName} 리포지토리 접근 실패: ${result.error}`;
      
      logger.info(message);
      
      return {
        success: result.success,
        message,
        data: result.success ? {
          name: result.name,
          accessible: result.accessible,
          permissions: result.permissions,
          details: result.details
        } : result.details
      };
    } catch (error) {
      const message = `${repoName} 리포지토리 접근 실패: ${error.message}`;
      logger.error(message, error);
      return {
        success: false,
        message,
        data: null
      };
    }
  }

  /**
   * 모든 리포지토리 테스트
   */
  async testAllRepositories() {
    try {
      logger.info('전체 리포지토리 테스트 실행');
      
      const results = [];
      
      for (const repoName of this.repositories) {
        try {
          const repoResult = await this.githubService.testRepository(repoName);
          results.push({
            name: repoName,
            accessible: true,
            permissions: repoResult.permissions,
            defaultBranch: repoResult.defaultBranch,
            lastUpdated: repoResult.lastUpdated
          });
        } catch (error) {
          results.push({
            name: repoName,
            accessible: false,
            error: error.message
          });
        }
      }
      
      const accessibleCount = results.filter(r => r.accessible).length;
      
      return {
        success: true,
        message: `${accessibleCount}/${results.length} 리포지토리 접근 가능`,
        data: results
      };
    } catch (error) {
      logger.error('전체 리포지토리 테스트 실패:', error);
      return {
        success: false,
        message: `전체 리포지토리 테스트 실패: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 브랜치 테스트
   */
  async testBranches(repoName, branches = ['master', 'release', 'develop']) {
    try {
      logger.info(`브랜치 테스트 실행: ${repoName} - [${branches.join(', ')}]`);
      
      const results = [];
      
      for (const branchName of branches) {
        try {
          const branchResult = await this.githubService.testBranch(repoName, branchName);
          results.push({
            name: branchName,
            exists: true,
            sha: branchResult.sha,
            lastCommit: branchResult.lastCommit,
            ahead: branchResult.ahead,
            behind: branchResult.behind
          });
        } catch (error) {
          results.push({
            name: branchName,
            exists: false,
            error: error.message
          });
        }
      }

      const existingCount = results.filter(b => b.exists).length;

      return {
        success: true,
        message: `${existingCount}/${results.length} 브랜치 존재`,
        data: results
      };
    } catch (error) {
      logger.error(`브랜치 테스트 실패 (${repoName}):`, error);
      return {
        success: false,
        message: `브랜치 테스트 실패: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 모든 브랜치 테스트
   */
  async testAllBranches() {
    try {
      logger.info('전체 브랜치 테스트 실행');
      
      const results = {};
      
      for (const repoName of this.repositories) {
        try {
          const branchTestResult = await this.testBranches(repoName);
          results[repoName] = branchTestResult.data;
        } catch (error) {
          results[repoName] = {
            error: error.message
          };
        }
      }

      return {
        success: true,
        message: '전체 브랜치 테스트 완료',
        data: results
      };
    } catch (error) {
      logger.error('전체 브랜치 테스트 실패:', error);
      return {
        success: false,
        message: `전체 브랜치 테스트 실패: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 권한 테스트
   */
  async testPermissions() {
    try {
      logger.info('권한 테스트 실행');
      
      const permissions = [
        { name: 'Repository Access', test: () => this.githubService.testRepositoryAccess() },
        { name: 'Branch Creation', test: () => this.githubService.testBranchCreation() },
        { name: 'Pull Request Creation', test: () => this.githubService.testPRCreation() },
        { name: 'Push Permission', test: () => this.githubService.testPushPermission() }
      ];

      const results = [];

      for (const permission of permissions) {
        try {
          await permission.test();
          results.push({
            name: permission.name,
            granted: true,
            message: '권한 있음'
          });
        } catch (error) {
          results.push({
            name: permission.name,
            granted: false,
            message: error.message
          });
        }
      }

      const grantedCount = results.filter(p => p.granted).length;

      return {
        success: true,
        message: `${grantedCount}/${results.length} 권한 보유`,
        data: results
      };
    } catch (error) {
      logger.error('권한 테스트 실패:', error);
      return {
        success: false,
        message: `권한 테스트 실패: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * PR 생성 권한 테스트
   */
  async testPRPermission() {
    try {
      logger.info('PR 생성 권한 테스트 실행');
      
      const result = await this.githubService.testPRCreation();
      
      return {
        success: true,
        message: 'Pull Request 생성 권한 있음',
        data: result
      };
    } catch (error) {
      logger.error('PR 생성 권한 테스트 실패:', error);
      return {
        success: false,
        message: `Pull Request 생성 권한 없음: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * 브랜치 생성 권한 테스트
   */
  async testBranchPermission() {
    try {
      logger.info('브랜치 생성 권한 테스트 실행');
      
      const result = await this.githubService.testBranchCreation();
      
      return {
        success: true,
        message: '브랜치 생성 권한 있음',
        data: result
      };
    } catch (error) {
      logger.error('브랜치 생성 권한 테스트 실패:', error);
      return {
        success: false,
        message: `브랜치 생성 권한 없음: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * API 호출 테스트
   */
  async testAPICall(endpoint, method = 'GET') {
    try {
      logger.info(`API 호출 테스트: ${method} ${endpoint}`);
      
      const result = await this.githubService.makeAPICall(endpoint, method);
      
      return {
        success: true,
        message: `${method} ${endpoint} 호출 성공`,
        data: {
          statusCode: result.status,
          headers: result.headers,
          responseSize: JSON.stringify(result.data).length,
          rateLimit: result.rateLimit
        }
      };
    } catch (error) {
      logger.error(`API 호출 테스트 실패: ${method} ${endpoint}`, error);
      return {
        success: false,
        message: `${method} ${endpoint} 호출 실패: ${error.message}`,
        data: {
          statusCode: error.response?.status,
          error: error.response?.data
        }
      };
    }
  }

  /**
   * Rate Limit 확인
   */
  async testRateLimit() {
    try {
      logger.info('Rate Limit 확인 실행');
      
      const result = await this.githubService.checkRateLimit();
      
      const limitStatus = result.remaining > 100 ? 'good' : 
                         result.remaining > 50 ? 'warning' : 'critical';
      
      return {
        success: true,
        message: `Rate Limit 상태: ${limitStatus}`,
        data: {
          limit: result.limit,
          remaining: result.remaining,
          reset: new Date(result.reset * 1000).toISOString(),
          resetInMinutes: Math.ceil((result.reset * 1000 - Date.now()) / (1000 * 60)),
          status: limitStatus
        }
      };
    } catch (error) {
      logger.error('Rate Limit 확인 실패:', error);
      return {
        success: false,
        message: `Rate Limit 확인 실패: ${error.message}`,
        data: null
      };
    }
  }
}

module.exports = MergeManager;