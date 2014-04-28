var eqHelper = (function() {

	var isIE        = new RegExp('(MSIE)|(Trident)', 'i').test(navigator.userAgent),
		pageStyles  = '.fm-eq { position: relative; } .fm-eq-object { display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; padding: 0; margin: 0; opacity: 0; z-index: -1000; pointer-events: none; }',
		stylesAdded;

	function ElementQueryHelper(config) {
		config = config || {};

		this.rules      = config.rules || [];
		this.touchDOM   = ('boolean' === typeof config.touchDOM) ? config.touchDOM : true;
		this.mqMatches  = [];

		if (!stylesAdded) this._addPageStyles();
	}

	var proto = ElementQueryHelper.prototype;

	/* PRIVATE */

	proto._addPageStyles = function() {

		var styleNode               = document.createElement('style');
			stylesheetContainerNode = document.getElementsByTagName('head')[0] || document.documentElement;

		if (styleNode.styleSheet) {
			styleNode.styleSheet.cssText = pageStyles;
		} else {
			styleNode.appendChild(document.createTextNode(pageStyles));
		}

		stylesheetContainerNode.insertBefore(styleNode, stylesheetContainerNode.firstChild);
		stylesAdded = true;
	};

	proto._objectLoad = function(e) {
		this.objDoc = this.objNode.contentDocument;
		this._setListeners();
	};

	proto._setListeners = function() {

		var changed = [],
			ruleName, mediaSet, mql;

		this.listeners = {};

		for (ruleName in this.rules) {
			if (this.rules.hasOwnProperty(ruleName)) {

				mediaSet = this.rules[ruleName];
				mql      = this.objDoc.defaultView.matchMedia(mediaSet);

				this.listeners[ruleName] = {
					mediaSet: mediaSet,
					mql:      mql,
					callback: this._onMQChange.bind(this, ruleName)
				};

				mql.addListener(this.listeners[ruleName].callback);
				if (mql.matches) {
					this.mqMatches.push(ruleName);
					changed.push(ruleName);
				}
			}
		}

		if (changed.length) {
			if (this.touchDOM) this._setMQAttribute();
			changed.forEach(function _fire(ruleName) {
				this._fireEvent(ruleName, true);
			}.bind(this));
		}
	};

	proto._onMQChange = function(ruleName, mql) {

		var changed;

		if (mql.matches && this.mqMatches.indexOf(ruleName) < 0) {
			this.mqMatches.push(ruleName);
			changed = true;
		} else if (!mql.matches && this.mqMatches.indexOf(ruleName) >= 0) {
			this.mqMatches.splice(this.mqMatches.indexOf(ruleName), 1);
			changed = true;
		}

		if (changed) {
			if (this.touchDOM) this._setMQAttribute();
			this._fireEvent(ruleName, mql.matches);
		}
	};

	proto._setMQAttribute = function() {
		this.target.setAttribute('matched-media', this.mqMatches.join(' '));
	};

	proto._fireEvent = function(ruleName, matches) {
		this.module.fireStatic('eq-change', ruleName, matches);
	};



	/* PUBLIC API */

	proto.setModule = function(module) {
		this.module = module;
	};

	proto.createObjectNode = function(target) {
		this.target = target;

		this.objNode           = document.createElement('object');
		this.objNode.onload    = this._objectLoad.bind(this);
		this.objNode.type      = 'text/html';
		this.objNode.className = 'fm-eq-object';

		// For IE, must add data source after insertion
		if (!isIE) this.objNode.data = 'about:blank';
		this.target.appendChild(this.objNode);
		if (isIE) this.objNode.data = 'about:blank';
	};

	proto.teardown = function() {

		var ruleName;

		delete this.objNode;
		delete this.objDoc;
		delete this.target;
		delete this.module;

		for (ruleName in this.listeners) {
			if (this.listeners.hasOwnProperty(ruleName)) {
				this.listeners[ruleName].mql.removeListener(this.listeners[ruleName].callback);
			}
		}
	};

	// Return a configurable instance
	return function(config) {

		var helper = new ElementQueryHelper(config);

		// Return a FM helper
		return function(module) {

			module.on('initialize', function() {
				helper.setModule(module);
			});

			module.on('before tohtml', function() {
				this.classes.push('fm-eq');
			});

			module.on('render', function() {
				helper.createObjectNode(this.el);
			});

			module.on('teardown', function() {
				helper.teardown();
			});
		};
	};


})();