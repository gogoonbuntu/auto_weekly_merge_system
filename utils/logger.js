const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 로그 디렉토리 생성
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 로거 생성
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // 전체 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'application.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 에러 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 일별 로그 파일
    new winston.transports.File({
      filename: path.join(logDir, `weekly-merge-${new Date().toISOString().slice(0, 10)}.log`),
      level: 'info'
    })
  ]
});

// 개발 환경에서는 더 상세한 로그
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * 특정 리포지토리나 프로세스별 로그 생성
 */
logger.createChildLogger = (context) => {
  return logger.child({ context });
};

/**
 * 로그 파일 목록 조회
 */
logger.getLogFiles = () => {
  try {
    const files = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logDir, file),
        size: fs.statSync(path.join(logDir, file)).size,
        modified: fs.statSync(path.join(logDir, file)).mtime
      }))
      .sort((a, b) => b.modified - a.modified);
    
    return files;
  } catch (error) {
    logger.error('로그 파일 목록 조회 실패:', error);
    return [];
  }
};

/**
 * 로그 파일 내용 읽기
 */
logger.readLogFile = (filename, lines = 100) => {
  try {
    const filePath = path.join(logDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error('로그 파일을 찾을 수 없습니다.');
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const logLines = content.split('\n').filter(line => line.trim());
    
    // 최근 N줄만 반환
    return logLines.slice(-lines).reverse();
  } catch (error) {
    logger.error('로그 파일 읽기 실패:', error);
    return [];
  }
};

/**
 * 실시간 로그 스트림을 위한 이벤트 에미터
 */
const EventEmitter = require('events');
class LogStream extends EventEmitter {
  constructor() {
    super();
    this.logs = [];
    this.maxLogs = 1000;
  }
  
  add(level, message, context = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };
    
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    this.emit('log', logEntry);
  }
  
  getLogs(level = null, limit = 100) {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(0, limit);
  }
}

const logStream = new LogStream();

// Winston 로거와 연동
const originalLog = logger.log;
logger.log = function(level, message, context) {
  logStream.add(level, message, context);
  return originalLog.call(this, level, message);
};

logger.stream = logStream;

module.exports = logger;