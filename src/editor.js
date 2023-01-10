import loadingDialog from "./loading-dialog.js";
import pbfe from "./pbfe.js";
import toast from "./toast.js";
import welcomeScreen from "./welcome-screen.js";
import { _ } from "./i18n.js";
import gif from "./gif.js";

var container, box;
var innerBox, canvas, ctx;
var menuBox, inputs = {};
var notifBox;
var img = new Image;
var renderCanvas, renderCtx;
var previewBox, previewCanvases = [];
var saveAnchor = document.createElement("a");
var gifOptionsDialog;

var cropShapes = {
    CIRCLE: 1,
    SQUARE: 2,
    FREEFORM: 3
};
var cropShape = cropShapes.CIRCLE;

function init(_container) {
    container = _container;

    box = new pbfe.Flexbox;
    box.element.id = "editorBox";
    box.element.classList.add("hide");

    initInnerBox();
    initMenuBox();
    initNotifBox();
    initGifOptions();

    innerBox.addEventListener("mousedown", mouseDownListener);
    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener("mouseup", mouseUpListener);
    document.addEventListener("blur", mouseUpListener);
    innerBox.addEventListener("wheel", wheelListener);

    if ("ontouchstart" in document) {
        innerBox.addEventListener("touchstart", touchToMouseEvent, true);
        document.addEventListener("touchmove", touchToMouseEvent, true);
        document.addEventListener("touchend", touchToMouseEvent, true);

        innerBox.addEventListener("touchstart", touchStartListener);
        document.addEventListener("touchmove", touchMoveListener);
        document.addEventListener("touchend", touchEndListener);
    }

    document.addEventListener("keydown", keyDownListener);

    renderCanvas = document.createElement("canvas");
    renderCtx = renderCanvas.getContext("2d", { willReadFrequently: true });
}

function initInnerBox() {
    innerBox = new pbfe.Flexbox;
    innerBox.element.id = "editorInnerBox";
    innerBox.element.style.cursor = "grab";
    box.appendChild(innerBox);

    canvas = new pbfe.Canvas;
    canvas.element.id = "editorCanvas";
    innerBox.appendChild(canvas);

    ctx = canvas.getContext("2d");
    ctx.lineWidth = 1;

    var fullscreenBtn = new pbfe.Button("⛶");
    fullscreenBtn.element.classList.add("fullscreenBtn");
    fullscreenBtn.element.title = _("Toggle fullscreen");
    innerBox.appendChild(fullscreenBtn);

    fullscreenBtn.addEventListener("click", function() {
        if (document.fullscreenElement)
            document.exitFullscreen();
        else
            document.body.requestFullscreen();
    });

    previewBox = new pbfe.Widget;
    previewBox.element.id = "previewBox";

    for (let i = 0; i < 3; ++i) {
        let c = document.createElement("canvas");
        c.classList.add("image" + i);
        previewBox.element.appendChild(c);
        previewCanvases.push(c);
    }

    innerBox.appendChild(previewBox);
}

