import os
import sys


__plugin_pythoncompat__ = ">=3.13,<4"
__plugin_name__ = "Spirals"
__plugin_version__ = "0.1.0"
__plugin_identifier__ = "spirals"
__plugin_description__ = "A minimal OctoPrint plugin that generates a one-line X-axis move gcode file."
__plugin_author__ = "Spirals"
__plugin_license__ = "MIT"
__plugin_url__ = "https://example.com/spirals"
__plugin_import_name__ = "octoprint_spirals"


def __plugin_load__():
    global __plugin_implementation__
    plugin_dir = os.path.dirname(os.path.realpath(__file__))
    if plugin_dir not in sys.path:
        sys.path.insert(0, plugin_dir)
    from octoprint_spirals import SpiralsPlugin

    __plugin_implementation__ = SpiralsPlugin()
    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
    }
