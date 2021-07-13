
# Colour Manager

A simple script to read through your project and find all instances of colours (as HEX, rgba, or rgb) and then output them all in an html report. Helps you see how many different colours you're using and where you're using them.


## Installation

Install colour_manager with npm.

```bash
  npm install colour_manager
  cd colour_manager
```

There are no other packages to install.
## Run Locally

Clone the project or copy the main.js script into the project you want to check, then run the script. The script is configured to run against Angular projects by default so it treats ./src as the root directory to start recursively scanning through for all colours. You can optionally specify a different root folder to use when running the script.

```bash
  node main.js [rootFolder] [outputFile]
```

* rootFolder - The top level folder to recursively search through for all unique colours. Default: 'src'
* outputFile - The html report file. Default: 'colours.html'

The output will be in outputFile as an html report.
  