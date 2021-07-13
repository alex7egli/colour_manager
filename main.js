const fs = require('fs').promises;
const path = require('path');

const includedFileExtensions = {
  '.ts': true,
  '.html': true,
  '.scss': true
};
const rootFolder = process.argv[2] || 'src';
const outputFile = process.argv[3] || 'colours.html';
const excludedFileTypes = ['.spec.ts'];
const matchingColourPatternsRegex = new RegExp(/(#[abcdefABCDEF1234567890]{6})|(rgba\(.{3}\,.{3}\,.{3}\,.{2,4}\))|(rgba\(.{1,3}\,\s.{1,3}\,\s.{1,3}\,\s.{2,4}\))|(rgb\(.{11}\))/g);
const colourVariableRegex = new RegExp(/^\$.*:/g);

/** 
 * Map of all unique colour strings to the files and lines they appear in.
 * Format: {
 *  [colourString]: {
 *    files: set of unique file names this colour appears in,
 *    lines: array of all lines this colour appears in
 *  }
 * }
 * - using set for files so we have unique list
 * - using array for lines because no need to enforce uniqueness
 */
const uniqueColours = {};

/**
 * Map of all variable names matched to colour value of variable.
 * Format: {
 *  [variableName]: [colourString]
 * }
 */
const variables = {};

async function main() {
  console.log(`Recursively searching everything inside of ${rootFolder}`);

  console.log(`Finding all unique scss colour varibles`);
  await findAllColourVariables(rootFolder);

  console.log('Finding all unique colours...');
  await readFolder(rootFolder, checkFileContents);

  formatOutput();
}

main();

async function readFolder(folderPath, processFileFunction) {
  const contents = await fs.readdir(folderPath, { withFileTypes: true });
  for (let fileObj of contents) {
    const fileObjPath = path.join(folderPath, fileObj.name);
    if (fileObj.isDirectory()) {
      await readFolder(fileObjPath, processFileFunction);
    } else {
      await processFileFunction(fileObjPath);
    }
  }
}

async function checkFileContents(filePath) {
  const fileExtension = path.extname(filePath);
  if (includedFileExtensions[fileExtension] && !isExcludedFile(filePath)) {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const fileLines = fileContents.split('\n');

    fileLines.forEach((line) => {
      const matches = line.match(matchingColourPatternsRegex);
      if (matches) {
        matches.forEach((matchValue) => {
          const colourString = matchValue.toLowerCase();
          if (uniqueColours[colourString] == null) {
            uniqueColours[colourString] = {
              files: new Set(),
              lines: []
            };
          }

          uniqueColours[colourString].files.add(filePath);
          uniqueColours[colourString].lines.push(line);
        });
      }

      // Check for any variables in the line
      for (let variableName in variables) {
        if (line.indexOf(variableName) > -1) {
          const colourString = variables[variableName];
          
          if (uniqueColours[colourString] == null) {
            uniqueColours[colourString] = {
              files: new Set(),
              lines: []
            };
          }

          uniqueColours[colourString].files.add(filePath);
          uniqueColours[colourString].lines.push(line);
        }
      }
    });

  }
}

function isExcludedFile(filePath) {
  return excludedFileTypes.some((fileType) => filePath.slice(fileType.length * -1) === fileType);
}

async function findAllColourVariables(folderPath) {
  console.error('Finding all colour variables...');
  await readFolder(folderPath, findColourVariablesInFile);
}

async function findColourVariablesInFile(filePath) {
  const fileExtension = path.extname(filePath);
  if (fileExtension === '.scss' && !isExcludedFile(filePath)) {
    const fileContents = await fs.readFile(filePath, 'utf8');
    const fileLines = fileContents.split('\n');

    fileLines.forEach((line) => {
      const variableNames = line.match(colourVariableRegex);
      if (variableNames && variableNames.length > 0) {
        const values = line.match(matchingColourPatternsRegex);
        if (values && values.length > 0) {
          const variableName = variableNames[0].slice(0, -1);
          variables[variableName] = values[0];
        }
      }
    });

  }
}

/**
 * Save output in an html file as a report.
 */
async function formatOutput() {
  const blockStyle = `display: inline-block; margin: 10px;`;
  let html = `<html><head></head><body>`;
  let sortedColourKeys = Object.keys(uniqueColours);
  // sortedColourKeys.sort();
  sortedColourKeys = sortColours(sortedColourKeys);

  // Display by colours
  html += `<h2>Colours by Hue</h2>`;
  for (let key of sortedColourKeys) {
    const numUses =  uniqueColours[key].lines.length;
    let block = `<div style="${blockStyle}">`;
    block += `<div style="background: ${key}; height: 100px; width: 100px; border: solid 1px black;"></div>`;
    block += `<div>${key}</div>`;
    block += `<div>${numUses} uses</div>`;
    block += '</div>\n';

    html += block;
  }

  // Display long list
  html += `<h2>Colours in List</h2>`;
  for (let key of sortedColourKeys) {
    const numUses =  uniqueColours[key].lines.length;
    html += `<div>${key}: ${numUses} uses</div>`
  }

  // Display detailed uses
  html += `<h2>Colours with all File Locations</h2>`;
  for (let key of sortedColourKeys) {
    const files = Array.from(uniqueColours[key].files);
    html += `<h3>${key}</h3>`;
    html += `<ul>`;
    files.forEach((fileName) => {
      html += `<li>${fileName}</li>`;
    });
    html += `</ul>`;
  }

  html += '</body></html>';

  await fs.writeFile(outputFile, html);
}

// Colour sorting mostly copied from https://gist.github.com/afonsograca/7316f7a74b21e386c8963fe53c82b8ae
var Color = function Color(hexVal) { //define a Color class for the color objects
  this.hex = hexVal;
};

function constructColor(colorObj) {
  var hex = colorObj.hex.substring(1);
  /* Get the RGB values to calculate the Hue. */
  var r = parseInt(hex.substring(0, 2), 16) / 255;
  var g = parseInt(hex.substring(2, 4), 16) / 255;
  var b = parseInt(hex.substring(4, 6), 16) / 255;
  
  /* Getting the Max and Min values for Chroma. */
  var max = Math.max.apply(Math, [r, g, b]);
  var min = Math.min.apply(Math, [r, g, b]);
  
  
  /* Variables for HSV value of hex color. */
  var chr = max - min;
  var hue = 0;
  var val = max;
  var sat = 0;

  
  if (val > 0) {
      /* Calculate Saturation only if Value isn't 0. */
      sat = chr / val;
      if (sat > 0) {
          if (r == max) {
              hue = 60 * (((g - min) - (b - min)) / chr);
              if (hue < 0) {
                  hue += 360;
              }
          } else if (g == max) {
              hue = 120 + 60 * (((b - min) - (r - min)) / chr);
          } else if (b == max) {
              hue = 240 + 60 * (((r - min) - (g - min)) / chr);
          }
      }
  }
  colorObj.chroma = chr;
  colorObj.hue = hue;
  colorObj.sat = sat;
  colorObj.val = val;
  colorObj.luma = 0.3 * r + 0.59 * g + 0.11 * b;
  colorObj.red = parseInt(hex.substring(0, 2), 16);
  colorObj.green = parseInt(hex.substring(2, 4), 16);
  colorObj.blue = parseInt(hex.substring(4, 6), 16);
  return colorObj;
}

function sortColoursByField (colors, fieldName) {
  return colors.sort(function (a, b) {
      return a[fieldName] - b[fieldName];
  });
}

function sortColours(hexArray) { 
  const colors = [];
  hexArray.forEach( (v) => {
      var color = new Color(v);
      constructColor(color);
      colors.push(color);
  });
  
  sortColoursByField(colors, 'hue');

  return colors.map((colour) => colour.hex);
}