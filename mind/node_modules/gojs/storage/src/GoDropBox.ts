    /*
* Copyright (C) 1998-2018 by Northwoods Software Corporation
* All Rights Reserved.
*
* Go DropBox
*/

import * as go from "../../release/go";
import * as gcs from "./GoCloudStorage";
import {Promise} from "es6-promise";

/**
 * <p>Class for saving / loading GoJS <a href="https://gojs.net/latest/api/symbols/Diagram.html">Diagram</a> <a href="https://gojs.net/latest/api/symbols/Model.html">models</a>
 * to / from Dropbox. As with all {@link GoCloudStorage} subclasses (with the exception of {@link GoLocalStorage}, any page using GoDropBox must be served on a web server.</p>
 * <p><b>Note</b>: Any page using GoDropBox must include a script tag with a reference to the <a href="https://cdnjs.com/libraries/dropbox.js/">Dropbox JS SDK</a>.</p>
 * @category Storage
 */
export class GoDropBox extends gcs.GoCloudStorage {

    private _dropbox: any;
    private _menuPath: string;
    /**
     * The number of files to display in {@link ui} before loading more
     */
    private static _MIN_FILES_IN_UI = 100;

    /**
     * @constructor
     * @param {go.Diagram|go.Diagram[]} managedDiagrams An array of GoJS <a href="https://gojs.net/latest/api/symbols/Diagram.html">Diagrams</a> whose model(s) will be saved to
     * / loaded from Dropbox. Can also be a single Diagram.
     * @param {string} clientId The client ID of the application in use (given in Dropbox Developer's Console)
     * @param {string} defaultModel String representation of the default model data for new diagrams. If this is null,
     * default new diagrams will be empty. Usually a value given by calling <a href="https://gojs.net/latest/api/symbols/Model.html#toJson">.toJson()</a>
     * on a GoJS Diagram's Model.
     * @param {string} iconsRelativeDirectory The directory path relative to the page in which this instance of GoDropBox exists, in which
     * the storage service brand icons can be found. The default value is "../goCloudStorageIcons/".
     */
    constructor(managedDiagrams: go.Diagram|go.Diagram[], clientId: string, defaultModel?: string, iconsRelativeDirectory?: string) {
        super(managedDiagrams, defaultModel, clientId);
        if (window['Dropbox']) {
            let Dropbox = window['Dropbox'];
            this._dropbox = new Dropbox({clientId: clientId});
        }
        this.menuPath = "";
        this.ui.id = "goDropBoxCustomFilepicker";
        this._serviceName = "Dropbox";
    }

    /**
     * Get the <a href="https://github.com/dropbox/dropbox-sdk-js">Dropbox client</a> instance associated with this instance of GoDropBox
     * (via {@link clientId}). Set during {@link authorize}.
     * @function.
     * @return {any}
     */
    get dropbox(): any { return this._dropbox }

    /**
     * Get / set currently open Dropnpx path in custom filepicker {@link ui}. Default value is the empty string, which corresponds to the
     * currently signed in user's Drobox account's root path. Set when a user clicks on a folder in the custom ui menu by invoking anchor onclick values.
     * These onclick values are set when the Dropbox directory at the current menuPath is displayed with {@link showUI}.
     * @function.
     * @return {string}
     */
    get menuPath(): string { return this._menuPath }
    set menuPath(value: string) { this._menuPath = value }

    /**
     * Check if there is a signed in Dropbox user who has authorized the application linked to this instance of GoDropBox (via {@link clientId}).
     * If not, prompt user to sign in / authenticate their Dropbox account.
     * @param {boolean} refreshToken Whether to get a new acess token (triggers a page redirect) (true) or try to find / use the
     * one in the browser window URI (no redirect) (false)
     * @return {Promise<boolean>} Returns a Promise that resolves with a boolean stating whether authorization was succesful (true) or failed (false)
     */
    public authorize(refreshToken: boolean = false) {
        const storage = this;
        return new Promise(function (resolve: Function, reject: Function){
            // First, check if we're explicitly being told to refresh token (redirect to login screen)
            if (refreshToken) {
                let authUrl: string = storage.dropbox.getAuthenticationUrl(window.location.href);
                window.location.href = authUrl;
                resolve(false);
            } else if (!storage.dropbox.getAccessToken()) {
                // if no redirect, check if there's an db_id and access_token in the current uri
                if (window.location.hash.indexOf("access_token") !== -1 && window.location.hash.indexOf('id=dbid') !== -1) {
                    let accessToken: string = window.location.hash.substring(window.location.hash.indexOf('=') + 1, window.location.hash.indexOf('&'));
                    storage.dropbox.setAccessToken(accessToken);
                    resolve(true);
                } else {
                    // if not, redirect to get an access_token from Dropbox login screen
                    let authUrl: string = storage.dropbox.getAuthenticationUrl(window.location.href);
                    window.location.href = authUrl;
                    resolve(false);
                }
            }
            resolve(true);
        });
    }

