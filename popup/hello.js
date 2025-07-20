
function listen() {
    browser.runtime.sendMessage({message: "meow"})
}

document.addEventListener("click", (e) => listen());