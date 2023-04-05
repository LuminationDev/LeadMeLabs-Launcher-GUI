class Application {
    id: string //The unique ID of the application
    name: string //The name of the application
    url: string //The download URL of the application
    altPath: string //The download URL of the application
    autoStart: boolean //Whether the application should start on the launcher opening
    status: string //The status of the application (not installed, downloading, paused download, installed)

    constructor(id: string, name: string, url: string, altPath: string, autoStart: boolean, status: string) {
        this.id = id
        this.name = name
        this.url = url
        this.altPath = altPath
        this.autoStart = autoStart
        this.status = status
    }
}

export default Application