    /**
     * Get information about the currently logged in Dropbox user. Some fields of particular note include:
     * <ul>
     *  <li>country</li>
     *  <li>email</li>
     *  <li>account_id</li>
     *  <li>name</li>
     *  <ul>
     *      <li>abbreivated_name</li>
     *      <li>display_name</li>
     *      <li>given_name</li>
     *      <li>surname</li>
     *  </ul>
     * </ul>
     * @return {Promise} Returns a Promise that resolves with information about the currently logged in Dropbox user
     */
    public getUserInfo() {
        const storage = this;
        return new Promise(function (resolve, reject) {
            // Case: No access token in URI
            if (!storage.dropbox.getAccessToken() && window.location.hash.indexOf("access_token") == -1) {
                storage.authorize(true);
            }
            // Case: Access token in URI, but not assigned to storage.dropbox.access_token
            else if (!storage.dropbox.getAccessToken() && window.location.hash.indexOf("access_token") == 1) {
                storage.authorize(false);
            }
            storage.dropbox.usersGetCurrentAccount(null).then(function (userData) {
                resolve(userData);
            }).catch(function (e) {
                // Case: storage.dropbox.access_token has expired or become malformed; get another access token
                if (e.status == 400) {
                    storage.authorize(true);
                }
            });
        });
    }

