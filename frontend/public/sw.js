// Root-scoped service worker entrypoint. The implementation stays alongside
// the existing notification worker while this file grants it scope '/'.
importScripts('/static/js/sw-notifications.js');
