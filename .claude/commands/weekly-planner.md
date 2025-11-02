---
description: "Create a realistic weekly plan by selecting actionable tasks from last week's review, current projects, and areas, using effort-based prioritization and markdown task syntax"
---

You are tasked with generating a weekly plan that keeps you focused on completing resolutions in AREA, which are split into Projects and then daily/weekly tasks. Follow these steps:

1. Identify the current week's date range (Monday to Sunday).
2. Review last week's weekly note in `Periodic_notes/YYYY/weekly/YYYY-MM-DD.md` for unfinished tasks.
3. Query all active projects from `01_Project/` and areas from `02_Area/` for actionable items directly linked to AREA resolutions.
4. Select a realistic number of tasks based on estimated effort and available time, prioritizing those that advance AREA resolutions.
5. Prioritize tasks by urgency, importance, and direct contribution to AREA goals.
6. Format the plan using markdown task syntax with the global filter string (`~Task~`), e.g. `- [ ] ~Task~ Task description`.
7. Present the plan in the current week's weekly note under a "Priority Tasks (this week)" section, clearly showing how each task supports AREA resolutions.
8. Exclude backlog tasks from the main plan; reflect on them in the project section or backlog as needed.
9. Ensure the plan is focused, achievable, and supports sustainable progress toward AREA resolutions.

Always keep AREA resolutions as the guiding objective for weekly planning.

Example output section for the weekly note:

### Priority Tasks (this week)
- [ ] ~Task~ Hair cut
- [ ] ~Task~ Bike repair
- [ ] ~Task~ Build Obsidian Agent (high priority, Doing, deadline: YYYY-MM-DD)
- [ ] ~Task~ Make progress on Tear of The Kingdom
