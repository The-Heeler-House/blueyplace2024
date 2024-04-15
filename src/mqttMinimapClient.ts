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

export class MqttMinimapClient {
  faction: string = "";
  listeners: { [key: string]: any } = {};

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
      if (message.data.payload.retained === undefined) return;
      let topic = message.data.payload.topic.split("/");
      if (topic[0] !== "templates") return;
      if (topic[1] !== this.faction) return console.warn(`Received subscribed message from faction ${topic[1]} but current faction is ${this.faction}!`);

      if (!this.listeners.hasOwnProperty(topic[2])) return;

      this.listeners[topic[2]](message.data.payload.data, message.data.payload.retained);
    }
  }

  setFaction(faction: string) {
    // Unsubscribes from current faction and resubscribes to new faction.
    this.unsubscribe(`templates/${this.faction}/#`);
    console.log(`PonyPlace switching from ${this.faction} to ${faction}`);
    this.subscribe(`templates/${faction}/#`);
    this.faction = faction;
  }

  /**
   * Creates a listener for a specific topic which persists between faction changes.
   * @param topic
   * @param callback
   */
  on(topic: string, callback: any) {
    this.listeners[topic] = callback;
  }

  /**
   * Removes a listener for a specific topic.
   * @param topic
   */
  off(topic: string) {
    delete this.listeners[topic];
  }

  private subscribe(topic: string) {
    window.parent.postMessage({
      action: "subscribe",
      payload: { name: topic }
    });
  }

  private unsubscribe(topic: string) {
    window.parent.postMessage({
      action: "unsubscribe",
      payload: { name: topic }
    });
  }

  /**
   * Closes the MQTT connection and destroys all listeners.
   */
  close() {
    this.listeners = {};

    window.parent.postMessage({
      action: "close",
      payload: {}
    });
  }

  /**
   * Initiates a connection with the MQTT broker and subscribes to a specific faction.
   * @param faction
   */
  initiate(faction: string) {
    console.log("awaken!");
    window.parent.postMessage({
      action: "open",
      payload: { id: localStorage.getItem("ponyplace-id"), topic: `templates/${faction}/#` }
    });

    this.faction = faction;

    return true;
  }
}