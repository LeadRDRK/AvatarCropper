import pbfe from "./pbfe.js"

var dialog, progressBar;
function init(container) {
    dialog = new pbfe.Dialog("Loading...");
    container.appendChild(dialog);

    progressBar = new pbfe.ProgressBar;
    progressBar.element.id = "loadingBar";
    dialog.appendChild(progressBar);
}

function show() {
    dialog.show();
}

function hide() {
    dialog.hide();
}

function setProgress(value) {
    progressBar.setProgress(value);
}

var loadingDialog = {
    init, show, hide, setProgress
}
export default loadingDialog;