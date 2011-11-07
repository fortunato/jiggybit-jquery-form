/**
 * Assign jQuery to $ as shorthand
 */

//var JiggybitForm;

(function($) {

    /**
     * Create JiggybitForm in the jQuery fn namespace
     */
    $.extend($.fn, {
        
        /**
         * Build plugin from parts.
         * The reason I did not nest the code straight into the extend 
         * method is so that an IDE is able to make sense of the structure and 
         * JSDoc.
         * @return {$.fn.JiggybitForm}
         */
        JiggybitForm: function(options) {
            
            // Start with loading plugins available on this page
            var enabledPlugins = new Array();
            
            // Select
            if (typeof JiggybitFormSelect != "undefined") {
                // Use plugin defaults
                $.extend(JiggybitForm.defaults.select, JiggybitFormSelectDefaults);
                // Add plugin methods 
                $.extend(JiggybitForm, JiggybitFormSelect);
                // Mark plugin as loaded
                enabledPlugins.push('select');
            }
            
            // Color swatches
            // ..
            
            // Radio
            if (typeof JiggybitFormRadio != "undefined") {
                // Use plugin defaults
                $.extend(JiggybitForm.defaults.radio, JiggybitFormRadioDefaults);
                // Add plugin methods 
                $.extend(JiggybitForm, JiggybitFormRadio);
                // Mark plugin as loaded
                enabledPlugins.push('radio');
            }
            
            // On/off radio button variant? or can we solve all through CSS?
            
            
            // Checkbox
            if (typeof JiggybitFormCheckbox != "undefined") {
                // Use plugin defaults
                $.extend(JiggybitForm.defaults.checkbox, JiggybitFormCheckboxDefaults);
                // Add plugin methods 
                $.extend(JiggybitForm, JiggybitFormCheckbox);
                // Mark plugin as loaded
                enabledPlugins.push('checkbox');
            }
            
            // Now complete creating the plugin prototype
            $.extend($.fn.JiggybitForm.prototype, {
                defaults: JiggybitForm.defaults, 
                prototype: JiggybitForm
            });
            
            // Initialise and return the plugin instance
    		return new $.fn.JiggybitForm.prototype(options, this, enabledPlugins);
        }
    });
    
    /**
     * Attaches the settings to the plugin an instantiates it
     * @type {Prototype}
     */
    $.fn.JiggybitForm.prototype = function(options, fields, enabledPlugins) {
       this.settings = $.extend( true, {}, $.fn.JiggybitForm.prototype.defaults, options);
       this.fields = fields;
       this.enabledPlugins = enabledPlugins;
       this.initialize();
    };
    
    /**
     * 
     * @type {object}
     */
    var JiggybitForm = 
    {
        /**
         * Default settings for this plugin
         * @type {object}
         */
        defaults: {
            
            /**
             * When true, some debug information is logged to the console
             * @type {bool}
             */
            debug: false,
            
            /**
             * Contains a key/value pair for each enabled plugin
             * @type {array}
             */
            enabledPlugins: [],

            /**
             * Placeholder for the default settings of the select plugin
             * @type {object}
             */
            select: {
                
                /**
                 *
                 * @type {bool}
                 */
                enabled: false
            },
            
            /**
             * Placeholder for the default settings of the radio button plugin
             * @type {object}
             */
            radio: {
                
                /**
                 *
                 * @type {bool}
                 */
                enabled: false
            },
            
            /**
             * Placeholder for the default settings of the checkbox plugin
             * @type {object}
             */
            checkbox: {
                
                /**
                 *
                 * @type {bool}
                 */
                enabled: false
            },
            
            /**
             * 
             * @type {float}
             */
            disabledOpacity: 0.7,
            
            /**
             * Hash with observer specific configuration options
             * @type {object}
             */
            observer: {
                
                /**
                 *
                 * @type {bool}
                 */
                enabled: false,
                
                /**
                 *
                 * @type {integer}
                 */
                interval: 200
                
            }
        },
        
        /**
         * Live settings after defaults and passed options have been merged
         * @type {object}
         */
        settings: {},
        
        /**
         * Collection of orignal form elements that are managed by this instance 
         * of this plugin
         * @type {array}
         */
        fields: [],
        
        /**
         * Collection of pseudo fields that have replaced the original ones
         * @type {array}
         */
        pseudoFields: [],
        
        /**
         * Plugin constructor
         * @private
         * @return {void}
         */
        initialize: function()
        {
            var THIS = this;
            
            // Iterate enabled plugins and set some convenient booleans to check
            // support against
            for (x in this.enabledPlugins) {
                this.settings[this.enabledPlugins[x]].enabled = true;
            }
            
            // Let's start with some iteration over the collected form fields
            // and get the party started
            this.fields.each(function(idx) {
                
                // Check if this elements hasn't already been customized
                // first come first serve
                if ($(this).data('jigyybit-form') !== true) {
                    // Check the type of element we're dealing with
                    switch (this.type) {
                        
                        case 'select-one':
                            if (THIS.settings.select.enabled == true) THIS.selectInit(this);
                            break;
                            
                        case 'checkbox':
                            if (THIS.settings.checkbox.enabled == true) THIS.initCheckbox(this);
                            break;
                    }
                    
                }
                
                //THIS.copyEvents(this);
            });
            
            // Monitor original element for changes on a set interval when 
            // requested (additional payload)
            if (this.settings.observer.enabled) this.observe();
            
//            this.log(this);
            
            //if (this.defaults.debug == true) this.setupLog();
            
//            this.log($('body'));
//            this.log(this.fields);
        },

        /**
         * Attempts to log to console
         * 
         * @private
         * @return {void}
         */
        log: function(x)
        {
            try {
                console.log(x);
            } catch (exception) { // Unable to log to console
            }
        },
        
        show: function(el)
        {
            el.show();
        },

        hide: function(el)
        {
            el.hide();
        },

        enable: function(el)
        {
            el.css('opacity', 1);
            el.removeAttr('disabled');
        },

        disable: function(el)
        {
            el.css('opacity', this.settings.disabledOpacity);
            el.attr('disabled', 'disabled');
        },
        
        /**
         * Observes any changes in the state of the original element 
         * (for example programmatic changes)
         * 
         * @todo Manage observer through a single setInterval call using an array 
         * to keep track of the elements that actually need to be observed.
         * 
         * @private
         * @param {HTMLElement} original Original input/select element
         * @param {HTMLElement} pseudo jQuerified custom element
         * @return void
         */
        observe: function(original, pseudo)
        {
            var THIS = this;

            // Store generic properties related to the current state locally so 
            // that we can easily detect when it has changed
            pseudo.data('state', {
                disabled: original.disabled ? true : false,
                visible: $(original).is(":visible") ? true : false,
                className: original.className
            });

            // Additional relevant attribute for single select elements
            if (original.type == 'select-one') {
                pseudo.data('state').selectedIndex = original.selectedIndex;
            }

            // Check every so many ms
            //this.interval = setInterval(function() {
            var observer = setInterval(function() {
                
                // <select> no longer exists in the DOM and plugin wasn't
                // properly unloaded
                if (!el.data('state')) {
                    //clearInterval($this.interval);
                    clearInterval(el.data('observer'));
                    return false;
                }
                
                // Check if element was enabled/disabled since last call
                if (el.data('state').disabled != originalEl.disabled) {
                    el.data('state').disabled = originalEl.disabled;
                    if (originalEl.disabled) {
                        $this.disable(el);
                    } else {
                        $this.enable(el);
                    }
                }
                // Check if visibility of the original element has changed
                var visible = $(originalEl).is(":visible");
                if (el.data('state').visible != visible) {
                    el.data('state').visible = visible;
                    if (visible) {
                        $this.show(el);
                    } else {
                        $this.hide(el);
                    }
                }
                // Check if selectedIndex on the original element has changed
                if (originalEl.type == 'select-one') {
                    var selectedIndex = originalEl.selectedIndex;
                    if (el.data('state').selectedIndex != selectedIndex) {
                        el.data('state').selectedIndex = selectedIndex;
                        // Reflect change on replacement select
                        $this.select(el, selectedIndex);
                    }
                }
                // Transfer added/removed class names
                var classNames = originalEl.className.split(",");
                $.each(classNames, function() {
                    var cssClass = this.toString();
                    if (!el.hasClass(cssClass)) {
                        el.addClass(cssClass);
                    }
                });
                classNames = el.attr('class').split(" ");
                $.each(classNames, function() {
                    var cssClass = this.toString();
                    // Don't remove 'special' class names
                    if ((' select focus hover '+$this.settings.className+' '+originalEl.className+' ').indexOf(' '+cssClass+' ') == -1) {
                        el.removeClass(cssClass);
                    }
                });

                // Check if any of the options has been enabled/disabled
                if ($this.settings.enableDisabledOptionObserver) {
                    $(originalEl).children('option').each(function(idx) {
                        // Find corresponding <li>
                        var li = el.data('dropdown').children('.option:nth-child(' + (idx + 1) + ')');
                        //console.log(li);
                        if ($(this).is(':disabled') == true) {
                            if (!li.hasClass('disabled')) {
                                li.addClass('disabled');
                            }
                        } else {
                            li.removeClass('disabled')
                        }
                    });
                }

            }, $this.settings.trackInterval);

            // Store the interval
            el.data('observer', observer);
        },
        
        /**
         * @todo
         * 
         */
        startObserving: function()
        {
        },
        
        /**
         * @todo
         */
        stopObserving: function()
        {
        },
        
        /**
         * Re-initialises the pseudo elements by destroying the current set
         * and building them up from scratch. This is a useful method if for 
         * example the options list in a <select> element has been updated or 
         * when an AJAX request has replaced a collection of elements.
         * 
         * @return void
         */
        reset: function()
        {
            // Destroy
            this.destroy();
            // And start over with the current configuration and set of elements
            this.initialize();
        },
        
        /**
         * Removes all pseudo element and restores the original element to its 
         * original state.
         * 
         * @return void
         */
        destroy: function()
        {
            var THIS = this;
            
            // @todo Clear observer interval
            
            // Iterate fields 
            $.each(this.pseudoFields, function(idx) {
                var jqThis = $(this);
                
                // Retrieve original element and state from reference
                var original = jqThis.data('originalElement');
                var originalState = jqThis.data('originalState');
                
                // Restore original state of the original element
                $(original)
                    .css(originalState.css)
                    .attr(originalState.attr);
                
                // Remove pseudo stuff from the DOM
                if (original.type == 'select-one') {
                    jqThis.data('options').remove();
                }
                jqThis.remove();
            });
        }
    };
    
//    JiggybitForm.select = function() {
//        console.log('tester');
//    }    

    /**
     * Build plugin from parts.
     * The reason I did not nest the code straight into the following extend 
     * method is so that an IDE is able to make sense of the structure and 
     * JSDoc.
     * @return {void}
     */
    //$.extend($.fn.JiggybitForm.prototype, {defaults: JiggybitForm.defaults, prototype: JiggybitForm});
    
    //$.extend($.fn.JiggybitForm.prototype, {prototype: JiggybitFormTester});

})(jQuery);
