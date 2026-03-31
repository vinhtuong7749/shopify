const selectors = {
  section: ".js-social-gallery",
  link: ".js-social-gallery-link"
};
const SocialGallery = () => {
  let previousFocused = null;
  function init(sectionId) {
    const sections = [...document.querySelectorAll(selectors.section)].filter((section) => !sectionId || section.closest(`#shopify-section-${sectionId}`));
    sections.forEach((section) => {
      section.addEventListener("mousedown", savePreviousFocus);
      section.addEventListener("click", handleLinkInteraction);
    });
  }
  function savePreviousFocus(event) {
    if (event.type === "mousedown") {
      previousFocused = document.activeElement;
    }
  }
  function handleLinkInteraction(event) {
    const link = event.target.closest(selectors.link);
    if (!link)
      return;
    if (event.type === "click" && event.button !== 0 && event.button !== 1)
      return;
    link.focus();
    if (previousFocused && previousFocused !== link) {
      setTimeout(() => {
        previousFocused.focus();
        previousFocused = null;
      }, 0);
    }
  }
  return Object.freeze({
    init
  });
};
const action = () => {
  window.themeCore.SocialGallery = window.themeCore.SocialGallery || SocialGallery();
  window.themeCore.utils.register(window.themeCore.SocialGallery, "social-gallery");
};
if (window.themeCore && window.themeCore.loaded) {
  action();
} else {
  document.addEventListener("theme:all:loaded", action, { once: true });
}