function initMenuBox() {
    menuBox = new pbfe.Flexbox;
    menuBox.element.id = "editorMenu";
    box.appendChild(menuBox);

    /* Save */
    menuBox.appendChild(createSectionTitle(_("Save")));

    var saveBtn = new pbfe.Button(_("Save image..."));
    saveBtn.element.classList.add("menuBtn");
    menuBox.appendChild(saveBtn);

    var saveGifBtn = new pbfe.Button(_("Save as GIF..."));
    saveGifBtn.element.classList.add("menuBtn");
    menuBox.appendChild(saveGifBtn);

    /* Crop Area */
    menuBox.appendChild(createSectionTitle(_("Crop Area")));
    menuBox.appendChild(createMenuInput("width", _("Width")));
    menuBox.appendChild(createMenuInput("height", _("Height")));
    menuBox.appendChild(createMenuInput("xPos", _("X Pos")));
    menuBox.appendChild(createMenuInput("yPos", _("Y Pos")));
    menuBox.appendChild(createMenuInput("frame", _("Frame"), true, "range"));
    inputs.frame.value = 0;
    inputs.frame.disabled = true;

    /* Crop Shape */
    menuBox.appendChild(createSectionTitle(_("Crop Shape")));

    var circleBtn = createMenuButton(_("Circle"), true, true);
    menuBox.appendChild(circleBtn);

    var squareBtn = createMenuButton(_("Square"), true);
    menuBox.appendChild(squareBtn);

    var freeformBtn = createMenuButton(_("Freeform"));
    menuBox.appendChild(freeformBtn);

    menuBox.appendChild(createMenuInput("showGuidelines", _("Show guidelines"), true, "checkbox"));

    /* Image */
    menuBox.appendChild(createSectionTitle(_("Image")));

    menuBox.appendChild(createMenuInput("flipH", _("Flip horizontally"), true, "checkbox"));
    menuBox.appendChild(createMenuInput("flipV", _("Flip vertically"), true, "checkbox"));

    /* Viewport */
    menuBox.appendChild(createSectionTitle(_("Viewport")));
    menuBox.appendChild(createMenuInput("zoom", _("Zoom"), true, "range"));
    menuBox.appendChild(createMenuInput("scaleDevicePixel", _("Scale to device pixel"), true, "checkbox"));

    var fitBtn = new pbfe.Button(_("Fit image to viewport"));
    fitBtn.element.classList.add("menuBtn");
    menuBox.appendChild(fitBtn);

    menuBox.appendChild(createMenuInput("showPreview", _("Show preview"), true, "checkbox"));
    inputs.showPreview.checked = true;

    /* Other */
    var returnBtn = new pbfe.Button(_("Open another image"));
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
        var value = parseInputValue(this);
        if (!value || value < 10) return;
        cropWidth = value;
        if (cropShape != cropShapes.FREEFORM) {
            inputs.height.value = value;
            cropHeight = value;
        }
        setCropSize(cropWidth, cropHeight);
        redrawCanvas();
    });

    inputs.height.addEventListener("input", function() {
        var value = parseInputValue(this);
        if (!value || value < 10) return;
        cropHeight = value;
        if (cropShape != cropShapes.FREEFORM) {
            inputs.width.value = value;
            cropWidth = value;
        }
        setCropSize(cropWidth, cropHeight);
        redrawCanvas();
    });

    inputs.xPos.addEventListener("input", function() {
        var value = parseInputValue(this);
        if (value === undefined) return;
        setCropPosition(value, cropY);
        redrawCanvas();
    });

    inputs.yPos.addEventListener("input", function() {
        var value = parseInputValue(this);
        if (value === undefined) return;
        setCropPosition(cropX, value);
        redrawCanvas();
    });

    prevShapeBtn = circleBtn.element;
    addShapeBtnHandler(circleBtn, cropShapes.CIRCLE);
    addShapeBtnHandler(squareBtn, cropShapes.SQUARE);
    addShapeBtnHandler(freeformBtn, cropShapes.FREEFORM);

    inputs.showGuidelines.addEventListener("change", redrawCanvas);

    inputs.flipH.addEventListener("change", redrawCanvas);
    inputs.flipV.addEventListener("change", redrawCanvas);

    var zoomDetents = createRangeDetents("zoomDetents", [50, 100, 200, 400]);
    var zoomInput = inputs.zoom;
    zoomInput.min = 10;
    zoomInput.max = 800;
    zoomInput.value = canvasScale;
    zoomInput.setAttribute("list", zoomDetents);
    zoomInput.addEventListener("input", function() {
        setCanvasScale(zoomInput.value / 100);
    });

    inputs.scaleDevicePixel.addEventListener("change", function() {
        setCanvasScale(canvasScale);
    });

    fitBtn.addEventListener("click", function() {
        fitImageToViewport();
    });

    inputs.showPreview.addEventListener("change", function(e) {
        if (e.currentTarget.checked) {
            previewBox.element.style.display = "block";
            redrawPreview();
        }
        else
            previewBox.element.style.display = "none";
    });

    inputs.frame.addEventListener("input", function() {
        if (gif.hasFrames()) {
            var value = inputs.frame.value;
            gif.loadFrame(img, value).then(redrawCanvas);
            showNotification(_("Frame: ") + value);
        }
    });

    saveBtn.addEventListener("click", renderAndSaveImage);
    saveGifBtn.addEventListener("click", showGifOptions);
}

