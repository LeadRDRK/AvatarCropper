import pbfe from "./pbfe.js"
import welcomeScreen from "./welcome-screen.js";
import DndHandler from "./dnd.js";
import loadingDialog from "./loading-dialog.js";
import editor from "./editor.js";
import toast from "./toast.js";

function init() {
    var container = new pbfe.Container;
    container.element.style.backgroundColor = "#1e1e1e";
    container.createShadow();

    toast.init(container);
    editor.init(container);
    loadingDialog.init(container);
    welcomeScreen.init(container);
    welcomeScreen.show();

    var dnd = new DndHandler(container, document.body);
    dnd.addListener(e => {
        editor.open(e.detail, function() {
            if (welcomeScreen.shown)
                welcomeScreen.hide();
        });
    });

    window.scrollTo(0, 1);
}
init();