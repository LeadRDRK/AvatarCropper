import pbfe from "./pbfe.js";
import { _ } from "./i18n.js";
import toast from "./toast.js";

var dialog, selector, iframe, loadNotif;
var imgSrc, callback;

var defaultPage = "data:text/html;base64,PCFET0NUWVBFIGh0bWw+PGh0bWw+PGJvZHkgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6IzI1MjcyOTsiPjwvYm9keT48L2h0bWw+";
var templates = {
    discord: new URL("./preview/discord.html", import.meta.url)
}

function init(container) {
    dialog = new pbfe.Dialog(_("Web Preview"));
    dialog.element.id = "webPreviewDialog";
    dialog.body.innerText = _("Select a website:");
    container.appendChild(dialog);

    var closeBtn = new pbfe.Button(_("Close"));
    dialog.appendButton(closeBtn);

    selector = new pbfe.Selector;
    selector.addOption("----", "placeholder", true);
    selector.addOption("Discord", "discord");
    selector.element.style.marginLeft = "0.5rem";
    dialog.appendChild(selector);

    var wrapper = new pbfe.Widget;
    wrapper.element.id = "previewIFrameWrapper";
    dialog.appendChild(wrapper)

    iframe = document.createElement("iframe");
    iframe.id = "previewIFrame";
    iframe.title = _("Web Preview");
    wrapper.body.appendChild(iframe);

    loadNotif = new pbfe.Widget;
    loadNotif.element.id = "loadNotif";
    wrapper.appendChild(loadNotif);

    var loadSpinner = document.createElement("img");
    loadSpinner.id = "loadSpinner";
    loadSpinner.src = new URL("./loading.svg", import.meta.url);
    loadSpinner.width = loadSpinner.height = 128;
    loadSpinner.alt = "Loading";
    loadNotif.body.appendChild(loadSpinner);

    var loadLabel = new pbfe.Label(_("Loading..."));
    loadNotif.appendChild(loadLabel);

    closeBtn.addEventListener("click", function() {
        dialog.hide();
        callback();
    });

    selector.addEventListener("change", function() {
        loadPreview(this.value);
    });
}

function loadPreview(site) {
    var loadNotifEl = loadNotif.element;
    loadNotifEl.classList.add("show");
    iframe.src = templates[site];
    iframe.addEventListener("load", async function() {
        if (iframe.contentDocument) await injectImages();
        else toast.show(_("Failed to load preview page."));
        loadNotifEl.classList.remove("show");
    }, { once: true });
}

function onImageLoadOnce(img) {
    return new Promise(resolve => {
        img.addEventListener("load", resolve, { once: true });
    });
}

async function injectImages() {
    var iDocument = iframe.contentDocument;
    var list = iDocument.getElementsByClassName("avatar");

    var imgUrls = {};
    for (var i = 0; i < list.length; ++i) {
        var img = list[i];
        var size = img.dataset.size;

        var src = imgUrls[size];
        if (!src)
            imgUrls[size] = src = await renderScaledImage(size);
        
        img.src = src;
        await onImageLoadOnce(img);
        img.draggable = false;
    }

    for (var i in imgUrls) {
        URL.revokeObjectURL(imgUrls[i]);
    }
}

var renderCanvas = document.createElement("canvas");
var renderCtx = renderCanvas.getContext("2d");
async function renderScaledImage(size) {
    renderCanvas.width = renderCanvas.height = size;
    renderCtx.imageSmoothingQuality = "high";
    renderCtx.drawImage(imgSrc,
        0, 0, imgSrc.width, imgSrc.height,
        0, 0, size, size
    );
    var blob = await new Promise(resolve => renderCanvas.toBlob(resolve));
    return URL.createObjectURL(blob);
}

function show(imgSrc_, callback_) {
    imgSrc = imgSrc_;
    callback = callback_;
    selector.value = "placeholder";
    iframe.src = defaultPage;
    dialog.show();
}

var webPreview = {
    init, show
}
export default webPreview;