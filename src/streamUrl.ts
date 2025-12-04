// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

window.addEventListener("message", (event) => {
  const URL_INPUT = document.getElementById("url") as HTMLInputElement;
  const EXIT_BUTTON = document.getElementById("exit") as HTMLInputElement;
  const CONFIRM_BUTTON = document.getElementById("confirm") as HTMLInputElement;

  if (event.data === "port") {
    let messagePort = event.ports[0];
    messagePort.onmessage = (event) => {
      // Update button focus
      if (typeof event.data === "object" && "isFocused" in event.data) {
        Array.from(document.getElementsByTagName("button")).forEach((button) => {
          if (event.data.isFocused) {
            button.classList.remove("blurred");
          } else {
            button.classList.add("blurred");
          }
        });
        return;
      }

      // Normal message - initial URL value (could be from clipboard)
      let initialUrl: string = event.data || "";

      // Update values
      URL_INPUT.value = initialUrl;
      URL_INPUT.select();

      // Validation function
      function isValidUrl(url: string): boolean {
        if (!url) return false;
        try {
          const parsed = new URL(url);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      }

      // Close function
      function confirm() {
        let value = URL_INPUT.value.trim();
        if (isValidUrl(value)) {
          messagePort.postMessage(value);
        } else {
          // Invalid URL - flash the input red briefly
          URL_INPUT.style.borderColor = "#ff4444";
          setTimeout(() => {
            URL_INPUT.style.borderColor = "";
          }, 500);
        }
      }

      // Set up exit triggers
      EXIT_BUTTON.addEventListener("click", () => {
        messagePort.postMessage(null); // null means cancelled
      });
      CONFIRM_BUTTON.addEventListener("click", confirm);
      window.addEventListener("keydown", (event) => {
        if (event.code === "Enter") confirm();
        if (event.code === "Escape") messagePort.postMessage(null);
      });
    };
  }
});
