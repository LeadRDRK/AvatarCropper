import pbfe from "./pbfe.js"
import i18n, { _ } from "./i18n.js";

var dialog;
function init(container) {
    dialog = new pbfe.Dialog(_("About"));
    dialog.element.style.textAlign = "center";
    dialog.body.style.lineHeight = "1.6rem";
    container.appendChild(dialog);

    var banner = document.createElement("img");
    banner.src = new URL('./banner.png', import.meta.url);
    banner.alt = "Avatar Cropper";
    banner.style.height = "3rem";
    banner.style.marginBottom = "0.5rem";
    banner.draggable = false;
    dialog.body.appendChild(banner);
    insertBr(dialog.body);

    var text1 = document.createTextNode(_("Simple and accurate avatar cropping tool."));
    dialog.body.appendChild(text1);
    insertBr(dialog.body);

    var text2 = document.createTextNode(_("Source code: "));
    dialog.body.appendChild(text2);

    var srcLink = document.createElement("a");
    srcLink.href = "https://github.com/LeadRDRK/AvatarCropper";
    srcLink.innerText = srcLink.href;
    srcLink.target = "_blank";
    srcLink.draggable = false;
    dialog.body.appendChild(srcLink);
    
    insertHr(dialog.body);

    var text3 = document.createElement("b");
    text3.innerText = _("Translators");
    dialog.body.appendChild(text3);
    insertBr(dialog.body);

    var langs = i18n.getLanguages();
    for (const i in langs) {
        var info = langs[i];
        var entry = document.createTextNode(info.name + " - "  + info.author);
        dialog.body.appendChild(entry);
        insertBr(dialog.body);
    }

    var okBtn = new pbfe.Button(_("OK"));
    dialog.appendButton(okBtn);
    okBtn.addEventListener("click", hide);
}

function insertBr(element) {
    element.appendChild(document.createElement("br"));
}

function insertHr(element) {
    element.appendChild(document.createElement("hr"));
}

function show() { dialog.show(); }
function hide() { dialog.hide(); }

var aboutDialog = {
    init, show, hide
}
export default aboutDialog;