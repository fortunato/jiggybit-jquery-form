
var JiggybitFormSelect, JiggybitFormSelectDefaults;

(function($) {
    
    /**
     * Default settings for the 
     */
    JiggybitFormSelectDefaults =
    {
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
         * @var {integer}
         */
        zIndexAbsTop: 99999,
        
        /**
         * Attach a custom class name to the outer element of the replacement element
         * @var {string}
         */
        className: '',
        
        /**
         *
         */
        dropdownMaxHeight: 200,

        /**
         * Allows forcing a dropdown to fold up or down
         * @type {string} auto|up|down
         */
        dropdownDirection: 'auto',
        
        /**
         * Callback method that allows one to customise the way the replacement 
         * options are being rendered
         * @type {function}
         */
        decorateOption: null,

        /**
         * Callback method that allows one to customise the way the currently 
         * selected value is being displayed
         * @type {function}
         */
        decorateValue: null,

        /**
         * Callback method that can be used to animate the expansion of the 
         * dropdown instead of it simply being made visible.
         * @type {function}
         */
        animateExpand: null,
        
        /**
         * Callback method that can be used to animate the collapsing of the 
         * dropdown instead of it simply being hidden.
         * @type {function}
         */
        animateCollapse: null
        
    };
    
    /**
     * Aims to extend the plugin with support for custom <select> fields
     * @type {object}
     */
    JiggybitFormSelect = 
    {
        /**
         * Temporary reference to the jQuerified original select element
         * @param {HTMLElement}
         */
        jqSelect: null,
        
        /**
         * Contructs everything around creating the custom select element
         * @private
         * @param {HTMLElement} select Original element as found in DOM
         */
        selectInit: function(select)
        {
            var THIS = this;
            
            // While building we only jQuerify the original <select> element once
            this.jqSelect = $(select);
            
            // Build replacement DOM stuff
            var pseudoSelect = this.selectBuild(select);
           
            // Store original state of the original <select> so that we can 
            // return it to its original state when requested
            pseudoSelect.data('originalState', {
                css: {
                    position: this.jqSelect.css('position'),
                    left: this.jqSelect.css('left'),
                    top: this.jqSelect.css('top')
                },
                attr: {
                    tabindex: this.jqSelect.css('tabindex')
                }
            });
            
            // Insert pseudo element in DOM
            pseudoSelect.insertAfter(this.jqSelect);
            
            // Move original element out of view
            this.jqSelect.css({
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                })
                // And make sure that the tabindex behaves properly
                .attr('tabindex', -1);

            // Check if there is any <label> elements in this page related to the original
            // element that we need to reference to our replacement widget
            if (select.id) {
                $('label[for="'+select.id+'"]').each(function() {
                    // Update for attribute
                    $(this).attr('for', pseudoSelect.attr('id'));
                    $(this).click(function() {
                        var identifier = $(this).attr('for');
                        $('#'+identifier).focus();
                    });
                });
            }

            // Store original element reference in the custom element's data collection
            // @todo consider storing the jQuerified select instead
            pseudoSelect.data('originalElement', select);
            
            // Get default value across
            this.selectVal(pseudoSelect, select.selectedIndex);

            // Can be called to prevent default arrow keyup behavior when the 
            // <select> has focus
            var preventPageScroll = function(event) {
                if (event.keyCode == 38 || event.keyCode == 40) event.preventDefault();
            }
            
            // Setup event listeners
            pseudoSelect.bind({
                mouseover: function() {
                    // Check if its disabled before adding a CSS class to mark the state
                    //if (!pseudoSelect.data('state').disabled) {
                    var state = pseudoSelect.data('state');
                    if (state == undefined || !pseudoSelect.data('state').disabled) {
                        pseudoSelect.addClass('hover');
                    }
                },
                mouseout: function() {
                    // Check if its disabled before adding a CSS class to unmark the state
                    var state = pseudoSelect.data('state');
                    if (state == undefined || !pseudoSelect.data('state').disabled) {
                        pseudoSelect.removeClass('hover');
                    }
                },
                click: function() {
                    // Check if its disabled before determining whether collapse/expand is in order
                    var state = pseudoSelect.data('state');
                    if (state == undefined || !pseudoSelect.data('state').disabled) {
                        if (pseudoSelect.data('expanded') == 1) {
                            THIS.selectCollapse(pseudoSelect);
                        } else {
                            THIS.selectExpand(pseudoSelect);
                        }
                    }
                },
                focus: function() {
                    var state = pseudoSelect.data('state');
                    if (state == undefined || !pseudoSelect.data('state').disabled) {
                        // Mark element as focused
                        pseudoSelect.addClass('focus');
                        // Bind document wide event handler that prevents page scrolling on using arrow keys
                        $(document).bind('keydown', preventPageScroll);
                    }
                },
                blur: function() {
                    var state = pseudoSelect.data('state');
                    if (state == undefined || !pseudoSelect.data('state').disabled) {
                        // Make sure we're not interfacing with the dropdown component of our UI widget
                        if (pseudoSelect.data('noblur') !== 1) {
                            // Collapse dropdown
                            THIS.selectCollapse(pseudoSelect);
                            // Stop marking label as focused
                            pseudoSelect.removeClass('focus');
                        }
                        // Unbind document wide event handler that prevents page scrolling on using arrow keys
                        $(document).unbind('keydown', preventPageScroll);
                    }
                },
                /**
                 * @todo Check if dropdown is expanded. If so make up/down behave as native with dropdown
                 *          Pressing enter should collapse the dropdown in that case
                 * @todo make this work with optgroup
                 */
                keyup: function(event) {
                    // Check if is not disabled
                    var state = pseudoSelect.data('state');
                    if (state == undefined || !pseudoSelect.data('state').disabled) {
                        
                        // Prevent default behavior
                        event.preventDefault();
                        
                        var validChars = 'ABCDEFGHIJKLMNOPQRSTUVW0123456789';
                        var keyCodeChar = String.fromCharCode(event.keyCode);
                        
                        if (event.keyCode == 38) { // Arrow up
                            if (select.selectedIndex > 0) {
                                THIS.selectVal(pseudoSelect, select.selectedIndex - 1);
                            }
                        } else if (event.keyCode == 40) { // Arrow down
                            if (select.selectedIndex < (select.options.length - 1)) {
                                THIS.selectVal(pseudoSelect, select.selectedIndex + 1);
                            }
                        } else if (validChars.indexOf(keyCodeChar) != -1) {
                            // Detect a string a characters entered within 250ms of each other
                            pseudoSelect.data('characters', pseudoSelect.data('characters') ? pseudoSelect.data('characters') + keyCodeChar : keyCodeChar);
                            
                            // Clear existing timeout if exists
                            clearTimeout(pseudoSelect.data('inputTracker'));
                            
                            var inputTracker = setTimeout(function() {
                                // Iterate original <select> <option> elements and match text value against the string
                                THIS.jqSelect.children('option').each(function() {
                                    if (this.text.toLowerCase().indexOf(pseudoSelect.data('characters').toLowerCase()) == 0) {
                                        // Update selected value
                                        THIS.selectVal(pseudoSelect, $(this).index());
                                        // Reset characters
                                        pseudoSelect.data('characters', null);
                                        return false;
                                    }
                                });
                            }, 250);
                            
                            // Store timer on the data collection
                            pseudoSelect.data('inputTracker', inputTracker);
                        }
                    }
                }
            });
            
            // Mimic original element state
            if (this.jqSelect.is(':visible') == false) this.hide(pseudoSelect);
            if (select.disabled) this.disable(pseudoSelect);
            
            // Monitor original element for changes on a set interval
            //if (this.settings.observer.enabled) this.observe(select, pseudoSelect);
            
            // Add new pseudo element to the collection
            this.pseudoFields.push(pseudoSelect);
        },
        
        /**
         * Builds custom select element from parts
         * 
         * @private
         * @param {HTMLElement} select Unmodified <select> element
         * @return {HTMLElement} Custom built pseudo select element
         */
        selectBuild: function(select)
        {
            // Create custom element
            var pseudoSelect = $('<div />', {
                    // Copy the tab index of the original element across
                    tabindex: select.tabindex ? select.tabindex : 0,
                    // Give it a unique id attribute
                    id: select.id ? select.id + '-pseudo' : 'pseudo-' + new Date().getTime()
                })
                .addClass('jb-select' + (this.settings.className != '' ? ' ' + this.settings.select.className : ''))
                .css({
                    width: this.settings.width
                });
                
            // Element to display current selected value
            $('<div />')
                .addClass('jb-value')
                .css({ // Prevent text from being selected
                    '-webkit-user-select': 'none',
                    '-khtml-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-o-user-select': 'none',
                    'user-select': 'none'
                })
                .appendTo(pseudoSelect);
                
            // Arrow
            $('<span />')
                .addClass('jb-arrow')
                .appendTo(pseudoSelect);
                
            // Add options and option groups
            this.selectBuildOptions(select, pseudoSelect);

            // Return custom select
            return pseudoSelect;
        },
        
        /**
         * Builds option list for custom dropdown
         *
         * @private
         * @param {HTMLElement} select Original <select> element
         * @param {HTMLElement} pseudoSelect jQueryfied custom select element
         * @return void
         */
        selectBuildOptions: function(select, pseudoSelect)
        {
            var THIS = this;
            
            var optionsList = $('<ul />')
                .addClass('jb-select-options')
                .css({
                    display: 'none',
                    zIndex: this.settings.select.zIndexAbsTop,
                    position: 'absolute'
                })
                .bind({
                    mouseenter: function() {
                        pseudoSelect.data('noblur', 1);
                    },
                    mouseleave: function() {
                        pseudoSelect.data('noblur', 0);
                    }
                });
                
            // Iterate original elements' children
            this.jqSelect.children().each(function(idx) {
                // jQuerify once
                var jqOption = $(this);
                
                // Check if is option or optgroup
                if (jqOption.is('option')) {
                    
                    optionsList.append(THIS.selectBuildOption(jqOption, idx, select, pseudoSelect));
                    
                } else if (jqOption.is('optgroup')) {
                    
                    optionsList.append(THIS.selectBuildOptgroup());
                    
                }
            });
            
            // Append options list to body right before the </body> tag
            optionsList.attr('id', pseudoSelect.attr('id') + '-options');
            optionsList.appendTo($('body'));
            
            // Store reference to dropdown in data collection
            pseudoSelect.data('options', optionsList);
            
            // Make dropdown list scroll if it exceeds the max configured height
            if (optionsList.outerHeight() > this.settings.select.dropdownMaxHeight) {
                optionsList.css({
                   overflow: 'auto',
                   height: this.settings.select.dropdownMaxHeight
                });
            }
        },
        
        /**
         * Builds pseudo selection option as <li />
         * 
         * @private
         * @param {HTMLElement} jqOption jQuerified <option>
         * @param {integer} idx Index of <option> node in the list
         * @param {HTMLElement} select Original <select> element
         * @param {HTMLElement} pseudoSelect Custom select element
         * @return {HTMLElement} Pseudo option <li> node
         */
        selectBuildOption: function(jqOption, idx, select, pseudoSelect)
        {
            var option, THIS = this;
            // Check if custom decoration of the option has been requested for
            // this instance
            if (THIS.settings.select.decorateOption) {
                // Callback action
                option = THIS.select.settings.decorateOption(select, jqOption, idx);
            } else {
                // Plain and simple
                option = '<span>' + jqOption.text() + '</span>';
            }
            
            return $('<li />')
                .addClass('jb-option' + (jqOption.is(':disabled') ? ' jb-disabled' : ''))
                .html(option)
                .css({ // Prevent text from being selected
                    '-webkit-user-select': 'none',
                    '-khtml-user-select': 'none',
                    '-moz-user-select': 'none',
                    '-o-user-select': 'none',
                    'user-select': 'none'
                })
                .bind({
                    click: function() {
                        
                        // Get current selectedIndex
                        var originalElement = pseudoSelect.data('originalElement');
                        var currentIndex = originalElement.selectedIndex;
                        //var idx = $(this).inde
                        
                        var optionsList = pseudoSelect.data('options');
                        THIS.log('idx '+ idx);

                        // Not allowed when option is disabled
                        if (pseudoSelect.data('options').children('.option:nth-child(' + (idx + 1) + ')').hasClass('disabled')) return false;

                        // Set new value
                        THIS.selectVal(pseudoSelect, idx);

                        // Collapse optoins list
                        THIS.selectCollapse(pseudoSelect);

                        // Mark selected option with class name
                        optionsList.children('.option').removeClass('selected');
                        optionsList.children('.option:nth-child(' + (idx + 1) + ')').addClass('selected');

                        // Re-focus element
                        pseudoSelect.focus();

                        // Check if value has actually changed. If so fire attached onchange events
                        if (currentIndex != originalElement.selectedIndex) {
                            // onchange attribute
                            var test = 'originalElement.onchange';
                            var execute = 'originalElement.onchange()';
                            if (eval(test)) eval(execute);

                            // Programatically attached change() events
                            $(originalElement).trigger('change');
                        }
                        
                        //THIS.selectVal(pseudoSelect, idx);
                    },
                    mouseenter: function() {
                        $(this).addClass('jb-hover');
                    },
                    mouseleave: function() {
                        $(this).removeClass('jb-hover');
                    }
                })
                // IE6 layout hack so that not only the text is sensitive for 
                // the mouseover and click events
                .css('zoom', 1);
        },
        
        /**
         *
         * @todo
         * @private
         * @return {HTMLElement} Pseudo optgroup <li> node with nested <ul>
         */
        selectBuildOptgroup: function()
        {
            
        },
        
        /**
         * Updates selectedIndex on the real select element
         * 
         * @private
         * @param {HTMLElement} pseudoSelect Custom select element (jQueryfied)
         * @param {integer} idx New selectedIndex
         */
        selectVal: function(pseudoSelect, idx)
        {
            // Retrieve reference to the real select element
            var select = pseudoSelect.data('originalElement');
            
            // Update custom control using the new selectedIndex
            var label = pseudoSelect.find('div.jb-value');
            // Check if a decorator callback was given
            if (this.settings.select.decorateValue !== null) {
                // Let the decorator callback build the html for the selected 
                // value representation
                var html = this.settings.select.decorateValue(pseudoSelect, idx);
                label.html(html);
            } else {
                // Simply fetch the text of the real option element
                label.html(select.options[idx].text);
            }
            // Set value of real select  element
            select.options[idx].selected = true;
        },
        
        /**
         * Collapses the options list
         * @private
         * @param {HTMLElement} pseudoSelect Custom select element (jQueryfied) 
         * @return void
         */
        selectCollapse: function(pseudoSelect)
        {
            // Check if it is actually expanded
            if (pseudoSelect.data('expanded') !== 0) {
                
                // Set expanded flag to 0
                pseudoSelect.data('expanded', 0);

                // Hide dropdown
                if (this.settings.select.animateCollapse) this.settings.select.animateCollapse(pseudoSelect);
                else pseudoSelect.data('options').hide();

                // Put focus back onto the UI widget element
                pseudoSelect.focus();
            }
        },
        
        /**
         * Expands the options list
         * @private
         * @param {HTMLElement} pseudoSelect Custom select element (jQueryfied) 
         * @return void
         */
        selectExpand: function(pseudoSelect)
        {
            // Mark element as 'expanded'
            pseudoSelect.data('expanded', 1);

            // Get position of UI element and position dropdown
            var direction = 'down';
            var optionsList = pseudoSelect.data('options');
            var optionsListHeight = pseudoSelect.data('options').outerHeight();
            var pseudoSelectHeight = pseudoSelect.outerHeight();
            var offset = pseudoSelect.offset();
            
            // Determin if there is enough space to drop the options list down
            // Otherwise we'll reverse gravity
            var spaceAbove = offset.top - $(window).scrollTop();            
            var spaceBelow = $(window).height() - spaceAbove - pseudoSelectHeight;
            
            
            // Check if there is more space above than below
            if (spaceBelow <= optionsListHeight && spaceAbove > spaceBelow) direction = 'up';

            // Construct and apply CSS for the options list
            var css = {
                left: offset.left,
                width: pseudoSelect.width()
            };
            if (direction == 'down') css.top = offset.top + pseudoSelectHeight;
            else css.top = offset.top - optionsListHeight;
            optionsList.css(css);

            // Drop it, but check if a callback needs to be triggered first
            if (this.settings.select.animateExpand) this.settings.animateExpand(pseudoSelect, css.top, css.left);
            else optionsList.show();
        }
    }

})(jQuery);