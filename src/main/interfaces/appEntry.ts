export interface AppEntry {
    type: string
    id: string
    name: string
    alias?: string
    autostart: boolean
    altPath: string|null
    parameters: {}
    mode: string|null
    setup?: boolean|null
}

export interface VREntry {
    app_key: string
    launch_type: string
    binary_path_windows: string
    is_dashboard_overlay: boolean
    strings: {
        [language: string]: {
            name: string
        }
    }
}
