const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecureTokenManager {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyFile = path.join(process.cwd(), '.token_key');
        this.tokenFile = path.join(process.cwd(), '.secure_tokens');
        this.masterKey = this.getMasterKey();
    }

    /**
     * 마스터 키 생성 또는 로드
     * @returns {Buffer} 마스터 키
     */
    getMasterKey() {
        try {
            if (fs.existsSync(this.keyFile)) {
                return fs.readFileSync(this.keyFile);
            } else {
                // 새로운 마스터 키 생성
                const key = crypto.randomBytes(32);
                fs.writeFileSync(this.keyFile, key, { mode: 0o600 }); // 소유자만 읽기/쓰기 가능
                console.log('🔑 새로운 마스터 키가 생성되었습니다.');
                return key;
            }
        } catch (error) {
            throw new Error(`마스터 키 처리 실패: ${error.message}`);
        }
    }

    /**
     * 토큰 암호화
     * @param {string} token - 암호화할 토큰
     * @returns {string} 암호화된 토큰 (base64)
     */
    encryptToken(token) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(this.algorithm, this.masterKey);
            cipher.setAAD(Buffer.from('github-token'));
            
            let encrypted = cipher.update(token, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            const result = {
                iv: iv.toString('hex'),
                encrypted,
                authTag: authTag.toString('hex')
            };
            
            return Buffer.from(JSON.stringify(result)).toString('base64');
        } catch (error) {
            throw new Error(`토큰 암호화 실패: ${error.message}`);
        }
    }

    /**
     * 토큰 복호화
     * @param {string} encryptedToken - 암호화된 토큰 (base64)
     * @returns {string} 복호화된 토큰
     */
    decryptToken(encryptedToken) {
        try {
            const data = JSON.parse(Buffer.from(encryptedToken, 'base64').toString());
            const { iv, encrypted, authTag } = data;
            
            const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
            decipher.setAAD(Buffer.from('github-token'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`토큰 복호화 실패: ${error.message}`);
        }
    }

    /**
     * 보안 토큰 저장
     * @param {string} name - 토큰 이름
     * @param {string} token - 저장할 토큰
     */
    saveSecureToken(name, token) {
        try {
            let tokens = {};
            
            // 기존 토큰 파일 로드
            if (fs.existsSync(this.tokenFile)) {
                const data = fs.readFileSync(this.tokenFile, 'utf8');
                tokens = JSON.parse(data);
            }
            
            // 토큰 암호화 후 저장
            tokens[name] = {
                encrypted: this.encryptToken(token),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // 파일 권한 설정 (소유자만 읽기/쓰기)
            fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2), { mode: 0o600 });
            console.log(`✅ 토큰 '${name}'이 안전하게 저장되었습니다.`);
            
        } catch (error) {
            throw new Error(`토큰 저장 실패: ${error.message}`);
        }
    }

    /**
     * 보안 토큰 로드
     * @param {string} name - 토큰 이름
     * @returns {string|null} 복호화된 토큰
     */
    loadSecureToken(name) {
        try {
            if (!fs.existsSync(this.tokenFile)) {
                return null;
            }
            
            const data = fs.readFileSync(this.tokenFile, 'utf8');
            const tokens = JSON.parse(data);
            
            if (!tokens[name]) {
                return null;
            }
            
            return this.decryptToken(tokens[name].encrypted);
            
        } catch (error) {
            console.error(`토큰 로드 실패: ${error.message}`);
            return null;
        }
    }

    /**
     * 토큰 삭제
     * @param {string} name - 삭제할 토큰 이름
     */
    deleteToken(name) {
        try {
            if (!fs.existsSync(this.tokenFile)) {
                console.log('토큰 파일이 존재하지 않습니다.');
                return;
            }
            
            const data = fs.readFileSync(this.tokenFile, 'utf8');
            const tokens = JSON.parse(data);
            
            if (tokens[name]) {
                delete tokens[name];
                fs.writeFileSync(this.tokenFile, JSON.stringify(tokens, null, 2), { mode: 0o600 });
                console.log(`✅ 토큰 '${name}'이 삭제되었습니다.`);
            } else {
                console.log(`토큰 '${name}'을 찾을 수 없습니다.`);
            }
            
        } catch (error) {
            throw new Error(`토큰 삭제 실패: ${error.message}`);
        }
    }

    /**
     * 모든 토큰 목록 조회
     * @returns {Array} 토큰 이름 목록
     */
    listTokens() {
        try {
            if (!fs.existsSync(this.tokenFile)) {
                return [];
            }
            
            const data = fs.readFileSync(this.tokenFile, 'utf8');
            const tokens = JSON.parse(data);
            
            return Object.keys(tokens).map(name => ({
                name,
                createdAt: tokens[name].createdAt,
                updatedAt: tokens[name].updatedAt
            }));
            
        } catch (error) {
            console.error(`토큰 목록 조회 실패: ${error.message}`);
            return [];
        }
    }

    /**
     * 토큰 검증
     * @param {string} name - 토큰 이름
     * @returns {boolean} 토큰 유효성
     */
    validateToken(name) {
        const token = this.loadSecureToken(name);
        return token !== null && token.length > 0;
    }
}

module.exports = SecureTokenManager;
