import {createNotificationsUI, NotificationLevel, NotificationsUi} from "./notifications-ui";
import {MqttMinimapClient} from "../realtime/mqttMinimapClient";

/**
 *
 * Part of the MLP r/place Project, under the Apache License v2.0 or ISC.
 * SPDX-License-Identifier: Apache-2.0 OR ISC
 * SPDX-FileCopyrightText: Copyright CONTRIBUTORS.md
 *
 **
 *
 * @file Handles WS connection for notifications.
 *
 **/
export class Notifications {
  ui: NotificationsUi | undefined = undefined;
  realtime: MqttMinimapClient;

  constructor(mqtt: MqttMinimapClient) {
    this.realtime = mqtt
  }

  private handleNotification(data: any) {
    if (data.level === undefined) return this.addNotification(NotificationLevel.High, "Received a notification with no notification level.", new Date());
    if (!["low","high","critical"].includes(data.level)) return this.addNotification(NotificationLevel.High, "Received a notification with an unknown notification level.", new Date());
    if (data.text === undefined) return this.addNotification(NotificationLevel.High, "Received a notification with no text.", new Date());

    this.addNotification(data.level as NotificationLevel, data.text, data.date == undefined ? new Date() : new Date(data.date));
  }

  addNotification(level: NotificationLevel, text: string, date: Date) {
    console.log("hello??")
    this.ui?.addNotification(level, text, date);
  }

  async initialize() {
    this.ui = createNotificationsUI(document);

    this.realtime.addEventListener("notifications", (data) => this.handleNotification(data));

    return true;
  }
}