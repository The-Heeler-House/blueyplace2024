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

//import * as mqtt from "mqtt";
import { MqttClient } from "mqtt";
import {waitForDocumentLoad} from "../canvas";
import {waitMs} from "../utils";

export class MqttWSClient {
  private url: string;
  private client: MqttClient | null = null;

  constructor(url: string) {
    console.debug("MqttWSClient constructed outside r/place embed");
    this.url = url;
  }

  async initiate() {
    await waitForDocumentLoad();

    // @ts-ignore
    GM.addElement('script', {
      src: 'https://unpkg.com/mqtt/dist/mqtt.min.js',
      type: 'text/javascript'
    });

    await waitMs(100);

    window.onmessage = (message) => {
      // Message format:
      /*
        {
          action: "actionName",
          payload: {}
        }
       */
      if (message.data.action === undefined) return;
      if (message.data.payload === undefined) return;

      if (message.data.action === "open") {
        if (message.data.payload.id === undefined) return;
        console.debug("Received open event from inside embed, connecting to MQTT broker.");

        // @ts-ignore
        this.client = mqtt.connect(this.url, {
          keepalive: 60,
          reschedulePings: true,
          protocolId: 'MQTT',
          protocolVersion: 4,
          reconnectPeriod: 1000,
          connectTimeout: 30 * 1000,
          clean: true,
          clientId: message.data.payload.id ?? undefined
        });
        
        if (message.data.payload.topic !== undefined)
          this.client?.subscribe(message.data.payload.topic);

        this.client?.on("message", (topic, data, packet) => {
          try {
            message.source.postMessage({
              action: "event",
              payload: {
                topic,
                data: JSON.parse(data.toString()),
                retained: packet.retain ?? false
              }
            });
          } catch (err: any) {
            if (err.name === "SyntaxError") {
              console.warn("Received subscribed event (" + topic + ") of which payload data is not JSON.\n" + data);
            } else {
              console.error(err);
            }
          }
        });
      }

      if (message.data.action === "subscribe") {
        if (message.data.payload.name === undefined) return;
        this.client?.subscribe(message.data.payload.name);
      }

      if (message.data.action === "unsubscribe") {
        if (message.data.payload.name === undefined) return;
        this.client?.unsubscribe(message.data.payload.name);
      }

      if (message.data.action === "close") {
        this.client?.removeAllListeners();
        this.client?.end();
      }
    }

    return true;
  }
}