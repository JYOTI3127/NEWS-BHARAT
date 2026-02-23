console.log("ADMIN JS LOADED");


document.addEventListener("DOMContentLoaded", function () {

    const messages = document.querySelectorAll(".messagelist li");

    messages.forEach(function (message) {

        // Make sure message position relative ho
        message.style.position = "relative";
        message.style.overflow = "hidden";

        // Create progress bar
        const progressBar = document.createElement("div");
        progressBar.style.position = "absolute";
        progressBar.style.bottom = "0";
        progressBar.style.left = "0";
        progressBar.style.height = "4px";
        progressBar.style.backgroundColor = "#ff0000";
        progressBar.style.width = "100%";

        message.appendChild(progressBar);

        // Force reflow (important for animation trigger)
        progressBar.offsetWidth;

        // Animate width
        progressBar.style.transition = "width 3s linear";
        progressBar.style.width = "0%";

        // Fade out after 3 sec
        setTimeout(function () {
            message.style.transition = "opacity 0.5s ease";
            message.style.opacity = "0";
            setTimeout(() => message.remove(), 500);
        }, 3000);
    });

});

