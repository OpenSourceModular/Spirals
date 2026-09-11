import math
import os
from datetime import datetime

from flask import jsonify, request

import octoprint.plugin
import octoprint.settings


class SpiralsPlugin(
    octoprint.plugin.TemplatePlugin,
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.SimpleApiPlugin,
    octoprint.plugin.BlueprintPlugin,
):

    def get_template_folder(self):
        return os.path.join(os.path.dirname(os.path.realpath(__file__)), "templates")

    def get_asset_folder(self):
        return os.path.join(os.path.dirname(os.path.realpath(__file__)), "static")

    def get_template_configs(self):
        return [
            {
                "type": "tab",
                "name": "Spirals",
                "template": "spirals_tab.jinja2",
            },
            {
                "type": "settings",
                "template": "spirals_settings.jinja2",
            },
        ]

    def get_assets(self):
        return {
            "js": ["js/spirals.js"],
            "css": ["css/spirals.css"],
        }

    def get_update_information(self):
        return {
            "spirals": {
                "displayName": self._plugin_name,
                "displayVersion": self._plugin_version,
                "type": "github_release",
                "user": "example",
                "repo": "Spirals",
                "current": self._plugin_version,
                "pip": "https://example.com/Spirals-{target_version}.zip",
            }
        }

    def get_api_commands(self):
        return {"generate_gcode": []}

    def is_api_protected(self):
        return False

    def on_api_command(self, command, data):
        if command != "generate_gcode":
            return None

        return self._save_generated_gcode(data or {})

    @octoprint.plugin.BlueprintPlugin.route("/generate_gcode", methods=["GET"])
    def generate_gcode_route(self):
        params = request.values.to_dict(flat=True)
        result = self._save_generated_gcode(params)
        status = 200 if result.get("success") else 400
        return jsonify(result), status

    def _save_generated_gcode(self, params):
        try:
            
            output = self._build_gcode(params)
            if not output:
                return {"success": False, "error": "Unable to generate gcode"}

            upload_dir = os.path.join(octoprint.settings.settings().getBaseFolder("base"), "uploads")
            os.makedirs(upload_dir, exist_ok=True)
            filename = "spirals_{}.gcode".format(datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f"))
            file_path = os.path.join(upload_dir, filename)

            with open(file_path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(output)

            return {
                "success": True,
                "filename": filename,
                "path": file_path,
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    @staticmethod
    def _float_param(params, key, default):
        try:
            value = params.get(key, default)
            if value in (None, ""):
                return float(default)
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    @staticmethod
    def _bool_param(params, key, default):
        value = params.get(key, default)
        if value is None:
            return bool(default)
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"1", "true", "yes", "on"}:
                return True
            if lowered in {"0", "false", "no", "off"}:
                return False
        return bool(value)

    def _build_gcode(self, params):
        start_radius = self._float_param(params, "start_radius", 0.0)
        end_radius = self._float_param(params, "end_radius", 100.0)
        turns = self._float_param(params, "turns", 1.0)
        total_depth = self._float_param(params, "total_depth", 0.0)
        depth_per_pass = self._float_param(params, "depth_per_pass", 0.0)
        samples = int(self._float_param(params, "samples", 100.0))
        feedrate = self._float_param(params, "feedrate", 1000.0)
        invert_z = self._bool_param(params, "invert_z", True)
        growth = self._float_param(params, "growth", (end_radius - start_radius) / max(turns * 2.0 * math.pi, 1e-9))

        if turns <= 0:
            raise ValueError("turns must be greater than zero")
        if total_depth <= 0:
            raise ValueError("total_depth must be greater than zero")
        if depth_per_pass <= 0:
            raise ValueError("depth_per_pass must be greater than zero")
        if feedrate <= 0:
            raise ValueError("feedrate must be greater than zero")
        if samples < 2:
            samples = 2

        start_x = float(start_radius)
        end_x = float(end_radius)
        if end_x < start_x:
            end_x = start_x

        lines = [
            "G21",
            "G90",
            "G92 X0 Z0 A0",
            f"G0 X{start_x:.4f} Z0.0000 A0.0000",
        ]

        cumulative_depth = 0.0
        while cumulative_depth < total_depth:
            remaining = total_depth - cumulative_depth
            pass_depth = min(depth_per_pass, remaining)
            cumulative_depth += pass_depth

            for i in range(samples):
                theta = 2.0 * math.pi * turns * (i / max(samples - 1, 1))
                radius = start_radius + growth * theta
                z = -radius if invert_z else radius
                x = -cumulative_depth
                a = math.degrees(theta)
                lines.append(f"G1 X{x:.4f} Z{z:.4f} A{a:.4f} F{feedrate:.4f}")

            retract_x = 5.0
            lines.append(f"G0 X{retract_x:.4f}")
            lines.append(f"G0 X{start_x:.4f} A0.0000")
            lines.append("G0 Z0.0000")

        lines.append("M5")
        return "\n".join(lines) + "\n"


__plugin_pythoncompat__ = ">=3.13,<4"
__plugin_name__ = "Spirals"
__plugin_version__ = "0.1.1"
__plugin_identifier__ = "spirals"
__plugin_description__ = "Generates gcode for a spiral cut on a flat disc using X/Z/A motion."
__plugin_author__ = "Spirals"
__plugin_license__ = "MIT"
__plugin_url__ = "https://example.com/spirals"
__plugin_import_name__ = "octoprint_spirals"


def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = SpiralsPlugin()
    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
    }
