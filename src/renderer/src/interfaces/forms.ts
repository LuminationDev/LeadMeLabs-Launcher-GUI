export interface NUCForm {
    AppKey: string;
    LabLocation: string;
    CbusIP: string;
    CbusNucScriptId: string;
    CbusLogin?: string;
    CbusPassword?: string;
    NovaStarLogin?: string;
    NovaStarPassword?: string;
    ReportRealtimeData?: string;
}

export interface StationForm {
    AppKey: string;
    LabLocation: string;
    StationId: string;
    room: string;
    NucAddress: string;
    SteamUserName?: string;
    SteamPassword?: string;
    StationMode: string;
    HeadsetType?: string;
}
