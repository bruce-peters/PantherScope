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

let messagePort: MessagePort | null = null;

window.addEventListener("message", (event) => {
  if (event.data === "port") {
    messagePort = event.ports[0];
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
      COLOR_PICKER.value = currentColor ?? "#af2437";
    };
    messagePort.start();
  }
});

// Set up button event listeners
USE_DEFAULT_BUTTON.addEventListener("click", () => {
  if (messagePort) {
    messagePort.postMessage(null);
  }
});

EXIT_BUTTON.addEventListener("click", () => {
  if (messagePort) {
    messagePort.postMessage("cancel");
  }
});

CONFIRM_BUTTON.addEventListener("click", () => {
  if (messagePort) {
    messagePort.postMessage(COLOR_PICKER.value);
  }
});
