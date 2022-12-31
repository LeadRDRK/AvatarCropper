import pbfe from "./pbfe.js"

var dialog;
function init(container) {
    dialog = new pbfe.Dialog("Privacy Policy");
    dialog.body.style.lineHeight = "1.6rem";
    container.appendChild(dialog);

    dialog.body.innerText =
        "This app runs entirely in your browser! No image or data is ever uploaded to any external server.";

    var okBtn = new pbfe.Button("OK");
    dialog.appendButton(okBtn);
    okBtn.addEventListener("click", hide);
}

function show() { dialog.show(); }
function hide() { dialog.hide(); }

var privacyDialog = {
    init, show, hide
}
export default privacyDialog;