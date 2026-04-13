#!/usr/bin/env python3
"""
CityShield Mid-Project Presentation Generator
Dark cybersecurity theme, professional academic layout
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Theme Colors ──
BG_DARK = RGBColor(0x0D, 0x11, 0x17)       # Deep dark blue-black
BG_CARD = RGBColor(0x14, 0x1B, 0x2D)       # Card background
ACCENT_CYAN = RGBColor(0x00, 0xD4, 0xFF)    # Cyan accent
ACCENT_GREEN = RGBColor(0x00, 0xE6, 0x76)   # Green accent
ACCENT_RED = RGBColor(0xFF, 0x3B, 0x5C)     # Red accent
ACCENT_ORANGE = RGBColor(0xFF, 0x9F, 0x43)  # Orange accent
ACCENT_PURPLE = RGBColor(0xA855, 0xF7, 0x00)[0:3] if False else RGBColor(0xA8, 0x55, 0xF7)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY = RGBColor(0xB0, 0xB8, 0xC8)
DIM_GRAY = RGBColor(0x6B, 0x72, 0x80)
BORDER_COLOR = RGBColor(0x1E, 0x29, 0x3B)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def add_bg(slide, color=BG_DARK):
    """Set solid background color."""
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_shape(slide, left, top, width, height, fill_color=None, border_color=None, border_width=Pt(1)):
    """Add a rounded rectangle shape."""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color or BG_CARD
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = border_width
    else:
        shape.line.fill.background()
    return shape


def add_accent_line(slide, left, top, width, color=ACCENT_CYAN):
    """Add a thin accent line."""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Pt(3))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def add_text_box(slide, left, top, width, height, text, font_size=18, color=WHITE,
                 bold=False, alignment=PP_ALIGN.LEFT, font_name="Calibri"):
    """Add a text box with styled text."""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    return txBox


def add_bullet_list(slide, left, top, width, height, items, font_size=16, color=LIGHT_GRAY,
                    bullet_color=ACCENT_CYAN, spacing=Pt(8)):
    """Add a bulleted list."""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True

    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.space_after = spacing

        # Bullet character
        run_bullet = p.add_run()
        run_bullet.text = "\u25B8 "  # Small right triangle
        run_bullet.font.size = Pt(font_size)
        run_bullet.font.color.rgb = bullet_color
        run_bullet.font.name = "Calibri"

        run_text = p.add_run()
        run_text.text = item
        run_text.font.size = Pt(font_size)
        run_text.font.color.rgb = color
        run_text.font.name = "Calibri"

    return txBox


def add_slide_number(slide, num, total=15):
    """Add slide number in bottom right."""
    add_text_box(slide, Inches(11.8), Inches(7.0), Inches(1.3), Inches(0.4),
                 f"{num} / {total}", font_size=10, color=DIM_GRAY, alignment=PP_ALIGN.RIGHT)


def add_section_header(slide, title, subtitle=None):
    """Standard section header with accent line."""
    add_text_box(slide, Inches(0.8), Inches(0.4), Inches(11), Inches(0.6),
                 title, font_size=32, color=WHITE, bold=True)
    add_accent_line(slide, Inches(0.8), Inches(1.05), Inches(2.5))
    if subtitle:
        add_text_box(slide, Inches(0.8), Inches(1.2), Inches(11), Inches(0.5),
                     subtitle, font_size=16, color=DIM_GRAY)


# ════════════════════════════════════════════════════════════════
# SLIDE 1: Title Slide
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])  # Blank
add_bg(slide)

# Top accent bar
add_shape(slide, Inches(0), Inches(0), SLIDE_W, Pt(4), fill_color=ACCENT_CYAN)

# Shield icon placeholder (circle)
shield = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(5.9), Inches(0.8), Inches(1.5), Inches(1.5))
shield.fill.solid()
shield.fill.fore_color.rgb = ACCENT_CYAN
shield.line.fill.background()
# Shield text
add_text_box(slide, Inches(5.9), Inches(1.15), Inches(1.5), Inches(0.8),
             "CS", font_size=32, color=BG_DARK, bold=True, alignment=PP_ALIGN.CENTER)

# Title
add_text_box(slide, Inches(1.5), Inches(2.6), Inches(10.3), Inches(1.0),
             "CityShield Platform", font_size=44, color=WHITE, bold=True,
             alignment=PP_ALIGN.CENTER)
add_text_box(slide, Inches(1.5), Inches(3.5), Inches(10.3), Inches(0.6),
             "Simulating and Defending Smart City Cyberattacks",
             font_size=22, color=ACCENT_CYAN, alignment=PP_ALIGN.CENTER)

# Accent line center
add_accent_line(slide, Inches(5.4), Inches(4.2), Inches(2.5))

# University info
add_text_box(slide, Inches(1.5), Inches(4.5), Inches(10.3), Inches(0.4),
             "University of Ha'il  |  College of Computer Science and Engineering",
             font_size=16, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)
add_text_box(slide, Inches(1.5), Inches(4.9), Inches(10.3), Inches(0.4),
             "Department of Information Security  |  Graduation Project II (ISEC471)",
             font_size=14, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

# Supervisor
add_text_box(slide, Inches(1.5), Inches(5.4), Inches(10.3), Inches(0.4),
             "Supervisor: Dr. Ali Alferaidi",
             font_size=15, color=ACCENT_GREEN, alignment=PP_ALIGN.CENTER)

# Team members - two columns
team_left = [
    "Sami Obaid Alsulaymi (202208147)",
    "Khaled Abdulaziz Alshammari (202102650)",
    "Abdulwahab Saad Alfayez (202102873)",
]
team_right = [
    "Thamer Muteb Alshammari (202100655)",
    "Bati Meshal Albata (202206452)",
]

add_shape(slide, Inches(2.2), Inches(5.9), Inches(4.0), Inches(1.3), border_color=BORDER_COLOR)
y = Inches(6.0)
for name in team_left:
    add_text_box(slide, Inches(2.5), y, Inches(3.7), Inches(0.3),
                 name, font_size=11, color=LIGHT_GRAY, alignment=PP_ALIGN.LEFT)
    y += Inches(0.3)

add_shape(slide, Inches(7.1), Inches(5.9), Inches(4.0), Inches(1.3), border_color=BORDER_COLOR)
y = Inches(6.0)
for name in team_right:
    add_text_box(slide, Inches(7.4), y, Inches(3.7), Inches(0.3),
                 name, font_size=11, color=LIGHT_GRAY, alignment=PP_ALIGN.LEFT)
    y += Inches(0.3)

add_slide_number(slide, 1)

# ════════════════════════════════════════════════════════════════
# SLIDE 2: Introduction
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Introduction", "Smart Cities & Cybersecurity")

# Left column - Smart Cities
add_shape(slide, Inches(0.8), Inches(1.8), Inches(5.5), Inches(5.0), border_color=BORDER_COLOR)
add_text_box(slide, Inches(1.1), Inches(1.9), Inches(5.0), Inches(0.5),
             "What Are Smart Cities?", font_size=20, color=ACCENT_CYAN, bold=True)
add_bullet_list(slide, Inches(1.1), Inches(2.5), Inches(5.0), Inches(3.5), [
    "Urban environments powered by digital infrastructure",
    "IoT devices controlling traffic, energy, water, and public safety",
    "Connected systems generating massive real-time data",
    "Critical services rely on continuous digital operations",
    "75% increase in smart city IoT deployments (2023-2025)",
], font_size=14)

# Right column - Why Cybersecurity
add_shape(slide, Inches(7.0), Inches(1.8), Inches(5.5), Inches(5.0), border_color=BORDER_COLOR)
add_text_box(slide, Inches(7.3), Inches(1.9), Inches(5.0), Inches(0.5),
             "Why Cybersecurity Matters", font_size=20, color=ACCENT_RED, bold=True)
add_bullet_list(slide, Inches(7.3), Inches(2.5), Inches(5.0), Inches(3.5), [
    "Cyberattacks on cities can disrupt essential services",
    "IoT devices expand the attack surface dramatically",
    "Single vulnerability can cascade across interconnected systems",
    "Real-world testing on production systems is too risky",
    "Defenders need safe environments to train and practice",
], font_size=14, bullet_color=ACCENT_RED)

add_slide_number(slide, 2)

# ════════════════════════════════════════════════════════════════
# SLIDE 3: Problem Statement
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Problem Statement", "Key Cybersecurity Challenges in Smart Cities")

problems = [
    ("Expanding IoT Attack Surface",
     ACCENT_RED,
     ["Thousands of connected devices per city zone",
      "Many devices lack built-in security controls",
      "Heterogeneous protocols increase complexity"]),
    ("No Safe Testing Environment",
     ACCENT_ORANGE,
     ["Testing attacks on live infrastructure is dangerous",
      "Limited cyber ranges for smart city domains",
      "Academic institutions lack hands-on training tools"]),
    ("Detection & Response Gaps",
     ACCENT_PURPLE,
     ["Difficulty evaluating detection mechanisms before deployment",
      "Manual incident response is too slow for real-time attacks",
      "No standardized way to measure MTTD/MTTR for city systems"]),
]

x_pos = Inches(0.8)
for title, color, items in problems:
    add_shape(slide, x_pos, Inches(1.8), Inches(3.7), Inches(5.0), border_color=color)
    # Color top bar
    add_shape(slide, x_pos, Inches(1.8), Inches(3.7), Pt(4), fill_color=color)
    add_text_box(slide, x_pos + Inches(0.3), Inches(2.0), Inches(3.1), Inches(0.5),
                 title, font_size=17, color=color, bold=True)
    add_bullet_list(slide, x_pos + Inches(0.3), Inches(2.6), Inches(3.1), Inches(3.5),
                    items, font_size=13, bullet_color=color)
    x_pos += Inches(4.1)

add_slide_number(slide, 3)

# ════════════════════════════════════════════════════════════════
# SLIDE 4: Project Objectives
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Project Objectives")

objectives = [
    "Develop modular microservices representing smart city domains",
    "Build a realistic smart city simulation environment",
    "Simulate realistic cyber-attack scenarios (MITRE ATT&CK aligned)",
    "Deploy SIEM detection rules and anomaly detection",
    "Implement automated response playbooks (Ansible)",
    "Provide interactive dashboards and 3D visualization",
]

add_shape(slide, Inches(0.8), Inches(1.5), Inches(5.8), Inches(5.3), border_color=BORDER_COLOR)
add_text_box(slide, Inches(1.1), Inches(1.6), Inches(5.3), Inches(0.4),
             "Planned Objectives", font_size=18, color=ACCENT_CYAN, bold=True)

y = Inches(2.1)
for obj in objectives:
    txBox = slide.shapes.add_textbox(Inches(1.1), y, Inches(5.3), Inches(0.35))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = "\u25B8 "
    run.font.size = Pt(14)
    run.font.color.rgb = ACCENT_CYAN
    run = p.add_run()
    run.text = obj
    run.font.size = Pt(14)
    run.font.color.rgb = LIGHT_GRAY
    run.font.name = "Calibri"
    y += Inches(0.45)

# Right column - Achieved
add_shape(slide, Inches(7.0), Inches(1.5), Inches(5.8), Inches(5.3), border_color=ACCENT_GREEN)
add_shape(slide, Inches(7.0), Inches(1.5), Inches(5.8), Pt(4), fill_color=ACCENT_GREEN)
add_text_box(slide, Inches(7.3), Inches(1.65), Inches(5.3), Inches(0.4),
             "Objectives Achieved So Far", font_size=18, color=ACCENT_GREEN, bold=True)

achieved = [
    ("Modular Microservices", "3 simulators + 6 backend services deployed via Docker Compose"),
    ("Smart City Simulation", "Traffic, IoT sensors, and network emulator generating live events"),
    ("Attack Scenarios", "21+ built-in scenarios including 10 OWASP + Cyber Range attacks"),
    ("Detection Engine", "25 YAML rules aligned to MITRE ATT&CK, real-time alert pipeline"),
    ("Automated Response", "Ansible playbooks for block_ip, isolate_service, revoke_token"),
    ("Dashboard & 3D City", "Interactive 3D smart city with 6 zones, live attack visualization"),
]

y = Inches(2.2)
for title, desc in achieved:
    # Checkmark
    txBox = slide.shapes.add_textbox(Inches(7.3), y, Inches(5.3), Inches(0.6))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = "\u2713 "
    run.font.size = Pt(14)
    run.font.color.rgb = ACCENT_GREEN
    run.font.bold = True
    run = p.add_run()
    run.text = title
    run.font.size = Pt(14)
    run.font.color.rgb = WHITE
    run.font.bold = True
    run.font.name = "Calibri"
    p2 = tf.add_paragraph()
    run2 = p2.add_run()
    run2.text = f"    {desc}"
    run2.font.size = Pt(11)
    run2.font.color.rgb = DIM_GRAY
    run2.font.name = "Calibri"
    y += Inches(0.48)

add_slide_number(slide, 4)

# ════════════════════════════════════════════════════════════════
# SLIDE 5: System Architecture
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "System Architecture", "Containerized Microservices on Docker Compose")

# Architecture layers - horizontal boxes
layers = [
    ("UI Layer", "React 18 + TypeScript + Three.js 3D City", ACCENT_CYAN, Inches(1.5)),
    ("Backend API", "FastAPI + JWT Auth + RBAC + WebSocket", ACCENT_GREEN, Inches(2.4)),
    ("Data Store", "OpenSearch 2.11 (9 indices) + Filebeat", ACCENT_ORANGE, Inches(3.3)),
    ("Detection & Response", "Rule Engine (25 rules) + Response Manager (Ansible)", ACCENT_RED, Inches(4.2)),
    ("Simulation Layer", "Traffic Sim + IoT Sim + Network Emulator", ACCENT_PURPLE, Inches(5.1)),
    ("Cyber/IoT Range", "Metasploitable + Kali Attacker + IoT Target (isolated nets)", RGBColor(0xFF, 0x6B, 0x6B), Inches(6.0)),
]

for name, desc, color, y_pos in layers:
    # Main box
    add_shape(slide, Inches(0.8), y_pos, Inches(11.7), Inches(0.75), border_color=color)
    # Left color indicator
    add_shape(slide, Inches(0.8), y_pos, Pt(6), Inches(0.75), fill_color=color)
    # Layer name
    add_text_box(slide, Inches(1.2), y_pos + Inches(0.05), Inches(3.0), Inches(0.35),
                 name, font_size=16, color=color, bold=True)
    # Description
    add_text_box(slide, Inches(1.2), y_pos + Inches(0.35), Inches(10.5), Inches(0.3),
                 desc, font_size=12, color=LIGHT_GRAY)

# Arrows between layers (simple down arrows as text)
for y_off in [Inches(2.25), Inches(3.15), Inches(4.05), Inches(4.95)]:
    add_text_box(slide, Inches(6.2), y_off, Inches(1.0), Inches(0.25),
                 "\u25BC", font_size=14, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 5)

# ════════════════════════════════════════════════════════════════
# SLIDE 6: Platform Features - Scenario Builder & Simulation
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Platform Features", "Scenario Builder & Smart City Simulation")

# Left - Scenario Builder
add_shape(slide, Inches(0.8), Inches(1.8), Inches(5.8), Inches(5.0), border_color=ACCENT_CYAN)
add_text_box(slide, Inches(1.1), Inches(1.9), Inches(5.3), Inches(0.4),
             "Scenario Builder", font_size=20, color=ACCENT_CYAN, bold=True)
add_bullet_list(slide, Inches(1.1), Inches(2.5), Inches(5.3), Inches(2.0), [
    "21+ built-in attack scenarios with 4-stage execution",
    "10 OWASP Top 10 aligned scenarios (A01-A10:2021)",
    "Custom Scenario Builder with MITRE technique selection",
    "Real-time stage progression with live UI feedback",
    "Attack Proposal workflow (Researcher \u2192 Admin approval)",
], font_size=13)

# Screenshot placeholder
add_shape(slide, Inches(1.3), Inches(4.6), Inches(4.8), Inches(2.0),
          fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=DIM_GRAY)
add_text_box(slide, Inches(1.3), Inches(5.3), Inches(4.8), Inches(0.4),
             "[  Screenshot: Scenario Builder Page  ]",
             font_size=12, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

# Right - Simulation
add_shape(slide, Inches(7.0), Inches(1.8), Inches(5.8), Inches(5.0), border_color=ACCENT_GREEN)
add_text_box(slide, Inches(7.3), Inches(1.9), Inches(5.3), Inches(0.4),
             "Smart City Simulation", font_size=20, color=ACCENT_GREEN, bold=True)
add_bullet_list(slide, Inches(7.3), Inches(2.5), Inches(5.3), Inches(2.0), [
    "Traffic Simulator \u2014 vehicle flows, signal events, incidents",
    "IoT Simulator \u2014 sensor readings, anomalies, firmware events",
    "Network Emulator \u2014 connections, DNS, firewall, scans",
    "Each runs as independent FastAPI microservice",
    "Events written to OpenSearch in real-time + JSONL backup",
], font_size=13, bullet_color=ACCENT_GREEN)

# Screenshot placeholder
add_shape(slide, Inches(7.5), Inches(4.6), Inches(4.8), Inches(2.0),
          fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=DIM_GRAY)
add_text_box(slide, Inches(7.5), Inches(5.3), Inches(4.8), Inches(0.4),
             "[  Screenshot: 3D Smart City View  ]",
             font_size=12, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 6)

# ════════════════════════════════════════════════════════════════
# SLIDE 7: Platform Features - Logging & Detection
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Platform Features", "Logging Pipeline & Detection Engine")

# Left - Logging
add_shape(slide, Inches(0.8), Inches(1.8), Inches(5.8), Inches(5.0), border_color=ACCENT_ORANGE)
add_text_box(slide, Inches(1.1), Inches(1.9), Inches(5.3), Inches(0.4),
             "Centralized Logging Pipeline", font_size=20, color=ACCENT_ORANGE, bold=True)
add_bullet_list(slide, Inches(1.1), Inches(2.5), Inches(5.3), Inches(1.8), [
    "Simulators generate JSON events \u2192 OpenSearch indices",
    "Filebeat ships JSONL logs as secondary pipeline",
    "3 log indices: logs-traffic, logs-iot, logs-network",
    "OpenSearch Dashboards for ad-hoc log exploration",
    "Real-time indexing with structured event schemas",
], font_size=13, bullet_color=ACCENT_ORANGE)

# Pipeline diagram
add_shape(slide, Inches(1.3), Inches(4.5), Inches(4.8), Inches(2.1),
          fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=ACCENT_ORANGE)
pipeline_text = "Simulators  \u2192  JSONL + OpenSearch  \u2192  Filebeat  \u2192  logs-*  \u2192  Detection Engine"
add_text_box(slide, Inches(1.5), Inches(5.2), Inches(4.4), Inches(0.5),
             pipeline_text, font_size=12, color=ACCENT_ORANGE, alignment=PP_ALIGN.CENTER)

# Right - Detection
add_shape(slide, Inches(7.0), Inches(1.8), Inches(5.8), Inches(5.0), border_color=ACCENT_RED)
add_text_box(slide, Inches(7.3), Inches(1.9), Inches(5.3), Inches(0.4),
             "Detection Engine", font_size=20, color=ACCENT_RED, bold=True)
add_bullet_list(slide, Inches(7.3), Inches(2.5), Inches(5.3), Inches(1.5), [
    "25 YAML detection rules aligned to MITRE ATT&CK",
    "Covers 25 techniques across multiple tactics",
    "Severity levels: Low, Medium, High, Critical",
    "Configurable query windows and thresholds",
    "Optional AbuseIPDB threat intelligence enrichment",
], font_size=13, bullet_color=ACCENT_RED)

# Rule examples
add_shape(slide, Inches(7.5), Inches(4.5), Inches(4.8), Inches(2.1),
          fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=ACCENT_RED)
add_text_box(slide, Inches(7.7), Inches(4.6), Inches(4.4), Inches(0.3),
             "Example Detection Rules:", font_size=12, color=ACCENT_RED, bold=True)
rules_text = (
    "T1046  Network Port Scan          \u2502 High\n"
    "T1110  Brute Force Authentication  \u2502 High\n"
    "T1498  DDoS Attack                 \u2502 Critical\n"
    "T1041  Data Exfiltration           \u2502 Critical\n"
    "T1486  Ransomware                  \u2502 Critical"
)
add_text_box(slide, Inches(7.7), Inches(5.0), Inches(4.4), Inches(1.5),
             rules_text, font_size=10, color=LIGHT_GRAY, font_name="Courier New")

add_slide_number(slide, 7)

# ════════════════════════════════════════════════════════════════
# SLIDE 8: Platform Features - Response & Dashboard
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Platform Features", "Automated Response & Security Dashboard")

# Left - Response
add_shape(slide, Inches(0.8), Inches(1.8), Inches(5.8), Inches(5.0), border_color=ACCENT_PURPLE)
add_text_box(slide, Inches(1.1), Inches(1.9), Inches(5.3), Inches(0.4),
             "Automated Response System", font_size=20, color=ACCENT_PURPLE, bold=True)
add_bullet_list(slide, Inches(1.1), Inches(2.5), Inches(5.3), Inches(2.5), [
    "Response Manager polls alerts for auto-response triggers",
    "Executes Ansible playbooks for containment actions",
    "3 response actions: block_ip, isolate_service, revoke_token",
    "Configurable per-rule: severity threshold, rate limits",
    "Full audit trail in action-audit-log index",
    "Manual execution also available for Analysts",
], font_size=13, bullet_color=ACCENT_PURPLE)

# Screenshot placeholder
add_shape(slide, Inches(1.3), Inches(5.0), Inches(4.8), Inches(1.7),
          fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=DIM_GRAY)
add_text_box(slide, Inches(1.3), Inches(5.6), Inches(4.8), Inches(0.4),
             "[  Screenshot: Action Execution  ]",
             font_size=12, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

# Right - Dashboard
add_shape(slide, Inches(7.0), Inches(1.8), Inches(5.8), Inches(5.0), border_color=ACCENT_CYAN)
add_text_box(slide, Inches(7.3), Inches(1.9), Inches(5.3), Inches(0.4),
             "Security Dashboard", font_size=20, color=ACCENT_CYAN, bold=True)
add_bullet_list(slide, Inches(7.3), Inches(2.5), Inches(5.3), Inches(2.5), [
    "Real-time overview with event counts and alert stats",
    "Interactive 3D smart city with 25 assets across 6 zones",
    "Live attack visualization with building flash effects",
    "Alert investigation with Analysis, Actions, and Events tabs",
    "Device Management with power control (Admin)",
    "WebSocket + REST polling for real-time updates",
], font_size=13)

# Screenshot placeholder
add_shape(slide, Inches(7.5), Inches(5.0), Inches(4.8), Inches(1.7),
          fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=DIM_GRAY)
add_text_box(slide, Inches(7.5), Inches(5.6), Inches(4.8), Inches(0.4),
             "[  Screenshot: Dashboard Overview  ]",
             font_size=12, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 8)

# ════════════════════════════════════════════════════════════════
# SLIDE 9: User Roles
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "User Roles & Access Control", "Role-Based Access Control (RBAC)")

roles = [
    ("Administrator", ACCENT_RED, [
        "Manage system infrastructure and configuration",
        "Create and manage user accounts",
        "Approve/reject attack proposals",
        "Toggle device power on/off",
        "Full access to all platform features",
    ]),
    ("Security Analyst", ACCENT_CYAN, [
        "Monitor alerts and investigate incidents",
        "Execute manual response actions",
        "View logs and detection rule results",
        "Update alert status and investigation notes",
        "Access action audit history",
    ]),
    ("Researcher", ACCENT_GREEN, [
        "Create and run attack scenarios",
        "Submit attack proposals for approval",
        "Configure detection rules and auto-response",
        "Access Research Lab (personal container)",
        "Build custom scenarios with MITRE techniques",
    ]),
]

x = Inches(0.8)
for title, color, perms in roles:
    add_shape(slide, x, Inches(1.8), Inches(3.7), Inches(5.0), border_color=color)
    add_shape(slide, x, Inches(1.8), Inches(3.7), Pt(4), fill_color=color)

    # Role icon (circle)
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(1.4), Inches(2.1), Inches(0.8), Inches(0.8))
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()
    icon_char = title[0]
    add_text_box(slide, x + Inches(1.4), Inches(2.2), Inches(0.8), Inches(0.6),
                 icon_char, font_size=24, color=BG_DARK, bold=True, alignment=PP_ALIGN.CENTER)

    add_text_box(slide, x + Inches(0.3), Inches(3.0), Inches(3.1), Inches(0.4),
                 title, font_size=17, color=color, bold=True, alignment=PP_ALIGN.CENTER)

    add_bullet_list(slide, x + Inches(0.3), Inches(3.5), Inches(3.1), Inches(3.0),
                    perms, font_size=11, bullet_color=color, spacing=Pt(4))
    x += Inches(4.1)

add_slide_number(slide, 9)

# ════════════════════════════════════════════════════════════════
# SLIDE 10: Example Attack Scenario Flow
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Attack Scenario Flow", "End-to-End Example: DDoS Against Traffic Control")

steps = [
    ("1", "Launch", "Researcher selects and\nruns attack scenario", ACCENT_CYAN),
    ("2", "Simulate", "Simulators generate\nmalicious traffic events", ACCENT_GREEN),
    ("3", "Collect", "Events indexed in\nOpenSearch logs-*", ACCENT_ORANGE),
    ("4", "Detect", "Detection engine matches\nMITRE ATT&CK rules", ACCENT_RED),
    ("5", "Alert", "Alert generated with\nseverity and technique", ACCENT_PURPLE),
    ("6", "Investigate", "Analyst reviews alert\nand related events", ACCENT_CYAN),
    ("7", "Respond", "Response action executed\n(auto or manual)", ACCENT_GREEN),
]

x = Inches(0.3)
for num, title, desc, color in steps:
    # Card
    add_shape(slide, x, Inches(2.0), Inches(1.7), Inches(3.5), border_color=color)
    add_shape(slide, x, Inches(2.0), Inches(1.7), Pt(3), fill_color=color)

    # Number circle
    circle = slide.shapes.add_shape(MSO_SHAPE.OVAL, x + Inches(0.55), Inches(2.3), Inches(0.6), Inches(0.6))
    circle.fill.solid()
    circle.fill.fore_color.rgb = color
    circle.line.fill.background()
    add_text_box(slide, x + Inches(0.55), Inches(2.35), Inches(0.6), Inches(0.5),
                 num, font_size=20, color=BG_DARK, bold=True, alignment=PP_ALIGN.CENTER)

    # Title
    add_text_box(slide, x + Inches(0.1), Inches(3.1), Inches(1.5), Inches(0.3),
                 title, font_size=14, color=color, bold=True, alignment=PP_ALIGN.CENTER)

    # Description
    add_text_box(slide, x + Inches(0.1), Inches(3.5), Inches(1.5), Inches(1.0),
                 desc, font_size=10, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)

    # Arrow to next (except last)
    if num != "7":
        add_text_box(slide, x + Inches(1.65), Inches(3.2), Inches(0.3), Inches(0.3),
                     "\u25B6", font_size=12, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)
    x += Inches(1.85)

# Bottom result box
add_shape(slide, Inches(1.5), Inches(5.8), Inches(10.3), Inches(1.2), border_color=ACCENT_GREEN)
add_text_box(slide, Inches(1.8), Inches(5.9), Inches(9.7), Inches(0.4),
             "Result: Full attack lifecycle captured, analyzed, and responded to within the platform",
             font_size=15, color=ACCENT_GREEN, bold=True, alignment=PP_ALIGN.CENTER)
add_text_box(slide, Inches(1.8), Inches(6.35), Inches(9.7), Inches(0.4),
             "3D city shows live attack progress  |  Alerts generated in real-time  |  Full audit trail preserved",
             font_size=12, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 10)

# ════════════════════════════════════════════════════════════════
# SLIDE 11: Current Progress
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Current Progress", "Implementation Status")

completed = [
    ("Platform Environment", "15 Docker containers deployed via Docker Compose with 3 isolated networks"),
    ("Smart City Simulation", "3 simulators generating continuous traffic, IoT, and network events"),
    ("Logging Pipeline", "Filebeat + OpenSearch with 9 indices, structured event schemas"),
    ("Detection Engine", "25 YAML rules covering MITRE ATT&CK techniques, real-time alert generation"),
    ("Automated Response", "Ansible playbooks with configurable auto-response per rule"),
    ("Web Dashboard", "Full React UI with 3D city, alerts, scenarios, devices, and admin panels"),
    ("Cyber Range", "Isolated Metasploitable + Kali attacker environment with packet capture"),
    ("IoT Range", "Isolated IoT sensor hub target reachable from Research Lab"),
    ("RBAC & Authentication", "JWT-based auth with 3 roles (Administrator, Analyst, Researcher)"),
    ("Attack Scenarios", "21+ scenarios including 10 OWASP + custom builder with MITRE selection"),
]

# Two columns
left_items = completed[:5]
right_items = completed[5:]

add_shape(slide, Inches(0.8), Inches(1.5), Inches(5.8), Inches(5.5), border_color=ACCENT_GREEN)
y = Inches(1.7)
for title, desc in left_items:
    txBox = slide.shapes.add_textbox(Inches(1.1), y, Inches(5.3), Inches(0.8))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = "\u2713 "
    run.font.size = Pt(14)
    run.font.color.rgb = ACCENT_GREEN
    run.font.bold = True
    run = p.add_run()
    run.text = title
    run.font.size = Pt(13)
    run.font.color.rgb = WHITE
    run.font.bold = True
    run.font.name = "Calibri"
    p2 = tf.add_paragraph()
    run2 = p2.add_run()
    run2.text = f"   {desc}"
    run2.font.size = Pt(10)
    run2.font.color.rgb = DIM_GRAY
    run2.font.name = "Calibri"
    y += Inches(0.55)

add_shape(slide, Inches(7.0), Inches(1.5), Inches(5.8), Inches(5.5), border_color=ACCENT_GREEN)
y = Inches(1.7)
for title, desc in right_items:
    txBox = slide.shapes.add_textbox(Inches(7.3), y, Inches(5.3), Inches(0.8))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = "\u2713 "
    run.font.size = Pt(14)
    run.font.color.rgb = ACCENT_GREEN
    run.font.bold = True
    run = p.add_run()
    run.text = title
    run.font.size = Pt(13)
    run.font.color.rgb = WHITE
    run.font.bold = True
    run.font.name = "Calibri"
    p2 = tf.add_paragraph()
    run2 = p2.add_run()
    run2.text = f"   {desc}"
    run2.font.size = Pt(10)
    run2.font.color.rgb = DIM_GRAY
    run2.font.name = "Calibri"
    y += Inches(0.55)

add_slide_number(slide, 11)

# ════════════════════════════════════════════════════════════════
# SLIDE 12: Demonstration (Screenshot Placeholders)
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Live Demonstration", "Platform Screenshots")

screenshots = [
    ("Dashboard Overview", Inches(0.8), Inches(1.8)),
    ("Alerts Investigation", Inches(6.8), Inches(1.8)),
    ("Scenario Builder", Inches(0.8), Inches(4.5)),
    ("3D Attack Visualization", Inches(6.8), Inches(4.5)),
]

for label, x, y in screenshots:
    add_shape(slide, x, y, Inches(5.7), Inches(2.4),
              fill_color=RGBColor(0x1A, 0x22, 0x35), border_color=DIM_GRAY)
    add_text_box(slide, x, y + Inches(0.9), Inches(5.7), Inches(0.4),
                 f"[  {label}  ]",
                 font_size=14, color=DIM_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 12)

# ════════════════════════════════════════════════════════════════
# SLIDE 13: Evaluation Metrics
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Evaluation Metrics", "Measuring Platform Performance")

metrics = [
    ("MTTD", "Mean Time to Detect", "Target: < 20 min", "Time from attack initiation to detection", ACCENT_CYAN),
    ("MTTR", "Mean Time to Respond", "Target: < 10 min", "Time from detection to response execution", ACCENT_GREEN),
    ("Detection\nAccuracy", "True Positive Rate", "Target: > 90%", "Ratio of true positives to total detections", ACCENT_ORANGE),
    ("FP Rate", "False Positive Rate", "Target: < 15%", "Monitoring incorrect or misleading alerts", ACCENT_RED),
    ("Resource\nUtil.", "System Performance", "Monitored", "CPU, memory, network under different workloads", ACCENT_PURPLE),
]

x = Inches(0.5)
for abbr, name, target, desc, color in metrics:
    add_shape(slide, x, Inches(1.8), Inches(2.3), Inches(5.0), border_color=color)
    add_shape(slide, x, Inches(1.8), Inches(2.3), Pt(3), fill_color=color)

    # Metric abbreviation
    add_text_box(slide, x + Inches(0.1), Inches(2.2), Inches(2.1), Inches(0.7),
                 abbr, font_size=22, color=color, bold=True, alignment=PP_ALIGN.CENTER)

    add_text_box(slide, x + Inches(0.1), Inches(3.0), Inches(2.1), Inches(0.3),
                 name, font_size=12, color=WHITE, alignment=PP_ALIGN.CENTER)

    # Target box
    add_shape(slide, x + Inches(0.3), Inches(3.5), Inches(1.7), Inches(0.5), fill_color=color)
    add_text_box(slide, x + Inches(0.3), Inches(3.55), Inches(1.7), Inches(0.4),
                 target, font_size=13, color=BG_DARK, bold=True, alignment=PP_ALIGN.CENTER)

    # Description
    add_text_box(slide, x + Inches(0.15), Inches(4.2), Inches(2.0), Inches(1.0),
                 desc, font_size=10, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)

    x += Inches(2.5)

add_slide_number(slide, 13)

# ════════════════════════════════════════════════════════════════
# SLIDE 14: Future Work
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)
add_section_header(slide, "Future Work", "Planned Improvements & Enhancements")

future = [
    ("More Attack Techniques",
     ACCENT_RED,
     ["Expand MITRE ATT&CK technique coverage",
      "Add multi-stage chained attack scenarios",
      "Real exploit execution in cyber range"]),
    ("Enhanced Threat Intelligence",
     ACCENT_ORANGE,
     ["Integrate additional threat feeds beyond AbuseIPDB",
      "IOC correlation and enrichment pipeline",
      "Automated reputation scoring for alerts"]),
    ("Advanced Detection Models",
     ACCENT_CYAN,
     ["ML-based anomaly detection for behavioral analysis",
      "Statistical baseline modeling per asset",
      "Reduce false positives with contextual analysis"]),
    ("Platform Enhancements",
     ACCENT_GREEN,
     ["Cloud-native deployment (Kubernetes)",
      "Multi-user training modules and scoring",
      "Dataset export for academic research"]),
]

x = Inches(0.4)
for title, color, items in future:
    add_shape(slide, x, Inches(1.8), Inches(3.0), Inches(5.0), border_color=color)
    add_shape(slide, x, Inches(1.8), Inches(3.0), Pt(4), fill_color=color)
    add_text_box(slide, x + Inches(0.2), Inches(2.1), Inches(2.6), Inches(0.5),
                 title, font_size=14, color=color, bold=True)
    add_bullet_list(slide, x + Inches(0.2), Inches(2.7), Inches(2.6), Inches(3.5),
                    items, font_size=11, bullet_color=color, spacing=Pt(6))
    x += Inches(3.25)

add_slide_number(slide, 14)

# ════════════════════════════════════════════════════════════════
# SLIDE 15: Conclusion & Thank You
# ════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide)

add_text_box(slide, Inches(1.5), Inches(0.6), Inches(10.3), Inches(0.7),
             "Conclusion", font_size=36, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER)
add_accent_line(slide, Inches(5.4), Inches(1.3), Inches(2.5))

# Summary box
add_shape(slide, Inches(1.5), Inches(1.8), Inches(10.3), Inches(3.5), border_color=ACCENT_CYAN)

summary_items = [
    "CityShield is a fully functional smart city cyber range for cybersecurity training and research",
    "Simulates realistic attack scenarios across traffic, IoT, and network domains",
    "25 detection rules aligned to MITRE ATT&CK with automated Ansible response playbooks",
    "Interactive 3D city visualization with real-time attack feedback and alert pipeline",
    "Role-based access control supporting Administrator, Analyst, and Researcher workflows",
    "Evaluation metrics (MTTD, MTTR, detection accuracy) ensure measurable performance",
]

y = Inches(2.0)
for item in summary_items:
    txBox = slide.shapes.add_textbox(Inches(1.8), y, Inches(9.7), Inches(0.4))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = "\u25B8 "
    run.font.size = Pt(15)
    run.font.color.rgb = ACCENT_CYAN
    run = p.add_run()
    run.text = item
    run.font.size = Pt(15)
    run.font.color.rgb = LIGHT_GRAY
    run.font.name = "Calibri"
    y += Inches(0.45)

# Thank you
add_text_box(slide, Inches(1.5), Inches(5.6), Inches(10.3), Inches(0.7),
             "Thank You", font_size=32, color=ACCENT_CYAN, bold=True, alignment=PP_ALIGN.CENTER)
add_text_box(slide, Inches(1.5), Inches(6.2), Inches(10.3), Inches(0.4),
             "Questions & Discussion",
             font_size=18, color=LIGHT_GRAY, alignment=PP_ALIGN.CENTER)

# Bottom accent bar
add_shape(slide, Inches(0), Inches(7.2), SLIDE_W, Pt(4), fill_color=ACCENT_CYAN)

add_slide_number(slide, 15)

# ── Save ──
output_path = "/Users/sami/Documents/GitHub/CityShield/CityShield_Mid_Project_Presentation.pptx"
prs.save(output_path)
print(f"Presentation saved to: {output_path}")
print(f"Total slides: {len(prs.slides)}")
