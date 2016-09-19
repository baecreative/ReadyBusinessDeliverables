;
(function($, window, document, undefined) {

    var pluginName = 'accordionise',
        defaults = {
            propertyName: "value"
        };

    function Plugin(element, options) {
        // Declarations
        var $element, headerEl, contentEl, pageWrapper, isScrolling, self, index, SCROLLINGOPTS;

        // Initialisers
        // : public
        this.element = element;
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        // : local 
        $element = $(this.element);
        headerEl = $element.find('.accordion-header');
        contentEl = $element.find('.accordion-content');
        pageWrapper = $('.page-wrapper');
        isScrolling = false;
        self = this;
        index = 0;
        SCROLL_OPTS = {
            duration: 1000,
            progress: function(elements, complete, remaining, start, tweenValue) {
                isScrolling = true;
                pageWrapper.scrollTop(tweenValue);
            },
            complete: function() {
                isScrolling = false;
            },
            onMouseScroll: function(e) {
                if (isScrolling) {
                    headerEl.velocity('stop');
                    isScrolling = false;
                }
                return (isScrolling) ? false : true;
            }
        };


        // Methods
        // : local
        function init() {
            //Open The First Accordion Section When Page Loads
            headerEl.toggleClass('inactive-header');
            headerEl.first().addClass('active-header').removeClass('inactive-header');
            contentEl.first().slideDown().addClass('open-content');
            // Accordion Animation Handles
            $(window).on('mousewheel DOMMouseScroll', SCROLL_OPTS.onMouseScroll);

            headerEl.click(function(e) {

                isInactive = $(this).is('.inactive-header');

                if (isInactive) {
                    // open this accordion item and close any other accordion accordion item.
                    $('.active-header').toggleClass('active-header').toggleClass('inactive-header').next().slideToggle().toggleClass('open-content');
                    $(this).toggleClass('active-header').toggleClass('inactive-header');
                    $(this).next().slideToggle().toggleClass('open-content');

                } else {
                    $(this).toggleClass('active-header').toggleClass('inactive-header');
                    $(this).next().slideToggle().toggleClass('open-content');
                }

                // scroll to accordion item using computed final value (subtract all accordion item heights)...
                // ... calc heading position to get final height during animations are happening
                var headingOffset = 0;
                itemIndex = headerEl.index(this);
                headerEl.each(function(index, item) {
                    headingOffset += (itemIndex > index) ? $(item).outerHeight() : 0;
                });
                animateScroll(element, headingOffset);
            });

            self.setUpTabs();
        }

        function animateScroll(element, offset) {
            var targetOffset;

            targetOffset = $(element).offset().top + pageWrapper.scrollTop() + offset;
            $(pageWrapper).velocity('stop');
            $(pageWrapper).velocity({
                'tween': [targetOffset, pageWrapper.scrollTop()]
            }, SCROLL_OPTS);
        }


        // : public

        this.setUpTabs = function() {

            $element.find('.accordion-content').each(function() {
                var tabContent = $(this).find('.tab-content');
                var tabs = $(this).find('.tabs');
                $(this).find('.tab').click(function() {
                    tabs.removeClass('current');
                    $(this).addClass('current');
                    var index = $(this).index();
                    $(tabContent).removeClass('current').parents('.tab-outer-content').removeClass('showing');
                    $(tabContent[index]).addClass('current').parents('.tab-outer-content').addClass('showing');
                    animateScroll(this, -100);
                })
            })
        }


        return init() && this;

    }




    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName,
                    new Plugin(this, options));
            }
        });
    }

})(jQuery, window, document);