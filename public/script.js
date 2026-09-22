const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".navList a:not(.navOnlyBtn)");

function highlightNavLink() {

    let currentSection = "";

    sections.forEach((section) => {

        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;

        if (window.scrollY >= sectionTop - 150) {
            currentSection = section.getAttribute("id");
        }

    });

    navLinks.forEach((link) => {

        link.classList.remove("active");

        if (link.getAttribute("href") === `#${currentSection}`) {
            link.classList.add("active");
        }

    });
}

window.addEventListener("scroll", highlightNavLink);

highlightNavLink();
// Service details display
const serviceItems = document.querySelectorAll(".service-item");

serviceItems.forEach((item) => {
    const header = item.querySelector(".service-header");
    const content = item.querySelector(".service-content");
    const icon = item.querySelector(".icon");

    header.addEventListener("click", () => {
        content.classList.toggle("active");

        if (content.classList.contains("active")) {
            icon.textContent = "−";
        } else {
            icon.textContent = "+";
        }
    });
});


// FAQ answers display
const faqItems = document.querySelectorAll(".faqs-item");

faqItems.forEach((item) => {
    const header = item.querySelector(".faqs-header");
    const answer = item.querySelector(".faqs-answers");
    const icon = item.querySelector(".icon");

    header.addEventListener("click", () => {
        answer.classList.toggle("active");

        if (answer.classList.contains("active")) {
            icon.textContent = "−";
        } else {
            icon.textContent = "+";
        }
    });
});