import crypto from 'crypto';

export default class Encryption {
    static key: string = "VMALkZE0qYMuPZN4N6QbJOZxQL22Rvzf"
    static algorithm : string = 'aes-256-cbc';

    /**
     * Encrypt the supplied data with the AES algorithm.
     */
    static encryptData(dataToEncrypt: string): string {
        const iv = crypto.randomBytes(16); // generate a random initialization vector (IV)

        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + encrypted;
    }

    /**
     * Decrypt the supplied data with the AES algorithm.
     */
    static decryptData(dataToDecrypt: string): string {
        const iv = Buffer.from(dataToDecrypt.slice(0, 32), 'hex');
        const encrypted = dataToDecrypt.slice(32);

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}