    /**
     * Display the custom GoDropBox filepicker {@link ui}.
     * @param {string} action Clarify what action is being done after file selection. Acceptable values:
     * <ul>
     *  <li>Save</li>
     *  <li>Delete</li>
     *  <li>Load</li>
     * </ul>
     * @param {string} path The path in DropBox to look to for files and folders. The empty string directs to a Dropbox user's root
     * directory. Path syntax is <code>/{path}/{to}/{folder}/</code>; i.e. <code>/Public/</code>
     * @param {string} numAdditionalFiles Number of files to show in UI, in addition to a static property that can only be modified by changing source code.
     * This prevents long wait times while the UI loads if there are a large number of diagram files stored in Dropbox.
     * @return {Promise} Returns a Promise which resolves (in {@link save}, {@link load}, or {@link remove}, after action is handled with a
     * {@link DiagramFile} representing the saved/loaded/deleted file
     */
    public showUI(action: string, path?: string, numAdditionalFiles?: number) {
        const storage = this;
        const ui = storage.ui;
        if (!path) path = "";
        if (!numAdditionalFiles) numAdditionalFiles = 0;

        if (!storage.dropbox.getAccessToken()) {
            storage.authorize(true);
        }
        storage.dropbox.usersGetCurrentAccount(null).then(function (userData) {
            if (userData) {
                ui.innerHTML = "<img class='icons' src='" + storage.iconsRelativeDirectory + "dropBox.png'></img>";
                let title: string = action + " Diagram File";
                ui.innerHTML += "<strong>" + title + "</strong><hr></hr>";

                document.getElementsByTagName('body')[0].appendChild(ui);
                ui.style.visibility = 'visible';
                let filesDiv: HTMLElement = document.createElement('div');
                filesDiv.id = 'fileOptions';

                // get all files / folders in the directory specified by 'path'
                storage.dropbox.filesListFolder({ path: path }).then(function (resp) {
                    let files: Object[] = resp.entries;
                    let path: string = files[0]['path_lower'].split("/");
                    let parentDirectory: string; let currentDirectory: string;
                    if (path.length > 2) {
                        for (let i = 0; i < path.length - 1; i++) {
                            if (i === 0) {
                                parentDirectory = '';
                                currentDirectory = '';
                            }
                            else if (i < path.length - 2) {
                                parentDirectory += "/" + path[i];
                                currentDirectory += "/" + path[i];
                            } else currentDirectory += "/" + path[i];
                        }
                    }
                    storage.menuPath = (currentDirectory === undefined) ? '' : currentDirectory;
                    let currentDirectoryDisplay: string = (currentDirectory === undefined) ? "Root" : currentDirectory;
                    if (!document.getElementById('currentDirectory')) ui.innerHTML += "<span id='currentDirectory'>Current Directory: " + currentDirectoryDisplay + "</span>";

                    let numFilesToDisplay: number = GoDropBox._MIN_FILES_IN_UI + numAdditionalFiles;
                    let numFilesChecked: number = 0;
                    let numFilesDisplayed: number = 0;
                    let numFoldersDisplayed: number = 0;
                    let hasDisplayedAllElements: boolean = false;
                    for (let i = 0; i < files.length; i++) {
                        let file: Object = files[i];
                        // display all folders in this directory
                        if (file[".tag"] == "folder") {
                            numFoldersDisplayed++;
                            if (numFilesChecked + numFoldersDisplayed >= files.length) hasDisplayedAllElements = true;
                            let folderOption = document.createElement('div');
                            folderOption.className = 'folderOption';
                            let folder = document.createElement('a');
                            folder.href = "#";
                            folder.textContent = file['name'];
                            folder.id = file['id'];
                            folder.onclick = function () {
                                storage.showUI(action, file['path_lower'], 0);
                            }
                            folderOption.appendChild(folder);
                            filesDiv.appendChild(folderOption);
                        }
                        // limit how many files to display
                        else if (numFilesDisplayed < numFilesToDisplay) {
                            numFilesChecked++;
                            if (numFilesChecked + numFoldersDisplayed >= files.length) hasDisplayedAllElements = true;
                            if (file['name'].indexOf(".diagram") !== -1) {
                                numFilesDisplayed++;
                                if (action !== "Save" ) {
                                    let fileOption = document.createElement('div');
                                    fileOption.className = 'fileOption';
                                    let fileRadio = document.createElement('input');
                                    fileRadio.id = file['id'];
                                    fileRadio.type = 'radio';
                                    fileRadio.name = 'dropBoxFile';
                                    fileRadio.setAttribute('data', file['path_lower']);
                                    let fileLabel: HTMLLabelElement = document.createElement('label');
                                    fileLabel.id = file['id'] + '-label';
                                    fileLabel.textContent = file['name'];
                                    fileOption.appendChild(fileRadio);
                                    fileOption.appendChild(fileLabel);
                                    filesDiv.appendChild(fileOption);
                                } else {
                                    // no need to make diagram files selectable during save as actions
                                    let fileOption = document.createElement('div');
                                    fileOption.className = 'fileOption';
                                    let fileLabel: HTMLLabelElement = document.createElement('label');
                                    fileLabel.id = file['id'] + '-label';
                                    fileLabel.textContent = file['name'];
                                    fileOption.appendChild(fileLabel);
                                    filesDiv.appendChild(fileOption);
                                }
                            }
                        }
                    }

                    // If there may be more diagram files to show, say so and provide user with option to try loading more in the UI
                    if (!hasDisplayedAllElements) {
                        let num: number = numAdditionalFiles + 50;
                        filesDiv.innerHTML += "<p>Observed " + (GoDropBox._MIN_FILES_IN_UI + numAdditionalFiles) + " files. There may be more diagram files not shown. " +
                            "<a id='dropBoxLoadMoreFiles'>Click here</a> to search for more.</p>";
                        document.getElementById('dropBoxLoadMoreFiles').onclick = function () {
                            storage.showUI(action, storage.menuPath, num);
                        }
                    }

                    // include a link to return to the parent directory
                    if (parentDirectory !== undefined) {
                        let parentDirectoryDisplay: string;
                        if (!parentDirectory) parentDirectoryDisplay = "root";
                        else parentDirectoryDisplay = parentDirectory;

                        let parentDiv: HTMLDivElement = document.createElement('div');
                        let parentAnchor: HTMLAnchorElement = document.createElement('a');
                        parentAnchor.id = 'dropBoxReturnToParentDir';
                        parentAnchor.text = "Back to " + parentDirectoryDisplay;
                        parentAnchor.onclick = function () {
                            storage.showUI(action, parentDirectory, 0);
                        }

                        parentDiv.appendChild(parentAnchor);
                        filesDiv.appendChild(parentDiv);
                    }
                    if (!document.getElementById(filesDiv.id)) ui.appendChild(filesDiv);

                    // italicize currently open file, if a file is currently open
                    if (storage.currentDiagramFile.id) {
                        var currentFileElement = document.getElementById(storage.currentDiagramFile.id + '-label');
                        if (currentFileElement) {
                            currentFileElement.style.fontStyle = "italic";
                        }
                    }

                    // user input div (only for save)
                    if (action === 'Save' && !document.getElementById('userInputDiv')) {
                        let userInputDiv: HTMLElement = document.createElement('div');
                        userInputDiv.id = 'userInputDiv';
                        userInputDiv.innerHTML = '<span>Save Diagram As </span><input id="userInput" placeholder="Enter filename"></input>';
                        ui.appendChild(userInputDiv);
                    }

                    // user data div
                    if (!document.getElementById('userDataDiv')) {
                        let userDataDiv: HTMLElement = document.createElement('div');
                        userDataDiv.id = 'userDataDiv';
                        let userDataSpan: HTMLSpanElement = document.createElement('span');
                        userDataSpan.textContent = userData.name.display_name + ', ' + userData.email;
                        userDataDiv.appendChild(userDataSpan);
                        let changeAccountAnchor: HTMLAnchorElement = document.createElement('a');
                        changeAccountAnchor.href = "#";
                        changeAccountAnchor.id = "dropBoxChangeAccount";
                        changeAccountAnchor.textContent = "Change Account";
                        changeAccountAnchor.onclick = function () {
                            storage.authorize(true); // from the authorization page, a user can sign in under a different DropBox account
                        }
                        userDataDiv.appendChild(changeAccountAnchor);
                        ui.appendChild(userDataDiv);
                    }

                    if (!document.getElementById('submitDiv') && !document.getElementById('cancelDiv')) {
                        // buttons
                        let submitDiv: HTMLElement = document.createElement('div');
                        submitDiv.id = "submitDiv";
                        let actionButton = document.createElement('button');
                        actionButton.id = 'actionButton';
                        actionButton.textContent = action;
                        actionButton.onclick = function () {
                            storage.processUIResult(action);
                        }
                        submitDiv.appendChild(actionButton);

                        ui.appendChild(submitDiv);
                        let cancelDiv: HTMLElement = document.createElement('div');
                        cancelDiv.id = 'cancelDiv';
                        let cancelButton = document.createElement('button');
                        cancelButton.textContent = "Cancel";
                        cancelButton.id = 'cancelButton';
                        cancelButton.onclick = function () {
                            storage.hideUI(true);
                        }
                        cancelDiv.appendChild(cancelButton);
                        ui.appendChild(cancelDiv);
                    }
                });
            }
        }).catch(function (e) {
            // Bad request: Access token is either expired or malformed. Get another one.
            if (e.status == 400) {
                storage.authorize(true);
            }
        });
        return storage._deferredPromise.promise; // will not resolve until action (save, load, delete) completes
    }

