import { defineStore } from 'pinia'
import { Application } from '../models'
import { reactive, ref } from "vue";
import * as CONSTANT from '../assets/constants/index';
import { ModeUrls } from "../interfaces/modeUrls";
import * as Sentry from "@sentry/electron";
import {Video} from "../interfaces/video";

const leadMeApplications = {
    type: CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME,
    apps: [
        {
            id: "1",
            name: 'Station',
            alias: 'Station',
            url: '/Station'
        },
        {
            id: "2",
            name: 'NUC',
            alias: 'NUC',
            url: '/NUC'
        }
    ]
}

const leadMeTools = {
    type: CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL,
    apps: [
        {
            id: "101",
            name: CONSTANT.APPLICATION_TYPE.APPLICATION_NAME_QA_TOOL,
            alias: 'leadme-tools-qa', //What the executable is named
            url: '/latest.yml'
        },
        {
            id: "102",
            name: CONSTANT.APPLICATION_TYPE.APPLICATION_NAME_NETWORK_TOOL,
            alias: 'leadme-network',
            url: '/latest.yml'
        },
        {
            id: "103",
            name: CONSTANT.APPLICATION_TYPE.APPLICATION_NAME_EXPERIENCE_TOOL,
            alias: 'leadme-experiences',
            url: '/latest.yml'
        }
    ]
}

const embeddedApplications = {
    type: CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED,
    apps: [
        {
            id: "201",
            alias: "video-player",
            name: 'Video Player',
            url:'https://leadme-apps.sgp1.vultrobjects.com/video-player/'
        },
        {
            id: "202",
            alias: "vr-video-player",
            name: 'VR Video Player',
            url:'https://leadme-apps.sgp1.vultrobjects.com/vr-video-player/'
        },
        {
            id: "203",
            name: 'Open Brush',
            alias: "open-brush",
            url:'https://leadme-apps.sgp1.vultrobjects.com/open-brush/'
        },
        {
            id: "204",
            name: 'WebXR Viewer',
            alias: "leadme-webxr-viewer",
            url:'https://leadme-apps.sgp1.vultrobjects.com/leadme-webxr-viewer/'
        },
        {
            id: "205",
            name: 'Base Station FOV Viewer',
            alias: "base-station-fov-viewer",
            url:'https://leadme-apps.sgp1.vultrobjects.com/base-station-fov-viewer/'
        }
    ]
}

const allPrograms = [leadMeApplications, leadMeTools, embeddedApplications]

/**
 * A dictionary containing all hosted programs associated with LeadMe. Programs are categorized based on their types,
 * with each category starting their IDs 100 units apart from the previous category.
 */
const values: {} = {};
allPrograms.forEach(program => {
    const type = program.type;

    program.apps.forEach((app, _) => {
        values[app.id] = new Application(
            app.id,
            app.name,
            app.alias,
            app.url,
            '',
            false,
            CONSTANT.MODEL_VALUE.STATUS_NOT_INSTALLED,
            null,
            type
        );
    });
});

