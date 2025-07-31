#!/usr/bin/env node

const config = require('../src/config/config');
const logger = require('../utils/logger');

/**
 * 설정 검증 및 상태 확인 스크립트
 */
async function validateConfiguration() {
    console.log('\n🔍 Auto Weekly Merge System 설정 검증');
    console.log('='.repeat(60));
    
    try {
        // 1. 기본 설정 검증
        console.log('\n📋 1. 기본 설정 검증');
        console.log('-'.repeat(40));
        
        const validation = config.validate();
        
        if (validation.isValid) {
            console.log('✅ 모든 기본 설정이 올바릅니다.');
        } else {
            console.log('❌ 설정 오류가 발견되었습니다:');
            validation.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }
        
        if (validation.warnings.length > 0) {
            console.log('\n⚠️  경고 사항:');
            validation.warnings.forEach(warning => {
                console.log(`   - ${warning}`);
            });
        }
        
        // 2. 전체 설정 정보 출력
        console.log('\n⚙️  2. 현재 설정 정보');
        console.log('-'.repeat(40));
        
        const allConfig = config.getAll();
        
        console.log(`포트: ${allConfig.port}`);
        console.log(`환경: ${allConfig.nodeEnv}`);
        console.log(`GitHub 조직: ${allConfig.githubOrg}`);
        console.log(`대상 리포지토리 수: ${allConfig.repositories.length}`);
        console.log(`보안 토큰 설정: ${allConfig.hasSecureGitHubToken ? '✅ 설정됨' : '❌ 미설정'}`);
        
        console.log('\n📂 대상 리포지토리:');
        allConfig.repositories.forEach((repo, index) => {
            console.log(`   ${index + 1}. ${repo}`);
        });
        
        // 3. 보안 토큰 상태 확인
        console.log('\n🔐 3. 보안 토큰 상태');
        console.log('-'.repeat(40));
        
        const tokenManager = config.getTokenManager();
        const tokens = tokenManager.listTokens();
        
        if (tokens.length === 0) {
            console.log('❌ 저장된 보안 토큰이 없습니다.');
            console.log('💡 npm run token 명령어로 토큰을 설정하세요.');
        } else {
            console.log(`✅ ${tokens.length}개의 보안 토큰이 저장되어 있습니다:`);
            tokens.forEach(token => {
                console.log(`   - ${token.name} (생성: ${new Date(token.createdAt).toLocaleString()})`);
            });
        }
        
        // 4. GitHub API 연결 테스트 (토큰이 있는 경우에만)
        if (allConfig.hasSecureGitHubToken) {
            console.log('\n🌐 4. GitHub API 연결 테스트');
            console.log('-'.repeat(40));
            
            try {
                const GitHubService = require('../services/githubService');
                const githubService = new GitHubService(config);
                
                const connectionTest = await githubService.testConnection();
                
                if (connectionTest.success) {
                    console.log('✅ GitHub API 연결 성공');
                    console.log(`   응답시간: ${connectionTest.connectionTime}`);
                    console.log(`   Rate Limit 남은 횟수: ${connectionTest.rateLimit.remaining}`);
                } else {
                    console.log('❌ GitHub API 연결 실패');
                    console.log(`   오류: ${connectionTest.error}`);
                }
                
                // 인증 테스트
                const authTest = await githubService.testAuthentication();
                
                if (authTest.success) {
                    console.log('✅ GitHub 인증 성공');
                    console.log(`   사용자: ${authTest.user.login}`);
                    console.log(`   권한: ${authTest.scopes.join(', ') || 'N/A'}`);
                } else {
                    console.log('❌ GitHub 인증 실패');
                    console.log(`   오류: ${authTest.error}`);
                }
                
            } catch (error) {
                console.log('❌ GitHub 테스트 중 오류 발생');
                console.log(`   오류: ${error.message}`);
            }
        } else {
            console.log('\n⏭️  4. GitHub API 연결 테스트 (건너뜀)');
            console.log('-'.repeat(40));
            console.log('💡 GitHub 토큰을 먼저 설정하세요: npm run token');
        }
        
        // 5. 최종 상태 요약
        console.log('\n📊 5. 최종 상태 요약');
        console.log('-'.repeat(40));
        
        const statusItems = [
            { name: '기본 설정', status: validation.isValid, required: true },
            { name: '보안 토큰', status: allConfig.hasSecureGitHubToken, required: true },
            { name: '리포지토리 설정', status: allConfig.repositories.length > 0, required: true },
            { name: 'GitHub 조직 설정', status: allConfig.githubOrg !== 'your_organization_name_here', required: true }
        ];
        
        let allReady = true;
        
        statusItems.forEach(item => {
            const statusIcon = item.status ? '✅' : (item.required ? '❌' : '⚠️');
            const statusText = item.status ? '정상' : (item.required ? '필수 설정 누락' : '선택 설정');
            
            console.log(`   ${statusIcon} ${item.name}: ${statusText}`);
            
            if (item.required && !item.status) {
                allReady = false;
            }
        });
        
        console.log('\n' + '='.repeat(60));
        
        if (allReady) {
            console.log('🎉 시스템이 사용 준비가 완료되었습니다!');
            console.log('💡 npm start 명령어로 서버를 시작할 수 있습니다.');
        } else {
            console.log('⚠️  시스템 사용을 위해 추가 설정이 필요합니다.');
            console.log('💡 필수 설정을 완료한 후 다시 검증해주세요.');
            
            if (!allConfig.hasSecureGitHubToken) {
                console.log('   🔑 GitHub 토큰 설정: npm run token');
            }
            
            if (allConfig.githubOrg === 'your_organization_name_here') {
                console.log('   🏢 .env 파일에서 GITHUB_ORG를 설정하세요.');
            }
        }
        
        console.log('');
        
    } catch (error) {
        console.error('❌ 설정 검증 중 오류 발생:', error.message);
        process.exit(1);
    }
}

// 스크립트 실행
if (require.main === module) {
    validateConfiguration().catch(error => {
        console.error('❌ 검증 스크립트 실행 오류:', error.message);
        process.exit(1);
    });
}

module.exports = validateConfiguration;
