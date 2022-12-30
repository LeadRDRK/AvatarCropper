function whichTransitionEnd() {
    var t;
    var el = document.createElement('x');
    var transitions = {
      'transition': 'transitionend',
      'OTransition': 'oTransitionEnd',
      'MozTransition': 'transitionend',
      'WebkitTransition': 'webkitTransitionEnd'
    }

    for (t in transitions) {
        if (el.style[t] !== undefined) {
            return transitions[t];
        }
    }
}
var transitionend = whichTransitionEnd();
export default transitionend;