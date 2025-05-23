import loadingDialog from "./loading-dialog.js";
import pbfe from "./pbfe.js";
import toast from "./toast.js";
import welcomeScreen from "./welcome-screen.js";
import { _ } from "./i18n.js";
import gif from "./gif.js";
import colorPicker from "./color-picker.js";
import imageFilters from "./image-filters.js";
import webPreview from "./web-preview.js";
import {
    redrawFunc,
    touchToMouseEvent,
    MenuInputs,
    createRangeDetents, 
    isPointInRect,
    isPointInCircle,
    getTouchDist,
    createLine
} from "./utils.js";

var container, box;
var innerBox, canvasBox, editorCanvas, editorCtx, imgCanvas, imgCtx;
var menuBox, inputs = new MenuInputs;
var notifBox;
var renderCanvas, renderCtx;
var previewBox, previewImages;
var saveAnchor = document.createElement("a");
var saveDialog, gifOptionsDialog, rotateDialog;

var cropShapes = {
    CIRCLE: 1,
    SQUARE: 2,
    FREEFORM: 3
};
var cropShape = cropShapes.CIRCLE;
var previewSizes = [128, 64, 32];

function init(_container) {
    container = _container;

    box = new pbfe.Flexbox;
    box.element.id = "editorBox";
    box.element.classList.add("hide");

    initInnerBox();
    initMenuBox();
    initNotifBox();
    initSaveDialog();
    initGifOptions();
    initRotateDialog();

    innerBox.addEventListener("mousedown", mouseDownListener);
    menuBox.addEventListener("mousedown", unfocusInnerBox);
    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener("mouseup", mouseUpListener);
    document.addEventListener("blur", mouseUpListener);
    innerBox.addEventListener("wheel", wheelListener, { passive: true });

    if ("ontouchstart" in document) {
        innerBox.addEventListener("touchstart", touchStartListener, { passive: true });
        document.addEventListener("touchmove", touchMoveListener, { passive: true });
        document.addEventListener("touchend", touchEndListener, { passive: true });
    }

    document.addEventListener("keydown", keyDownListener);
}

function initInnerBox() {
    innerBox = new pbfe.Flexbox;
    innerBox.element.id = "editorInnerBox";
    innerBox.element.style.cursor = "grab";
    box.appendChild(innerBox);

    canvasBox = new pbfe.Widget;
    canvasBox.element.id = "canvasBox";
    innerBox.appendChild(canvasBox);

    imgCanvas = document.createElement("canvas");
    imgCanvas.id = "imgCanvas";
    canvasBox.body.appendChild(imgCanvas);

    imgCtx = imgCanvas.getContext("2d");

    editorCanvas = document.createElement("canvas");
    editorCanvas.id = "editorCanvas";
    canvasBox.body.appendChild(editorCanvas);

    editorCtx = editorCanvas.getContext("2d");
    editorCtx.lineWidth = 1;

    var fullscreenBtn = new pbfe.Button("⛶");
    fullscreenBtn.element.classList.add("innerBoxBtn");
    fullscreenBtn.element.title = _("Toggle fullscreen");
    fullscreenBtn.element.style.right = "0";
    fullscreenBtn.element.style.lineHeight = "1.4";
    innerBox.appendChild(fullscreenBtn);

    var tutorialBtn = new pbfe.Button("?");
    tutorialBtn.element.classList.add("innerBoxBtn");
    tutorialBtn.element.title = _("Show tutorial");
    tutorialBtn.element.style.right = "2.5rem";
    tutorialBtn.element.style.lineHeight = "1.4";
    innerBox.appendChild(tutorialBtn);

    fullscreenBtn.addEventListener("click", function() {
        if (document.fullscreenElement)
            document.exitFullscreen();
        else
            document.body.requestFullscreen();
    });

    initTutorialDialog();
    tutorialBtn.addEventListener("click", showTutorialDialog);

    previewBox = new pbfe.Flexbox;
    previewBox.element.id = "previewBox";

    previewImages = [];
    for (let i = 0; i < 3; ++i) {
        var size = previewSizes[i];

        let container = new pbfe.Widget;
        let style = container.element.style;
        style.width = style.height = size + "px";
        style.borderRadius = size/2 + "px";
        previewBox.appendChild(container);

        let img = new Image;
        container.element.appendChild(img);
        previewImages.push(img);
    }

    innerBox.appendChild(previewBox);
}

var tutorialDialog, demoVideo;
function initTutorialDialog() {
    tutorialDialog = new pbfe.Dialog(_("Tutorial"));
    tutorialDialog.element.style.textAlign = "center";
    container.appendChild(tutorialDialog);

    var text1 = new pbfe.Label(_("Drag the crop selector to move or resize it."));
    tutorialDialog.appendChild(text1);

    demoVideo = document.createElement("video");
    demoVideo.style.pointerEvents = "none";
    demoVideo.style.width = "100%";
    demoVideo.style.marginTop = "0.5rem";
    demoVideo.loop = true;
    demoVideo.poster = new URL("./demo-thumbnail.jpg", import.meta.url);
    tutorialDialog.body.appendChild(demoVideo);

    var text2 = new pbfe.Label(_("Dragging anywhere outside of the crop selector will move the viewport. Use the mouse wheel or pinch the screen with two fingers to zoom in/out.\nOnce you're done, press the \"Save image...\" button to save your cropped image.\n\nYou may view this tutorial at any time by pressing the \"?\" button at the top right of the screen."));
    tutorialDialog.appendChild(text2);

    tutorialDialog.appendHideButton(_("OK"));
}

