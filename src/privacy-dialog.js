import pbfe from "./pbfe.js"
import { _ } from "./i18n.js";

var dialog;
function init(container) {
    dialog = new pbfe.Dialog(_("Privacy"));
    container.appendChild(dialog);

    dialog.body.innerText =
        _("This app runs entirely in your browser! No image or data is ever uploaded to any external server.");

    var okBtn = new pbfe.Button(_("OK"));
    dialog.appendButton(okBtn);
    okBtn.addEventListener("click", hide);
}

function show() { dialog.show(); }
function hide() { dialog.hide(); }

var privacyDialog = {
    init, show, hide
}
export default privacyDialog;