import {getMostLikelyCanvas, getRedditCanvas, RedditCanvas } from "../canvas";
import {fallbackOverlay, Overlay} from "../overlay";
import {CanvasComparer} from "../canvasComparer";
import {ButtonSetting, CheckboxSetting, CycleSetting, DisplaySetting, Settings} from "./minimap-components";
import {createMinimapUI, MinimapUI} from "./minimap-ui";
import {waitMs} from "../utils";
import {html} from "uhtml";
import {Logger} from "../logger";
import {TemplateController, TemplateData} from "../template/template";

const comparerTimeout = 5000;

export class Minimap {
  rPlace: RedditCanvas | undefined = undefined;
  overlay: Overlay | undefined = undefined;
  rPlaceCanvas: HTMLCanvasElement | undefined = undefined;
  templateCanvas: HTMLCanvasElement | undefined = undefined;
  maskCanvas: HTMLCanvasElement | undefined = undefined;
  comparer: CanvasComparer | undefined = undefined;
  settings: Settings | undefined = undefined;
  ui: MinimapUI | undefined = undefined;
  logger: Logger;

  templateController: TemplateController

  constructor(logger: Logger, templateController: TemplateController) {
    this.logger = logger;
    this.templateController = templateController;
  }

  async takeScreenshotOfCanvas() {
    // Move camera to center. The entire canvas isn't loaded unless we do this.
    this.rPlace!.camera.applyPosition({
      x: Math.floor(this.rPlaceCanvas!.width / 2),
      y: Math.floor(this.rPlaceCanvas!.height / 2),
      zoom: 0,
    });

    // Wait for the canvas to update.
    await waitMs(1000);

    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', 'rplace.png');
    this.rPlaceCanvas!.toBlob((blob) => {
      const url = URL.createObjectURL(blob!);
      downloadLink.setAttribute('href', url);
      downloadLink.click();
    });
  }

  selectRandPix() {
    this.comparer!.computeDiff();
    if (this.comparer!.countOfWrongPixels > 0) {
      try {
        const randPixel = this.comparer!.selectRandomPixelFromDiff();
        const imageDataRight = this.templateCanvas!.getContext("2d")!.getImageData(randPixel.x, randPixel.y, 1, 1);
        const currentColor = this.rPlaceCanvas!.getContext("2d")!.getImageData(randPixel.x, randPixel.y, 1, 1);
        this.pickColorFromPixel(imageDataRight);
        this.rPlace!.camera.applyPosition(randPixel);
        this.rPlace!.embed.showColorPicker = true;
        const selectedColor = this.rPlace!.embed.selectedColor;
        this.logger.log(`Ready to place pixel [x: ${randPixel.x}, y: ${randPixel.y}, color: ${selectedColor}, current-color: ${currentColor.data}, new-color: ${imageDataRight.data}]`);
      } catch (err) {
        console.error("Error getting pixel to place", err);
      }
    }
  }