function createSectionTitle(text) {
    var title = new pbfe.Label(text);
    title.element.classList.add("sectionTitle");
    return title;
}

function createMenuInput(name, labelText, flex, inputType) {
    if (!labelText) labelText = name;
    var label = new pbfe.Label(labelText);
    label.element.classList.add("menuInputBox");
    if (!flex) label.element.classList.add("split");

    var input = new pbfe.Input(inputType ? inputType : "text");
    label.appendChild(input);

    inputs[name] = input.element;
    return label;
}

var prevShapeBtn;
function addShapeBtnHandler(button, value) {
    button.addEventListener("click", function() {
        if (cropShape == value) return;
        cropShape = value;
        if (value != cropShapes.FREEFORM)
            setCropSize(cropWidth, cropWidth);

        this.classList.add("chosen");
        prevShapeBtn.classList.remove("chosen");
        prevShapeBtn = this;
        redrawCanvas();
    });
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

function createRangeDetents(id, values) {
    var detents = document.createElement("datalist");
    detents.id = id;
    for (let i = 0; i < values.length; ++i) {
        let option = document.createElement("option");
        option.value = values[i];
        detents.appendChild(option);
    }
    document.body.appendChild(detents);
    return id;
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
    gifOptionsDialog.appendChild(createMenuInput("startFrame", _("Start frame"), true, "number"));
    gifOptionsDialog.appendChild(createMenuInput("endFrame", _("End frame"), true, "number"));
    gifOptionsDialog.appendChild(createMenuInput("loopCount", _("Loop count"), true, "number"));
    gifOptionsDialog.appendChild(createMenuInput("speedMult", _("Speed multiplier"), true, "number"));
    gifOptionsDialog.appendChild(createMenuInput("keepGifColors", _("Keep original colors"), true, "checkbox"));

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
        hideGifOptions();
        renderAndSaveGif();
    });

    var cancelBtn = new pbfe.Button(_("Cancel"));
    gifOptionsDialog.appendButton(cancelBtn);
    cancelBtn.addEventListener("click", hideGifOptions);

    container.appendChild(gifOptionsDialog);
}

function showGifOptions() {
    gifOptionsDialog.show();
}

function hideGifOptions() {
    gifOptionsDialog.hide();
}

function dispatchFinishEvent(success) {
    var finishEv = new CustomEvent("finish", {detail: success});
    img.dispatchEvent(finishEv);
    removeImgListeners();
}

function imgLoadListener() {
    dispatchFinishEvent(true);
}

function imgErrorListener() {
    dispatchFinishEvent(false);
}

function addImgListeners() {
    img.addEventListener("load", imgLoadListener);
    img.addEventListener("error", imgErrorListener);
}

function removeImgListeners() {
    img.removeEventListener("load", imgLoadListener);
    img.removeEventListener("error", imgErrorListener);
}

var usingObjectUrl = false;
var currentName;
function open(src, successCb) {
    if (usingObjectUrl) {
        URL.revokeObjectURL(img.src);
        usingObjectUrl = false;
    }
    if (gif.reset()) {
        inputs.frame.value = 0;
        inputs.frame.disabled = true;
        inputs.startFrame.value = 0;
        inputs.endFrame.value = 0;
        inputs.loopCount.value = 0;
        inputs.keepGifColors.checked = false;
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
        if (src == img.src) {
            show();
            reset();
            successCb();
            loadingDialog.hide();
            return;
        }
        currentName = src.slice(src.lastIndexOf("/") + 1, src.lastIndexOf("."));
    }

    addImgListeners();
    img.addEventListener("finish", function listener(e) {
        var success = e.detail;
        if (success) {
            loadingDialog.setProgress(1);

            canvas.element.width = img.width;
            canvas.element.height = img.height;

            show();
            reset();
            successCb();
        }
        else toast.show(_("Failed to load image."));
        loadingDialog.hide();
        img.removeEventListener("finish", listener);
    });
    img.src = src;
}

