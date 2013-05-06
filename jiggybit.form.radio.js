(function($) {

    /* global window */

    // Create jigybit namespace if doesn't exist
    window.jiggybit = window.jiggybit === undefined ? {} : window.jiggybit;
    window.jiggybit.formPlugins = window.jiggybit.formPlugins === undefined ? {} : window.jiggybit.formPlugins;

    /**
     * Aims to extend the plugin with support for custom radio elements
     *
     * @param {object} radio A radio DOM element
     * @param {object} settings Hash with settings for this instance
     * @returns {jiggybit.formPlugins.radio} Instance
     */
    var radio = function(radio, settings) {
        this.settings = settings;
        this.$radio = $(radio);
        this.initialize();
        return this;
    };


    /**
     * Default settings to run with
     */
    radio.defaults = {

        /**
         * Pseudo radio width
         * @type {integer}
         */
        width: 10,

        /**
         * Pseudo radio height
         * @type {integer}
         */
        height: 10,

        /**
         * @type {string}
         */
        className: ''
    };

    /**
     * Methods in this object are not to be accessed publically
     * @type {object}
     */
    radio.prototype = {

        /**
         * @type {object}
         */
        $radio: null,

        /**
         * @type {object}
         */
        $pseudo: null,

        /**
         *
         * @type {object}
         */
        $tick: null,

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
            this.$radio.data('jb-f-element', this);

            // Get other radio buttons that share the name for global unchecking
            this.$others = this.$radio.parents('form').find('input[name="'+ this.$radio[0].name +'"]').not(this.$radio);

            // Build replacement DOM stuff
            this.$pseudo = this.build();
            this.$tick = this.$pseudo.find('.jb-f-radio-tick');
           
            // Store original state of the original <select> so that we can
            // return it to its original state when requested
            this.originalState = {
                css: {
                    position: this.$radio.css('position'),
                    left: this.$radio.css('left'),
                    top: this.$radio.css('top')
                },
                attr: {
                    tabindex: this.$radio.attr('tabindex')
                }
            };

            // Insert pseudo element in DOM
            this.$pseudo.insertAfter(this.$radio);

            // Move original element out of view
            this.$radio.css({
                    position: 'absolute',
                    left: -10000,
                    top: -10000
                })
                // And make sure that the tabindex behaves properly
                .attr('tabindex', -1);

            if (this.$radio[0].id) {
                $('label[for="' + this.$radio[0].id + '"]').each(function() {
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
            if (this.$radio[0].checked) this.check();
            else this.unCheck();

            // Mimic original element state
            if (this.$radio.is(':visible') === false) this.hide();
            if (this.$radio[0].disabled) this.disable();
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
                    // Check if its disabled before determining whether checking/unchecking is in order
                    if (state === undefined || !state.disabled) {
                        if (_this.$radio[0].checked) _this.unCheck();
                        else _this.check();
                        // Focus on custom radio
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
         * Builds custom radio DOM elements
         *
         * @returns {unresolved}
         */
        build: function()
        {
            // Create custom element
            var $pseudo = $(document.createElement('a'))
                .attr({
                    // Copy the tab index of the original element across
                    tabindex: this.$radio.attr('tabindex') ? this.$radio.attr('tabindex') : 0,
                    // Give it a unique id attribute
                    id: this.$radio[0].id ? this.$radio[0].id + '-pseudo' : 'pseudo-' + new Date().getTime()
                })
                .addClass('jb-f-radio' + (this.settings.radio.className !== '' ? ' ' + this.settings.radio.className : ''))
                .css({
                    width: this.settings.radio.width,
                    height: this.settings.radio.height
                });

            // Create tick
            $(document.createElement('span'))
                .addClass('jb-f-radio-tick')
                .hide()
                .appendTo($pseudo);

            return $pseudo;
        },

        /**
         * @public
         * @returns {undefined}
         */
        check: function()
        {
            // Uncheck others before checking the current one. We assume that all
            // radio buttons that go by this name are customised using this plugin
            $.each(this.$others, function(idx) {
                $(this).JiggybitForm().unCheck();
            });

            this.$radio[0].checked = true;
            this.$tick.show();
        },

        /**
         * @public
         * @returns {undefined}
         */
        unCheck: function()
        {
            this.$radio[0].checked = false;
            this.$tick.hide();
        },

        /**
         * Destroys pseudo DOM elements and unbinds events as well as the
         * reference to this instance which is stored on the data collection
         * of the original checkbox DOM element. It should at that point get
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
            this.$radio.css(this.originalState.css);
            this.$radio.attr(this.originalState.attr);

            // And finally remove the reference to this instance from the original
            // radio button
            this.$radio.removeData('jb-f-element');
        }
    };

    jiggybit.formPlugins.radio = radio;

})(jQuery);