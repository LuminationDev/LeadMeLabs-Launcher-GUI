import fs from "fs";
import path from "path";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { app } from "electron";
import { VideoCollection } from "../interfaces/video";

//Set the media queries
const ffprobePath = require('ffprobe-static').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export default class VideoController {
    ipcMain: Electron.IpcMain;
    mainWindow: Electron.BrowserWindow;
    videoDirectory: string;
    validDirs: string[] = ['VR', 'Regular', 'Backdrops']; // Only process specific first-level subdirectories

    constructor(ipcMain: Electron.IpcMain, mainWindow: Electron.BrowserWindow) {
        this.ipcMain = ipcMain;
        this.mainWindow = mainWindow;
        this.videoDirectory = app.getPath('videos');
    }

    /**
     * Using the local videos folder, collect the information about the videos inside the VR, Regular and Backdrops
     * folder before sending the results to the frontend.
     */
    async collectVideos() {
        const videos: VideoCollection = await this.getFilesInfo(this.videoDirectory);
        this.mainWindow.webContents.send('backend_message', {
            channelType: "videos_installed",
            videos
        });
    }

    /**
     * Asynchronously imports a video file into the user's video directory based on the provided information.
     * Creates the subdirectory if it doesn't exist and moves the file into it.
     * @param info An object containing video import information, including video type and path.
     */
    async moveVideo(info: any) {
        let directoryPath: string = this.videoDirectory;
        directoryPath = path.join(directoryPath, info.videoType);

        if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
            console.log(`Directory '${directoryPath}' created successfully.`);
        } else {
            console.log(`Directory '${directoryPath}' already exists.`);
        }

        // Extract the filename from the filePath and create the new path
        const fileName: string = path.basename(info.videoPath);
        const newFilePath: string = path.join(directoryPath, fileName);

        await this.moveFile(info.videoPath, newFilePath);
    }

    /**
     * Move a file into a new folder.
     * @param currentPath A string of the current path of the file.
     * @param newFilePath A string of the new path.
     */
    async moveFile(currentPath: string, newFilePath: string) {
        fs.rename(currentPath, newFilePath, (err) => {
            let success: boolean;
            if (err) {
                success = false;
                console.error('Error moving file:', err);
            } else {
                success = true;
                console.log('File moved successfully');
            }

            this.mainWindow.webContents.send('backend_message', {
                channelType: "video_imported",
                success
            });

            if (success) {
                this.collectVideos();
            }
        });
    }

    /**
     * Delete an imported video
     * @param info An object containing the path to delete from.
     */
    async deleteVideo(info: any) {
        fs.unlink(info.path, (err) => {
            if (err) {
                console.error(`Error deleting file ${info.path}: ${err.message}`);
                return;
            }
            console.log(`File ${info.path} has been deleted successfully`);
            this.collectVideos();
        });
    }

    /**
     * Retrieves the duration of an MP4 file in seconds.
     *
     * This function uses `ffmpeg.ffprobe` to analyze the specified MP4 file and extract its duration.
     * The duration is returned as a number representing the total duration in seconds.
     *
     * @param filePath - The path to the MP4 file.
     * @returns Promise<number> - A promise that resolves to the duration of the file in seconds.
     */
    getFileDuration(filePath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
                if (err) {
                    return reject(err);
                }
                const duration = metadata.format.duration;
                resolve(duration);
            });
        });
    }

    /**
     * Formats a duration given in seconds into a string in the format HH:MM:SS.
     *
     * This function takes a number representing the duration in seconds and converts it into
     * a human-readable string in the format of hours, minutes, and seconds, each padded to
     * ensure two digits.
     *
     * @param seconds - The duration in seconds to format.
     * @returns string - The formatted duration string in HH:MM:SS format.
     */
    formatDuration(seconds: number) {
        const hours: number = Math.floor(seconds / 3600);
        const minutes: number = Math.floor((seconds % 3600) / 60);
        const secs: number = Math.floor(seconds % 60);

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }

    /**
     * Asynchronously retrieves information about MP4 files from specific first-level subdirectories.
     *
     * This function scans the specified directory, skipping any files directly in the root directory
     * and only processing the first-level subdirectories named 'VR', 'Regular', or 'Backdrops'.
     * It collects the name, file path, and duration of each MP4 file in these subdirectories.
     * The results are organized into an object where each key is the name of a valid subdirectory,
     * and the value is an array of video file information within that subdirectory.
     *
     * @param directory - The path to the root directory to scan.
     * @returns Promise<Object> - A promise that resolves to an object containing the video file information
     *                              grouped by first-level subdirectories.
     */
    async getFilesInfo(directory: string) {
        const results: VideoCollection = {};
        const list: string[] = fs.readdirSync(directory);

        for (let file of list) {
            const filePath: string = path.resolve(directory, file);
            const stat: fs.Stats = fs.statSync(filePath);

            if (stat && stat.isDirectory() && this.validDirs.includes(path.basename(filePath))) {
                // If it's a directory, create a key for it and walk through its contents
                const subDirList: string[] = fs.readdirSync(filePath);
                results[file] = [];

                for (let subFile of subDirList) {
                    const subFilePath: string = path.resolve(filePath, subFile);
                    const subFileStat: fs.Stats = fs.statSync(subFilePath);

                    if (subFileStat && !subFileStat.isDirectory() && path.extname(subFilePath).toLowerCase() === '.mp4') {
                        const durationInSeconds: number = await this.getFileDuration(subFilePath);
                        const durationFormatted: string = this.formatDuration(durationInSeconds);
                        results[file].push({
                            name: path.basename(subFilePath),
                            path: subFilePath,
                            duration: durationFormatted
                        });
                    }
                }

                // Remove the key if no MP4 files were found
                if (results[file].length === 0) {
                    delete results[file];
                }
            }
        }

        return results;
    }
}