function showTutorialDialog() {
    if (!demoVideo.src) {
        demoVideo.src = "./demo.mp4";
        demoVideo.play();
    }
    tutorialDialog.show();
}

function initMenuBox() {
    colorPicker.init(container);

    menuBox = new pbfe.Flexbox;
    menuBox.element.id = "editorMenu";
    box.appendChild(menuBox);

    var saveBtn = createMenuButton(_("Save image..."));
    var saveGifBtn = createMenuButton(_("Save as GIF..."));
    var fitBtn = createMenuButton(_("Fit image to viewport"));
    var rotateBtn = createMenuButton(_("Rotate..."));

    var shapeBtnContainer = new pbfe.Widget;
    shapeBtnContainer.element.id = "shapeBtnContainer";
    var circleBtn = createShapeButton(_("Circle"), "circle", true);
    var squareBtn = createShapeButton(_("Square"), "square");
    var freeformBtn = createShapeButton(_("Freeform"), "freeform");
    shapeBtnContainer.appendChildren([ circleBtn, squareBtn, freeformBtn ]);
    prevShapeBtn = circleBtn.element;

    menuBox.appendChildren([
        /* Save */
        createSectionTitle(_("Save")),
        saveBtn,
        saveGifBtn,

        /* Crop Area */
        createSectionTitle(_("Crop Area")),
        inputs.create("width", _("Width"), "text", true),
        inputs.create("height", _("Height"), "text", true),
        inputs.create("xPos", _("X Pos"), "text", true),
        inputs.create("yPos", _("Y Pos"), "text", true),
        inputs.create("allowOffscreen", _("Allow offscreen"), "checkbox"),

        /* Crop Shape */
        createSectionTitle(_("Crop Shape")),
        shapeBtnContainer,
        inputs.create("showGuidelines", _("Show guidelines"), "checkbox"),
        inputs.create("guideColor", _("Guidelines color"), "color"),

        /* Image */
        createSectionTitle(_("Image")),
        inputs.create("flipH", _("Flip horizontally"), "checkbox"),
        inputs.create("flipV", _("Flip vertically"), "checkbox"),
        rotateBtn,
        inputs.create("frame", _("Frame"), "range"),
        inputs.create("playGif", _("Play GIF"), "checkbox"),
        inputs.create("bgColor", _("Background color"), "color"),

        /* Viewport */
        createSectionTitle(_("Viewport")),
        inputs.create("zoom", _("Zoom"), "range"),
        inputs.create("scaleDevicePixel", _("Scale to device pixel"), "checkbox"),
        fitBtn,
        inputs.create("showPreview", _("Show preview"), "checkbox")
    ]);

    /* Input defaults */
    inputs.frame.value = 0;
    inputs.frame.disabled = true;
    inputs.showPreview.checked = true;
    inputs.bgColor.style.backgroundColor = "rgba(255,255,255,0)";
    inputs.guideColor.style.backgroundColor = "rgb(255,255,0)";

    /* Other */
    var returnBtn = new pbfe.Button(_("Open another image"), "secondary");
    returnBtn.element.id = "returnBtn";
    menuBox.appendChild(returnBtn);

    var hideBtn = new pbfe.Button(_("Hide panel"));
    hideBtn.element.id = "hideBtn";
    menuBox.appendChild(hideBtn);

    /* Events */
    returnBtn.addEventListener("click", function() {
        hide();
        welcomeScreen.show();
    });

    var innerStyle = innerBox.element.style;
    hideBtn.addEventListener("click", function() {
        if (innerStyle.width && innerStyle.height) {
            innerStyle.removeProperty("width");
            innerStyle.removeProperty("height");
            previewBox.element.classList.remove("panelHidden");
            hideBtn.text = _("Hide panel");
        }
        else {
            innerStyle.width = "100%";
            innerStyle.height = "100%";
            previewBox.element.classList.add("panelHidden");
            hideBtn.text = _("Show panel");
        }
    });

    inputs.width.addEventListener("input", function() {
        updateSizeInputValue(this, "width");
    });

    inputs.height.addEventListener("input", function() {
        updateSizeInputValue(this, "height");
    });

    inputs.xPos.addEventListener("input", function() {
        updatePosInputValue(this, "x");
    });

    inputs.yPos.addEventListener("input", function() {
        updatePosInputValue(this, "y");
    });

    inputs.showGuidelines.addEventListener("change", redrawEditor);

    inputs.flipH.addEventListener("change", updateImgRenders);
    inputs.flipV.addEventListener("change", updateImgRenders);

    var zoomDetents = createRangeDetents("zoomDetents", [50, 100, 200, 400]);
    var zoomInput = inputs.zoom;
    zoomInput.min = 10;
    zoomInput.max = 800;
    zoomInput.value = canvasScale;
    zoomInput.setAttribute("list", zoomDetents);
    zoomInput.addEventListener("input", function() {
        setCanvasScale(this.value / 100);
    });

    inputs.scaleDevicePixel.addEventListener("change", function() {
        setCanvasScale(canvasScale);
    });

    fitBtn.addEventListener("click", function() {
        fitImageToViewport();
    });

    inputs.showPreview.addEventListener("change", function(e) {
        if (this.checked) {
            previewBox.element.style.display = "flex";
            initPreview();
        }
        else
            previewBox.element.style.display = "none";
    });

    rotateBtn.addEventListener("click", showRotateDialog);

    inputs.frame.addEventListener("input", function() {
        if (gif.isAnimated()) {
            var value = this.value;
            img = gif.frames[value].bitmap;
            updateImgRenders();
            showNotification(_("Frame: ") + value);
        }
    });

    saveBtn.addEventListener("click", showSaveDialog);
    saveGifBtn.addEventListener("click", showGifOptions);

    inputs.playGif.addEventListener("change", function() {
        if (gif.frames.length < 2) return;
        if (this.checked)
            playNextGifFrame();
    });

    inputs.bgColor.addEventListener("click", function() { colorPicker.show(this, imgCanvas); });
    inputs.guideColor.addEventListener("click", function() { colorPicker.show(this, imgCanvas); });

    inputs.bgColor.addEventListener("colorchange", function() {
        redrawImgCanvas();
        var color = inputs.bgColor.style.backgroundColor;
        for (let i = 0; i < previewImages.length; ++i) {
            var parentStyle = previewImages[i].parentNode.style;
            parentStyle.backgroundColor = color;
        }
    });

    inputs.guideColor.addEventListener("colorchange", redrawEditor);
    menuBox.addEventListener("scroll", colorPicker.hide, { passive: true });

    imgCanvas.addEventListener("edstatechange", function(e) {
        if (e.detail) editorCanvas.style.display = "none";
        else editorCanvas.style.removeProperty("display");
    });
}

