#!/bin/bash

# Auto Weekly Merge System 시작 스크립트

set -e

echo "🚀 Auto Weekly Merge System 시작 중..."

# 환경변수 파일 확인
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다. .env.example을 참조하여 생성해주세요."
    exit 1
fi

# Node.js 버전 확인
node_version=$(node --version)
echo "📦 Node.js 버전: $node_version"

# 의존성 설치 확인
if [ ! -d "node_modules" ]; then
    echo "📥 의존성 설치 중..."
    npm install
fi

# 로그 디렉토리 생성
mkdir -p logs

# GitHub Token 확인
source .env
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN이 설정되지 않았습니다."
    exit 1
fi

if [ -z "$GITHUB_ORG" ]; then
    echo "❌ GITHUB_ORG가 설정되지 않았습니다."
    exit 1
fi

echo "✅ GitHub 설정 확인 완료: $GITHUB_ORG"

# 포트 확인
PORT=${PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ 포트 $PORT가 이미 사용 중입니다."
    echo "다른 포트를 사용하려면 .env 파일의 PORT를 변경하세요."
    exit 1
fi

# 개발/프로덕션 모드 확인
if [ "$NODE_ENV" = "production" ]; then
    echo "🏭 프로덕션 모드로 시작..."
    npm start
else
    echo "🛠️ 개발 모드로 시작..."
    npm run dev
fi