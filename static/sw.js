if ('serviceWorker' in navigator) {
    addEventListener('load', function () {
        navigator.serviceWorker.register('./path/to/service-worker.js');
    });
}