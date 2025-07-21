
function listen() {
    browser.runtime.sendMessage({message: "meow"})
}

function getTracked() {
    browser.runtime.sendMessage({message: "getTrackedStreamers"}).then((response => {
        const streamerList = document.getElementById("streamerList");
        const streamers = response.streamers;
        if (!streamers) return;
        console.log(streamers);
        streamerList.innerHTML = "";
        for (const streamer of streamers) {
            streamerList.innerHTML += `<li><a href="https://twitch.tv/${streamer}">${streamer}</a><button id=${streamer}>Remove</button></li>`
            document.getElementById(streamer).addEventListener("click", () => {
                browser.runtime.sendMessage({message: "removeTrackedStreamer", name: streamer}).then(() => getTracked());
            })
        }
    }));
}

function addTracked(ev) {
    const inputBox = document.getElementById("streamerName");
    const streamer = inputBox.value;
    browser.runtime.sendMessage({message: "addTrackedStreamer", name: streamer}).then(() => getTracked());
}

window.onload = function () {
    browser.runtime.sendMessage({message: "startMonitoring"}).then(() => getTracked());
}

window.onsubmit = addTracked;