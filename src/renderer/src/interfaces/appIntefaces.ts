export interface AppEntry {
    type: string
    id: string
    name: string
    autostart: boolean
    altPath: string|null
    parameters: {}
    development: boolean|null
}
