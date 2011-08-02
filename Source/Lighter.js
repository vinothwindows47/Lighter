/*
---
description: Builds and displays an element containing highlighted code bits.

license: MIT-style

authors:
- Jose Prado

requires:
  core/1.2.4: '*'

provides: [Lighter]

...
*/
(function() {

var Lighter = this.Lighter = new Class({	
	
	Implements: [Options, Events],
	
	options: {
		compiler: null,
		fuel:     'standard',
		flame:    'standard',
		indent:   -1,
		loader:   null,
		parser:   null
	},
	
	/**
	 * @constructs
	 * @param {Object} options The options object.
	 * @return {Lighter} The current Lighter instance.
	 */
	initialize: function(options)
	{
		this.setOptions(options);
		this.setLoader(this.options.loader);
		this.setParser(this.options.parser);
		this.setCompiler(this.options.compiler);
		
		return this;
	},
	
	/**
	 * Returns the stored Loader.
	 * 
	 * @return {Loader}
	 */
	getLoader: function()
	{
		return this.loader;
	},
	
	/**
	 * Returns the stored Parser.
	 * 
	 * @return {Parser}
	 */
	getParser: function()
	{
		return this.parser;
	},
	
	/**
	 * Returns the stored Compiler
	 * 
	 * @return {Compiler}
	 */
	getCompiler: function()
	{
		return this.compiler;
	},
	
	/**
	 * Sets the Loader.
	 * 
	 * @param {Loader} loader
	 * @return {Lighter}
	 */
	setLoader: function(loader)
	{
		this.loader = loader || new Loader();
		return this;
	},

	
	/**
	 * Sets the Parser.
	 * 
	 * @param {Parser} parser
	 * @return {Lighter}
	 */
	setParser: function(parser)
	{
		this.parser = parser || new Parser.Strict();
		return this;
	},

	
	/**
	 * Sets the Compiler.
	 * 
	 * @param {Compiler} compiler
	 * @return {Lighter}
	 */
	setCompiler: function(compiler)
	{
		this.compiler = compiler || new Compiler.Inline();
		return this;
	},
	
	/**
	 * Takes a codeblock and highlights the code inside of it using the stored
	 * parser/compilers. It reads the class name to figure out what fuel and
	 * flame to use for highlighting.
	 * 
	 * @param {String|Element} codeblock   The codeblock to highlight.
	 * @param {String|Element} [container] Optional container to inject the highlighted element into.
	 * @return {Lighter} The current Lighter instance.
	 */
	light: function (codeblock, container)
	{
		var codeblock = document.id(codeblock),
			container = document.id(container),
			lighter   = codeblock.retrieve('lighter'),
			code      = this.getCode(codeblock),
			ff        = this.parseClass(codeblock.get('class')),
			fuel      = ff.fuel  || this.options.fuel,
			flame     = ff.flame || this.options.flame;
		
		// Lighting is in progress.
		if (lighter === true) {
			return this;
		}
		
		// Lighter exists so just toggle display.
		if (lighter !== null) {
			codeblock.setStyle('display', 'none');
			lighter.setStyle('display', 'inherit');
			return this;
		}

		// Load fuel/flame to and build lighter when ready.
		this.getLoader().loadFlame(flame);
		this.getLoader().loadFuel(fuel, function() {
			
			fuel = new Fuel[fuel]();
			
			var wicks   = this.getParser().parse(fuel, code),
			    lighter = this.getCompiler().compile(fuel, flame, wicks);
			
			lighter.store('codeblock', codeblock);
			lighter.store('plaintext', code);
			codeblock.store('lighter', lighter);
			
			if (container) {
				container.empty();
				lighter.inject(container);
			} else {
				codeblock.setStyle('display', 'none');
				lighter.inject(codeblock, 'after');
			}
			
			return this;
			
		}.bind(this), function() {
			throw new Error('Could not load fuel ' + fuel + 'successfully.');
		}.bind(this));
		
		// Mark codeblock as lighter initialized.
		codeblock.store('lighter', true);
		
		return this;
	},
	
	/**
	 * Unlights a codeblock by hiding the lighter element if present and
	 * re-displaying the original code.
	 * 
	 * @param {String|Element} codeblock The element to unlight.
	 * @return {Lighter} The current Lighter instance.
	 */
	unlight: function(codeblock)
	{
		codeblock = document.id(codeblock);
		
		var lighter = codeblock.retrieve('lighter');
		
		if (lighter !== null) {
			codeblock.setStyle('display', 'inherit');
			lighter.setStyle('display', 'none');
		}
		
		return this;
	},
	
	/**
	 * Extracts the code from a codeblock.
	 * 
	 * @param {Element} codeblock The codeblock that contains the code.
	 * @return {String} The plain-text code.
	 */
	getCode: function(codeblock)
	{
	    var code = codeblock.get('html')
	    	.replace(/(^\s*\n|\n\s*$)/gi, '')
	        .replace(/&lt;/gim, '<')
	        .replace(/&gt;/gim, '>')
	        .replace(/&amp;/gim, '&');
	
		// Re-indent code if user option is set.
		if (this.options.indent > -1) {
			code = code.replace(/\t/g, new Array(this.options.indent + 1).join(' '));
	    }
		
		return code;
	},
	
	/**
	 * Parses a class name for a fuel/flame combo.
	 * 
	 * @param {String} className The class name to parse.
	 * @return {Object} A hash containing the found fuel/flames.
	 * @todo Find fuel/flame anywhere in the class, not just at the front.
	 */
	parseClass: function(className)
	{
		var classNames = className.split(' ');
		
		switch (classNames.length) {
			case 0: // No language! Simply wrap in Lighter.js standard Fuel/Flame.
				break;
				
			case 1: // Single class, assume this is the fuel/flame
				ff = classNames[0].split(':');
				break;
				
			default: // More than one class, let's give the first one priority for now.
				ff = classNames[0].split(':');
				break;
		}
		
		return {
			fuel:  ff[0],
			flame: ff[1]
		};
	},
	
	compilerFactory: function(mode, altLines)
	{
		var compiler = null;
		
		switch (mode) {
			case 'inline':
				compiler = new Compiler.Inline({ containerTag: 'code' });
				break;
				
			case 'pre':
				compiler = new Compiler.Inline({ containerTag: 'pre' });
				break;
				
			case 'ol':
				compiler = new Compiler.List({ altLines: altLines });
				break;
				
			case 'div':
				compiler = new Compiler.Lines({ altLines: altLines });
				break;
				
			case 'table':
				compiler = new Compiler.Lines({
			        altLines:     altLines,
			        containerTag: { parent: 'table', child:  'tbody' },
			        linesTag:     { parent: 'tr', child:  'td' },
			        numbersTag:   'td'
			    });
				break;
				
			default:
				throw new Error('Unknown mode specified.');
				break;
		}
		
		return compiler;
	}
});

Element.implement({
	/**
	 * Lights an element.
	 * 
	 * @param {Object} [options] The options object to use.
	 * @returns {Element} The current Element instance.
	 */
    light: function(options)
    {
    	var lighter = this.retrieve('highlighter');
    	
    	if (lighter === null) {
    		new Lighter(options);
        	this.store('highlighter', lighter);
    	}
    	
    	lighter.light(this);
    	
    	return this;
    },
    
    /**
     * Unlights an element.
     * 
     * @returns {Element} The current Element instance.
     */
    unlight: function()
    {
    	var lighter = this.retrieve('highlighter');
    	
    	if (lighter !== null) {
    		lighter.unlight(this);
    	}
    	
    	return this;
    }
});

})();