function show() {
    setTimeout(function() { box.element.classList.remove("hide"); }, 0);
    container.appendChild(box);
}

function hide() {
    box.element.classList.add("hide");
    container.removeChildAfterTransition(box);
}

function reset() {
    fitImageToViewport();
    resetCropArea();

    inputs.flipH.checked = inputs.flipV.checked = false;
    redrawCanvas();
}

function resetCropArea() {
    var s = Math.floor((img.width < img.height ? img.width : img.height) * 0.5);
    s -= s % 10;
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
    x = Math.max(0, Math.min(x, img.width - cropWidth));
    y = Math.max(0, Math.min(y, img.height - cropHeight));

    cropX = x;
    cropY = y;
    inputs.xPos.value = x;
    inputs.yPos.value = y;
}

function setCropSize(width, height, preferHigher) {
    var min = (img.width < 50 || img.height < 50) ? 1 : 10;
    width = Math.max(min, Math.min(width, img.width - cropX));
    height = Math.max(min, Math.min(height, img.height - cropY));

    if (cropShape != cropShapes.FREEFORM) {
        if (preferHigher ? width > height : width < height) height = width;
        else width = height;
    }
    cropWidth = width;
    cropHeight = height;
    inputs.width.value = width;
    inputs.height.value = height;
}

var canvasX = 0, canvasY = 0;
function setCanvasMargins(x, y) {
    canvasX = x;
    canvasY = y;

    var canvasEl = canvas.element;
    canvasEl.style.marginLeft = canvasX + "px";
    canvasEl.style.marginTop  = canvasY + "px";
}

