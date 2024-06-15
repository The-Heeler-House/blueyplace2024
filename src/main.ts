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
import {MqttWSClient} from "./realtime/mqttWSClient";
import {MqttMinimapClient} from "./realtime/mqttMinimapClient";
import {waitForDocumentLoad} from "./canvas";
import { v4 as uuidv4 } from "uuid";
import {TemplateController} from "./template/template";

const autoPickAfterPlaceTimeout = 3000;

(async function () {
  if (window.location.pathname.startsWith("/embed")) {
    // Canvas mode. Loads the minimap/overlay.

    if (localStorage.getItem("minimap-id") === null) {
      localStorage.setItem("minimap-id", uuidv4());
    }

    const faction = "bluey_allies";

    const analytics = new Analytics(new URL('https://api.place.heeler.house/'));
    const analyticsLogger = new AnalyticsLogger(analytics);

    const mqttClient = new MqttMinimapClient();

    const notifications = new Notifications(mqttClient);

    const templateController = new TemplateController(mqttClient, notifications);

    const minimap = new Minimap(analyticsLogger, templateController);

    const blobServer = new BlobServer("https://cdn.place.heeler.house/");

    await waitForDocumentLoad();
    await waitMs(1000);

    if (!await minimap.initialize()) {
      // Minimap fell back. Initiate template controller and mqtt only.
      if (!await templateController.initiate())
        return;
      if (!mqttClient.initiate(faction))
        return;
      return;
    }

    if (!await notifications.initialize())
      return;

    if (!await templateController.initiate())
      return;

    if (!mqttClient.initiate(faction))
      return;

    // Analytics
    // TODO: Fix analytics
    minimap.rPlace!.embed._events._getEventTarget().addEventListener("confirm-pixel", () => {
      const now = Date.now();
      const reddit = now + minimap.rPlace!.embed.nextTileAvailableIn * 1000;
      const safe = reddit + autoPickAfterPlaceTimeout;
      analytics.placedPixel('manual-browser', faction, minimap.rPlace!.position.pos, minimap.rPlace!.embed.selectedColor, now, {
        reddit: reddit,
        safe: safe
      });
    });
    minimap.comparer!.addEventListener("computed", () => {
      if (Math.random() < 0.01) {
        analytics.statusUpdate(
          faction,
          minimap.comparer!.countOfAllPixels,
          minimap.comparer!.countOfWrongPixels
        );
      }
    });
  } else {
    // Data mode. Connects to WebSockets and forwards them to the Canvas instance.
    const mqttClient = new MqttWSClient("wss://realtime.place.heeler.house");
    await mqttClient.initiate();
  }
})();
