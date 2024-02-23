import crypto from 'crypto';
import fs from "fs";
import os from "os";
import * as Sentry from '@sentry/electron'
import { join, parse } from "path";
import { execSync } from "child_process";

const Registry = require('winreg');

export default class Encryption {
    static key: string;
    static oldKey: string;
    static backupKey: string;
    static algorithm : string = 'aes-256-cbc';

    /**
     * Attempt to read the supplied file as a UTF-16 format. If the decryption method throws an error this means that
     * UTF-8 was used as the encryption method. Upon error, decipher the text using the old method then encrypt using
     * UTF-16, returning the decrypted data at the end.
     * @param filePath A string of the file (path) to check.
     */
    static async detectFileEncryption(filePath: string): Promise<string | null> {
        const backup = this._getBackupFileName(filePath);
        const doesConfigExist = fs.existsSync(filePath);
        const doesBackupConfigExist = fs.existsSync(backup);

        if (!doesConfigExist && !doesBackupConfigExist) {
            return null; //No config files available
        }

        try {
            if (!doesConfigExist) { //Original config does not exist
                return await this.attemptAlternateDecryption(backup, filePath);
            }

            const data = fs.readFileSync(filePath, 'utf16le');
            if(data.length === 0 && backup.length == 0) return null;

            const decryptedData = await this.decryptDataUTF16(data.trim());

            if(!this.validateOriginalFile(filePath, decryptedData)) {
                return await this.attemptAlternateDecryption(backup, filePath);
            }

            return decryptedData;
        } catch (e) {
            console.log(e);
            return await this.attemptAlternateDecryption(backup, filePath);
        }
    }

    /**
     * Validates the original file based on its content and file path.
     * @param filePath - The path of the original file.
     * @param decryptedData - The decrypted data from the file.
     * @returns True if the file is valid, false otherwise.
     */
    static validateOriginalFile(filePath: string, decryptedData: string): boolean {
        if (filePath.includes("config.env")) {
            const dataArray = decryptedData.split('\n'); // Convert file data into an array
            const encryption = dataArray.find(item => item.startsWith('AppKey='));

            if (encryption) {
                console.log(`Data found for ${filePath}`);
                return true;
            } else {
                console.log(`Data not found look in backup found for ${filePath}`);
                return false;
            }
        } else if (filePath.includes("manifest.json")) {
            if (decryptedData.includes("Station") || decryptedData.includes("NUC")) {
                console.log(`Data found for ${filePath}`);
                return true;
            } else {
                console.log(`Data not found look in backup found for ${filePath}`);
                return false;
            }
        }

        // Other file type
        return true;
    }

    /**
     * Check if the backup exists, decrypt it and re-write the original file, if the backup does not exist the
     * config file is still in UTF-8.
     * @param backup A string of the backup file path.
     * @param filePath A string of the original file path
     */
    static async attemptAlternateDecryption(backup: string, filePath: string): Promise<string | null> {
        //Check if there is a backup available first and try to read that
        try {
            if (fs.existsSync(backup)) {
                const backupData = fs.readFileSync(backup, 'utf16le');
                console.log(`Backup data found`);
                const data = await this.decryptDataUTF16(backupData.trim(), true);

                //Re-write the original
                console.log(`Re-writing original data`);
                await this.encryptFile(data, filePath);
                return data;
            }
        } catch (e) {
            console.log(`Error: File in backup file: ${backup}: ${e}`);
            Sentry.captureMessage(`Original and Backup file corrupted: ${filePath} at MAC - ${this.key}`);
        }

        //Attempt to read in utf-8 then
        const data = fs.readFileSync(filePath, 'utf-8');
        if(data.length === 0) {
            return null;
        }

        //Decrypt in utf8 and convert to utf16le
        const decryptedData = await this.decryptData(data);
        await this.encryptFile(decryptedData, filePath);

        return decryptedData;
    }

    /**
     * Encrypt the supplied data and save it to a file, create or update the backup file at the same time.
     * @param data A string of text that is to be encrypted and saved.
     * @param filePath A string of the future saved file.
     */
    static async encryptFile(data: string, filePath: string): Promise<boolean> {
        const encryptedData = await this.encryptDataUTF16(data);
        const encryptedBackupData = await this.encryptDataUTF16(data, true);

        try {
            //Write the initial file
            await fs.promises.writeFile(filePath, encryptedData, { encoding: 'utf16le' });
            console.log(`File "${filePath}" has been written successfully.`);

            //Write the backup
            let backupFilePath = this._getBackupFileName(filePath);
            await fs.promises.writeFile(backupFilePath, encryptedBackupData, { encoding: 'utf16le' });
            console.log(`Backup File "${backupFilePath}" has been written successfully.`);

            return true;
        } catch (error) {
            console.error(`Error writing to file "${filePath}":`, error);
            return false;
        }
    }