function updateSizeInputValue(input, type) {
    var value = parseInputValue(input);
    if (!value || value < 10) return;
    
    if (cropShape != cropShapes.FREEFORM) {
        inputs.width.value = inputs.height.value = value;
        crop.width = crop.height = value;
    }
    else crop[type] = value;

    setCropSize(crop.width, crop.height);
    redrawEditor();
    if (inputs.showPreview.checked) updatePreview();
}

function updatePosInputValue(input, type) {
    var value = parseInputValue(input);
    if (value === undefined) return;
    crop[type] = value;

    setCropPosition(crop.x, crop.y);
    redrawEditor();
    if (inputs.showPreview.checked) updatePreview();
}

function playNextGifFrame() {
    if (!inputs.playGif.checked) return;
    var nextFrame = ++inputs.frame.value;
    if (nextFrame == gif.frames.length) {
        inputs.frame.value = nextFrame = 0;
    }
    var frame = gif.frames[nextFrame];
    img = frame.bitmap;
    updateImgRenders();
    setTimeout(playNextGifFrame, frame.info.delay * 10);
}

function createSectionTitle(text) {
    var title = new pbfe.Label(text);
    title.element.classList.add("sectionTitle");
    return title;
}

var prevShapeBtn;
function shapeBtnHandler(value) {
    return function() {
        if (cropShape == value) return;
        cropShape = value;
        if (value != cropShapes.FREEFORM)
            setCropSize(crop.width, crop.width);
        
        for (let i = 0; i < previewImages.length; ++i) {
            let parent = previewImages[i].parentNode;
            parent.style.borderRadius = (value == cropShapes.CIRCLE ? previewSizes[i] : 0) + "px";
        }

        this.classList.add("chosen");
        prevShapeBtn.classList.remove("chosen");
        prevShapeBtn = this;

        redrawEditor();
        if (inputs.showPreview.checked) updatePreview();
    };
}

function parseInputValue(el) {
    if (el.value == "") return;
    var value = Number(el.value);
    if (isNaN(value)) {
        showNotification(_("Invalid value"));
        return;
    }
    return value;
}

function createMenuButton(label, split, chosen) {
    var btn = new pbfe.Button(label);
    var classes = ["menuBtn"];
    if (split) classes.push("split");
    if (chosen) classes.push("chosen");
    btn.element.classList.add(...classes);
    return btn;
}

function createShapeIcon(type) {
    var el = document.createElement("span");
    el.classList.add("shapeIcon", type);
    return el;
}

function createShapeButton(label, type, chosen) {
    var btn = createMenuButton(label, false, chosen);
    var icon = createShapeIcon(type);
    btn.element.prepend(icon);

    btn.addEventListener("click", shapeBtnHandler(cropShapes[type.toUpperCase()]));
    return btn;
}

function initNotifBox() {
    notifBox = new pbfe.Floatbox;
    notifBox.element.id = "notifBox";
    box.appendChild(notifBox);
}

var notifTimeout = null;
function showNotification(text, time) {
    if (notifTimeout != null) clearTimeout(notifTimeout);
    if (!time) time = 1000;
    var notifEl = notifBox.element;
    notifEl.innerText = text;
    notifEl.classList.add("show");

    notifTimeout = setTimeout(function() {
        notifEl.classList.remove("show");
        notifTimeout = null;
    }, time);
}

function initGifOptions() {
    gifOptionsDialog = new pbfe.Dialog(_("GIF Options"));
    gifOptionsDialog.appendChildren([
        inputs.create("startFrame", _("Start frame"), "number"),
        inputs.create("endFrame", _("End frame"), "number"),
        inputs.create("loopCount", _("Loop count"), "number"),
        inputs.create("speedMult", _("Speed multiplier"), "number"),
        inputs.create("keepGifColors", _("Keep original colors"), "checkbox")
    ]);

    var filtersLabel = new pbfe.Label(_("Filters"));
    filtersLabel.element.classList.add("menuInputBox");
    gifOptionsDialog.appendChild(filtersLabel);

    var filtersBtn = new pbfe.Button("✨ " + _("Options..."));
    filtersBtn.element.style.marginLeft = "auto";
    filtersLabel.appendChild(filtersBtn);

    inputs.startFrame.value = inputs.startFrame.min = 0;
    inputs.endFrame.value = inputs.endFrame.min = 0;
    inputs.loopCount.value = inputs.loopCount.min = 0;
    inputs.speedMult.value = 1;
    inputs.speedMult.step = 0.25;
    inputs.speedMult.min = 0;

    inputs.keepGifColors.style.paddingTop = "0";
    
    var saveBtn = new pbfe.Button(_("Save"));
    gifOptionsDialog.appendButton(saveBtn);
    saveBtn.addEventListener("click", function() {
        gifOptionsDialog.hide();
        renderAndSaveGif();
    });

    filtersBtn.addEventListener("click", function() {
        gifOptionsDialog.hide();

        // Render a static image for the image filters canvas
        render();
        imageFilters.showOptions(gifFilters, renderCanvas, function() {
            gifOptionsDialog.show();
        });
    });

    gifOptionsDialog.appendHideButton(_("Cancel"), "secondary");
    container.appendChild(gifOptionsDialog);
}

