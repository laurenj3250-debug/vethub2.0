# Cascading Defaults Design

**Goal:** When gait severity is selected, auto-fill all neurologically predictable downstream findings. Collapse auto-filled sections into a summary line. User only taps exceptions.

## Cascade Rules

### T3-L3
| Gait | Postural TL | Postural PL | Reflexes | Tone PL | Bladder |
|------|-------------|-------------|----------|---------|---------|
| Normal | Normal | Normal | Normal | Normal | Normal |
| Ambulatory | Normal | Deficits | Normal (UMN) | Normal/Increased | Normal |
| Non-Ambulatory | Normal | Absent | Normal (UMN) | Normal/Increased | Normal |
| Paraplegic | Normal | Absent | Normal (UMN) | Normal/Increased | Normal |

### C6-T2
| Gait | Postural TL | Postural PL | Reflexes | Tone | Bladder |
|------|-------------|-------------|----------|------|---------|
| Normal | Normal | Normal | Normal | Normal | Normal |
| Two-Engine | Deficits | Deficits | Normal | LMN TL/UMN PL | Normal |
| Tetraparesis | Deficits | Deficits | Normal | LMN TL/UMN PL | Normal |

### C1-C5
| Gait | Postural | Reflexes | Tone |
|------|----------|----------|------|
| Normal | Normal x4 | Normal | Normal |
| Amb Tetraparesis | Delayed x4 | Normal/Increased | Increased |
| Non-Amb Tetraparesis | Absent x4 | Normal/Increased | Increased |
| Tetraplegic | Absent x4 | Normal/Increased | Increased |

### L4-S3
| Gait | Postural PL | Reflexes | Tone PL | Tail/Anal | Bladder |
|------|-------------|----------|---------|-----------|---------|
| Normal | Normal | Normal | Normal | Normal | Normal |
| Paraparesis | Deficits | Normal | Reduced | Normal | Normal |
| Non-Ambulatory | Absent | Normal | Reduced | Reduced | Normal |
| Paraplegic | Absent | Normal | Flaccid | Flaccid | Large/Flaccid (LMN) |

## UI Pattern

When gait changes → auto-fill cascade fields → collapse them into summary block:

```
[UMN pattern auto-filled ✓]  [tap to edit]
Postural: TL normal, PL absent | Reflexes: UMN | Tone: UMN
```

Expand on tap to see/edit individual toggles.

Fields that DON'T cascade (always visible):
- DPP (paraplegic only)
- Schiff-Sherrington (paraplegic only)
- Cutaneous trunci
- Hyperpathia / Kyphosis
- Bladder (partially predictable for L4-S3 paraplegic, but clinically variable)
- Muscle mass
