import IpcMainEvent = Electron.IpcMainEvent;
import { join } from "path";
import Encryption from "../encryption/Encryption";
import fs from "fs";
import { IdTokenResponse } from "../types/responses";
import * as Sentry from "@sentry/electron";

export default class ConfigController {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    appDirectory: string;
    FIREBASE_BASE_URL: string = 'https://leadme-labs-default-rtdb.asia-southeast1.firebasedatabase.app/lab_remote_config/';
    config: Array<string> = [];

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.appDirectory = process.env.APPDATA + '/leadme_apps';
    }

    /**
     * Update an env file that is associated with the Station or NUC applications. If there is a previous entry for a value
     * with the same key override that key/value pair.
     */
    async configApplication(_event: IpcMainEvent, info: any): Promise<void> {
        const config = join(this.appDirectory, `${info.name}/_config/config.env`)
        const data = JSON.parse(info.value);

        const newDataArray: string[] = [];

        for(const key in data) {
            newDataArray.push(`${key}=${data[key]}`)
        }

        const success = await Encryption.encryptFile(newDataArray.join('\n'), config);
        if (success) {
            await this.uploadExistingConfig(info.name)
        }
    }

    /**
     * Update an env file that is associated with the Station or NUC applications. If there is a previous entry for a value
     * with the same key override that key/value pair.
     */
    async setRemoteConfig(_event: IpcMainEvent, info: any): Promise<void> {
        const config = join(this.appDirectory, `${info.value.name}/_config/remote-config.env`)
        const data = info.value;

        const newDataArray: string[] = [];

        for(const key in data) {
            newDataArray.push(`${key}=${data[key]}`)
        }

        const success = await Encryption.encryptFile(newDataArray.join('\n'), config);
        if (success) {
            await this.uploadExistingConfig(info.value.name)
        }
    }

    /**
     * Gets the application configuration details.
     */
    async getApplicationConfig(_event: IpcMainEvent|null, info: any): Promise<void> {
        if (_event !== null && this.checkIfRemoteConfigIsEnabled(_event, info)) {
            const idTokenResponse = await this.generateIdTokenFromRemoteConfigFile(info.name)
            await this.downloadAndUpdateLocalConfig(info.name, idTokenResponse)
            if (info.name == 'NUC') {
                await this.compareJsonFileAndUpdate('appliance_list', idTokenResponse)
                await this.compareJsonFileAndUpdate('station_list', idTokenResponse)
            }
        }
        const config = join(this.appDirectory, `${info.name}/_config/config.env`);

        const decryptedData = await Encryption.detectFileEncryption(config);
        if(decryptedData == null) {
            return;
        }

        let dataArray = decryptedData.split('\n'); // convert file data in an array
        if (info.name == 'NUC') {
            if (dataArray.findIndex(element => element.startsWith("ReportRealtimeData")) === -1) {
                dataArray.push("ReportRealtimeData=false")
            }
        }
        this.config = dataArray

        //Send the data array back to the front end.
        this.mainWindow.webContents.send('backend_message', {
            channelType: "application_config",
            name: info.name,
            data: dataArray
        });
    }

    /**
     * Asynchronously uploads the content of an existing configuration file to a Firebase database.
     *
     * @param {string} name - The name of the configuration.
     * @returns {Promise<void>} A promise that resolves when the upload is complete.
     */
    async uploadExistingConfig(name: string): Promise<void> {
        const config = join(this.appDirectory, `${name}/_config/config.env`);
        let dataArray: Array<string> = []

        const decryptedData = await Encryption.detectFileEncryption(config);
        if(decryptedData === null || decryptedData.length === 0) {
            return;
        }

        dataArray = decryptedData.split('\n'); // convert file data in an array

        try {
            const idTokenResponse = await this.generateIdTokenFromRemoteConfigFile(name)
            await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/config.json?auth=` + idTokenResponse.idToken, {
                method: "PUT",
                body: JSON.stringify(dataArray)
            })
        } catch (e) {
            console.log(e)
            return
        }
    }

    /**
     * Generates an ID token from a remote configuration file.
     * @param applicationType The type of the application.
     * @returns A promise that resolves to an object containing the ID token and user ID.
     */
    async generateIdTokenFromRemoteConfigFile(applicationType: string): Promise<IdTokenResponse> {
        const remoteConfig = join(this.appDirectory, `${applicationType}/_config/remote-config.env`);
        let remoteConfigArray: Array<string> = []
        let idToken = ''
        let uid = ''
        let refreshToken = ''
        const decryptedData = await Encryption.detectFileEncryption(remoteConfig);
        if(decryptedData === null || decryptedData.length === 0) {
            // todo - throw failure
            return { idToken: "", uid: "" };
        }

        remoteConfigArray = decryptedData.split('\n'); // convert file data in an array
        if (remoteConfigArray.length < 2) {
            // todo - throw failure
        }
        uid = remoteConfigArray[0].split("=", 2)[1]
        refreshToken = remoteConfigArray[1].split("=", 2)[1]
        idToken = await this.generateIdTokenFromRefreshToken(refreshToken)
        return Promise.resolve({ idToken, uid })
    }

    /**
     * Generates an ID token from a refresh token using a network request.
     * @param refreshToken The refresh token used to generate the ID token.
     * @returns A promise that resolves to the ID token.
     */
    async generateIdTokenFromRefreshToken(refreshToken: string): Promise<string> {
        const response = await fetch("https://securetoken.googleapis.com/v1/token?key=AIzaSyDeXIbE7PvD5b3VMwkQNhWcvzmkEqD1zEQ", {
            method: "POST",
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        })
        const responseData = await response.json() as any
        return responseData.id_token
    }

    /**
     * Asynchronously downloads configuration data from Firebase, updates the local configuration file,
     * and uploads the updated configuration to Firebase.
     *
     * @param {string} name - The name of the configuration.
     * @param {IdTokenResponse} idTokenResponse - The authentication token response object containing the UID and ID token.
     * @returns {Promise<void>} A promise that resolves when the download and update process is complete.
     */
    async downloadAndUpdateLocalConfig(name: string, idTokenResponse: IdTokenResponse): Promise<void> {
        try {
            const result = await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/config.json?auth=` + idTokenResponse.idToken, {
                method: "GET"
            })
            if (result.status !== 200) {
                return
            }
            const config = join(this.appDirectory, `${name}/_config/config.env`)
            const decryptedData = await Encryption.detectFileEncryption(config);
            if(decryptedData === null || decryptedData.length === 0) {
                return;
            }

            let dataArray = decryptedData.split('\n'); // convert file data in an array

            const body = await result.json()

            for(const key in body) {
                var configItemKey = body[key].split("=", 2)[0];
                const index = dataArray.findIndex(element => element.startsWith(configItemKey))

                if (index === -1) {
                    dataArray.push(`${body[key]}`)
                } else {
                    dataArray[index] = `${body[key]}`
                }
            }

            const success = await Encryption.encryptFile(dataArray.join('\n'), config);
            if (success) {
                await this.uploadExistingConfig(name)
            }
        } catch (e) {
            console.log(e)
            return
        }
    }

    /**
     * Asynchronously compares the modification dates of a local JSON file and its corresponding online version,
     * and updates either the local or online version depending on which one is more recent.
     *
     * @param {string} fileName - The name of the JSON file.
     * @param {IdTokenResponse} idTokenResponse - The authentication token response object containing the UID and ID token.
     */
    async compareJsonFileAndUpdate(fileName: string, idTokenResponse: IdTokenResponse) {
        //get the dates and check
        try {
            const datesResult = await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/${fileName}_dates.json?auth=` + idTokenResponse.idToken, {
                method: "GET"
            })
            let datesBody;
            if (datesResult.status === 404) {
                datesBody = { latestOnlineUpdate: 0, latestLocalUpdate: 0 }
            } else if (datesResult.status === 200) {
                datesBody = await datesResult.json() ?? { latestOnlineUpdate: 0, latestLocalUpdate: 0 }
            } else {
                return
            }

            const fileLocation = `C:\\labs_config\\${fileName}.json`
            let fileStats = fs.statSync(fileLocation)

            if (Number(datesBody.latestOnlineUpdate) > fileStats.mtimeMs) {
                // update local from online
                console.log('updating local from online')
                Sentry.captureMessage(`updating local ${fileName} from online for uid: ${idTokenResponse.uid}`)
                const result = await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/${fileName}.json?auth=` + idTokenResponse.idToken, {
                    method: "GET"
                })
                if (result.status !== 200) {
                    return
                }
                const responseBody = await result.json()
                if (responseBody && responseBody.length > 0) {
                    fs.writeFileSync(fileLocation, JSON.stringify(responseBody, null, 4), 'utf-8')

                    fileStats = fs.statSync(fileLocation)
                    await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/${fileName}_dates.json?auth=` + idTokenResponse.idToken, {
                        method: "PUT",
                        body: JSON.stringify({ ...datesBody, latestLocalUpdate: fileStats.mtimeMs })
                    })
                }
            } else if (fileStats.mtimeMs > Number(datesBody.latestLocalUpdate)) {
                // update online from local
                console.log('updating online from local')
                Sentry.captureMessage(`updating online ${fileName} from local for uid: ${idTokenResponse.uid}`)
                let fileData = fs.readFileSync(fileLocation, {encoding: 'utf-8'});
                let parsedData = JSON.parse(fileData)

                try {
                    await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/${fileName}.json?auth=` + idTokenResponse.idToken, {
                        method: "PUT",
                        body: JSON.stringify(parsedData)
                    })
                    await fetch(`${this.FIREBASE_BASE_URL}${idTokenResponse.uid}/${fileName}_dates.json?auth=` + idTokenResponse.idToken, {
                        method: "PUT",
                        body: JSON.stringify({ ...datesBody, latestLocalUpdate: fileStats.mtimeMs })
                    })
                } catch (e) {
                    console.log(e)
                    Sentry.captureException(e)
                    return
                }
            }
        } catch (e) {
            Sentry.captureException(e)
        }
    }

    /**
     * Check if Remote config has been enabled by the user
     * @param _event
     * @param info
     */
    checkIfRemoteConfigIsEnabled(_event: IpcMainEvent, info: any): boolean {
        const remoteConfig = join(this.appDirectory, `${info.applicationType}/_config/remote-config.env`);
        let result = false
        try {
            if (fs.existsSync(remoteConfig)) {
                result = true
            }
        } catch (error) {
            result = false
        }
        this.mainWindow.webContents.send('backend_message', {
            channelType: "remote_config",
            name: info.applicationType,
            message: 'RemoteConfig' + (result ? 'Enabled' : 'Disabled')
        });
        return result
    }
}
