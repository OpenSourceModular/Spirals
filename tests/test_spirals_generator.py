import sys
import types


flask_module = types.ModuleType("flask")
flask_module.jsonify = lambda payload, status=200: payload
flask_module.request = types.SimpleNamespace(values=types.SimpleNamespace(to_dict=lambda flat=True: {}))
sys.modules.setdefault("flask", flask_module)

octoprint_module = types.ModuleType("octoprint")
plugin_module = types.ModuleType("octoprint.plugin")


class TemplatePlugin:
    pass


class AssetPlugin:
    pass


class SimpleApiPlugin:
    pass


class _BlueprintPlugin:
    @staticmethod
    def route(*args, **kwargs):
        def decorator(func):
            return func

        return decorator


plugin_module.TemplatePlugin = TemplatePlugin
plugin_module.AssetPlugin = AssetPlugin
plugin_module.SimpleApiPlugin = SimpleApiPlugin
plugin_module.BlueprintPlugin = _BlueprintPlugin
settings_module = types.ModuleType("octoprint.settings")
settings_module.settings = lambda: types.SimpleNamespace(getBaseFolder=lambda *args, **kwargs: ".")

octoprint_module.plugin = plugin_module
octoprint_module.settings = settings_module
sys.modules.setdefault("octoprint", octoprint_module)
sys.modules.setdefault("octoprint.plugin", plugin_module)
sys.modules.setdefault("octoprint.settings", settings_module)

from octoprint_spirals import SpiralsPlugin


def test_build_gcode_generates_spiral_passes_and_retracts():
    plugin = object.__new__(SpiralsPlugin)

    gcode = plugin._build_gcode({
        "start_radius": 0.0,
        "end_radius": 100.0,
        "turns": 2,
        "samples": 100,
        "growth": 7.9577,
        "feedrate": 500.0,
        "total_depth": 6.0,
        "depth_per_pass": 2.0,
    })

    assert "G0 X0.0000 Z0.0000 A0.0000" in gcode
    assert "G1 X-2.0000 Z-0.0000 A0.0000 F500.0000" in gcode
    assert "G1 X-2.0000 Z-99.9994 A720.0000 F500.0000" in gcode
    assert "G1 X-4.0000" in gcode
    assert "G1" in gcode
    assert "G0 X5.0000" in gcode
    assert "G0 X0.0000 A0.0000" in gcode
    assert "A720.0000" in gcode or "A720.000" in gcode
    assert "X-2.0000" in gcode or "X-4.0000" in gcode or "X-6.0000" in gcode