var canvasScale = 1;
function setCanvasScale(scale) {
    var ratio = inputs.scaleDevicePixel.checked ? 1 : devicePixelRatio;
    scale = Math.round(Math.max(0.1, Math.min(scale, 8)) * 1000) / 1000;
    var realScale = scale / ratio;
    canvas.element.style.transform = "scale(" + realScale.toFixed(3) + ")";
    inputs.zoom.value = Math.round(scale * 100);

    var newLineWidth = Math.ceil(Math.max(1, 1 / (realScale * devicePixelRatio)));
    if (newLineWidth != ctx.lineWidth) {
        ctx.lineWidth = newLineWidth;
        redrawCanvas();
    }

    var mScale = scale / canvasScale;
    setCanvasMargins(canvasX * mScale, canvasY * mScale);

    canvasScale = scale;
    showNotification(_("Zoom: ") + (+(scale*100).toFixed(1)) + "%");
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
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

var cropX = 0, cropY = 0, cropWidth = 0, cropHeight = 0;
function draw() {
    var canvasEl = canvas.element;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.globalCompositeOperation = "source-over";

    // Draw the shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

    // Draw the crop selector
    var lw = ctx.lineWidth;
    var x = cropX - lw/2,
        y = cropY - lw/2,
        width = cropWidth + lw,
        height = cropHeight + lw;

    ctx.strokeStyle = "#ffffff";
    if (cropShape == cropShapes.CIRCLE) {
        ctx.strokeRect(x, y, width, height);
        let cx = cropX + width/2;
        let cy = cropY + height/2;

        ctx.beginPath();
        var hlw = lw/2;
        ctx.arc(cx - hlw, cy - hlw, width/2 - hlw, 0, 2 * Math.PI);
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
        ctx.strokeStyle = "#ffff00";

        let cx = cropX + cropWidth/2;
        let cy = cropY + cropHeight/2;
        let right = cropX + cropWidth;
        let bottom = cropY + cropHeight;

        drawLine(cx, cy, cx, cropY); // top
        drawLine(cx, cy, cropX, cy); // left
        drawLine(cx, cy, cx, bottom); // bottom
        drawLine(cx, cy, right, cy); // right

        ctx.setLineDash([]);
    }

    // Draw image behind crop selector and shadow
    ctx.globalCompositeOperation = "destination-over";
    applyFlipTransform(canvasEl, ctx);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    ctx.resetTransform();

    if (inputs.showPreview.checked) {
        for (let i = 0; i < previewCanvases.length; ++i) {
            let canvas = previewCanvases[i];
            let ctx = canvas.getContext("2d");

            canvas.width = cropWidth;
            canvas.height = cropHeight;
            applyFlipTransform(canvas, ctx);

            let [x, y] = getRenderPos();
            ctx.drawImage(img, x, y, img.width, img.height);
            ctx.resetTransform();
        }
    }
}

function redrawCanvas() {
    window.requestAnimationFrame(draw);
}

function getRenderPos() {
    var flipH = inputs.flipH.checked;
    var flipV = inputs.flipV.checked;
    let x = -cropX, y = -cropY;
    if (flipH) x = cropX - (img.width - cropWidth);
    if (flipV) y = cropY - (img.height - cropHeight);
    return [x, y];
}

function render() {
    renderCanvas.width = cropWidth;
    renderCanvas.height = cropHeight;
    applyFlipTransform(renderCanvas, renderCtx);

    let [x, y] = getRenderPos();
    renderCtx.drawImage(img, x, y, img.width, img.height);
    renderCtx.resetTransform();
}

function saveFile(href, filename) {
    saveAnchor.href = href;
    saveAnchor.download = filename;
    saveAnchor.click();
}

function renderAndSaveImage() {
    render();
    renderCanvas.toBlob(function(blob) {
        var url = URL.createObjectURL(blob);
        saveFile(url, currentName + "_cropped.png");
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 0);
    });
}

async function renderAndSaveGif() {
    var renderer = new gif.Renderer(cropWidth, cropHeight, { loop: Math.floor(inputs.loopCount.value) });

    var frames = gif.frames;
    var lastFrame = frames.length ? frames.length - 1 : 0;
    var start = Math.max(0, Math.min(Math.floor(inputs.startFrame.value), lastFrame));
    var length = Math.max(0, Math.min(Math.floor(inputs.endFrame.value), lastFrame)) + 1;

    loadingDialog.setProgress(0);
    loadingDialog.show();
    var keepColors = inputs.keepGifColors.checked;
    var speedMult = +inputs.speedMult.value;
    for (let i = start; i < length; ++i) {
        // Allow rendering static image
        let delay = 0;
        if (frames.length) {
            await gif.loadFrame(img, i);
            delay = speedMult ? frames[i].info.delay / speedMult : 0;
        }
        render();

        let imageData = renderCtx.getImageData(0, 0, cropWidth, cropHeight);
        renderer.addFrame(imageData, { delay, keepColors });
        loadingDialog.setProgress((i + 1) / length);
    }
    
    renderer.end();
    loadingDialog.hide();

    var uArray = renderer.getUint8Array();
    var blob = new Blob([uArray], {type: "image/gif"});
    var url = URL.createObjectURL(blob);
    saveFile(url, currentName + "_cropped.gif");
    setTimeout(function() {
        URL.revokeObjectURL(url);
    }, 0);

    // Reload current frame
    if (frames.length) gif.loadFrame(img, inputs.frame.value);
}

