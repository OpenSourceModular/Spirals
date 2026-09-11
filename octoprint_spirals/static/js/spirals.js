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

    function drawSpiralPreview() {
        const canvas = document.getElementById('spiralsPlot');
        if (!canvas) {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const displayWidth = Math.max(200, Math.floor(rect.width || canvas.width));
        const displayHeight = Math.max(200, Math.floor(rect.height || canvas.height));
        const squareSize = Math.min(displayWidth, displayHeight);

        if (canvas.width !== squareSize || canvas.height !== squareSize) {
            canvas.width = squareSize;
            canvas.height = squareSize;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const margin = 20;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, 0, width, height);

        const startRadius = parseNumber($('#spiralsStartRadius').val(), 0.0);
        const endRadius = parseNumber($('#spiralsEndRadius').val(), 100.0);
        const diameter = Math.max(parseNumber($('#spiralsDiameter').val(), 100.0), 0.0);
        const turns = Math.max(parseNumber($('#spiralsTurns').val(), 1.0), 0.1);
        const samples = Math.max(2, Math.round(parseNumber($('#spiralsSamples').val(), 100)));
        const growth = parseNumber($('#spiralsGrowth').val(), 0.0);
        const invertZ = $('#spiralsInvertZ').is(':checked');

        const spiralMaxRadius = Math.max(
            Math.abs(endRadius),
            Math.abs(startRadius),
            diameter / 2,
            ...Array.from({ length: samples }, (_, i) => {
                const t = i / Math.max(samples - 1, 1);
                const theta = t * turns * 2 * Math.PI;
                return Math.abs(startRadius + (growth || (endRadius - startRadius)) * theta);
            })
        );
        const radiusSpan = Math.max(spiralMaxRadius, 1.0);
        const scale = (Math.min(width, height) - margin * 2) / (radiusSpan * 2.2);

        const tickStepMm = 25;
        const maxTickDistance = Math.max(0, Math.floor(radiusSpan / tickStepMm) * tickStepMm);

        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, height / 2);
        ctx.lineTo(width - margin, height / 2);
        ctx.moveTo(width / 2, margin);
        ctx.lineTo(width / 2, height - margin);
        ctx.stroke();

        if (diameter > 0) {
            const circleRadius = (diameter / 2) * scale;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, circleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#c17d00';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.strokeStyle = '#9aa3ad';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#555';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        for (let mm = tickStepMm; mm <= maxTickDistance; mm += tickStepMm) {
            const distancePx = mm * scale;

            const leftX = width / 2 - distancePx;
            const topY = height / 2 - distancePx;
            const rightX = width / 2 + distancePx;
            const bottomY = height / 2 + distancePx;

            ctx.beginPath();
            ctx.moveTo(leftX, height / 2 - 3);
            ctx.lineTo(leftX, height / 2 + 3);
            ctx.moveTo(width / 2 - 3, bottomY);
            ctx.lineTo(width / 2 + 3, bottomY);
            ctx.stroke();

            ctx.textAlign = 'right';
            ctx.fillText(String(mm), leftX - 4, height / 2 + 3);
            ctx.textAlign = 'left';
            ctx.fillText(String(mm), width / 2 + 6, bottomY + 3);

            if (rightX < width - margin) {
                ctx.beginPath();
                ctx.moveTo(rightX, height / 2 - 3);
                ctx.lineTo(rightX, height / 2 + 3);
                ctx.moveTo(width / 2 - 3, topY);
                ctx.lineTo(width / 2 + 3, topY);
                ctx.stroke();
            }
        }

        ctx.beginPath();
        for (let i = 0; i < samples; i++) {
            const t = i / (samples - 1);
            const theta = t * turns * 2 * Math.PI;
            const radius = startRadius + (growth || (endRadius - startRadius)) * theta;
            const x = width / 2 + radius * Math.cos(theta) * scale;
            const y = height / 2 + (invertZ ? -1 : 1) * radius * Math.sin(theta) * scale;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.strokeStyle = '#2369d1';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    $('#spiralsForm input').on('input change', drawSpiralPreview);
    drawSpiralPreview();

    $('#generateSpiralsGcode').on('click', function() {
        const payload = {
            start_radius: parseNumber($('#spiralsStartRadius').val(), 0.0),
            end_radius: parseNumber($('#spiralsEndRadius').val(), 100.0),
            turns: parseNumber($('#spiralsTurns').val(), 1.0),
            samples: parseNumber($('#spiralsSamples').val(), 100),
            growth: parseNumber($('#spiralsGrowth').val(), 0.0),
            feedrate: parseNumber($('#spiralsFeedrate').val(), 1000),
            total_depth: parseNumber($('#spiralsTotalDepth').val(), 0.0),
            depth_per_pass: parseNumber($('#spiralsDepthPerPass').val(), 0.0),
            invert_z: $('#spiralsInvertZ').is(':checked')
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
