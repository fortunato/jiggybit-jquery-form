(function($) {

    /*global window*/

    // Create jigybit namespace if doesn't exist
    window.jiggybit = window.jiggybit === undefined ? {} : window.jiggybit;
    window.jiggybit.formPlugins = window.jiggybit.formPlugins === undefined ? {} : window.jiggybit.formPlugins;

    /**
     * Constructor
     *
     * @param {object} select A select DOM element
     * @param {object} settings Hash with settings for this instance
     * @returns {jiggybit.formPlugins.select} Instance
     */
    var select = function(select, settings) {
        this.settings = settings;
        this.$select = $(select);
        this.initialize();
        return this;
    };

    /**
     * Default settings to run with
     */
    select.defaults = {

        /**
         * Width for the select box
         * @type {integer}
         */
        width: 200,

        /**
         * Heightfor the select box
         * @type {integer}
         */
        height: 20,

        /**
         * z-index assigned to elements that should be placed above anything else
         * @type {integer}
         */
        zIndexAbsTop: 99999,

        /**
         * Attach a custom class name to the outer element of the replacement element
         * @type {string}
         */
        className: '',

        /**
         * Maximum height of dropdown before adding a scrollbar to the
         * dropdown
         * @type {integer}
         */
        dropdownMaxHeight: 200,

        /**
         * Allows forcing a dropdown to fold up or down
         * @type {string} auto|up|down
         */
        dropdownDirection: 'auto',

        /**
         * Callback method/anonymous function that allows one to customise
         * the way the replacement options are being rendered
         * @type {function}
         */
        decorateOption: null,

        /**
         * Callback method/anonymous function that allows one to customise
         * the way the currently selected value is being displayed
         * @type {function}
         */
        decorateValue: null,

        /**
         * Callback method/anonymous function that can be used to animate
         * the expansion of the dropdown instead of it simply being made
         * visible.
         * @type {function}
         */
        animateExpand: null,

        /**
         * Callback method/anonymous function that can be used to animate
         * the collapsing of the dropdown instead of it simply being hidden.
         * @type {function}
         */
        animateCollapse: null
    };

    /**
     * Methods in this object are not to be accessed publically
     * @type {object}
     */
    select.prototype = {

        /**
         * Reference to the jQuerified original select element
         * @type {object}
         */
        $select: null,

        /**
         * Counter for options in a select element that contains optgroup nodes.
         * jQuery's index() method doesn't get the job done in such cases
         * @type {integer}
         */
        optionCount: 0,

        /**
         *
         * @type {object}
         */
        originalState: {},

        initialize: function()
        {
            var _this = this;
            
            // Store reference to this object instance on the data collection of
            // the original DOM element for the sake of publically exposing it
            this.$select.data('jb-f-element', this);

            // Build replacement DOM stuff
            this.$pseudo = this.build();
            // @todo
            //this.$options = this.$pseudo.data('options');

            // Store original state of the original <select> so that we can
            // return it to its original state when requested
            this.originalState = {
                css: {
                    position: this.$select.css('position'),
                    left: this.$select.css('left'),
                    top: this.$select.css('top')
                },
                attr: {
                    tabindex: this.$select.attr('tabindex')
                }
            };

            // Insert pseudo element in DOM
            this.$pseudo.insertAfter(this.$select);

            // Move original element out of view
            this.$select.css({
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                })
                // And make sure that the tabindex behaves properly
                .attr('tabindex', -1);

            // Check if there is any <label> elements in this page related to the original
            // element that we need to reference to our replacement widget
            // @todo consider wether to search only within the scope of the form
            if (this.$select[0].id) {
                $('label[for="'+this.$select[0].id+'"]').each(function() {
                    var $label = $(this);
                    // Update for attribute
                    $label.attr('for', _this.$pseudo.attr('id'));
                    $label.click(function(event) {
                        event.preventDefault();
                        $('#' + this.getAttribute('for') ).focus();
                    });
                });
            }

            // Store original element reference in the custom element's data collection
            // @todo consider storing a reference to the jQuerified select instead
            this.$pseudo.data('originalElement', this.$select[0]);

            // Get default value across
            this.select(this.$select[0].selectedIndex);

            this.setupEventListeners();

            // Mimic original element state
            if (this.$select.is(':visible') === false) this.hide();
            if (select.disabled) this.disable();

            // Setup mouse scroll behavior for dropdown
            var $options = this.$pseudo.data('options');
            var option = $options.get()[0];
            if (option.addEventListener) { // all browsers except IE before version 9
                // Internet Explorer, Opera, Google Chrome and Safari
                option.addEventListener("mousewheel", function(evt) { _this.preventMouseScroll(evt); }, false);
                // Firefox
                option.addEventListener("DOMMouseScroll", function(evt) { _this.preventMouseScroll(evt); }, false);
            } else { // IE before version 9
                if (option.attachEvent) option.attachEvent("onmousewheel", function(evt) { _this.preventMouseScroll(evt); });
            }
        },

        /**
         * Can be called to prevent default arrow keyup behavior when the (pseudo)
         * select has focus
         *
         * @param {object} event
         * @returns {undefined}
         */
        preventPageScroll: function(event)
        {
            if (event.keyCode === 38 || event.keyCode === 40) event.preventDefault();
        },

        setupEventListeners: function()
        {
            var _this = this;

            // Setup event listeners
            this.$pseudo.bind({
                mouseover: function() {
                    // Check if its disabled before adding a CSS class to mark the state
                    //if (!pseudoSelect.data('state').disabled) {
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {
                        _this.$pseudo.addClass('jb-f-hover');
                    }
                },
                mouseout: function() {
                    // Check if its disabled before adding a CSS class to unmark the state
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {
                        _this.$pseudo.removeClass('jb-f-hover');
                    }
                },
                click: function() {
                    // Check if its disabled before determining whether collapse/expand is in order
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !_this.$pseudo.data('state').disabled) {
                        if (_this.$pseudo.data('expanded') === 1) {
                            _this.collapse();
                        } else {
                            _this.expand();
                        }
                    }
                },
                focus: function() {
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {
                        // Mark element as focused
                        _this.$pseudo.addClass('jb-f-focus');
                        // Bind document wide event handler that prevents page scrolling on using arrow keys
                        $(document).bind('keydown', function(event) { _this.preventPageScroll(event); });
                    }
                },
                blur: function() {
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {
                        // Make sure we're not interfacing with the dropdown component of our UI widget
                        if (_this.$pseudo.data('noblur') !== 1) {
                            // Collapse dropdown
                            _this.collapse();
                            // Stop marking label as focused
                            _this.$pseudo.removeClass('jb-f-focus');
                        }
                        // Unbind document wide event handler that prevents page scrolling on using arrow keys
                        $(document).unbind('keydown', function(event) { _this.preventPageScroll(event); });
                    }
                },
                /**
                 * @todo Check if dropdown is expanded. If so make up/down behave as native with dropdown
                 *          Pressing enter should collapse the dropdown in that case
                 * @todo make this work with optgroup
                  *
                  * @param {object} event
                  * @returns {undefined}
                  */
                keyup: function(event) {
                    // Check if is not disabled
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {

                        // Prevent default behavior
                        event.preventDefault();

                        var validChars = 'ABCDEFGHIJKLMNOPQRSTUVW0123456789';
                        var keyCodeChar = String.fromCharCode(event.keyCode);

                        if (event.keyCode === 38) { // Arrow up
                            // If not reached the first option
                            if (_this.$pseudo.data('expanded') !== 0 && _this.$pseudo.data('options').find('li.jb-f-hover').length) {  // Expanded
                                var idx = _this.$pseudo.data('options').find('li.jb-f-hover').index();
                                // If not reached the last option
                                if (idx > 0) {
                                    _this.select(idx - 1);
                                }
                            } else {
                                if (_this.$select[0].selectedIndex > 0) {
                                    _this.select(_this.$select[0].selectedIndex - 1);
                                }
                            }
                        } else if (event.keyCode === 40) { // Arrow down
                            // If expanded, check if anything is marked as hovered, else go off selected index
                            if (_this.$pseudo.data('expanded') !== 0 && _this.$pseudo.data('options').find('li.jb-f-hover').length) {  // Expanded
                                var idx = _this.$pseudo.data('options').find('li.jb-f-hover').index();
                                // If not reached the last option
                                if (idx < (_this.$select[0].options.length - 1)) {
                                    _this.select(idx + 1);
                                }
                            } else {
                                // If not reached the last option
                                if (_this.$select[0].selectedIndex < (_this.$select[0].options.length - 1)) {
                                    _this.select(_this.$select[0].selectedIndex + 1);
                                }
                            }
                        } else if (event.keyCode === 13) { // Enter
                            // Set value currently hovered
                            if (_this.$pseudo.data('options').find('li.jb-f-hover').length) {
                                idx = _this.$pseudo.data('options').find('li.jb-f-hover').index();
                            } else {
                                idx = _this.$select[0].selectedIndex;
                            }
                            _this.select(idx);
                            _this.collapse();

                        } else if (validChars.indexOf(keyCodeChar) !== -1) {
                            // Detect a string a characters entered within 250ms of each other
                            _this.$pseudo.data('characters', _this.$pseudo.data('characters') ? _this.$pseudo.data('characters') + keyCodeChar : keyCodeChar);

                            // Clear existing timeout if exists
                            clearTimeout(_this.$pseudo.data('inputTracker'));

                            var inputTracker = setTimeout(function() {
                                // Iterate original <select> <option> elements and match text value against the string
                                _this.$select.children('option').each(function() {
                                    if (this.text.toLowerCase().indexOf(_this.$pseudo.data('characters').toLowerCase()) === 0) {
                                        // Update selected value
                                        _this.select($(this).index());
                                        // Reset characters
                                        _this.$pseudo.data('characters', null);
                                        return false;
                                    }
                                });
                            }, 250);

                            // Store timer on the data collection
                            _this.$pseudo.data('inputTracker', inputTracker);
                        }
                    }
                }
            });

        },

        /**
         * Prevents page scroll from mouse scroll event and instead updates
         * the scroll offset of the dropdowon list
         *
         * @param {event} event Native browser mousewheel event
         * @returns {undefined}
         */
        preventMouseScroll: function(event)
        {
            event.preventDefault();

            // Determine delta
            if (event.wheelData) delta = -event.detail / 3;
            if (event.detail) delta = -event.detail / 3;
            if (typeof event.wheelDeltaY !== "undefined") delta = event.wheelDeltaY / 120;

            // Update scroll offset
            this.$pseudo.data('options').scrollTop(this.$pseudo.data('options').scrollTop() - delta * 30);
        },

        /**
         * Builds custom select DOM elements
         *
         * @private
         * @return {object} Custom built pseudo <i>select</i> jQuery object
         */
        build: function()
        {
            // Create custom element
            var $pseudo = $(document.createElement('div'))
                .attr({
                    // Copy the tab index of the original element across
                    tabindex: this.$select[0].tabindex ? this.$select[0].tabindex : 0,
                    // Give it a unique id attribute
                    id: this.$select[0].id ? this.$select[0].id + '-pseudo' : 'pseudo-' + new Date().getTime()
                })
                .addClass('jb-f-select' + (this.settings.select.className !== '' ? ' ' + this.settings.select.className : ''))
                .css({
                    width: this.settings.width
                });

            // Element to display current selected value
            $(document.createElement('div'))
                .addClass('jb-f-value')
                .css({ // Prevent text from being selected
                    '-webkit-user-select': 'none',
                    '-khtml-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-o-user-select': 'none',
                    '-ms-user-select': 'none',
                    'user-select': 'none'
                })
                .appendTo($pseudo);

            // Arrow
            $(document.createElement('span'))
                .addClass('jb-f-arrow')
                .appendTo($pseudo);

            // Add options and option groups
            this.buildOptions($pseudo);

            // Return custom select
            return $pseudo;
        },

        /**
         * Builds option list for custom dropdown
         *
         * @private
         * @param {object} $pseudo jQueryfied custom <i>select</i> element
         * @return {undefined}
         */
        buildOptions: function($pseudo)
        {
            var _this = this;

            var $options = $(document.createElement('ul'))
                .addClass('jb-f-select-options')
                .css({
                    display: 'none',
                    zIndex: this.settings.select.zIndexAbsTop,
                    position: 'absolute'
                })
                .bind({
                    mouseenter: function() {
                        $pseudo.data('noblur', 1);
                    },
                    mouseleave: function() {
                        $pseudo.data('noblur', 0);
                    }
                });

            // Reset option counter to aid correct index management on
            // option/optgroup construction
            this.optionCount = 0;

            // Iterate original elements' children\
            this.$select.children().each(function(idx) {
                // jQuerify once
                var $option = $(this);

                // Check if is option or optgroup
                if ($option.is('option')) {

                    $options.append(_this.buildOption($option, _this.optionCount, $pseudo));
                    //optionsList.append(THIS.selectBuildOption(jqOption, idx, select, pseudoSelect));
                    _this.optionCount++;

                } else if ($option.is('optgroup')) {

                    $options.append(_this.buildOptgroup($option, $pseudo));

                }
            });

            // Append options list to body right before the </body> tag
            $options.attr('id', $pseudo.attr('id') + '-options');
            $options.appendTo($('body'));

            // Store reference to dropdown in data collection
            $pseudo.data('options', $options);
            this.$options = $options;

            // Make dropdown list scroll if it exceeds the max configured height
            if ($options.outerHeight() > this.settings.select.dropdownMaxHeight) {
                $options.css({
                   overflow: 'auto',
                   height: this.settings.select.dropdownMaxHeight
                });
            }
        },

        /**
         * Builds pseudo selection option as <li />
         *
         * @param {object} $option DOM element
         * @param {integer} idx Index of item in relation to siblings
         * @param {object} $pseudo jQuery object
         * @returns {jQuery} LI element
         */
        buildOption: function($option, idx, $pseudo)
        {
            var _this = this,
                option;
            // Check if custom decoration of the option has been requested for
            // this instance
            if (this.settings.select.decorateOption) {
                // Callback action
                option = this.settings.select.decorateOption(select, jqOption, idx);
            } else {
                // Plain and simple
                option = '<span>' + $option.text() + '</span>';
            }

            return $(document.createElement('li'))
                .addClass('jb-f-option' + ($option.is(':disabled') ? ' jb-f-disabled' : ''))
                .html(option)
                .css({ // Prevent text from being selected
                    '-webkit-user-select': 'none',
                    '-khtml-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-o-user-select': 'none',
                    '-ms-user-select': 'none',
                    'user-select': 'none'
                })
                .bind({
                    click: function() {
                        // Get current selectedIndex
                        var currentIndex = _this.$select[0].selectedIndex;

                        // Not allowed when option is disabled
                        if ($pseudo.data('options').find('.jb-f-option:nth-child(' + idx + ')').hasClass('jb-f-disabled')) return false;

                        // Set new value
                        _this.select(idx);

                        // Collapse options list
                        _this.collapse();

                        // Mark selected option with class name
                        $pseudo.data('options').find('.jb-f-option').removeClass('jb-f-selected');
                        $pseudo.data('options').find('.jb-f-option:eq(' + idx + ')').addClass('jb-f-selected');

                        // Re-focus element
                        $pseudo.focus();

                        // Check if value has actually changed. If so,  fire attached onchange events
                        if (currentIndex !== _this.$select[0].selectedIndex) {
                            // @todo work out a way to do this without eval()
                            // onchange attribute
                            var test = '_this.$select[0].onchange';
                            var execute = '_this.$select[0].onchange()';
                            if (eval(test)) eval(execute);

                            // Programatically attached change() events
                            _this.$select.trigger('change');
                        }
                    },
                    mouseenter: function() {
                        $(this).addClass('jb-f-hover');
                    },
                    mouseleave: function() {
                        $(this).removeClass('jb-f-hover');
                    }
                })
                // IE6 layout hack so that not only the text is sensitive for
                // the mouseover and click events
                // @todo consider moving this to CSS or remove it altogether
                .css('zoom', 1);
        },

        /**
         * 
         *
         * @private
         * @param {object} $optgroup jQueryfied option
         * @param {object} $pseudo Custom jQuery object for select element
         * @return {object} Pseudo jQueryfied optgroup li node with nested ul
         */
        buildOptgroup: function($optgroup, $pseudo)
        {
            var _this = this,
                $li = $(document.createElement('li'))
                    .html('<span class="jb-f-label">'+$optgroup.attr('label')+'</span>'),
                $ul = $(document.createElement('ul'));

            $optgroup.find('option').each(function() {
                // jQuerify once
                var $option = $(this);
                $ul.append(_this.buildOption($option, _this.optionCount, $pseudo));
                _this.optionCount++;
            });
            $ul.appendTo($li);
            
            return $li;
        },

        /**
         * Updates selectedIndex on the real select element
         *
         * @private
         * @param {integer} idx New selectedIndex
         * @return {undefined}
         */
        select: function(idx)
        {
            // Update custom control using the new selectedIndex
            var label = this.$pseudo.find('div.jb-f-value');
            // Check if a decorator callback was given
            if (this.settings.select.decorateValue !== null) {
                // Let the decorator callback build the html for the selected
                // value representation
                label.html(this.settings.select.decorateValue(this.$pseudo, idx));
            } else {
                // Simply fetch the text of the real option element
                label.html(this.$select[0].options[idx].text);
            }
            var $options = this.$pseudo.data('options');
            // Remove hover and selected markers
            $options.find('.jb-f-option').removeClass('jb-f-hover jb-f-selected');

            // If option list is expanded, update hover state
            if (this.$pseudo.data('expanded') !== 0) {
                // Mark selected option as selected
                // @todo move to selectExpand function (only useful if expanded after value has been selected)
                $options.find('.jb-f-option:eq('+idx+')').addClass('jb-f-selected');
            }

            // Set value of real select  element
            this.$select[0].options[idx].selected = true;
        },

        /**
         * Collapses the options list
         * @private
         * @return {undefined}
         */
        collapse: function()
        {
            // Check if it is actually expanded
            if (this.$pseudo.data('expanded') !== 0) {

                // Set expanded flag to 0
                this.$pseudo.data('expanded', 0);

                // Hide dropdown
                if (this.settings.select.animateCollapse) this.settings.select.animateCollapse(this.$pseudo);
                else this.$pseudo.data('options').hide();

                // Put focus back onto the UI widget element
                this.$pseudo.focus();
            }
        },
        
        /**
         * Expands the options list
         * @private
         * @return {undefined}
         */
        expand: function()
        {
            // Mark element as 'expanded'
            this.$pseudo.data('expanded', 1);

            // Get position of UI element and position dropdown
            var direction = 'down',
                $options = this.$pseudo.data('options'),
                optionsListHeight = $options.outerHeight(),
                pseudoSelectHeight = this.$pseudo.outerHeight(),
                offset = this.$pseudo.offset(),
                // Determine if there is enough space to drop the options list down
                // Otherwise we'll reverse gravity
                spaceAbove = offset.top - $(window).scrollTop(),
                spaceBelow = $(window).height() - spaceAbove - pseudoSelectHeight;

            // Check if there is more space above than below
            if (spaceBelow <= optionsListHeight && spaceAbove > spaceBelow) direction = 'up';

            // Construct and apply CSS for the options list
            var css = {
                left: offset.left,
                width: this.$pseudo.width()
            };
            if (direction === 'down') css.top = offset.top + pseudoSelectHeight;
            else css.top = offset.top - optionsListHeight;
            $options.css(css);

            // Drop it, but check if a callback needs to be triggered first
            if (this.settings.select.animateExpand) this.settings.animateExpand(this.$pseudo, css.top, css.left);
            else $options.show();
        },

        /**
         * Destroys pseudo DOM elements and unbinds events as well as the
         * reference to this instance which is stored on the data collection
         * of the original select DOM element. It should at that point get
         * cleared from memory
         * @public
         * @returns {undefined}
         */
        destroy: function()
        {
            // Remove pseudo element form DOM and remove the associated data and
            // events
            this.$pseudo.remove();

            // Restore state of original element
            this.$select.css(this.originalState.css);
            this.$select.attr(this.originalState.attr);

            // And finally remove the reference to this instance from the original
            // select element
            this.$select.removeData('jb-f-element');
        }
    };

    jiggybit.formPlugins.select = select;

})(jQuery);