var isInSelection = false;
var isResizing = false;
var resizeFromLeft = false;
var resizeFromTop = false;
function checkMousePos(e) {
    var rect = canvas.element.getBoundingClientRect();
    // canvas rect -> selection rect
    rect.x += rect.width * (cropX / img.width);
    rect.y += rect.height * (cropY / img.height);
    rect.width *= cropWidth / img.width;
    rect.height *= cropHeight / img.height;

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
function mouseDownListener(e) {
    if (e.button != 0) return;

    checkMousePos(e);
    if (!isInSelection)
        innerBox.element.style.cursor = "grabbing";

    mouseDown = true;
}

var prevX = null, prevY = null;
function mouseMoveListener(e) {
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

            var px = cropX, py = cropY;
            var xSign = (resizeFromLeft ? -1 : 1);
            var ySign = (resizeFromTop ? -1 : 1);
            if (isResizing) {
                var width = cropWidth, height = cropHeight;
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

                    if (resizeFromLeft && left < 0) d = -left;
                    if (resizeFromTop && top < 0) d = -top;

                    if (right > img.width) d = right - img.width - hDelta;
                    if (bottom > img.height) d = bottom - img.height - vDelta;

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
                cropX = px; cropY = py;
                setCropSize(width, height);
                setCropPosition(px, py);
            }
            else {
                px += dx;
                py += dy;
                setCropPosition(px, py);
            }
            
            redrawCanvas();
        }
        else {
            setCanvasMargins(canvasX + dx, canvasY + dy);
        }
    }
    prevX = e.clientX;
    prevY = e.clientY;
}

function mouseUpListener(e) {
    if (e.button != 0) return;
    checkMousePos(e);
    mouseDown = false;
    prevX = prevY = null;
    isInSelection = false;
}

function wheelListener(e) {
    var incr = 0.1;
    if (e.deltaY > 0)
        incr = -incr;

    setCanvasScale(canvasScale + incr);
}

var currentTouchId = null;
function touchToMouseEvent(e) {
    var touches = e.changedTouches;
    var touch;
    if (currentTouchId != null) {
        for (let i = 0; i < touches.length; ++i) {
            if (touches[i].identifier == currentTouchId) {
                touch = touches[i];
                break;
            }
        }
    }

    var type = "";
    switch (e.type) {
        case "touchstart":
            if (currentTouchId != null || touches.length == 0) return;
            type = "mousedown";
            touch = touches[0];
            currentTouchId = touch.identifier;
            break;

        case "touchmove":
            type = "mousemove";
            break;
        
        case "touchend":
            if (touch) currentTouchId = null;
            type = "mouseup";
            break;

        default: return;
    }

    if (!touch) return;

    var simulatedEvent = new MouseEvent(type, {
        cancelable: true,
        view: window,
        clientX: touch.clientX,
        clientY: touch.clientY,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        button: 0,
        relatedTarget: null
    });

    this.dispatchEvent(simulatedEvent);
}

function getTouchDist(touch1, touch2) {
    return Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
}

var touchPinching = false;
function touchStartListener(e) {
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
    switch (code) {
        case "ArrowUp": 
            e.shiftKey ? setCropSize(cropWidth, cropHeight - 1) : setCropPosition(cropX, cropY - 1);
            break;

        case "ArrowDown":
            e.shiftKey ? setCropSize(cropWidth, cropHeight + 1, true) : setCropPosition(cropX, cropY + 1);
            break;

        case "ArrowLeft":
            e.shiftKey ? setCropSize(cropWidth - 1, cropHeight) : setCropPosition(cropX - 1, cropY);
            break;

        case "ArrowRight":
            e.shiftKey ? setCropSize(cropWidth + 1, cropHeight, true) : setCropPosition(cropX + 1, cropY);
            break;

        default: return;
    }
    redrawCanvas();
}

function isPointInRect(x, y, rect) {
    return (x >= rect.x && y >= rect.y &&
            x <= rect.x + rect.width && y <= rect.y + rect.height);
}

function isPointInCircle(x, y, cx, cy, radius) {
    return Math.pow(x - cx, 2) + Math.pow(y - cy, 2) < Math.pow(radius, 2);
}

var editor = {
    init, open, show, hide
}
export default editor;