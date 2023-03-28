from PIL import Image, ImageDraw
import os
import sys
import urllib.request
import json

palettes = [
    [
        (255, 255, 255),
        (0, 0, 0),
    ],
]

canvasSize = (2000, 2000)
palette = palettes[0]

def loadTemplateEntryImage(templateEntry, subfolder):
    for imageSource in templateEntry["images"]:
        try:
            if imageSource.startswith("http"):
                headers = {
                    "User-Agent": "test script (http://www.example.com, 0)",
                }
                request = urllib.request.Request(imageSource, headers = headers, method = "GET")
                responseObject = urllib.request.urlopen(request, timeout=5)
                rawImage = Image.open(responseObject)
            else:
                rawImage = Image.open(os.path.join(subfolder, imageSource))
            
            convertedImage = Image.new("RGBA", (rawImage.width, rawImage.height))
            convertedImage.paste(rawImage)

            rawImage.close()

            # validate image only contains palette colors?
            
            return convertedImage
        except Exception as e:
            print("Eat exception {0}".format(e))
    
    raise RuntimeError("unable to load any images for {0}".format(templateEntry["name"]))

def loadTemplate(subfolder):
    with open(os.path.join(subfolder, "template.json"), "r", encoding="utf-8") as f:
        template = json.loads(f.read())
    return template

def copyTemplateEntryIntoCanvas(templateEntry, image, canvas):
    if (templateEntry["x"] + image.width > canvasSize[0] or
        templateEntry["y"] + image.height > canvasSize[1] or
        templateEntry["x"] < 0 or
        templateEntry["y"] < 0):
        raise ValueError("{0} is not entirely on canvas??".format(templateEntry["name"]))
    
    canvas.alpha_composite(image, (templateEntry["x"], templateEntry["y"]))

def getSurroundingPixels(xy):
    (x, y) = xy
    return [
        (x-1, y-1),
        (x, y-1),
        (x+1, y-1),
        (x-1, y),
        (x+1, y),
        (x-1, y+1),
        (x, y+1),
        (x+1, y+1)
    ]

def isFilledPixelOnEdge(image, knownTransparent, xy):
    (x, y) = xy
    if x == 0 or y == 0 or x == image.width - 1 or y == image.height - 1:
        return True
    
    try:
        if y == 1:
            pixelsToSample = [
                (x+1, y),
                (x-1, y+1),
                (x, y+1),
                (x+1, y+1)
            ]
        elif x == 1:
            pixelsToSample = [
                (x-1, y+1),
                (x, y+1),
                (x+1, y+1)
            ]
        else:
            pixelsToSample = [
                (x+1, y+1)
            ]
        
        justExit = False
        for pixel in pixelsToSample:
            if isTransparent(image.getpixel(pixel)):
                knownTransparent.add(pixel)
                justExit = True
        
        if justExit:
            return True

        for neighbor in getSurroundingPixels(xy):
            if neighbor in knownTransparent:
                return True
        return False
    except:
        print(xy, image.width, image.height)
        raise

def isTransparent(pixelTuple):
    return pixelTuple[3] < 128

def generatePriorityMask(templateEntry, image):
    priority = 1
    if "priority" in templateEntry:
        priority = int(templateEntry["priority"])
        if priority < 1 or priority > 25:
            raise ValueError("{0} priority out of acceptable range".format(templateEntry["name"]))
        
    priority *= 23
    mask = Image.new("RGBA", (image.width, image.height), (0, 0, 0, 0))
    maskDraw = ImageDraw.Draw(mask)
    
    knownTransparent = set()
    edgePixels = set()
    innerPixels = set()
    
    for y in range(0, image.height):
        for x in range(0, image.width):
            xy = (x, y)
            
            if (xy in knownTransparent):
                continue
            
            if isTransparent(image.getpixel(xy)):
                knownTransparent.add(xy)
                maskDraw.point(xy, (0, 0, 0, 0))
                continue
            
            # maskDraw.point(xy, (priority, priority, priority, 255))
            if isFilledPixelOnEdge(image, knownTransparent, xy):
                edgePixels.add(xy)
            else:
                innerPixels.add(xy)
    
    for iteration in range(0,6):
        currentPriority = priority + 25 - iteration * 5
        pixelTuple = (currentPriority, currentPriority, currentPriority, 255)
        
        newEdgePixels = set()
        for edgePixel in edgePixels:
            maskDraw.point(edgePixel, pixelTuple)
            for neighbor in getSurroundingPixels(edgePixel):
                if neighbor in innerPixels:
                    newEdgePixels.add(neighbor)
                    innerPixels.remove(neighbor)
        edgePixels = newEdgePixels

    innerPixels.update(edgePixels)
    pixelTuple = (priority, priority, priority, 255)
    for pixel in innerPixels:
        maskDraw.point(pixel, pixelTuple)

    return mask

def generateEnduImage(enduImage, enduExtents):
    if (enduExtents["x2"] > canvasSize[0] or
        enduExtents["y2"] > canvasSize[1] or
        enduExtents["x1"] < 0 or
        enduExtents["y1"] < 0):
        raise ValueError("endu extents appear to be bigger than canvas??")
    
    return enduImage.crop((enduExtents["x1"], enduExtents["y1"], enduExtents["x2"], enduExtents["y2"]))

def updateExtents(templateEntry, image, enduExtents):
    if not "x1" in enduExtents:
        enduExtents["x1"] = templateEntry["x"]
        enduExtents["y1"] = templateEntry["y"]
        
        enduExtents["x2"] = templateEntry["x"] + image.width
        enduExtents["y2"] = templateEntry["y"] + image.height
    else:
        enduExtents["x1"] = min(enduExtents["x1"], templateEntry["x"])
        enduExtents["y1"] = min(enduExtents["y1"], templateEntry["y"])
        
        enduExtents["x2"] = max(enduExtents["x2"], templateEntry["x"] + image.width)
        enduExtents["y2"] = max(enduExtents["y2"], templateEntry["y"] + image.height)

