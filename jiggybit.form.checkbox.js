
(function($) {

    /* global window */

    // Create jigybit namespace if doesn't exist
    window.jiggybit = window.jiggybit === undefined ? {} : window.jiggybit;
    window.jiggybit.formPlugins = window.jiggybit.formPlugins === undefined ? {} : window.jiggybit.formPlugins;

    /**
     * Aims to extend the plugin with support for custom checkbox elements
     * @todo On focus detect space bar key up to check/uncheck
     *
     * @param {object} checkbox A checkbox DOM element
     * @param {object} settings Hash with settings for this instance
     * @returns {jiggybit.formPlugins.checkbox} Instance
     */
    var checkbox = function(checkbox, settings) {
        this.settings = settings;
        this.$checkbox = $(checkbox);
        this.initialize();
        return this;
    };


    /**
     * Default settings to run with
     */
    checkbox.defaults = {

        /**
         * Pseudo checkbox width
         * @type {integer}
         */
        width: 10,

        /**
         * Pseudo checkbox height
         * @type {integer}
         */
        height: 10,

        className: ''
    };

    /**
     * Methods in this object are not to be accessed publically
     * @type {object}
     */
    checkbox.prototype = {

        /**
         * 
         */
        $checkbox: null,

        /**
         *
         */
        $pseudo: null,

        /**
         * 
         */
        $tick: null,

        initialize: function()
        {
            var _this = this;

            // Build replacement DOM stuff
            this.$pseudo = this.build();
            this.$tick = this.$pseudo.find('.jb-f-checkbox-tick');

            // Store original state of the original <select> so that we can
            // return it to its original state when requested
            this.$pseudo.data('originalState', {
                    css: {
                        position: this.$checkbox.css('position'),
                        left: this.$checkbox.css('left'),
                        top: this.$checkbox.css('top')
                    },
                    attr: {
                        tabindex: this.$checkbox.attr('tabindex')
                    }
                });

            // Insert pseudo element in DOM
            this.$pseudo.insertAfter(this.$checkbox);

            // Move original element out of view
            this.$checkbox.css({
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                })
                // And make sure that the tabindex behaves properly
                .attr('tabindex', -1);

            if (this.$checkbox[0].id) {
                $('label[for="' + this.$checkbox[0].id + '"]').each(function() {
                    var $label = $(this);
                    // Update for attribute
                    $label.attr('for', _this.$pseudo.attr('id'));
                    $label.click(function(event) {
                        event.preventDefault();
                        $('#' + this.getAttribute('for') ).trigger('click');
                    });
                });
            }

            // Setup event listeners
            this.setupEventListeners();

            // Get default state across
            if (this.$checkbox[0].checked) this.check();
            else this.unCheck();

            // Mimic original element state
            if (this.$checkbox.is(':visible') === false) this.hide();
            if (this.$checkbox[0].disabled) this.disable();
        },

        setupEventListeners: function()
        {
            var _this = this;
        
            this.$pseudo.bind({
                mouseover: function() {
                    // Check if its disabled before adding a CSS class to mark the state
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
                click: function(event) {
                    event.stopPropagation(); // In case input is wrapped in label
                    var state = _this.$pseudo.data('state');
                    // Check if its disabled before determining whether collapse/expand is in order
                    if (state === undefined || !state.disabled) {
                        if (_this.$checkbox[0].checked) _this.unCheck();
                        else _this.check();
                        // Focus on custom checkbox
                        _this.$pseudo.focus();
                    }
                },
                focus: function() {
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {
                        // Mark element as focused
                        _this.$pseudo.addClass('jb-f-focus');
                    }
                },
                blur: function() {
                    var state = _this.$pseudo.data('state');
                    if (state === undefined || !state.disabled) {
                        // Stop mark as focused
                        _this.$pseudo.removeClass('jb-f-focus');
                    }
                }
            });
        },

        /**
         * Builds custom checkbox DOM elements
         *
         * @returns {unresolved}
         */
        build: function()
        {
            // Create custom element
            var $pseudo = $(document.createElement('a'))
                .attr({
                    // Copy the tab index of the original element across
                    tabindex: this.$checkbox.attr('tabindex') ? this.$checkbox.attr('tabindex') : 0,
                    // Give it a unique id attribute
                    id: this.$checkbox[0].id ? this.$checkbox[0].id + '-pseudo' : 'pseudo-' + new Date().getTime()
                })
                .addClass('jb-f-checkbox' + (this.settings.checkbox.className !== '' ? ' ' + this.settings.checkbox.className : ''))
                .css({
                    width: this.settings.checkbox.width,
                    height: this.settings.checkbox.height
                });

            // Create tick
            $(document.createElement('span'))
                .addClass('jb-f-checkbox-tick')
                .hide()
                .appendTo($pseudo);

            return $pseudo;
        },

        check: function()
        {
            this.$checkbox[0].checked = true;
            this.$pseudo.find('.jb-f-checkbox-tick').show();
        },

        unCheck: function()
        {
            this.$checkbox[0].checked = false;
            this.$pseudo.find('.jb-f-checkbox-tick').hide();
        },

        destroy: function()
        {
            

        }
    };

    jiggybit.formPlugins.checkbox = checkbox;

})(jQuery);