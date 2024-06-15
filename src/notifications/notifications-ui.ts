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
  color: black;
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
  border: 2px solid;
  border-radius: 10px;
  padding: 5px;
  margin: 5px;
  border-color: #bbbbbb;
  background-color: rgb(255 255 255);
}

mlpnotification.critical {
  border-left-color: red;
  border-left-width: 10px;
}

mlpnotification.high {
  border-left-color: yellow;
  border-left-width: 10px;
}

mlpnotification.low {
  border-left-width: 10px;
}

.notification-text {
  display: block;
}

.notification-date {
    color: #959595 !important;
    font-size: smaller;
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

  addNotification(level: NotificationLevel, text: string, date: Date) {
    const notificationObject = document.createElement("mlpnotification");
    const closeButton = document.createElement("button");
    const notificationText = document.createElement("span");
    const notificationDate = document.createElement("span");

    notificationObject.classList.add(level);
    notificationObject.setAttribute("date", date.toISOString());

    closeButton.classList.add("notification-closer");
    closeButton.type = "button";
    closeButton.innerText = "X";
    closeButton.onclick = () => {
        this.mlpNotificationsBlock.removeChild(notificationObject);
    }

    notificationText.classList.add("notification-text");
    notificationText.innerText = text;

    notificationDate.classList.add("notification-date");

    notificationObject.appendChild(closeButton);
    notificationObject.appendChild(notificationText);
    notificationObject.appendChild(notificationDate);

    this.mlpNotificationsBlock.appendChild(notificationObject);
    if (level == NotificationLevel.Critical) {
      // @ts-ignore
      document.getElementById("notification-critical-soundeffect")!.play();
    }
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

  // @ts-ignore
  GM.addElement("audio", {
    src: "https://cdn.place.heeler.house/scripts/notification-critical.mp3",
    id: "notification-critical-soundeffect"
  });

  const mlpNotificationsBlock = htmlObject.querySelector("mlpnotifications")! as HTMLElement;

  setInterval(() => {
    for (let date of document.getElementsByClassName("notification-date")) {
      let creationDate = Date.parse(date.parentElement?.getAttribute("date") as string)
      let now = Date.now();

      let timeSinceCreation = now - creationDate;

      let seconds = Math.floor(timeSinceCreation / 1000);
      let minutes = Math.floor(timeSinceCreation / 1000 / 60);

      if (minutes >= 60) {
        date.innerHTML = new Date(date.parentElement?.getAttribute("date") as string).toString();
      } else {
        if (seconds >= 60) {
          date.innerHTML = `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
        } else {
          date.innerHTML = `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
        }
      }
    }
  },1000);

  return new NotificationsUi(mlpNotificationsBlock);
}
