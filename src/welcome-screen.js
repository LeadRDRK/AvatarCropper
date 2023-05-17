import pbfe from "./pbfe.js"
import editor from "./editor.js";
import toast from "./toast.js";
import aboutDialog from "./about-dialog.js";
import privacyDialog from "./privacy-dialog.js";
import i18n, { _ } from "./i18n.js";
import appInit from "./index.js";

var container, box, urlDialog;

function init(_container, callback) {
    container = _container;
    aboutDialog.init(container);
    privacyDialog.init(container);

    box = new pbfe.Flexbox;
    box.element.id = "welcomeScreen";
    box.justifyContent = "center";
    box.alignItems = "center";

    var titleBox = new pbfe.Flexbox("column");
    titleBox.gap = "0.25rem";
    
    var title = document.createElement("img");
    title.src = new URL('./banner.svg', import.meta.url);
    title.width = 740;
    title.height = 128;
    title.id = "title";
    title.alt = "Banner";
    title.draggable = false;
    title.onload = callback;
    titleBox.element.appendChild(title);

    var versionLabel = new pbfe.Label("v" + process.env.npm_package_version + " - ");
    versionLabel.element.id = "versionLabel";

    var aboutBtn = new pbfe.Button(_("About"), "link");
    versionLabel.appendChild(aboutBtn);

    versionLabel.element.appendChild(document.createTextNode(" | "));

    var privacyBtn = new pbfe.Button(_("Privacy"), "link");
    versionLabel.appendChild(privacyBtn);

    versionLabel.element.appendChild(document.createTextNode(" | "));

    var changelogLink = document.createElement("a");
    changelogLink.innerText = _("Changelog");
    changelogLink.href = "https://github.com/LeadRDRK/AvatarCropper/releases";
    changelogLink.draggable = false;
    changelogLink.target = "_blank";
    versionLabel.element.appendChild(changelogLink);

    titleBox.appendChild(versionLabel);

    var langSelector = new pbfe.Selector;
    langSelector.element.id = "langSelector";
    var langs = i18n.getLanguages();
    for (const i in langs) {
        langSelector.addOption(langs[i].name, i);
    }
    langSelector.value = localStorage.getItem("lang");
    titleBox.appendChild(langSelector);

    var buttonsBox = new pbfe.Flexbox("column");
    buttonsBox.element.id = "openButtonsBox";
    buttonsBox.flexBasis = "20%";
    buttonsBox.gap = "0.5rem";
    
    var openButton = new pbfe.Button(_("Open File..."));
    buttonsBox.appendChild(openButton);

    var urlButton = new pbfe.Button(_("Paste Image..."), "secondary");
    buttonsBox.appendChild(urlButton);

    var hint = new pbfe.Label(_("You can also drag and drop an image here."));
    hint.element.style.textAlign = "center";
    hint.element.style.fontStyle = "italic";
    buttonsBox.appendChild(hint);

    box.appendChild(titleBox);
    box.appendChild(buttonsBox);

    openButton.addEventListener("click", openFilePicker);
    initURLDialog();
    urlButton.addEventListener("click", urlDialog.show.bind(urlDialog));
    aboutBtn.addEventListener("click", aboutDialog.show.bind(aboutDialog));
    privacyBtn.addEventListener("click", privacyDialog.show.bind(privacyDialog));

    langSelector.addEventListener("change", function() {
        localStorage.setItem("lang", this.value);
        // Reinitialize the app
        appInit();
    });

    welcomeScreen.shown = true;
}

function initURLDialog() {
    urlDialog = new pbfe.Dialog(_("Paste Image"));

    var label = _("Paste your image into the input box.");
    var hint = new pbfe.Label(label);
    hint.element.style.marginBottom = "0.5rem";
    urlDialog.appendChild(hint);

    var input = new pbfe.Input("text");
    input.element.id = "urlInput";
    input.element.setAttribute("aria-label", label);
    urlDialog.appendChild(input);

    urlDialog.appendHideButton(_("Cancel"));

    input.addEventListener("paste", function(e) {
        var data = e.clipboardData || e.originalEvent.clipboardData;
        if (!data) return;

        var items = data.items;
        for (let i = 0; i < items.length; ++i) {
            let item = items[i];
            if (item.kind == "file") {
                let file = item.getAsFile();
                if (file.type.startsWith("image/")) {
                    editor.open(file, hide);
                    break;
                }
            }
        }
    });

    input.addEventListener("input", function() {
        input.value = "";
    });

    container.appendChild(urlDialog);
}

function show() {
    setTimeout(function() { box.element.classList.remove("hide"); }, 0);
    container.appendChild(box);
    container.appendChild(urlDialog);
    welcomeScreen.shown = true;
}

function hide() {
    box.element.classList.add("hide");
    urlDialog.hide();
    welcomeScreen.shown = false;

    container.removeChildAfterTransition(box, function() {
        if (container.contains(urlDialog)) container.removeChild(urlDialog);
    });
}

var inputEl = document.createElement("input");
inputEl.type = "file";
inputEl.accept = "image/*";

function openFilePicker() {
    inputEl.value = null;
    inputEl.click();
}

inputEl.addEventListener("change", function(e) {
    var fileList = this.files;
    for (let i = 0; i < fileList.length; ++i) {
        let file = fileList[i];
        if (file.type.startsWith("image/")) {
            editor.open(file, hide);
            return;
        }
    }
    toast.show(_("Invalid image file."));
});

var welcomeScreen = {
    shown: false, init, show, hide
}
export default welcomeScreen;