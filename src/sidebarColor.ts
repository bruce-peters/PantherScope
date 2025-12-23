// Copyright (c) 2021-2025 Littleton Robotics
// http://github.com/Mechanical-Advantage
//
// Use of this source code is governed by a BSD
// license that can be found in the LICENSE file
// at the root directory of this project.

const COLOR_PICKER = document.getElementById("colorPicker") as HTMLInputElement;
const USE_DEFAULT_BUTTON = document.getElementById("useDefault") as HTMLButtonElement;
const EXIT_BUTTON = document.getElementById("exit") as HTMLInputElement;
const CONFIRM_BUTTON = document.getElementById("confirm") as HTMLInputElement;

window.addEventListener("message", (event) => {
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

      // Normal message - load current color
      let currentColor: string | null = event.data;
      COLOR_PICKER.value = currentColor ?? "#e9e9e9";

      // Close function
      function close(newColor: string | null) {
        messagePort.postMessage(newColor);
      }

      // Set up buttons
      USE_DEFAULT_BUTTON.addEventListener("click", () => {
        close(null);
      });

      EXIT_BUTTON.addEventListener("click", () => {
        messagePort.postMessage("cancel");
      });

      CONFIRM_BUTTON.addEventListener("click", () => {
        close(COLOR_PICKER.value);
      });
    };
  }
});
