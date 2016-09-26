/** RBI: circle_graph.js v2.1 */

'use strict';

function CircleGraph(container) {
	this.init(container);
}

CircleGraph.static = {
	count: 0
};

CircleGraph.prototype = {
	constructor: CircleGraph,

	pathLength : 307.6,

	init: function(container) {
		this.container = container;

		// Increment Static property values
		CircleGraph.static.count += 1;

		// append circle graph HTML to the container element
		this.id = CircleGraph.static.count;
		this.insertGraph();

		this.circleGraph = this.container[0].querySelector('svg.circle-graph');

		this.innerLine = this.circleGraph.querySelector('path.inner-line');
		this.innerLineTrack = this.circleGraph.querySelector('path.circle-track');
		this.innerText = this.container[0].querySelector('.inner-text');
		this.innerPercent = this.innerText.querySelector('.percent');
		this.innerLabel = this.innerText.querySelector('.label');

		this.currentPercent = 0;


		// and update circle graph lines to 0
		this.innerLine.style.strokeDasharray = this.pathLength + ' ' + this.pathLength;
		this.setLine('inner', 0);
		this.innerLine.style.opacity = 0;
		this.innerLineTrack.style.opacity = 1;
	},

	insertGraph: function() {
		this.container.prepend('\
			<div class="circle-graph-container"> \
				<div class="circle-ratio-squared"></div> \
				<div class="svg-container"> \
					<div class="inner-text -vertical-center"> \
						<span class="percent"></span>\
						<span class="label"></span>\
					</div> \
					<svg class="circle-graph" viewBox="0 0 100 100" preserveAspectRatio="xMinYMin meet" class="svg-content"> \
						<svg viewBox="-4 -4 100 100" width="93" height="93">\
							<path class="circle-track" d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"></path> \
							<path class="inner-line" d="M50,1 a49,49 0 0,1 0,98 a49,49 0 0,1 0,-98"></path> \
						</svg>  \
					</svg> \
				</div> \
			</div>');
	},

	setLine: function(percent, animationSpeed) {
		var offset = this.pathLength * (percent * 0.01);

		this.innerLine.style.opacity = 1;
		this.innerLineTrack.style.opacity = 1;
		this.innerLine.style.opacity = 1;

		if (animationSpeed) {
			Velocity(this.innerLine, {
				"strokeDashoffset": [this.pathLength - offset, this.innerLine.style.strokeDashoffset]
			}, {
				easing: 'easeInOut',
				duration: animationSpeed
			});
		} else {
			this.innerLine.style.strokeDashoffset = this.pathLength - offset;
		}
	},

	setPercentage: function(percent, classString) {
		var that = this;
		classString = classString || null;

		$(this.innerPercent).css('opacity', '1');
		if (!$(this.innerPercent).hasClass(classString)) {
			$(this.innerPercent).addClass(classString);
		}

		// animate
		Velocity(this.innerPercent, 'stop');
		this.innerPercent.innerHTML = this.currentPercent + "<span>%</span>";

		Velocity(this.innerPercent, {
			tween: [percent, this.currentPercent]
		}, {
			progress: function(elements, c, r, s, t) {
				var val = Math.ceil(t);
				that.innerPercent.innerHTML = val + "<span>%</span>";
			},
			easing: 'easeOutExpo',
			duration: 1500,
			delay: 400
		});

		// store current percentage
		this.currentPercent = percent;
	},

	setInnerLabel: function(string, classString) {
		classString = classString || null;
		if (!$(this.innerLabel).hasClass(classString)) {
			$(this.innerLabel).addClass(classString);
		}
		this.innerLabel.innerHTML = string;
		this.innerLabel.style.opacity = 1;
	}
};
