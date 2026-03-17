; --------- Start Gcode -------------
; Generated: {TIMESTAMP}
; Layers: {NUM_LAYERS}, Diameter: {DIAMETER}mm
; {TOOL_PARAMS}
; -----------------------------------
; Homing
if !move.axes[0].homed || !move.axes[1].homed || !move.axes[2].homed || !move.axes[3].homed
    echo "Axes not homed. Start homing."
    G28
else
    echo "All axes already homed."
G21 ; Set units to millimeters
G90 ; Use absolute coordinates
M83 ; Use relative extrusion mode
G92 E0 ; Reset extrusion distance
; -----------------------------------
