const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

let allFilesInfo = [];
let panel = null;

function activate(context) {
    let disposable = vscode.commands.registerCommand("featuresAnalyzer.createFeaturesList", async function () {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const scanDirectory = vscode.workspace.getConfiguration('featuresAnalyzer', vscode.Uri.file(workspaceFolder)).get("featuresFolder");
        
        if (scanDirectory) {
            allFilesInfo = [];
            analyzeDirectory(scanDirectory);
        } else {
            vscode.window.showInformationMessage("No features directory selected");
        }
    });

    context.subscriptions.push(disposable);
}

function analyzeDirectory(dir) {
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
                    analyzeDirectory(filePath);
                } else if (path.extname(file) === ".feature") {
                    analyzeFile(filePath);
                }
            });
        });
    });
}

function analyzeFile(filePath) {
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
            } else if (lowerCaseLine.startsWith("сценарий:") || lowerCaseLine.startsWith("scenario:")) {
                fileInfo.scenarios.push(line.replace(/^(Сценарий:|Scenario:)/i, '').trim());
            }
        }

        allFilesInfo.push(fileInfo);
        displayAllFilesInfo();
    });
}

function displayAllFilesInfo() {
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
                    <td>${fileInfo.author}</td>
                    <td>${scenario}</td>
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
                        <th>Author</th>
                        <th>Scenario</th>
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