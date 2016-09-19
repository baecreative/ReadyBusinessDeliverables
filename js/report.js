'use strict';

function ReportPage(rbApp, Velocity) {
	// Object to store all reporting values for each answered question
	// Created by processAnswers function based on URL or API response data
	this.responseData = {};

	// Object to store survey response data from API
	this.APIresponseData = {};
	this.APIcallCount = 0;

	// Object to store variables set in the URL parameters
	this.params = this.getAllUrlParams();

	// Object to store all config from JSON files
	this.config = {};
	this.getConfig();

	// Object to store cumulative weighting of each Level 4
	// question answered, sorted by sector
	this.levelFourWeights = {};

	// Full details for each question & its options i.e. title etc
	// Not stored for all questions by default - API request made for each one
	this.APIQuestionData = {};

	// Object to store the calculated readiness scores (and breakpoints?)
	this.rbScores = {};

	// Current readiness of the user (camel case format)
	this.currentReadiness;

	// Flag to indicate whether industry chart is currently shown
	this.industryChart = false;
	this.failedDrawing = false;
	this.pagePopulated = false;

	this.circleGraphs = {
		fullReport: {},
		introSummary: {}
	};

	// Other formats of each readiness
	this.readiness = {
		'ready': {
			class: 'ready',
			underscore: 'ready'
		},
		'almostReady': {
			class: 'almost-ready',
			underscore: 'almost_ready'
		},
		'unready': {
			class: 'unready',
			underscore: 'unready'
		},
		'atRisk': {
			class: 'at-risk',
			underscore: 'at_risk'
		}
	};

	this.hiddenValues = {};
	this.productSelectedCount = 0;

	this.$pageWrapper = $('.page-wrapper');

	this.$introSummary 	= this.$pageWrapper.children('.intro-summary');
	this.$fullReportFooter = this.$introSummary.children('.full-report-footer');

	this.$preLeadWrapper = this.$pageWrapper.children('section.pre-lead');

	this.$postLeadWrapper = this.$pageWrapper.children('section.post-lead');

	this.$fullReport = this.$postLeadWrapper.children('section.full-report');
	this.$outroSummary = this.$postLeadWrapper.children('section.outro-summary');
};


