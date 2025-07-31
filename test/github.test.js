const GitHubService = require('../services/githubService');

// Mock 설정
jest.mock('@octokit/rest');
jest.mock('../utils/logger');

describe('GitHubService', () => {
  let githubService;
  let mockOctokit;

  beforeEach(() => {
    // 환경변수 설정
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.GITHUB_ORG = 'test-org';
    
    // Mock Octokit 설정
    mockOctokit = {
      rest: {
        repos: {
          getBranch: jest.fn(),
        },
        git: {
          createRef: jest.fn(),
        },
        pulls: {
          create: jest.fn(),
          merge: jest.fn(),
        },
      },
    };

    // GitHubService 인스턴스 생성
    githubService = new GitHubService();
    githubService.octokit = mockOctokit;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBranch', () => {
    it('브랜치 정보를 성공적으로 조회해야 함', async () => {
      const mockBranchData = {
        data: {
          commit: {
            sha: 'abc123',
          },
        },
      };

      mockOctokit.rest.repos.getBranch.mockResolvedValue(mockBranchData);

      const result = await githubService.getBranch('test-repo', 'master');

      expect(mockOctokit.rest.repos.getBranch).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        branch: 'master',
      });
      expect(result).toEqual(mockBranchData.data);
    });

    it('브랜치 조회 실패 시 에러를 던져야 함', async () => {
      const error = new Error('Branch not found');
      mockOctokit.rest.repos.getBranch.mockRejectedValue(error);

      await expect(
        githubService.getBranch('test-repo', 'nonexistent')
      ).rejects.toThrow('Branch not found');
    });
  });

  describe('createHotfixBranch', () => {
    it('새 hotfix 브랜치를 성공적으로 생성해야 함', async () => {
      const mockBranchData = {
        commit: { sha: 'abc123' }
      };

      mockOctokit.rest.repos.getBranch.mockResolvedValue({ data: mockBranchData });
      mockOctokit.rest.git.createRef.mockResolvedValue({});

      const branchName = await githubService.createHotfixBranch(
        'test-repo',
        'master',
        'release'
      );

      expect(branchName).toMatch(/^hotfix-master\/merge-master-into-release-\d{8}$/);
      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        ref: expect.stringMatching(/^refs\/heads\/hotfix-master\/merge-master-into-release-\d{8}$/),
        sha: 'abc123',
      });
    });

    it('이미 존재하는 브랜치의 경우 기존 브랜치명을 반환해야 함', async () => {
      const mockBranchData = {
        commit: { sha: 'abc123' }
      };

      mockOctokit.rest.repos.getBranch.mockResolvedValue({ data: mockBranchData });
      
      const error = new Error('Reference already exists');
      error.status = 422;
      mockOctokit.rest.git.createRef.mockRejectedValue(error);

      const branchName = await githubService.createHotfixBranch(
        'test-repo',
        'master',
        'release'
      );

      expect(branchName).toMatch(/^hotfix-master\/merge-master-into-release-\d{8}$/);
    });
  });

  describe('createPullRequest', () => {
    it('Pull Request를 성공적으로 생성해야 함', async () => {
      const mockPRData = {
        data: {
          number: 123,
          html_url: 'https://github.com/test-org/test-repo/pull/123',
        },
      };

      mockOctokit.rest.pulls.create.mockResolvedValue(mockPRData);

      const result = await githubService.createPullRequest(
        'test-repo',
        'feature-branch',
        'main',
        'Test PR Title',
        'Test PR Body'
      );

      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-org',
        repo: 'test-repo',
        title: 'Test PR Title',
        head: 'feature-branch',
        base: 'main',
        body: 'Test PR Body',
      });
      expect(result).toEqual(mockPRData.data);
    });
  });

  describe('processMerge', () => {
    it('master-to-release 머지 프로세스를 성공적으로 실행해야 함', async () => {
      const mockBranchData = {
        commit: { sha: 'abc123' }
      };
      const mockPRData = {
        number: 123,
        html_url: 'https://github.com/test-org/test-repo/pull/123',
      };

      mockOctokit.rest.repos.getBranch.mockResolvedValue({ data: mockBranchData });
      mockOctokit.rest.git.createRef.mockResolvedValue({});
      mockOctokit.rest.pulls.create.mockResolvedValue({ data: mockPRData });

      const result = await githubService.processMerge('test-repo', 'master-to-release');

      expect(result.status).toBe('completed');
      expect(result.repo).toBe('test-repo');
      expect(result.direction).toBe('master-to-release');
      expect(result.pullRequest.number).toBe(123);
    });

    it('지원하지 않는 머지 방향에 대해 에러를 반환해야 함', async () => {
      const result = await githubService.processMerge('test-repo', 'invalid-direction');

      expect(result.status).toBe('failed');
      expect(result.error).toContain('지원하지 않는 머지 방향');
    });
  });

  describe('checkRepositoryStatus', () => {
    it('리포지토리 상태를 성공적으로 확인해야 함', async () => {
      const mockBranches = {
        master: { commit: { sha: 'master-sha' } },
        release: { commit: { sha: 'release-sha' } },
        develop: { commit: { sha: 'develop-sha' } },
      };

      mockOctokit.rest.repos.getBranch
        .mockResolvedValueOnce({ data: mockBranches.master })
        .mockResolvedValueOnce({ data: mockBranches.release })
        .mockResolvedValueOnce({ data: mockBranches.develop });

      const result = await githubService.checkRepositoryStatus('test-repo');

      expect(result.repo).toBe('test-repo');
      expect(result.status).toBe('ready');
      expect(result.branches.master).toBe('master-sha');
      expect(result.branches.release).toBe('release-sha');
      expect(result.branches.develop).toBe('develop-sha');
    });

    it('브랜치가 존재하지 않는 경우 null을 반환해야 함', async () => {
      mockOctokit.rest.repos.getBranch
        .mockResolvedValueOnce({ data: { commit: { sha: 'master-sha' } } })
        .mockRejectedValueOnce(new Error('Branch not found'))
        .mockResolvedValueOnce({ data: { commit: { sha: 'develop-sha' } } });

      const result = await githubService.checkRepositoryStatus('test-repo');

      expect(result.branches.master).toBe('master-sha');
      expect(result.branches.release).toBeNull();
      expect(result.branches.develop).toBe('develop-sha');
    });
  });
});