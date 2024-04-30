export interface AppEntry {
    type: string
    id: string
    name: string
    alias?: string
    autostart: boolean
    altPath: string|null
    parameters: {
        pin: string|null
        vrManifest: boolean|null
    }
    mode: string|null
    setup?: boolean|null
}
