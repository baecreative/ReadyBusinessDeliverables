window.survey = (function (rbApp, Velocity, TamingSelect) {
  	var pageData = {},
  		// AVERAGE_SURVEY_LENGTH
  		averageSurveyLength = 12,
  		pub = {
		    init:  function () {
		    	var that = this;
		    	$(document).ready(function() {
	    			that.equaliseAnswerBoxes();
	    		});

		    	this.reportBody = $('.sg-body');
		    	this.surveyFooter = this.reportBody.find('.sg-footer');
		    	this.fixedFooter = $('.fixed-footer');
		    	this.questionNumber = $('.sg-question-number').text().slice(0,-1);

		    	$('#survey-wrapper').addClass('question-'+this.questionNumber);
		    	this.footerFix();
		    	this.setQuestionClass();
		    	this.setFontAnswerSize();
		    	this.setFontQuestionSize();
		    	this.customStylizeSelectBoxes();
		    	this.appendQuote();
		    	this.toggleNextButton();
		    	this.bindPageOut();

	    		this.animatePageIn();
		    },

			setFontAnswerSize: function() {
				var fontSize = 'large-font';
				answerSet = this.reportBody.find('.sg-question-options').find('label');

				$.each(answerSet, function(index, value) {
					var alength = $(this).text().trim().length;
					if (alength >= 10){
						fontSize = 'small-font';
					  	return false;
					}
				})
				answerSet.parents('.sg-question-options').addClass(fontSize);
			},

			footerFix: function(){
				// Move footer into survey body for z-index resolution
				this.fixedFooter.insertBefore(this.surveyFooter);
			},

		    equaliseAnswerBoxes: function() {
		    	var answerBoxes = $('ul.sg-list li');
		    	if(answerBoxes.length) {
		    		rbApp.equalise(answerBoxes, true);
		            window.addEventListener('orientationchange', function(event) {
		                rbApp.equalise(answerBoxes, true);
		            });
		            $(window).resize($.throttle(250, function() {
		                rbApp.equalise(answerBoxes, true);
		            }));
		    	}

		    },

	     	setQuestionClass: function() {

	     		var list = $('ul.sg-list');
     			var answers = list.children().length;

     			switch (answers)
				{
				   case 2 : list.parents('.sg-question').addClass('cols-two');
				   break;

			     	case 3 : list.parents('.sg-question').addClass('cols-three');
				   break;

				   case 4 : list.parents('.sg-question').addClass('cols-four');
				   break;

				   default: list.parents('.sg-question').addClass('cols-more');
				};

	     	},

			customStylizeSelectBoxes: function() {
			    this.reportBody.find('select').addClass('turnintodropdown');
			    var hasTouch = ('ontouchstart' in window);
			    if(!hasTouch){
			    	TamingSelect();
			    }

			    this.reportBody.find('a.trigger').click(function() {
			        var target = $(this),
			            targetOffset = target.offset().top + $('.page-wrapper').scrollTop();
			        $('.sg-wrapper').animate({
			                scrollTop: (targetOffset-30)
			            },
			            1000,
			            "easeInOutQuad"
			        );
			    });

			    this.reportBody.find('.dropcontainer li').click(function() {
			        $('.sg-wrapper').scrollTop(0);
			    });
			},

		    appendQuote: function() {
		    	var quoteText = this.reportBody.find('.sg-question-description > span').contents().unwrap();
		    	if (quoteText.length){
		    		quoteText.appendTo(this.reportBody.find('.quote-hook'));
		    		quoteText.wrapAll('<div class="outer"><div class="inner"><p>');
		    	}
		    },

			animatePageIn: function() {
				var bgImgContainer = $('#survey-wrapper .bg-img-wrapper'),
					sgContent = $('.sg-content'),
					that = this;
				Velocity(bgImgContainer, "transition.fadeIn");
				setTimeout(function(){
					that.updateProgressBar();
					Velocity(sgContent, "transition.fadeIn");

				}, 500);
			},

			bindPageOut: function() {
				var that = this;
				$('.sg-next-button').off('click').click(function(){
		    		that.animatePageOut();
		    	});
			},

			animatePageOut: function() {
				var bgImgContainer = $('#survey-wrapper .bg-img-wrapper'),
					sgContent = $('.sg-content');
				Velocity(bgImgContainer, "transition.fadeOut");
				Velocity(sgContent, "transition.fadeOut");
			},

			updateProgressBar: function() {
				var factor = 100/averageSurveyLength,
					factorLimit = averageSurveyLength - 1,
					progress,
					fixedProgressBar = $('.progress-bar');

				// calculate progress
				if (this.questionNumber >= factorLimit) {
					progress = Math.round((factor * factorLimit) + (this.questionNumber -1 - factorLimit));
				} else {
					progress = Math.round(factor * (this.questionNumber-1));
				}

				progress = ((progress > 99) ? '99%' : progress + '%');

				// update progress bar text and width
				//fixedProgressBar.find('.progress-bar-text').show().text(progress).css('left', progress);
				fixedProgressBar.find('.progress-bar-inner').width(progress);
			},
			toggleNextButton: function() {
				var question = $('.sg-question'),
					nextButton = $('.sg-next-button'),
					questionWrapper;
				// If this is a dropdown menu question
				if (question.hasClass('sg-type-menu')) {
					questionWrapper = $('.sg-input');
					// Enable/disable Next button initially
					toggleDropdown(questionWrapper);
					// Enable/disable Next button on dropdown change
					questionWrapper.change(function() {
						toggleDropdown(questionWrapper);
					});
				// else if this is a radio button or checkbox question
				} else if (question.hasClass('sg-type-radio') || question.hasClass('sg-type-checkbox')) {
					questionWrapper = $('.sg-list');
					// Enable/disable Next button initially
					toggleRadioCheckbox(questionWrapper);
					// Enable/disable Next button on change
					questionWrapper.click(function() {
						toggleRadioCheckbox(questionWrapper);
					});
				}
				// function to toggle the enable class for dropdown menu questions
				function toggleDropdown(questionWrapper) {
					if($(questionWrapper).val() !== 'NoAnswer'){//} && $(questionWrapper).find('option:selected').length) {
						nextButton.addClass('enabled');
						// fix for ios7 bug rendering next button
						if ($('html').hasClass('ios7') && $('#survey-wrapper').hasClass('question-1') && (window.innerHeight < window.innerWidth)) {
							rbApp.repaintPage();
						}
					} else {
						nextButton.removeClass('enabled');
					}
				}
				// function to toggle the enable class for radio/checkbox questions
				function toggleRadioCheckbox(that) {
					if($(that).find('input:checked').length) {
						nextButton.addClass('enabled');
					} else {
						nextButton.removeClass('enabled');
					}
				}
			},
			setFontQuestionSize: function() {
				var question,
				questionText,
				originalQuestion,
				questionLength,
				originalQuestion = $('.sg-question-title'),
				qClone = originalQuestion.clone();

				if ($('.sg-question-title').find('label').length){
					question = qClone.find('label');
				}
				else{
					question = qClone;
				}
				question.find('span').remove();
				questionLength = (question.text().trim().length);
				if (questionLength >= 40){
					originalQuestion.addClass('small-font');
				}
			}

  	};

  	return pub;
})(window.rbApp, window.Velocity, window.tamingselect);

$(document).on('blur', 'input, textarea', function() {
	setTimeout(function() {
		window.scrollTo(document.body.scrollLeft, document.body.scrollTop);
	}, 0);
});
