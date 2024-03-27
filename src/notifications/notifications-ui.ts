/**
 *
 * Part of the MLP r/place Project, under the Apache License v2.0 or ISC.
 * SPDX-License-Identifier: Apache-2.0 OR ISC
 * SPDX-FileCopyrightText: Copyright CONTRIBUTORS.md
 *
 **
 *
 * @file Inject the notifications UI.
 *
 **/

const htmlBlock = `<style>
mlpnotifications {
  display: block;
  color: white;
  width: 400px;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  padding: 10px;
  z-index: 1;
}

mlpnotification {
  display: block;
  border: 1px solid;
  border-radius: 10px;
  padding: 5px;
  margin: 5px;
}

mlpnotification.critical {
  border-color: red;
  background-color: rgb(85 1 1 / 75%);
}

mlpnotification.high {
  border-color: yellow;
  background-color: rgb(85 79 1 / 75%);
}

mlpnotification.low {
  border-color: black;
  background-color: rgba(0,0,0,.75);
}

.notification-text {
  display: block;
}

.notification-closer {
  --button-color-background-active: rgba(0, 0, 0, 0);
  --button-color-background-activated: rgba(0, 0, 0, 0);

  background-color: rgba(0, 0, 0, 0);
  position: relative;
  float: right;
  bottom: 7px;
  color: rgb(155 151 151);
  font-size: medium;
}
</style>
<mlpnotifications>
</mlpnotifications>
`

/* Notification structure.
  <mlpnotification class="critical" id="d474b">
    <button class="notification-closer" type="button">X</button>
    <span class="notification-text">Test notification.</span>
  </mlpnotification>
 */

export class NotificationsUi {
  mlpNotificationsBlock: HTMLElement;

  constructor(mlpNotificationsBlock: HTMLElement) {
    this.mlpNotificationsBlock = mlpNotificationsBlock;
  }

  addNotification(level: NotificationLevel, text: string) {
    const notificationObject = document.createElement("mlpnotification");
    const closeButton = document.createElement("button");
    const notificationText = document.createElement("span");

    notificationObject.classList.add(level);

    closeButton.classList.add("notification-closer");
    closeButton.type = "button";
    closeButton.innerText = "X";
    closeButton.onclick = () => {
        this.mlpNotificationsBlock.removeChild(notificationObject);
    }

    notificationText.classList.add("notification-text");
    notificationText.innerText = text;

    notificationObject.appendChild(closeButton);
    notificationObject.appendChild(notificationText);

    this.mlpNotificationsBlock.appendChild(notificationObject);
  }
}

export enum NotificationLevel {
  Low = "low",
  High = "high",
  Critical = "critical"
}

export function createNotificationsUI(document: Document): NotificationsUi {
  const htmlObject = document.createElement("div");
  htmlObject.innerHTML = htmlBlock;
  document.querySelector("body")?.appendChild(htmlObject);

  const mlpNotificationsBlock = htmlObject.querySelector("mlpnotifications")! as HTMLElement;

  return new NotificationsUi(mlpNotificationsBlock);
}
