/**
 *
 * Part of the MLP r/place Project, under the Apache License v2.0 or ISC.
 * SPDX-License-Identifier: Apache-2.0 OR ISC
 * SPDX-FileCopyrightText: Copyright CONTRIBUTORS.md
 *
 **
 *
 * @file Keep track of various statistics. Mostly used to know how many pixels per second we have.
 *
 **/

function formatLog(...args) {
  const formattedArgs = args.map((arg) => {
    if (Array.isArray(arg)) {
      return JSON.stringify(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      return JSON.stringify(arg);
    } else {
      return arg;
    }
  });

  return formattedArgs.join(" ");
}

export class Analytics {
  #endpoint: URL;
  #uuid: string | null;

  constructor(endpoint: URL) {
    this.#endpoint = endpoint;
    this.#uuid = localStorage.getItem("minimap-id") || null;
  }

  private send(path, data) {
    console.log(this.#endpoint.toString() + path);

    GM.xmlHttpRequest({
      url: this.#endpoint.toString() + path,
      method: 'POST',
      data: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      },
      onload: (res) => {
        console.log(res);
      }
    });
  }

  async placedPixel(template: string, pos: {x: number, y: number}, color: number, timestamp: Date,
                    nextPixelPlace: Date) {
    const data = {
      user_id: this.#uuid,
      x: pos.x,
      y: pos.y,
      color: color,
      timestamp: timestamp.toISOString(),
      next_pixel: nextPixelPlace.toISOString()
    };

    this.send(`${template}/pixel`, data);
  }

  async logError(...args) {
    const data = {
      id: this.#uuid,
      event: 'error',
      timestamp: Date.now() / 1000,
      message: formatLog(...args)
    };

    this.send(`error`, data);
  }

  async statusUpdate(template: string, correctPixels: number, totalPixels: number) {
    const data = {
      id: this.#uuid,
      event: 'status',
      timestamp: Date.now() / 1000,
      template: template,
      correctPixels: correctPixels,
      totalPixels: totalPixels
    };

    this.send(null, data);
  }
}
