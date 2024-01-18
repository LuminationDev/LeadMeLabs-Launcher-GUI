import xml2js from "xml2js";
import fs from "fs";
const parser = require('xml2js').Parser();
const util = require('util');
const execAsync = util.promisify(require('child_process').exec);
import { join } from "path";
import { app } from "electron";
import { exec } from "child_process";

/**
 * Interacting with the windows task scheduler, create, pause or destroy a task that actively monitors that the
 * supplied application is running. The task runs on start up once a user is logged in and when there is an
 * internet connection and then every 5 minutes onwards.
 */
export const taskSchedulerItem = (mainWindow: Electron.BrowserWindow, info: any, appDirectory: string): void => {
    const taskFolder: string = "LeadMe\\Software_Checker";
    let args: string = "";

    //Check the type - list is the only function that does not require Admin privilege
    switch (info.type) {
        case "list":
            listTasks(taskFolder).then((result) => {
                const output = {
                    channelType: 'scheduler_update',
                    type: info.type,
                    ...result
                }

                // Send the output back to the user
                mainWindow.webContents.send('backend_message', output);
            });
            return;

        case "create":
            const outputPath = join(appDirectory, 'Software_Checker.xml');

            //Edit the static XML with the necessary details
            modifyDefaultXML(taskFolder, outputPath)

            //Use the supplied XML to create the command
            args = `SCHTASKS /CREATE /TN ${taskFolder} /XML ${outputPath}`;
            break;

        case "enable":
            args = `SCHTASKS /CHANGE /TN ${taskFolder} /Enable`;
            break;

        case "disable":
            args = `SCHTASKS /CHANGE /TN ${taskFolder} /Disable`;
            break;

        case "delete":
            args = `SCHTASKS /DELETE /TN ${taskFolder}`;
            break;

        default:
            return;
    }

    exec(`Start-Process cmd -Verb RunAs -ArgumentList '@cmd /k ${args}'`, {'shell':'powershell.exe'}, (err, stdout)=> {
        if (err) {
            console.log(err);
        }

        mainWindow.webContents.send('backend_message', {
            channelType: 'scheduler_update',
            message: stdout,
            type: info.type,
            target: null
        });
    });
}

/**
 * Asynchronously retrieves information about a scheduled task, including its XML definition
 * and a parsed target command from the associated XML.
 * @param taskFolder - The name of the scheduled task folder.
 * @returns {Promise<{ message: string, target: string }>} An object containing the list output message
 * and the parsed target command from the task's XML.
 */
const listTasks = async (taskFolder: string): Promise<any> => {
    try {
        // Get XML information
        const { stdout: xmlOutput } = await execAsync(`SCHTASKS /QUERY /TN ${taskFolder} /XML`);
        const commandTarget = await parseTaskXmlPromise(xmlOutput);

        // Get LIST information
        const { stdout: listOutput } = await execAsync(`SCHTASKS /QUERY /TN ${taskFolder} /fo LIST`);

        return {
            message: listOutput,
            target: commandTarget,
            current: join(app.getAppPath(), "..", "..") //This will get the parent folder of the LeadMe.exe
        }
    } catch (err) {
        console.error(err);
        return {
            message: "",
            target: null,
            current: null
        }
    }
}


/**
 * Asynchronously parses the XML output of a scheduled task and resolves with the extracted target command.
 * @param xmlOutput - The XML output of a scheduled task.
 * @returns {Promise<string>} A Promise that resolves with the parsed target command.
 */
const parseTaskXmlPromise = async (xmlOutput: string): Promise<string> => {
    return new Promise((resolve) => {
        parseTaskXml(xmlOutput, (action: string) => {
            resolve(action);
        });
    });
}

/**
 * Parses the XML output of a scheduled task and invokes a callback with the extracted information about actions.
 * @param xmlString - The XML output of a scheduled task.
 * @param callback - A callback function that receives the extracted information about actions.
 */
const parseTaskXml = (xmlString: string, callback: any) => {
    //@ts-ignore
    parser.parseString(xmlString, (err: string, result: string) => {
        if (err) {
            console.error(err);
            return;
        }

        // Extract information about actions from the parsed XML
        callback(extractAction(result));
    });
}

/**
 * Extract the target for the start a program action contained within the scheduler task.
 * @param parsedData A parsed XML data object.
 */
const extractAction = (parsedData: any) => {
    // Check if the necessary elements exist in the parsed data
    if (parsedData?.Task?.Actions?.length > 0) {
        //Target path for start a program action
        return parsedData.Task['Actions'][0]['Exec'][0]['Command'][0]

    } else {
        return null;
    }
}

/**
 * Modify the default software checker xml with the details necessary for either the NUC or Station software. As an
 * XML we can set far more than a command line interface and add different triggers and conditions.
 */
const modifyDefaultXML = (taskFolder: string, outputPath: string): void => {
    const exePath = join(__dirname, '../../../../..', '_batch/LeadMeLabs-SoftwareChecker.exe');

    const filePath = join(app.getAppPath(), 'static', 'template.xml');
    const data = fs.readFileSync(filePath, "utf16le")

    // we then pass the data to our method here
    xml2js.parseString(data, function(err: string, result: any) {
        if (err) console.log("FILE ERROR: " + err);

        let json = result;

        //Edit the following variables for the newly created task
        //Date - get the current date, remove the milliseconds and the zulu marker 'Z'
        json.Task.RegistrationInfo[0].Date = new Date().toISOString().slice(0,-5);

        //URI
        json.Task.RegistrationInfo[0].URI = taskFolder;

        //Main Action
        json.Task.Actions[0].Exec[0].Command = exePath;

        //Write the changes to the new temporary file
        //Create a new builder object and then convert the json back to xml.
        const builder = new xml2js.Builder({'xmldec': {'encoding': 'UTF-16'}});
        const xml = builder.buildObject(json);

        fs.writeFile(outputPath, xml, (err) => {
            if (err) console.log(err);

            console.log("Successfully written update xml to file");
        });
    });
}