    /**
     * Hide the custom GoDropBox filepicker {@link ui}; nullify {@link menuPath}.
     * @param {boolean} isActionCanceled If action (Save, Delete, Load) is cancelled, resolve the Promise returned in {@link showUI} with a 'Canceled' notification.
     */
    public hideUI(isActionCanceled?: boolean) {
        const storage = this;
        storage.menuPath = "";
        super.hideUI(isActionCanceled);
    }

    /**
     * @private
     * @hidden
     * Process the result of pressing the action (Save, Delete, Load) button on the custom GoDropBox filepicker {@link ui}.
     * @param {string} action The action that must be done. Acceptable values:
     * <ul>
     *  <li>Save</li>
     *  <li>Delete</li>
     *  <li>Load</li>
     * </ul>
     */
    public processUIResult(action: string) {
        const storage = this;
        /**
         * Get the selected file (in menu's) Dropbox filepath
         * @return {string} The selected file's Dropbox filepath
         */
        function getSelectedFilepath() {
            const radios = document.getElementsByName('dropBoxFile');
            let selectedFile = null;
            for (let i = 0; i < radios.length; i++) {
                if ((<HTMLInputElement>radios[i]).checked) {
                    selectedFile = radios[i].getAttribute("data");
                }
            }
            return selectedFile;
        }

        let filePath: string = getSelectedFilepath();
        switch (action) {
            case 'Save': {
                if (storage.menuPath || storage.menuPath === '') {
                    let name: string = (<HTMLInputElement>document.getElementById('userInput')).value;
                    if (name) {
                        if (name.indexOf('.diagram') === -1) name += '.diagram';
                        storage.save(storage.menuPath + '/' + name);
                    } else {
                        // handle bad save name
                        console.log('Proposed file name is not valid'); // placeholder handler
                    }
                }
                break;
            }
            case 'Load': {
                storage.load(filePath);
                break;
            }
            case 'Delete': {
                storage.remove(filePath);
                break;
            }
        }
        storage.hideUI();
    }

