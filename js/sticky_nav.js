/** RBI: sticky_nav.js v2.1 */

'use strict';

function StickyNav(app, Velocity) {
}

StickyNav.prototype = {
	constructor: StickyNav,
	init: function(sector_names, rbScores, offset) {
		var that = this;

		// Define point at which sticky nav is shown/hidden
		this.nav_offest = offset || 300;
		this.cacheElements(sector_names, rbScores);

		this.$all_tabs.on('click touchstart', function(e) {
			e.preventDefault();

			var sectionId = $(this).data('sectionid'),
				// minus the pagewrapper scrolltop as jquery.position (used in Velocity.js) does not calculate this correctly for the page wrapper
				offset = 0-(that.$pageWrapper.scrollTop()+49);

			$(that.$sections[sectionId]).velocity('scroll', {
				container: that.$scrollContainer_velocity,
				duration: 500,
				offset: offset,
				easing: 'ease-in-out'
			});
		});

		this.$shareIcon.add(this.$shareButtons).on('click', function(e) {
			if(that.$shareDropDown.hasClass('displayed')) {
				that.$shareDropDown.toggleClass('displayed').velocity('transition.slideUpOut', {duration: 400});
			} else {
				that.$shareDropDown.toggleClass('displayed').velocity('transition.slideDownIn', {duration: 400})
			}
			that.$shareIcon.toggleClass('selected');
		});

		this.updateStickyNav(that);
		$(this.$scrollContainer).scroll($.throttle(250, function() {
			that.updateStickyNav(that);
		}));
	},
	cacheElements: function(sector_names, rbScores) {
		var that = this;

		// cache elements
		this.$pageWrapper	= $('.page-wrapper');
		this.$scrollContainer = (($('html').hasClass('mobile-safari')) ? $(window) : that.$pageWrapper)
		this.$scrollContainer_velocity = (($('html').hasClass('mobile-safari')) ? null : that.$pageWrapper)

		// sections
		this.$sections 		 = {};
		this.$sections.intro = this.$pageWrapper.children('section.intro-summary');
		this.$sections.outro = this.$pageWrapper.find('section.post-lead > section.outro-summary');

		// get section positions
		this.positions 			= {};
		this.positions.intro 	= $(this.$sections.intro).position().top;
		this.positions.outro 	= $(this.$sections.outro).position().top - 60;

		// sticky nav elements
		this.$stickyNav 	= this.$pageWrapper.find('.sticky-nav');

		// tabs
		this.$tabs			= {};
		this.$tabs.intro	= this.$stickyNav.find('.tab.intro-summary');
		this.$tabs.outro	= this.$stickyNav.find('.tab.outro-summary');

		$.each(sector_names, function(sectorId, sector_name) {
			if (typeof rbScores.sectors[sectorId] === "undefined") {
				return true;
			}
			that.$sections[sectorId]	= that.$pageWrapper.find('.header-bar.' + sectorId);
			that.positions[sectorId]	= that.$sections[sectorId].position().top - 60;
			that.$tabs[sectorId] 		= $('<div class="tab capitalize '+sectorId+'" data-sectionid="'+sectorId+'">'+ sector_name +'</div>').insertBefore(that.$tabs.outro);
		});
		this.$all_tabs 		= this.$stickyNav.find('.tabs-wrapper .tab');

		// share elements
		this.$shareIcon 	= this.$stickyNav.find('.share-icon');
		this.$shareDropDown = this.$stickyNav.find('.share-dropdown');
		this.$shareButtons	= this.$shareDropDown.find('.share-button');
	},
	updateStickyNav: function(that) {
		var currentOffset = this.$scrollContainer.scrollTop(),
			currentSector;

		if (currentOffset > this.nav_offest) {
			if (!that.$stickyNav.hasClass('displayed')) {
				that.$stickyNav.addClass('displayed').velocity('transition.slideDownIn', {duration: 400});
			}

			if (currentOffset > this.positions.intro) {
				currentSector = this.$tabs.intro;
			}
			if (typeof this.positions.sector_1 !== "undefined" && currentOffset > this.positions.sector_1) {
				currentSector = this.$tabs.sector_1;
			}
			if (typeof this.positions.sector_2 !== "undefined" && currentOffset > this.positions.sector_2) {
				currentSector = this.$tabs.sector_2;
			}
			if (typeof this.positions.sector_3 !== "undefined" && currentOffset > this.positions.sector_3) {
				currentSector = this.$tabs.sector_3;
			}
			if (currentOffset > this.positions.outro) {
				currentSector = this.$tabs.outro;
			}
			updateSelectedTab(currentSector);
		} else if (that.$stickyNav.hasClass('displayed')) {
			that.$stickyNav.removeClass('displayed').velocity('transition.slideUpOut', {duration: 400});
		}

		function updateSelectedTab(tab) {
			that.$all_tabs.removeClass('selected');
			tab.addClass('selected');
		}
	}
}
