const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

let allFilesInfo = [];
let panel = null;
let defaultIndentation = "";
let useTagTasks = false;
let useTagAuthor = false;

function activate(context) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('featuresAnalyzer');
    const scanDirectory = String(path.join(workspaceFolder, config.get("featuresFolder")));
    defaultIndentation = config.get('defaultIndentation');
    useTagTasks = config.get('useTagTasks');
    useTagAuthor = config.get('useTagAuthor');

    if (!scanDirectory) {
        vscode.window.showInformationMessage("No features directory selected");
        return;
    }

    let commandCreateFeaturesList = vscode.commands.registerCommand("featuresAnalyzer.createFeaturesList", async function () {
        allFilesInfo = [];
        analyzeDirectory(scanDirectory, analyzeFileForFeaturesList);
    });

    let commandCheckIndentation = vscode.commands.registerCommand('featuresAnalyzer.checkIndentation', async function () {
        allFilesInfo = [];
        analyzeDirectory(scanDirectory, analyzeCheckIndentation);
    });

    context.subscriptions.push(commandCreateFeaturesList);
    context.subscriptions.push(commandCheckIndentation);
}

function analyzeDirectory(dir, analyzeFileCallback) {
    console.log(`Analyzing directory: ${dir}`);
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Error reading directory ${dir}:`, err);
            return;
        }

        files.forEach((file) => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error(`Error stating file ${filePath}:`, err);
                    return;
                }

                if (stats.isDirectory()) {
                    analyzeDirectory(filePath, analyzeFileCallback);
                } else if (path.extname(file) === ".feature") {
                    analyzeFileCallback(filePath);
                }
            });
        });
    });
}

function analyzeFileForFeaturesList(filePath) {
    console.log(`Analyzing file: ${filePath}`);
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error(`Error reading file ${filePath}:`, err);
            return;
        }

        console.log(`File read successfully: ${filePath}`);
        const lines = data.split(/\r?\n/);
        const fileInfo = {
            fileName: path.basename(filePath),
            relativePath: vscode.workspace.asRelativePath(filePath),
            functionality: "",
            exportScenarios: "",
            author: "",
            scenarios: [],
            tasks: "",
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const lowerCaseLine = line.toLowerCase();
            
            if (lowerCaseLine.startsWith("функционал:") || lowerCaseLine.startsWith("feature:")) {
                fileInfo.functionality = line.replace(/^(Функционал:|Feature:)/i, '').trim();
            } else if (lowerCaseLine.includes("@exportscenarios")) {
                fileInfo.exportScenarios = 'V';
            } else if (lowerCaseLine.includes("@author")) {
                fileInfo.author = line.replace(/^@author=/i, '').trim();
            } else if (lowerCaseLine.includes("@tasks")) {
                fileInfo.tasks = line.replace(/^@tasks=/i, '').trim();
            } else if (lowerCaseLine.startsWith("сценарий:") || lowerCaseLine.startsWith("scenario:")) {
                fileInfo.scenarios.push(line.replace(/^(Сценарий:|Scenario:)/i, '').trim());
            }
        }

        allFilesInfo.push(fileInfo);
        displayAnalyzeFileForFeaturesList();
    });
}

function displayAnalyzeFileForFeaturesList() {
    console.log(`Displaying info for all files`);

    if (!panel) {
        panel = vscode.window.createWebviewPanel("featuresList", "Features List", vscode.ViewColumn.One, {
            enableScripts: true
        });
        console.log('Webview panel created');

        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openFile':
                try {
                    const filePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, message.filePath);
                    vscode.workspace.openTextDocument(filePath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                } catch (error) {
                    console.error(`Error opening file ${message.filePath}:`, error);
                }
                break;
            }
        });
    }

    const tableRows = allFilesInfo.map(fileInfo => {
        return fileInfo.scenarios.map(scenario => {
            return `
                <tr>
                    <td><a href="#" onclick="openFile('${fileInfo.relativePath.replace(/\\/g, '\\\\')}')">${fileInfo.fileName}</a></td>
                    <td>${fileInfo.relativePath}</td>
                    <td>${fileInfo.functionality}</td>
                    <td class="center">${fileInfo.exportScenarios}</td>
                    <td>${scenario}</td>
                    ${useTagTasks ? `<td>${fileInfo.tasks}</td>` : ""}
                    ${useTagAuthor ? `<td>${fileInfo.author}</td>` : ""}
                </tr>`;
        }).join("");
    }).join("");

    panel.webview.html = `
        <html>
            <head>
                <style>
                    #searchInput {
                        margin-bottom: 10px;
                    }
                    .center {
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h2>Features List</h2>
                <input type="text" id="searchInput" placeholder="Search for features..">
                <table id="featureTable" border="1">
                    <tr>
                        <th>File Name</th>
                        <th>Path</th>
                        <th>Functionality</th>
                        <th>Export</th>
                        <th>Scenario</th>
                        ${useTagTasks ? `<th>Tasks</th>` : ""}
                        ${useTagAuthor ? `<th>Author</th>` : ""}
                    </tr>
                    ${tableRows}
                </table>
                <script>
                    window.onload = function() {
                        console.log('DOM fully loaded and parsed');
                        const input = document.getElementById('searchInput');
                        input.addEventListener('keyup', function() {
                            console.log('Filtering table');
                            const filter = input.value.toLowerCase();
                            const table = document.getElementById('featureTable');
                            const tr = table.getElementsByTagName('tr');

                            for (let i = 1; i < tr.length; i++) {
                                const td = tr[i].getElementsByTagName('td');
                                let showRow = false;
                                for (let j = 0; j < td.length; j++) {
                                    if (td[j]) {
                                        const txtValue = td[j].textContent || td[j].innerText;
                                    if (txtValue.toLowerCase().indexOf(filter) > -1) {
                                        showRow = true;
                                        break;
                                    }
                                }
                            }
                            tr[i].style.display = showRow ? '' : 'none';
                            }
                        });
                    };

                    function openFile(filePath) {
                        console.log('Opening file:', filePath);
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'openFile',
                            filePath: filePath
                        });
                    }
                </script>
            </body>
        </html>
    `;

    console.log(`Panel content set for all files`);
}

function analyzeCheckIndentation(filePath) {
    console.log(`Analyzing file: ${filePath}`);
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error(`Error reading file ${filePath}:`, err);
            return;
        }

        console.log(`File read successfully: ${filePath}`);
        const lines = data.split('\n');
        const fileInfo = {
            fileName: path.basename(filePath),
            relativePath: vscode.workspace.asRelativePath(filePath),
            inconsistentLines: [],
        };

        let hasTagTree = false;
        let hasSpaces = false;
        let hasTabs = false;
        let ckeckSpaces = false;
        let ckeckTabs = false;

        if (defaultIndentation === 'tab') {
            ckeckSpaces = true;
        } else if (defaultIndentation === 'space') {
            ckeckTabs = true;
        }

        lines.forEach((line, index) => {
            const leadingWhitespace = line.match(/^\s*/)[0];
            if (leadingWhitespace.includes(' ')) {
                hasSpaces = true;
            }
            if (leadingWhitespace.includes('\t')) {
                hasTabs = true;
            }
            if (leadingWhitespace.includes(' ') && leadingWhitespace.includes('\t')) {
                fileInfo.inconsistentLines.push(`in line ${index + 1} detected spaces and tabs`);
            }
            const lowerCaseLine = line.toLowerCase();
            if (lowerCaseLine.includes("@tree")) {
                hasTagTree = true;
            }
        });

        if (hasTagTree && hasSpaces && hasTabs) {
            fileInfo.inconsistentLines.push('tag tree detected, in file lines detected spaces and tabs');
        }

        if (ckeckSpaces && hasSpaces) {
            fileInfo.inconsistentLines.push('inconsistent spaces detected in file lines, tabs expected');
        }

        if (ckeckTabs && hasTabs) {
            fileInfo.inconsistentLines.push('inconsistent tabs detected in file lines, spaces expected');
        }

        allFilesInfo.push(fileInfo);
        displayAnalyzeCheckIndentation();
    });
}

function displayAnalyzeCheckIndentation() {
    console.log(`Displaying info for all files`);

    if (!panel) {
        panel = vscode.window.createWebviewPanel("inconsistentFeaturesList", "Inconsistent Features List", vscode.ViewColumn.One, {
            enableScripts: true
        });
        console.log('Webview panel created');

        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openFile':
                try {
                    const filePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, message.filePath);
                    vscode.workspace.openTextDocument(filePath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                } catch (error) {
                    console.error(`Error opening file ${message.filePath}:`, error);
                }
                break;
            }
        });
    }

    const tableRows = allFilesInfo.map(fileInfo => {
        return fileInfo.inconsistentLines.map(inconsistentLine => {
            return `
                <tr>
                    <td><a href="#" onclick="openFile('${fileInfo.relativePath.replace(/\\/g, '\\\\')}')">${fileInfo.fileName}</a></td>
                    <td>${fileInfo.relativePath}</td>
                    <td>${inconsistentLine}</td>
                </tr>`;
        }).join("");
    }).join("");

    panel.webview.html = `
        <html>
            <head>
                <style>
                    #searchInput {
                        margin-bottom: 10px;
                    }
                    .center {
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h2>Inconsistent Features List</h2>
                <input type="text" id="searchInput" placeholder="Search for features..">
                <table id="featureTable" border="1">
                    <tr>
                        <th>File Name</th>
                        <th>Path</th>
                        <th>Line</th>
                    </tr>
                    ${tableRows}
                </table>
                <script>
                    window.onload = function() {
                        console.log('DOM fully loaded and parsed');
                        const input = document.getElementById('searchInput');
                        input.addEventListener('keyup', function() {
                            console.log('Filtering table');
                            const filter = input.value.toLowerCase();
                            const table = document.getElementById('featureTable');
                            const tr = table.getElementsByTagName('tr');

                            for (let i = 1; i < tr.length; i++) {
                                const td = tr[i].getElementsByTagName('td');
                                let showRow = false;
                                for (let j = 0; j < td.length; j++) {
                                    if (td[j]) {
                                        const txtValue = td[j].textContent || td[j].innerText;
                                    if (txtValue.toLowerCase().indexOf(filter) > -1) {
                                        showRow = true;
                                        break;
                                    }
                                }
                            }
                            tr[i].style.display = showRow ? '' : 'none';
                            }
                        });
                    };

                    function openFile(filePath) {
                        console.log('Opening file:', filePath);
                        const vscode = acquireVsCodeApi();
                        vscode.postMessage({
                            command: 'openFile',
                            filePath: filePath
                        });
                    }
                </script>
            </body>
        </html>
    `;

    console.log(`Panel content set for all files`);
}

exports.activate = activate;

function deactivate() {
    if (panel) {
        panel.dispose();
    }
}

module.exports = {
    activate,
    deactivate,
};