export const useLibraryStore = defineStore({
    id: 'library',
    state: () => ({
        version: '',
        location: '',
        pin: '',
        mode: 'production',
        appDirectory: '',
        toolDirectory: '',
        menuType: CONSTANT.IMPORT_TYPE.APPLICATION,
        selectedApplication: <string | undefined> '',
        applicationParameters: {},
        applicationSetup: reactive([]),
        applications: ref(new Map<string, Application>(Object.entries(values))),
        videos: ref(new Map<string, Video[]>),
        selectedVideo: <string | undefined> '',
        schedulerTask: { enabled: false, status: 'Unknown', warning: "" },
        canAccessVultr: null
    }),
    actions: {
        /**
         * Change the type of item the library is presenting to the user.
         * @param value A string of the type of item to show - current Applications or Videos
         */
        changeLibraryType(value: string) {
            this.menuType = value;
            this.selectedApplication = "";
            this.selectedVideo = "";
        },

        /**
         * After performing a manifest scan or reset, reload the applications.
         */
        resetApplications() {
            this.applications = new Map<string, Application>(Object.entries(values))
        },

        /**
         * Add a new application to the applications Map. This will have come from an imported source.
         * @param application An application instance that contains the necessary information for a new entry.
         */
        addImportApplication(application: Application) {
            this.applications.set(application.id, application);
        },

        /**
         * Remove an application from the applications Map.
         * @param appName A string representing the name of an application.
         */
        removeImportedApplication(appName: string) {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return; }

            this.applications.delete(key);
        },

        /**
         * Change the current application panel to the supplied one.
         */
        changeApplication(panel: string) {
            this.selectedApplication = panel
        },

        /**
         * Change the current video panel to the supplied one.
         * @param panel
         */
        changeVideo(panel: string) {
            this.selectedVideo = panel;
        },

        /**
         * Update the status of a settings application using its unique ID.
         * @param appID A string representing the unique id of an application.
         * @param key A string of the variable to be updated.
         * @param value A new value for the supplied key.
         */
        updateApplicationByID(appID: string, key: string, value: any) {
            const app = this.applications.get(appID)
            if(app != undefined) {
                app[key] = value
            }
        },

        /**
         * Update the key of an application using its name.
         * @param appName A string representing the name of an application.
         * @param key A string of the variable to be updated.
         * @param value A new value for the supplied key.
         */
        updateApplicationByName(appName: string, key: string, value: any) {
            const appID = this.getKeyFromValue(appName)
            if(appID == undefined) { return; }

            const app = this.applications.get(appID)
            if(app != undefined) {
                app[key] = value
            }
        },

        /**
         * Update the remote config status of a settings application using its name.
         * @param appName A string representing the name of an application.
         * @param remoteConfigStatus A boolean of the new status to be saved.
         */
        updateApplicationRemoteConfigStatusByName(appName: string, remoteConfigStatus: boolean) {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return; }

            const app = this.applications.get(key)
            if(app != undefined) {
                app.remoteConfigStatus = remoteConfigStatus
            }
        },

        /**
         * Update a parameter of an application using its name.
         * @param appName A string representing the name of an application.
         * @param key A string of the variable to be updated.
         * @param value A new value for the supplied key.
         */
        updateApplicationParameterByName(appName: string, key: string, value: any) {
            const appID = this.getKeyFromValue(appName)
            if(appID == undefined) { return; }

            const app = this.applications.get(appID)
            if(app != undefined) {
                app.parameters[key] = value
            }
        },

        /**
         * Check if an application is installed.
         * @param appName A string representing the name of an application.
         */
        checkIfApplicationInstalled(appName: string): boolean {
            const key = this.getKeyFromValue(appName)
            if(key == undefined) { return false; }

            const app = this.applications.get(key)
            if(app != undefined) {
                if(app.status === CONSTANT.MODEL_VALUE.STATUS_INSTALLED
                    || app.status === CONSTANT.MODEL_VALUE.STATUS_RUNNING
                    || app.status === CONSTANT.MODEL_VALUE.STATUS_DOWNLOADING)

                    return true;
            }

            return false;
        },

        /**
         * Get the key of the applications Map from a supplied name.
         * @param val A string that is the name to be searched for.
         */
        getKeyFromValue(val: string): string | undefined {
            return [...this.applications.keys()].find(key => this.applications.get(key)?.name === val)
        },

        /**
         * Get an application entry that is has the supplied name.
         * @param name A string that is the name to be searched for.
         */
        getApplicationByName(name: string): Application | undefined {
            const entries = Object.values(this.applications);
            return entries.find(entry => entry.name === name);
        },

        /**
         * Query the system to see if the currently selected application has a scheduler task associated with it.
         */
        listSchedulerTask(): void {
            // @ts-ignore
            api.ipcRenderer.send(CONSTANT.CHANNEL.HELPER_CHANNEL, {
                channelType: CONSTANT.MESSAGE.APPLICATION_SCHEDULER,
                type: "list",
                name: this.getSelectedApplicationName
            });
        },

        /**
         * Get the host url for the supplied application.
         * @param wrapperType
         * @param applicationName
         */
        async getHostURL(wrapperType: string, applicationName: string): Promise<string | undefined> {
            let modeUrls: ModeUrls|undefined;
            switch (wrapperType) {
                case CONSTANT.APPLICATION_TYPE.APPLICATION_LEADME:
                    if (await this.getCanAccessVultr) {
                        modeUrls = {
                            production: "https://leadme-internal.sgp1.vultrobjects.com/",
                            development: "https://leadme-internal-debug.sgp1.vultrobjects.com/",
                            offline: "http://localhost:8088/",
                            local: "http://localhost:8082"
                        };
                    } else {
                        modeUrls = {
                            production: "https://learninglablauncher.herokuapp.com",
                            development: "https://learninglablauncherdevelopment.herokuapp.com",
                            offline: "http://localhost:8088/",
                            local: "http://localhost:8082"
                        };
                    }
                    break;

                //Currently this is just for the QA Tool
                case CONSTANT.APPLICATION_TYPE.APPLICATION_TOOL:
                    modeUrls = this.determineToolHosting(applicationName);
                    break;

                case CONSTANT.APPLICATION_TYPE.APPLICATION_EMBEDDED:
                    //TODO update for Embedded routes
                    const app = embeddedApplications.apps.find(element => element.name === applicationName)
                    if (app === undefined) {
                        modeUrls = undefined;
                        break;
                    }
                    modeUrls = {
                        production: app.url,
                        development: app.url,
                        offline: "",
                        local: ""
                    };
                    break;

                default:
                    return undefined;
            }

            if (modeUrls === undefined) return undefined;

            return modeUrls[this.mode] || modeUrls.production;
        },

        /**
         * Determine what tool is being downloaded and collect the correct hosting urls.
         * @param applicationName
         */
        determineToolHosting(applicationName: string): any {
            switch (applicationName) {
                case CONSTANT.APPLICATION_TYPE.APPLICATION_NAME_QA_TOOL:
                    return {
                        production: "https://leadme-tools.sgp1.vultrobjects.com/leadme-qa",
                        development: "https://leadme-tools.sgp1.vultrobjects.com/leadme-qa",
                        offline: "http://localhost:8088",
                        local: "http://localhost:8082"
                    };

                case CONSTANT.APPLICATION_TYPE.APPLICATION_NAME_EXPERIENCE_TOOL:
                    return {
                        production: "https://leadme-tools.sgp1.vultrobjects.com/leadme-experiences",
                        development: "https://leadme-tools.sgp1.vultrobjects.com/leadme-experiences",
                        offline: "http://localhost:8088",
                        local: "http://localhost:8082"
                    };

                case CONSTANT.APPLICATION_TYPE.APPLICATION_NAME_NETWORK_TOOL:
                    return {
                        production: "https://leadme-tools.sgp1.vultrobjects.com/leadme-network",
                        development: "https://leadme-tools.sgp1.vultrobjects.com/leadme-network",
                        offline: "http://localhost:8088",
                        local: "http://localhost:8082"
                    }

                default:
                    return undefined;
            }
        },

        /**
         * Get the file extension from the supplied file path
         * @param filePath A string of the full file path
         */
        filterFileExtension(filePath: string) {
            const lastDotIndex = filePath.lastIndexOf('.');
            if (lastDotIndex === -1) {
                return ''; // No extension found
            }
            return filePath.slice(lastDotIndex).toLowerCase().replace(".", "");
        },

        /**
         * Remove the file extension from the name for display purposes.
         * @param name A string of the video name.
         */
        filterVideoName(name: string) {
            return name.replace(".mp4", "");
        },

        /**
         * Get the parent category for a supplied video
         * @param videoPath
         */
        getVideoCategory(videoPath: string) {
            for (let category in this.videos) {
                if (this.videos.hasOwnProperty(category)) {
                    // Use Array.prototype.find to search for the video by path within the category
                    const foundVideo = this.videos[category].find(video => video.path === videoPath);
                    if (foundVideo) {
                        return category; // Return the found video object
                    }
                }
            }

            return "";
        }
    },
    getters: {
        getSelectedVideo(): Video | undefined {
            if(this.selectedVideo === undefined) return undefined;

            for (let category in this.videos) {
                if (this.videos.hasOwnProperty(category)) {
                    // Use Array.prototype.find to search for the video by path within the category
                    const foundVideo = this.videos[category].find(video => video.path === this.selectedVideo);
                    if (foundVideo) {
                        return foundVideo; // Return the found video object
                    }
                }
            }

            return undefined;
        },

        getSelectedVideoName(): string {
            const video = this.getSelectedVideo
            return video !== undefined ? video.name : 'Unselected'
        },

        getSelectedVideoPath(): string {
            const video = this.getSelectedVideo
            return video !== undefined ? video.path : 'Unselected'
        },

        getSelectedApplication(): Application | undefined {
            if(this.selectedApplication === undefined) return undefined;
            return this.applications.get(this.selectedApplication)
        },

        getSelectedApplicationName(): string {
            const app = this.getSelectedApplication
            return app !== undefined ? app.name : 'Unselected'
        },

        getSelectedApplicationStatus(): string {
            const app = this.getSelectedApplication
            return app !== undefined ? app.status : 'Unselected'
        },

        getSetupConfig(): string[] {
            return this.applicationSetup;
        },

        async getCanAccessVultr(): Promise<boolean> {
            if (this.canAccessVultr != null) {
                return Promise.resolve(this.canAccessVultr)
            }
            try {
                const result = await fetch('https://leadme-healthcheck.sgp1.vultrobjects.com/healthcheck',
                    {
                        mode: "no-cors",
                        headers: {
                            "Access-Control-Allow-Origin": "*",
                            "Content-Type": "text/plain"
                        }
                    })
                var value = result.status < 300
                if (!value) {
                    Sentry.captureMessage("Vultr not accessible")
                }
                return Promise.resolve(value)
            } catch (e) {
                Sentry.captureException(e)
                return Promise.resolve(false);
            }
        }
    }
});
