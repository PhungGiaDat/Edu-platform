/**
 * ar-discord-sync.js
 *
 * Pure Discord sync module for AR iframe viewer.
 * Single responsibility: send AR logs to Discord webhook.
 *
 * Usage:
 *   const discordSync = ARDiscordSync.create({
 *     webhookUrl: 'https://discord.com/api/webhooks/...',
 *     getLogs: () => iframeLogBuffer.slice(-200).join('\n'),
 *     getMetadata: () => ({ offsetX, offsetY, catalogId }),
 *     onSuccess: () => log('✅', 'Discord sync: success'),
 *     onError: (err) => log('❌', 'Discord sync: ' + err)
 *   });
 *   discordSync.sync();  // returns Promise<void>
 */
(function (root) {
    'use strict';

    function create(options) {
        var webhookUrl = options.webhookUrl;
        var getLogs = options.getLogs;
        var getMetadata = options.getMetadata;
        var onSuccess = options.onSuccess;
        var onError = options.onError;

        // Max Discord content length
        var MAX_DISCORD_CHARS = 2000;

        /**
         * Build the Discord message payload.
         */
        function buildMessage(logs) {
            var meta = getMetadata ? getMetadata() : {};
            var metadataStr = '🚀 **AR Sync Report**\n' +
                '**Offset:** X:' + (meta.offsetX || 0) + ' Y:' + (meta.offsetY || 0) + ' Z:' + (meta.offsetZ || 0) + '\n' +
                '**Catalog:** ' + (meta.catalogId || 'none') + '\n' +
                '**Engine:** ' + (meta.engine || 'MindAR') + '\n' +
                '**Time:** ' + new Date().toISOString() + '\n\n' +
                '**Iframe Logs (Last 200):**\n';

            var overhead = metadataStr.length + 10; // code block backticks
            var maxLogChars = MAX_DISCORD_CHARS - overhead;
            var slicedLogs = logs.length > maxLogChars
                ? '...' + logs.slice(-maxLogChars)
                : logs;

            return metadataStr + '```\n' + slicedLogs + '\n```';
        }

        /**
         * Sync logs to Discord. Returns a Promise.
         */
        function sync() {
            if (!webhookUrl) {
                return Promise.reject(new Error('Discord webhook URL not configured'));
            }

            var logs = getLogs ? getLogs() : '';
            var content = buildMessage(logs);

            return fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content })
            }).then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                if (onSuccess) onSuccess();
                return response;
            }).catch(function (err) {
                var msg = err instanceof Error ? err.message : String(err);
                if (onError) onError(msg);
                throw err;
            });
        }

        return {
            sync: sync,
            buildMessage: buildMessage
        };
    }

    root.ARDiscordSync = { create: create };
})(typeof globalThis !== 'undefined' ? globalThis : window);
