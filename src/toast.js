var container;
function init(_container) {
    container = _container;
}

function show(text) {
    container.showToast(text, 3000, true);
}

var toast = {
    init,
    show
}
export default toast;