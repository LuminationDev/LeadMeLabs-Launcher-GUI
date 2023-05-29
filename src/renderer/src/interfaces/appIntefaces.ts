export interface AppEntry {
    type: string
    id: string
    name: string
    autostart: boolean
    altPath: string|null
    parameters: {}
    mode: string|null
}
