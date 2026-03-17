

; --------- End Gcode -------------
G91 ; Use relative coordinates
G1 Z20 F300 ; Move Z up 10mm to avoid collision
G90 ; Use absolute coordinates
T-1 ; Park the tool
M18 ; Disable motors
; -----------------------------------