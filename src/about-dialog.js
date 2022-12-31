import pbfe from "./pbfe.js"

var dialog;
function init(container) {
    dialog = new pbfe.Dialog("About");
    dialog.element.style.textAlign = "center";
    dialog.body.style.lineHeight = "1.6rem";
    container.appendChild(dialog);

    var banner = document.createElement("img");
    banner.src = new URL('./banner.png', import.meta.url);
    banner.style.height = "3rem";
    banner.style.marginBottom = "0.5rem";
    banner.setAttribute("draggable", false);
    dialog.body.appendChild(banner);
    insertBr(dialog.body);

    var text1 = document.createTextNode("Simple and accurate avatar cropping tool that runs in your browser.");
    dialog.body.appendChild(text1);
    insertBr(dialog.body);

    var text2 = document.createTextNode("Source code: ");
    dialog.body.appendChild(text2);

    var srcLink = document.createElement("a");
    srcLink.href = "https://github.com/LeadRDRK/AvatarCropper";
    srcLink.innerText = srcLink.href;
    srcLink.target = "_blank";
    srcLink.setAttribute("draggable", false);
    dialog.body.appendChild(srcLink);
    
    insertHr(dialog.body);

    var okBtn = new pbfe.Button("OK");
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