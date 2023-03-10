import crypto from 'crypto';

const Registry = require('winreg');

export default class Encryption {
    static key: string;
    static algorithm : string = 'aes-256-cbc';

    /**
     * Encrypt the supplied data with the AES algorithm.
     */
    static async encryptData(dataToEncrypt: string): Promise<string> {
        const iv = crypto.randomBytes(16); // generate a random initialization vector (IV)

        if (this.key === null || this.key === undefined) {
            await this._collectSecret();
        }

        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + encrypted;
    }

    /**
     * Decrypt the supplied data with the AES algorithm.
     */
    static async decryptData(dataToDecrypt: string): Promise<string> {
        const iv = Buffer.from(dataToDecrypt.slice(0, 32), 'hex');
        const encrypted = dataToDecrypt.slice(32);

        if (this.key === null || this.key === undefined) {
            await this._collectSecret();
        }

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Collect the local machines unique identifier and pad it to the correct length
     */
    static async _collectSecret(): Promise<void> {
        // Open the registry key
        const regKey = new Registry({
            hive: Registry.HKLM,
            key: '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\'
        });

        // Read the value of the ProductId key
        this.key = await new Promise<string>((resolve, reject) => {
            regKey.get('ProductId', (err, result) => {
                if (err) {
                    console.error(err);
                    reject(null);
                }

                let paddedKey: string = result.value;
                while (paddedKey.includes("-")) {
                    paddedKey = paddedKey.replace("\-", '');
                }

                //Make sure the key is 32 characters long
                while (paddedKey.length < 32) {
                    paddedKey += "0";
                }
                resolve(paddedKey);
            });
        });
    }
}
