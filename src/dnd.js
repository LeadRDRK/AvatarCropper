import pbfe from "./pbfe.js";
import toast from "./toast.js";
import { _ } from "./i18n.js";

function dispatchImageDrop(detail, element) {
    var idEvent = new CustomEvent("imagedrop", {detail: detail});
    element.dispatchEvent(idEvent);
}

function dispatchFile(file, element) {
    if (file.type.startsWith("image/")) {
        dispatchImageDrop(file, element);
        return true;
    }
    return false;
}

var lolMessages = ["Hey, you should drop your file into the window.", "Just drop it...", "I'm getting rather impatient.", "What are you doing!?", "Drop it now!", "Stop teasing me!", "I beg you!", "Please, just give me your file!!!"];
function DndHandler(container, element) {
    this.element = element;
    var overlay = new pbfe.Flexbox;
    overlay.element.id = "dndOverlay";

    var lol = 0;
    var counter = 0;
    element.addEventListener("dragenter", function() {
        if (counter == 0) {
            container.appendChild(overlay);
            if (++lol >= 10) {
                var msg = lolMessages[Math.min(lol - 10, lolMessages.length - 1)];
                toast.show(msg);
            }
        }
        ++counter;
    });

    element.addEventListener("dragleave", function() {
        if (--counter == 0)
            container.removeChild(overlay);
    });

    element.addEventListener("drop", function(e) {
        e.preventDefault();
        if (lol >= 10 + lolMessages.length - 1) {
            toast.show("Thank you.");
        }
        lol = 0;

        container.removeChild(overlay);
        counter = 0;

        if (e.dataTransfer.items) {
            for (const item of e.dataTransfer.items) {
                if (item.kind == "file") {
                    const file = item.getAsFile();
                    if (dispatchFile(file, element)) return;
                }
                else if (item.kind == "string") {
                    if (item.type != "text/uri-list" && item.type != "text/plain") continue;
                    item.getAsString(function(str) {
                        const i = str.indexOf("\r\n");
                        const url = str.slice(0, (i != -1) ? i : str.length);
                        if (!url.length || !url.startsWith("http")) return;
                        dispatchImageDrop(url, element);
                    });
                    return;
                }
            }
        }
        else {
            for (const file of e.dataTransfer.files) {
                if (dispatchFile(file, element)) return;
            }
        }
        toast.show(_("Invalid image file."));
    });

    element.addEventListener("dragover", function(e) {
        e.preventDefault();
    });
}

DndHandler.prototype.addListener = function(listener) {
    this.element.addEventListener("imagedrop", listener);
}

export default DndHandler;