  async initialize() {
    this.rPlace = await getRedditCanvas();
    if (!this.rPlace) {
      const canvas = getMostLikelyCanvas();
      // Start overlay async.
      this.logger.logError("Failed to find site specific handler. Falling back to overlay.");
      await fallbackOverlay(canvas!, this.templateController);
      // Don't load the settings interface, some pixel game sites will ban you for mousedown/mouseup
      // events.
      return false;
    }

    this.ui = createMinimapUI(document);
    this.rPlaceCanvas = this.rPlace.canvas;
    this.settings = new Settings(this.ui.settingsBlock, this.ui.mlpMinimapBlock);
    this.templateCanvas = this.ui.imageCanvas;
    this.maskCanvas = document.createElement("canvas");
    this.maskCanvas.width = this.rPlaceCanvas.width;
    this.maskCanvas.height = this.rPlaceCanvas.height;
    this.comparer = new CanvasComparer(this.rPlaceCanvas, this.templateCanvas, this.maskCanvas);

    this.settings.addSetting(
      "templateName",
      new CycleSetting(
        "Template",
        ["bluey", "bluey_allies"],
        ["Only Bluey", "Bluey & Allies"],
        1,
        (templateNameSetting) => {
          this.templateController.setFaction(templateNameSetting.value);
        },
        true
      )
    );

    this.settings.addSetting(
      "findArt",
      new ButtonSetting("Find our art!", () => {
        const nextLocation = this.comparer!.findNextArt();
        if (!nextLocation)
          throw {message: "Next location not found!"};
        this.logger.log(`Moving to art at: [x: ${nextLocation.x}, y: ${nextLocation.y}]`);
        this.rPlace!.camera.applyPosition(nextLocation);
      })
    );

    const enableAutoColorSetting = await GM.getValue('enableAutoColor', false);
    this.settings.addSetting(
      "autoColor",
      new CheckboxSetting("Auto color picker", enableAutoColorSetting, (autoColorSettings) => {
        GM.setValue('enableAutoColor', autoColorSettings.enabled);
      })
    );

    // TODO: Reimplement this
    /*const enableAutoPickSetting = await GM.getValue('enableAutoPick', false);
    this.settings.addSetting(
      "autoPick",
      new CheckboxSetting("Use the priority-based template", enableAutoPickSetting, (autoPickSetting) => {
        GM.setValue('enableAutoPick', autoPickSetting.enabled);
        this.templates!.fetch(autoPickSetting.enabled);
      })
    );*/

    const enableOverlay = await GM.getValue('enableOverlay', false);
    this.settings.addSetting(
      "overlay",
      new CheckboxSetting("Fullscreen overlay", enableOverlay, (overlaySetting) => {
        GM.setValue('enableOverlay', overlaySetting.enabled);
        if (!(this.overlay instanceof Overlay)) {
          this.overlay = new Overlay(this.rPlaceCanvas!, this.templateController, this.templateController.currentTemplate!);
        }
        if (overlaySetting.enabled) {
          this.overlay!.show();
        } else {
          this.overlay!.hide();
        }
      })
    );

    this.settings.addSetting(
      "pixelDisplayProgress",
      new DisplaySetting("Current progress", "Unknown", true)
    );

    this.settings.addSetting(
      "downloadCanvas",
      new ButtonSetting("Download r/place Canvas", () => {
        this.takeScreenshotOfCanvas();
      })
    );

    this.settings.addSetting(
      "copyId",
      new ButtonSetting("Copy user ID", () => {
        navigator.clipboard.writeText(localStorage.getItem("minimap-id") ?? "No ID found");
      })
    );

    this.settings.addSetting(
      "copyPalletRGB",
      new ButtonSetting("Copy pallet RGB", () => {
        let data: string[] = [];

        this.rPlace?.palette.forEach(color => {
          data.push(`{${color[0]},${color[1]},${color[2]}}`);
        });

        navigator.clipboard.writeText(`{${data.join(",")}}`);
      })
    );

    this.settings.addSetting(
      "copyPalletHEX",
      new ButtonSetting("Copy pallet HEX", () => {
        let data: string[] = [];

        this.rPlace?.palette.forEach(color => {
          var r = color[0].toString(16);
          r = r.length == 1 ? "0" + r : r;
          var g = color[1].toString(16);
          g = g.length == 1 ? "0" + g : g;
          var b = color[2].toString(16);
          b = b.length == 1 ? "0" + b : b;

          data.push(`#${r}${g}${b}`);
        });

        navigator.clipboard.writeText(`{${data.join(",")}}`);
      })
    );

    this.templateController.addEventListener("update", async (template: TemplateData) => {
      if (!(this.overlay instanceof Overlay) && await GM.getValue("enableOverlay")) {
        this.overlay = new Overlay(this.rPlaceCanvas!, this.templateController, template!);
      }

      this.ui!.setTemplate(template);
    });

    try {
      const actions = this.rPlace!.embed
        .shadowRoot!.querySelector("garlic-bread-color-picker")!
        .shadowRoot!.querySelector('div > div > div.actions')! as HTMLDivElement;
      const button = document.createElement('button');
      button.innerText = "Pick Priority Pixel";
      button.setAttribute('style', "height:44px; min-width: 44px; padding: 0px; border: var(--pixel-border); box-sizing: border-box; background-color: #ffffff; flex: 1 1 0%; cursor:pointer;  color: rgb(18, 18, 18); font-size 20px; position:relative; --button-border-width: 4px; border-image-slice: 1; margin-left: 16px;");
      button.onclick = () => {
        this.selectRandPix();
      };
      actions.appendChild(button);
    } catch {}

    this.comparer!.setInterval(comparerTimeout);
    this.comparer!.addEventListener("computed", () => {
      const percentage = ((100 * this.comparer!.countOfRightPixels) / this.comparer!.countOfAllPixels).toPrecision(3);
      this.settings!.getSetting("pixelDisplayProgress").content = html`<span style="font-weight: bold;">${percentage}
          % (${this.comparer!.countOfRightPixels}/${this.comparer!.countOfAllPixels})</span>`;
    });

    this.rPlace.position.addEventListener("posChanged", () => {
      this.ui!.recalculateImagePos(this.rPlace!.position.pos);
      if (this.settings!.getSetting("autoColor").enabled) {
        try {
          const imageData = this.ui!.imageCanvasCtx.getImageData(this.rPlace!.position.pos.x, this.rPlace!.position.pos.y, 1, 1);
          this.pickColorFromPixel(imageData);
        } catch (e) {
          console.error(e);
        }
      }
    });

    //await this.templates.fetch(this.settings.getSetting("autoPick").enabled);
    return true;
  }

  pickColorFromPixel(imageData) {
    if (imageData.data[3] !== 255) return;

    const r = imageData.data[0];
    const g = imageData.data[1];
    const b = imageData.data[2];
    let diff: number[] = [];
    for (const color of this.rPlace!.palette) {
      diff.push(Math.abs(r - color[0]) + Math.abs(g - color[1]) + Math.abs(b - color[2]));
    }
    let correctColorID = 0;
    for (let i = 0; i < diff.length; i++) {
      if (diff[correctColorID] > diff[i]) correctColorID = i;
    }

    this.rPlace!.embed.selectedColor = this.rPlace!.palette[correctColorID][3];
  }
}