# RBVH Daily Schedule Extraction

## Overview
Extract Lauren's daily neurology appointment schedule from screenshots of the RBVH scheduling system and format into a clean table.

## Reading the Screenshot

### Time Grid
- Each line/row on the grid = **5 minutes**
- Major time labels appear on the left (9am, 10am, 11am, etc.)
- Count lines from the nearest hour label to determine exact appointment time

### Appointment Color Coding
| Color | Duration |
|-------|----------|
| **Green** | 10 minutes (2 grid lines) |
| **Yellow** | 20 minutes (4 grid lines) |

### Appointment Block Format
Each block in the scheduler contains:
```
[Icon] "PatientName" OwnerLastName (Species) - CaseNumber - Notes
```
- **Species**: Canine or Feline
- **Icons**: May include paw prints, people icons, or other symbols
- **Notes** may include: recheck, L/M confirm, follow-up details, cross-department scheduling conflicts

## Output Format

### Table Columns
| Time | Patient | Notes |
|------|---------|-------|

### Formatting Rules
- **Time**: 12-hour format (e.g., 9:00, 10:30, 2:40)
- **Patient**: **Bold patient name** + owner last name + (K9 or Cat) + case number
- **Notes**: Any appointment notes, flags, or scheduling conflicts
- Mark gaps between appointments as `— gap —`
- If color is ambiguous, note it: *(looks yellow — 20 min?)*
- Flag same-owner multi-pet situations (e.g., Rivera x3)

### Species Shorthand
- Canine → K9
- Feline → Cat

## End-of-Schedule Summary
After the table, include:
- **Total patient count** for the day (or half-day if only partial)
- **Notable cases** — flag anything that sounds clinically interesting (seizures, ER rechecks, unusual presentations)
- **Scheduling conflicts** — same-owner pets across departments, overlapping times, etc.
