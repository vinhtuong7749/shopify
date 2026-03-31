const classes = {
  cartReminder: "cart-reminder",
  closeButton: "cart-reminder__close-button",
  content: "cart-reminder__content",
  text: "cart-reminder__text",
  outline: "focus-visible-outline"
};
const CartReminder = (config) => {
  const setCookie = window.themeCore.utils.setCookie;
  const getCookie = window.themeCore.utils.getCookie;
  const deleteCookie = window.themeCore.utils.deleteCookie;
  const on = window.themeCore.utils.on;
  const cartIcon = window.themeCore.utils.icons.cart;
  const closeIcon = window.themeCore.utils.icons.close;
  const body = document.querySelector("body");
  let cartReminder = null;
  let timeout = null;
  let closeTimeout;
  let cookieTimeMinutes = config.cookieTime;
  let cookieTime = cookieTimeMinutes * 60 * 1e3;
  if (config.displayFrequency === "one_time") {
    closeTimeout = 24 * 60 * 60 * 1e3;
  } else {
    closeTimeout = cookieTime;
  }
  let cookieExpires = (/* @__PURE__ */ new Date()).setTime((/* @__PURE__ */ new Date()).getTime() + cookieTime);
  let closeCookieExpires = (/* @__PURE__ */ new Date()).setTime((/* @__PURE__ */ new Date()).getTime() + closeTimeout);
  const strings = {
    CART_TYPE_DRAWER: "drawer"
  };
  function init() {
    checkCart();
    setEventListeners();
  }
  function checkCart() {
    window.themeCore.CartApi.makeRequest(window.themeCore.CartApi.actions.GET_CART, { noOpen: true });
  }
  function setTimerTimeout() {
    if (getCookie("cart_reminder")) {
      timeout = +getCookie("cart_reminder") - (/* @__PURE__ */ new Date()).getTime();
    } else {
      timeout = null;
    }
  }
  function setEventListeners() {
    window.themeCore.EventBus.listen("cart:updated", (event) => {
      if (!getCookie("cart_reminder_closed")) {
        onCartUpdated(event);
      }
    });
    window.themeCore.EventBus.listen("cart-reminder:added", () => {
      cartReminder = document.querySelector(`.${classes.cartReminder}`);
      if (!cartReminder) {
        return;
      }
      let cartReminderCloseButton = cartReminder.querySelector(`.${classes.closeButton}`);
      let cartReminderButton = cartReminder.querySelector(`.${classes.content}`);
      on("click", cartReminderButton, () => {
        window.themeCore.EventBus.emit("cart:drawer:open");
        setCookieOnClose();
        removePopupFromDOM();
      });
      on("click", cartReminderCloseButton, () => {
        setCookieOnClose();
        removePopupFromDOM();
      });
    });
  }
  function setCookieTime() {
    cookieExpires = (/* @__PURE__ */ new Date()).setTime((/* @__PURE__ */ new Date()).getTime() + cookieTime);
    setCookie("cart_reminder", cookieExpires, {
      expires: new Date(cookieExpires)
    });
  }
  function setCookieOnClose() {
    closeCookieExpires = (/* @__PURE__ */ new Date()).setTime((/* @__PURE__ */ new Date()).getTime() + closeTimeout);
    setCookie("cart_reminder_closed", "1", {
      expires: new Date(closeCookieExpires)
    });
  }
  function onCartUpdated(event) {
    if (event.item_count > 0) {
      if (!getCookie("cart_reminder")) {
        setCookieTime();
      }
      setTimerTimeout();
      if (timeout) {
        setTimeout(() => {
          insertPopupToDOM();
        }, timeout);
      }
    } else {
      deleteCookie("cart_reminder");
      removePopupFromDOM();
    }
  }
  function DOMCartReminder() {
    const DOMContent = config.cartType === strings.CART_TYPE_DRAWER && !document.body.classList.contains("template-cart") ? DOMContentWithCartDrawer() : DOMContentWithCartPage();
    return `
			<div class="${classes.cartReminder} color-${config.enableColorSchemeInheritance ? config.colorSchemeGlobal : config.colorSchemeLocal}">
				${DOMContent}

				<button
					class="${classes.closeButton} ${classes.outline}"
					aria-label="${config.closeButtonA11y}"
					type="button"
					data-cart-reminder-close
				>
					${closeIcon}
				</button>
			</div>
		`;
  }
  function DOMContentWithCartDrawer() {
    return `
			<button
				type="button"
				class="${classes.content} ${classes.outline}"
				data-target="CartDrawer"
				data-js-toggle="CartDrawer"
				aria-expanded="false"
				aria-controls="CartDrawer"
				aria-label="${config.cartButtonA11y}"
			>
				${cartIcon}

				<span class="${classes.text}">
					${config.text}
				</span>
			</button>
		`;
  }
  function DOMContentWithCartPage() {
    return `
			<a
				href="${config.cartRoute}"
				class="${classes.content} ${classes.outline}"
				aria-label="${config.cartLinkA11y}"
			>
				${cartIcon}

				<span class="${classes.text}">
					${config.text}
				</span>
			</a>
		`;
  }
  function insertPopupToDOM() {
    if (cartReminder) {
      removePopupFromDOM();
    }
    body.insertAdjacentHTML("afterbegin", DOMCartReminder());
    window.themeCore.EventBus.emit("cart-reminder:added");
  }
  function removePopupFromDOM() {
    if (cartReminder) {
      cartReminder.remove();
    }
  }
  return Object.freeze({
    init
  });
};
const action = () => {
  if (!window.themeCore || !window.themeCore.CartReminder || window.themeCore.CartReminder.initiated) {
    return;
  }
  CartReminder(window.themeCore.CartReminder.config).init();
  window.themeCore.CartReminder.initiated = true;
};
if (window.themeCore && window.themeCore.loaded) {
  action();
} else {
  document.addEventListener("theme:all:loaded", action, { once: true });
}