var gifFilters;
function showGifOptions() {
    gifFilters = {}
    gifOptionsDialog.show();
}

function initSaveDialog() {
    imageFilters.init(container);
    webPreview.init(container);

    saveDialog = new pbfe.Dialog(_("Save Image"));
    saveDialog.element.id = "saveDialog";
    container.appendChild(saveDialog);

    var label = new pbfe.Label(_("You can save the image now, or apply some filters and check how your avatar would look on some websites."));
    saveDialog.appendChild(label);

    saveDialog.body.appendChild(document.createElement("br"));

    renderCanvas = document.createElement("canvas");
    renderCtx = renderCanvas.getContext("2d", { willReadFrequently: true });
    saveDialog.body.appendChild(renderCanvas);

    var actionsContainer = new pbfe.Widget;
    actionsContainer.element.id = "imgActionsContainer";
    saveDialog.appendChild(actionsContainer);

    var filtersBtn = new pbfe.Button("✨ " + _("Filters..."));
    actionsContainer.appendChild(filtersBtn);

    var previewBtn = new pbfe.Button("🖼️ " + _("Preview..."));
    actionsContainer.appendChild(previewBtn);

    var saveBtn = new pbfe.Button(_("Save"));
    saveDialog.appendButton(saveBtn);

    var closeBtn = new pbfe.Button(_("Close"), "secondary");
    saveDialog.appendButton(closeBtn);

    saveBtn.addEventListener("click", saveImage);
    closeBtn.addEventListener("click", function() {
        saveDialog.hide();
    });

    filtersBtn.addEventListener("click", function() {
        saveDialog.hide();
        imageFilters.showOptions(null, renderCanvas, function() {
            renderCtx.clearRect(0, 0, crop.width, crop.height);
            renderCtx.drawImage(imageFilters.canvas, 0, 0);
            saveDialog.show();
        });
    });

    previewBtn.addEventListener("click", function() {
        saveDialog.hide();
        webPreview.show(renderCanvas, function() {
            saveDialog.show();
        });
    });
}

function showSaveDialog() {
    render();
    saveDialog.show();
}

var rotateCanvas, rotateCtx, rotateSlider, angleLabel;
function initRotateDialog() {
    rotateDialog = new pbfe.Dialog(_("Rotate"));
    rotateDialog.element.style.textAlign = "center";
    container.appendChild(rotateDialog);

    rotateCanvas = document.createElement("canvas");
    rotateCanvas.id = "rotateCanvas";
    rotateCtx = rotateCanvas.getContext("2d");
    rotateDialog.body.appendChild(rotateCanvas);

    angleLabel = new pbfe.Label("0°");
    rotateDialog.appendChild(angleLabel);

    var rotateDetents = createRangeDetents("rotateDetents", [90, 180, 270]);
    rotateSlider = new pbfe.Input("range");
    rotateSlider.element.style.width = "100%";
    rotateSlider.min = 0;
    rotateSlider.max = 360;
    rotateSlider.step = 0.1;
    rotateSlider.value = 0;
    rotateSlider.element.setAttribute("list", rotateDetents);
    rotateSlider.element.setAttribute("aria-label", _("Rotation angle"));
    rotateDialog.appendChild(rotateSlider);

    var applyBtn = new pbfe.Button(_("Apply"));
    rotateDialog.appendButton(applyBtn);
    applyBtn.addEventListener("click", function() {
        rotateDialog.hide();
        openRotatedImg(rotateSlider.value);
    });

    rotateDialog.appendHideButton(_("Cancel"), "secondary");

    rotateSlider.addEventListener("input", function() {
        angleLabel.text = this.value + "°";
        rotateCanvas.style.transform = "rotate(" + this.value + "deg)";
    });
}

var origImg, origFrames, rotateCanvasInit;
function showRotateDialog() {
    if (rotateCanvasInit) {
        var src = gif.isAnimated() ? gif.frames[0].bitmap : img;
        rotateCanvas.width = src.width;
        rotateCanvas.height = src.height;
        rotateCtx.drawImage(src, 0, 0);
        rotateCanvasInit = false;
    }

    rotateDialog.show();
}

function renderRotatedImg(src, angle) {
    var w = src.width;
    var h = src.height;
    var absSin = Math.abs(Math.sin(angle));
    var absCos = Math.abs(Math.cos(angle));
    var rw = Math.ceil(w * absCos + h * absSin);
    var rh = Math.ceil(w * absSin + h * absCos);

    renderCanvas.width = rw;
    renderCanvas.height = rh;

    renderCtx.translate(rw/2, rh/2);
    renderCtx.rotate(angle);
    renderCtx.drawImage(src, -w/2, -h/2);

    return createImageBitmap(renderCtx.getImageData(0, 0, rw, rh));
}

