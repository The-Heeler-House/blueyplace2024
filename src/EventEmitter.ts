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

  /**
   * Emits an event to all listeners of that event.
   * @param event The name of the event to emit.
   * @param args Additional arguments for listeners.
   */
  emit(event: string, ...args: any[]) {
    if (this.listeners[event] === undefined)
      this.listeners[event] = [];
    this.listeners[event].forEach(callback => {
      callback(...args);
    });
  }

  /**
   * Adds a listener to a specific event.
   * @param event The event to listen for.
   * @param callback The code to execute when the event is emitted.
   */
  addEventListener(event: string, callback: any) {
    if (this.listeners[event] === undefined)
      this.listeners[event] = [];

    this.listeners[event].push(callback);
  }

  /**
   * Removes a listener from a specific event.
   * @param event The event to stop listening for.
   * @param callback The code which to stop executing on event emissions.
   */
  removeEventListener(event: string, callback: any) {
    if (this.listeners[event] === undefined)
      this.listeners[event] = [];

    const index = this.listeners[event].findIndex(cb => cb === callback);
    if (index === -1) return;
    delete this.listeners[event][index];
  }

  /**
   * Removes all listeners from a specific event.
   * @param event The event to remove all listeners from.
   */
  removeAllEventListeners(event: string) {
    this.listeners[event] = [];
  }

  /**
   * Adds a listener to a specific event.
   * @param event The event to listen for.
   * @param callback The code to execute when the event is emitted.
   */
  on(event: string, callback: any) {
    return addEventListener(event, callback);
  }

  /**
   * Adds a listener to a specific event which only executes once before destroying itself.
   * Warning: This event listener cannot be removed.
   * @param event The event to listen for.
   * @param callback The code to execute when the event is emitted.
   */
  once(event: string, callback: any) {
    this.addEventListener(event, (...args: any) => {
      callback(...args);
      this.removeEventListener(event, callback);
    });
  }
}