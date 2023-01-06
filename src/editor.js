import loadingDialog from "./loading-dialog.js";
import pbfe from "./pbfe.js";
import toast from "./toast.js";
import welcomeScreen from "./welcome-screen.js";
import { GifReader, GifWriter } from "./omggif.js";
import { _ } from "./i18n.js";

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

function initInnerBox() {
    innerBox = new pbfe.Flexbox;
    innerBox.element.id = "editorInnerBox";
    innerBox.element.style.cursor = "grab";
    box.appendChild(innerBox);

    canvas = new pbfe.Canvas;
    canvas.element.id = "editorCanvas";
    innerBox.appendChild(canvas);

    ctx = canvas.getContext("2d");
    ctx.translate(0.5, 0.5);

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

    var circleBtn = new pbfe.Button(_("Circle"));
    circleBtn.element.classList.add("menuBtn", "split", "chosen");
    menuBox.appendChild(circleBtn);

    var squareBtn = new pbfe.Button(_("Square"));
    squareBtn.element.classList.add("menuBtn", "split");
    menuBox.appendChild(squareBtn);

    var freeformBtn = new pbfe.Button(_("Freeform"));
    freeformBtn.element.classList.add("menuBtn");
    menuBox.appendChild(freeformBtn);

    /* Viewport */
    menuBox.appendChild(createSectionTitle(_("Viewport")));
    menuBox.appendChild(createMenuInput("zoom", _("Zoom"), true, "range"));
    menuBox.appendChild(createMenuInput("scaleDevicePixel", _("Scale to device pixel"), true, "checkbox"));

    var fitBtn = new pbfe.Button(_("Fit image to viewport"));
    fitBtn.element.classList.add("menuBtn");
    menuBox.appendChild(fitBtn);

    menuBox.appendChild(createMenuInput("showPreview", _("Show preview"), true, "checkbox"));
    inputs.showPreview.checked = true;

    /* Save */
    menuBox.appendChild(createSectionTitle(_("Save")));

    var saveBtn = new pbfe.Button(_("Save image..."));
    saveBtn.element.classList.add("menuBtn");
    menuBox.appendChild(saveBtn);

    var saveGifBtn = new pbfe.Button(_("Save as GIF..."));
    saveGifBtn.element.classList.add("menuBtn");
    menuBox.appendChild(saveGifBtn);

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
            hideBtn.text = _("Hide panel");
        }
        else {
            innerStyle.width = "100%";
            innerStyle.height = "100%";
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

    var zoomInput = inputs.zoom;
    zoomInput.min = 10;
    zoomInput.max = 800;
    zoomInput.value = canvasScale;
    zoomInput.setAttribute("list", "zoomDetents");
    zoomInput.addEventListener("input", function() {
        setCanvasScale(zoomInput.value / 100);
    });

    var zoomDetents = document.createElement("datalist");
    zoomDetents.id = "zoomDetents";
    var values = [50, 100, 200, 400];
    for (let i = 0; i < values.length; ++i) {
        let option = document.createElement("option");
        option.value = values[i];
        zoomDetents.appendChild(option);
    }
    document.body.appendChild(zoomDetents);

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
        if (gifFrames.length) {
            var value = inputs.frame.value;
            loadGifFrame(value).then(redrawCanvas);
            showNotification(_("Frame: ") + value);
        }
    });

    saveBtn.addEventListener("click", renderAndSaveImage);
    saveGifBtn.addEventListener("click", showGifOptions);
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
    gifOptionsDialog.appendChild(createMenuInput("keepGifColors", _("Keep original colors"), true, "checkbox"));

    inputs.startFrame.value = 0;
    inputs.endFrame.value = 0;
    inputs.loopCount.value = 0;

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

