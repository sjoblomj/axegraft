// Modal dialogs built on the standard <dialog> element. Each returns a
// promise of the value of the button chosen, or null when it's dismissed.
"use strict";

(function (AG) {
  var h = AG.ui.h;

  function show(root, title, body, buttons, options) {
    options = options || {};
    return new Promise(function (resolve) {
      var dlg = h("dialog", { class: options.className || null, "aria-label": title, dataset: { dialog: options.name || "" } });
      var done = false;
      function close(value) {
        if (done) return;
        done = true;
        if (dlg.open && dlg.close) dlg.close();
        if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
        resolve(value);
      }
      dlg.appendChild(h("div", { class: "title", text: title }));
      dlg.appendChild(h("div", { class: "body" }, body));
      dlg.appendChild(
        h(
          "div",
          { class: "buttons" },
          buttons.map(function (b) {
            return h("button", { type: "button", dataset: { value: b.value }, onclick: function () {
              close(b.value);
            } }, b.label);
          })
        )
      );
      dlg.addEventListener("cancel", function (e) {
        e.preventDefault();
        close(null);
      });
      root.appendChild(dlg);
      dlg.close_ = close;
      if (dlg.showModal) {
        try {
          dlg.showModal();
        } catch (e) {
          dlg.setAttribute("open", "");
        }
      } else dlg.setAttribute("open", "");
      var first = dlg.querySelector("[data-autofocus]") || dlg.querySelector(".buttons button");
      if (first) first.focus();
      if (options.onOpen) options.onOpen(dlg, close);
    });
  }

  function confirm(root, title, message, yes, no, name) {
    return show(root, title, [h("p", { text: message })], [{ label: yes, value: "yes" }, { label: no || "Cancel", value: "no" }], { name: name }).then(function (v) {
      return v === "yes";
    });
  }

  function alert(root, title, body, name) {
    return show(root, title, body, [{ label: "OK", value: "ok" }], { name: name });
  }

  AG.ui.dialogs = { show: show, confirm: confirm, alert: alert };
})(AxeGraft);
