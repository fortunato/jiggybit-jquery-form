(function($) {
    
    /**
     * Aims to extend the plugin with support for custom <input type="chekbox"> fields
     * @type {object}
     * 
     * @todo On focus detect space bar key up to check/uncheck
     */
    jiggybit.form.plugins.checkbox = 
    {
        /**
         * Default settings for replacement selects elements
         */
        settings: {
            
            /**
             * 
             * @type {Integer}
             */
            width: 10,
            
            /**
             *
             * @type {Integer}
             */
            height: 10
        },
        
        /**
         * Reference to the jQuerified original input element
         * @type {HTMLElement}
         */
        $input: null,
        
        /**
         * Contructs everything around creating the custom select element
         * @private
         * @param {HTMLElement} select Original element as found in DOM
         */
        checkboxInit: function(checkbox)
        {
            var THIS = this;
            
            // While building we only jQuerify the original <input> element once
            $input = $(checkbox);
            
            // Build replacement DOM stuff
            $pseudo = this.checkboxBuild($input);
            
            // Store original element reference in the custom element's data collection
            $pseudo.data({
                'originalElement': checkbox,
                '$originalElement': $input
            });

            // Store original state of the original <select> so that we can 
            // return it to its original state when requested
            $pseudo.data('originalState', {
                css: {
                    position: $input.css('position'),
                    left: $input.css('left'),
                    top: $input.css('top')
                },
                attr: {
                    tabindex: $input.attr('tabindex')
                }
            });
            
            // Insert pseudo element in DOM
            $pseudo.insertAfter($input);
            
            // Move original element out of view
            $input.css({
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                })
                // And make sure that the tabindex behaves properly
                .attr('tabindex', -1);
                
            if (checkbox.id) {
                $('label[for="' + checkbox.id + '"]').each(function() {
                    // Update for attribute
                    $(this).attr('for', $pseudo.attr('id'));
                    $(this).click(function(event) {
                        event.preventDefault();
                        var identifier = $(this).attr('for');
                        $('#'+identifier).trigger('click');
                    });
                });
            }

            // Setup event listeners
            $pseudo.bind({
                mouseover: function() {
                    var $pseudo = $(this);
                    // Check if its disabled before adding a CSS class to mark the state
                    //if (!pseudoSelect.data('state').disabled) {
                    var state = $pseudo.data('state');
                    if (state == undefined || !$pseudo.data('state').disabled) {
                        $pseudo.addClass('jb-f-hover');
                    }
                },
                mouseout: function() {
                    var $pseudo = $(this);
                    // Check if its disabled before adding a CSS class to unmark the state
                    var state = $pseudo.data('state');
                    if (state == undefined || !$pseudo.data('state').disabled) {
                        $pseudo.removeClass('jb-f-hover');
                    }
                },
                click: function() {
                    var $pseudo = $(this),
                        original = $pseudo.data('originalElement'),
                        state = $pseudo.data('state');
                    // Check if its disabled before determining whether collapse/expand is in order
                    if (state == undefined || !$pseudo.data('state').disabled) {
                        if (original.checked) THIS.checkboxUnCheck($pseudo);
                        else THIS.checkboxCheck($pseudo);
                        
                        $pseudo.focus();
                    }
                },
                focus: function() {
                    var $pseudo = $(this);
                    var state = $pseudo.data('state');
                    if (state == undefined || !$pseudo.data('state').disabled) {
                        // Mark element as focused
                        $pseudo.addClass('jb-f-focus');
                    }
                },
                blur: function() {
                    var $pseudo = $(this);
                    var state = $pseudo.data('state');
                    if (state == undefined || !$pseudo.data('state').disabled) {
                        // Stop mark as focused
                        $pseudo.removeClass('jb-f-focus');
                    }
                }
            });
            
            // Get default state across
            if (checkbox.checked) THIS.checkboxCheck($pseudo);
            else THIS.checkboxUnCheck($pseudo);

            // Mimic original element state
            if ($input.is(':visible') == false) this.hide($pseudo);
            if (checkbox.disabled) this.disable($pseudo);
        },
        
        /**
         * @todo create inner wrapper so that outer one can be absolutely positioned
         */
        checkboxBuild: function($input)
        {
            var input = $input[0];
            // Create custom element
            var $pseudo = $(document.createElement('div'))
                .attr({
                    // Copy the tab index of the original element across
                    tabindex: input.tabindex ? input.tabindex : 0,
                    // Give it a unique id attribute
                    id: input.id ? input.id + '-pseudo' : 'pseudo-' + new Date().getTime()
                })
                .addClass('jb-f-checkbox' + (this.settings.checkbox.className != '' ? ' ' + this.settings.checkbox.className : ''))
                .css({
                    width: this.settings.checkbox.width,
                    height: this.settings.checkbox.height
                });

            var $tick = $(document.createElement('div'))
                .addClass('jb-f-checkbox-tick')
                .hide()
                .appendTo($pseudo);
            
            return $pseudo;
        },

        checkboxCheck: function($pseudo)
        {
            var original = $pseudo.data('originalElement');
            original.checked = true;
            $pseudo.find('.jb-f-checkbox-tick').show();
        },
        
        checkboxUnCheck: function($pseudo)
        {
            var original = $pseudo.data('originalElement');
            original.checked = false;
            $pseudo.find('.jb-f-checkbox-tick').hide();
        }
    };
    
})(jQuery);