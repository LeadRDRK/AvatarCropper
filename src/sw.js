var VERSION = "v2.0.3";

self.addEventListener("activate", function(e) {
    e.waitUntil(clearCaches());
});

self.addEventListener("fetch", function(e) {
    e.respondWith(fetchAndCache(e.request));
});

async function clearCaches() {
    var keys = await caches.keys();
    for (let key of keys) {
        if (key != VERSION)
            await caches.delete(key);
    }
}

async function fetchAndCache(req) {
    var url = new URL(req.url);
    if (url.origin != self.location.origin)
        return await fetch(req);

    var cache = await caches.open(VERSION);
    var match = await cache.match(req);
    if (match) return match;
    
    var res = await fetch(req);
    if (res.ok && res.status != 206) await cache.put(req, res.clone());
    return res;
}