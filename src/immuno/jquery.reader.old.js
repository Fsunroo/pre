; (function ($, window, document, undefined) {
    "use strict";

    var pluginName = "reader",
        defaults = {
            state: 0,
            theme: 'sepia',
            margin: 20,
            pagingSpeed: 200,
            fontSize: 100,
            lineHeight: 150,
            limit: 999999,
            env: 'android',
            startDelay: 1500
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

            plugin.win = $(window);
            plugin.scrl = $('#scrl');
            plugin.options.dir = $('body').hasClass('ltr') ? 'ltr' : 'rtl';

            $('video').after("<div class='r-media r-vid'></div>");
            $('audio').after("<div class='r-media r-aud'></div>");

            $('.r-answr-open').click(function () {
                plugin.popup('پاسخ', $(this).next('.r-answr').html());
                return false;
            });

            $(document).on('click', '.r-popup-close', function () {
                $('.r-popup').remove();
                return false;
            });

            if (plugin.options.env == 'android') {

                $('.r-vid').click(function () {
                    var vid = $(this).prev().attr('src');
                    plugin.sendParam('video', vid);
                    return false;
                });

                $('.r-aud').click(function () {
                    var aud = $(this).prev().attr('src');
                    plugin.sendParam('audio', aud);
                    return false;
                });

                $('a').click(function () {
                    try {
                        var href = $(this).attr('href');
                        var targetId = href.substring(href.lastIndexOf("#"));
                        var targetPage = plugin.getPageNum(targetId);
                        plugin.gotoPage(targetPage);
                    }
                    catch (err) { }
                    return false;
                })
            }

            if (plugin.options.env == 'ios') {
                $('a').click(function () {
                    try {
                        var href = $(this).attr('href');
                        var targetId = href.substring(href.lastIndexOf("#"));
                        var targetPage = plugin.getPageNum(targetId);
                        plugin.gotoPage(targetPage);
                    }
                    catch (err) { }
                    return false;
                })
            }

            //plugin.popup('ok', 'test');

            plugin.setTheme(plugin.options.theme);

            plugin.winH = Number(plugin.win.height() - (plugin.options.margin * 2));
            plugin.winW = Number(plugin.win.width());
            plugin.colW = Number(plugin.winW - plugin.options.margin * 2);
            plugin.minDrag = Number(Math.min(plugin.winW, plugin.win.outerHeight()) / 6);

            plugin.scrl.css({ padding: plugin.options.margin });

            if (plugin.options.dir == 'rtl') {
                plugin.win.scrollLeft(-1); //workaround for a webkit bug
            }

            $('#r-wrap').css({
                height: plugin.winH,
                'font-size': plugin.options.fontSize + "%",
                'line-height': plugin.options.lineHeight + "%",
                '-webkit-column-fill': 'auto',
                '-moz-column-fill': 'auto',
                'column-fill': 'auto',
                '-webkit-column-gap': plugin.options.margin * 2,
                '-moz-column-gap': plugin.options.margin * 2,
                'column-gap': plugin.options.margin * 2,
                '-webkit-column-width': plugin.colW,
                '-moz-column-width': plugin.colW,
                'column-width': plugin.colW
            });

            this.sendState = this.sendState.bind(this);
            this.delayedInit = this.delayedInit.bind(this);
            setTimeout(this.delayedInit, this.options.startDelay);
        },

        delayedInit: function () {
            var plugin = this;

            plugin.docW = plugin.scrl[0].scrollWidth;
            $('#r-wrap').width(plugin.docW);

            plugin.pages = Math.ceil(plugin.docW / plugin.winW);

            plugin.allowedPages = Math.min(plugin.pages, plugin.options.limit);

            plugin.sendParam('totalPages', plugin.allowedPages);

            if (plugin.pages == 1)
                plugin.scrl.width(plugin.winW - 2 * plugin.options.margin);

            if (plugin.options.state != 0) {
                plugin.gotoState(plugin.options.state, true);
            }
            else {
                plugin.page = 1;
                plugin.sendParam("page", plugin.page);
            }

            plugin.sendParam("doc", "ready");
        },

        reset: function () {
            $('body').removeAttr('style');
            this.init();
        },

        setTheme: function (theme) {
            var st = $('#r-theme');
            st.attr('href', st.attr('href').replace(/theme\.\w+\.css/gi, "theme." + theme + ".css"));
            this.options.theme = theme;
            var scrl = this.scrl.scrollLeft();
            this.scrl.scrollLeft(scrl - 1).scrollLeft(scrl + 1); // workaround to force rerender
        },

        touchstart: function (x) {
            this.scrl.stop();
            clearTimeout(this.calcStateTimeout);
            this.touchStartX = x;
            this.touchStartScroll = this.scrl.scrollLeft();
        },

        touchmove: function (x) {
            if ((this.page < this.allowedPages)
                || (this.options.dir == 'rtl' && this.touchStartX > x)
                || (this.options.dir == 'ltr' && this.touchStartX < x)) {
                this.scrl.scrollLeft(this.touchStartScroll + this.touchStartX - x);
            }

        },

        touchend: function (x) {
            var d = this.touchStartX - x;
            if (Math.abs(d) > this.minDrag) {
                if (d > 0) {
                    if (this.options.dir == 'ltr')
                        $.reader.nextPage();
                    else
                        $.reader.prevPage();
                }
                else {
                    if (this.options.dir == 'ltr')
                        $.reader.prevPage();
                    else {
                        $.reader.nextPage();
                    }
                }
            }
            else {
                this.gotoPage(this.page);
            }
        },

        gotoPage: function (p, noAnimate) {
            var plugin = this;

            if (p > plugin.allowedPages)
                p = plugin.allowedPages;

            clearTimeout(plugin.calcStateTimeout);

            if (p > plugin.pages)
                p = plugin.pages;
            else if (p < 1)
                p = 1;

            if (plugin.options.env == 'android') {
                var scrl = (plugin.options.dir == 'ltr') ?
                    (plugin.docW + plugin.options.margin) * (p - 1) / plugin.pages :
                    (plugin.docW + plugin.options.margin) * (plugin.pages - p) / plugin.pages;
            }
            else {
                var scrl = Math.round((plugin.options.dir == 'ltr')
                    ? plugin.docW * (p - 1) / plugin.pages
                    : 0 - (plugin.docW * (p - 1) / plugin.pages));
            }

            //this.popup('ok', 'scrl : ' + scrl + ' , current : ' + plugin.scrl.scrollLeft());

            if (noAnimate) {
                plugin.scrl.scrollLeft(scrl);
            }
            else {
                var isNewPage = (plugin.page != p);
                plugin.scrl.animate({ scrollLeft: scrl }, plugin.options.pagingSpeed, function () {
                    if (isNewPage)
                        plugin.calcStateTimeout = setTimeout(plugin.sendState, 1000);
                });
            }
            plugin.page = p;
            plugin.sendParam('page', plugin.page);
        },

        sendState: function () {
            var plugin = this;

            var withText = new Array();
            var withoutText = new Array();
            $('#r-wrap *').each(function (index) {
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
            $('#r-wrap').css({ fontSize: percent + "%" });
            this.options.fontSize = percent;
        },

        setLineHeight: function (percent) {
            $('#r-wrap').css({ lineHeight: percent + "%" });
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

        getPageNum: function (stateOrSelector) {
            var wrapX = $('#r-wrap').offset().left;
            var target = isNaN(stateOrSelector) ? $(stateOrSelector) : $('#r-wrap *:eq(' + stateOrSelector + ')');
            var x = (target.length) ? target.first().offset().left - wrapX : 0;

            if (!x)
                x = this.scrl.scrollLeft();

            var p = Math.floor((this.options.dir == 'ltr')
                ? x / this.docW * this.pages + 1
                : (this.docW - x) / this.docW * this.pages + 1);

            return Math.round(p);
        },

        gotoState: function (state, noAnimate) {
            var page = this.getPageNum(state);
            this.gotoPage(page, noAnimate)
        },

        search: function (q) {
            q = q.toLowerCase();
            var plugin = this;
            plugin.sendParam("progress", "start");

            var results = new Array();
            $('#r-wrap :visible').each(function (i) {
                if (!$(this).children().length && $(this).text().toLowerCase().indexOf(q) != -1 && results.indexOf(i) == -1) {
                    results.push(i);
                    $(this).html($(this).html().replace(new RegExp(q, "gi"), "<span class='search-result'>" + q + "</span>"));
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
        click: function (x, y) {
            var plugin = this;
            var src = 'na';
            var t = 'click';
            $('.r-media').each(function () {
                var rect = this.getBoundingClientRect();
                if (src == 'na' &&
                    rect.left <= x &&
                    rect.right >= x &&
                    rect.top <= y &&
                    rect.bottom >= y) {
                    var media = $(this).prev();
                    src = media.attr('src');
                    t = media.get(0).nodeName.toLowerCase();
                }
            });
            plugin.sendParam(t, src);
        },
        popup: function (ttl, msg) {
            if (ttl || msg) {
                $('body').append(
                '<div class="r-box r-popup">' +
                    '<div class="r-box-title">' + ttl +
                        '<span class="r-popup-close">x</span>' +
                    '</div>' +
                    '<div class="r-popup-body">' + msg + '</div>' +
                '</div>');
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
    $.reader.reset = function () {
        $.data(document, 'plugin_' + pluginName).reset();
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

    $.reader.touchstart = function (x) {
        $.data(document, 'plugin_' + pluginName).touchstart(x);
    };

    $.reader.touchmove = function (x) {
        $.data(document, 'plugin_' + pluginName).touchmove(x);
    };

    $.reader.touchend = function (x) {
        var d = $.data(document, 'plugin_' + pluginName).touchend(x);
    };
    $.reader.search = function (q) {
        $.data(document, 'plugin_' + pluginName).search(q);
    };
    $.reader.searchOff = function () {
        $.data(document, 'plugin_' + pluginName).searchOff();
    };
    $.reader.click = function (x, y) {
        $.data(document, 'plugin_' + pluginName).click(x, y);
    };
})(jQuery, window, document);

$.fn.isInViewport = function () {
    var win = $(window);
    var rect = this[0].getBoundingClientRect();
    var result = rect.width && ((rect.left >= 0 && rect.left < win.width()) || (rect.right <= win.width() && rect.right > 0) || (rect.left < 0 && rect.right > win.width()));

    return result;
};
