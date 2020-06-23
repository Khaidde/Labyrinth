const LMath = {
	lerp: function(x0, x1, percent) {
		Math.max(Math.min(percent, 1.0), 0.0);
		return x0 + (x1 - x0) * percent;
	}
}

module.exports = LMath;
