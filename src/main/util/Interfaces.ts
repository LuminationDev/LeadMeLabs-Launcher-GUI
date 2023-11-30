export interface AppEntry {
    type: string
    id: string
    name: string
    autostart: boolean
    altPath: string|null
    parameters: {}
    mode: string|null
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

export interface ConfigFile {
    source: string;
    applications: VREntry[];
}