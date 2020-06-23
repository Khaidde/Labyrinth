const LMath = {
	lerp: function(x0, x1, percent) {
		var p = LMath.clamp(percent, 0.0, 1.0);
		return x0 + (x1 - x0) * p;
	},
	clamp: function(value, min, max) {
		return Math.max(Math.min(value, max), min);
	}
}

module.exports = LMath;