var gifFrames = [];
function loadGif(file) {
    var reader = new FileReader;
    reader.readAsArrayBuffer(file);

    reader.onloadend = function() {
        if (reader.error) {
            toast.show(_("Failed to load GIF frames."));
            return;
        }

        var view = new Uint8Array(reader.result);
        var gifReader;
        try {
            gifReader = new GifReader(view);
        }
        catch (e) {
            toast.show(_("Failed to load GIF frames: ") + e.message);
            return;
        }

        var { width, height } = gifReader;
        gifCanvas.width = width;
        gifCanvas.height = height;
        inputs.loopCount.value = gifReader.loopCount();

        var lastNoDisposeFrame;
        var clearBg;
        for (let i = 0; i < gifReader.numFrames(); ++i) {
            const info = gifReader.frameInfo(i);
            let inheritFrame;
            if (!clearBg) {
                if (info.disposal == 3)
                    inheritFrame = lastNoDisposeFrame;
                else if (info.disposal != 0 && i > 0)
                    inheritFrame = gifFrames[i - 1].imageData;
            }
            else clearBg = false;
            
            let imageData;
            if (inheritFrame)
                imageData = new ImageData(new Uint8ClampedArray(inheritFrame.data), width, height);
            else
                imageData = gifCtx.createImageData(width, height);

            gifReader.decodeAndBlitFrameRGBA(i, imageData.data);
            
            if (info.disposal == 0)
                lastNoDisposeFrame = imageData;
            else if (info.disposal == 2)
                clearBg = true;

            gifFrames[i] = { info, imageData };
        }

        var lastFrame = gifReader.numFrames() - 1;
        inputs.frame.min = 0;
        inputs.frame.max = lastFrame;
        inputs.frame.value = 0;
        inputs.frame.disabled = false;
        inputs.endFrame.value = lastFrame;
        inputs.keepGifColors.checked = true;
    }
}

var gifCanvas = document.createElement("canvas");
var gifCtx = gifCanvas.getContext("2d");
function loadGifFrame(frameNum) {
    return new Promise(resolve => {
        gifCtx.clearRect(0, 0, gifCanvas.width, gifCanvas.height);
        gifCtx.putImageData(gifFrames[frameNum].imageData, 0, 0);
        img.src = gifCanvas.toDataURL();
        img.addEventListener("load", resolve, { once: true });
    });
}

