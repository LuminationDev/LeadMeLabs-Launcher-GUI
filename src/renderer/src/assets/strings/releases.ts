interface release {
    version: string
    date: string
    features: string[]
    performance: string[]
    fixes: string[]
    codes: code
}

export interface code {
    Launcher: string
    NUC: string
    Station: string
    Tablet: string
    QA: string
    Config: string
}

const version1_3_2: release = {
    version: "1.3.2",
    date: "Monday 20th May 2024",
    features: [
        "Switch hosting to new servers",
        "Improve overnight updates following Microsoft Windows monthly updates",
        "Additional manual QA checks for new headsets"
    ],
    performance: [
        "Reduce use of SteamCMD"
    ],
    fixes: [
        "Flicker in station list when a lab has six stations",
        "Volume source not selectable for XR Elite headsets"
    ],
    codes: {
        Launcher: "1.3.2",
        NUC: "1.2.2",
        Station: "1.2.1",
        Tablet: "1.32",
        QA: "1.0.18",
        Config: "1.1.9",
    }
}

//region Previous Versions
const version1_3_0: release = {
    version: "1.3.0",
    date: "Monday 22nd April 2024",
    features: [
        "Subject filters and tags in experience library",
        "Experience descriptions available through experience library",
        "Support for alternative dashboard layouts",
        "Changes for upcoming idle mode feature"
    ],
    performance: [
    ],
    fixes: [
    ],
    codes: {
        Launcher: "1.2.27",
        NUC: "1.1.23",
        Station: "1.1.27",
        Tablet: "1.30",
        QA: "1.0.17",
        Config: "1.1.9",
    }
}

const version1_2_8: release = {
    version: "1.2.8",
    date: "Monday 8th April 2024",
    features: [
        "The tablet now displays a visual indicator reflecting its charging status, allowing users to easily discern whether the device is currently charging or not"
    ],
    performance: [
        "Ability for the NUC to automatically address connectivity problems by 'forgetting' tablets after too many timeouts",
        "The tablet attempts to reconnect on tablet unlock (LeadMe application resumes), if disconnection has occurred",
        "The configuration tool now supports the addition of Panasonic projectors to the list of appliances",
        "Segment analytics collection"
    ],
    fixes: [
        "Tablet integration within the QA tool has been fixed",
        "The QA tool now includes a save/load function, enabling users to preserve their work",
        "Resolved an issue where experiences failed to load because of special characters present in their names"
    ],
    codes: {
        Launcher: "1.2.27",
        NUC: "1.1.22",
        Station: "1.1.22",
        Tablet: "1.28",
        QA: "1.0.17",
        Config: "1.1.9",
    }
}

const version1_2_7: release = {
    version: "1.2.7",
    date: "Monday 25th March 2024",
    features: [

    ],
    performance: [
        "Log messages now come with labels prefixes, making it easier to organise and filter essential information",
        "Improved logging by filtering messages to accurately reflect the logged data",
        "Introduced the initial Segment data collection functionality for Tablet and NUC. A new data aggregation service designed to complement or potentially replace Google Analytics. The concept is to serve as a central hub for data consolidation, facilitating subsequent analysis",
        "Tablet settings now display lab location, automatically synchronised from the NUC if not previously configured"
    ],
    fixes: [
        "Addressed connectivity issues between the QA tool and NUC/Firebase, ensuring proper integration",
        "Resolved false negative reports concerning Firewall Allowances within the QA tool",
        "Fixed the ripple animation for visual feedback on select Station control buttons",
        "Fixed issues related to shutting down stations while the active experiences popup is open"
    ],
    codes: {
        Launcher: "1.2.27",
        NUC: "1.1.21",
        Station: "1.1.21",
        Tablet: "1.27",
        QA: "1.0.16",
        Config: "1.1.9",
    }
}

const version1_2_5: release = {
    version: "1.2.5",
    date: "Tuesday 12th March 2024",
    features: [
        "Added a warning prompt for users before refreshing the experience list, informing them that running applications will be stopped",
        "Integrated Panasonic projectors into the system"
    ],
    performance: [
    ],
    fixes: [
        "Fixed file upload function in LeadMe Launcher",
        "Resolved VR library refresh issue during user searches",
        "Corrected projector sources not reflecting current values on tablet",
        "Addressed crashes in QA due to missing Steam details",
        "Fixed Steam install location check to prevent incorrect bug reports"
    ],
    codes: {
        Launcher: "1.2.27",
        NUC: "1.1.20",
        Station: "1.1.20",
        Tablet: "1.26",
        QA: "1.0.15",
        Config: "1.1.9",
    }
}

const version1_2_4: release = {
    version: "1.2.4",
    date: "Monday 26th February 2024",
    features: [
        "All LeadMe applications are now code signed",
        "Backend support for code sharing to applications",
        "Add timestamp to auto-QA",
        "Upon updating, the Station & NUC software will automatically upload a streamlined quality assurance report to our database. Each test is time stamped upon execution, and the reports are organised by location and version number, allowing retrospective analysis against previous releases",
        "Detect steam manifest corruption and attempt auto-fix",
        "SteamVR manifests may occasionally become corrupted due to regular usage. The Station software now includes an automatic repair feature; if unsuccessful, it prompts the user to connect a headset, triggering a refresh of the VR manifest"
    ],
    performance: [
    ],
    fixes: [
        "Fix crash running packet loss test in QA tool",
        "Fix experiences not loading if family mode was enabled at one point and then disabled"
    ],
    codes: {
        Launcher: "1.2.26",
        NUC: "1.1.19",
        Station: "1.1.19",
        Tablet: "1.24",
        QA: "1.0.14",
        Config: "1.1.9",
    }
}
//endregion

export const latest_release = "1.3.2";
export const all_releases = [version1_3_2, version1_3_0, version1_2_8, version1_2_7, version1_2_5, version1_2_4]