    /**
     * Check whether a file exists in user's Dropbox at a given path.
     * @param {string} path A valid Dropbox filepath. Path syntax is <code>/{path-to-file}/{filename}</code>; i.e. <code>/Public/example.diagram</code>.
     * @return {Promise} Returns a Promise that resolves with a boolean stating whether a file exists in user's Dropbox at a given path
     */
    public checkFileExists(path: string) {
        const storage = this;
        if (path.indexOf('.diagram') === -1) path += '.diagram';
        return new Promise(function(resolve: Function, reject: Function){
            storage.dropbox.filesGetMetadata({ path: path }).then(function (resp) {
                if (resp) resolve(true);
            }).catch(function (err) {
                resolve(false);
            });
        });
    }

    /**
     * Get the Dropbox file reference object at a given path. Properties of particular note include:
     * <ul>
     *  <li>name: The name of the file in DropBox</li>
     *  <li>id: The DropBox-given file ID<li>
     *  <li>path_diplay: A lower-case version of the path this file is stored at in DropBox</li>
     *  <li>.tag: A tag denoting the type of this file. Common values are "file" and "folder". </li>
     * <ul>
     * <b>Note:</b> The first three elements in the above list are requisite for creating valid {@link DiagramFile}s.
     * @param {string} path A valid Dropbox filepath. Path syntax is <code>/{path-to-file}/{filename}</code>; i.e. <code>/Public/example.diagram</code>.
     * @return {Promise} Returns a Promise that resolves with a Dropbox file reference object at a given path
     */
    public getFile(path: string) {
        const storage = this;
        if (path.indexOf('.diagram') === -1) path += '.diagram';
        return storage.dropbox.filesGetMetadata({ path: path }).then(function (resp) {
            if (resp) return resp;
        }).catch(function (err) {
            return null;
        });
    }

    /**
     * Save the current {@link managedDiagrams} model data to Dropbox with the filepicker {@link ui}. Returns a Promise that resolves with a
     * {@link DiagramFile} representing the saved file.
     * @return {Promise}
     */
    public saveWithUI() {
        const storage = this;
        return new Promise(function (resolve: Function, reject: Function) {
            resolve(storage.showUI('Save', ''));
        });
    }

    /**
     * Save {@link managedDiagrams}' model data to Dropbox. If path is supplied save to that path. If no path is supplied but {@link currentDiagramFile} has non-null,
     * valid properties, update saved diagram file content at the path in Dropbox corresponding to currentDiagramFile.path with current managedDiagrams' model data.
     * If no path is supplied and currentDiagramFile is null or has null properties, this calls {@link saveWithUI}.
     * @param {string} path A valid Dropbox filepath to save current diagram model to. Path syntax is <code>/{path-to-file}/{filename}</code>;
     * i.e. <code>/Public/example.diagram</code>.
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the saved file.
     */
    public save(path?: string) {
        const storage = this;
        return new Promise(function (resolve, reject) {
            if (path) { // save as
                storage.dropbox.filesUpload({
                    contents: storage.makeSaveFile(),
                    path: path,
                    autorename: true, // instead of overwriting, save to a different name (i.e. test.diagram -> test(1).diagram)
                    mode: {'.tag': 'add'},
                    mute: false
                }).then(function (resp) {
                    let savedFile: gcs.DiagramFile = { name: resp.name, id: resp.id, path: resp.path_lower };
                    storage.currentDiagramFile = savedFile;

                    resolve(savedFile); // used if saveDiagramAs was called without UI

                    // if saveAs has been called in processUIResult, need to resolve / reset the Deferred Promise instance variable
                    storage._deferredPromise.promise.resolve(savedFile);
                    storage._deferredPromise.promise = storage.makeDeferredPromise();

                }).catch(function(e){
                    // Bad request: Access token is either expired or malformed. Get another one.
                    if (e.status == 400) {
                        storage.authorize(true);
                    }
                });
            } else if (storage.currentDiagramFile.path) { // save
                path = storage.currentDiagramFile.path;
                storage.dropbox.filesUpload({
                    contents: storage.makeSaveFile(),
                    path: path,
                    autorename: false,
                    mode: {'.tag': 'overwrite'},
                    mute: true
                }).then(function (resp) {
                    let savedFile: Object = { name: resp.name, id: resp.id, path: resp.path_lower };
                    resolve(savedFile);
                }).catch(function(e){
                    // Bad request: Access token is either expired or malformed. Get another one.
                    if (e.status == 400) {
                        storage.authorize(true);
                    }
                });
            } else {
                resolve(storage.saveWithUI());
                //throw Error("Cannot save file to Dropbox with path " + path);
            }
        });
    }

