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

; --------- Print with Tool 0 ---------
T0 ; Attach tool

G91 ; Use relative coordinates
G1 Z20 F{var.moveSlow} ; Secure Z height
G90 ; Use absolute coordinates

G1 X{var.centerX - 20} Y{var.centerY - 20} F{var.moveFast} ; Start point
G1 Z{var.layerHeight} F{var.moveSlow}
G1 F{var.printSpeed}

G91 ; Use relative coordinates
G1 Y20 E{20 * var.extrusionMultiplier0}
G1 X10 E{10 * var.extrusionMultiplier0}
G90 ; Use absolute coordinates


; --------- Print with Tool 1 ---------
T1 ; Attach tool

G91 ; Use relative coordinates
G1 Z20 F{var.moveSlow} ; Secure Z height
G90 ; Use absolute coordinates

G1 X{var.centerX} Y{var.centerY - 20} F{var.moveFast} ; Start point
G1 Z{var.layerHeight} F{var.moveSlow}
G1 F{var.printSpeed}

G91 ; Use relative coordinates
G1 Y20 E{20 * var.extrusionMultiplier1}
G1 X10 E{10 * var.extrusionMultiplier1}
G90 ; Use absolute coordinates

; --------- Print with Tool 2 ---------
T2 ; Attach tool

G91 ; Use relative coordinates
G1 Z20 F{var.moveSlow} ; Secure Z height
G90 ; Use absolute coordinates

G1 X{var.centerX+10} Y{var.centerY - 20} F{var.moveFast} ; Start point
G1 Z{var.layerHeight} F{var.moveSlow}
G1 F{var.printSpeed}

G91 ; Use relative coordinates
G1 Y20 E{20 * var.extrusionMultiplier2}
G1 X10 E{10 * var.extrusionMultiplier2}
G90 ; Use absolute coordinates


; --------- End Gcode -------------
G91 ; Use relative coordinates
G1 Z20 F300 ; Move Z up 10mm to avoid collision
G90 ; Use absolute coordinates
T-1 ; Park the tool
M18 ; Disable motors
; -----------------------------------