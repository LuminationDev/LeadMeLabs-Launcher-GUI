class Application {
    id: string //The unique ID of the application
    name: string //The name of the application
    url: string //The download URL of the application
    status: string //The status of the application (not installed, downloading, paused download, installed)
    constructor(id: string, name: string, url: string, status: string) {
        this.id = id
        this.name = name
        this.url = url
        this.status = status
    }
}

export default Application
