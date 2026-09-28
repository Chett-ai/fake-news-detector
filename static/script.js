const newsText = document.getElementById("newsText");
const checkBtn = document.getElementById("checkBtn");
const clearBtn = document.getElementById("clearBtn");

const charCount = document.getElementById("charCount");

const loading = document.getElementById("loading");
const loadingMessage = document.getElementById("loadingMessage");

const result = document.getElementById("result");

const prediction = document.getElementById("prediction");
const confidenceText = document.getElementById("confidenceText");
const confidenceFill = document.getElementById("confidenceFill");

const resultIcon = document.getElementById("resultIcon");

const btnText = document.getElementById("btnText");


/* =========================
   CHARACTER COUNTER
========================= */

newsText.addEventListener("input", () => {

    const length = newsText.value.length;

    charCount.textContent =
        `${length.toLocaleString()} characters`;

});


/* =========================
   ANALYZE NEWS
========================= */

checkBtn.addEventListener("click", async () => {

    const text = newsText.value.trim();

    if (!text) {

        newsText.focus();

        newsText.style.border =
            "1px solid #ff5574";

        setTimeout(() => {

            newsText.style.border = "";

        }, 1000);

        return;
    }


    /* Hide previous result */

    result.classList.add("hidden");


    /* Show loading */

    loading.classList.remove("hidden");

    checkBtn.disabled = true;

    btnText.textContent = "Analyzing...";


    /* Animated loading messages */

    const messages = [
        "Extracting linguistic patterns",
        "Analyzing word frequencies",
        "Running TF-IDF transformation",
        "Running machine learning model",
        "Generating prediction"
    ];

    let messageIndex = 0;

    const messageTimer = setInterval(() => {

        loadingMessage.textContent =
            messages[messageIndex];

        messageIndex =
            (messageIndex + 1) % messages.length;

    }, 700);


    try {

        const response = await fetch("/predict", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                text: text
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Prediction failed"
            );

        }


        /* Small delay makes animation feel natural */

        await new Promise(resolve =>
            setTimeout(resolve, 500)
        );


        showResult(
            data.prediction,
            data.confidence
        );


    } catch (error) {

        alert(
            "Something went wrong: " +
            error.message
        );

    } finally {

        clearInterval(messageTimer);

        loading.classList.add("hidden");

        checkBtn.disabled = false;

        btnText.textContent = "Analyze News";

    }

});


/* =========================
   SHOW RESULT
========================= */

function showResult(label, confidence) {

    result.classList.remove("hidden");


    const normalizedLabel =
        String(label).toUpperCase();


    prediction.textContent =
        normalizedLabel;


    /* REAL */

    if (normalizedLabel === "REAL") {

        resultIcon.textContent = "✓";

        resultIcon.style.color =
            "#3df2a3";

        resultIcon.style.background =
            "rgba(61,242,163,0.1)";

        resultIcon.style.borderColor =
            "rgba(61,242,163,0.25)";

        prediction.style.color =
            "#3df2a3";

    }


    /* FAKE */

    else {

        resultIcon.textContent = "×";

        resultIcon.style.color =
            "#ff5574";

        resultIcon.style.background =
            "rgba(255,85,116,0.1)";

        resultIcon.style.borderColor =
            "rgba(255,85,116,0.25)";

        prediction.style.color =
            "#ff5574";

    }


    /* Confidence */

    const value =
        Number(confidence);


    confidenceText.textContent =
        "0%";


    confidenceFill.style.width =
        "0%";


    /* Animate confidence number */

    animateNumber(
        value,
        confidenceText
    );


    /* Animate progress bar */

    setTimeout(() => {

        confidenceFill.style.width =
            `${Math.min(value, 100)}%`;

    }, 100);


    /* Smooth scroll */

    setTimeout(() => {

        result.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    }, 150);

}


/* =========================
   NUMBER ANIMATION
========================= */

function animateNumber(target, element) {

    const duration = 1000;

    const start = performance.now();


    function update(currentTime) {

        const elapsed =
            currentTime - start;

        const progress =
            Math.min(elapsed / duration, 1);


        const eased =
            1 - Math.pow(1 - progress, 3);


        const current =
            target * eased;


        element.textContent =
            `${current.toFixed(2)}%`;


        if (progress < 1) {

            requestAnimationFrame(update);

        }

    }


    requestAnimationFrame(update);

}


/* =========================
   CLEAR
========================= */

clearBtn.addEventListener("click", () => {

    newsText.value = "";

    charCount.textContent =
        "0 characters";

    result.classList.add("hidden");

    loading.classList.add("hidden");

    confidenceFill.style.width =
        "0%";

    confidenceText.textContent =
        "0%";

    newsText.focus();

});