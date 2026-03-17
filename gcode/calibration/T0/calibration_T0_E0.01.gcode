; --------- Start Gcode -------------
; Settings
var centerX = 160
var centerY = 190

var moveFast = 3000
var moveSlow = 400
var printSpeed = 300

var extrusionMultiplier = 0.01 ; Adjust this value for Tool 0
var toolN = 0 ; Set the tool number to calibrate
var moveY = 50

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

T{var.toolN} ; Attach tool

; Print a straight line
G1 Z20 F{var.moveSlow} ; Secure Z height
G1 X{var.centerX} Y{var.centerY - var.moveY/2} F{var.moveFast} ; Start point
G1 Z1 F{var.moveSlow}
G1 F{var.printSpeed}
G1 Y{var.centerY + var.moveY/2} E{var.moveY * var.extrusionMultiplier}

; --------- End Gcode -------------
G91 ; Use relative coordinates
G1 Z20 F{var.moveSlow} ; Move Z up 10mm to avoid collision
G90 ; Use absolute coordinates
; -----------------------------------