ReportPage.prototype = {

	constructor: ReportPage,

// ========================
// ====== URL Params ======
// ========================

	getAllUrlParams: function () {
		var params = decodeURIComponent(window.location.search.substring(1)).split(/\?|\&/),
			result = {},
			URLresponseData = {},
			param, key, value, sqBracketContent, keyNoBracket;

		params.forEach(function (kVPair) {
			if (kVPair) {
				param = kVPair.split("=");
				key = param[0];
				value = param[1];

				// if key contains square bracket ( i.e. 4[0] ) it should be made into an array
				sqBracketContent = key.match(/\[(.*?)\]/);
				if (sqBracketContent) {
					sqBracketContent = sqBracketContent[1];
					// remove the square brackets
					key = key.replace(/\[(.*?)\]/g, '');
				}

				if ($.isNumeric(key)) {
					// create array if it does not yet exist
					if (!URLresponseData[key]) {
						URLresponseData[key] = [];
					}
					// push value
					URLresponseData[key].push(value);
				} else {
					result[key] = value;
				}
			}
		});
		this.responseData = URLresponseData;
		return result;
	},

	updateUrlParams: function (new_params_string) {
		// todo ie9 fallback
		if(typeof window.history.pushState != "undefined" && typeof new_params_string !== "undefined"){

			window.history.pushState(null, null, window.location.pathname + new_params_string);
			this.shareReport();
		}

	},

// ============================
// ====== AJAX Requests =======
// ============================

	getConfig: function() {
		var that = this,
			url = './js/config/',
			fail = false;
		$.when(
			$.getJSON(url + 'sg_api.json', function (data) {
				$.extend(that.config, data);
				that.authString = 'api_token=' + data.api_key + '&api_token_secret=' + data.api_secret_key;
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'readiness_sector_names.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'score.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
			$.getJSON(url + 'level_four_question_data.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
			$.getJSON(url + 'industry_data.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
				// do nothing
	  		}),
	  		$.getJSON(url + 'sector_summary.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'contact.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
  			}),
  			$.getJSON(url + 'products.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'articles.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'full_report_content.json', function (data) {
				$.extend(that.config, data);
			}).fail(function() {
	    		fail = true;
	  		}),
	  		$.getJSON(url + 'share_email.json', function (data) {
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
	},

	getAPIResponseData: function () {
		if (this.APIcallCount > 10 ||
			typeof this.params.sid === "undefined" ||
			typeof this.params.sguid === "undefined") {
			return;
		}
		var sgUrl = this.config.api_url + this.params.sid + '/surveyresponse.jsonp/?' + this.authString + '&filter[field][1]=[question(99),option(0)]&filter[operator][1]==&filter[value][1]=' + this.params.sguid,
			that = this;

		this.APIcallCount++;

		$.ajax({
			url: sgUrl,
			dataType: 'JSONP',
			type: 'GET',
			success: function (data) {
				if (data.result_ok && data.data.length) {
					var pushScores = {},
						leadCapture_submitted_ls = localStorage.getItem('leadCaptureSubmitted'),
						leadCapture_submitted_sg = that.hiddenValues[that.config.hidden_value_ids.leadCapture_submitted];

					that.APIresponseData = data.data[0];

					that.processAPIresponseData(that.APIresponseData, function() {
						if (that.pagePopulated) {
							// get any product parameters currently in URL
							var params = decodeURIComponent(window.location.search.substring(1)).split(/\?|\&/),
								product_params = "",
								param,
								key,
								value;

							that.productSelectedCount = 0;

							params.forEach(function (kVPair) {
								if (kVPair) {
									param = kVPair.split("=");
									key = param[0];
									value = param[1];

									if (key.match(/p[[0-9]*]/)) {
										product_params += '&p[' + that.productSelectedCount + ']=' + value;
										that.productSelectedCount++;
									}
								}
							});

							// Construct new URL parameters
							var new_params_string = '?sid=' + that.params.sid + '&sguid=' + that.params.sguid + product_params;
							that.updateUrlParams(new_params_string);
							//that.showHideCaptureForm();
						} else {
							that.populatePage();
						}

						if (typeof that.APIQuestionData[that.config.industry_question_id] !== "undefined") {
							var industryAnswerIndex = that.responseData[that.config.industry_question_id];
							that.industry = that.APIQuestionData[that.config.industry_question_id].options[industryAnswerIndex-1].title.English.replace(/\(.*\)/g,'');
						}
						if (typeof that.APIQuestionData[that.config.business_size_question_id] !== "undefined") {
							var sizeAnswerIndex = that.responseData[that.config.business_size_question_id];
							that.businessSize = that.APIQuestionData[that.config.business_size_question_id].options[sizeAnswerIndex-1].title.English.replace(/\(.*\)/g,'');
						}

						// construct object of RB scores to push to SG
						$.each(that.config.hidden_value_ids.rbScores, function(scoreId, hiddenValueId) {
							if (scoreId === "total") {
								pushScores[hiddenValueId] = that.rbScores[scoreId];
							} else if (typeof that.rbScores.sectors[scoreId] !== "undefined") {
								pushScores[hiddenValueId] = that.rbScores.sectors[scoreId];
							}
						});
						that.pushResponseData(pushScores);

						// push lead capture submitted flag
						if (leadCapture_submitted_ls === that.params.sguid && typeof leadCapture_submitted_sg === "undefined") {
							var obj = {};
			 					obj[that.config.hidden_value_ids.leadCapture_submitted] = "true";
			 				that.pushResponseData(obj);
						}
					});

				} else {
					window.setTimeout(function() {
		  				that.getAPIResponseData();
					}, 15000);
				}
			},
			error: function (data) {
				$('html').addClass('error');
			}
		});
	},

	pushResponseData: function(sgObject) {
		// construct updateString from key value pairs in data
		var updateString = constructUpdateString(sgObject),
			sgUrl = this.config.api_url + this.params.sid +'/surveyresponse/'+ this.APIresponseData.id +'.jsonp/?_method=POST&' + this.authString + updateString;

		$.ajax({
			url: sgUrl,
			dataType: 'JSONP',
			type: 'POST',
			success: function (data) {
			},
			error: function (data) {
				$('html').addClass('error');
			}
		});

		function constructUpdateString(data) {
			//data[id][optionSKU]=val
			var updateString = '';
			$.each(data, function(id, value) {
				if (typeof value === "undefined") {
					return true;
				}
				updateString += '&data[' + id + '][0]=' + value.toString();
			});
			return updateString;
		}
	},

	getAPIQuestionData: function(questionId, callback) {
		var that = this,
			callback = callback || null;

		if (typeof this.APIQuestionData[questionId] === "undefined") {
			var sgUrl = this.config.api_url + this.params.sid +'/surveyquestion/' + questionId + '.jsonp/?' + this.authString;

			$.ajax({
				url: sgUrl,
				dataType: 'JSONP',
				type: 'GET',
				success: function (data) {
					that.APIQuestionData[questionId] = data.data;

					if (callback) {
						callback();
					}
				},
				error: function (data) {
					$('html').addClass('error');
					// could not retrieve question data
				}
			});
		}
	},

// =========================
// ====== Initialise =======
// =========================

	init: function () {
		var that = this,
			answerIndex;

		// If we have url params, use these to populate page content
		if (!$.isEmptyObject(this.responseData)) {
			this.populatePage();
			this.getAPIResponseData();

		// If we have SGUID use these to make API call
		} else if (typeof this.params.sguid !== "undefined") {
			this.getAPIResponseData();

		// Else we cannot populate the page. Throw error
		} else {
			// todo display error page
			$('html').addClass('error');
			return;
		}
		// Get industry chart data from SurveyGizmo and set it up, ready to animate in
		this.getAPIQuestionData(this.config.industry_question_id, function() {
			answerIndex = that.responseData[that.config.industry_question_id];
			if (!$.isEmptyObject(that.APIresponseData)) {
				that.industry = that.APIQuestionData[that.config.industry_question_id].options[answerIndex-1].title.English.replace(/\(.*\)/g,'');
			}
		});
		this.getAPIQuestionData(this.config.business_size_question_id, function() {
			answerIndex = that.responseData[that.config.business_size_question_id];
			if (!$.isEmptyObject(that.APIresponseData)) {
				that.businessSize = that.APIQuestionData[that.config.business_size_question_id].options[answerIndex-1].title.English.replace(/\(.*\)/g,'');
			}
		});
	},

// ==============================
// ====== Data Processing =======
// ==============================

	processAPIresponseData: function(data, callback) {
		var that = this,
			hiddenValueIds = [];

		$.each(this.config.hidden_value_ids, function(key, id) {
			if ($.isPlainObject(id)) {
				$.each(id, function(k, v) {
					hiddenValueIds.push(v);
				});
			} else {
				hiddenValueIds.push(id);
			}
		});

		// loop over the response data
		$.each(data, function(key, value) {
			if (value === "" || typeof value === 'undefined') {
				return true;
			}

			if (key.substr(1, 8) === "question") {
				key = parseInt(key.match(/\(([^)]+)\)/)[1]);

				if ($.inArray(key, hiddenValueIds) !== -1) {
					that.hiddenValues[key] = value;
				} else {
					// select the numerical questionId from id such as: [question(3)]
					that.responseData[key] = that.responseData[key] || [];
					if (that.responseData[key].indexOf(value) === -1) {
						that.responseData[key].push(value);
					}
				}
			}
		});
		callback();
	},

	// Store weightings of answers given to Level 4 questions
	getLevelFourAnswers: function() {
		var that = this,
			result = {},
			cumulativeWeight,
			answerOption;

		$.each(this.responseData, function(questionId, questionOptionAnswers) {
			if (typeof questionOptionAnswers === "undefined") {
				return true;
			}

			// If this is a level 4 question... i.e. does it have info stored about it in the config?
			var configQuestionData = that.config.level4_question_data.getObject('id', questionId);

			if (typeof configQuestionData !== "undefined") {
				// create sector object if does not exist
				result[configQuestionData.sectorId] = result[configQuestionData.sectorId] || {};
				cumulativeWeight = 0;

				// Loop over contents
				$.each(questionOptionAnswers, function(index, questionOptionIndex) {
					answerOption = configQuestionData.answer_options.getObject("reporting_val", questionOptionIndex);
					if (typeof answerOption === "undefined") {
						return true;
					}
					cumulativeWeight = (parseFloat(cumulativeWeight) + parseFloat(answerOption.weight)).toFixed(3);
				});
				cumulativeWeight = ((cumulativeWeight > 1) ? 1 : cumulativeWeight);
				result[configQuestionData.sectorId][questionId] = cumulativeWeight;
			}
		});
		return result; // this.levelFourWeights
	},

	calculateScores: function(data) {
		var that = this,
			sectorQAnswered,
			totalQAnswered = 0,
			allQuestionWeights = {},
			result = {
				sectors: {},
				sectors_static: {}
			};

		$.each(data, function(sectorId, sectorAnswer) {
			sectorQAnswered = Object.keys(that.levelFourWeights[sectorId]);
			totalQAnswered += sectorQAnswered.length;
			$.extend(allQuestionWeights, sectorAnswer);
			result.sectors_static[sectorId] = result.sectors[sectorId] = doCalculation(sectorAnswer, sectorQAnswered.length, that.config.max_score);
		});

		result.total_static = result.total = doCalculation(allQuestionWeights, totalQAnswered, that.config.max_score);

		function doCalculation(weights, length, maxScore) {
			if(!length) {
				return 0;
			}
			var totalWeights = 0;
			$.each(weights, function(key, value) {
				if (typeof value === "undefined") {
					return true;
				}
				totalWeights += parseFloat(value);
			});
			var score = Math.floor(parseFloat(maxScore*(totalWeights/length)).toFixed(3));
			return score;
		}
		return result; // this.rbScores
	},

	changeScore: function(productId, sector, increase, maxIncrease) {
		var that = this,
			sectorProducts = this.displayedProducts[sector],
			selectedProductIndex = sectorProducts.getIndexOfObject('id', productId),
			selectedProduct = sectorProducts[selectedProductIndex],
			weight,
			maxIncrease = maxIncrease || false,
			modifiedWeights = clone(this.levelFourWeights),
			cumScoreChange = 0;

		// Loop over questions that this product relates to
		$.each(selectedProduct.questions, function(index, questionId) {
			if (typeof that.levelFourWeights[sector][questionId] === "undefined") {
				return true;
			}

			weight = that.levelFourWeights[sector][questionId];
			if (typeof weight === "undefined") {
				return true;
			}
			// cumulative value of weight increases, if all weights are increased to the maximum of 1
			cumScoreChange += parseFloat(1 - weight);
		});

		// If the cumulative score change is greater than the maximum, use the maximum value
		if (maxIncrease && cumScoreChange > maxIncrease) {
			cumScoreChange = parseFloat(maxIncrease);
		}

		if (typeof selectedProduct.questions !== "undefined" && selectedProduct.questions.length) {
			// Get the ID of the first level 4 question related to this product
			var questionId = Object.keys(modifiedWeights[sector])[0];

			// Add or minus the the score change to the question weight, depending on if we are selecting a product (increasing the score),
			// or deselecting a product (decreasing the score)
			var levelFourWeights = that.levelFourWeights[sector][questionId];

			levelFourWeights = (levelFourWeights===undefined)?0:levelFourWeights;

			if (increase) {
				modifiedWeights[sector][questionId] = (parseFloat(levelFourWeights) + parseFloat(cumScoreChange)).toFixed(3);
			// decrease weight - deselect product
			} else {
				modifiedWeights[sector][questionId] = (parseFloat(levelFourWeights) - parseFloat(cumScoreChange)).toFixed(3);
			}
		}

		return modifiedWeights;
	},

	getReadiness: function(score) {
		if(score > this.config.score_boundaries.ready) {
			return 'ready';
		} else if(score > this.config.score_boundaries.almostReady) {
			return 'almostReady';
		} else if(score > this.config.score_boundaries.unready) {
			 return 'unready';
		} else {
			return 'atRisk';
		}
	},

// ========================================
// ====== Page Population Functions =======
// ========================================

	setColorScheme: function(element, readiness) {
		var readinessClass = this.readiness[readiness].class;

		$.each(this.readiness, function(i, readiness) {
			element.removeClass(readiness.class);
			element.removeClass(readiness.class + '-color');
			element.removeClass(readiness.class + '-border');
		});
		element.addClass(readinessClass + " " + readinessClass + "-color " + readinessClass + "-border");
	},

// ==============================
// ====== Page Population =======
// ==============================

	populatePage: function() {
		// Calculate scores if we don't have them yet
		this.levelFourWeights = this.getLevelFourAnswers();
		this.rbScores = this.calculateScores(this.levelFourWeights);
		this.processIndustryData();

		// Set current readiness
		this.currentReadiness = this.getReadiness(this.rbScores.total_static);

		// Intro Summary
		this.populateResultScore();
		this.drawSectorSummaryGraphs();

		// Lead Capture content
		this.showHideCaptureForm();

		// Contact details footer
		rbApp.populateContact(this);

		// Social media links in footer
		rbApp.socialMediaLinks(this);

		this.pagePopulated = true;

		if (this.industryDataProcessed) {
			this.animatePageIn();
		}
	},

	populateResultScore: function() {
		var $resultsScore = this.$introSummary.find('.results-score'),
			$scoreContainer = $resultsScore.children('.score-container.rb-score-main');

		// Draw circle graph
		this.circleGraphs.rbGraph = new CircleGraph($scoreContainer);
		this.setColorScheme($scoreContainer.children('.circle-graph-container'), this.getReadiness(this.rbScores.total_static));
	},

	processIndustryData: function() {
		var that = this,
			industryQId = that.config.industry_question_id,
			businessSizeQId = that.config.business_size_question_id,
			answerIndex = that.responseData[industryQId],
			currentIndustryData;

		function noIndustryChart() {
			that.industryChart = false;
			that.industryDataProcessed = true;
			that.$introSummary.find('.module.results-score').addClass('no-industry');
			that.$introSummary.find('.module.industry-results').addClass('-hide');
		}


		if (typeof that.config.industry_data === "undefined") {
			noIndustryChart();
			return;
		}

		currentIndustryData = that.config.industry_data.getObject('id', that.responseData[that.config.industry_question_id][0]);
		if (typeof currentIndustryData === "undefined") {
			noIndustryChart();
			return;
		}
		that.currentBusinessSizeData = currentIndustryData.business_size.getObject('size_id', that.responseData[that.config.business_size_question_id][0]);

		// If we have data for an industry chart
		if (typeof that.currentBusinessSizeData === "undefined") {
			noIndustryChart();
			return;
		}

		// If we have reached this far then we have all the required data to draw the industry graph
		that.industryChart = true;
		that.industryDataProcessed = true;

		// If page population has already completed then we are ready to animate the page in
		if (that.pagePopulated) {
			that.animatePageIn();
		}
	},

	drawIndustryChart: function() {
		var that = this,
			colWrapper,
			col,
			colHeight,
			largestPercent = 0,
			tallestCol,
			multiplicationFactor,
			industry_id = this.responseData[this.config.industry_question_id][0],
			currentIndustryData = this.config.industry_data.getObject('id', this.responseData[this.config.industry_question_id][0]);

			if (typeof currentIndustryData === "undefined") {
				return;
			}

		//$('.industry-title').html(this.industry).text();

		// find which column is greatest
		$.each(this.currentBusinessSizeData.distribution, function (readiness, percent) {
			if (percent > largestPercent) {
				largestPercent = percent;
				tallestCol = readiness;
			}
		});

		multiplicationFactor = ((tallestCol === this.currentReadiness) ? 75 / largestPercent : 100 / largestPercent);

		// set the other column heights relative to the greatest column
		$.each(this.currentBusinessSizeData.distribution, function (key, value) {
			colHeight = value * multiplicationFactor;
			colWrapper = $('.col-wrapper.' + that.readiness[key].class);
			col = colWrapper.find('.chart-col');

			colWrapper.find('.chart-data-item').append('<strong class="capitalize">' + that.config.readiness_name[key] + '</strong>');
			col.height(colHeight+'%').find('span').text(value + '%');
			if (colHeight < 25) {
				col.children('span').addClass('-vertical-center');
			}
			if (colHeight < 10) {
				col.addClass('label-ontop');
			}
		});
		$('.col-wrapper.' + this.readiness[this.currentReadiness].class + ' .chart-col').addClass('annotated').append('<div class="annotated"><span>' + this.config.industry_chart_label + '</span></div>');
	},

	drawSectorSummaryGraphs: function() {
		var $sectorWrapper,
			$graphWrapper,
			sectorSummary,
			sectorScore,
			sectorReadiness,
			summaryText,
			$sectorSummaryContainer = this.$introSummary.find('.sector-summary-container'),
			innerLabel,
			that = this;

		// Draw three intro_summary Graphs with paragraphs
		$.each(this.config.sector_name, function(sectorId, name) {
			sectorSummary = that.config.sector_summary.getObject('id', sectorId);
			sectorScore = that.rbScores.sectors_static[sectorId];

			if (typeof sectorScore === "undefined") {
				sectorReadiness = "undefined";
			} else {
				sectorReadiness = that.getReadiness(sectorScore);
			}
			summaryText = sectorSummary.summary_text.getObject('readiness', sectorReadiness);

			$sectorWrapper = $sectorSummaryContainer.append("\
				<div class='wrapper' data-sectorid='" + sectorId + "'>\
					<h4 class='capitalize'><strong>" + that.config.sector_name[sectorId] + "</strong></h4>\
					<div class='graph-wrapper " + sectorId + "'></div>\
					<p>"+ that.replacePlaceholders(summaryText.text, {"sectorId": sectorId}) +"</p>\
				</div>\
			");

			$graphWrapper = $sectorWrapper.children('.wrapper').find('.graph-wrapper.' + sectorId);
			that.circleGraphs.introSummary[sectorId] = new CircleGraph($graphWrapper);

			if (typeof that.rbScores.sectors_static[sectorId] === "undefined") {
				that.circleGraphs.introSummary[sectorId].container.children('.circle-graph-container').addClass('not-applicable');
				that.circleGraphs.introSummary[sectorId].setInnerLabel(that.config.full_report_content.circle_graph_labels.not_applicable);
			} else {
				that.circleGraphs.introSummary[sectorId].setLine(sectorScore);
				innerLabel = that.replacePlaceholders(that.config.full_report_content.circle_graph_labels.inner_label_sector_static, {"sectorId": sectorId});
				that.circleGraphs.introSummary[sectorId].setInnerLabel(innerLabel);
				that.setColorScheme($graphWrapper.children('.circle-graph-container'), sectorReadiness);
			}
		});
	},

	bindPreLeadFooterLink: function() {
		// scroll user down to the report/capture form, allow page to be scrollable
		var that = this;

		this.$fullReportFooter.click(function() {
			var container = (($('html').hasClass('mobile-safari')) ? null : that.$pageWrapper);

			$(this).velocity('fadeOut', {duration: 300});
			that.$pageWrapper
				.removeClass('with-footer')
				.addClass('lead-capture');

			that.$preLeadWrapper.velocity('scroll', {
				container: container,
				duration: 900,
				offset: 0,
				easing: 'ease-in-out'
			});
		});
	},

	setUpCaptureForm: function () {
		var form = $("section.pre-lead").find('form'),
			formWrapper = form.parents('.capture-form-wrapper'),
			$termsCheckbox = form.find('#dummy-checkbox'),
			genError = form.find('.general-error'),
			that = this;

		$termsCheckbox.on('click', function() {
			$(this).toggleClass("checked").promise().done(function(){
				// fix for ios7 bug not displaying tick icon
				if($('html').hasClass('ios7')) {
					setTimeout(function(){
						rbApp.repaintPage();
					}, 50);
				}
			});
		});

		form.submit(function(e) {
        	//don't submit
		  	e.preventDefault();
            var isValidForm = validateForm();
            if (!(isValidForm)){
            	genError.velocity('slideDown', {duration: 400});
            } else {
            	that.submitLeadCaptureForm();
 				// Hide errors, fade out form
            	genError.velocity('slideUp', {duration: 400});
 			}
		});

		function validateForm(){

			var validates = true;
			var trimmedInput;

			form.find('input').each(function(){
				var $this = $(this),
					type = $this.attr('type'),
					errorWrap,
					errorMsg;

				if ($this.hasClass('mandatory')){
					if (type == "text"){
						trimmedInput = trim($this.val());
						if (trimmedInput ===''){
							validates = false;
							if ($this.parent().hasClass('row')){
								errorWrap = $this.parent();
							} else {
								errorWrap = $this;
							}
							// display error
							displayError(errorWrap, $this, 'error-mandatory');
						}
						else{
							if ($this.parent().hasClass('row')){
								$this.removeClass('error');
								if (!($this).siblings('input').hasClass('error')){
									$this.parent().removeClass('error').prev('p').remove();
								}
							} else {
								$this.removeClass('error').prev('p').remove();
							}
						}
					} else if (type == "checkbox"){
						if ($this.is(":checked") || $('#dummy-checkbox').hasClass("checked")){
							$this.removeClass('error');
							$this.prev('p').remove();
						} else {
							validates = false;
							displayError($this, $this, 'error-mandatory');
						}
					}
				}

				/* INSERT_NEW_VALIDATION_RULES_HERE> */


				/* /INSERT_NEW_VALIDATION_RULES_HERE */
			});

			function trim(value) {
			    return value.replace(/^\s+|\s+$/g,"");
			}

			function displayError(errorWrap, item, messageId){
				var message = errorWrap.data(messageId);
				var errorString = "<p class='error'>" + message + "</p>";

				if (!errorWrap.hasClass('error')){
					errorWrap.addClass('error');
					errorWrap.before(errorString);
				}
				item.addClass('error');
			}
			return validates;
		}
	},

	showHideCaptureForm: function(callback) {
		var leadCapture_submitted_ls = localStorage.getItem('leadCaptureSubmitted'),
			leadCapture_submitted_sg = this.hiddenValues[this.config.hidden_value_ids.leadCapture_submitted],
			that = this;

		if (leadCapture_submitted_ls === this.params.sguid ||
			leadCapture_submitted_sg == 'true' ||
			this.config.full_report_content.skip_lead_capture === "true" ||
			this.config.full_report_content.skip_lead_capture === true) {

			//business request: show backlink just after form is submitted
			$(".share-tool .wrapper .back-link").show();
			
			// Hide the lead capture, show the report

			// Populate full report content
			this.populateFullReport(this.getProducts());
			this.populateOutroSummary();
			this.bindProductSelection();
			this.autoSelectProducts();

			// If the user has already submitted the lead capture form hide it and show the full report
			this.$pageWrapper.addClass('full-report');

			this.stickyNav = new StickyNav(window.rbApp, window.Velocity);
			var $productBoxes = this.$productGridContainer.children('.product');

			// if we're transitioning from the lead capture form...
			if (this.$pageWrapper.hasClass('lead-capture')) {
				var offset = 0-(that.$pageWrapper.scrollTop()),
					top = ((that.$pageWrapper.width() > 480) ? 49 : 0),
					container = (($('html').hasClass('mobile-safari')) ? null : that.$pageWrapper);

				this.$preLeadWrapper.velocity('fadeOut', {
					duration: 440,
					complete: function() {
						that.$pageWrapper.removeClass('lead-capture')
					}
				});
				this.$postLeadWrapper.velocity('fadeIn', {
					delay: 450,
					duration: 440,
					complete: function() {
						that.$fullReport.velocity('scroll', {
							container: container,
							duration: 900,
							offset: offset - top,
							easing: 'ease-in-out'
						});
						that.stickyNav.init(that.config.sector_name, that.rbScores, that.config.full_report_content.sticky_nav_offset);
						that.shareReport();
						rbApp.equalise($productBoxes);
					}
				});
			} else {
				this.$preLeadWrapper.velocity('fadeOut', {duration: 0});
				this.$postLeadWrapper.removeClass('-hide').velocity('fadeIn', {duration: 0});
				this.stickyNav.init(this.config.sector_name, this.rbScores, this.config.full_report_content.sticky_nav_offset);
				this.shareReport();
				rbApp.equalise($productBoxes);
			}

			$(window).resize($.throttle(250, function() {
		        rbApp.equalise($productBoxes);
		    }));

		} else {
			// Hide the report, show the footer link
			// Show the lead capture when the footer link is clicked
			this.bindPreLeadFooterLink();
			this.$pageWrapper.addClass('with-footer');
			this.setUpCaptureForm();

			// Populate placeholder text
			$('input, textarea').placeholder();
		}
	},

	submitLeadCaptureForm: function() {
		// push 'lead capture submitted' flag to SurveyGizmo
		var obj = {};
			obj[this.config.hidden_value_ids.leadCapture_submitted] = "true";
		this.pushResponseData(obj);

		// store flag in localstorage
		localStorage.setItem('leadCaptureSubmitted', this.params.sguid);

		// Form is submitted.
		this.showHideCaptureForm();
	},

	shareReport: function() {
		// email share
		var url = window.location.href,
	 		urlEncoded = encodeURIComponent(url),
			title = encodeURIComponent(this.config.email.title),
			bodyText = encodeURIComponent(this.config.email.body),
			hrefString = "mailto:%20?subject=" + title + "&body=" + bodyText + urlEncoded,
			introShare = $('section.share-report'),
			$copyLinks = introShare.find('.link').add(this.stickyNav.$shareDropDown.find('.link'));

	 	// set the email href
		introShare.find('.email').attr('href',hrefString);
		this.stickyNav.$shareDropDown.find('.email').attr('href',hrefString);

		// copy link to clipboard (if supported)

		$copyLinks.off();
		$copyLinks.on('click', function(){
			var supported = document.queryCommandSupported("copy");

			if (supported) {
			  try {
			    document.execCommand("copy");
			  } catch (e) {
			    supported = false;
			  }
			}

			if (!supported) {
				window.prompt ("Copy to clipboard: Ctrl/cmd+C, Enter", url);
			} else {
				copyToClipboard(url);
			}
		});

		function copyToClipboard(element) {
		    // Create a "hidden" input
			  var aux = document.createElement("input");

			  // Assign it the value of the specified element
			  aux.setAttribute("value", element);

			  // Append it to the body
			  document.body.appendChild(aux);

			  // Highlight its content
			  aux.select();

			  // Copy the highlighted text
			  document.execCommand("copy");

			  // Remove it from the body
			  document.body.removeChild(aux);
		}
	},

	// function to return number of products displayed on the report
	getNumberOfProducts: function() {
		var that = this,
			productsLength = 0;

		$.each(that.displayedProducts, function(sectorId, products) {
			if (typeof that.rbScores.sectors[sectorId] === "undefined") {
				return;
			}
			$.each(products, function(i, product) {
				if (product.type === "product") {
					productsLength++;
				}
			});
		});
		return productsLength;
	},

	getProducts: function() {
		var that = this,
			filteredItems = {
				sector_1: [],
				sector_2: [],
				sector_3: [],
			},
			duplicateItems = [],
			duplicateFlag;

		// filter products and articles into sector arrays
		// or into duplicateItems array if it's possible that item could go in more than one sector array,
		// to be sorted into the correct one later
		filterItems(this.config.products, 'product');
		filterItems(this.config.articles, 'article');

		// sort filteredItems array by item priority (1 = top priority)
		$.each(filteredItems, function(index, sectorArray) {
			sectorArray.sort(comparePriorities);
		});

		// add duplicate items into sector arrays (1 = top priority)
		sortDuplicateItems();

		// sort filteredItems array by item priority
		$.each(filteredItems, function(index, sectorArray) {
			sectorArray.sort(comparePriorities);
		});

		// swap out any duplicate articles where possible
		removeDuplicateArticles();

		// select top two priority products for each sector
		this.displayedProducts = getTopPriorityItems(filteredItems, true);

		// calculate and store the amount each product increases the sector & total scores
		var questionId,
			weight,
			updatedScores,
			sector_qsAnswered,
			sector_productCount,
			sector_maxScoreIncrease,
			sector_maxWeightIncrease,
			sector_updatedScores,
			total_qsAnswered = 0,
			total_maxScoreIncrease,
			total_maxWeightIncrease,
			total_updatedScores,
			productsLength = this.getNumberOfProducts();

		/*
			Calculate the maximum amount the total score can increase by when one product is selected
		 	(based on current score and number of products available to ensure that scores do not exceed the maximum of 90%

		 	((maximum score - current score) / number of products available)
			i.e. ((90% - 40%) / 5 products) = 10%

			Each product can only increase the total score by a maximum of 10% so that scores do not exceed 90%
		*/
		total_maxScoreIncrease = Math.floor((that.config.max_score - that.rbScores.total_static)/productsLength);


		var cumWeight = {
			total: 0,
			sectors: {}
		};
		$.each(that.levelFourWeights, function(sectorId, sectorWeights) {
			cumWeight.sectors[sectorId] = 0;
			$.each(sectorWeights, function(questionId, weight) {
				// calculate cumulative weights
				cumWeight.total += parseFloat(weight);
				cumWeight.sectors[sectorId] += parseFloat(weight);
			});
			// count total number of level 4 questions answered
			total_qsAnswered += Object.keys(sectorWeights).length;
		});

		// Loop through each product and determine the percentage value that this product will increase sector and total score by when selected
		$.each(that.displayedProducts, function(sectorId, products) {
			if (typeof that.levelFourWeights[sectorId] === "undefined") {
				return true;
			}

			// count how many level 4 questions were answered for this sector
			sector_qsAnswered = Object.keys(that.levelFourWeights[sectorId]).length;

			// count how many products there are for this sector
			sector_productCount = 0;
			$.each(that.displayedProducts[sectorId], function(i, product) {
				if (product.type === "product") {
					sector_productCount++;
				}
			});

			/*
				Calculate the maximum amount the sector score can increase by when one product is selected
			 	(based on current score and number of products available to ensure that scores do not exceed the maximum of 90%).

			 	((maximum score - current score) / number of products available)
				i.e. ((90% - 40%) / 5 products) = 10%

				Each product can only increase the total score by a maximum of 10% so that scores do not exceed 90%
			*/
			sector_maxScoreIncrease = (that.config.max_score - that.rbScores.sectors_static[sectorId])/sector_productCount;

			if (sector_maxScoreIncrease > 40) {
				sector_maxScoreIncrease = 40;
			}
			total_maxWeightIncrease = (((total_maxScoreIncrease + that.rbScores.total_static/that.config.max_score) * total_qsAnswered) - cumWeight.total).toFixed(3);

			// For each product in this sector
			$.each(products, function(i, product) {

				updatedScores = that.calculateScores(that.changeScore(product.id, sectorId, true));

				// if total score increase or the sector score increase is greater than the maximum allowed
				if ((updatedScores.total - that.rbScores.total_static) > total_maxScoreIncrease ||
					(updatedScores.sectors[sectorId] - that.rbScores.sectors[sectorId]) > sector_maxScoreIncrease) {

					// calculate the score increase when at maximum total score increase
					total_updatedScores = that.calculateScores(that.changeScore(product.id, sectorId, true, total_maxWeightIncrease));

					// if the sector score increase is still greater than the maximum allowed
					// then use the maximum sector increase value to recalculate score increase
					if ((total_updatedScores.sectors[sectorId] - that.rbScores.sectors_static[sectorId]) > sector_maxScoreIncrease) {
						// recalculate
						sector_maxWeightIncrease = ((((that.rbScores.sectors_static[sectorId] + sector_maxScoreIncrease)/that.config.max_score) * sector_qsAnswered) - cumWeight.sectors[sectorId]).toFixed(3);
						sector_updatedScores = that.calculateScores(that.changeScore(product.id, sectorId, true, sector_maxWeightIncrease));

						// store score change values
						product.scoreChange = sector_updatedScores.sectors[sectorId] - that.rbScores.sectors_static[sectorId];
						product.scoreChangeTotal = sector_updatedScores.total - that.rbScores.total_static;
					} else {
						// store score change values
						product.scoreChange = total_updatedScores.sectors[sectorId] - that.rbScores.sectors_static[sectorId];
						product.scoreChangeTotal = total_updatedScores.total - that.rbScores.total_static;
					}
				} else {
					// store score change values
					product.scoreChange = updatedScores.sectors[sectorId] - that.rbScores.sectors_static[sectorId];
					product.scoreChangeTotal = updatedScores.total - that.rbScores.total_static;
				}

				product.scoreChange = product.scoreChange<0?0:product.scoreChange;
				product.scoreChangeTotal = product.scoreChangeTotal<0?0:product.scoreChangeTotal;
			});
		});

		return this.displayedProducts;

		// Filter products and articles down to those that have had their display logic met or is a fallback
		function filterItems(items, itemType) {
			var questionData,
				logicString,
				questionId,
				optionIndex,
				fallbackPriority = 100,
				fallbackFlag,
				logicPassed,
				sectorId,
				objIndex,
				itemCopy;

			$.each(items, function(i, item) {
				duplicateFlag = false;
				fallbackFlag = false;
				logicPassed = false;

				item.type = itemType;

				if (typeof item.fallback !== "undefined") {
					fallbackFlag = true;
					// loop through fallbacks
					if (item.fallback.length > 1) {
						item.sectorId = item.fallback;
						// push item to duplicates array
						duplicateItems.push(item);
					} else {
						sectorId = item.fallback[0];
						item.sectorId = [sectorId];
						// push item to sector array
						filteredItems[sectorId].push(item);
					}
				}

				// Do not continue if there is no display logic
				if (typeof item.display_logic !== "undefined") {

					// loop through display logic
					$.each(item.display_logic, function(j, logic) {
						// Do not continue looping through logic if we do not have a questionId
						if (typeof logic.questionId === "undefined") {
							return false;
						}

						// Skip to next display logic if the user hasn't answered this question
						if (typeof that.responseData[logic.questionId] === "undefined") {
							return true;
						}

						// Get config data for this question
						questionData = that.config.level4_question_data.getObject('id', logic.questionId);

						// Skip to next display logic if the  cumulative weight for this question already maxed out at ~1
						// (i.e. selecting a product won't increase the weight)
						// Only for products
						if (typeof item.type !== "undefined" &&
							item.type.toLowerCase() === "product" &&
							typeof that.levelFourWeights[questionData.sectorId] !== "undefined" &&
							that.levelFourWeights[questionData.sectorId][logic.questionId] > 0.95) {
								return true;
						}

						// If there is logic convert it to a string that can be evaluated...
						if (typeof logic.additional_logic !== "undefined") {
							// Convert AND, OR, NOT to &&, ||, !
							logicString = logic.additional_logic.toLowerCase().replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!');

							// select each questionId/optionIndex string (i.e. 12.1) and convert to an expression, then
							// add it back into the logic string.
							logicString = logicString.replace(/\b[0-9]*\.[0-9]*\b/g, function(match) {

								// Split questionId and optionIndex into variables
								questionId = match.toString().split('.')[0];
							 	optionIndex = match.toString().split('.')[1];

							 	// convert letter to number if that's how it has been configured. i.e. a = 1, b = 2, c = 3.
							 	//optionIndex = ((isNaN(optionIndex)) ? optionIndex.charCodeAt(0) - 96 : optionIndex )
							 	return "(typeof that.responseData[" + questionId + "] !== 'undefined' && $.inArray('" + optionIndex + "', that.responseData[" + questionId + "]) !== -1)"
							});

							// execute the logic string expression
							if(!eval(logicString)) {
								// Skip to next display logic if this item does not pass
								return true;
							}
						}

						// If we are this far the item has passed this display logic
						logicPassed = true;

						// If this item already exists in a different sector array
						// move it to the duplicates array to be sorted later
						$.each(filteredItems, function(sectorId, sectorArray) {
							objIndex = sectorArray.getIndexOfObject('id', item.id);

							// if duplicate is found
							if (objIndex !== -1) {
								duplicateFlag = true;

								// if existing item is not a fallback (priority does not equal fallback priority)
								if (sectorArray[objIndex].priority !== fallbackPriority) {
									// remove existing item
									filteredItems[sectorId].splice(objIndex, 1);
									// push to duplicates array to be sorted later
									duplicateItems.push(item);

									return false;
								}
							}
						});

						if (item.type === "product") {
							item.questions = item.questions || [];
							// store questionId of logic passed if not already stored
							if ($.inArray(questionData.questions, logic.questionId) === -1) {
								item.questions.push(logic.questionId);
							}
						}

						item.sectorId = item.sectorId || [];
						// store sector of logic passed if not already stored
						if ($.inArray(questionData.sectorId, item.sectorId) === -1) {
							item.sectorId.push(questionData.sectorId);
						}

						if (!duplicateFlag && fallbackFlag) {
							// duplicate item not found in sectorId arrays but item is flagged as a fallback - thus it is in duplicates array.
							// we want to push item to sectorId array with high priority, but also keep fallbacks in duplicate array with low priority
							// therefore, we must clone the object in this case
							itemCopy = clone(item);
							filteredItems[questionData.sectorId].push(itemCopy);
							// reset logic flag so that fallback priority gets set for this item
							logicPassed = false;

						} else if (!duplicateFlag) {
							// push it to a sectorId array
							filteredItems[questionData.sectorId].push(item);
						} else {
							return false;
						}
					});
				}
				// if this item was only a fallback, then overwrite its priority with the fallback priority
				if (!logicPassed && !duplicateFlag && fallbackFlag) {
					item.priority = fallbackPriority;
				}
			});
		}

		function sortDuplicateItems() {
			var lowestItem,
				itemSectors = [],
				uniqueItemSectors = [],
				itemArrays,
				pushedFlag;

			// Do not continue if there are no duplicate items
			if (!duplicateItems.length) {
				return false;
			}

			// Sort duplicate items in order of priority
			duplicateItems.sort(comparePriorities);

			duplicateItems = $.grep(duplicateItems, function(item, index) {
				itemSectors = [];
				uniqueItemSectors = [];
				itemArrays = [];
				pushedFlag = false;

				//Create array of all possible sector arrays this item could belong to
				if (typeof item.fallback !== "undefined") {
					itemSectors = $.merge(itemSectors, item.fallback);
				}
				if (typeof item.sectorId !== "undefined") {
					itemSectors = $.merge(itemSectors, item.sectorId);
				}

				// remove duplicates from array
				$.each(itemSectors, function(i, el){
    				if($.inArray(el, uniqueItemSectors) === -1) uniqueItemSectors.push(el);
				});

				$.each(uniqueItemSectors, function(index, sectorId) {
					// Push this item to the first sector found that has less than two items in it
					if (filteredItems[sectorId].length < 2) {
						item.sectorId = [sectorId] || [];
						filteredItems[sectorId].push(item);
						pushedFlag = true;
						return false;
					}
					// make an object of these sectorId arrays
					itemArrays.push(filteredItems[sectorId]);
				});

				// Do not continue if this item was pushed to a sector already
				if (pushedFlag) {
					return false;
				}

				// get lowest priority item of the top two items for the selected sectors
				lowestItem = getLowestPriorityItem(itemArrays);

				// if this items priority is higher than that of the lowest priority item...
				if (item.priority < lowestItem.priority) {
					item.sectorId = lowestItem.sectorId;
					// ...push this item to that sectorId array
					filteredItems[lowestItem.sectorId].push(item);
					// remove duplicate item from array
					return false;
				} else {
					// keep duplicate item in array
					return true;
				}
			});
		}

		// Get lowest priority item of the top/selected items
		function getLowestPriorityItem(itemArrays) {
			var topItems = getTopPriorityItems(itemArrays),
				lowestPriorityItem = {
					priority: 0
				};

			$.each(topItems, function(index, item) {
				if (item.priority > lowestPriorityItem.priority) {
					// this item is the new lowest priority
					lowestPriorityItem = item;
				}
			});
			return lowestPriorityItem;
		}

		// Get selected/top priority items
		function getTopPriorityItems(itemArrays, bySector) {
			var result,
				length,
				bySector = bySector || false;

			$.each(itemArrays, function(index, sectorArray) {
				length = ((sectorArray.length > 2) ? 2 : sectorArray.length);
				for(var i = 0; i < length; i++) {

					// if bySector is true, organise the results array by sector
					if (bySector) {
						result = result || {};
						result[index] = result[index] || [];

						result[index].push(sectorArray[i]);
					// otherwise store all top priority items as one results object
					} else {
						result = result || [];
						result.push(sectorArray[i]);
					}
				}
			});
			return result;
		}

		function comparePriorities(a, b) {
			if (a.priority < b.priority) {
				return -1;
			} else if (a.priority > b.priority) {
				return 1;
			} else {
				return 0;
			}
		}

		function removeDuplicateArticles() {
			$.each(filteredItems, function(index, sectorArray) {
				if (sectorArray.length <= 2) {
					return true;
				}
				// of the top two products for each sector:
				// if an article matches the associated article of a product
				// push that article to the end of the sector array
				if (sectorArray[0].article_id === sectorArray[1].id) {
					sectorArray.push(sectorArray.splice(1,1)[0]);
				} else if (sectorArray[1].article_id === sectorArray[0].id) {
					sectorArray.push(sectorArray.splice(0,1)[0]);
				}
			});
		}
	},

	// ===================================
	// ====== Populate Full Report =======
	// ===================================

	populateFullReport: function(products) {
		var that = this,
			reportSector,
			content,
			score;

		$.each(this.config.sector_name, function(sectorId, name) {
			if (typeof that.rbScores.sectors[sectorId] === "undefined") {
				return true;
			}
			score = that.rbScores.sectors[sectorId];
			buildReport(sectorId, score);
			reportSector = that.$fullReport.find('.sector-wrapper.' + sectorId);
			populateAnswerReview(sectorId);
			drawSectorCircleGraphs(sectorId, score);
			populateItems(sectorId, products);
		});

		function buildReport(sectorId, score) {
			content = that.config.full_report_content.sector_content.getObject("sectorId", [sectorId]);

			var sectorReadiness = that.getReadiness(that.rbScores.sectors[sectorId]),
				sectorReadinessClass = that.readiness[sectorReadiness].class;

			that.$fullReport.append('\
				<h2 class="header-bar capitalize ' + sectorId + '">' + that.config.sector_name[sectorId] + '</h2> \
				<div class="sector-wrapper ' + sectorId + '">\
					<p class="intro">' + that.replacePlaceholders(content.intro, {"sectorId": sectorId}) + '</p> \
					<p class="review-answers-expand">' + that.config.full_report_content.review_answers_expand + '<span class="down-chevron"></span></p> \
					<div class="review-answers"> \
						<ul></ul> \
						<p class="review-answers-close"><strong>'+ that.config.full_report_content.review_answers_close +'</strong><span class="up-chevron"></span><p>\
					</div> \
					<div class="graph-col"> \
						<h3 class="sector-heading">'+ that.replacePlaceholders(that.config.full_report_content.sector_graph_heading, {"sectorId": sectorId}) +'</h3>\
						<div class="score-container sector-score ' + sectorId + '"></div> \
						<h3 class="rb-score-heading">'+ that.replacePlaceholders(that.config.full_report_content.total_graph_heading, {"sectorId": sectorId}) +'</h3>\
						<div class="score-container rb-score ' + sectorId + '"></div> \
					</div> \
					<div class="product-col">\
						<h3 class="products-heading"></h3>\
					</div> \
				</div> \
			');
		}

		function populateAnswerReview(sectorId) {
			var questionConfig,
				answerConfig,
				responseId,
				$reviewAnswers = reportSector.find('.review-answers'),
				$answersList = $reviewAnswers.find('ul'),
				$expandLink = reportSector.find('.review-answers-expand'),
				questionResponse,
				questionCounter = 0,
				answerCounter,
				numberOfAnswerText = 3,
				answerList;

			// Loop each level 4 question that was answered
			$.each(that.levelFourWeights[sectorId], function(questionId, weight) {
				answerCounter = 0;
				// Get config info for this question
				questionConfig = that.config.level4_question_data.getObject("id", questionId);
				// Get answered options for this question
				questionResponse = that.responseData[questionId];

				if(typeof questionConfig === "undefined" || typeof questionResponse === "undefined") {
					return true;
				}

				// create unordered list of question answers
				// answerList = $('<li><ul></ul></li>');
				// Loop each option answered and add list item
				$.each(questionResponse, function(index, answerId) {
					answerConfig = questionConfig.answer_options.getObject("reporting_val", answerId);
					if (typeof answerConfig === "undefined") {
						return true;
					}
					$answersList.append(' \
						<li> \
							<h5><strong>' + answerConfig.associated_text.title + '</strong></h5> \
							<p>' + answerConfig.associated_text.body + '</p> \
						</li> \
					');
					// Max number of answer options per question
					answerCounter++;
					if (answerCounter === numberOfAnswerText) {
						return false;
					}
				});

				// append unordered list to the ordered list
				$reviewAnswers.find('ol').append(answerList);
				// max number of questions
				questionCounter++;
				if (questionCounter === numberOfAnswerText) {
					return false;
				}
			});

			reportSector.find('.review-answers-expand, .review-answers-close').click(function() {
				$reviewAnswers.toggleClass('open');

				if ($reviewAnswers.hasClass('open')) {
					$reviewAnswers.velocity('slideDown', {duration: 500});
					$expandLink.addClass('open').html(that.config.full_report_content.review_answers_heading);
				} else {
					$reviewAnswers.velocity('slideUp', {duration: 500});
					$expandLink.removeClass('open').html(that.config.full_report_content.review_answers_expand + '<span class="down-chevron"></span>');
				}
			});
		};

		function drawSectorCircleGraphs(sectorId, score) {
			var $rbGraphContainer = $('.'+sectorId + '.score-container.rb-score'),
				$sectorGraphContainer = $('.'+sectorId + '.score-container.sector-score'),
				readiness_totalStatic = that.getReadiness(that.rbScores.total_static),
				readiness_sectorScore = that.getReadiness(score),
				innerLabel_sectorScore = that.replacePlaceholders(that.config.full_report_content.circle_graph_labels.inner_label_sector, {"sectorId": sectorId}),
				innerLabel_rbScore = that.replacePlaceholders(that.config.full_report_content.circle_graph_labels.inner_label_total, {"sectorId": sectorId});

			that.circleGraphs.fullReport[sectorId] = that.circleGraphs[sectorId] || {};

			that.circleGraphs.fullReport[sectorId].rbGraph = new CircleGraph($rbGraphContainer);
			that.circleGraphs.fullReport[sectorId].rbGraph.setLine(that.rbScores.total_static, 300);
			that.circleGraphs.fullReport[sectorId].rbGraph.setPercentage(that.rbScores.total_static, 'small');
			that.circleGraphs.fullReport[sectorId].rbGraph.setInnerLabel(innerLabel_rbScore, 'small fixed-height');

			that.setColorScheme($rbGraphContainer, that.getReadiness(that.rbScores.total_static));
			that.setColorScheme($rbGraphContainer.find('.circle-graph-container'), readiness_totalStatic);
			that.setColorScheme($rbGraphContainer.find('.score-label'), readiness_totalStatic);

			that.circleGraphs.fullReport[sectorId].sectorGraph = new CircleGraph($sectorGraphContainer);
			that.circleGraphs.fullReport[sectorId].sectorGraph.setLine(score, 300);
			that.circleGraphs.fullReport[sectorId].sectorGraph.setInnerLabel(innerLabel_sectorScore);

			that.setColorScheme($sectorGraphContainer, that.getReadiness(score));
			that.setColorScheme($sectorGraphContainer.find('.circle-graph-container'), readiness_sectorScore);
			that.setColorScheme($sectorGraphContainer.find('.score-label'), readiness_sectorScore);
		}

		function populateItems(sectorId, items) {
			var article,
				$itemHTML,
				products = items[sectorId].getObject('type', 'product'),
				productsHeading;

			if (typeof products === "undefined") {
				productsHeading = that.replacePlaceholders(that.config.full_report_content.no_products_intro, {"sectorId": sectorId});
			} else {
				productsHeading = that.replacePlaceholders(that.config.full_report_content.products_intro, {"sectorId": sectorId});
			}

			reportSector.find('.products-heading').html(productsHeading);

			// add each product
			$.each(items[sectorId], function(index, item) {
				if (item.type === "product") {
					// get associated article config
					article = that.config.articles.getObject('id', item.article_id);
				} else {
					article = item;
				}

				$itemHTML = $('<div class="item '+ item.type +' '+ item.id +'">\
									<div class="select-product" data-productid="' + item.id + '" data-sectorid="' + sectorId + '"></div>\
									<div class="left-col">\
										<h3 data-productid="' + item.id + '" data-sectorid="' + sectorId + '"><strong>' + item.title + '</strong></h3>\
										<p>' + item.description +'</p>\
									</div>\
									<div class="right-col image" style="background-image: url(\'' + item.image + '\')"> \
									</div>\
								</div>');

				if (typeof article !== "undefined" && typeof article.url !== "undefined" && article.url !== "") {
					$itemHTML.find('.left-col').append('<a href="' + article.url + '" target="_blank" class="link">' + article.link_text + '</a>');
					$itemHTML.find('.right-col').wrap('<a href="' + article.url + '" target="_blank" class="image"></a>');
				}

				reportSector.find('.product-col').append($itemHTML);
			});
		}
	},

	bindProductSelection: function() {
		var $this,
			parentDiv,
			that = this,
			$productSelects = that.$pageWrapper.find('.product > .select-product, .product > .left-col > h3, .product-grid > .product > .tick-box, .product-grid > .product > .product-info').off(),
			$outroProductGrid = that.$outroSummary.find('.product-grid'),
			product,
			productId,
			sectorId,
			updatedScores,
			regex,
			match,
			params_string,
			new_params_string,
			sectorId;

		$productSelects.click(function() {
			$this = $(this);
			productId = $this.data('productid');
			sectorId = $this.data('sectorid');
			regex = new RegExp("(&p[0-9]*=" + productId + ")([^0-9]?\\b)", "g");
			product = that.displayedProducts[sectorId].getObject('id', productId);

			//if($this.parent().hasClass('selected')) {
			if(that.$pageWrapper.find('.item.product.'+productId).hasClass('selected')) {
				// Deselect
				product.selected = false;
				that.rbScores.sectors[sectorId] -= product.scoreChange;
				that.rbScores.total -= product.scoreChangeTotal;
				new_params_string = window.location.search;
				match = regex.exec(new_params_string);
				if (match !== null) {
					new_params_string = new_params_string.replace(match[1], "");
				}
				if (that.productSelectedCount > 1) {
					that.productSelectedCount--;
				}

			} else {
				// Select
				product.selected = true;
				that.rbScores.sectors[sectorId] += product.scoreChange;
				// ensure score does not exceed maximum score
				if (that.rbScores.sectors[sectorId] > that.config.max_score) {
					that.rbScores.sectors[sectorId] = that.config.max_score;
				}
				that.rbScores.total += product.scoreChangeTotal;
				// ensure score does not exceed maximum score
				if (that.rbScores.total  > that.config.max_score) {
					that.rbScores.total  = that.config.max_score;
				}
				match = regex.exec(window.location.search);
				if (match == null) {
					new_params_string = window.location.search + '&p' + that.productSelectedCount + '=' + productId;
					that.productSelectedCount++;
					that.updateUrlParams(new_params_string);
				}
			}

			that.$pageWrapper.find('.product.'+productId).toggleClass('selected');
			that.updateSectorCircleGraphs(that.rbScores, sectorId);
			that.updatePotentialScore();
			that.updatePotentialScoreText();
			that.updateUrlParams(new_params_string);
		});
	},

	autoSelectProducts: function() {
		var that = this;
		// get any product parameters currently in URL
		var params = decodeURIComponent(window.location.search.substring(1)).split(/\?|\&/),
			product_params = "",
			param,
			key,
			value,
			$productBoxes = that.$fullReport.find('.product-col>.product');

		params.forEach(function (kVPair) {
			if (kVPair) {
				param = kVPair.split("=");
				key = param[0];
				value = param[1];

				if (key.match(/p[0-9]*/)) {
					$productBoxes.find('.select-product[data-productid="' + value + '"]').click();
				}
			}
		});
	},

	updateSectorCircleGraphs: function(scores, sectorId) {
		var circleGraphContainer,
			readiness,
			innerLabel,
			that = this;

		$.each(that.circleGraphs.fullReport, function(sectorId, graphObj) {
			innerLabel = that.replacePlaceholders(that.config.full_report_content.circle_graph_labels.inner_label_total, {"sectorId": sectorId});

			graphObj.rbGraph.setLine(scores.total, 300);
			graphObj.rbGraph.setPercentage(scores.total);
			graphObj.rbGraph.setInnerLabel(innerLabel, 'small fixed-height');

			readiness = that.getReadiness(scores.total);

			that.setColorScheme(graphObj.rbGraph.container, readiness);
			that.setColorScheme(graphObj.rbGraph.container.find('.circle-graph-container'), readiness);
			that.setColorScheme(graphObj.rbGraph.container.find('.score-label'), readiness);
		});

		that.circleGraphs.fullReport[sectorId].sectorGraph.setLine(scores.sectors[sectorId], 300);
		readiness = that.getReadiness(scores.sectors[sectorId]);
		that.setColorScheme(that.circleGraphs.fullReport[sectorId].sectorGraph.container, readiness);
		that.setColorScheme(that.circleGraphs.fullReport[sectorId].sectorGraph.container.find('.circle-graph-container'), readiness);
		that.setColorScheme(that.circleGraphs.fullReport[sectorId].sectorGraph.container.find('.score-label'), readiness);
		innerLabel = that.replacePlaceholders(that.config.full_report_content.circle_graph_labels.inner_label_sector, {"sectorId": sectorId});
		that.circleGraphs.fullReport[sectorId].sectorGraph.setInnerLabel(innerLabel);
	},

	updatePotentialScore: function(score) {
		var score = score || this.rbScores.total;

		this.circleGraphs.potentialScoreGraph.setLine(score, 300);
		this.circleGraphs.potentialScoreGraph.setPercentage(score);
		this.setColorScheme(this.circleGraphs.potentialScoreGraph.container.find('.circle-graph-container'), this.getReadiness(score));
	},

	updatePotentialScoreText: function() {
		var $selectedProducts = this.$outroSummary.find('.product-grid > .product.selected'),
			$potentialScoreSubHeading = this.$outroSummary.find('p.sub-heading');
		if ($selectedProducts.length) {
			$potentialScoreSubHeading.html(this.config.full_report_content.potential_score_sub_heading.selected)
		} else {
			$potentialScoreSubHeading.html(this.config.full_report_content.potential_score_sub_heading.not_selected)
		}
	},

	replacePlaceholders: function(string, args) {
		args = args || {};

		// TOTAL_SCORE
		// returns: total score as a percentage
		string = string.replace(/\{\bTOTAL_SCORE\b\}/g, this.rbScores.total);
		string = string.replace(/\{\bTOTAL_SCORE_STATIC\b\}/g, this.rbScores.total_static);

		// TOTAL_READINESS
		// returns: readiness for total score
		string = string.replace(/\{\bTOTAL_READINESS\b\}/g, this.config.readiness_name[this.getReadiness(this.rbScores.total)]);
		string = string.replace(/\{\bTOTAL_READINESS_STATIC\b\}/g, this.config.readiness_name[this.getReadiness(this.rbScores.total_static)]);

		if (typeof args.sectorId !== "undefined") {
			// SECTOR_NAME
			// returns: name of given sector
			string = string.replace(/\{\bSECTOR_NAME\b\}/g, toTitleCase(this.config.sector_name[args.sectorId]));

			// SECTOR_SCORE
			// returns: total score as a percentage for this sector
			string = string.replace(/\{\bSECTOR_SCORE\b\}/g, this.rbScores.sectors[args.sectorId]);
			string = string.replace(/\{\bSECTOR_SCORE_STATIC\b\}/g, this.rbScores.sectors_static[args.sectorId]);

			// SECTOR_READINESS
			// returns: readiness for this sector
			string = string.replace(/\{\bSECTOR_READINESS\b\}/g, this.config.readiness_name[this.getReadiness(this.rbScores.sectors[args.sectorId])]);
			string = string.replace(/\{\bSECTOR_READINESS_STATIC\b\}/g, this.config.readiness_name[this.getReadiness(this.rbScores.sectors_static[args.sectorId])]);

			// if (typeof args.productId !== "undefined") {
			// 	var product = this.displayedProducts[args.sectorId].getObject('id', args.productId);

			// 	string = string.replace(/\{\bPRODUCT_TITLE\b\}/g, product.title);

			// 	// PRODUCT_SCORE_INCREASE_TOTAL
			// 	// returns: the total score increase for this product, as a percentage
			// 	string = string.replace(/\{\bPRODUCT_SCORE_INCREASE_TOTAL\b\}/g, product.scoreChangeTotal);

			// 	// PRODUCT_SCORE_INCREASE_SECTOR
			// 	// returns: the sector score increase for this product, as a percentage
			// 	string = string.replace(/\{\bPRODUCT_SCORE_INCREASE_SECTOR\b\}/g, product.scoreChange);
			// }
		}
		return string;
	},

	populateOutroSummary: function() {
		var that = this,
			$originalScoreContainer = this.$outroSummary.find('.score-container.original-rb-score'),
			$potentialScoreContainer = this.$outroSummary.find('.score-container.potential-rb-score'),
			$sectorListContainer = this.$outroSummary.find('.sector-list'),
			selectedClass,
			productCount = 0;

		this.$productGridContainer = this.$outroSummary.find('.product-grid')

		// Original score graph
		this.circleGraphs.originalScoreGraph = new CircleGraph($originalScoreContainer);
		this.circleGraphs.originalScoreGraph.setLine(this.rbScores.total_static, 300);
		this.circleGraphs.originalScoreGraph.setPercentage(this.rbScores.total_static, 'small')
		this.setColorScheme($originalScoreContainer.find('.circle-graph-container'), this.getReadiness(this.rbScores.total_static));

		// Potential readiness graph
		this.circleGraphs.potentialScoreGraph = new CircleGraph($potentialScoreContainer);
		this.updatePotentialScore();
		this.updatePotentialScoreText();

		// Populate sector list and product grid
		$.each(this.config.sector_name, function(sectorId, sectorName) {
			if (typeof that.rbScores.sectors[sectorId] === "undefined") {
				return true;
			}

			// Populate sector list
			$sectorListContainer.append('<div class="sector-box capitalize"><p>'+ sectorName +'</p></div>');

			// Populate product grid
			$.each(that.displayedProducts[sectorId], function(i, product) {
				if (typeof product === "undefined" || product.type !== "product" /*|| productCount > 0*/) {
					return true;
				}
				productCount++;

				that.$productGridContainer.append('\
					<div class="product '+ product.id +'">\
						<div class="tick-box" data-productid="'+ product.id +'" data-sectorid="'+ sectorId +'"></div>\
						<div class="product-info" data-productid="'+ product.id +'" data-sectorid="'+ sectorId +'">\
							<p>'+ product.title +'</p>\
							<h3>+'+ product.scoreChangeTotal +'%</h3>\
						</div>\
					</div>');
			});
		});

		if (productCount===1) {
			this.$productGridContainer.find('.product').addClass('single');
		}
	},

// ==============================
// ====== Animate Page In =======
// ==============================

	animatePageIn: function () {
		var that = this,
			innerLabel,
			sectorId,
			sectorScore,
			$resultsScoreModule = that.$introSummary.find('.module.results-score'),
			$resultsScoreTitle = $resultsScoreModule.find('h3');

		Velocity.RegisterEffect("transition.scaleY", {
			defaultDuration: 700,
			calls: [
				[{scaleY: [1, 0]}]
			]
		});

		phase1();

		function phase1() {
			Velocity($resultsScoreTitle, "transition.slideDownIn", {duration: 900});
			window.setTimeout(phase2, 500);
		}
		function phase2() {
			// Animate total RB score inner line, percentage and label
			innerLabel = that.replacePlaceholders(that.config.full_report_content.circle_graph_labels.inner_label_total_static);
			that.circleGraphs.rbGraph.setPercentage(that.rbScores.total_static);
			that.circleGraphs.rbGraph.setLine(that.rbScores.total_static, 1000);
			that.circleGraphs.rbGraph.setInnerLabel(innerLabel);
			Velocity(that.circleGraphs.rbGraph.innerLabel, "transition.slideUpIn", {duration: 1000});


			if (that.industryChart) {
				window.setTimeout(animateIndustryChart, 1000);
			} else {
				window.setTimeout(phase3, 500);
			}
		}
		function animateIndustryChart() {
			var $industryResultsContainer = that.$introSummary.find('.industry-results'),
				$industryResultsTitle 	= $industryResultsContainer.find('h3'),
				$industryChart 			= $industryResultsContainer.find('.industry-chart'),
				$industryChartCols 		= $industryChart.find('.chart-col'),
				$industryChartPercents 	= $industryChartCols.find('span'),
				$industryChartText		= $industryChart.next('.disclaimer');

			Velocity($industryResultsTitle, "transition.slideDownIn", {duration: 900});
			Velocity($industryChartText, "transition.slideRightIn", {duration: 900});
			that.drawIndustryChart();
			Velocity($industryChart, "transition.slideUpIn", {duration: 900});
			Velocity($industryChartCols, "transition.scaleY", {duration: 900, stagger: 200});
			Velocity($industryChartPercents, "transition.fadeIn", {duration: 900, delay: 900});
			window.setTimeout(phase3, 500);
		}
		function phase3() {
			// Animate each sector summary graph
			var $sectorSummaryContainer = that.$introSummary.find('.sector-summary-container'),
				$sectorSummaryHeader = $sectorSummaryContainer.find('h3'),
				$wrapper = $sectorSummaryContainer.find('.wrapper'),
				$wrapperHeader,
				$graphWrapper,
				$wrapperPara,
				sectorId;

			Velocity($sectorSummaryHeader, "transition.slideDownIn", {duration: 900});
			Velocity($wrapper, "transition.slideDownIn", {duration: 300, stagger: 300});
			if (that.$pageWrapper.hasClass('with-footer')) {
				window.setTimeout(phase4, 900);
			}
		}
		function phase4() {
			that.$fullReportFooter.velocity('transition.slideUpIn', {duration: 500});
		}
	}
};

(function () {
	window.rbReport = new ReportPage(window.rbApp, window.Velocity);
})();

$(document).ready(function () {
	if (typeof matchMedia != "undefined") {
		var mq = window.matchMedia("(min-width: 768px)");
		mq.addListener(WidthChange);
		WidthChange(mq);
	}

	// media query change
	function WidthChange(mq) {
		if (mq.matches) {
			$('body').removeClass('mobile-view');
		}
		else {
			$('body').addClass('mobile-view');
		}
	};

	// fix to ie9: the overflow hidden on report page makes the page appear cut off on reload
	// when scrolled down initially, then reloaded, this avoids the bug by scrolling to top.
	$('.page-wrapper').scrollTop(0);

	Velocity($('.scroll-wrapper > h1'), "transition.slideDownIn", {duration: 900});
});

if (!Object.keys) {
    Object.keys = function (obj) {
        var keys = [],
            k;
        for (k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
                keys.push(k);
            }
        }
        return keys;
    };
}


