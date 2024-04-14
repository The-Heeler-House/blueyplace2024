/**
 *
 * Part of the MLP r/place Project, under the Apache License v2.0 or ISC.
 * SPDX-License-Identifier: Apache-2.0 OR ISC
 * SPDX-FileCopyrightText: Copyright CONTRIBUTORS.md
 *
 **
 *
 * @file WebSocket connection using MQTT protocol. This loads on reddit.com.
 *
 **/
import {waitMs} from "./utils";
import {waitForDocumentLoad} from "./canvas";

export class MqttMinimapClient {
  subscriptions: { [key: string]: any } = {};

  constructor() {
    console.log("hello! i am part of the minimap!");

    window.onmessage = (message) => this.processMessage(message);
  }

  private processMessage(message: MessageEvent) {
    if (message.data.action === undefined) return;
    if (message.data.payload === undefined) return;

    if (message.data.action === "event") {
      if (message.data.payload.topic === undefined) return;
      if (message.data.payload.data === undefined) return;

      this.subscriptions[message.data.payload.topic](message.data.payload.data);
    }
  }

  subscribe(topic: string, callback: any) {
    this.subscriptions[topic] = callback;

    window.parent.postMessage({
      action: "subscribe",
      payload: { name: topic }
    });
  }

  unsubscribe(topic: string) {
    delete this.subscriptions[topic];

    window.parent.postMessage({
      action: "unsubscribe",
      payload: { name: topic }
    });
  }

  close() {
    this.subscriptions = {};

    window.parent.postMessage({
      action: "close",
      payload: {}
    });
  }

  async initiate() {
    console.log("awaken!");
    window.parent.postMessage({
      action: "open",
      payload: { id: localStorage.getItem("ponyplace-id") }
    });

    return true;
  }
}