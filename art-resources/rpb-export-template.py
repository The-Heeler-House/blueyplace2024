#!/usr/bin/env python2
# -*- coding: utf-8 -*-

from gimpfu import PF_DIRNAME, PF_IMAGE, PF_STRING, PF_TOGGLE, main, pdb, register
import binascii
import os
import re
import struct
import sys
import traceback

### Registration data
author = 'fluttershy'
year = '2023'
exportMenu = '<Image>/File/Export/'
exportDesc = 'Export to template json'
whoiam = '\n' + os.path.abspath(sys.argv[0])

layerNameRe = re.compile(
  r"^(?:(?P<hide>-) )?(?:(?P<export>>?>) )?(?:(?P<meta>#) )?(?:(?P<area>[a-zA-Z0-9,–]+)> )?(?:(?P<complete>✓) )?(?:(?P<community>%) )?(?P<name>.*?)(?: \[(?P<priority>\d+)\])?$",
  flags=re.UNICODE
)

def shouldSkipLayer(layerNameMatch):
  if layerNameMatch is None:
    return True
  if layerNameMatch.group('hide') is not None or layerNameMatch.group('meta') is not None or layerNameMatch.group('community') is not None:
    return True
  return False

def getPriority(layerNameMatch):
  priority = '5'
  if layerNameMatch.group('priority') is not None:
    priority = layerNameMatch.group('priority')
  return priority

def cleanFileName(name):
  return name.replace(':', '_').replace('?', '_').replace(' ', '_')

class Chunk:
  def __init__(self, type, size, loc):
    self.type = type
    self.size = size
    self.loc = loc

def getChunks(png):
  loc = 8
  chunks = []
  while True:
    png.seek(loc)
    bytes = png.read(4)
    if not bytes:
      break
    len = struct.unpack('>I', bytes)[0]
    type = png.read(4)
    chunks.append(Chunk(type, len, loc))
    loc += len + 4 + 4 + 4
  return chunks

def makePNGDeterministic(png):
  chunksToSkip = [b'iCCP', b'bKGD', b'pHYs', b'tIME']
  chunks = getChunks(png)
  loc = 8
  for chunk in chunks:
    if chunk.type in chunksToSkip:
      continue
    png.seek(chunk.loc)
    size = chunk.size + 4 + 4 + 4
    content = png.read(size)
    png.seek(loc)
    png.write(content)
    loc += size
  png.truncate(loc)

def exportTemplate(image, dir):
  try:
    for f in os.listdir(os.path.join(dir, "source")):
      os.remove(os.path.join(dir, "source", f))
    jsonf = open(os.path.join(dir, "template.json"), 'wb')
    jsonf.write("""{
  "endu_info": {
    "contact": "https://discord.gg/bronyplace #diplomacy",
    "source_root": "http://ponyplace-cdn.ferrictorus.com/mlp/",
    "name": "r/place bronies"
  },
  "templates": [\n""")
    first = True
    for layer in image.layers:
      if not layer.visible:
        #pdb.gimp_message("Skipping (visibility): " + layer.name)
        continue
      layerNameMatch = layerNameRe.match(layer.name)
      if shouldSkipLayer(layerNameMatch):
        #pdb.gimp_message("Skipping (layer name): " + layer.name)
        continue
      #pdb.gimp_message("Including: " + layer.name)
      priority = getPriority(layerNameMatch)
      pngName = cleanFileName(layerNameMatch.group('name')) + '.png'
      tl = ""
      if not first:
        tl += ",\n"
      else:
        first = False
      tl += """    {{
      "name": "{0}",
      "images": [
        "../mlp/source/{1}"
      ],
      "x": {2},
      "y": {3},
      "priority": {4},
      "autopick": true,
      "export_group": "starter"
    }}""".format(layerNameMatch.group('name'), pngName, layer.offsets[0], layer.offsets[1], priority)
      pdb.gimp_file_save(image, layer, os.path.join(dir, "source", pngName), "?")
      png = open(os.path.join(dir, "source", pngName), 'rw+b')
      makePNGDeterministic(png)
      png.close()
      jsonf.write(tl)
    jsonf.write("""\n  ]
}
""")
    jsonf.close()
  except Exception as e:
    pdb.gimp_message(e.args[0])
    pdb.gimp_message(traceback.format_exc())

register(
  'rpb-export-template', # procedure name for whatever
  exportDesc,            # blurb
  exportDesc + whoiam,   # help message
  author, author, year,  # author, copyright, year
  exportDesc + '...',    # menu name
  '*',                   # type of images we accept
  [                      # Parameters
    (PF_IMAGE,   'image',         'Input image',           None),
    (PF_DIRNAME, 'directory',     'Directory',             '/tmp/export-template'),
  ],
  [],
  exportTemplate,
  menu=exportMenu
)

main()