async function openRotatedImg(angle) {
    if (angle != 0 && angle != 360) {
        angle = angle * Math.PI / 180;

        if (gif.isAnimated()) {
            if (!origFrames) origFrames = gif.frames;
            var frames = [];
            for (var i = 0; i < origFrames.length; ++i) {
                var { info, bitmap } = origFrames[i];
                var rotBitmap = await renderRotatedImg(bitmap, angle);
                frames[i] = { info, bitmap: rotBitmap };
            }
            gif.frames = frames;
        }
        else {
            if (!origImg) origImg = img;
            img = await renderRotatedImg(origImg, angle);
        }
    }
    else if (origImg) {
        img = origImg;
        origImg = null;
    }
    else if (origFrames) {
        gif.frames = origFrames;
        origFrames = null;
    }
    else
        return;
    
    if (gif.isAnimated()) {
        var currentFrame = inputs.frame.value;
        img = gif.frames[currentFrame].bitmap;
    }
        
    setMainCanvasesSize(img.width, img.height);
    editorCanvasInit = true;

    show();
    reset();
}

function setMainCanvasesSize(w, h) {
    imgCanvas.width  = editorCanvas.width  = previewCanvas.width  = w;
    imgCanvas.height = editorCanvas.height = previewCanvas.height = h;
}

var img;
var usingObjectUrl = false;
var currentName;
function open(src, successCb) {
    if (usingObjectUrl) {
        URL.revokeObjectURL(origImg ? origImg.src : img.src);
        usingObjectUrl = false;
    }
    origImg = origFrames = null;

    if (gif.reset()) {
        inputs.frame.value = 0;
        inputs.frame.disabled = true;
        inputs.startFrame.value = 0;
        inputs.endFrame.value = 0;
        inputs.loopCount.value = 0;
        inputs.keepGifColors.checked = false;
        inputs.playGif.checked = false;
    }

    loadingDialog.setProgress(-1);
    loadingDialog.show();

    if (src instanceof File) {
        currentName = src.name.slice(0, src.name.lastIndexOf("."));
        if (src.type == "image/gif") gif.load(src, inputs);
        src = URL.createObjectURL(src);
        usingObjectUrl = true;
    }
    else {
        if (src == "") return;
        if (img && src == img.src) {
            loadingDialog.hide();
            show();
            reset();
            successCb();
            return;
        }
        currentName = src.slice(src.lastIndexOf("/") + 1, src.lastIndexOf("."));
    }

    if (!(img instanceof Image)) img = new Image;
    var loadCb, errorCb
    img.addEventListener("load", loadCb = function() {
        loadingDialog.setProgress(1);
        loadingDialog.hide();

        setMainCanvasesSize(img.width, img.height);
        editorCanvasInit = true;

        rotateSlider.value = 0;
        angleLabel.text = "0°";
        rotateCanvas.style.transform = "";
        rotateCanvasInit = true;

        show();
        reset();
        successCb();

        img.removeEventListener("load", loadCb);
        img.removeEventListener("error", errorCb);
    });
    img.addEventListener("error", errorCb = function() {
        loadingDialog.hide();
        toast.show(_("Failed to load image."));

        img.removeEventListener("load", loadCb);
        img.removeEventListener("error", errorCb);
    });
    img.src = src;
}

function show() {
    container.appendChild(box);
    setTimeout(function() { box.element.classList.remove("hide"); }, 0);

    if (!localStorage.getItem("tutorialShown")) {
        showTutorialDialog();
        localStorage.setItem("tutorialShown", "true");
    }
}

function hide() {
    box.element.classList.add("hide");
    container.removeChildAfterTransition(box);
    colorPicker.hide();
    inputs.playGif.checked = false;
}

function isHidden() {
    return box.element.classList.contains("hide");
}

function reset() {
    fitImageToViewport();
    resetCropArea();
    inputs.flipH.checked = inputs.flipV.checked = false;

    redrawEditor();
    updateImgRenders();
}

function resetCropArea() {
    var s = Math.floor((img.width < img.height ? img.width : img.height) * 0.5);
    s -= s % 10;
    
    crop.x = crop.y = 0;
    setCropSize(s, s);
    setCropPosition(0, 0);
}

function fitImageToViewport() {
    var innerEl = innerBox.element;
    var vpWidth = innerEl.offsetWidth;
    var vpHeight = innerEl.offsetHeight;
    var vpAspectRatio = vpWidth / vpHeight;
    var imgAspectRatio = img.width / img.height;

    var ratio = inputs.scaleDevicePixel.checked ? 1 : devicePixelRatio;
    setCanvasScale((vpAspectRatio > imgAspectRatio ? vpHeight / img.height : vpWidth / img.width) * ratio);
    setCanvasMargins(0, 0);
}

function setCropPosition(x, y) {
    if (!inputs.allowOffscreen.checked) {
        x = Math.max(0, Math.min(x, img.width - crop.width));
        y = Math.max(0, Math.min(y, img.height - crop.height));
    }

    crop.x = x;
    crop.y = y;
    inputs.xPos.value = x;
    inputs.yPos.value = y;
}

function setCropSize(width, height, preferHigher) {
    if (!inputs.allowOffscreen.checked) {
        width = Math.min(width, img.width - crop.x);
        height = Math.min(height, img.height - crop.y);
    }
    var min = (img.width < 50 || img.height < 50) ? 1 : 10;
    width = Math.max(min, width);
    height = Math.max(min, height);

    if (cropShape != cropShapes.FREEFORM) {
        if (preferHigher ? width > height : width < height) height = width;
        else width = height;
    }
    crop.width = width;
    crop.height = height;
    inputs.width.value = width;
    inputs.height.value = height;
}

