import crypto from 'crypto';
import fs from "fs";

const Registry = require('winreg');

export default class Encryption {
    static key: string;
    static algorithm : string = 'aes-256-cbc';

    /**
     * Attempt to read the supplied file as a UTF-16 format. If the decryption method throws an error this means that
     * UTF-8 was used as the encryption method. Upon error, decipher the text using the old method then encrypt using
     * UTF-16, returning the decrypted data at the end.
     * @param filename A string of the file (path) to check.
     */
    static async detectFileEncryption(filename: string): Promise<string | null> {
        const data = fs.readFileSync(filename, 'utf16le');
        if(data.length === 0) {
            return null;
        }

        try {
            return await Encryption.decryptDataUTF16(data.trim());
        } catch (e) {
            console.log(`Error: File in UTF-8: ${e}`)

            //Attempt to read in utf-8 then
            const data = fs.readFileSync(filename, 'utf-8');
            if(data.length === 0) {
                return null;
            }

            //Encrypt in utf16le and convert to utf16le
            const decryptedData = await Encryption.decryptDataUTF8(data);
            const encryptedData = await Encryption.encryptDataUTF16(decryptedData);
            const buffer = Buffer.from(encryptedData, 'utf16le');

            fs.writeFile(filename, buffer, (err) => {
                if (err) { console.log(err); }
                console.log(`${filename} successfully updated to UTF-16.`);
            });

            //Send back the original utf-8 decryptedData, so we don't have to decrypt again.
            return decryptedData;
        }
    }

    /**
     * UTF-8 character decryption of the supplied data with the AES algorithm.
     * NOTE: this is now legacy code (Version 1.2.5)
     */
    static async decryptDataUTF8(dataToDecrypt: string): Promise<string> {
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
     * UTF-16 (Unicode) character decryption of the supplied data with the AES algorithm.
     */
    static async encryptDataUTF16(dataToEncrypt: string): Promise<string> {
        const iv = crypto.randomBytes(16); // generate a random initialization vector (IV)

        if (this.key === null || this.key === undefined) {
            await this._collectSecret();
        }

        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(dataToEncrypt, 'utf16le', 'hex');
        encrypted += cipher.final('hex');

        // Return the IV and encrypted data in UTF-16 hexadecimal format
        return iv.toString('hex') + encrypted;
    }

    /**
     * UTF-16 (Unicode) character decryption of the supplied data with the AES algorithm.
     */
    static async decryptDataUTF16(dataToDecrypt: string): Promise<string> {
        const iv = Buffer.from(dataToDecrypt.slice(0, 32), 'hex');
        const encrypted = dataToDecrypt.slice(32);

        if (this.key === null || this.key === undefined) {
            await this._collectSecret();
        }

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf16le');
        decrypted += decipher.final('utf16le');

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