var usingObjectUrl = false;
var currentName;
function open(src, successCb) {
    if (usingObjectUrl) {
        URL.revokeObjectURL(img.src);
        usingObjectUrl = false;
    }
    if (gifFrames.length) {
        gifFrames = [];
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
        if (src.type == "image/gif") loadGif(src);
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
    width = Math.max(10, Math.min(width, img.width - cropX));
    height = Math.max(10, Math.min(height, img.height - cropY));

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
    scale = Math.max(0.1, Math.min(scale, 8));
    canvasScale = scale;
    canvas.element.style.transform = "scale(" + (canvasScale / ratio) + ")";
    inputs.zoom.value = Math.round(scale * 100);
    showNotification(_("Zoom: ") + (Math.round(scale * 1000)/10) + "%");
}

var cropX = 0, cropY = 0, cropWidth = 0, cropHeight = 0;
function draw() {
    var canvasEl = canvas.element;
    ctx.resetTransform();
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.globalCompositeOperation = "source-over";

    // Draw the shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

    // Draw the crop selector
    var x = cropX - 1,
        y = cropY - 1,
        width = cropWidth + 1,
        height = cropHeight + 1;

    ctx.strokeStyle = "#ffffff";
    ctx.translate(0.5, 0.5);
    if (cropShape == cropShapes.CIRCLE) {
        ctx.strokeRect(x, y, width, height);
        var cx = cropX + cropWidth/2 - 0.5,
            cy = cropY + cropHeight/2 - 0.5;

        ctx.beginPath();
        ctx.arc(cx, cy, cropWidth/2 + 0.5, 0, 2 * Math.PI);
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

    // Draw image behind crop selector and shadow
    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);

    if (inputs.showPreview.checked) {
        for (let i = 0; i < previewCanvases.length; ++i) {
            let canvas = previewCanvases[i];
            let ctx = canvas.getContext("2d");

            canvas.width = cropWidth;
            canvas.height = cropHeight;
            ctx.drawImage(img, -cropX, -cropY, img.width, img.height);
        }
    }
}

function redrawCanvas() {
    window.requestAnimationFrame(draw);
}

function render() {
    renderCanvas.width = cropWidth;
    renderCanvas.height = cropHeight;
    renderCtx.drawImage(img, -cropX, -cropY, img.width, img.height);
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
    var buf = [];
    var writer = new GifWriter(buf, cropWidth, cropHeight, { loop: Math.floor(inputs.loopCount.value) });

    var lastFrame = gifFrames.length ? gifFrames.length - 1 : 0;
    var start = Math.max(0, Math.min(Math.floor(inputs.startFrame.value), lastFrame));
    var length = Math.max(0, Math.min(Math.floor(inputs.endFrame.value), lastFrame)) + 1;

    loadingDialog.setProgress(0);
    loadingDialog.show();
    for (let i = start; i < length; ++i) {
        // Allow rendering static image
        let delay = 0;
        if (gifFrames.length) {
            await loadGifFrame(i);
            delay = gifFrames[i].info.delay;
        }
        render();

        let imageData = renderCtx.getImageData(0, 0, cropWidth, cropHeight);
        let palette = [];
        let indexedPixels = [];
        createGifFrame(imageData.data, palette, indexedPixels);

        writer.addFrame(0, 0, cropWidth, cropHeight, indexedPixels, {
            palette, delay, transparent: 0, disposal: 2
        });

        loadingDialog.setProgress((i + 1) / length);
    }
    
    writer.end();
    loadingDialog.hide();

    var uArray = Uint8Array.from(buf);
    var blob = new Blob([uArray], {type: "image/gif"});
    var url = URL.createObjectURL(blob);
    saveFile(url, currentName + "_cropped.gif");
    setTimeout(function() {
        URL.revokeObjectURL(url);
    }, 0);

    // Reload current frame
    if (gifFrames.length) loadGifFrame(inputs.frame.value);
}

function createGifFrame(px, palette, indexedPixels) {
    var keepGifColors = inputs.keepGifColors.checked;
    palette.push(0); // transparent
    for (let i = 0; i < px.length; i += 4) {
        let r = px[i];
        let g = px[i+1];
        let b = px[i+2];
        let a = px[i+3];

        if (a == 0) {
            indexedPixels.push(0);
            continue;
        }

        let rgb = ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
        let index, lastDiff = null;
        for (let x = 1; x < palette.length; ++x) {
            // Find color in palette
            let prgb = palette[x];
            if (prgb == rgb) {
                index = x;
                lastDiff = null;
                break;
            }

            // Check if color is close
            if (!keepGifColors || palette.length == 256) {
                let pr = (prgb >> 16) & 0xff;
                let pg = (prgb >> 8) & 0xff;
                let pb = prgb & 0xff;
                let diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
                if (lastDiff == null || diff < lastDiff) {
                    index = x;
                    lastDiff = diff;
                }
            }
        }
        // Exponentially increase tolerance
        var tolerance = 15 + (40 * Math.pow(2, 10 * (palette.length / 256) - 10));
        if (palette.length != 256 && lastDiff > tolerance)
            index = null;

        if (!index)
            index = palette.push(rgb) - 1;
        
        indexedPixels.push(index);
    }

    if (palette.length == 256) return;
    // Palette length needs to be a power of 2
    // We do a *bit* of twiddling
    let v = palette.length; // max is 256 = 8 bits
    --v;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    ++v;

    // Pad extra values
    let needed = v - palette.length;
    for (let i = 0; i < needed; ++i)
        palette.push(0);
}

var mouseDown = false;
var isInSelection = false;
var isResizing = false;
var resizeFromLeft = false;
var resizeFromTop = false;
function mouseDownListener(e) {
    if (e.button != 0) return;
    
    var rect = canvas.element.getBoundingClientRect();
    // canvas rect -> selection rect
    rect.x += rect.width*(cropX/img.width);
    rect.y += rect.height*(cropY/img.height);
    rect.width *= cropWidth/img.width;
    rect.height *= cropHeight/img.height;

    var cursor;
    if (isPointInRect(e.clientX, e.clientY, rect)) {
        isInSelection = true;
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
    else cursor = "grabbing";

    innerBox.element.style.cursor = cursor;
    mouseDown = true;
}

var prevX = null, prevY = null;
function mouseMoveListener(e) {
    if (!mouseDown) return;

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
    innerBox.element.style.cursor = "grab";
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