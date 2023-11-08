class Application {
    id: string //The unique ID of the application
    name: string //The name of the application
    url: string //The download URL of the application
    altPath: string //The download URL of the application
    autostart: boolean //Whether the application should start on the launcher opening
    status: string //The status of the application (not installed, downloading, paused download, installed)
    parameters: {
        vrManifest: boolean|null
    } //Holds different parameters that affect the running of software. Currently, may contain (vrManifest)
    remoteConfigStatus: boolean // The status of whether the application is set up for remote config

    constructor(id: string, name: string, url: string, altPath: string, autostart: boolean, status: string) {
        this.id = id
        this.name = name
        this.url = url
        this.altPath = altPath
        this.autostart = autostart
        this.status = status
        this.parameters = {
            vrManifest: null
        }
        this.remoteConfigStatus = false
    }
}

export default Application