var canvasX = 0, canvasY = 0;
function setCanvasMargins(x, y) {
    canvasX = x;
    canvasY = y;

    var element = canvasBox.element;
    element.style.marginLeft = canvasX + "px";
    element.style.marginTop  = canvasY + "px";
}

var canvasScale = 1;
function setCanvasScale(scale) {
    var ratio = inputs.scaleDevicePixel.checked ? 1 : devicePixelRatio;
    scale = Math.round(Math.max(0.1, Math.min(scale, 8)) * 1000) / 1000;
    var realScale = scale / ratio;
    canvasBox.element.style.transform = "scale(" + realScale.toFixed(3) + ")";
    inputs.zoom.value = Math.round(scale * 100);

    var newLineWidth = Math.ceil(Math.max(1, 1 / (realScale * devicePixelRatio)));
    if (newLineWidth != editorCtx.lineWidth) {
        editorCtx.lineWidth = newLineWidth;
        redrawEditor();
    }

    var mScale = scale / canvasScale;
    setCanvasMargins(canvasX * mScale, canvasY * mScale);

    canvasScale = scale;
    showNotification(_("Zoom: ") + (+(scale*100).toFixed(1)) + "%");
}

function applyFlipTransform(canvas, ctx) {
    var flipH = inputs.flipH.checked;
    var flipV = inputs.flipV.checked;
    var sx = 1, sy = 1;
    if (flipH) {
        ctx.translate(canvas.width, 0);
        sx = -1;
    }
    if (flipV) {
        ctx.translate(0, canvas.height);
        sy = -1;
    }
    ctx.scale(sx, sy);
}

var crop = { x: 0, y: 0, width: 0, height: 0 };
var prevRect;
var editorCanvasInit = false;
function drawEditor() {
    var ctx = editorCtx;
    ctx.globalCompositeOperation = "source-over";

    // Draw the mask
    var maskRect;
    if (editorCanvasInit) {
        maskRect = [0, 0, editorCanvas.width, editorCanvas.height];
        editorCanvasInit = false;
    }
    else {
        maskRect = prevRect;
        ctx.clearRect(...maskRect);
    }
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(...maskRect);

    // Draw the crop selector
    var lw = ctx.lineWidth;
    var x = crop.x - lw/2,
        y = crop.y - lw/2,
        width = crop.width + lw,
        height = crop.height + lw;
    var cx, cy;

    ctx.strokeStyle = "#ffffff";
    if (cropShape == cropShapes.CIRCLE) {
        ctx.strokeRect(x, y, width, height);
        cx = crop.x + crop.width/2;
        cy = crop.y + crop.height/2;

        ctx.beginPath();
        ctx.arc(cx, cy, width/2 - lw/2, 0, 2 * Math.PI);
    }
    else {
        ctx.beginPath();
        ctx.rect(x, y, width, height);
    }

    // Save the path, draw the outline, then poke the hole
    ctx.save();
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000000";
    ctx.fill();

    // Draw guidelines
    if (inputs.showGuidelines.checked) {
        ctx.globalCompositeOperation = "source-over";
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = inputs.guideColor.style.backgroundColor;

        ctx.lineWidth += 1 + Math.floor((crop.width * crop.height) / 1000000);

        if (cx === undefined) {
            cx = crop.x + crop.width/2;
            cy = crop.y + crop.height/2;
        }
        var right = crop.x + crop.width;
        var bottom = crop.y + crop.height;

        ctx.beginPath();
        createLine(ctx, cx, cy, cx, crop.y); // top
        createLine(ctx, cx, cy, crop.x, cy); // left
        createLine(ctx, cx, cy, cx, bottom); // bottom
        createLine(ctx, cx, cy, right, cy);  // right
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.lineWidth = lw;
    }

    prevRect = [
        crop.x - lw,       crop.y - lw,
        crop.width + lw*2, crop.height + lw*2
    ];
}

function drawImgCanvas() {
    var ctx = imgCtx;
    ctx.clearRect(0, 0, img.width, img.height);
    ctx.fillStyle = inputs.bgColor.style.backgroundColor;
    ctx.fillRect(0, 0, img.width, img.height);

    applyFlipTransform(imgCanvas, ctx);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.resetTransform();
}

var redrawEditor = redrawFunc(drawEditor);
var redrawImgCanvas = redrawFunc(drawImgCanvas);

var pvRedrawing = false;
var pvRedrawNext = false;
async function redrawPreview() {
    if (pvRedrawing) {
        pvRedrawNext = true;
        return;
    }

    pvRedrawing = true;

    var flipH = inputs.flipH.checked;
    var flipV = inputs.flipV.checked;
    var src, isBlob;
    if (gif.isAnimated() || flipH || flipV || !(img instanceof Image)) {
        // Use the image data of the rendered ImageBitmap
        var blob = await renderPreviewImg();
        src = URL.createObjectURL(blob);
        isBlob = true;
    }
    else {
        // Load the image directly if it's not an ANIMATED gif and there are no image modifications
        // (except for background color)
        src = img.src;
    }

    let count = 0;
    for (let i = 0; i < previewImages.length; ++i) {
        var pImage = previewImages[i];
        pImage.addEventListener("load", function() {
            if (++count == previewImages.length) {
                pvRedrawing = false;
                if (isBlob) URL.revokeObjectURL(src);
                if (pvRedrawNext) {
                    pvRedrawNext = false;
                    redrawPreview();
                }
            }
        }, { once: true });

        pImage.src = src;
    }
}

var previewCanvas = document.createElement("canvas");
var previewCtx = previewCanvas.getContext("2d");
function renderPreviewImg() {
    let ctx = previewCtx;
    ctx.clearRect(0, 0, img.width, img.height);

    applyFlipTransform(previewCanvas, ctx);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.resetTransform();

    return new Promise(resolve => previewCanvas.toBlob(resolve));
}

