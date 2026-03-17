; --------- Start Gcode -------------
; Settings
var centerX = 160
var centerY = 190

var moveFast = 3000
var moveSlow = 400
var printSpeed = 300

var extrusionMultiplier0 = 0.01 ; Adjust this value for Tool 0
var extrusionMultiplier1 = 0.01 ; Adjust this value for Tool 1
var extrusionMultiplier2 = 0.01 ; Adjust this value for Tool 2

var layerHeight = 1 ; Adjust the layer height for printing

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
G1 F{var.printSpeed} ; Set print speed
; -----------------------------------