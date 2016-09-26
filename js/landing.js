/** RBI: landing.js v2.1 */

'use strict';

function LandingPage(rbApp, Velocity) {
	this.config = {};
	this.getConfig();
	this.$introduction = $('section.introduction');
}

LandingPage.prototype = {
	init: function () {
		rbApp.populateContact(this);
		rbApp.socialMediaLinks(this);
		touchScroll();

		// Draw example graph
		this.graph = new CircleGraph($('.graph-container.example'));
		$('.graph-container.example').find('.circle-graph-container').addClass('unready unready-color');
		this.graph.setLine(this.config.landing.graph_percentage, 1000);
		this.graph.setPercentage(this.config.landing.graph_percentage);
		this.graph.setInnerLabel(this.config.landing.graph_inner_label, 'strong');
		$('.graph-outer-label').html(this.config.landing.graph_outer_label);
		Velocity(this.graph.innerLabel, "transition.slideUpIn", {duration: 1000});

		// Clone this h1 element for page layout reasons - tablet & desktop
		this.$introduction.find('h1').clone().prependTo(this.$introduction.find('.left-col')).addClass('desktop-only');
	},

	getConfig: function() {
		var that = this,
			url = './js/config/',
			fail = false;

		$.when(
			$.getJSON(url + 'landing.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
			$.getJSON(url + 'contact.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'social_links.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		})
	  	).then(function() {
	  		if (fail=== false) {
	  			that.init();
	  		} else {
	  			$('html').addClass('error');
	  		}
	  	});
	}
};

$(document).ready(function(){
	var lp = new LandingPage(window.rbApp, window.Velocity);
});
