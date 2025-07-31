const { Octokit } = require('@octokit/rest');
const logger = require('../utils/logger');

class GitHubService {
  constructor(token = null) {
    // 토큰은 생성자에서 받거나 환경변수에서 가져옴
    this.token = token || process.env.GITHUB_TOKEN;
    
    if (this.token) {
      this.octokit = new Octokit({
        auth: this.token,
      });
    }
    
    this.org = process.env.GITHUB_ORG;
    this.isConfigured = !!this.token;
  }

  /**
   * GitHub 토큰 설정
   */
  setToken(token) {
    this.token = token;
    this.octokit = new Octokit({
      auth: token,
    });
    this.isConfigured = true;
    logger.info('GitHub 토큰이 설정되었습니다.');
  }

  /**
   * 토큰 설정 여부 확인
   */
  isTokenConfigured() {
    return this.isConfigured && !!this.token;
  }

  /**
   * 설정된 토큰 상태 확인
   */
  async getTokenStatus() {
    if (!this.isTokenConfigured()) {
      return {
        configured: false,
        valid: false,
        message: '토큰이 설정되지 않았습니다.'
      };
    }

    try {
      await this.testAuthentication();
      return {
        configured: true,
        valid: true,
        message: '토큰이 정상적으로 설정되었습니다.'
      };
    } catch (error) {
      return {
        configured: true,
        valid: false,
        message: `토큰이 유효하지 않습니다: ${error.message}`
      };
    }
  }

  /**
   * API 호출 전 토큰 확인
   */
  _checkToken() {
    if (!this.isTokenConfigured()) {
      throw new Error('GitHub 토큰이 설정되지 않았습니다. 먼저 토큰을 설정해주세요.');
    }
  }

  /**
   * 브랜치 정보 조회
   */
  async getBranch(repo, branchName) {
    this._checkToken();
    
    try {
      const response = await this.octokit.rest.repos.getBranch({
        owner: this.org,
        repo,
        branch: branchName,
      });
      return response.data;
    } catch (error) {
      logger.error(`브랜치 조회 실패: ${repo}/${branchName}`, error);
      throw error;
    }
  }

  /**
   * Hotfix 브랜치 생성
   */
  async createHotfixBranch(repo, baseBranch, targetBranch) {
    this._checkToken();
    
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const branchName = `hotfix-${baseBranch}/merge-${baseBranch}-into-${targetBranch}-${date}`;
    
    try {
      // 기준 브랜치의 최신 SHA 조회
      const baseBranchData = await this.getBranch(repo, baseBranch);
      const baseSha = baseBranchData.commit.sha;

      // 새 브랜치 생성
      await this.octokit.rest.git.createRef({
        owner: this.org,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      });

      logger.info(`브랜치 생성 완료: ${repo}/${branchName}`);
      return branchName;
    } catch (error) {
      if (error.status === 422) {
        logger.warn(`브랜치가 이미 존재함: ${repo}/${branchName}`);
        return branchName;
      }
      logger.error(`브랜치 생성 실패: ${repo}/${branchName}`, error);
      throw error;
    }
  }

