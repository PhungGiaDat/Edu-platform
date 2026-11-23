/**
 * ARAddCardScanner
 *
 * A pure DOM scanner that reuses the persistent viewer's existing
 * `<video>` element to locate a follow-up flashcard's QR code. It must
 * never call `navigator.mediaDevices.getUserMedia` — the viewer already
 * owns the camera.
 *
 * Loaded into both `ar-scanner.html` and `ar-viewer.html` before
 * `ar-viewer.js` so the viewer bootstrap can wire the scanner to
 * `BEGIN_ADD_CARD_SCAN` / `CANCEL_ADD_CARD_SCAN` messages.
 *
 * Usage:
 *
 *     const scanner = ARAddCardScanner.create({
 *       getVideo: () => document.querySelector('video'),
 *       decode:   globalThis.jsQR,
 *       emit:     (event) => window.parent.postMessage({ ...event }, '*'),
 *     });
 *     scanner.start({ sessionId: 'abc', excludedQrIds: ['ele123'], timeoutMs: 15000 });
 *
 * The scanner emits exactly one of the following terminal events per
 * scan attempt:
 *
 *   - { type: 'QR_DETECTED',          qrId, sessionId }
 *   - { type: 'ADD_CARD_SCAN_TIMEOUT', sessionId }
 *
 * `cancel(reason)` stops the scanner without emitting further events.
 */
(function (root) {
  function create(options) {
    var getVideo = options.getVideo;
    var decode = options.decode;
    var emit = options.emit;
    var intervalMs = typeof options.intervalMs === 'number' ? options.intervalMs : 150;

    var canvas = (root.document && root.document.createElement('canvas')) || null;
    var context = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;
    var timer = null;
    var deadlineTimer = null;
    var request = null;

    function clearTimers() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (deadlineTimer) {
        clearTimeout(deadlineTimer);
        deadlineTimer = null;
      }
    }

    function tick() {
      if (!request) {
        return;
      }
      var video = typeof getVideo === 'function' ? getVideo() : null;
      if (
        video &&
        typeof video.readyState === 'number' &&
        video.readyState >= (video.HAVE_CURRENT_DATA || 2) &&
        typeof video.videoWidth === 'number' &&
        video.videoWidth > 0 &&
        typeof video.videoHeight === 'number' &&
        video.videoHeight > 0 &&
        canvas &&
        context
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var result = null;
        try {
          result = decode(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
        } catch (error) {
          result = null;
        }
        var data = result && typeof result.data === 'string' ? result.data : null;
        if (data && request.excludedQrIds.indexOf(data) === -1) {
          var acceptedSession = request.sessionId;
          clearTimers();
          request = null;
          emit({ type: 'QR_DETECTED', qrId: data, sessionId: acceptedSession });
          return;
        }
      }
      if (request) {
        timer = setTimeout(tick, intervalMs);
      }
    }

    function start(nextRequest) {
      clearTimers();
      request = {
        sessionId: nextRequest.sessionId,
        excludedQrIds: Array.isArray(nextRequest.excludedQrIds)
          ? nextRequest.excludedQrIds.slice()
          : [],
        timeoutMs:
          typeof nextRequest.timeoutMs === 'number' && nextRequest.timeoutMs > 0
            ? nextRequest.timeoutMs
            : 15000,
      };
      emit({ type: 'ADD_CARD_SCAN_STARTED', sessionId: request.sessionId });
      var currentRequest = request;
      deadlineTimer = setTimeout(function () {
        if (!currentRequest || request !== currentRequest) {
          return;
        }
        var expiredSession = currentRequest.sessionId;
        clearTimers();
        request = null;
        emit({ type: 'ADD_CARD_SCAN_TIMEOUT', sessionId: expiredSession });
      }, currentRequest.timeoutMs);
      tick();
    }

    function cancel() {
      clearTimers();
      request = null;
    }

    function isScanning() {
      return request !== null;
    }

    return { start: start, cancel: cancel, isScanning: isScanning };
  }

  root.ARAddCardScanner = { create: create };
})(typeof globalThis !== 'undefined' ? globalThis : window);
