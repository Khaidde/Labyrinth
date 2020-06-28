const Utils = {
	bind: function(scope, fn) {
		return function onEvent() {
			fn.apply(scope, arguments);
		};
	}
}

module.exports = Utils;
