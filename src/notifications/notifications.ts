import {createNotificationsUI, NotificationLevel, NotificationsUi} from "./notifications-ui";
import {waitForDocumentLoad} from "../canvas";
import {waitMs} from "../utils";
import {MqttMinimapClient} from "../mqttMinimapClient";

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
  mqtt: MqttMinimapClient;

  constructor(mqtt: MqttMinimapClient) {
    this.mqtt = mqtt
  }

  private handleNotification(data: any) {
    if (data.level === undefined) return this.addNotification(NotificationLevel.High, "Received a notification with no notification level.");
    if (!["low","high","critical"].includes(data.level)) return this.addNotification(NotificationLevel.High, "Received a notification with an unknown notification level.");
    if (data.text === undefined) return this.addNotification(NotificationLevel.High, "Received a notification with no text.");

    this.addNotification(data.level as NotificationLevel, data.text);
  }

  addNotification(level: NotificationLevel, text: string) {
    this.ui?.addNotification(level, text);
  }

  async initialize() {
    this.ui = createNotificationsUI(document);

    this.mqtt.subscribe("notifications", (data) => this.handleNotification(data));

    return true;
  }
}