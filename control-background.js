const clientId = "kgl6x6l9jun0frygndc06y0vqrofy6";
const redirectUri = browser.identity.getRedirectURL();

const twitch = {
    isActive: false,
    token: "",
}

export function getToken() {
    browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL(""),
                title: "Hello",
                message: "meow"
            });
   /*
    console.log(auth);*/
}

function auth() {
    let auth = browser.identity.launchWebAuthFlow({
        url: "https://id.twitch.tv/oauth2/authorize" +
            `?client_id=${clientId}` +
            "&response_type=token" +
            `&redirect_uri=${redirectUri}`,
            interactive: true
    }).then(val => {
         browser.notifications.create({
                type: "basic",
                iconUrl: browser.runtime.getURL(""),
                title: "Hello",
                message: `${val}`
            });
    });   
}

browser.runtime.onMessage.addListener(() => {
    auth();
});