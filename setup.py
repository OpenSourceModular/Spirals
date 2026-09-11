from setuptools import setup

setup(
    name="OctoprintSpirals",
    version="0.1.1",
    packages=["octoprint_spirals"],
    include_package_data=True,
    install_requires=["octoprint"],
    python_requires=">=3.13,<4",
    entry_points={
        "octoprint.plugin": [
            "spirals = octoprint_spirals",
        ]
    },
)