    /**
     * Decrypt the supplied data with the AES algorithm.
     */
    static async decryptData(dataToDecrypt: string): Promise<string> {
        try {
            const iv = Buffer.from(dataToDecrypt.slice(0, 32), 'hex');
            const encrypted = dataToDecrypt.slice(32);

            if (this.oldKey === null || this.oldKey === undefined) {
                await this._collectOldSecret();
            }

            const decipher = crypto.createDecipheriv(this.algorithm, this.oldKey, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (e: any) {
            console.log("ERROR:" + e);
            Sentry.captureMessage("Encryption key changed. " + e.toString());
            throw new Error();
        }
    }

    /**
     * UTF-16 (Unicode) character decryption of the supplied data with the AES algorithm.
     * @param dataToEncrypt A string of text that is to be encrypted and saved.
     * @param backupKey A boolean to determine if the backup key should be used (true) or not (false).
     */
    static async encryptDataUTF16(dataToEncrypt: string, backupKey: boolean = false): Promise<string> {
        try {
            const iv = crypto.randomBytes(16); // generate a random initialization vector (IV)

            if (this.key === null || this.key === undefined) {
                this._collectSecret();
            }

            if (this.backupKey === null || this.backupKey === undefined) {
                await this._collectBackupSecret();
            }

            const cipher = crypto.createCipheriv(this.algorithm, backupKey ? this.backupKey : this.key, iv);
            let encrypted = cipher.update(dataToEncrypt, 'utf16le', 'hex');
            encrypted += cipher.final('hex');

            // Return the IV and encrypted data in UTF-16 hexadecimal format
            return iv.toString('hex') + encrypted;
        } catch (e: any) {
            Sentry.captureMessage(`Encryption error at ${this.key}. ` + e.toString());
            throw new Error();
        }
    }

    /**
     * UTF-16 (Unicode) character decryption of the supplied data with the AES algorithm.
     */
    static async decryptDataUTF16(dataToDecrypt: string, backupKey: boolean = false): Promise<string> {
        try {
            const iv = Buffer.from(dataToDecrypt.slice(0, 32), 'hex');
            const encrypted = dataToDecrypt.slice(32);

            if (this.key === null || this.key === undefined) {
                this._collectSecret();
            }

            if (this.backupKey === null || this.backupKey === undefined) {
                await this._collectBackupSecret();
            }

            const decipher = crypto.createDecipheriv(this.algorithm, backupKey ? this.backupKey : this.key, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf16le');
            decrypted += decipher.final('utf16le');

            return decrypted;
        } catch (e: any) {
            Sentry.captureMessage(`Encryption key error at ${this.key}. ` + e.toString());
            throw new Error();
        }
    }

    /**
     * Given a file path, add _backup before the extension and return the new path.
     * @param filePath A string of the file path to alter.
     */
    static _getBackupFileName(filePath: string): string {
        // Parse the file path to get its components
        let pathInfo = parse(filePath);

        // Add "_backup" to the base name
        return join(pathInfo.dir, `${pathInfo.name}_backup${pathInfo.ext}`);
    }

    /**
     * Collect the new secret for the encryption method
     */
    static _collectSecret(): void {
        const networkInterfaces = os.networkInterfaces();

        let internalMac: string = "";

        // Assuming you want the MAC address of the first non-internal network interface
        for (const key in networkInterfaces) {
            const networkInterface = networkInterfaces[key];

            if (networkInterface == null) continue;

            for (const iface of networkInterface) {
                if (!iface.internal) {
                    internalMac = iface.mac;
                    break;
                }
            }
        }

        if (internalMac == null) {
            this.key = "";
            return;
        }

        let paddedKey: string = internalMac;
        while (paddedKey.includes(":")) {
            paddedKey = paddedKey.replace("\:", '');
        }

        //Make sure the key is 32 characters long
        while (paddedKey.length < 32) {
            paddedKey += "0";
        }

        this.key = paddedKey.toLowerCase();
    }

    /**
     * Collect the local machines unique file system identifier and pad it to the correct length. This UUID will only
     * change on disk partitions, re-formatting or clean installations.
     */
    static async _collectBackupSecret(): Promise<void> {
        try {
            let paddedKey: string|null = this._getProcessorId();

            if (paddedKey === null) {
                return;
            }

            while (paddedKey.includes(":")) {
                paddedKey = paddedKey.replace("\:", '');
            }

            //Make sure the key is 32 characters long
            while (paddedKey.length < 32) {
                paddedKey += "0";
            }

            this.backupKey = paddedKey?.toLowerCase();
        } catch (error) {
            console.error(`Error getting file system UUID: ${error}`);
        }
    }

    /**
     * Use a command process to collect the processor ID for the current computer. Return null if this operation cannot
     * be completed.
     */
    static _getProcessorId(): string | null {
        try {
            const stdout = execSync('wmic cpu get processorid').toString();
            const lines = stdout.trim().split('\n');

            // Extracting the Processor ID from the output
            return lines.length > 1 ? lines[1].trim() : null;
        } catch (error) {
            console.error(`Error: ${error}`);
            return null;
        }
    }

    /**
     * Collect the local machines unique product identifier and pad it to the correct length
     */
    static async _collectOldSecret(): Promise<void> {
        // Open the registry key
        const regKey = new Registry({
            hive: Registry.HKLM,
            key: '\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\'
        });

        // Read the value of the ProductId key
        this.oldKey = await new Promise<string>((resolve, reject) => {
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
