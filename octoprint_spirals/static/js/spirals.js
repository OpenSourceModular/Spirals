$(function() {
    function detectPluginId() {
        const tabContainer = $('#generateSpiralsGcode').closest('[id^="tab_plugin_"], [id^="settings_plugin_"]');
        if (tabContainer.length) {
            const containerId = tabContainer.attr('id');
            const match = containerId.match(/^(?:tab|settings)_plugin_(.+)$/);
            if (match && match[1]) {
                return match[1];
            }
        }

        const scriptSrc = $('script[src*="spirals.js"]').last().attr('src') || '';
        const srcMatch = scriptSrc.match(/\/plugin\/([^\/]+)\/static\/js\/spirals\.js/);
        if (srcMatch && srcMatch[1]) {
            return srcMatch[1];
        }

        return 'spirals';
    }

    function parseNumber(value, fallback) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function buildGenerateUrls(pluginId) {
        const urls = [];

        if (window.OctoPrint && typeof OctoPrint.getBlueprintUrl === 'function') {
            urls.push(OctoPrint.getBlueprintUrl(pluginId) + 'generate_gcode');
        }

        urls.push((window.BASEURL || '/') + 'plugin/' + pluginId + '/generate_gcode');
        urls.push((window.API_BASEURL || '/api/') + 'plugin/' + pluginId);
        return urls;
    }

    function getCsrfToken() {
        if (window.OctoPrint && OctoPrint.options && OctoPrint.options.csrfToken) {
            return OctoPrint.options.csrfToken;
        }

        const cookieMatch = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
        return cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
    }

    function tryGenerateAtUrl(url, payload) {
        const isApiCommand = /\/api\/plugin\//.test(url);
        const csrfToken = getCsrfToken();
        const requestData = isApiCommand ? $.extend({ command: 'generate_gcode' }, payload) : payload;

        return $.ajax({
            url: url,
            type: isApiCommand ? 'POST' : 'GET',
            contentType: isApiCommand ? 'application/json; charset=utf-8' : undefined,
            dataType: 'json',
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
            data: isApiCommand ? JSON.stringify(requestData) : requestData
        });
    }

    function postGenerateCommand(payload) {
        const pluginId = detectPluginId();
        const urls = buildGenerateUrls(pluginId);
        const deferred = $.Deferred();

        function attempt(index, lastError) {
            if (index >= urls.length) {
                deferred.reject(lastError);
                return;
            }

            tryGenerateAtUrl(urls[index], payload)
                .done(function(response) {
                    deferred.resolve(response);
                })
                .fail(function(xhr) {
                    if (xhr && xhr.status === 404) {
                        attempt(index + 1, xhr);
                        return;
                    }
                    deferred.reject(xhr);
                });
        }

        attempt(0, null);
        return deferred.promise();
    }

    $('#generateSpiralsGcode').on('click', function() {
        const payload = {
            start_radius: parseNumber($('#spiralsStartRadius').val(), 0.0),
            end_radius: parseNumber($('#spiralsEndRadius').val(), 100.0),
            turns: parseNumber($('#spiralsTurns').val(), 1.0),
            samples: parseNumber($('#spiralsSamples').val(), 100),
            growth: parseNumber($('#spiralsGrowth').val(), 0.0),
            feedrate: parseNumber($('#spiralsFeedrate').val(), 1000),
            total_depth: parseNumber($('#spiralsTotalDepth').val(), 0.0),
            depth_per_pass: parseNumber($('#spiralsDepthPerPass').val(), 0.0)
        };

        postGenerateCommand(payload)
            .done(function(response) {
                if (response && response.success) {
                    alert('Saved to uploads/' + response.filename);
                } else {
                    alert('Failed to generate gcode');
                }
            })
            .fail(function(xhr) {
                const status = xhr && xhr.status ? ('HTTP ' + xhr.status) : '';
                const jsonError = (xhr.responseJSON && xhr.responseJSON.error) ? xhr.responseJSON.error : '';
                const textError = xhr && xhr.responseText ? String(xhr.responseText).trim().slice(0, 500) : '';
                const fallback = xhr && xhr.statusText ? xhr.statusText : 'Request failed';
                const message = jsonError || textError || fallback;
                alert('Failed to generate gcode: ' + (status ? status + ' ' : '') + message);
            });
    });
});