def writeEnduTemplate(enduExtents, enduInfo, subfolder):
    outputObject = {
        "contact": enduInfo["contact"],
        "templates": [
            {
                "name": "assembled template for " + enduInfo["name"],
                "sources": [
                    enduInfo["source"]
                ],
                "x": enduExtents["x1"],
                "y": enduExtents["y1"]
            }
        ]
    }
    
    with open(os.path.join(subfolder, "endu_template.json"), "w", encoding="utf-8") as f:
        f.write(json.dumps(outputObject, indent=4))

def createCanvas(isMask = False):
    alphaValue = 0
    if isMask:
        alphaValue = 255
    return Image.new("RGBA", canvasSize, (0, 0, 0, alphaValue))

def writeCanvas(canvas, subfolder, name):
    canvas.save(os.path.join(subfolder, name + ".png"))
    if False:
        canvas.save(os.path.join(subfolder, name + "_u.png"))
        with canvas.quantize() as quantizedCanvas:
            quantizedCanvas.save(os.path.join(subfolder, name + ".png"))

def resolveTemplateFileEntry(templateFileEntry):
    requiredProperties = ["name", "x", "y"]
    if "endu" in templateFileEntry:
        target = templateFileEntry["endu"]
        responseObject = urllib.request.urlopen(target, timeout=5)
        enduTemplate = json.loads(responseObject.read().decode("utf-8"))
        
        output = []
        for enduTemplateEntry in enduTemplate["templates"]:
            for requiredProperty in requiredProperties:
                if not requiredProperty in enduTemplateEntry:
                    print("Missing required property {1} from {0}".format(templateFileEntry["name"], requiredProperty))
                    raise KeyError()
            
            localName = templateFileEntry["name"] + " -> " + enduTemplateEntry["name"]
            if not "sources" in enduTemplateEntry:
                print("Missing sources for {0}".format(localName))
                raise KeyError()
            
            if "frameRate" in enduTemplateEntry:
                print("Ignoring animated template {0}".format(localName))
                continue
            
            converted = {
                "name": localName,
                "images": enduTemplateEntry["sources"],
                "x": enduTemplateEntry["x"],
                "y": enduTemplateEntry["y"]
            }
            
            for copyProperty in ["pony", "bots", "priority"]:
                if copyProperty in templateFileEntry:
                    converted[copyProperty] = templateFileEntry[copyProperty]
            
            output.append(converted)
        return output
    elif "images" in templateFileEntry:
        for requiredProperty in requiredProperties:
            if not requiredProperty in templateFileEntry:
                # going to make a bad assumption that name is provided...
                print("Missing required property {1} from {0}".format(templateFileEntry["name"], requiredProperty))
                raise KeyError()
        return [templateFileEntry]
    else:
        raise KeyError("template entry for {0} needs either images or endu keys".format(templateEntry["name"]))

def updateVersion(subfolder):
    filePath = os.path.join(subfolder, "version.txt")
    templateVersion = 0
    
    if os.path.isfile(filePath):
        with open(filePath, "r", encoding="utf-8") as versionFile:
            templateVersion = int(versionFile.read())
    
    templateVersion += 1
    
    with open(filePath, "w", encoding="utf-8") as versionFile:
        versionFile.write(str(templateVersion))

def main(subfolder):
    # these are in layer order, so higher entries overwrite/take precedence over lower entries
    templateFile = loadTemplate(subfolder)
    
    # these will be in draw order, so later entries will overwrite earlier entries
    templates = []
    for templateFileEntry in reversed(templateFile["templates"]):
        # endu templates can have multiple entries in them, and they are listed in draw order
        templates.extend(resolveTemplateFileEntry(templateFileEntry))
    
    canvasImage = createCanvas()
    botImage = createCanvas()
    maskImage = createCanvas(isMask=True)
    enduImage = createCanvas()
    
    enduExtents = dict()
    for templateEntry in templates:
        print("render {0}".format(templateEntry["name"]))
        with loadTemplateEntryImage(templateEntry, subfolder) as image:
            copyTemplateEntryIntoCanvas(templateEntry, image, canvasImage)
            
            if ("bots" in templateEntry and bool(templateEntry["bots"])):
                copyTemplateEntryIntoCanvas(templateEntry, image, botImage)
                with generatePriorityMask(templateEntry, image) as priorityMask:
                    copyTemplateEntryIntoCanvas(templateEntry, priorityMask, maskImage)
            
            if ("pony" in templateEntry and bool(templateEntry["pony"])):
                copyTemplateEntryIntoCanvas(templateEntry, image, enduImage)
                updateExtents(templateEntry, image, enduExtents)
    
    writeCanvas(canvasImage, subfolder, "canvas")
    writeCanvas(botImage, subfolder, "bot")
    writeCanvas(maskImage, subfolder, "mask")
    
    with generateEnduImage(enduImage, enduExtents) as enduCrop:
        writeCanvas(enduCrop, subfolder, "endu")
        writeEnduTemplate(enduExtents, templateFile["enduInfo"], subfolder)
    
    canvasImage.close()
    botImage.close()
    maskImage.close()
    enduImage.close()
    
    updateVersion(subfolder)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Must provide a folder containing template.json as first arg")
        sys.exit(1)
    if not os.path.isfile(".build/template_assembler/assemble_template.py"):
        print("Must be invoked from repo root")
        sys.exit(1)
    main(sys.argv[1])