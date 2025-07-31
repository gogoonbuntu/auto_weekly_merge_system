# Node.js 18 LTS 알파인 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 설치를 위한 의존성 파일 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --only=production && npm cache clean --force

# 애플리케이션 소스 복사
COPY . .

# 비root 사용자 생성 및 권한 설정
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs && \
    mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app

# 로그 디렉토리 볼륨 설정
VOLUME ["/app/logs"]

# 포트 노출
EXPOSE 3000

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# 사용자 전환
USER nodeuser

# 애플리케이션 시작
CMD ["node", "server.js"]