# Spirals

A minimal OctoPrint plugin example that generates a one-line gcode file.

## Create A Renamed Copy From This Template

Use the helper script to generate a fully renamed copy (folder, package, class names, file names, IDs, and labels):

```bash
python scaffold_plugin.py MyPluginName
```

This creates a sibling folder named `MyPluginName` with all `Spirals`/`spirals` references updated.

Optional flags:

- `-d, --destination <path>`: choose output folder
- `--identifier <value>`: set plugin ID (default is lowercase compact name)
- `--import-name <value>`: set Python package name (default is `octoprint_<identifier>`)
- `--overwrite`: replace destination folder if it already exists

Example:

```bash
python scaffold_plugin.py "MyPluginName Tool" --identifier MyPluginName --import-name octoprint_MyPluginName -d ..\MyPluginNamePlugin
```

## What It Does

- Adds a **Spirals** tab in OctoPrint.
- Shows one textbox labeled **Move x by**.
- When you click **Generate gCode**, the plugin creates a one-line gcode file:
  - `G1 X<value>`
- Saves the generated file into OctoPrint's `uploads` directory.

## Install

1. Package this folder as a zip or install it with pip in your OctoPrint environment.
2. Restart OctoPrint.
3. Open the **Spirals** tab.

## Usage

1. Enter a distance in **Move x by**.
2. Click **Generate gCode**.
3. Run the generated file from the uploads list.