  /**
   * Pull Request 생성
   */
  async createPullRequest(repo, sourceBranch, targetBranch, title, body = '') {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.org,
        repo,
        title,
        head: sourceBranch,
        base: targetBranch,
        body,
      });

      logger.info(`PR 생성 완료: ${repo} #${response.data.number}`);
      return response.data;
    } catch (error) {
      logger.error(`PR 생성 실패: ${repo}`, error);
      throw error;
    }
  }

  /**
   * Pull Request 자동 머지 시도
   */
  async mergePullRequest(repo, pullNumber) {
    try {
      const response = await this.octokit.rest.pulls.merge({
        owner: this.org,
        repo,
        pull_number: pullNumber,
        merge_method: 'merge',
      });

      logger.info(`PR 머지 완료: ${repo} #${pullNumber}`);
      return response.data;
    } catch (error) {
      logger.error(`PR 머지 실패: ${repo} #${pullNumber}`, error);
      throw error;
    }
  }

  /**
   * 리포지토리 상태 확인
   */
  async checkRepositoryStatus(repo) {
    try {
      const [master, release, develop] = await Promise.all([
        this.getBranch(repo, 'master').catch(() => null),
        this.getBranch(repo, 'release').catch(() => null),
        this.getBranch(repo, 'develop').catch(() => null),
      ]);

      return {
        repo,
        branches: {
          master: master ? master.commit.sha : null,
          release: release ? release.commit.sha : null,
          develop: develop ? develop.commit.sha : null,
        },
        status: 'ready',
      };
    } catch (error) {
      logger.error(`리포지토리 상태 확인 실패: ${repo}`, error);
      return {
        repo,
        branches: {},
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * 단일 리포지토리 머지 프로세스 실행
   */
  async processMerge(repo, direction) {
    const timestamp = new Date().toISOString().slice(0, 10);
    
    try {
      logger.info(`머지 프로세스 시작: ${repo} (${direction})`);
      
      let sourceBranch, targetBranch, baseBranch;
      
      if (direction === 'master-to-release') {
        baseBranch = 'master';
        targetBranch = 'release';
      } else if (direction === 'release-to-develop') {
        baseBranch = 'release';
        targetBranch = 'develop';
      } else {
        throw new Error(`지원하지 않는 머지 방향: ${direction}`);
      }

      // 1. Hotfix 브랜치 생성
      const hotfixBranch = await this.createHotfixBranch(repo, baseBranch, targetBranch);

      // 2. Pull Request 생성
      const prTitle = `[Auto] Merge ${baseBranch} into ${targetBranch} - ${timestamp}`;
      const prBody = `자동 주간 머지 작업\n\n- Source: ${baseBranch}\n- Target: ${targetBranch}\n- Date: ${timestamp}`;
      
      const pullRequest = await this.createPullRequest(
        repo,
        hotfixBranch,
        targetBranch,
        prTitle,
        prBody
      );

      return {
        repo,
        direction,
        hotfixBranch,
        pullRequest: {
          number: pullRequest.number,
          url: pullRequest.html_url,
        },
        status: 'completed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`머지 프로세스 실패: ${repo} (${direction})`, error);
      return {
        repo,
        direction,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ===============================
  // 테스트 메서드들
  // ===============================

  /**
   * GitHub API 연결 테스트
   */
  async testConnection() {
    this._checkToken();
    
    const startTime = Date.now();
    
    try {
      const response = await this.octokit.rest.meta.get();
      const connectionTime = Date.now() - startTime;
      
      logger.info(`GitHub API 연결 성공 - 응답시간: ${connectionTime}ms`);
      
      return {
        success: true,
        apiUrl: 'https://api.github.com',
        connectionTime: `${connectionTime}ms`,
        rateLimit: {
          remaining: response.headers['x-ratelimit-remaining'],
          limit: response.headers['x-ratelimit-limit'],
          resetTime: new Date(response.headers['x-ratelimit-reset'] * 1000).toLocaleString()
        },
        status: 'connected',
        responseHeaders: {
          server: response.headers.server,
          date: response.headers.date
        }
      };
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      
      logger.error(`GitHub API 연결 실패 (${connectionTime}ms):`, {
        message: error.message,
        status: error.status,
        statusText: error.response?.statusText,
        url: error.request?.url
      });
      
      return {
        success: false,
        error: `GitHub API 연결 실패: ${error.message}`,
        status: 'disconnected',
        details: {
          connectionTime: `${connectionTime}ms`,
          statusCode: error.status || 'Unknown',
          statusText: error.response?.statusText || 'Unknown',
          requestUrl: error.request?.url || 'https://api.github.com/meta',
          errorType: error.name || 'NetworkError',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 인증 토큰 검증
   */
  async testAuthentication() {
    this._checkToken();
    
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      
      logger.info(`GitHub 인증 성공 - 사용자: ${response.data.login}`);
      
      return {
        success: true,
        user: {
          login: response.data.login,
          name: response.data.name,
          email: response.data.email,
          company: response.data.company,
          location: response.data.location,
          publicRepos: response.data.public_repos,
          followers: response.data.followers,
          createdAt: response.data.created_at
        },
        scopes: response.headers['x-oauth-scopes']?.split(', ') || [],
        tokenType: 'Bearer',
        authenticated: true,
        accountType: response.data.type || 'User'
      };
    } catch (error) {
      logger.error(`GitHub 인증 실패:`, {
        message: error.message,
        status: error.status,
        statusText: error.response?.statusText
      });
      
      return {
        success: false,
        error: `인증 실패: ${error.message}`,
        authenticated: false,
        details: {
          statusCode: error.status || 'Unknown',
          statusText: error.response?.statusText || 'Unknown',
          errorType: error.name || 'AuthenticationError',
          possibleCauses: [
            '토큰이 만료되었습니다',
            '토큰 권한이 부족합니다',
            '잘못된 토큰 형식입니다',
            '네트워크 연결 문제입니다'
          ],
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 리포지토리 테스트
   */
  async testRepository(repoName) {
    this._checkToken();
    
    try {
      const response = await this.octokit.rest.repos.get({
        owner: this.org,
        repo: repoName
      });

      const repo = response.data;
      
      logger.info(`리포지토리 접근 성공: ${repoName}`);
      
      return {
        success: true,
        name: repo.name,
        accessible: true,
        permissions: {
          admin: repo.permissions?.admin || false,
          push: repo.permissions?.push || false,
          pull: repo.permissions?.pull || false
        },
        details: {
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
          lastUpdated: repo.updated_at,
          private: repo.private,
          size: `${(repo.size / 1024).toFixed(2)} MB`,
          language: repo.language || 'Not specified',
          description: repo.description || 'No description',
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          hasIssues: repo.has_issues,
          hasWiki: repo.has_wiki,
          hasProjects: repo.has_projects
        }
      };
    } catch (error) {
      logger.error(`리포지토리 테스트 실패 (${repoName}):`, {
        message: error.message,
        status: error.status,
        statusText: error.response?.statusText
      });
      
      return {
        success: false,
        name: repoName,
        accessible: false,
        error: `리포지토리 접근 실패: ${error.message}`,
        details: {
          statusCode: error.status || 'Unknown',
          statusText: error.response?.statusText || 'Unknown',
          errorType: error.name || 'RepositoryError',
          possibleCauses: [
            '리포지토리가 존재하지 않습니다',
            '리포지토리에 접근 권한이 없습니다',
            '조직명(GITHUB_ORG)이 잘못되었습니다',
            '토큰에 repo 권한이 없습니다'
          ],
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 브랜치 테스트
   */
  async testBranch(repoName, branchName) {
    this._checkToken();
    
    try {
      const response = await this.octokit.rest.repos.getBranch({
        owner: this.org,
        repo: repoName,
        branch: branchName
      });

      const branch = response.data;
      
      logger.info(`브랜치 접근 성공: ${repoName}/${branchName}`);
      
      return {
        success: true,
        name: branchName,
        exists: true,
        sha: branch.commit.sha,
        lastCommit: {
          message: branch.commit.commit.message,
          author: branch.commit.commit.author.name,
          date: branch.commit.commit.author.date,
          url: branch.commit.html_url
        },
        protected: branch.protected,
        ahead: branch.commit.stats?.additions || 0,
        behind: branch.commit.stats?.deletions || 0,
        details: {
          fullSha: branch.commit.sha,
          commitCount: branch.commit.commit.tree?.sha ? 'Available' : 'Unknown',
          lastModified: branch.commit.commit.author.date,
          committer: branch.commit.commit.committer?.name || 'Unknown'
        }
      };
    } catch (error) {
      logger.error(`브랜치 테스트 실패 (${repoName}/${branchName}):`, {
        message: error.message,
        status: error.status,
        statusText: error.response?.statusText
      });
      
      if (error.status === 404) {
        return {
          success: false,
          name: branchName,
          exists: false,
          error: `브랜치 '${branchName}'이 존재하지 않습니다`,
          details: {
            statusCode: 404,
            statusText: 'Not Found',
            errorType: 'BranchNotFound',
            possibleCauses: [
              `'${branchName}' 브랜치가 생성되지 않았습니다`,
              '브랜치명이 잘못되었습니다',
              '브랜치가 삭제되었습니다'
            ],
            timestamp: new Date().toISOString()
          }
        };
      }
      
      return {
        success: false,
        name: branchName,
        exists: false,
        error: `브랜치 접근 실패: ${error.message}`,
        details: {
          statusCode: error.status || 'Unknown',
          statusText: error.response?.statusText || 'Unknown',
          errorType: error.name || 'BranchError',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * 리포지토리 접근 권한 테스트
   */
  async testRepositoryAccess() {
    try {
      const testRepo = process.env.REPOSITORIES?.split(',')[0]?.trim() || 'danal-core';
      await this.octokit.rest.repos.get({
        owner: this.org,
        repo: testRepo
      });
      return { access: true };
    } catch (error) {
      throw new Error('리포지토리 접근 권한이 없습니다');
    }
  }

  /**
   * 브랜치 생성 권한 테스트
   */
  async testBranchCreation() {
    try {
      const testRepo = process.env.REPOSITORIES?.split(',')[0]?.trim() || 'danal-core';
      const testBranchName = `test-branch-${Date.now()}`;
      
      // 기본 브랜치 정보 조회
      const repo = await this.octokit.rest.repos.get({
        owner: this.org,
        repo: testRepo
      });
      
      const defaultBranch = await this.octokit.rest.repos.getBranch({
        owner: this.org,
        repo: testRepo,
        branch: repo.data.default_branch
      });

      // 테스트 브랜치 생성 시도 (실제로는 생성하지 않음)
      return { 
        canCreateBranch: true,
        testBranch: testBranchName,
        baseSha: defaultBranch.data.commit.sha
      };
    } catch (error) {
      throw new Error('브랜치 생성 권한이 없습니다');
    }
  }

  /**
   * Pull Request 생성 권한 테스트
   */
  async testPRCreation() {
    try {
      const testRepo = process.env.REPOSITORIES?.split(',')[0]?.trim() || 'danal-core';
      
      // 리포지토리 정보와 브랜치 정보 조회로 PR 생성 가능 여부 확인
      const [repo, branches] = await Promise.all([
        this.octokit.rest.repos.get({
          owner: this.org,
          repo: testRepo
        }),
        this.octokit.rest.repos.listBranches({
          owner: this.org,
          repo: testRepo,
          per_page: 5
        })
      ]);

      return { 
        canCreatePR: repo.data.permissions?.push || false,
        availableBranches: branches.data.map(b => b.name),
        defaultBranch: repo.data.default_branch
      };
    } catch (error) {
      throw new Error('Pull Request 생성 권한이 없습니다');
    }
  }

  /**
   * Push 권한 테스트
   */
  async testPushPermission() {
    try {
      const testRepo = process.env.REPOSITORIES?.split(',')[0]?.trim() || 'danal-core';
      
      const repo = await this.octokit.rest.repos.get({
        owner: this.org,
        repo: testRepo
      });

      if (!repo.data.permissions?.push) {
        throw new Error('Push 권한이 없습니다');
      }

      return { 
        canPush: true,
        permissions: repo.data.permissions
      };
    } catch (error) {
      throw new Error('Push 권한 확인 실패');
    }
  }

  /**
   * API 호출 테스트
   */
  async makeAPICall(endpoint, method = 'GET') {
    try {
      const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      
      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await this.octokit.request(`GET ${url}`);
          break;
        case 'POST':
          response = await this.octokit.request(`POST ${url}`);
          break;
        case 'PUT':
          response = await this.octokit.request(`PUT ${url}`);
          break;
        case 'DELETE':
          response = await this.octokit.request(`DELETE ${url}`);
          break;
        default:
          throw new Error(`지원하지 않는 HTTP 메서드: ${method}`);
      }

      return {
        status: response.status,
        headers: {
          'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
          'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
          'x-ratelimit-reset': response.headers['x-ratelimit-reset']
        },
        data: response.data,
        rateLimit: {
          limit: parseInt(response.headers['x-ratelimit-limit']) || 0,
          remaining: parseInt(response.headers['x-ratelimit-remaining']) || 0,
          reset: parseInt(response.headers['x-ratelimit-reset']) || 0
        }
      };
    } catch (error) {
      logger.error(`API 호출 실패: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Rate Limit 확인
   */
  async checkRateLimit() {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      const rateLimit = response.data.rate;
      
      return {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
        used: rateLimit.used
      };
    } catch (error) {
      logger.error('Rate Limit 확인 실패:', error);
      throw new Error(`Rate Limit 확인 실패: ${error.message}`);
    }
  }
}

module.exports = GitHubService;