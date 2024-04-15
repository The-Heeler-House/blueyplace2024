/**
 *
 * Part of the MLP r/place Project, under the Apache License v2.0 or ISC.
 * SPDX-License-Identifier: Apache-2.0 OR ISC
 * SPDX-FileCopyrightText: Copyright CONTRIBUTORS.md
 *
 **
 *
 * @file All of the minimap. This needs to be split up.
 *
 **/

import {BlobServer, waitMs} from './utils';
import {Analytics} from './analytics';
import {AnalyticsLogger} from './logger';
import {Minimap} from './minimap/minimap';
import {Notifications} from "./notifications/notifications";
import {MqttWSClient} from "./mqttWSClient";
import {MqttMinimapClient} from "./mqttMinimapClient";
import {waitForDocumentLoad} from "./canvas";
import { v4 as uuidv4 } from "uuid";

const autoPickAfterPlaceTimeout = 3000;

(async function () {
  if (window.location.pathname.startsWith("/embed")) {
    // Canvas mode. Loads the minimap/overlay.

    if (localStorage.getItem("ponyplace-id") === null) {
      localStorage.setItem("ponyplace-id", uuidv4());
    }

    const analytics = new Analytics(new URL('https://api.minimap.brony.place/analytics/'));
    const analyticsLogger = new AnalyticsLogger(analytics);

    const mqttClient = new MqttMinimapClient();

    const minimap = new Minimap(analyticsLogger);

    const notifications = new Notifications(mqttClient);

    const blobServer = new BlobServer("https://cdn.minimap.brony.place");
    //minimap.templates.add("mlp_alliance", blobServer.getTemplate("mlp_alliance", {autoPick: true, mask: true}));
    //minimap.templates.add("mlp_world", blobServer.getTemplate("mlp_world", {autoPick: true, mask: true}));
    minimap.templates.add("mlp", blobServer.getTemplate("mlp", {autoPick: true, mask: true}));

    await waitForDocumentLoad();
    await waitMs(1000);

    if (!await minimap.initialize())
      return;

    if (!await notifications.initialize())
      return;

    if (!mqttClient.initiate("test"))
      return;

    minimap.templates.startUpdateLoop();

    // Analytics
    minimap.rPlace!.embed._events._getEventTarget().addEventListener("confirm-pixel", () => {
      const now = Date.now();
      const reddit = now + minimap.rPlace!.embed.nextTileAvailableIn * 1000;
      const safe = reddit + autoPickAfterPlaceTimeout;
      analytics.placedPixel('manual-browser', minimap.templates.currentTemplate.name, minimap.rPlace!.position.pos, minimap.rPlace!.embed.selectedColor, now, {
        reddit: reddit,
        safe: safe
      });
    });
    minimap.comparer!.addEventListener("computed", () => {
      if (Math.random() < 0.01) {
        analytics.statusUpdate(
          minimap.templates.currentTemplate.name,
          minimap.comparer!.countOfAllPixels,
          minimap.comparer!.countOfWrongPixels
        );
      }
    });
  } else {
    // Data mode. Connects to WebSockets and forwards them to the Canvas instance.
    const mqttClient = new MqttWSClient("wss://realtime.minimap.brony.place");
    await mqttClient.initiate();
  }
})();
