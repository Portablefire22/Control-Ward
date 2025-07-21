const clientId = "kgl6x6l9jun0frygndc06y0vqrofy6"; // These are public and could be taken via a debugger anyway
const redirectUri = browser.identity.getRedirectURL();

const extensionName = "Control Ward";

const twitch = {
    isActive: false,
    token: "",
    streamers: ["ratirl", "fence", "r0se"],
};

const monitoredStreams = {};
const notifications = {};
let live = {};

function log(string) {
    console.log(`[${extensionName}] ${string}`);
}

async function getToken() {
    let res = await loadTwitch();
    if (res && twitch.token.length > 0) return twitch.token; 
    log(`Getting token via Oauth`);
    return await auth();
}

async function loadTwitch() {
    let storageResult = await browser.storage.sync.get("twitch");
    if (storageResult != null && storageResult.twitch) {
        let res = storageResult.twitch;
        if (res != null) { 
            if (res.token.length > 0) {
                twitch.isActive = true;
                twitch.token = res.token;
                log(`Found token in storage`);
            } 
            twitch.streamers = res.streamers;       
            console.log(res.streamers);
        }
    } 
    return twitch.token;
}

function extractToken(redirect) {
    let auth = redirect.match(/(?<==)(.*?)(?=&)/);
    if (!auth || auth.length < 1) {
        return null;
    }
    return auth[0]
}

function setToken(token) {
    twitch.isActive = true;
    twitch.token = token;
    saveTwitch();
}

async function auth() {
    let val = await browser.identity.launchWebAuthFlow({
        url: "https://id.twitch.tv/oauth2/authorize" +
            `?client_id=${clientId}` +
            "&response_type=token" +
            `&redirect_uri=${redirectUri}`,
            interactive: true
    })
    let params = new URL(val);
    let token = params.hash;
    console.log(token);
    let extracted = extractToken(token);
    setToken(`${extracted}`);
    return extracted;
}

function notify(stream) {
    const thumbnail_url = stream.thumbnail_url.replace("{width}x{height}", "178x100");
    let id = crypto.randomUUID();
    notifications[id] = stream.user_login;
    browser.notifications.create(id, {
        type: "basic",
        title: `${stream.user_name} is Streaming - ${stream.game_name}`,
        iconUrl: thumbnail_url,
        message: `${stream.title}`
    });

    browser.notifications.onClicked.addListener((notificationId) => {
        const streamer = notifications[notificationId];
        if (!streamer) return;
        log(`https://twitch.tv/${streamer}`);
        browser.tabs.create({
            url: `https://twitch.tv/${streamer}`,
        });
        delete notifications[notificationId];
    });

    // Incase of some weird memory consumption, lets just delete the notifications if they haven't been clicked for a minute. 
    setTimeout(() => {
        // I'm going to assume that Javascript just handles this perfectly
        if (!notifications[id]) delete notifications[id];
    }, 60000);
}

function startMonitoring() {
    log("Starting...");
    log(`Monitoring: ${twitch.streamers}`);
    monitoring();
}

async function monitoring() {
    const interval = setInterval(() => {
        if (!twitch.isActive) clearInterval(interval);
        log("Searching for streams");
        searchStreamers(twitch.streamers).then(liveStreams => {
            for (let stream of liveStreams) {
                notify(stream);
            }
        });
    }, 10000);
}

/// Returns null on error or if no streams :)
async function searchStreamers(streamerNames) {
    if (streamerNames.length == 0) {
        return null;
    }
    let uri = "https://api.twitch.tv/helix/streams?";
    for (let streamer of streamerNames) {
        uri += `user_login=${streamer}&`;
    }
    const resp = await fetch(uri, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${twitch.token}`,
            "Client-Id": `${clientId}`
        },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json.data || json.data.length == 0) return null;
    let streams = [];

    live = {};

    // Iterate through all streams we got
    for (let stream of json.data) {
        // We don't want to notify constantly so let's check if we have already notified for this stream
        let streamCheck = monitoredStreams[stream.user_login];
        if (streamCheck && streamCheck == stream.id) {
            continue;
        }
        streams.push(stream);
        live[stream.user_login] = 1; // We just need any filler data here
        monitoredStreams[stream.user_login] = stream.id;
    }
    return streams;
}

async function startup() {
  for (let i = 0; i < 2; i++) {
        if (twitch.isActive) {
            log(`${twitch.token}`);
            startMonitoring();
            break;
        }
        await getToken();
    } 
}

function saveTwitch() {
    browser.storage.sync.set({"twitch": twitch});
}

function addStreamer(name) {
    if (name.length == 0) return;  
    twitch.streamers.push(name);
    saveTwitch();
}

function removeStreamer(name) {
    if (name.length == 0) return;  
    twitch.streamers = twitch.streamers.filter((streamer) => streamer != name);
    saveTwitch();
}

function getStreamers() {
    const streamers = [];
    for (const streamer of twitch.streamers) {
        streamers.push({
            name: streamer,
            isLive: (live[streamer] != null),
        })
    }
    return streamers;
}

browser.runtime.onMessage.addListener(async (message) => {
    console.log(message.message);
    switch (message.message) {
        case "startMonitoring":
            if (twitch.isActive) {
                log("Already monitoring");
                return;
            }
            await startup();
            return Promise.resolve();
            break;
        case "getTrackedStreamers":
            return Promise.resolve({streamers: getStreamers()});
        case "addTrackedStreamer":
            addStreamer(message.name);
            return Promise.resolve();
        case "removeTrackedStreamer":
            removeStreamer(message.name);
            return Promise.resolve();
        default:
            log(`Unknown command '${message.message}'`);
    }
});



// Try to monitor, if twitch token isn't set then try to get 
// authorisation 
browser.runtime.onStartup.addListener(async () => {
    await startup();
});

browser.runtime.on