function updatePreview() {
    for (let i = 0; i < previewImages.length; ++i) {
        let pImage = previewImages[i];
        var size = previewSizes[i];
        var sx = size/crop.width, sy = size/crop.height;
        pImage.style.left = -crop.x * sx + "px";
        pImage.style.top = -crop.y * sy + "px";
        pImage.style.width = img.width * sx + "px";
        pImage.style.height = img.height * sy + "px";
    }
}

function initPreview() {
    redrawPreview();
    updatePreview();
}

function updateImgRenders() {
    redrawImgCanvas();
    if (inputs.showPreview.checked) initPreview();
}

function getRenderPos() {
    var flipH = inputs.flipH.checked;
    var flipV = inputs.flipV.checked;
    let x = crop.x, y = crop.y;
    if (flipH) x = (img.width - crop.width) - x;
    if (flipV) y = (img.height - crop.height) - y;
    return [x, y];
}

function drawCroppedImage(canvas, ctx) {
    applyFlipTransform(canvas, ctx);
    let [x, y] = getRenderPos();
    ctx.drawImage(img,
        x, y, crop.width, crop.height, // Crop
        0, 0, crop.width, crop.height  // Placement
    );
    ctx.resetTransform();
}

function render(canvas, filter) {
    if (!canvas) canvas = renderCanvas;
    let ctx = canvas.getContext("2d");
    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.fillStyle = inputs.bgColor.style.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (filter) ctx.filter = filter;
    drawCroppedImage(canvas, ctx);
}

function saveFile(href, filename) {
    saveAnchor.href = href;
    saveAnchor.download = filename;
    saveAnchor.click();
}

function saveImage() {
    renderCanvas.toBlob(function(blob) {
        var url = URL.createObjectURL(blob);
        saveFile(url, currentName + "_cropped.png");
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 0);
    });
}

async function renderAndSaveGif() {
    var renderer = new gif.Renderer(crop.width, crop.height, { loop: Math.floor(inputs.loopCount.value) });

    var frames = gif.frames;
    var lastFrame = frames.length ? frames.length - 1 : 0;
    var start = Math.max(0, Math.min(Math.floor(inputs.startFrame.value), lastFrame));
    var length = Math.max(0, Math.min(Math.floor(inputs.endFrame.value), lastFrame)) + 1;
    var filter = imageFilters.optionsToFilter(gifFilters);

    loadingDialog.setProgress(0);
    loadingDialog.show();
    var keepColors = inputs.keepGifColors.checked;
    var speedMult = +inputs.speedMult.value;
    for (let i = start; i < length; ++i) {
        // Allow rendering static image
        let delay = 0;
        if (frames.length) {
            var frame = frames[i];
            img = frame.bitmap;
            delay = speedMult ? frame.info.delay / speedMult : 0;
        }
        render(renderCanvas, filter);

        let imageData = renderCtx.getImageData(0, 0, crop.width, crop.height);
        renderer.addFrame(imageData, { delay, keepColors });
        loadingDialog.setProgress((i + 1) / length);
    }
    
    renderer.end();
    loadingDialog.hide();
    renderCtx.filter = "none";

    var uArray = renderer.getUint8Array();
    var blob = new Blob([uArray], {type: "image/gif"});
    var url = URL.createObjectURL(blob);
    saveFile(url, currentName + "_cropped.gif");
    setTimeout(function() {
        URL.revokeObjectURL(url);
    }, 0);

    // Reload current frame
    if (frames.length) img = frames[inputs.frame.value].bitmap;
}

var isInSelection = false;
var isResizing = false;
var resizeFromLeft = false;
var resizeFromTop = false;
function checkMousePos(e) {
    if (colorPicker.isEyeDropperActive()) {
        innerBox.element.style.cursor = "default";
        return;
    }

    var rect = canvasBox.element.getBoundingClientRect();
    // canvas rect -> selection rect
    rect.x += rect.width * (crop.x / img.width);
    rect.y += rect.height * (crop.y / img.height);
    rect.width *= crop.width / img.width;
    rect.height *= crop.height / img.height;

    var cursor;
    isInSelection = isPointInRect(e.clientX, e.clientY, rect);
    if (isInSelection && !touchPinching) {
        var cx = rect.x + rect.width/2;
        var cy = rect.y + rect.height/2;
        isResizing = !isPointInCircle(e.clientX, e.clientY, cx, cy, rect.width / 2);
        if (isResizing) {
            resizeFromLeft = e.clientX < cx;
            resizeFromTop = e.clientY < cy;
            if (resizeFromTop) {
                if (resizeFromLeft) cursor = "nw-resize";
                else cursor = "ne-resize";
            }
            else {
                if (resizeFromLeft) cursor = "sw-resize";
                else cursor = "se-resize";
            }
        }
        else cursor = "move";
    }
    else cursor = "grab";

    innerBox.element.style.cursor = cursor;
}

var mouseDown = false;
var innerBoxFocused = true;
function mouseDownListener(e) {
    if (isHidden() || e.button != 0) return;
    innerBoxFocused = true;

    if (colorPicker.isEyeDropperActive()) {
        var rect = imgCanvas.getBoundingClientRect();
        var detail = { mode: "rgb" };
        if (!isPointInRect(e.clientX, e.clientY, rect)) {
            // color of the outer area...lol
            detail.color = [30, 30, 30, 255];
        }
        else {
            var x = ((e.clientX - rect.x) / rect.width) * imgCanvas.width;
            var y = ((e.clientY - rect.y) / rect.height) * imgCanvas.height;
            var imageData = imgCtx.getImageData(x, y, 1, 1);
            detail.color = imageData.data;
        }

        imgCanvas.dispatchEvent(new CustomEvent("eyedrop", { detail }));
    }

    checkMousePos(e);
    if (!isInSelection)
        innerBox.element.style.cursor = "grabbing";

    mouseDown = true;
}

