'use strict';

function ReadyBusiness() {

}

ReadyBusiness.prototype = {
	constructor: ReadyBusiness,
	init: function() {
		window.Velocity = window.Velocity || $.Velocity;

		// Code smell sniggy browser agent here, but to test against transform3d is inconsistent in modernizr:
		// https://code.google.com/p/chromium/issues/detail?id=129004
		// Solution here, for simplictiy, is to add class name to html for ie10 (ie conditionals only work up to ie9)
		if(navigator.userAgent.match(/MSIE 10/)){
			var htmlEl = document.getElementsByTagName("html")[0];
			htmlEl.classList.add('ie');
			htmlEl.classList.add('ie10');
		}

		touchScroll();
	},
	equalise: function(elements, vCenterContent) {
		var boxHeight,
			tallest = 0,
			boxLabel,
			currentHeight,
			self = this,
			content,
			vCenterContent = vCenterContent || false;

		// Find tallest box
		$.each(elements, function(index, value) {
			currentHeight = $(this).height();
			$(this).height('auto');
			boxHeight = $(this).outerHeight();
			$(this).height(currentHeight);
			if (boxHeight > tallest) {
				tallest = boxHeight;
			}
		});

		// catch any equalising being done too early. Better to have unequal height boxes than zero height boxes
		if (tallest === 0) {
			return false;
		}

		// Set all boxes to this height
		$.each(elements, function(index, value) {
			if(!self.hasTouch){
				// Only add this class which adds transition for non-touch, otherwise computed value is not obtainable in ios.
				$(this).innerHeight(tallest).addClass('equalised-animated');
			}
			$(this).innerHeight(tallest).addClass('equalised');
			// Wrap label text in span to vertically center it
			if(vCenterContent) {
				content = $(this).children();
				if (!content.has('.-vertical-center').length) {
					content.wrapInner('<span class="-vertical-center"></span>');
				}
			}
		});
	},
	hasTouch: isTouchDevice(),
	repaintPage: function() {
		$('<style></style>').appendTo($(document.body)).remove();
	},
    populateContact: function(that) {
		var contactObject = $('.contact-wrapper'),
			telephoneCol,
			colsClass = ((that.config.contact.contact_groups.length === 1) ? "one-tel-group" : "");

		$.each(that.config.contact.contact_groups, function(key, telGroup) {
			telephoneCol = $(document.createElement('div')).addClass("telephone-group " + colsClass);
			$(telephoneCol).append('<p class="tel-heading">' + telGroup.title + '</p>');

			$.each(telGroup.contact_details, function(key, value) {
				$(telephoneCol).append(
					'<div class="tel-wrapper"> \
						<p class="tel-title">'+ value.title +'</p> \
						<div class="telephone-number"> \
							<div class="icon-wrapper"> \
								<small class="tel-title">' + value.title + '</small> \
								<img src="'+ value.icon +'" alt="' + value.title + '" /> \
							</div> \
							<div class="tel">'+ value.contact_detail +'</div> \
						</div> \
					</div>'
				);
			});
			$(contactObject).prepend(telephoneCol);
		});
	},
	socialMediaLinks: function(that) {
		function windowPopup(url, width, height) {
		  var left = (screen.width / 2) - (width / 2),
		      top = (screen.height / 2) - (height / 2);

		  window.open(
		    url,
		    "",
		    "menubar=no,toolbar=no,resizable=yes,scrollbars=yes,width=" + width + ",height=" + height + ",top=" + top + ",left=" + left
		  );
		}

		var url = encodeURIComponent(that.config.social_links.url),
			title = encodeURIComponent(that.config.social_links.title),
			emailBody = encodeURIComponent(that.config.social_links.email.bodytext),
			twitterBody = encodeURIComponent(that.config.social_links.twitter.bodytext),
			linkedInBody = encodeURIComponent(that.config.social_links.linkedin.bodytext);

		var $socialLinks = $('.social-link');
		$socialLinks.filter('.twitter').attr('href', "http://twitter.com/intent/tweet/?text=" + twitterBody + "&url="+ url);
		$socialLinks.filter('.linkedIn').attr('href', "http://www.linkedin.com/shareArticle?mini=true&url=" + url + "&title=" + title + "&summary="+linkedInBody);
		$socialLinks.filter('.email').attr('href', "mailto:%20?subject=" + title + "&body=" + emailBody + url);

		$socialLinks.not('.email').on("click", function(e) {
			e.preventDefault();
			windowPopup($(this).attr("href"), 500, 300);
		});
	}
};

(function () {
	window.rbApp = new ReadyBusiness();
  	rbApp.init();

	if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
		$('html').addClass('mobile-safari');
		if (navigator.userAgent.match(/iPad;.*CPU.*OS 7_\d/i)) {
    		$('html').addClass('ipad ios7');
		}
	}
})();

Array.prototype.getObject = function(key, value) {
    for (var i=0, len=this.length; i<len; i++) {
        if (typeof this[i] != "object") continue;
        if (this[i][key] == value) return this[i];
    }
};

Array.prototype.getIndexOfObject = function(key, value) {
	for (var i=0, len=this.length; i<len; i++) {
        if (typeof this[i] != "object") continue;
        if (this[i][key] == value) return i;
    }
    return -1;
};

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function clone(obj) {
	if (null == obj || "object" != typeof obj) return obj;
	var copy = obj.constructor();
	for (var attr in obj) {
		if (obj.hasOwnProperty(attr)) {
			// clone objects within this object rather than just copying them
			if ($.isPlainObject(obj[attr])) {
				copy[attr] = clone(obj[attr]);
			} else {
				copy[attr] = obj[attr];
			}
		}
	}
	return copy;
}

function flipFlop(x) {
	return (x+1)%2;
}

$.extend($.easing,
{
	easeInOutQuad: function (x, t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t + b;
        return -c/2 * ((--t)*(t-2) - 1) + b;
    }
});

function isTouchDevice(){
	try {
		document.createEvent("TouchEvent");
		return true;
	} catch(e){
		return false;
	}
}

function touchScroll(){
	if(isTouchDevice()){ //if touch events exist...
		document.getElementsByTagName('html')[0].classList.add('has-touch')
	}
}