    /**
     * Load the contents of a saved diagram from Dropbox using the custom filepicker {@link ui}.
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the loaded file.
     */
    public loadWithUI() {
        const storage = this;
        return new Promise(function (resolve, reject) {
            resolve(storage.showUI('Load', ''));
        });
    }

    /**
     * Load the contents of a saved diagram from Dropbox.
     * @param {string} path A valid Dropbox filepath to load diagram model data from. Path syntax is <code>/{path-to-file}/{filename}</code>;
     * i.e. <code>/Public/example.diagram</code>.
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the loaded file
     */
    public load(path: string) {
        const storage = this;
        return new Promise(function (resolve, reject) {
            if (path) {
                storage.dropbox.filesGetTemporaryLink({ path: path }).then(function (resp) {
                    let link: string = resp.link;
                    storage.currentDiagramFile.name = resp.metadata.name;
                    storage.currentDiagramFile.id = resp.metadata.id;
                    storage.currentDiagramFile.path = path;
                    let xhr: XMLHttpRequest = new XMLHttpRequest();
                    xhr.open('GET', link, true);
                    xhr.setRequestHeader('Authorization', 'Bearer ' + storage.dropbox.getAccessToken());
                    xhr.onload = function () {
                        if (xhr.readyState == 4 && (xhr.status == 200)) {
                            storage.loadFromFileContents(xhr.response);

                            let loadedFile: gcs.DiagramFile = { name: resp.metadata.name, id: resp.metadata.id, path: resp.metadata.path_lower };
                            resolve(loadedFile); // used if loadDiagram was called without UI

                            // if loadDiagram has been called in processUIResult, need to resolve / reset the Deferred Promise instance variable
                            storage._deferredPromise.promise.resolve(loadedFile);
                            storage._deferredPromise.promise = storage.makeDeferredPromise();
                        } else {
                            throw Error("Cannot load file from Dropbox with path " + path); // failed to load
                        }
                    } // end xhr onload
                    xhr.send();
                }).catch(function(e){
                    // Bad request: Access token is either expired or malformed. Get another one.
                    if (e.status == 400) {
                        storage.authorize(true);
                    }
                });
            } else throw Error("Cannot load file from Dropbox with path " + path);
        });
    }

    /**
     * Delete a chosen diagram file from Dropbox using the custom filepicker {@link ui}.
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the deleted file.
     */
    public removeWithUI() {
        const storage = this;
        return new Promise(function (resolve, reject) {
            resolve(storage.showUI('Delete', ''));
        });
    }

    /**
     * Delete a given diagram file from Dropbox.
     * @param {string} path A valid Dropbox filepath to delete diagram model data from. Path syntax is
     * <code>/{path-to-file}/{filename}</code>; i.e. <code>/Public/example.diagram</code>.
     * @return {Promise} Returns a Promise that resolves with a {@link DiagramFile} representing the deleted file.
     */
    public remove(path: string) {
        const storage = this;
        return new Promise(function (resolve, reject) {
            if (path) {
                storage.dropbox.filesDelete({ path: path }).then(function (resp) {
                    if (storage.currentDiagramFile && storage.currentDiagramFile['id'] === resp['id']) storage.currentDiagramFile = { name: null, path: null, id: null };
                    let deletedFile: gcs.DiagramFile = { name: resp.name, id: resp['id'], path: resp.path_lower };

                    resolve(deletedFile); // used if deleteDiagram was called without UI

                    // if deleteDiagram has been called in processUIResult, need to resolve / reset the Deferred Promise instance variable
                    storage._deferredPromise.promise.resolve(deletedFile);
                    storage._deferredPromise.promise = storage.makeDeferredPromise();
                }).catch(function(e){
                    // Bad request: Access token is either expired or malformed. Get another one.
                    if (e.status == 400) {
                        storage.authorize(true);
                    }
                });
            } else throw Error('Cannot delete file from Dropbox with path ' + path);
        });
    }
}


