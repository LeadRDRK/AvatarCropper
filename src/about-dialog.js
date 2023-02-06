import pbfe from "./pbfe.js"
import i18n, { _ } from "./i18n.js";
import toast from "./toast.js";

var dialog;
function init(container) {
    dialog = new pbfe.Dialog(_("About"));
    dialog.element.style.textAlign = "center";
    container.appendChild(dialog);

    var banner = document.createElement("img");
    banner.src = new URL('./banner.svg', import.meta.url);
    banner.alt = "Banner";
    banner.width = 740;
    banner.height = 128;
    banner.style.width = "auto";
    banner.style.height = "3rem";
    banner.style.marginBottom = "0.5rem";
    banner.draggable = true;
    dialog.body.appendChild(banner);
    dialog.body.appendChild(document.createElement("br"));

    var text1 = new pbfe.Label(_("Simple and accurate avatar cropping tool.\n"));
    dialog.appendChild(text1);

    var text2 = new pbfe.Label(_("Source code: "));
    dialog.appendChild(text2);

    var srcLink = document.createElement("a");
    srcLink.href = "https://github.com/LeadRDRK/AvatarCropper";
    srcLink.innerText = srcLink.href + "\n";
    srcLink.target = "_blank";
    srcLink.draggable = false;
    dialog.body.appendChild(srcLink);
    
    dialog.body.appendChild(document.createElement("hr"));

    var text3 = document.createElement("b");
    text3.innerText = _("Translators\n");
    dialog.body.appendChild(text3);

    var langs = i18n.getLanguages();
    for (const i in langs) {
        var info = langs[i];
        var entry = new pbfe.Label(info.name + " - "  + info.author + "\n");
        dialog.appendChild(entry);
    }

    var okBtn = new pbfe.Button(_("OK"));
    dialog.appendButton(okBtn);
    okBtn.addEventListener("click", hide);

    var guyUrl = "https://leadrdrk.eu.org/static/generic.png";
    banner.addEventListener("dragstart", function(e) {
        e.dataTransfer.setData("text/pain", guyUrl);
    });
    banner.addEventListener("dragend", function(e) {
        toast.show("it's him! (drawn by @ReikoRobo)");
        hide();
    });
}

function show() { dialog.show(); }
function hide() { dialog.hide(); }

var aboutDialog = {
    init, show, hide
}
export default aboutDialog;