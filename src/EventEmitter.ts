/**
 *
 * Part of the MLP r/place Project, under the Apache License v2.0 or ISC.
 * SPDX-License-Identifier: Apache-2.0 OR ISC
 * SPDX-FileCopyrightText: Copyright CONTRIBUTORS.md
 *
 **
 *
 * @file Implementation of Node.js EventEmitter.
 *
 **/

export default class EventEmitter {
  private listeners: { [key: string]: any[] } = {};

  constructor() {}

  emit(event: string, ...args: any[]) {
    if (this.listeners[event] === undefined)
      this.listeners[event] = [];
    this.listeners[event].forEach(callback => {
      callback(...args);
    });
  }

  addEventListener(event: string, callback: any) {
    if (this.listeners[event] === undefined)
      this.listeners[event] = [];

    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: any) {
    if (this.listeners[event] === undefined)
      this.listeners[event] = [];

    const index = this.listeners[event].findIndex(cb => cb === callback);
    if (index === -1) return;
    delete this.listeners[event][index];
  }

  on(event: string, callback: any) {
    return addEventListener(event, callback);
  }

  once(event: string, callback: any) {
    this.addEventListener(event, (...args: any) => {
      callback(...args);
      this.removeEventListener(event, callback);
    });
  }
}