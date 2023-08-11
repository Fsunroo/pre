; (function ($, window, document, undefined) {
    "use strict";

    var pluginName = "reader",
        defaults = {
            state: 0,
            theme: 'sepia',
            pagingSpeed: 200,
            fontSize: 180,
            lineHeight: 200,
            limit: 999999,
            env: 'android',
            calcStateDelay: 500
        };

    function Plugin(options) {
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    $.extend(Plugin.prototype, {
        init: function () {
            var plugin = this;

            if (plugin.options.theme != 'sepia')
                plugin.setTheme(plugin.options.theme);

            if (plugin.options.fontSize != 180 || plugin.options.lineHeight != 200) {
                $('body').css({
                    'font-size': plugin.options.fontSize + "%",
                    'line-height': plugin.options.lineHeight + "%"
                });
            }

            $('video').after("<div class='r-media r-vid'></div>");
            $('audio').after("<div class='r-media r-aud'></div>");

            $('.r-vid').click(function () {
                var vid = $(this).prev().children('source').first().attr('src');
                plugin.sendParam('video', vid);
                return false;
            });

            $('.r-aud').click(function () {
                var aud = $(this).prev().attr('src');
                plugin.sendParam('audio', aud);
                return false;
            });

            $('.r-answr-open').click(function () {
                plugin.popup($(this).next('.r-answr').html());
                return false;
            });

            $(document).on('click', '.r-popup-close, .r-dimmer', function () {
                this.popup = this.popup || $('.r-dimmer, .r-popup');
                this.popup.hide();
                return false;
            });

            var scrollTimer;
            $(window).scroll(function () {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function () {
                    plugin.page = Math.floor($(document).scrollTop() / $(window).height()) + 1;
                    plugin.sendParam("page", plugin.page);
                    plugin.sendState();
                }, plugin.options.calcStateDelay);
            });

            plugin.pages = Math.floor($(document).height() / $(window).height()) + 1;

            plugin.sendParam('totalPages', plugin.pages);

            if (plugin.options.state != 0) {
                plugin.gotoState(plugin.options.state, true);
            }
            else {
                plugin.page = 1;
                plugin.sendParam("page", plugin.page);
            }

            setTimeout(function () {
                plugin.sendParam("doc", "ready");
            }, 10);
        },

        setTheme: function (theme) {
            var st = $('#r-theme');
            st.attr('href', st.attr('href').replace(/theme\.\w+\.css/gi, "theme." + theme + ".css"));
            this.options.theme = theme;
        },

        gotoPage: function (p, noAnimate) {
            var plugin = this;

            if (p > plugin.pages)
                p = plugin.pages;

            if (p > plugin.pages)
                p = plugin.pages;
            else if (p < 1)
                p = 1;

            var scrl = $(window).height() * (p - 1);

            if (noAnimate) {
                $('html, body').scrollTop(scrl);
            }
            else {
                $('html, body').animate({ scrollTop: scrl }, plugin.options.pagingSpeed);
            }
        },

        sendState: function () {
            var plugin = this;

            var withText = new Array();
            var withoutText = new Array();
            $('body *').each(function (index) {
                if (!$(this).children().length && $(this).isInViewport()) {
                    if ($(this).is('img,svg') || $(this).text().length)
                        withText.push(index);
                    else
                        withoutText.push(index);
                }
            });

            if (withText.length)
                plugin.options.state = withText[0];
            else if (withoutText.length)
                plugin.options.state = withoutText[0];

            plugin.sendParam("state", plugin.options.state);
        },

        setFontSize: function (percent) {
            $('body').css({ fontSize: percent + "%" });
            this.options.fontSize = percent;
        },

        setLineHeight: function (percent) {
            $('body').css({ lineHeight: percent + "%" });
            this.options.lineHeight = percent;
        },

        nextPage: function () {
            this.gotoPage(this.page + 1);
        },

        prevPage: function () {
            this.gotoPage(this.page - 1);
        },

        sendParam: function (name, value) {
            if (this.options.env == 'android') {
                console.info('reader:' + name + '=' + value);
            }
            else {
                webkit.messageHandlers.reader.postMessage(name + '=' + value);
            }
        },

        gotoState: function (state, noAnimate) {
            var plugin = this;

            var target = $('body *:eq(' + state + ')');
            var scrl = target.length ? (target.first().offset().top - 100) : 0;

            if (!scrl)
                scrl = $(window).scrollTop();

            if (noAnimate) {
                $('html, body').scrollTop(scrl);
            }
            else {
                $('html, body').animate({ scrollTop: scrl }, plugin.options.pagingSpeed);
            }
        },

        search: function (q) {
            q = q.toLowerCase();
            var plugin = this;
            plugin.sendParam("progress", "start");

            $('body *').each(function (i) {
                var self = $(this);
                if (self.is(':visible') && !self.children().length && self.text().toLowerCase().indexOf(q) != -1) {
                    self.html(self.html().replace(new RegExp(q, "gi"), "<span class='search-result'>" + q + "</span>"));
                }
            });
            var results = new Array();
            $('body *').each(function (i) {
                var self = $(this);
                if (self.hasClass('search-result')) {
                    results.push(i);
                }
            });
            plugin.sendParam("search-results", results.join());

            plugin.sendParam("progress", "end");

            if (results.length)
                plugin.gotoState(results[0]);
        },

        searchOff: function () {
            $('.search-result').each(function () {
                $(this).replaceWith($(this).html());
            })
        },
        popup: function (msg) {
            this.popup = this.popup || $('.r-dimmer, .r-popup');
            if (msg) {
                $('.r-popup-body', this.popup).html(msg);
                this.popup.show();
            } else {
                this.popup.hide();
            }
        }
    });

    $.fn[pluginName] = function (options) {
        if (!$.data(this, "plugin_" + pluginName))
            $.data(this, "plugin_" + pluginName, new Plugin(options));
        return $;
    };

    $.reader = function (options) {
        $.data(document, 'plugin_' + pluginName, new Plugin(options));
    };
    $.reader.gotoPage = function (p, noAnimate) {
        $.data(document, 'plugin_' + pluginName).gotoPage(p, noAnimate);
    };
    $.reader.gotoState = function (s, noAnimate) {
        $.data(document, 'plugin_' + pluginName).gotoState(s, noAnimate);
    };
    $.reader.nextPage = function () {
        $.data(document, 'plugin_' + pluginName).nextPage();
    };
    $.reader.prevPage = function () {
        $.data(document, 'plugin_' + pluginName).prevPage();
    };
    $.reader.setFontSize = function (percent) {
        $.data(document, 'plugin_' + pluginName).setFontSize(percent);
    };
    $.reader.setLineHeight = function (percent) {
        $.data(document, 'plugin_' + pluginName).setLineHeight(percent);
    };
    $.reader.setOptions = function (options) {
        var d = $.data(document, 'plugin_' + pluginName);
        d.options = $.extend(d.options, options);
        d.reset();
    };
    $.reader.setTheme = function (theme) {
        $.data(document, 'plugin_' + pluginName).setTheme(theme);
    };
    $.reader.search = function (q) {
        $.data(document, 'plugin_' + pluginName).search(q);
    };
    $.reader.searchOff = function () {
        $.data(document, 'plugin_' + pluginName).searchOff();
    };
})(jQuery, window, document);

$.fn.isInViewport = function () {
    var win = $(window);
    var rect = this[0].getBoundingClientRect();
    var result = rect.width && ((rect.top >= 0 && rect.top < win.height()) || (rect.bottom <= win.height() && rect.bottom > 0) || (rect.top < 0 && rect.botton > win.height()));

    return result;
};
