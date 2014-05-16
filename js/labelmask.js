/*! Labelmask - v0.1.0 - 2014-04-23
 * Inserts input-masking-style functionality into labels without disrupting the input itself.
 * Based on Politespace by Filament Group https://github.com/filamentgroup/politespace
 * Hacked apart by Brad Frost. Propert development welcome
 * MIT License */

(function( w ){
	"use strict";

	var Labelmask = function( element ) {

		var type, groupRegMatch;

		if ( !element ) throw new Error( "Labelmask requires an element argument." );
		if ( !element.getAttribute ) return;

		type = element.getAttribute("data-format").replace(/-/g, '_').toUpperCase();

		if ( !( type in Labelmask.Types ) )
      throw new Error("Labelmask requires a format");

		this.element = element;
		this.elID = this.element.id;

		this.inputSeparator = Labelmask.Types[ type ].separator;
		this.inputFormat = Labelmask.Types[ type ].format;
    this.maxLength   = Labelmask.Types[ type ].maxLength;
		this.inputGroupLength = Labelmask.Types[ type ].groupLength.toString();
    this.adjustment = this.inputGroupLength.length === 1
      ? this.maxLength/+this.inputGroupLength
      : this.inputGroupLength.split(',').length - 1;
		groupRegMatch = this._buildRegexArr( this.inputGroupLength );

    this.placeholder = Labelmask.preparePlaceholder(this);
		this.elLabel = $("[for="+this.elID+"]");

		this.groupRegNonUniform = groupRegMatch.length > 1;
		this.groupReg = new RegExp( groupRegMatch.join( '' ), !this.groupRegNonUniform ? 'g' : '' );
	};

	Labelmask.prototype._buildRegexArr = function( groupLengths ) {
		var split, str, j, k;
		split = ( '' + groupLengths ).split( ',' );
		str = [];

		for( j = 0, k = split.length; j<k; j++ ) {
			str.push( '([\\S]{' + ( split[ j ] === '' ? '1,' : split[j] ) + '})' + ( j > 0 ? "?" : "" ) );
		}

		return str;
	};

	Labelmask.prototype.format = function( value ) {
		var val = value,
			match;

		if( this.groupRegNonUniform ) {
			match = val.match( this.groupReg );
			if( match ) {
				match.shift();

				for( var j = 0; j < match.length; j++ ) {
					if( !match[ j ] ) {
						match.splice( j, 1 );
						j--;
					}
				}
			}

			val = ( match || [ val ] ).join( this.inputSeparator );
		} else {
			val = val.replace( this.groupReg, "$1 " );

			if( val.substr( val.length - 1 ) === " " ) {
				val = val.substr( 0, val.length - 1 );
			}
		}

		return val;
	};

	Labelmask.prototype.update = function() {
		var val = this.format( this.element.value );

		if( this.maxLength ) {
			val = val.substr( 0, this.maxLength + this.adjustment );
		}

		this.element.value = val;
	};

	Labelmask.prototype.unformat = function( value ) {
		return value.replace( new RegExp(this.inputSeparator, 'g'), '' );
	};

	Labelmask.prototype.reset = function() {
		this.element.value = this.unformat( this.element.value );
	};

  Labelmask.prototype.addPlaceholder = function() {
      if ( this.element.value.length === 0 )
          this.element.placeholder = this.placeholder;
    };

	Labelmask.prototype.addLabelMask = function() {
		if(this.elLabel.find('.labelmask').length === 0) {
			this.elLabel.append( $('<span>', { class: 'labelmask' }) );
		}
	};

	Labelmask.prototype.updateLabelMask = function( val ) {
		var maskedText = this.mask(),
			formattedText = this.format(maskedText);
		this.elLabel.find('.labelmask').html(" " + formattedText);
	};

	Labelmask.prototype.removeLabelMask = function( ) {
		this.elLabel.find('.labelmask').remove();
	};

	Labelmask.prototype.mask = function() {
		var charCount = this.element.value.length,
			remainingFormat = this.placeholder.replace(new RegExp(this.inputSeparator, 'g'), '').substr( charCount ),
			val = this.element.value + remainingFormat;

		return val;
	};

  Labelmask.preparePlaceholder = function(lm) {
    var groups = lm.inputGroupLength.split(',');
    if ( groups.length === 1 ) {
      var
      gL = lm.inputGroupLength,
      placeholder = [];
      while( gL-- ) placeholder.push( new Array( +groups[0] + 1 ).join( lm.inputFormat ) );
      return placeholder.join( lm.inputSeparator );
    }
    return groups.map( function(a) {
      return +a > 0
        ? +a
        : groups.
          reduce(function(a,b) {return a-b;}, lm.maxLength);}).
          map( function(a) {return new Array(++a).join(lm.inputFormat); } ).
          join(lm.inputSeparator);
  };

	Labelmask.Types = {
		CREDIT_CARD_NUMBER: {
			separator: ' ',
			format: 'x',
			groupLength: 4,
      maxLength: 16
		},

		US_TELEPHONE_NUMBER: {
			separator: '-',
			format: '_',
			groupLength: '3,3,',
      maxLength: 10
		}
	};

	Labelmask.addInputType = function(name, attrs) {
		name &&
		attrs.separator &&
		attrs.format &&
		attrs.groupLength &&
    attrs.total &&
		(Labelmask.Types[name] = attrs);
	};

	w.Labelmask = Labelmask;

}( this ));

(function( $ ) {
	"use strict";

	// jQuery Plugin

	var componentName = "labelmask",
		enhancedAttr = "data-enhanced",
		initSelector = "[data-" + componentName + "]:not([" + enhancedAttr + "])";

	$.fn[ componentName ] = function(){
		return this.each( function(){
			var polite = new Labelmask( this );
      polite.addPlaceholder();

			$( this ).bind( "blur", function() {
          polite.reset();
					polite.update();
					polite.removeLabelMask();
				})
				.bind( "focus", function() {
					polite.reset();
					polite.addLabelMask();
					polite.updateLabelMask($(this).val());
				})
				.bind( "keyup", function() {
					polite.updateLabelMask($(this).val());
				})
				.data( componentName, polite );

			polite.update();
		});
	};

	// auto-init on enhance (which is called on domready)
	$( document ).bind( "enhance", function( e ) {
		var $sel = $( e.target ).is( initSelector ) ? $( e.target ) : $( initSelector, e.target );
		$sel[ componentName ]().attr( enhancedAttr, "true" );
	});

}( jQuery ));