function unfocusInnerBox() {
    innerBoxFocused = false;
}

var prevX = null, prevY = null;
function mouseMoveListener(e) {
    if (isHidden()) return;
    if (!mouseDown) {
        checkMousePos(e);
        return;
    }

    if (prevX != null && prevY != null) {
        var dx = e.clientX - prevX;
        var dy = e.clientY - prevY;

        var ratio = inputs.scaleDevicePixel.checked ? 1 : devicePixelRatio;
        var scale = canvasScale / ratio;

        if (e.shiftKey) {
            // = 1 pixel
            dx = scale * Math.sign(dx);
            dy = scale * Math.sign(dy);
        }
        
        if (isInSelection) {
            dx = Math.round(dx / scale);
            dy = Math.round(dy / scale);

            var px = crop.x, py = crop.y;
            var xSign = (resizeFromLeft ? -1 : 1);
            var ySign = (resizeFromTop ? -1 : 1);
            if (isResizing) {
                var width = crop.width, height = crop.height;
                if (cropShape == cropShapes.FREEFORM) {
                    width += dx * xSign;
                    height += dy * ySign;
                    if (resizeFromLeft) {
                        px += dx;
                        if (px < 0) {
                            width += px;
                            px = 0;
                        }
                    }
                    if (resizeFromTop) {
                        py += dy;
                        if (py < 0) {
                            height += py;
                            py = 0;
                        }
                    }
                }
                else {
                    var delta = (Math.abs(dx) > Math.abs(dy)) ? dx * xSign : dy * ySign;
                    var hDelta = delta * xSign,
                        vDelta = delta * ySign;
                    let left = px + hDelta,
                        top = py + vDelta,
                        right = left + width + delta,
                        bottom = top + height + delta;
                    
                    var d = 0;

                    if (!inputs.allowOffscreen.checked) {
                        if (resizeFromLeft && left < 0) d = -left;
                        if (resizeFromTop && top < 0) d = -top;

                        if (right > img.width) d = right - img.width - hDelta;
                        if (bottom > img.height) d = bottom - img.height - vDelta;
                    }

                    if (d) delta = (d > delta ? 0 : delta - d);

                    width = height += delta;
                    if (resizeFromLeft) px += delta * xSign;
                    if (resizeFromTop) py += delta * ySign;
                }

                if (resizeFromLeft && width < 10)
                    px -= 10 - width;
                
                if (resizeFromTop && height < 10)
                    py -= 10 - height;

                // Set the crop positions first so setCropSize could clamp the values correctly
                crop.x = px; crop.y = py;
                setCropSize(width, height);
                setCropPosition(px, py);
            }
            else {
                px += dx;
                py += dy;
                setCropPosition(px, py);
            }
            
            redrawEditor();
            if (inputs.showPreview.checked) updatePreview();
        }
        else {
            setCanvasMargins(canvasX + dx, canvasY + dy);
        }
    }
    prevX = e.clientX;
    prevY = e.clientY;
}

function mouseUpListener(e) {
    if (isHidden() || e.button != 0) return;
    checkMousePos(e);
    mouseDown = false;
    prevX = prevY = null;
    isInSelection = false;
}

function wheelListener(e) {
    if (isHidden()) return;
    var incr = 0.1;
    if (e.deltaY > 0)
        incr = -incr;

    setCanvasScale(canvasScale + incr);
}

var touchPinching = false;
function touchStartListener(e) {
    touchToMouseEvent.call(this, e);
    if (e.touches.length >= 2) {
        touchPinching = true;
        prevTouchDist = getTouchDist(e.touches[0], e.touches[1]);
        isInSelection = false;
    }
}

var prevTouchDist;
function touchMoveListener(e) {
    if (touchPinching) {
        var dist = getTouchDist(e.touches[0], e.touches[1]);
        var diff = dist - prevTouchDist;
        setCanvasScale(canvasScale + diff/200);
        prevTouchDist = dist;
    }
}

function touchEndListener(e) {
    if (touchPinching && e.touches.length < 2)
        touchPinching = false;
}

function keyDownListener(e) {
    if (!innerBoxFocused) return;
    var code;
    if (e.code) code = e.code;
    else {
        switch (e.keyCode) {
            case 38: code = "ArrowUp";    break;
            case 40: code = "ArrowDown";  break;
            case 37: code = "ArrowLeft";  break;
            case 39: code = "ArrowRight"; break;
            default: return;
        }
    }

    var incr = e.shiftKey ? 2 : 1;
    switch (code) {
        case "ArrowUp":
            incr = -incr;
            /* fallthrough */

        case "ArrowDown": 
            e.ctrlKey ? setCropSize(crop.width, crop.height + incr, incr > 0) : setCropPosition(crop.x, crop.y + incr);
            break;

        case "ArrowLeft":
            incr = -incr;
            /* fallthrough */

        case "ArrowRight":
            e.ctrlKey ? setCropSize(crop.width + incr, crop.height, incr > 0) : setCropPosition(crop.x + incr, crop.y);
            break;

        default: return;
    }
    redrawEditor();
    if (inputs.showPreview.checked) updatePreview();
}

var editor = {
    init, open, show, hide
}
export default editor;